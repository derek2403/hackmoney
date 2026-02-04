import React, { useState } from "react";
import { cn } from "./utils";

const OUTCOMES = [
  { label: "Khamenei out as Supreme Leader of Iran by January 31?", prob: "77%", color: "bg-blue-400" },
  { label: "US strikes Iran by January 31?", prob: "2.3%", color: "bg-blue-600" },
  { label: "Israel next strikes Iran by January 31?", prob: "1.7%", color: "bg-amber-400" },
];

interface VisualizationsProps {
  activeView: "1D" | "2D" | "Table";
}

export const Visualizations = ({ activeView }: VisualizationsProps) => {
  if (activeView === "Table") {
    return (
      <div className="flex flex-col gap-3 py-10 text-center text-zinc-400 italic">
        Table view coming soon...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {/* Legend */}
      <div className="flex flex-col gap-3">
        {OUTCOMES.map((oc, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", oc.color)} />
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {oc.label} <span className="text-black dark:text-white ml-1">{oc.prob}</span>
            </p>
          </div>
        ))}
      </div>

      {activeView === "1D" ? (
        <div className="relative py-20">
          <div className="relative h-[2px] w-full bg-zinc-100 dark:bg-zinc-800">
            <div className="absolute top-1/2 left-[77%] h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-blue-400 shadow-sm" />
            <div className="absolute top-1/2 left-[2.3%] h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
            <div className="absolute top-1/2 left-[1.7%] h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-amber-400 shadow-sm" />
          </div>
          <div className="mt-4 flex justify-between text-[10px] font-bold tracking-widest text-zinc-300 dark:text-zinc-500 uppercase">
            <span>Outcome No</span>
            <span>Yes</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-8 py-10">
          <div className="text-center">
            <h3 className="text-sm font-bold text-black dark:text-white">Joint Probability Heatmap</h3>
            <p className="text-[10px] text-zinc-400">Khamenei out vs US strikes Iran</p>
          </div>

          <div className="relative flex flex-col items-center ml-10">
             <div className="absolute -top-10 text-[10px] font-bold text-black dark:text-white uppercase tracking-widest flex items-center gap-2">
               Khamenei Out <span className="text-zinc-300">⇅ ⇋</span>
             </div>
             
             <div className="grid h-[320px] w-[320px] grid-cols-2 grid-rows-2 gap-[2px] rounded-3xl overflow-hidden bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-50 dark:border-zinc-900">
                <div className="bg-blue-300/40 flex flex-col items-center justify-center relative">
                    <span className="text-2xl font-bold">19.4%</span>
                    <span className="text-[8px] font-bold text-zinc-400 absolute bottom-4">YES/YES</span>
                </div>
                <div className="bg-blue-100/20 flex flex-col items-center justify-center relative">
                    <span className="text-2xl font-bold">16.3%</span>
                    <span className="text-[8px] font-bold text-zinc-400 absolute bottom-4">YES/NO</span>
                </div>
                <div className="bg-blue-600/90 flex flex-col items-center justify-center relative text-white">
                    <span className="text-2xl font-bold">40.9%</span>
                    <span className="text-[8px] font-bold text-blue-200 absolute bottom-4">NO/YES</span>
                </div>
                <div className="bg-blue-300/60 flex flex-col items-center justify-center relative">
                    <span className="text-2xl font-bold">23.5%</span>
                    <span className="text-[8px] font-bold text-zinc-400 absolute bottom-4">NO/NO</span>
                </div>
             </div>

             <div className="absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-black dark:text-white uppercase tracking-widest flex items-center gap-2">
               US Strikes Iran <span className="rotate-90">⇅</span>
             </div>

             {/* Color Scale */}
             <div className="absolute -right-12 top-0 bottom-0 flex flex-col items-center justify-between py-2 text-[10px] font-bold text-zinc-400">
                <span>100</span>
                <div className="w-4 flex-1 my-2 rounded-full bg-gradient-to-t from-blue-50 to-blue-900" />
                <span>0</span>
             </div>
          </div>
        </div>
      )}

      <p className="text-center text-[10px] italic text-zinc-300 dark:text-zinc-600">
        Probabilities derived from the joint-outcome AMM world table.
      </p>
    </div>
  );
};
