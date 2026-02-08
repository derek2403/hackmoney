"use client";

import React, { useState } from "react";
import { cn } from "./utils";

export const MarketRules = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="max-w-4xl p-1 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setIsExpanded((e) => !e)}
        className={cn(
          "flex w-full items-center justify-between px-8 py-4 text-left transition-colors hover:bg-white/5 rounded-t-3xl",
          isExpanded ? "border-b border-white/5" : "rounded-b-3xl"
        )}
      >
        <span className="flex items-center gap-2">
          <span className="font-bold text-white">Market Rules</span>
        </span>
        <svg
          className={cn("w-4 h-4 text-white/50 transition-transform", isExpanded && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
      <div className="px-8 py-6 space-y-4 text-sm font-medium leading-relaxed text-white/50">
        <p>
            This market will resolve to "Yes" if the US initiates a drone, missile, or air strike on Iranian soil or any official Iranian embassy or consulate between the time of this market's creation and the listed date (ET). Otherwise, this market will resolve to "No".
          </p>
        <p>
          For the purposes of this market, a qualifying "strike" is defined as the use of aerial bombs, drones or missiles (including cruise or ballistic missiles) launched by US military forces that impact Iranian ground territory or any official Iranian embassy or consulate (e.g., if a weapons depot on Iranian soil is hit by an US missile, this market will resolve to "Yes").
        </p>
        <p>
          Missiles or drones which are intercepted and surface-to-air missile strikes will not be sufficient for a "Yes" resolution regardless of whether they land on Iranian territory or cause damage.
        </p>
        <p>
          Actions such as artillery fire, small arms fire, FPV or ATGM strikes directly, ground incursions, naval shelling, cyberattacks, or other operations conducted by US ground operatives will not qualify.
        </p>
        <div className="pt-2 border-t border-white/5 text-[10px] font-black uppercase tracking-widest text-white/30">
          Created At: Jan 29, 2026, 5:19 PM ET
        </div>
      </div>
      )}
    </div>
  );
};
