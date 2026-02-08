/**
 * Market API — HTTP route handlers for the prediction market.
 *
 * Flow:
 * 1. Market created in "seeding" status — all prices start at 0
 * 2. Maker buys complete sets (fund), then places sell orders on corners
 * 3. When all 8 corners have sell orders → AMM calibrates once → market "open"
 * 4. Users buy/sell on the order book (market or limit orders)
 * 5. Admin resolves → payouts
 *
 * All trading happens through the order book. The AMM places orders once
 * during calibration and they sit on the book like any other order.
 */

const {
  allCornerPrices,
  cornerLabel,
  labelToCorner,
  marginalToBasket,
  sliceToBasket,
  getAllPrices,
} = require('./lmsr');

const {
  addOrder,
  cancelOrderByUser,
  matchMarketBuy,
  matchMarketSell,
  getBookSnapshot,
  getUserOrders,
  bestAskPrice,
} = require('./orderbook');

const {
  createMarket,
  getB,
  ensureUserBalance,
  updateBalance,
  mintCompleteSets,
  recordTrade,
  allCornersSeeded,
  calibrateAMM,
  resolveMarket,
  loadState,
  saveState,
  setSession,
  getSession,
} = require('./state');

// ==================== STATE HOLDER ====================

let marketState = null;
let statePath = null;
let clobAddress = 'CLOB';
let ammLiquidity = 500;

function getState() {
  return marketState;
}

function persist() {
  if (marketState && statePath) {
    saveState(marketState, statePath);
  }
}

// ==================== HELPERS ====================

/**
 * Get the corners that match a marginal or slice condition.
 * Returns array of corner labels (e.g. ["100", "101", "110", "111"]).
 */
function getMatchingCorners(type, body) {
  switch (type) {
    case 'corner': {
      const { corner } = body;
      const label = typeof corner === 'number' ? cornerLabel(corner) : corner;
      return [label];
    }
    case 'marginal': {
      const { eventIndex, isYes } = body;
      const basket = marginalToBasket(eventIndex, isYes, 1);
      const corners = [];
      for (let i = 0; i < 8; i++) {
        if (basket[i] > 0) corners.push(cornerLabel(i));
      }
      return corners;
    }
    case 'slice': {
      const { conditions } = body;
      const parsed = {};
      for (const [k, v] of Object.entries(conditions)) {
        parsed[Number(k)] = v === true || v === 'true' || v === 'Yes';
      }
      const basket = sliceToBasket(parsed, 1);
      const corners = [];
      for (let i = 0; i < 8; i++) {
        if (basket[i] > 0) corners.push(cornerLabel(i));
      }
      return corners;
    }
    default:
      return [];
  }
}

/**
 * After a sell order is placed during seeding, check if all 8 corners
 * now have sell orders. If so, calibrate the AMM and open the market.
 */
function checkAndCalibrateIfReady() {
  if (marketState.market.status !== 'seeding') return null;
  if (!allCornersSeeded(marketState)) return null;

  console.log('All 8 corners have sell orders — calibrating AMM...');
  const result = calibrateAMM(marketState, clobAddress, ammLiquidity);
  persist();
  console.log('Market is now OPEN. AMM calibrated prices:', result.calibratedPrices.map(p => Math.round(p * 100) + '¢'));
  return result;
}

// ==================== ROUTE HANDLERS ====================

function handleCreateMarket(body) {
  if (marketState && (marketState.market.status === 'open' || marketState.market.status === 'seeding')) {
    return { error: `Market already exists (status: ${marketState.market.status})` };
  }

  const { id, events, alpha, minB } = body;
  marketState = createMarket({
    id: id || 'iran-war-2026',
    events: events || [
      'Khamenei out as Supreme Leader of Iran by March 31?',
      'US strikes Iran by March 31?',
      'Israel next strikes Iran by March 31?',
    ],
    alpha: alpha || 0.05,
    minB: minB || 100,
  });
  persist();
  return { success: true, market: marketState.market };
}

function handleFund(body) {
  if (!marketState) return { error: 'No market exists' };
  if (marketState.market.status === 'resolved') return { error: 'Market is resolved' };

  const { user, amount } = body;
  if (!user || !amount || amount <= 0) return { error: 'Invalid user or amount' };

  const cost = mintCompleteSets(marketState, user, amount);
  persist();

  return {
    success: true,
    cost,
    message: `Minted ${amount} complete sets for ${user}`,
  };
}

function handlePrices() {
  if (!marketState) return { error: 'No market exists' };

  // During seeding: prices come from best ask on order book (0 if no orders)
  // During open: prices from order book + AMM
  const bookPrices = [];
  for (let i = 0; i < 8; i++) {
    const label = cornerLabel(i);
    const price = bestAskPrice(marketState.orders[label]);
    bookPrices.push({
      index: i,
      label,
      price: price ?? 0,
    });
  }

  // Compute marginals from book prices
  const priceArr = bookPrices.map(p => p.price);
  const marginals = [
    {
      eventIndex: 0,
      name: 'Khamenei',
      yes: Math.round((priceArr[4] + priceArr[5] + priceArr[6] + priceArr[7]) * 10000) / 10000,
      no: Math.round((priceArr[0] + priceArr[1] + priceArr[2] + priceArr[3]) * 10000) / 10000,
    },
    {
      eventIndex: 1,
      name: 'US',
      yes: Math.round((priceArr[2] + priceArr[3] + priceArr[6] + priceArr[7]) * 10000) / 10000,
      no: Math.round((priceArr[0] + priceArr[1] + priceArr[4] + priceArr[5]) * 10000) / 10000,
    },
    {
      eventIndex: 2,
      name: 'Israel',
      yes: Math.round((priceArr[1] + priceArr[3] + priceArr[5] + priceArr[7]) * 10000) / 10000,
      no: Math.round((priceArr[0] + priceArr[2] + priceArr[4] + priceArr[6]) * 10000) / 10000,
    },
  ];

  return {
    corners: bookPrices,
    marginals,
    b: getB(marketState),
    totalVolume: marketState.market.totalVolume,
    status: marketState.market.status,
  };
}

/**
 * Buy shares — fills against the order book only.
 * Supports corner, marginal, and slice trades.
 * For marginal/slice, splits budget equally across matching corners.
 */
function handleBuy(body) {
  if (!marketState) return { error: 'No market exists' };
  if (marketState.market.status !== 'open') return { error: 'Market is not open' };

  const { user, type, amount } = body;
  if (!user || !amount || amount <= 0) return { error: 'Invalid params' };

  const corners = getMatchingCorners(type, body);
  if (corners.length === 0) return { error: `Invalid type: ${type}` };

  const budgetPerCorner = amount / corners.length;
  let totalCost = 0;
  let totalShares = 0;
  const allFills = [];

  for (const label of corners) {
    const book = marketState.orders[label];
    if (!book) continue;

    const { fills, totalShares: shares, totalCost: cost } = matchMarketBuy(book, budgetPerCorner);

    // Transfer shares from sellers to buyer
    for (const fill of fills) {
      updateBalance(marketState, fill.user, label, -fill.quantity);
      updateBalance(marketState, user, label, fill.quantity);
    }

    totalCost += cost;
    totalShares += shares;
    allFills.push(...fills.map(f => ({ ...f, corner: label })));
  }

  if (totalShares === 0) {
    return { error: 'No sell orders available on the book' };
  }

  marketState.market.totalVolume += totalCost;

  recordTrade(marketState, {
    user,
    type: `buy-${type}`,
    description: `${type} buy`,
    amount: totalCost,
    shares: totalShares,
    fills: allFills.length,
  });

  persist();

  return {
    success: true,
    cost: Math.round(totalCost * 10000) / 10000,
    shares: Math.round(totalShares * 10000) / 10000,
    fills: allFills,
  };
}

/**
 * Sell shares — fills against the buy side of the order book.
 * For corner trades: sell from one corner's book.
 * For marginal/slice: sell from each matching corner's book.
 */
function handleSell(body) {
  if (!marketState) return { error: 'No market exists' };
  if (marketState.market.status !== 'open') return { error: 'Market is not open' };

  const { user, type, shares } = body;
  if (!user || !shares || shares <= 0) return { error: 'Invalid params' };

  const corners = getMatchingCorners(type, body);
  if (corners.length === 0) return { error: `Invalid type: ${type}` };

  // Check user has enough shares in all relevant corners
  for (const label of corners) {
    const balance = marketState.balances[user]?.[label] || 0;
    if (balance < shares - 0.001) {
      return { error: `Insufficient shares in corner ${label}: have ${Math.round(balance * 100) / 100}, need ${shares}` };
    }
  }

  let totalRevenue = 0;
  let totalSold = 0;
  const allFills = [];

  for (const label of corners) {
    const book = marketState.orders[label];
    if (!book) continue;

    const { fills, totalRevenue: revenue, remainingQty } = matchMarketSell(book, shares);

    const sold = shares - remainingQty;

    // Transfer shares from seller to buyers
    for (const fill of fills) {
      updateBalance(marketState, user, label, -fill.quantity);
      updateBalance(marketState, fill.user, label, fill.quantity);
    }

    totalRevenue += revenue;
    totalSold += sold;
    allFills.push(...fills.map(f => ({ ...f, corner: label })));
  }

  if (totalSold === 0) {
    return { error: 'No buy orders available on the book' };
  }

  marketState.market.totalVolume += totalRevenue;

  recordTrade(marketState, {
    user,
    type: `sell-${type}`,
    description: `${type} sell`,
    amount: -totalRevenue,
    shares: totalSold,
    fills: allFills.length,
  });

  persist();

  return {
    success: true,
    revenue: Math.round(totalRevenue * 10000) / 10000,
    shares: Math.round(totalSold * 10000) / 10000,
    fills: allFills,
  };
}

/**
 * Place a limit order on a specific corner's book.
 * During seeding: only sell orders allowed (maker seeding).
 * During open: buy and sell orders allowed.
 * After placing a sell order during seeding, checks if market should open.
 */
function handlePlaceOrder(body) {
  if (!marketState) return { error: 'No market exists' };
  if (marketState.market.status === 'resolved') return { error: 'Market is resolved' };

  const { user, corner, side, price, quantity } = body;
  if (!user || !corner || !side || !price || !quantity) {
    return { error: 'Missing params: user, corner, side, price, quantity' };
  }
  if (price <= 0 || price >= 1) return { error: 'Price must be between 0 and 1' };
  if (quantity <= 0) return { error: 'Quantity must be > 0' };

  // During seeding, only sell orders allowed
  if (marketState.market.status === 'seeding' && side === 'buy') {
    return { error: 'Market is seeding — only sell orders allowed (makers set prices)' };
  }

  const label = typeof corner === 'number' ? cornerLabel(corner) : corner;
  const book = marketState.orders[label];
  if (!book) return { error: `Invalid corner: ${corner}` };

  // For sell orders, check the user owns enough shares
  if (side === 'sell') {
    const balance = marketState.balances[user]?.[label] || 0;
    if (balance < quantity - 0.001) {
      return { error: `Insufficient shares to sell: have ${balance}, need ${quantity}` };
    }
  }

  const order = addOrder(book, { user, side, price, quantity });

  // Check if this sell order completes the seeding → calibrate AMM → open market
  let calibration = null;
  if (side === 'sell' && marketState.market.status === 'seeding') {
    calibration = checkAndCalibrateIfReady();
  }

  persist();

  return {
    success: true,
    order: { ...order, corner: label },
    marketStatus: marketState.market.status,
    ...(calibration ? { calibration: { message: 'Market is now open!', prices: calibration.calibratedPrices } } : {}),
  };
}

/**
 * Cancel a limit order.
 */
function handleCancelOrder(body) {
  if (!marketState) return { error: 'No market exists' };

  const { user, orderId, corner } = body;
  if (!user || !orderId) return { error: 'Missing user or orderId' };

  if (corner) {
    const label = typeof corner === 'number' ? cornerLabel(corner) : corner;
    const book = marketState.orders[label];
    if (!book) return { error: `Invalid corner: ${corner}` };
    const cancelled = cancelOrderByUser(book, orderId, user);
    if (cancelled) {
      persist();
      return { success: true, cancelled };
    }
    return { error: 'Order not found' };
  }

  for (const [label, book] of Object.entries(marketState.orders)) {
    const cancelled = cancelOrderByUser(book, orderId, user);
    if (cancelled) {
      persist();
      return { success: true, cancelled: { ...cancelled, corner: label } };
    }
  }

  return { error: 'Order not found' };
}

/**
 * Get order book for a specific corner.
 */
function handleGetOrderBook(corner) {
  if (!marketState) return { error: 'No market exists' };

  const label = typeof corner === 'number' ? cornerLabel(corner) : corner;
  const book = marketState.orders[label];
  if (!book) return { error: `Invalid corner: ${corner}` };

  const price = bestAskPrice(book);

  return {
    corner: label,
    ammPrice: price ?? 0,
    ...getBookSnapshot(book),
  };
}

/**
 * Get all 8 order books.
 */
function handleGetAllOrderBooks() {
  if (!marketState) return { error: 'No market exists' };

  const books = {};
  for (let i = 0; i < 8; i++) {
    const label = cornerLabel(i);
    const book = marketState.orders[label];
    const price = bestAskPrice(book);
    books[label] = {
      ammPrice: price ?? 0,
      ...getBookSnapshot(book),
    };
  }

  return books;
}

/**
 * Get user's positions (share balances + open orders).
 */
function handleGetPositions(address) {
  if (!marketState) return { error: 'No market exists' };

  ensureUserBalance(marketState, address);
  const balances = marketState.balances[address];

  // Use best ask price for valuation
  let totalValue = 0;
  const positions = [];
  for (let i = 0; i < 8; i++) {
    const label = cornerLabel(i);
    const qty = balances[label] || 0;
    const price = bestAskPrice(marketState.orders[label]) || 0;
    const value = qty * price;
    totalValue += value;
    if (qty > 0) {
      positions.push({
        corner: label,
        shares: Math.round(qty * 10000) / 10000,
        price: Math.round(price * 10000) / 10000,
        value: Math.round(value * 10000) / 10000,
      });
    }
  }

  const openOrders = getUserOrders(marketState.orders, address);
  const session = getSession(marketState, address);

  return {
    address,
    positions,
    totalShareValue: Math.round(totalValue * 10000) / 10000,
    usdBalance: session?.userBalance || 0,
    openOrders,
  };
}

/**
 * Resolve the market.
 */
function handleResolve(body) {
  if (!marketState) return { error: 'No market exists' };

  const { outcomes } = body;
  if (!outcomes || outcomes.length !== 3) {
    return { error: 'Provide outcomes: [bool, bool, bool]' };
  }

  const parsed = outcomes.map(o => o === true || o === 'true' || o === 1 || o === '1');
  const result = resolveMarket(marketState, parsed);
  persist();

  return { success: true, ...result };
}

/**
 * Get full state (debug endpoint).
 */
function handleGetState() {
  if (!marketState) return { error: 'No market exists' };
  return {
    market: marketState.market,
    amm: {
      quantities: marketState.amm.quantities,
      b: getB(marketState),
      alpha: marketState.amm.alpha,
      minB: marketState.amm.minB,
    },
    balanceSummary: Object.fromEntries(
      Object.entries(marketState.balances).map(([user, bal]) => [
        user,
        Object.fromEntries(Object.entries(bal).filter(([, v]) => v > 0)),
      ])
    ),
    tradeCount: marketState.trades.length,
    recentTrades: marketState.trades.slice(-10),
    sessions: marketState.sessions,
  };
}

/**
 * Register a user session.
 */
function handleRegisterSession(body) {
  if (!marketState) return { error: 'No market exists' };

  const { user, sessionId, userBalance, clobBalance, version } = body;
  if (!user) return { error: 'Missing user address' };

  setSession(marketState, user, { sessionId, userBalance, clobBalance, version });
  persist();

  return { success: true, session: getSession(marketState, user) };
}

// ==================== ROUTER ====================

/**
 * Create the market router. Call from server.js.
 * No auto-initialization — market starts in "seeding" status.
 */
function createMarketRouter(opts = {}) {
  statePath = opts.statePath || require('./state').DEFAULT_STATE_PATH;
  clobAddress = opts.clobAddress || 'CLOB';
  ammLiquidity = opts.ammLiquidity || 500;

  // Load existing state
  marketState = loadState(statePath);
  if (marketState) {
    console.log(`Loaded existing market state: ${marketState.market.id} (${marketState.market.status})`);
  } else {
    // Auto-create market in seeding status (no funding, no orders)
    console.log('Creating market in seeding status...');
    marketState = createMarket({
      id: 'iran-war-2026',
      events: [
        'Khamenei out as Supreme Leader of Iran by March 31?',
        'US strikes Iran by March 31?',
        'Israel next strikes Iran by March 31?',
      ],
      alpha: 0.05,
      minB: 100,
    });
    persist();
    console.log('Market created in SEEDING status. Maker must fund and place sell orders on all 8 corners to open.');
  }

  /**
   * Route handler. Returns true if handled, false if not matched.
   */
  return function handleMarketRequest(req, res, parsedUrl, body) {
    const url = parsedUrl || req.url;
    const method = req.method;

    let pathname = url;
    if (url.includes('?')) {
      pathname = url.split('?')[0];
    }

    if (!pathname.startsWith('/api/market')) return false;
    const route = pathname.slice('/api/market'.length) || '/';

    let result;

    try {
      if (method === 'GET') {
        if (route === '/prices') {
          result = handlePrices();
        } else if (route === '/state') {
          result = handleGetState();
        } else if (route === '/orderbooks') {
          result = handleGetAllOrderBooks();
        } else if (route.startsWith('/orderbook/')) {
          const corner = route.slice('/orderbook/'.length);
          result = handleGetOrderBook(corner);
        } else if (route.startsWith('/positions/')) {
          const address = route.slice('/positions/'.length);
          result = handleGetPositions(address);
        } else {
          return false;
        }
      }

      else if (method === 'POST') {
        const data = typeof body === 'string' ? JSON.parse(body) : body;

        if (route === '/create') {
          result = handleCreateMarket(data);
        } else if (route === '/fund') {
          result = handleFund(data);
        } else if (route === '/buy') {
          result = handleBuy(data);
        } else if (route === '/sell') {
          result = handleSell(data);
        } else if (route === '/order') {
          result = handlePlaceOrder(data);
        } else if (route === '/cancel-order') {
          result = handleCancelOrder(data);
        } else if (route === '/resolve') {
          result = handleResolve(data);
        } else if (route === '/session') {
          result = handleRegisterSession(data);
        } else {
          return false;
        }
      }

      else if (method === 'DELETE') {
        if (route.startsWith('/order/')) {
          const orderId = parseInt(route.slice('/order/'.length));
          const data = typeof body === 'string' && body ? JSON.parse(body) : {};
          result = handleCancelOrder({ ...data, orderId });
        } else {
          return false;
        }
      }

      else {
        return false;
      }

      res.writeHead(result.error ? 400 : 200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return true;

    } catch (err) {
      console.error('Market API error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return true;
    }
  };
}

module.exports = { createMarketRouter, getState };
