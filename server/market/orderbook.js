/**
 * Per-corner order book with price-time priority matching.
 *
 * Each of the 8 corners has its own book with buy (bid) and sell (ask) sides.
 * Orders are sorted: buys descending by price, sells ascending by price.
 * Ties broken by timestamp (earlier = higher priority).
 */

let nextOrderId = 1;

/**
 * Create a fresh order book for one corner.
 * @returns {{ buys: object[], sells: object[] }}
 */
function createOrderBook() {
  return { buys: [], sells: [] };
}

/**
 * Create all 8 corner order books.
 * @returns {object} Keyed by corner label "000"-"111"
 */
function createAllBooks() {
  const books = {};
  for (let i = 0; i < 8; i++) {
    books[i.toString(2).padStart(3, '0')] = createOrderBook();
  }
  return books;
}

/**
 * Add a resting order to the book (does NOT attempt matching).
 * @param {object} book - The order book for one corner
 * @param {object} order - { user, side: "buy"|"sell", price, quantity }
 * @returns {object} The order with id and timestamp added
 */
function addOrder(book, order) {
  const fullOrder = {
    id: nextOrderId++,
    user: order.user,
    side: order.side,
    price: order.price,
    quantity: order.quantity,
    filled: 0,
    timestamp: Date.now(),
  };

  if (order.side === 'buy') {
    book.buys.push(fullOrder);
    // Sort descending by price, then ascending by timestamp
    book.buys.sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);
  } else {
    book.sells.push(fullOrder);
    // Sort ascending by price, then ascending by timestamp
    book.sells.sort((a, b) => a.price - b.price || a.timestamp - b.timestamp);
  }

  return fullOrder;
}

/**
 * Cancel an order by ID.
 * @param {object} book - The order book for one corner
 * @param {number} orderId
 * @returns {object|null} Cancelled order or null
 */
function cancelOrder(book, orderId) {
  for (const side of ['buys', 'sells']) {
    const idx = book[side].findIndex(o => o.id === orderId);
    if (idx !== -1) {
      return book[side].splice(idx, 1)[0];
    }
  }
  return null;
}

/**
 * Cancel an order by ID, but only if it belongs to the given user.
 * @param {object} book
 * @param {number} orderId
 * @param {string} user
 * @returns {object|null}
 */
function cancelOrderByUser(book, orderId, user) {
  for (const side of ['buys', 'sells']) {
    const idx = book[side].findIndex(o => o.id === orderId && o.user === user);
    if (idx !== -1) {
      return book[side].splice(idx, 1)[0];
    }
  }
  return null;
}

/**
 * Match an incoming order against the book.
 * Does NOT add the remainder as a resting order (caller decides).
 *
 * @param {object} book - The order book
 * @param {"buy"|"sell"} incomingSide - The taker's side
 * @param {number} quantity - Shares to fill
 * @param {number} maxPrice - Max price willing to pay (for buys) or min price (for sells)
 * @returns {{ fills: object[], remainingQty: number, totalCost: number }}
 */
function matchAgainstBook(book, incomingSide, quantity, maxPrice) {
  const fills = [];
  let remainingQty = quantity;
  let totalCost = 0;

  // Buy → match against sells (asks); Sell → match against buys (bids)
  const counterSide = incomingSide === 'buy' ? 'sells' : 'buys';
  const orders = book[counterSide];

  let i = 0;
  while (i < orders.length && remainingQty > 0) {
    const order = orders[i];

    // Price check
    if (incomingSide === 'buy' && order.price > maxPrice) break;
    if (incomingSide === 'sell' && order.price < maxPrice) break;

    const available = order.quantity - order.filled;
    const fillQty = Math.min(remainingQty, available);

    if (fillQty > 0) {
      order.filled += fillQty;
      remainingQty -= fillQty;
      totalCost += fillQty * order.price;

      fills.push({
        orderId: order.id,
        user: order.user,
        price: order.price,
        quantity: fillQty,
      });

      // Remove fully filled orders
      if (order.filled >= order.quantity) {
        orders.splice(i, 1);
        // Don't increment i since we removed an element
        continue;
      }
    }
    i++;
  }

  return { fills, remainingQty, totalCost };
}

/**
 * Get a snapshot of the book for the API.
 * Aggregates by price level.
 * @param {object} book
 * @returns {{ bids: {price, quantity}[], asks: {price, quantity}[] }}
 */
function getBookSnapshot(book) {
  const aggregate = (orders) => {
    const levels = new Map();
    for (const o of orders) {
      const remaining = o.quantity - o.filled;
      if (remaining <= 0) continue;
      const existing = levels.get(o.price) || 0;
      levels.set(o.price, existing + remaining);
    }
    return Array.from(levels.entries())
      .map(([price, quantity]) => ({ price, quantity: Math.round(quantity * 100) / 100 }))
      .sort((a, b) => b.price - a.price);
  };

  return {
    bids: aggregate(book.buys),
    asks: aggregate(book.sells).reverse(), // ascending for asks
  };
}

/**
 * Get all open orders for a user across all books.
 * @param {object} books - All 8 corner books
 * @param {string} user - User address
 * @returns {object[]}
 */
function getUserOrders(books, user) {
  const orders = [];
  for (const [corner, book] of Object.entries(books)) {
    for (const side of ['buys', 'sells']) {
      for (const order of book[side]) {
        if (order.user === user) {
          orders.push({ ...order, corner });
        }
      }
    }
  }
  return orders;
}

/**
 * Market buy: fill against sell side with a USD budget.
 * Walks the ask side from lowest price up, buying as many shares as budget allows.
 *
 * @param {object} book
 * @param {number} budget - Max USD to spend
 * @returns {{ fills: object[], totalShares: number, totalCost: number }}
 */
function matchMarketBuy(book, budget) {
  const fills = [];
  let remaining = budget;
  let totalShares = 0;

  let i = 0;
  while (i < book.sells.length && remaining > 0.001) {
    const order = book.sells[i];
    const available = order.quantity - order.filled;
    if (available <= 0) { i++; continue; }

    const maxSharesByBudget = remaining / order.price;
    const fillQty = Math.min(maxSharesByBudget, available);
    const cost = fillQty * order.price;

    order.filled += fillQty;
    remaining -= cost;
    totalShares += fillQty;

    fills.push({
      orderId: order.id,
      user: order.user,
      price: order.price,
      quantity: fillQty,
      cost,
    });

    if (order.filled >= order.quantity - 0.0001) {
      book.sells.splice(i, 1);
      continue;
    }
    i++;
  }

  return { fills, totalShares, totalCost: budget - remaining };
}

/**
 * Market sell: fill against buy side with a share quantity.
 * Walks the bid side from highest price down.
 *
 * @param {object} book
 * @param {number} quantity - Shares to sell
 * @returns {{ fills: object[], totalRevenue: number, remainingQty: number }}
 */
function matchMarketSell(book, quantity) {
  const fills = [];
  let remaining = quantity;
  let totalRevenue = 0;

  let i = 0;
  while (i < book.buys.length && remaining > 0.001) {
    const order = book.buys[i];
    const available = order.quantity - order.filled;
    if (available <= 0) { i++; continue; }

    const fillQty = Math.min(remaining, available);
    const revenue = fillQty * order.price;

    order.filled += fillQty;
    remaining -= fillQty;
    totalRevenue += revenue;

    fills.push({
      orderId: order.id,
      user: order.user,
      price: order.price,
      quantity: fillQty,
      revenue,
    });

    if (order.filled >= order.quantity - 0.0001) {
      book.buys.splice(i, 1);
      continue;
    }
    i++;
  }

  return { fills, totalRevenue, remainingQty: remaining };
}

/**
 * Check if a corner's book has any sell orders with remaining quantity.
 */
function hasSellOrders(book) {
  return book.sells.some(o => (o.quantity - o.filled) > 0.0001);
}

/**
 * Get the best (lowest) ask price for a corner's book. Returns null if empty.
 */
function bestAskPrice(book) {
  for (const o of book.sells) {
    if (o.quantity - o.filled > 0.0001) return o.price;
  }
  return null;
}

/**
 * Reset order ID counter (for testing).
 */
function resetOrderIdCounter() {
  nextOrderId = 1;
}

module.exports = {
  createOrderBook,
  createAllBooks,
  addOrder,
  cancelOrder,
  cancelOrderByUser,
  matchAgainstBook,
  matchMarketBuy,
  matchMarketSell,
  hasSellOrders,
  bestAskPrice,
  getBookSnapshot,
  getUserOrders,
  resetOrderIdCounter,
};
