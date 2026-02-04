import React from "react";
import { Link2, Bookmark } from "lucide-react";
import { cn } from "./utils";

interface MarketHeaderProps {
  activeView: "1D" | "2D" | "Table";
  onViewChange: (view: "1D" | "2D" | "Table") => void;
}

export const MarketHeader = ({ activeView, onViewChange }: MarketHeaderProps) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl">
            🇮🇷
          </div>
          <div className="flex items-center gap-1 group cursor-pointer">
            <h1 className="text-3xl font-bold text-black dark:text-white">Iran War</h1>
            <span className="text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors">⌄</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
            <Link2 className="h-5 w-5" />
          </button>
          <button className="p-2 text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
            <Bookmark className="h-5 w-5" />
          </button>
        </div>
      </div>

      <p className="max-w-4xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        As of January 2026, Iran is in a state of severe internal upheaval and, to a lesser extent, external conflict following a rapid deterioration of its security and economic situation in the latter half of 2025. The context is defined by a brutal, large-scale crackdown on internal protests, economic collapse, and the aftermath of a direct, 12-day war with Israel in June 2025.
      </p>

      <div className="flex items-center gap-3">
        <button 
          onClick={() => onViewChange("Table")}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
            activeView === "Table" 
              ? "bg-black text-white dark:bg-zinc-100 dark:text-black" 
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
          )}
        >
          Table
        </button>
        <button 
          onClick={() => onViewChange("1D")}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all shadow-lg",
            activeView === "1D"
              ? "bg-black text-white dark:bg-zinc-100 dark:text-black shadow-zinc-200 dark:shadow-none"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 shadow-none"
          )}
        >
          1D ⌄
        </button>
        <button 
          onClick={() => onViewChange("2D")}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all shadow-lg",
            activeView === "2D"
              ? "bg-black text-white dark:bg-zinc-100 dark:text-black shadow-zinc-200 dark:shadow-none"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 shadow-none"
          )}
        >
          2D ⌄
        </button>
      </div>
    </div>
  );
};
