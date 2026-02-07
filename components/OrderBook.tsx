"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "./utils";

type BookRow = { price: number; shares: number; total: number };

const DEFAULT_MID_CENTS = 50;
const perturb = (value: number, pct: number) =>
  Math.max(0, value * (1 + (Math.random() - 0.5) * pct));
const round2 = (n: number) => Math.round(n * 100) / 100;

function buildBookFromMid(midCents: number): { asks: BookRow[]; bids: BookRow[] } {
  const baseShares = (min: number, max: number) => 100 + Math.floor(Math.random() * (max - min));
  const asks: BookRow[] = [];
  for (let i = 1; i <= 6; i++) {
    const cents = midCents + i;
    const price = cents / 100;
    const shares = baseShares(80, 1200);
    asks.push({ price, shares, total: round2(shares * price) });
  }
  asks.sort((a, b) => b.price - a.price);
  const bids: BookRow[] = [];
  for (let i = 1; i <= 5; i++) {
    const cents = Math.max(1, midCents - i);
    const price = cents / 100;
    const shares = baseShares(100, 5000);
    bids.push({ price, shares, total: round2(shares * price) });
  }
  bids.sort((a, b) => b.price - a.price);
  return { asks, bids };
}

interface OrderBookProps {
  avgPriceCents?: number | null;
}

export const OrderBook = ({ avgPriceCents }: OrderBookProps) => {
  const midCents = avgPriceCents ?? DEFAULT_MID_CENTS;
  const [isExpanded, setIsExpanded] = useState(true);
  const [asks, setAsks] = useState<BookRow[]>(() => buildBookFromMid(midCents).asks);
  const [bids, setBids] = useState<BookRow[]>(() => buildBookFromMid(midCents).bids);
  const [lastPrice, setLastPrice] = useState(midCents);
  const [volume, setVolume] = useState(166140452);
  const [lastTouched, setLastTouched] = useState<"ask" | "bid" | null>(null);

  useEffect(() => {
    const { asks: newAsks, bids: newBids } = buildBookFromMid(midCents);
    setAsks(newAsks);
    setBids(newBids);
    setLastPrice(midCents);
  }, [midCents]);

  const simulateTrade = useCallback(() => {
    setAsks((prev) => {
      const next = prev.map((r) => ({ ...r }));
      const i = Math.floor(Math.random() * next.length);
      const row = next[i];
      const fill = row.shares * (0.02 + Math.random() * 0.08);
      row.shares = round2(Math.max(1, row.shares - fill));
      row.total = round2(row.shares * row.price * 100) / 100;
      return next;
    });
    setLastTouched("ask");
    setTimeout(() => setLastTouched(null), 400);
  }, []);

  const simulateBidTrade = useCallback(() => {
    setBids((prev) => {
      const next = prev.map((r) => ({ ...r }));
      const i = Math.floor(Math.random() * next.length);
      const row = next[i];
      const fill = row.shares * (0.02 + Math.random() * 0.06);
      row.shares = round2(Math.max(1, row.shares - fill));
      row.total = round2(row.shares * row.price * 100) / 100;
      return next;
    });
    setLastTouched("bid");
    setTimeout(() => setLastTouched(null), 400);
  }, []);

  const simulateNewOrder = useCallback(() => {
    const side = Math.random() > 0.5 ? "ask" : "bid";
    if (side === "ask") {
      setAsks((prev) => {
        const next = prev.map((r) => ({ ...r }));
        const i = Math.floor(Math.random() * next.length);
        next[i].shares = round2(perturb(next[i].shares, 0.15));
        next[i].total = round2(next[i].shares * next[i].price * 100) / 100;
        return next;
      });
      setLastTouched("ask");
    } else {
      setBids((prev) => {
        const next = prev.map((r) => ({ ...r }));
        const i = Math.floor(Math.random() * next.length);
        next[i].shares = round2(perturb(next[i].shares, 0.12));
        next[i].total = round2(next[i].shares * next[i].price * 100) / 100;
        return next;
      });
      setLastTouched("bid");
    }
    setTimeout(() => setLastTouched(null), 400);
  }, []);

  useEffect(() => {
    if (!isExpanded) return;
    const actions = [simulateTrade, simulateBidTrade, simulateNewOrder];
    const id = setInterval(() => {
      actions[Math.floor(Math.random() * actions.length)]!();
      setLastPrice((p) => (Math.random() > 0.6 ? p : p === 2 ? 3 : 2));
      setVolume((v) => v + Math.floor(Math.random() * 8000 + 2000));
    }, 1800 + Math.random() * 1400);
    return () => clearInterval(id);
  }, [isExpanded, simulateTrade, simulateBidTrade, simulateNewOrder]);

  const maxDepth = Math.max(
    ...asks.map((a) => a.total),
    ...bids.map((b) => b.total),
    1
  );

  return (
    <div className="max-w-4xl rounded-3xl border border-white/5 bg-white/5 p-1 backdrop-blur-xl">
      {/* Header - click to minimise/expand */}
      <button
        type="button"
        onClick={() => setIsExpanded((e) => !e)}
        className={cn(
          "flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/5 rounded-t-3xl",
          isExpanded ? "border-b border-white/5" : "rounded-b-3xl"
        )}
      >
        <h2 className="text-lg font-bold text-white">Order Book</h2>
        <span className="flex items-center gap-1.5 text-sm text-white/50 tabular-nums">
          <span>${volume.toLocaleString()} vol.</span>
          <svg
            className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isExpanded && (
        <>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-6 pt-4 pb-2 text-[10px] font-black uppercase tracking-widest text-white/40">
        <div className="pl-8">Price</div>
        <div className="text-right w-20">Shares</div>
        <div className="text-right w-24">Total</div>
      </div>

      {/* Asks */}
      <div
        className={cn(
          "relative px-6 transition-colors duration-300",
          lastTouched === "ask" && "bg-rose-500/5 rounded-lg"
        )}
      >
        <div className="flex items-center py-1.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-rose-500/90">Asks</span>
        </div>
        <div className="space-y-0">
          {asks.map((row) => (
            <div
              key={row.price}
              className="relative grid grid-cols-[1fr_auto_auto] gap-4 py-1.5 items-center text-sm group hover:bg-white/5 rounded"
            >
              <div
                className="absolute left-0 top-0 bottom-0 rounded-r bg-rose-500/20 max-w-full transition-[width] duration-300"
                style={{ width: `${(row.total / maxDepth) * 100}%` }}
              />
              <div className="relative pl-8 font-semibold text-rose-400">{Math.round(row.price * 100)}¢</div>
              <div className="relative text-right w-20 text-white/70 tabular-nums">{row.shares.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              <div className="relative text-right w-24 text-white/70 tabular-nums">${row.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider + Last / Spread (Last = avg/mid; spread = best ask − best bid) */}
      <div className="flex items-center justify-between px-6 py-2 border-y border-white/5 text-xs text-white/50">
        <span>Last: {lastPrice}¢</span>
        <span>Spread: {asks.length && bids.length ? Math.round((asks[asks.length - 1]!.price - bids[0]!.price) * 100) : 1}¢</span>
      </div>

      {/* Bids */}
      <div
        className={cn(
          "relative px-6 pb-4 transition-colors duration-300",
          lastTouched === "bid" && "bg-emerald-500/5 rounded-lg"
        )}
      >
        <div className="flex items-center py-1.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-emerald-500/90">Bids</span>
        </div>
        <div className="space-y-0">
          {bids.map((row) => (
            <div
              key={row.price}
              className="relative grid grid-cols-[1fr_auto_auto] gap-4 py-1.5 items-center text-sm group hover:bg-white/5 rounded"
            >
              <div
                className="absolute left-0 top-0 bottom-0 rounded-r bg-emerald-500/20 max-w-full transition-[width] duration-300"
                style={{ width: `${(row.total / maxDepth) * 100}%` }}
              />
              <div className="relative pl-8 font-semibold text-emerald-400">{Math.round(row.price * 100)}¢</div>
              <div className="relative text-right w-20 text-white/70 tabular-nums">{row.shares.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              <div className="relative text-right w-24 text-white/70 tabular-nums">${row.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            </div>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
};
