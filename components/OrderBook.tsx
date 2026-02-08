"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "./utils";
import { fetchOrderBook, fetchAllOrderBooks } from "@/lib/yellow/market/marketClient";
import type { OrderBookLevel } from "@/lib/yellow/market/types";

type BookRow = { price: number; shares: number; total: number };

const CORNER_LABELS = ["000", "001", "010", "011", "100", "101", "110", "111"];
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
  }));
}

interface OrderBookProps {
  avgPriceCents?: number | null;
  volume?: number;
  /** Which corner to show, e.g. "000". If omitted, shows a corner picker. */
  selectedCorner?: string;
  /** Increment to trigger a re-fetch (e.g. after a trade). */
  refreshKey?: number;
}

export const OrderBook = ({ avgPriceCents, volume = 0, selectedCorner: controlledCorner, refreshKey }: OrderBookProps) => {
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
          <span>${(volume || 0).toLocaleString()} vol.</span>
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
            <div className="flex flex-wrap gap-1.5 px-6 pt-4">
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
                  {label}
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
