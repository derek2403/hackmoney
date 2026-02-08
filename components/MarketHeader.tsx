"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bookmark, Link2, ChevronDown, Check, RefreshCw, Info, PanelRightClose, PanelRightOpen } from "lucide-react";
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
  { id: 1, label: "Khamenei out as Supreme Leader of Iran by March 31?", image: "/Khamenei.jpg" },
  { id: 2, label: "US strikes Iran by March 31?", image: "/US%20Iran.jpg" },
  { id: 3, label: "Israel next strikes Iran by March 31?", image: "/israeliran.jpg" },
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
  selectedCorner?: string;
  onCornerChange?: (corner: string) => void;
  onRefreshOrderBook?: () => void;
  orderBookCollapsed?: boolean;
  onToggleOrderBook?: () => void;
}

const CORNER_LABELS = ["000", "001", "010", "011", "100", "101", "110", "111"];
const CORNER_DISPLAY: Record<string, string> = {
  "000": "NNN", "001": "NNY", "010": "NYN", "011": "NYY",
  "100": "YNN", "101": "YNY", "110": "YYN", "111": "YYY",
};

export const MarketHeader = ({ activeView, onViewChange, marketImage = "/Khamenei.jpg", marginals = [70, 65, 65], selectedMarket = 0, onMarketChange, selected2DMarkets = [], onSelected2DMarketsChange, selectedCorner = "000", onCornerChange, onRefreshOrderBook, orderBookCollapsed = false, onToggleOrderBook }: MarketHeaderProps) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [titleDropdownOpen, setTitleDropdownOpen] = useState(false);
  const [refreshSpinning, setRefreshSpinning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const titleDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (titleDropdownRef.current && !titleDropdownRef.current.contains(e.target as Node)) {
        setTitleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle2DMarket = (id: number) => {
    const isSelected = selected2DMarkets.includes(id);
    if (isSelected) {
      onSelected2DMarketsChange?.(selected2DMarkets.filter((m) => m !== id));
    } else if (selected2DMarkets.length < 2) {
      onSelected2DMarketsChange?.([...selected2DMarkets, id]);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Top: icon + title + info + buttons */}
      <div className="flex items-start justify-between px-8 py-4">
        <div className="flex items-center gap-5">
          <Link href="/market">
            <div className="h-14 w-14 overflow-hidden rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl cursor-pointer hover:border-white/20 transition-colors">
              <img src={marketImage} alt="Market" className="h-full w-full object-cover" />
            </div>
          </Link>
          <div className="space-y-1.5">
            <div className="flex items-center gap-3" ref={titleDropdownRef}>
              <h1 className="text-3xl font-black text-white tracking-tight">Iran War</h1>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTitleDropdownOpen((v) => !v)}
                  className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform", titleDropdownOpen && "rotate-180")} />
                </button>
                {titleDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 z-50 w-80 rounded-xl border border-white/10 bg-[#1a1a1b] shadow-2xl overflow-hidden">
                    <div className="p-2">
                      {MARKET_2D_OPTIONS.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-all"
                        >
                          <img src={m.image} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                          <span className="text-sm font-bold text-white/70 leading-tight">{m.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
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
              <span className="flex items-center gap-1.5 text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="font-bold text-xs">Live</span>
              </span>
            </div>
          </div>
        </div>

        {/* 3 icon buttons: share, bookmark, info */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95"
            aria-label="Share"
          >
            <Link2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setIsBookmarked((prev) => !prev)}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
            className={cn(
              "p-2 rounded-lg border transition-all active:scale-95",
              isBookmarked
                ? "bg-white/15 text-white border-white/20"
                : "border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
            )}
          >
            <Bookmark className="h-5 w-5" fill={isBookmarked ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95"
            aria-label="Info"
          >
            <Info className="h-5 w-5" />
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
          <div className="flex items-center justify-around py-3 border-b border-white/[0.06]">
            {MARKETS.map((m, i) => (
              <button
                key={m.label}
                onClick={() => onMarketChange?.(i)}
                className="flex items-center gap-1.5 transition-all opacity-100"
              >
                <div className={cn("h-2 w-2 rounded-full shrink-0", m.color)} />
                <span className="text-xs font-bold text-white">{m.label}</span>
                <span className="text-xs font-black text-emerald-400">{marginals[i]}%</span>
                <span className="text-xs font-black text-rose-400">{100 - marginals[i]}%</span>
              </button>
            ))}
          </div>
          {/* Row 2: View tabs + 2D market dropdown */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-1">
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

            {/* 2D market selector dropdown — only visible in 2D */}
            {activeView === "2D" && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 cursor-pointer text-xs font-bold transition-all"
              >
                Markets ({selected2DMarkets.length}/2)
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", dropdownOpen && "rotate-180")} />
              </button>

              {dropdownOpen && activeView === "2D" && (
                <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-white/10 bg-[#1a1a1b] shadow-2xl overflow-hidden">
                  <div className="p-2">
                    {MARKET_2D_OPTIONS.map((m) => {
                      const isChecked = selected2DMarkets.includes(m.id);
                      const isDisabled = !isChecked && selected2DMarkets.length >= 2;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => !isDisabled && toggle2DMarket(m.id)}
                          className={cn(
                            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all",
                            isDisabled
                              ? "opacity-30 cursor-not-allowed"
                              : "hover:bg-white/5 cursor-pointer"
                          )}
                        >
                          <div className={cn(
                            "h-4 w-4 rounded shrink-0 border flex items-center justify-center transition-all",
                            isChecked
                              ? "bg-indigo-600 border-indigo-500"
                              : "border-white/20 bg-white/5"
                          )}>
                            {isChecked && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span className={cn(
                            "text-xs font-bold leading-tight",
                            isChecked ? "text-white" : "text-white/60"
                          )}>
                            {m.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="px-4 py-2.5 border-t border-white/5">
                    <p className="text-[10px] text-white/30 leading-relaxed">
                      You can only select 2 in 2D market. To select all, open 3D or untick one to change to another.
                    </p>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
        {/* Right: Order Book label + corner selector (or collapse toggle) */}
        {orderBookCollapsed ? (
          <div className="shrink-0 flex items-center justify-center px-2 py-3">
            <button
              onClick={onToggleOrderBook}
              className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
              title="Show Order Book"
            >
              <PanelRightOpen className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="w-95 shrink-0 flex flex-col justify-center gap-2 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Order Book</span>
              <button
                onClick={onToggleOrderBook}
                className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                title="Hide Order Book"
              >
                <PanelRightClose className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1 flex-nowrap">
              {CORNER_LABELS.map((label) => (
                <button
                  key={label}
                  onClick={() => onCornerChange?.(label)}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold transition-all whitespace-nowrap",
                    selectedCorner === label
                      ? "bg-white/15 text-white border border-white/20"
                      : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50 border border-transparent"
                  )}
                >
                  {CORNER_DISPLAY[label]}
                </button>
              ))}
              <button
                onClick={() => {
                  setRefreshSpinning(true);
                  onRefreshOrderBook?.();
                  setTimeout(() => setRefreshSpinning(false), 600);
                }}
                className="ml-auto p-1.5 rounded text-white/30 hover:text-white hover:bg-white/10 transition-all"
                title="Refresh order book"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 transition-transform", refreshSpinning && "animate-spin")} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Divider line */}
      <div className="h-px bg-white/[0.06]" />
    </div>
  );
};
