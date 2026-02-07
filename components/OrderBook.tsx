"use client";

import React, { useState } from "react";
import { cn } from "./utils";

const MOCK_ASKS = [
  { price: 0.08, shares: 1108.4, total: 520.43 },
  { price: 0.07, shares: 892.1, total: 380.2 },
  { price: 0.06, shares: 654.3, total: 245.1 },
  { price: 0.05, shares: 420.0, total: 168.0 },
  { price: 0.04, shares: 310.5, total: 99.36 },
  { price: 0.03, shares: 180.2, total: 43.25 },
];

const MOCK_BIDS = [
  { price: 0.02, shares: 5460.01, total: 109.2 },
  { price: 0.01, shares: 2100.5, total: 21.01 },
];

const MAX_DEPTH = Math.max(
  ...MOCK_ASKS.map((a) => a.total),
  ...MOCK_BIDS.map((b) => b.total)
);

export const OrderBook = () => {
  const [tradeDirection, setTradeDirection] = useState<"up" | "down">("up");
  const [isExpanded, setIsExpanded] = useState(true);

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
        <span className="flex items-center gap-1.5 text-sm text-white/50">
          <span>$166,140,452 vol.</span>
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
      {/* Trade tabs + controls */}
      <div className="border-b border-white/5 px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {(["up", "down"] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => setTradeDirection(dir)}
                className={cn(
                  "text-sm font-bold transition-colors",
                  tradeDirection === dir
                    ? "text-white"
                    : "text-white/40 hover:text-white/60"
                )}
              >
                Trade {dir === "up" ? "Up" : "Down"}
              </button>
            ))}
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
              TRADE {tradeDirection === "up" ? "UP" : "DOWN"}
            </span>
            <span className="text-white/20">|</span>
            <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors">
              <span className="text-amber-400">$</span>
              Maker Rebate
            </a>
            <button className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors" aria-label="Refresh">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-6 pt-4 pb-2 text-[10px] font-black uppercase tracking-widest text-white/40">
        <div className="pl-8">Price</div>
        <div className="text-right w-20">Shares</div>
        <div className="text-right w-24">Total</div>
      </div>

      {/* Asks */}
      <div className="relative px-6">
        <div className="flex items-center py-1.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-rose-500/90">Asks</span>
        </div>
        <div className="space-y-0">
          {MOCK_ASKS.map((row) => (
            <div
              key={row.price}
              className="relative grid grid-cols-[1fr_auto_auto] gap-4 py-1.5 items-center text-sm group hover:bg-white/5 rounded"
            >
              <div
                className="absolute left-0 top-0 bottom-0 rounded-r bg-rose-500/20 max-w-full"
                style={{ width: `${(row.total / MAX_DEPTH) * 100}%` }}
              />
              <div className="relative pl-8 font-semibold text-rose-400">{row.price.toFixed(0)}¢</div>
              <div className="relative text-right w-20 text-white/70 tabular-nums">{row.shares.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              <div className="relative text-right w-24 text-white/70 tabular-nums">${row.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider + Last / Spread */}
      <div className="flex items-center justify-between px-6 py-2 border-y border-white/5 text-xs text-white/50">
        <span>Last: 3¢</span>
        <span>Spread: 1¢</span>
      </div>

      {/* Bids */}
      <div className="relative px-6 pb-4">
        <div className="flex items-center py-1.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-emerald-500/90">Bids</span>
        </div>
        <div className="space-y-0">
          {MOCK_BIDS.map((row) => (
            <div
              key={row.price}
              className="relative grid grid-cols-[1fr_auto_auto] gap-4 py-1.5 items-center text-sm group hover:bg-white/5 rounded"
            >
              <div
                className="absolute left-0 top-0 bottom-0 rounded-r bg-emerald-500/20 max-w-full"
                style={{ width: `${(row.total / MAX_DEPTH) * 100}%` }}
              />
              <div className="relative pl-8 font-semibold text-emerald-400">{row.price.toFixed(0)}¢</div>
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
