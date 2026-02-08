import React, { useState, useMemo, useCallback } from "react";
import { cn } from "./utils";
import GooeyButton from "./GooeyButton";
import CountUp from "./CountUp";
import GradientText from "./GradientText";
import { calculateSelectedMarketProbability } from "@/lib/selectedOdds";
import { buyShares, sellShares, placeOrder } from "@/lib/yellow/market/marketClient";
import type { MarginalPrice } from "@/lib/yellow/market/types";

const QUESTIONS_STATIC = [
  {
    id: 1,
    text: "Khamenei out as Supreme Leader of Iran by March 31?",
    image: "/Khamenei.jpg",
    yesPrice: 0.48,
    noPrice: 0.52,
  },
  {
    id: 2,
    text: "US strikes Iran by March 31?",
    image: "/US%20Iran.jpg",
    yesPrice: 0.51,
    noPrice: 0.49,
  },
  {
    id: 3,
    text: "Israel next strikes Iran by March 31?",
    image: "/israeliran.jpg",
    yesPrice: 0.45,
    noPrice: 0.55,
  },
];

interface TradeSidebarProps {
  selections: Record<number, string | null>;
  onSelectionChange: (selections: Record<number, string | null>) => void;
  /** Combined "For The Win" % when multiple outcomes selected (from odds table). */
  forTheWinPercent?: number | null;
  /** User wallet address for placing trades. */
  userAddress?: string | null;
  /** Live marginal prices from the market API. */
  liveMarginals?: MarginalPrice[] | null;
  /** User's USD balance from Yellow session. */
  userBalance?: number;
  /** Callback after a trade succeeds. */
  onTradeComplete?: () => void;
  /** Called after a successful buy with the USD cost — triggers instant payment to CLOB. */
  onPostBuy?: (cost: number) => Promise<void>;
  /** Called after a successful sell with the USD revenue — triggers instant payment from CLOB. */
  onPostSell?: (revenue: number) => Promise<void>;
}

export const TradeSidebar = ({
  selections,
  onSelectionChange,
  forTheWinPercent: forTheWinPercentProp,
  userAddress,
  liveMarginals,
  userBalance = 0,
  onTradeComplete,
  onPostBuy,
  onPostSell,
}: TradeSidebarProps) => {
  const [activeTab, setActiveTab] = useState("Buy");
  const [orderType, setOrderType] = useState("Market");
  const [amount, setAmount] = useState("0");
  const [limitPrice, setLimitPrice] = useState("0.50");
  const [shares, setShares] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tradeResult, setTradeResult] = useState<string | null>(null);
  const [orderTypeOpen, setOrderTypeOpen] = useState(false);

  const amountNum = parseFloat(amount) || 0;

  // Merge live marginal prices into questions
  const QUESTIONS = useMemo(() => {
    if (!liveMarginals || liveMarginals.length < 3) return QUESTIONS_STATIC;
    return QUESTIONS_STATIC.map((q, i) => ({
      ...q,
      yesPrice: liveMarginals[i]?.yes ?? q.yesPrice,
      noPrice: liveMarginals[i]?.no ?? q.noPrice,
    }));
  }, [liveMarginals]);

  // "For The Win" % from Selected Odds (use prop when provided, e.g. multi-select from table)
  const forTheWinPercentComputed = useMemo(
    () => calculateSelectedMarketProbability(selections),
    [selections]
  );
  const forTheWinPercent = forTheWinPercentProp ?? forTheWinPercentComputed;

  const priceNum =
    forTheWinPercent != null
      ? forTheWinPercent / 100
      : (() => {
          const selectedEntry = QUESTIONS.map((q) => ({ id: q.id, option: selections[q.id] })).find(
            (e) => e.option != null
          );
          if (!selectedEntry) return parseFloat(limitPrice) || 0.5;
          const q = QUESTIONS.find((x) => x.id === selectedEntry.id);
          if (!q) return parseFloat(limitPrice) || 0.5;
          if (selectedEntry.option === "Yes") return q.yesPrice;
          if (selectedEntry.option === "No") return q.noPrice;
          return (q.yesPrice + q.noPrice) / 2;
        })();

  const odds = priceNum > 0 ? 1 / priceNum : 0;
  const limitPriceNum = parseFloat(limitPrice) || 0.5;
  const sharesNum = parseFloat(shares) || 0;
  const toWin =
    orderType === "Market"
      ? Math.round(amountNum * odds * 100) / 100
      : Math.round(sharesNum * 100) / 100; // Limit: payout = shares × $1
  const avgPriceCents =
    orderType === "Market"
      ? forTheWinPercent != null
        ? Math.round(forTheWinPercent)
        : Math.round(priceNum * 100)
      : Math.round(limitPriceNum * 100);

  const handleSelect = (qId: number, option: string) => {
    const newSelections = { ...selections, [qId]: option };
    onSelectionChange(newSelections);
  };

  const addAmount = (delta: number) => {
    const next = Math.max(0, amountNum + delta);
    setAmount(next % 1 === 0 ? String(next) : next.toFixed(2));
  };

  /** Build trade params from current selections and execute. */
  const handleTrade = useCallback(async () => {
    if (!userAddress) {
      setTradeResult("Connect wallet first");
      setTimeout(() => setTradeResult(null), 3000);
      return;
    }

    setIsSubmitting(true);
    setTradeResult(null);

    try {
      // Determine trade type from selections
      const selected = Object.entries(selections).filter(([, v]) => v && v !== "Any");
      if (selected.length === 0) {
        setTradeResult("Select an outcome first");
        setIsSubmitting(false);
        setTimeout(() => setTradeResult(null), 3000);
        return;
      }

      if (orderType === "Limit") {
        // Limit order: need to determine the corner from full selection
        // For simplicity, require all 3 questions answered for limit orders on corners
        const allSelected = [1, 2, 3].every(
          (id) => selections[id] === "Yes" || selections[id] === "No"
        );
        if (!allSelected) {
          setTradeResult("Select Yes/No for all 3 events for limit orders");
          setIsSubmitting(false);
          setTimeout(() => setTradeResult(null), 3000);
          return;
        }
        const cornerBits = [1, 2, 3].map((id) => (selections[id] === "Yes" ? "1" : "0")).join("");
        const side = activeTab.toLowerCase() as "buy" | "sell";
        const result = await placeOrder({
          user: userAddress,
          corner: cornerBits,
          side,
          price: parseFloat(limitPrice),
          quantity: parseFloat(shares),
        });
        if (result.success) {
          // Limit buy locks USD upfront → instant payment to CLOB
          if (side === "buy") {
            const estCost = parseFloat(limitPrice) * parseFloat(shares);
            await onPostBuy?.(estCost);
          }
          setTradeResult("Order placed!");
          setShares("0");
        }
      } else {
        // Market order
        let tradeCost = 0;
        let tradeRevenue = 0;

        if (selected.length === 3 && selected.every(([, v]) => v === "Yes" || v === "No")) {
          // All 3 events selected → corner trade
          const cornerBits = [1, 2, 3].map((id) => (selections[id] === "Yes" ? "1" : "0")).join("");
          if (activeTab === "Buy") {
            const result = await buyShares({ user: userAddress, type: "corner", corner: cornerBits, amount: amountNum });
            tradeCost = result.cost ?? 0;
            setTradeResult(`Bought ${result.shares ?? 0} shares for $${result.cost ?? 0}`);
          } else {
            const result = await sellShares({ user: userAddress, type: "corner", corner: cornerBits, shares: amountNum });
            tradeRevenue = result.revenue ?? 0;
            setTradeResult(`Sold for $${result.revenue ?? 0}`);
          }
        } else if (selected.length === 1) {
          // Single event → marginal trade
          const [eventIdStr, val] = selected[0]!;
          const eventIndex = Number(eventIdStr) - 1;
          if (activeTab === "Buy") {
            const result = await buyShares({ user: userAddress, type: "marginal", eventIndex, isYes: val === "Yes", amount: amountNum });
            tradeCost = result.cost ?? 0;
            setTradeResult(`Bought ${result.shares ?? 0} shares for $${result.cost ?? 0}`);
          } else {
            const result = await sellShares({ user: userAddress, type: "marginal", eventIndex, isYes: val === "Yes", shares: amountNum });
            tradeRevenue = result.revenue ?? 0;
            setTradeResult(`Sold for $${result.revenue ?? 0}`);
          }
        } else {
          // Multiple events but not all → slice trade
          const conditions: Record<number, boolean> = {};
          for (const [idStr, val] of selected) {
            if (val === "Yes" || val === "No") {
              conditions[Number(idStr) - 1] = val === "Yes";
            }
          }
          if (activeTab === "Buy") {
            const result = await buyShares({ user: userAddress, type: "slice", conditions, amount: amountNum });
            tradeCost = result.cost ?? 0;
            setTradeResult(`Bought ${result.shares ?? 0} shares for $${result.cost ?? 0}`);
          } else {
            const result = await sellShares({ user: userAddress, type: "slice", conditions, shares: amountNum });
            tradeRevenue = result.revenue ?? 0;
            setTradeResult(`Sold for $${result.revenue ?? 0}`);
          }
        }

        // Trigger instant payment via Yellow session
        if (tradeCost > 0) await onPostBuy?.(tradeCost);
        if (tradeRevenue > 0) await onPostSell?.(tradeRevenue);

        setAmount("0");
      }
      onTradeComplete?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Trade failed";
      setTradeResult(msg);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setTradeResult(null), 5000);
    }
  }, [userAddress, selections, orderType, activeTab, amountNum, limitPrice, shares, onTradeComplete, onPostBuy, onPostSell]);

  return (
    <div className="w-[380px] shrink-0 space-y-4 rounded-3xl border border-white/10 bg-white/3 p-6 shadow-2xl backdrop-blur-3xl ring-1 ring-inset ring-white/5">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          {["Buy", "Sell"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-lg font-bold transition-all hover:scale-105 active:scale-95 pb-1",
                activeTab === tab
                  ? "text-white border-b-2 border-white"
                  : "text-white/20 hover:text-white/40 border-b-2 border-transparent"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOrderTypeOpen((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-bold text-white/40 hover:text-white transition-all cursor-pointer"
          >
            {orderType}
            <svg className={cn("w-3.5 h-3.5 transition-transform", orderTypeOpen && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {orderTypeOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 w-32 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a]/90 backdrop-blur-3xl shadow-2xl">
              {["Market", "Limit"].map((type) => (
                <button
                  key={type}
                  onClick={() => { setOrderType(type); setOrderTypeOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 text-left text-xs font-bold transition-colors",
                    orderType === type
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6 py-4">
        {QUESTIONS.map((q) => (
          <div key={q.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/5 overflow-hidden">
                <img src={q.image} alt="" className="h-full w-full object-cover" />
              </div>
              <p className="text-sm font-bold leading-snug text-white/70">
                {q.text}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["Yes", "No", "Any"].map((option) => {
                const price = option === "Yes" ? q.yesPrice : option === "No" ? q.noPrice : null;
                return (
                  <button
                    key={option}
                    onClick={() => handleSelect(q.id, option)}
                    className={cn(
                      "rounded-xl py-2.5 text-xs font-bold transition-all border border-transparent",
                      selections[q.id] === option
                        ? option === "Yes"
                          ? "bg-emerald-500 shadow-lg shadow-emerald-500/20 text-white"
                          : option === "No"
                          ? "bg-rose-500 shadow-lg shadow-rose-500/20 text-white"
                          : "bg-blue-500 shadow-lg shadow-blue-500/20 text-white"
                        : "bg-white/5 text-white/30 hover:bg-white/10 border-white/5"
                    )}
                  >
                    {option}
                    {price != null && (
                      <span className="ml-1 opacity-60">{Math.round(price * 100)}¢</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-4 border-t border-white/5">
        {orderType === "Market" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5 shrink-0">
                <span className="text-sm font-black tracking-widest text-white/40 uppercase">Amount</span>
                <p className="text-[11px] font-bold"><span className="text-emerald-400">Balance</span> <span className="text-white">${userBalance.toFixed(2)}</span></p>
              </div>
              <div className="flex items-baseline gap-1 min-w-0 justify-end pr-1">
                <span className="text-3xl font-bold text-white/10 shrink-0">$</span>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-24 min-w-[5rem] bg-transparent text-5xl font-black text-white/20 outline-none focus:text-white transition-colors text-right"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 text-white/30 pt-0.5">
              <button type="button" onClick={() => addAmount(1)} className="px-2 py-1 text-[11px] font-bold hover:text-white transition-colors">+$1</button>
              <button type="button" onClick={() => addAmount(20)} className="px-2 py-1 text-[11px] font-bold hover:text-white transition-colors">+$20</button>
              <button type="button" onClick={() => addAmount(100)} className="px-2 py-1 text-[11px] font-bold hover:text-white transition-colors">+$100</button>
              <button type="button" onClick={() => setAmount("0")} className="px-2 py-1 text-[11px] font-bold hover:text-white transition-colors">Max</button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black tracking-widest text-white/40 uppercase">Limit Price</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white/10">$</span>
                <input
                  type="text"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-24 bg-transparent text-4xl font-black text-white/20 outline-none focus:text-white transition-colors text-right"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black tracking-widest text-white/40 uppercase">Shares</span>
              <div className="flex items-baseline gap-1">
                <input
                  type="text"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  className="w-24 bg-transparent text-4xl font-black text-white/20 outline-none focus:text-white transition-colors text-right"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[10px] font-black tracking-[0.2em] text-white/20 uppercase">Est. Total</span>
              <span className="text-sm font-black text-blue-400">
                ${(parseFloat(limitPrice) * (parseFloat(shares) || 0)).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {((orderType === "Market" && amountNum > 0) || (orderType === "Limit" && limitPriceNum > 0 && sharesNum > 0)) && (
          <div className="border-t border-white/5 pt-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5 shrink-0">
                <span className="text-sm font-black tracking-widest text-white/40 uppercase">
                  To win
                </span>
                {orderType === "Market" && (
                  <p className="flex items-center gap-1.5 text-[11px] font-bold">
                    <span className="text-emerald-400">Avg. Price</span> <span className="text-white">{avgPriceCents}¢</span>
                    <button type="button" className="rounded-full text-white/40 hover:text-white/70 shrink-0" aria-label="Info">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    </button>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 min-w-0 justify-end pr-1 items-center">
                <GradientText
                  colors={["#ffffff", "#e4e4e7", "#a1a1aa"]}
                  animationSpeed={1.5}
                  showBorder={false}
                  className="text-right text-5xl font-black tabular-nums leading-none min-w-[5rem]"
                >
                  $<CountUp key={toWin} to={toWin} from={0} duration={0.5 / 8} startWhen={true} />
                </GradientText>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4">
          <GooeyButton
            label={isSubmitting ? "Submitting..." : `${activeTab} ${orderType}`}
            onClick={handleTrade}
          />
        </div>

        {tradeResult && (
          <p className={cn(
            "text-center text-[11px] font-bold py-1",
            tradeResult.includes("fail") || tradeResult.includes("Insufficient") || tradeResult.includes("Connect") || tradeResult.includes("Select")
              ? "text-rose-400"
              : "text-emerald-400"
          )}>
            {tradeResult}
          </p>
        )}

        <p className="text-center text-[10px] font-bold text-white/20">
          By trading, you agree to the <span className="underline cursor-pointer hover:text-white transition-colors">Terms of Use</span>.
        </p>
      </div>
    </div>
  );
};
