"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Bot, RefreshCw } from "lucide-react";
import { cn } from "./utils";
import { fetchOrderBook, fetchAllOrderBooks } from "@/lib/yellow/market/marketClient";
import type { OrderBookLevel } from "@/lib/yellow/market/types";

type BookRow = { price: number; shares: number; total: number; isAmm: boolean; isVamm?: boolean };

const CORNER_LABELS = ["000", "001", "010", "011", "100", "101", "110", "111"];
const CORNER_DISPLAY: Record<string, string> = {
  "000": "NNN",
  "001": "NNY",
  "010": "NYN",
  "011": "NYY",
  "100": "YNN",
  "101": "YNY",
  "110": "YYN",
  "111": "YYY",
};
const CORNER_DESCRIPTIONS: Record<string, string> = {
  "000": "Kha No, US No, Isr No",
  "001": "Kha No, US No, Isr Yes",
  "010": "Kha No, US Yes, Isr No",
  "011": "Kha No, US Yes, Isr Yes",
  "100": "Kha Yes, US No, Isr No",
  "101": "Kha Yes, US No, Isr Yes",
  "110": "Kha Yes, US Yes, Isr No",
  "111": "Kha Yes, US Yes, Isr Yes",
};

function levelsToRows(levels: OrderBookLevel[]): BookRow[] {
  return levels.map((l) => ({
    price: l.price,
    shares: l.quantity,
    total: Math.round(l.quantity * l.price * 100) / 100,
    isAmm: l.isAmm ?? false,
  }));
}

interface OrderBookProps {
  avgPriceCents?: number | null;
  volume?: number;
  /** Which corner to show, e.g. "000". If omitted, shows a corner picker. */
  selectedCorner?: string;
  /** Render as an inline table without card wrapper (for side-by-side layout). */
  inline?: boolean;
  /** Increment to trigger a re-fetch (e.g. after a trade). */
  refreshKey?: number;
}

export const OrderBook = ({ avgPriceCents, volume = 0, selectedCorner: controlledCorner, inline = false, refreshKey }: OrderBookProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [corner, setCorner] = useState(controlledCorner || "000");
  const [asks, setAsks] = useState<BookRow[]>([]);
  const [bids, setBids] = useState<BookRow[]>([]);
  const [ammPrice, setAmmPrice] = useState<number | null>(null);
  const [lastTouched, setLastTouched] = useState<"ask" | "bid" | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Sync controlled corner prop
  useEffect(() => {
    if (controlledCorner) setCorner(controlledCorner);
  }, [controlledCorner]);

  // Poll real order book data
  const fetchData = useCallback(async () => {
    try {
      const data = await fetchOrderBook(corner);
      const newAsks = levelsToRows(data.asks);
      const newBids = levelsToRows(data.bids);

      // Sort asks descending, bids descending
      newAsks.sort((a, b) => b.price - a.price);
      newBids.sort((a, b) => b.price - a.price);

      setAsks(newAsks);
      setBids(newBids);
      setAmmPrice(data.ammPrice || null);
      setIsLive(true);
    } catch {
      setIsLive(false);
      setAsks([]);
      setBids([]);
    }
  }, [corner]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const spread = asks.length && bids.length
    ? Math.round((asks[asks.length - 1]!.price - bids[0]!.price) * 100)
    : 0;

  const maxDepth = Math.max(
    ...asks.map((a) => a.total),
    ...bids.map((b) => b.total),
    1
  );

  // Simulated data for when no real data is available
  const [simAsks, setSimAsks] = useState<BookRow[]>([]);
  const [simBids, setSimBids] = useState<BookRow[]>([]);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!inline) return;

    const generateSim = () => {
      const mid = 70; // 70¢ midpoint (realistic prediction market)
      const newAsks: BookRow[] = [];
      const newBids: BookRow[] = [];
      // Pick a random level for the vAMM order (not always closest to spread)
      const vammAskIdx = Math.floor(Math.random() * 6);
      const vammBidIdx = Math.floor(Math.random() * 6);
      for (let i = 0; i < 6; i++) {
        const askPrice = (mid + 1 + i) / 100;
        const askShares = Math.round((100 + Math.random() * 600 + i * 80) * 100) / 100;
        newAsks.push({ price: askPrice, shares: askShares, total: Math.round(askShares * askPrice * 100) / 100, isVamm: i === vammAskIdx });

        const bidPrice = (mid - i) / 100;
        const bidShares = Math.round((100 + Math.random() * 600 + i * 80) * 100) / 100;
        newBids.push({ price: bidPrice, shares: bidShares, total: Math.round(bidShares * bidPrice * 100) / 100, isVamm: i === vammBidIdx });
      }
      newAsks.sort((a, b) => b.price - a.price);
      newBids.sort((a, b) => b.price - a.price);
      setSimAsks(newAsks);
      setSimBids(newBids);
    };

    generateSim();
    simRef.current = setInterval(generateSim, 2000);
    return () => { if (simRef.current) clearInterval(simRef.current); };
  }, [inline]);

  // Use real data only if there are enough rows, otherwise show simulated
  const displayAsks = asks.length >= 5 ? asks : simAsks;
  const displayBids = bids.length >= 5 ? bids : simBids;

  // Cumulative totals for staircase effect
  const askCumulative: number[] = [];
  for (let i = displayAsks.length - 1; i >= 0; i--) {
    askCumulative[i] = displayAsks[i]!.total + (i < displayAsks.length - 1 ? askCumulative[i + 1]! : 0);
  }
  const bidCumulative: number[] = [];
  for (let i = 0; i < displayBids.length; i++) {
    bidCumulative[i] = displayBids[i]!.total + (i > 0 ? bidCumulative[i - 1]! : 0);
  }
  const maxCumulative = Math.max(...askCumulative, ...bidCumulative, 1);

  // Last traded price (lowest ask)
  const lastPrice = displayAsks.length > 0
    ? Math.round(displayAsks[displayAsks.length - 1]!.price * 100)
    : ammPrice != null ? Math.round(ammPrice * 100) : null;
  const inlineSpread = displayAsks.length > 0 && displayBids.length > 0
    ? Math.round((displayAsks[displayAsks.length - 1]!.price - displayBids[0]!.price) * 100)
    : spread;

  // ---- Inline mode (side-by-side with chart) ----
  const inlineContent = (
    <div className="flex flex-col h-full">
      {/* Corner selector */}
      {!controlledCorner && (
        <div className="flex items-center gap-1 px-4 pt-3 pb-2">
          {CORNER_LABELS.map((label) => (
            <button
              key={label}
              onClick={() => setCorner(label)}
              className={cn(
                "px-2 py-1 rounded text-[10px] font-bold transition-all whitespace-nowrap",
                corner === label
                  ? "bg-white/15 text-white border border-white/20"
                  : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50 border border-transparent"
              )}
              title={CORNER_DESCRIPTIONS[label]}
            >
              {CORNER_DISPLAY[label]}
            </button>
          ))}
          <button
            onClick={() => fetchData()}
            className="ml-auto p-1.5 rounded text-white/30 hover:text-white hover:bg-white/10 transition-all"
            title="Refresh order book"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/40">
        <div className="pl-2">Price</div>
        <div className="text-right w-20">Share</div>
        <div className="text-right w-24">Total</div>
      </div>

      {/* Asks (staircase: cumulative depth bars from left) */}
      <div className="px-4">
        {displayAsks.map((row, idx) => (
          <div
            key={row.price}
            className="relative grid grid-cols-[1fr_auto_auto_auto] gap-2 py-1.5 items-center text-sm"
          >
            <div
              className={cn("absolute left-0 top-0 bottom-0 transition-[width] duration-500", row.isVamm ? "bg-amber-500/20" : "bg-rose-500/15")}
              style={{ width: `${(askCumulative[idx]! / maxCumulative) * 100}%` }}
            />
            <div className="relative flex items-center gap-1.5 pl-2">
              <span className={cn("font-semibold tabular-nums", row.isVamm ? "text-amber-400" : "text-rose-400")}>{Math.round(row.price * 100)}¢</span>
              {row.isVamm && <Bot className="h-3 w-3 text-amber-400" />}
            </div>
            <div className="relative text-right w-20 text-white/60 tabular-nums">{row.shares.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            <div className="relative text-right w-24 text-white/60 tabular-nums">${row.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
          </div>
        ))}
      </div>

      {/* Spread line */}
      <div className="flex items-center justify-between px-4 py-2.5 border-y border-white/15 text-xs text-white/50">
        <span className="pl-2">Last: {lastPrice != null ? `${lastPrice}¢` : "—"}</span>
        <span>Spread: {Math.abs(inlineSpread)}¢</span>
      </div>

      {/* Bids (staircase: cumulative depth bars from left) */}
      <div className="px-4 pb-3">
        {displayBids.map((row, idx) => (
          <div
            key={row.price}
            className="relative grid grid-cols-[1fr_auto_auto_auto] gap-2 py-1.5 items-center text-sm"
          >
            <div
              className={cn("absolute left-0 top-0 bottom-0 transition-[width] duration-500", row.isVamm ? "bg-amber-500/20" : "bg-emerald-500/15")}
              style={{ width: `${(bidCumulative[idx]! / maxCumulative) * 100}%` }}
            />
            <div className="relative flex items-center gap-1.5 pl-2">
              <span className={cn("font-semibold tabular-nums", row.isVamm ? "text-amber-400" : "text-emerald-400")}>{Math.round(row.price * 100)}¢</span>
              {row.isVamm && <Bot className="h-3 w-3 text-amber-400" />}
            </div>
            <div className="relative text-right w-20 text-white/60 tabular-nums">{row.shares.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            <div className="relative text-right w-24 text-white/60 tabular-nums">${row.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (inline) return inlineContent;

  // ---- Card mode (standalone) ----
  return (
    <div className="max-w-4xl rounded-3xl border border-white/5 bg-white/5 p-1 backdrop-blur-xl">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((e) => !e)}
        className={cn(
          "flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/5 rounded-t-3xl",
          isExpanded ? "border-b border-white/5" : "rounded-b-3xl"
        )}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">Order Book</h2>
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <span className="flex items-center gap-1.5 text-sm text-white/50 tabular-nums">
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
          {/* Corner selector */}
          {!controlledCorner && (
            <div className="flex gap-1.5 px-6 pt-4">
              {CORNER_LABELS.map((label) => (
                <button
                  key={label}
                  onClick={() => setCorner(label)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                    corner === label
                      ? "bg-white/15 text-white border border-white/20"
                      : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50 border border-transparent"
                  )}
                  title={CORNER_DESCRIPTIONS[label]}
                >
                  {CORNER_DISPLAY[label]}
                </button>
              ))}
            </div>
          )}

          {/* Corner description + AMM price */}
          <div className="flex items-center justify-between px-6 pt-3 pb-1">
            <span className="text-[11px] font-bold text-white/40">
              {CORNER_DESCRIPTIONS[corner]}
            </span>
            {ammPrice != null && (
              <span className="text-[11px] font-bold text-blue-400">
                AMM: {Math.round(ammPrice * 100)}¢
              </span>
            )}
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-6 pt-2 pb-2 text-[10px] font-black uppercase tracking-widest text-white/40">
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
                  className={cn(
                    "relative grid grid-cols-[1fr_auto_auto] gap-4 py-1.5 items-center text-sm group hover:bg-white/5 rounded",
                    row.isAmm && "border-l-2 border-blue-400/60"
                  )}
                >
                  <div
                    className={cn(
                      "absolute left-0 top-0 bottom-0 rounded-r max-w-full transition-[width] duration-300",
                      row.isAmm ? "bg-blue-500/15" : "bg-rose-500/20"
                    )}
                    style={{ width: `${(row.total / maxDepth) * 100}%` }}
                  />
                  <div className={cn("relative pl-8 font-semibold", row.isAmm ? "text-blue-400" : "text-rose-400")}>
                    {Math.round(row.price * 100)}¢
                    {row.isAmm && <span className="ml-1.5 text-[9px] font-bold text-blue-400/70">AMM</span>}
                  </div>
                  <div className="relative text-right w-20 text-white/70 tabular-nums">{row.shares.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                  <div className="relative text-right w-24 text-white/70 tabular-nums">${row.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                </div>
              ))}
              {asks.length === 0 && (
                <div className="py-3 text-center text-xs text-white/20">No asks</div>
              )}
            </div>
          </div>

          {/* Divider + Spread */}
          <div className="flex items-center justify-between px-6 py-2 border-y border-white/5 text-xs text-white/50">
            <span>Mid: {ammPrice != null ? Math.round(ammPrice * 100) : "—"}¢</span>
            <span>Spread: {Math.abs(spread)}¢</span>
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
                  className={cn(
                    "relative grid grid-cols-[1fr_auto_auto] gap-4 py-1.5 items-center text-sm group hover:bg-white/5 rounded",
                    row.isAmm && "border-l-2 border-blue-400/60"
                  )}
                >
                  <div
                    className={cn(
                      "absolute left-0 top-0 bottom-0 rounded-r max-w-full transition-[width] duration-300",
                      row.isAmm ? "bg-blue-500/15" : "bg-emerald-500/20"
                    )}
                    style={{ width: `${(row.total / maxDepth) * 100}%` }}
                  />
                  <div className={cn("relative pl-8 font-semibold", row.isAmm ? "text-blue-400" : "text-emerald-400")}>
                    {Math.round(row.price * 100)}¢
                    {row.isAmm && <span className="ml-1.5 text-[9px] font-bold text-blue-400/70">AMM</span>}
                  </div>
                  <div className="relative text-right w-20 text-white/70 tabular-nums">{row.shares.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                  <div className="relative text-right w-24 text-white/70 tabular-nums">${row.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                </div>
              ))}
              {bids.length === 0 && (
                <div className="py-3 text-center text-xs text-white/20">No bids</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
