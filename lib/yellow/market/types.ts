/** Shared TypeScript interfaces for the prediction market. */

export interface CornerPrice {
  index: number;
  label: string; // "000"-"111"
  price: number; // 0-1
}

export interface MarginalPrice {
  eventIndex: number;
  name: string;
  yes: number;
  no: number;
}

export interface MarketPrices {
  corners: CornerPrice[];
  marginals: MarginalPrice[];
  b: number;
  totalVolume: number;
  status: "open" | "resolved";
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBookSnapshot {
  corner: string;
  ammPrice: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface AllOrderBooks {
  [corner: string]: {
    ammPrice: number;
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
  };
}

export interface Position {
  corner: string;
  shares: number;
  price: number;
  value: number;
}

export interface OpenOrder {
  id: number;
  user: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  filled: number;
  timestamp: number;
  corner: string;
}

export interface UserPositions {
  address: string;
  positions: Position[];
  totalShareValue: number;
  usdBalance: number;
  openOrders: OpenOrder[];
}

export interface BuyRequest {
  user: string;
  type: "corner" | "marginal" | "slice";
  amount: number;
  corner?: number | string;
  eventIndex?: number;
  isYes?: boolean;
  conditions?: Record<number, boolean>;
}

export interface SellRequest {
  user: string;
  type: "corner" | "marginal" | "slice";
  shares: number;
  corner?: number | string;
  eventIndex?: number;
  isYes?: boolean;
  conditions?: Record<number, boolean>;
}

export interface LimitOrderRequest {
  user: string;
  corner: number | string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
}

export interface TradeResult {
  success: boolean;
  cost?: number;
  revenue?: number;
  shares?: number;
  bookFills?: { orderId: number; user: string; price: number; quantity: number }[];
  ammCost?: number;
  bookCost?: number;
  prices?: MarketPrices;
  error?: string;
}

export interface MarketState {
  market: {
    id: string;
    events: { index: number; description: string }[];
    status: "open" | "resolved";
    resolution: string | null;
    winningCorner: number | null;
    totalVolume: number;
  };
  amm: {
    quantities: number[];
    b: number;
    alpha: number;
    minB: number;
  };
  balanceSummary: Record<string, Record<string, number>>;
  tradeCount: number;
  recentTrades: {
    id: number;
    user: string;
    type: string;
    description: string;
    amount: number;
    shares: number;
    timestamp: number;
  }[];
  sessions: Record<string, { sessionId?: string; userBalance?: number }>;
}
