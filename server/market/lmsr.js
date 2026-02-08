/**
 * LS-LMSR (Liquidity-Sensitive Logarithmic Market Scoring Rule) Engine
 *
 * Pure math module — zero dependencies.
 *
 * Corner mapping for 3 binary events (A=Khamenei, B=US, C=Israel):
 *   Index 0 → "000" (A=No,  B=No,  C=No)
 *   Index 1 → "001" (A=No,  B=No,  C=Yes)
 *   Index 2 → "010" (A=No,  B=Yes, C=No)
 *   Index 3 → "011" (A=No,  B=Yes, C=Yes)
 *   Index 4 → "100" (A=Yes, B=No,  C=No)
 *   Index 5 → "101" (A=Yes, B=No,  C=Yes)
 *   Index 6 → "110" (A=Yes, B=Yes, C=No)
 *   Index 7 → "111" (A=Yes, B=Yes, C=Yes)
 *
 * Event bit positions:
 *   Event 0 (A/Khamenei) → bit 2 → corners {4,5,6,7}
 *   Event 1 (B/US)       → bit 1 → corners {2,3,6,7}
 *   Event 2 (C/Israel)   → bit 0 → corners {1,3,5,7}
 */

const NUM_CORNERS = 8;

// ==================== HELPERS ====================

/**
 * Log-sum-exp trick for numerical stability.
 * Returns ln(Σ exp(x_i)) without overflow.
 */
function logSumExp(values) {
  const max = Math.max(...values);
  if (!isFinite(max)) return -Infinity;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += Math.exp(values[i] - max);
  }
  return max + Math.log(sum);
}

/**
 * Corner indices where a given event has the specified outcome.
 * eventIdx: 0, 1, or 2
 * isYes: true for Yes, false for No
 */
function cornersForEvent(eventIdx, isYes) {
  const bit = 2 - eventIdx; // event 0 → bit 2, event 1 → bit 1, event 2 → bit 0
  const indices = [];
  for (let i = 0; i < NUM_CORNERS; i++) {
    const bitVal = (i >> bit) & 1;
    if ((isYes && bitVal === 1) || (!isYes && bitVal === 0)) {
      indices.push(i);
    }
  }
  return indices;
}

/**
 * Corner indices that match a set of conditions.
 * conditions: { [eventIdx]: boolean } — events not in the object are unconstrained.
 * Example: { 0: true, 2: false } → Khamenei=Yes AND Israel=No → corners {4, 6}
 */
function cornersForConditions(conditions) {
  const indices = [];
  for (let i = 0; i < NUM_CORNERS; i++) {
    let match = true;
    for (const [eventIdx, isYes] of Object.entries(conditions)) {
      const bit = 2 - Number(eventIdx);
      const bitVal = (i >> bit) & 1;
      if ((isYes && bitVal !== 1) || (!isYes && bitVal !== 0)) {
        match = false;
        break;
      }
    }
    if (match) indices.push(i);
  }
  return indices;
}

// ==================== CORE LMSR ====================

/**
 * Cost function: C(q) = b * ln(Σ exp(q_i / b))
 * @param {number[]} quantities - Array of 8 share quantities
 * @param {number} b - Liquidity parameter
 * @returns {number} Current cost
 */
function costFunction(quantities, b) {
  const scaled = quantities.map(q => q / b);
  return b * logSumExp(scaled);
}

/**
 * All 8 corner prices (softmax). Always sums to 1.0.
 * price_i = exp(q_i / b) / Σ exp(q_j / b)
 * @param {number[]} quantities - Array of 8 share quantities
 * @param {number} b - Liquidity parameter
 * @returns {number[]} Array of 8 prices summing to 1.0
 */
function allCornerPrices(quantities, b) {
  const scaled = quantities.map(q => q / b);
  const max = Math.max(...scaled);
  const exps = scaled.map(s => Math.exp(s - max));
  const sum = exps.reduce((a, v) => a + v, 0);
  return exps.map(e => e / sum);
}

/**
 * Marginal price for an event outcome (Yes or No).
 * = sum of corner prices where that event has the given outcome.
 * @param {number[]} quantities
 * @param {number} b
 * @param {number} eventIdx - 0, 1, or 2
 * @param {boolean} isYes
 * @returns {number} Price in [0, 1]
 */
function marginalPrice(quantities, b, eventIdx, isYes) {
  const prices = allCornerPrices(quantities, b);
  const corners = cornersForEvent(eventIdx, isYes);
  return corners.reduce((sum, idx) => sum + prices[idx], 0);
}

/**
 * Slice price for a combination of conditions.
 * = sum of corner prices matching all conditions.
 * @param {number[]} quantities
 * @param {number} b
 * @param {object} conditions - { [eventIdx]: boolean }
 * @returns {number} Price in [0, 1]
 */
function slicePrice(quantities, b, conditions) {
  const prices = allCornerPrices(quantities, b);
  const corners = cornersForConditions(conditions);
  return corners.reduce((sum, idx) => sum + prices[idx], 0);
}

/**
 * Cost of a trade: C(q + delta) - C(q).
 * Positive = user pays, negative = user receives.
 * @param {number[]} currentQty - Current quantities
 * @param {number[]} tradeVector - Delta for each corner (length 8)
 * @param {number} b - Liquidity parameter
 * @returns {number} Cost in USD
 */
function tradeCost(currentQty, tradeVector, b) {
  const newQty = currentQty.map((q, i) => q + tradeVector[i]);
  return costFunction(newQty, b) - costFunction(currentQty, b);
}

// ==================== BASKET BUILDERS ====================

/**
 * Build a trade vector for a marginal bet (e.g., "Yes on Khamenei").
 * Adds `amount` shares to every corner where eventIdx has the given outcome.
 * @param {number} eventIdx - 0, 1, or 2
 * @param {boolean} isYes
 * @param {number} amount - Number of shares
 * @returns {number[]} Trade vector (length 8)
 */
function marginalToBasket(eventIdx, isYes, amount) {
  const basket = new Array(NUM_CORNERS).fill(0);
  const corners = cornersForEvent(eventIdx, isYes);
  for (const idx of corners) {
    basket[idx] = amount;
  }
  return basket;
}

/**
 * Build a trade vector for a slice bet (e.g., "Khamenei=Yes AND US=No").
 * Adds `amount` shares to every matching corner.
 * @param {object} conditions - { [eventIdx]: boolean }
 * @param {number} amount - Number of shares
 * @returns {number[]} Trade vector (length 8)
 */
function sliceToBasket(conditions, amount) {
  const basket = new Array(NUM_CORNERS).fill(0);
  const corners = cornersForConditions(conditions);
  for (const idx of corners) {
    basket[idx] = amount;
  }
  return basket;
}

/**
 * Build a trade vector for a single corner bet.
 * @param {number} cornerIdx - 0-7
 * @param {number} amount - Number of shares
 * @returns {number[]} Trade vector (length 8)
 */
function cornerToBasket(cornerIdx, amount) {
  const basket = new Array(NUM_CORNERS).fill(0);
  basket[cornerIdx] = amount;
  return basket;
}

// ==================== DYNAMIC LIQUIDITY ====================

/**
 * Dynamic liquidity parameter: b = max(minB, alpha * totalVolume)
 * Higher b → more liquidity → tighter spreads → less price impact.
 * @param {number} alpha - Scaling factor (e.g., 0.05)
 * @param {number} totalVolume - Total USD volume traded
 * @param {number} minB - Minimum b floor
 * @returns {number}
 */
function dynamicB(alpha, totalVolume, minB) {
  return Math.max(minB, alpha * totalVolume);
}

// ==================== UTILITY ====================

/**
 * Convert corner index (0-7) to binary string label "000"-"111".
 */
function cornerLabel(idx) {
  return idx.toString(2).padStart(3, '0');
}

/**
 * Convert binary string label "000"-"111" to corner index 0-7.
 */
function labelToCorner(label) {
  return parseInt(label, 2);
}

/**
 * Get all prices in a structured format for the API.
 * @param {number[]} quantities
 * @param {number} b
 * @returns {{ corners: object[], marginals: object[], b: number }}
 */
function getAllPrices(quantities, b) {
  const prices = allCornerPrices(quantities, b);

  const corners = prices.map((price, idx) => ({
    index: idx,
    label: cornerLabel(idx),
    price: Math.round(price * 10000) / 10000, // 4 decimal places
  }));

  const eventNames = ['Khamenei', 'US', 'Israel'];
  const marginals = [];
  for (let e = 0; e < 3; e++) {
    const yesPrice = marginalPrice(quantities, b, e, true);
    const noPrice = marginalPrice(quantities, b, e, false);
    marginals.push({
      eventIndex: e,
      name: eventNames[e],
      yes: Math.round(yesPrice * 10000) / 10000,
      no: Math.round(noPrice * 10000) / 10000,
    });
  }

  return { corners, marginals, b };
}

/**
 * Calculate how many shares a user gets for a given USD amount.
 * Uses binary search to find the amount of shares where tradeCost = budget.
 * @param {number[]} quantities - Current quantities
 * @param {number[]} basketDirection - Unit trade vector (1s where shares go)
 * @param {number} b - Liquidity parameter
 * @param {number} budget - USD to spend
 * @returns {number} Number of shares (may be fractional)
 */
function sharesForBudget(quantities, basketDirection, b, budget) {
  if (budget <= 0) return 0;

  let lo = 0;
  let hi = budget * 10; // Upper bound: at most 10x leverage
  const EPSILON = 0.0001;

  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    const tradeVec = basketDirection.map(d => d * mid);
    const cost = tradeCost(quantities, tradeVec, b);

    if (Math.abs(cost - budget) < EPSILON) return mid;
    if (cost < budget) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

module.exports = {
  NUM_CORNERS,
  costFunction,
  allCornerPrices,
  marginalPrice,
  slicePrice,
  tradeCost,
  marginalToBasket,
  sliceToBasket,
  cornerToBasket,
  dynamicB,
  cornerLabel,
  labelToCorner,
  getAllPrices,
  sharesForBudget,
  cornersForEvent,
  cornersForConditions,
  logSumExp,
};
