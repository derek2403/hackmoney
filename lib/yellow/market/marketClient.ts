/**
 * Frontend API client for the prediction market.
 * All calls go to the CLOB server (default http://localhost:3001).
 */

import type {
  MarketPrices,
  OrderBookSnapshot,
  AllOrderBooks,
  UserPositions,
  BuyRequest,
  SellRequest,
  LimitOrderRequest,
  TradeResult,
  MarketState,
} from "./types";

const BASE_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_CLOB_URL || "http://localhost:3001"
    : "http://localhost:3001";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as T;
}

// ==================== READ ====================

export async function fetchMarketPrices(): Promise<MarketPrices> {
  return request<MarketPrices>("/api/market/prices");
}

export async function fetchOrderBook(corner: string): Promise<OrderBookSnapshot> {
  return request<OrderBookSnapshot>(`/api/market/orderbook/${corner}`);
}

export async function fetchAllOrderBooks(): Promise<AllOrderBooks> {
  return request<AllOrderBooks>("/api/market/orderbooks");
}

export async function fetchPositions(address: string): Promise<UserPositions> {
  return request<UserPositions>(`/api/market/positions/${address}`);
}

export async function fetchMarketState(): Promise<MarketState> {
  return request<MarketState>("/api/market/state");
}

// ==================== WRITE ====================

export async function createMarket(opts?: {
  id?: string;
  events?: string[];
  alpha?: number;
  minB?: number;
}): Promise<{ success: boolean; market: MarketState["market"] }> {
  return request("/api/market/create", {
    method: "POST",
    body: JSON.stringify(opts || {}),
  });
}

export async function fundMarket(
  user: string,
  amount: number
): Promise<{ success: boolean; cost: number }> {
  return request("/api/market/fund", {
    method: "POST",
    body: JSON.stringify({ user, amount }),
  });
}

export async function buyShares(params: BuyRequest): Promise<TradeResult> {
  return request<TradeResult>("/api/market/buy", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function sellShares(params: SellRequest): Promise<TradeResult> {
  return request<TradeResult>("/api/market/sell", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function placeOrder(params: LimitOrderRequest): Promise<TradeResult> {
  return request<TradeResult>("/api/market/order", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function cancelOrder(
  user: string,
  orderId: number,
  corner?: string
): Promise<{ success: boolean }> {
  return request("/api/market/cancel-order", {
    method: "POST",
    body: JSON.stringify({ user, orderId, corner }),
  });
}

export async function registerSession(params: {
  user: string;
  sessionId?: string;
  userBalance?: number;
  clobBalance?: number;
  version?: number;
}): Promise<{ success: boolean }> {
  return request("/api/market/session", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function resolveMarket(
  outcomes: boolean[]
): Promise<{ success: boolean; winningCorner: number; label: string; payouts: Record<string, number> }> {
  return request("/api/market/resolve", {
    method: "POST",
    body: JSON.stringify({ outcomes }),
  });
}
