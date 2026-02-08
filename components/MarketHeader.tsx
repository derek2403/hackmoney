"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bookmark, Link2, ChevronDown, Check } from "lucide-react";
import { cn } from "./utils";

const VIEW_TABS = ["1D", "2D", "3D", "World Table"] as const;
type ViewTab = typeof VIEW_TABS[number];

const TAB_TO_VIEW: Record<ViewTab, "1D" | "2D" | "3D" | "Odds"> = {
  "1D": "1D",
  "2D": "2D",
  "3D": "3D",
  "World Table": "Odds",
};
const VIEW_TO_TAB: Record<string, ViewTab> = {
  "1D": "1D",
  "2D": "2D",
  "3D": "3D",
  "Odds": "World Table",
};

const MARKETS = [
  { label: "Khamenei Out", color: "bg-rose-500" },
  { label: "US strikes", color: "bg-yellow-500" },
  { label: "Israel strikes", color: "bg-emerald-500" },
];

const MARKET_2D_OPTIONS = [
  { id: 1, label: "Khamenei out as Supreme Leader of Iran by March 31?" },
  { id: 2, label: "US strikes Iran by March 31?" },
  { id: 3, label: "Israel next strikes Iran by March 31?" },
];

interface MarketHeaderProps {
  activeView: "1D" | "2D" | "3D" | "Odds";
  onViewChange: (view: "1D" | "2D" | "3D" | "Odds") => void;
  marketImage?: string;
  marginals?: number[];
  selectedMarket?: number;
  onMarketChange?: (idx: number) => void;
  selected2DMarkets?: number[];
  onSelected2DMarketsChange?: (ids: number[]) => void;
}

export const MarketHeader = ({ activeView, onViewChange, marketImage = "/Khamenei.jpg", marginals = [70, 65, 65], selectedMarket = 0, onMarketChange, selected2DMarkets = [], onSelected2DMarketsChange }: MarketHeaderProps) => {
  const [isBookmarked, setIsBookmarked] = useState(false);

  return (
    <div className="flex flex-col">
      {/* Top: icon + title + info + buttons */}
      <div className="flex items-start justify-between p-8 pb-6">
        <div className="flex items-center gap-6">
          <Link href="/market">
            <div className="h-16 w-16 overflow-hidden rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl cursor-pointer hover:border-white/20 transition-colors">
              <img src={marketImage} alt="Market" className="h-full w-full object-cover" />
            </div>
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tight">Iran War</h1>
            <div className="flex items-center gap-5 text-sm text-white/40">
              <span>
                <span className="text-white/30 mr-1.5">Vol</span>
                <span className="font-bold text-white/70">$12.05M</span>
              </span>
              <span>
                <span className="text-white/30 mr-1.5">Resolution</span>
                <span className="font-bold text-white/70">March 31, 2026</span>
              </span>
              <span>
                <span className="text-white/30 mr-1.5">Type</span>
                <span className="font-bold text-white/70">Geopolitics</span>
              </span>
              <span>
                <span className="text-white/30 mr-1.5">Submarket</span>
                <span className="font-bold text-white/70">8</span>
              </span>
            </div>
          </div>
        </div>

        {/* 3 icon buttons: share, bookmark, more */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-3 rounded-xl border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95"
            aria-label="Share"
          >
            <Link2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setIsBookmarked((prev) => !prev)}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
            className={cn(
              "p-3 rounded-xl border transition-all active:scale-95",
              isBookmarked
                ? "bg-white/15 text-white border-white/20"
                : "border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
            )}
          >
            <Bookmark className="h-5 w-5" fill={isBookmarked ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            className="p-3 rounded-xl border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95"
            aria-label="More options"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Divider line */}
      <div className="h-px bg-white/[0.06]" />

      {/* Chart controls bar — split with vertical divider matching order book column */}
      <div className="flex">
        {/* Left: market selector + view tabs stacked */}
        <div className="flex-1 flex flex-col border-r border-white/[0.06] px-8">
          {/* Row 1: Market legend */}
          <div className="flex items-center gap-5 py-3 border-b border-white/[0.06]">
            {MARKETS.map((m, i) => (
              <button
                key={m.label}
                onClick={() => onMarketChange?.(i)}
                className={cn(
                  "flex items-center gap-2 transition-all",
                  selectedMarket === i ? "opacity-100" : "opacity-40 hover:opacity-60"
                )}
              >
                <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", m.color)} />
                <span className="text-sm font-bold text-white">{m.label}</span>
                <span className="text-sm font-black text-emerald-400">{marginals[i]}%</span>
              </button>
            ))}
          </div>
          {/* Row 2: View tabs */}
          <div className={cn("flex items-center gap-1 py-3", activeView === "2D" && "border-b border-white/[0.06]")}>
            {VIEW_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => onViewChange(TAB_TO_VIEW[tab])}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                  VIEW_TO_TAB[activeView] === tab
                    ? "bg-indigo-600 text-white"
                    : "text-white/30 hover:text-white/60"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Row 3: 2D market dropdowns (only when 2D active) */}
          {activeView === "2D" && (
            <div className="flex items-center gap-3 py-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30 shrink-0">Compare</span>
              {[0, 1].map((slotIdx) => {
                const currentId = selected2DMarkets[slotIdx] ?? 0;
                const otherId = selected2DMarkets[slotIdx === 0 ? 1 : 0] ?? 0;
                return (
                  <select
                    key={slotIdx}
                    value={currentId}
                    onChange={(e) => {
                      const newId = Number(e.target.value);
                      const updated = [...selected2DMarkets];
                      updated[slotIdx] = newId;
                      onSelected2DMarketsChange?.(updated.filter((id) => id > 0));
                    }}
                    className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer"
                    style={{ maxWidth: 280 }}
                  >
                    <option value={0} className="bg-[#1a1a1b] text-white/40">
                      Select market...
                    </option>
                    {MARKET_2D_OPTIONS.filter((m) => m.id !== otherId).map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#1a1a1b] text-white">
                        {m.label}
                      </option>
                    ))}
                  </select>
                );
              })}
            </div>
          )}
        </div>
        {/* Right: Order Book label */}
        <div className="w-95 shrink-0 flex items-center px-4 py-4">
          <span className="text-sm font-bold text-white">Order Book</span>
        </div>
      </div>

      {/* Divider line */}
      <div className="h-px bg-white/[0.06]" />
    </div>
  );
};
