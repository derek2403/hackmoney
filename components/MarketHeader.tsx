import React from "react";
import { Link2, Bookmark } from "lucide-react";
import { cn } from "./utils";

interface MarketHeaderProps {
  activeView: "1D" | "2D" | "Odds";
  onViewChange: (view: "1D" | "2D" | "Odds") => void;
}

export const MarketHeader = ({ activeView, onViewChange }: MarketHeaderProps) => {
  return (
    <div className="flex flex-col gap-8 rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 overflow-hidden rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-2xl">
            🇮🇷
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 group cursor-pointer">
              <h1 className="text-4xl font-black text-white tracking-tight">Iran War</h1>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Market
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-3 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-lg">
            <Bookmark className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => onViewChange("Odds")}
          className={cn(
            "rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all",
            activeView === "Odds" 
              ? "bg-white text-black shadow-xl shadow-white/20 scale-105" 
              : "bg-white/5 text-white/30 hover:bg-white/10 border border-white/5"
          )}
        >
          Odds
        </button>
        <div className="h-4 w-[1px] bg-white/10 mx-2" />
        <button 
          onClick={() => onViewChange("1D")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all",
            activeView === "1D"
              ? "bg-white text-black shadow-xl shadow-white/20 scale-105"
              : "bg-white/5 text-white/30 hover:bg-white/10 border border-white/5"
          )}
        >
          1D <span className="text-[8px] opacity-40">⌄</span>
        </button>
        <button 
          onClick={() => onViewChange("2D")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all",
            activeView === "2D"
              ? "bg-white text-black shadow-xl shadow-white/20 scale-105"
              : "bg-white/5 text-white/30 hover:bg-white/10 border border-white/5"
          )}
        >
          2D <span className="text-[8px] opacity-40">⌄</span>
        </button>
      </div>
    </div>
  );
};
