/**
 * Market State Manager with JSON persistence.
 *
 * Tracks: AMM quantities, user share balances, order books,
 * trade history, and Yellow session info.
 */

const fs = require('fs');
const path = require('path');
const { NUM_CORNERS, costFunction, allCornerPrices, dynamicB, cornerLabel } = require('./lmsr');
const { createAllBooks, addOrder, hasSellOrders, bestAskPrice } = require('./orderbook');

const DEFAULT_STATE_PATH = path.join(__dirname, '..', '..', 'data', 'market-state.json');

// ==================== STATE CREATION ====================

/**
 * Create a fresh market state.
 * @param {object} opts
 * @param {string} opts.id - Market ID
 * @param {string[]} opts.events - Array of 3 event descriptions
 * @param {number} opts.alpha - LS-LMSR alpha for dynamic b
 * @param {number} opts.minB - Minimum b floor
 * @returns {object} Market state
 */
function createMarket(opts) {
  const { id, events, alpha = 0.05, minB = 100 } = opts;

  if (events.length !== 3) {
    throw new Error('Exactly 3 events required');
  }

  return {
    market: {
      id,
      events: events.map((desc, i) => ({ index: i, description: desc })),
      status: 'seeding',    // "seeding" | "open" | "resolved"
      resolution: null,     // e.g., "101" when resolved
      winningCorner: null,  // 0-7 index
      totalVolume: 0,
      createdAt: Date.now(),
    },
    amm: {
      quantities: new Array(NUM_CORNERS).fill(0), // Start flat → equal prices
      alpha,
      minB,
    },
    balances: {},    // { "0xUser": { "000": 10, "001": 5, ... } }
    orders: createAllBooks(),
    trades: [],      // [{ id, user, type, corner, amount, cost, shares, timestamp }]
    sessions: {},    // { "0xUser": { sessionId, userBalance, clobBalance, version } }
  };
}

// ==================== B PARAMETER ====================

/**
 * Get current b parameter (dynamic based on volume).
 */
function getB(state) {
  return dynamicB(state.amm.alpha, state.market.totalVolume, state.amm.minB);
}

// ==================== BALANCE MANAGEMENT ====================

/**
 * Ensure a user has a balance entry for all corners.
 */
function ensureUserBalance(state, user) {
  if (!state.balances[user]) {
    state.balances[user] = {};
    for (let i = 0; i < NUM_CORNERS; i++) {
      state.balances[user][cornerLabel(i)] = 0;
    }
  }
}

/**
 * Get a user's balance for a specific corner.
 */
function getUserCornerBalance(state, user, corner) {
  ensureUserBalance(state, user);
  return state.balances[user][corner] || 0;
}

/**
 * Update a user's share balance for a corner.
 * @param {number} delta - Positive to add, negative to remove
 */
function updateBalance(state, user, corner, delta) {
  ensureUserBalance(state, user);
  state.balances[user][corner] = (state.balances[user][corner] || 0) + delta;

  // Prevent floating point from going slightly negative
  if (state.balances[user][corner] < 0 && state.balances[user][corner] > -0.001) {
    state.balances[user][corner] = 0;
  }

  if (state.balances[user][corner] < 0) {
    throw new Error(`Negative balance: ${user} corner ${corner} = ${state.balances[user][corner]}`);
  }
}

// ==================== COMPLETE SETS ====================

/**
 * Mint complete sets: $1 per set = 1 share of each corner.
 * Used by market maker to seed initial liquidity.
 * @param {object} state
 * @param {string} user - The funder (usually CLOB server address)
 * @param {number} numSets - Number of complete sets to mint
 * @returns {number} Total cost in USD
 */
function mintCompleteSets(state, user, numSets) {
  ensureUserBalance(state, user);
  for (let i = 0; i < NUM_CORNERS; i++) {
    const label = cornerLabel(i);
    state.balances[user][label] += numSets;
    state.amm.quantities[i] += numSets;
  }
  const cost = numSets; // $1 per complete set
  state.market.totalVolume += cost;
  return cost;
}

// ==================== TRADE RECORDING ====================

let nextTradeId = 1;

function recordTrade(state, trade) {
  state.trades.push({
    id: nextTradeId++,
    timestamp: Date.now(),
    ...trade,
  });
}

// ==================== SESSION MANAGEMENT ====================

/**
 * Register or update a user's Yellow session info.
 */
function setSession(state, user, sessionInfo) {
  state.sessions[user] = {
    ...state.sessions[user],
    ...sessionInfo,
  };
}

/**
 * Get a user's session info.
 */
function getSession(state, user) {
  return state.sessions[user] || null;
}

/**
 * Get the user's tracked USD balance (from Yellow session deposits).
 */
function getUserUsdBalance(state, user) {
  const session = state.sessions[user];
  return session?.userBalance || 0;
}

/**
 * Deduct USD from user's tracked balance.
 */
function deductUserUsd(state, user, amount) {
  if (!state.sessions[user]) {
    throw new Error(`No session for ${user}`);
  }
  if (state.sessions[user].userBalance < amount - 0.001) {
    throw new Error(`Insufficient balance: have ${state.sessions[user].userBalance}, need ${amount}`);
  }
  state.sessions[user].userBalance = Math.max(0, state.sessions[user].userBalance - amount);
}

/**
 * Credit USD to user's tracked balance.
 */
function creditUserUsd(state, user, amount) {
  if (!state.sessions[user]) {
    state.sessions[user] = { userBalance: 0 };
  }
  state.sessions[user].userBalance += amount;
}

// ==================== AMM CALIBRATION ====================

/**
 * Check if all 8 corners have at least one sell order on their book.
 * @returns {boolean}
 */
function allCornersSeeded(state) {
  for (let i = 0; i < NUM_CORNERS; i++) {
    const label = cornerLabel(i);
    if (!hasSellOrders(state.orders[label])) return false;
  }
  return true;
}

/**
 * Calibrate the AMM from maker's order book prices, then place AMM orders.
 *
 * Reads the best ask price for each corner, normalizes to probabilities,
 * sets LMSR quantities via q[i] = b * ln(p[i]), mints shares for AMM,
 * and places sell orders on each corner's book.
 *
 * @param {object} state
 * @param {string} ammUser - The AMM's address (CLOB address)
 * @param {number} ammLiquidity - Number of shares per corner to place as orders
 */
function calibrateAMM(state, ammUser, ammLiquidity = 500) {
  const b = getB(state);
  const rawPrices = [];

  // Read best ask from each corner's book
  for (let i = 0; i < NUM_CORNERS; i++) {
    const label = cornerLabel(i);
    const price = bestAskPrice(state.orders[label]);
    rawPrices.push(price || 0.125); // fallback to equal
  }

  // Normalize to sum to 1.0 (valid probability distribution)
  const sum = rawPrices.reduce((s, p) => s + p, 0);
  const normalizedPrices = rawPrices.map(p => p / sum);

  // Set LMSR quantities: q[i] = b * ln(p[i])
  // (The constant from softmax normalization cancels out)
  for (let i = 0; i < NUM_CORNERS; i++) {
    state.amm.quantities[i] = b * Math.log(normalizedPrices[i]);
  }

  // Mint complete sets for the AMM to back its orders
  mintCompleteSets(state, ammUser, ammLiquidity);

  // Place sell orders on each corner at the calibrated LMSR price
  const calibratedPrices = allCornerPrices(state.amm.quantities, b);
  for (let i = 0; i < NUM_CORNERS; i++) {
    const label = cornerLabel(i);
    const price = Math.round(calibratedPrices[i] * 100) / 100; // round to cents
    addOrder(state.orders[label], {
      user: ammUser,
      side: 'sell',
      price: Math.max(0.01, price), // minimum 1 cent
      quantity: ammLiquidity,
    });
  }

  // Transition market to open
  state.market.status = 'open';

  return {
    calibratedPrices,
    normalizedPrices,
    rawPrices,
  };
}

// ==================== RESOLUTION ====================

/**
 * Resolve the market with the outcomes of the 3 events.
 * @param {object} state
 * @param {boolean[]} outcomes - [event0, event1, event2] true=Yes, false=No
 * @returns {{ winningCorner: number, label: string, payouts: object }}
 */
function resolveMarket(state, outcomes) {
  if (state.market.status === 'resolved') {
    throw new Error('Market already resolved');
  }
  if (outcomes.length !== 3) {
    throw new Error('Exactly 3 outcomes required');
  }

  const label = outcomes.map(o => o ? '1' : '0').join('');
  const winningCorner = parseInt(label, 2);

  state.market.status = 'resolved';
  state.market.resolution = label;
  state.market.winningCorner = winningCorner;

  // Calculate payouts for all users
  const payouts = {};
  for (const [user, balances] of Object.entries(state.balances)) {
    const winningShares = balances[label] || 0;
    if (winningShares > 0) {
      payouts[user] = winningShares; // $1 per winning share
      creditUserUsd(state, user, winningShares);
    }
  }

  return { winningCorner, label, payouts };
}

/**
 * Calculate potential payout for a user if a given corner wins.
 */
function calculatePayout(state, user, winningCornerLabel) {
  ensureUserBalance(state, user);
  return state.balances[user][winningCornerLabel] || 0;
}

// ==================== PERSISTENCE ====================

/**
 * Load state from disk. Returns null if file doesn't exist.
 */
function loadState(filePath = DEFAULT_STATE_PATH) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

/**
 * Save state to disk (atomic write via tmp file).
 */
function saveState(state, filePath = DEFAULT_STATE_PATH) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
  fs.renameSync(tmpPath, filePath);
}

module.exports = {
  createMarket,
  getB,
  ensureUserBalance,
  getUserCornerBalance,
  updateBalance,
  mintCompleteSets,
  recordTrade,
  setSession,
  getSession,
  getUserUsdBalance,
  deductUserUsd,
  creditUserUsd,
  allCornersSeeded,
  calibrateAMM,
  resolveMarket,
  calculatePayout,
  loadState,
  saveState,
  DEFAULT_STATE_PATH,
};
