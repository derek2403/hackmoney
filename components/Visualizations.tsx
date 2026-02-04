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
      <div className="flex flex-col gap-3 py-10 text-center text-white/20 italic font-bold">
        Table view coming soon...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur-xl">
      {/* Legend */}
      <div className="flex flex-col gap-4">
        {OUTCOMES.map((oc, i) => (
          <div key={i} className="flex items-center gap-3 group cursor-pointer">
            <div className={cn("h-3 w-3 rounded-full shadow-lg transition-transform group-hover:scale-125", oc.color)} />
            <p className="text-sm font-bold text-white/50 group-hover:text-white transition-colors">
              {oc.label} <span className="text-white ml-2">{oc.prob}</span>
            </p>
          </div>
        ))}
      </div>

      {activeView === "1D" ? (
        <div className="relative py-20 px-4">
          <div className="relative h-[2px] w-full bg-white/5">
            <div className="absolute top-1/2 left-[77%] h-4 w-4 -translate-y-1/2 rounded-full border-4 border-black bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.5)] transition-transform hover:scale-125 cursor-pointer" />
            <div className="absolute top-1/2 left-[2.3%] h-4 w-4 -translate-y-1/2 rounded-full border-4 border-black bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-transform hover:scale-125 cursor-pointer" />
            <div className="absolute top-1/2 left-[1.7%] h-4 w-4 -translate-y-1/2 rounded-full border-4 border-black bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] transition-transform hover:scale-125 cursor-pointer" />
          </div>
          <div className="mt-8 flex justify-between text-[11px] font-black tracking-[0.2em] text-white/20 uppercase">
            <span>Outcome No</span>
            <span>Yes</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-12 py-10">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-black text-white tracking-tight">Joint Probability Heatmap</h3>
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Khamenei out vs US strikes Iran</p>
          </div>

          <div className="relative flex flex-col items-center ml-10">
             <div className="absolute -top-12 text-[11px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
               Khamenei Out <span className="text-white/20">⇅ ⇋</span>
             </div>
             
             <div className="grid h-[360px] w-[360px] grid-cols-2 grid-rows-2 gap-[3px] rounded-3xl overflow-hidden bg-white/5 border-4 border-white/5 shadow-2xl">
                <div className="bg-blue-500/20 hover:bg-blue-500/30 transition-colors flex flex-col items-center justify-center relative group cursor-pointer">
                    <span className="text-3xl font-black text-white group-hover:scale-110 transition-transform">19.4%</span>
                    <span className="text-[10px] font-black text-white/30 absolute bottom-6 tracking-widest uppercase">YES/YES</span>
                </div>
                <div className="bg-blue-300/5 hover:bg-blue-300/10 transition-colors flex flex-col items-center justify-center relative group cursor-pointer">
                    <span className="text-3xl font-black text-white/60 group-hover:scale-110 transition-transform">16.3%</span>
                    <span className="text-[10px] font-black text-white/20 absolute bottom-6 tracking-widest uppercase">YES/NO</span>
                </div>
                <div className="bg-blue-600/60 hover:bg-blue-600/70 transition-colors flex flex-col items-center justify-center relative shadow-inner group cursor-pointer">
                    <span className="text-4xl font-black text-white group-hover:scale-110 transition-transform">40.9%</span>
                    <span className="text-[10px] font-black text-blue-200 absolute bottom-6 tracking-widest uppercase">NO/YES</span>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                </div>
                <div className="bg-blue-400/30 hover:bg-blue-400/40 transition-colors flex flex-col items-center justify-center relative group cursor-pointer">
                    <span className="text-3xl font-black text-white group-hover:scale-110 transition-transform">23.5%</span>
                    <span className="text-[10px] font-black text-white/30 absolute bottom-6 tracking-widest uppercase">NO/NO</span>
                </div>
             </div>

             <div className="absolute -left-20 top-1/2 -translate-y-1/2 -rotate-90 text-[11px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
               US Strikes Iran <span className="rotate-90 text-white/20">⇅</span>
             </div>

             {/* Color Scale */}
             <div className="absolute -right-16 top-0 bottom-0 flex flex-col items-center justify-between py-4 text-[11px] font-black text-white/20">
                <span>100</span>
                <div className="w-6 flex-1 my-4 rounded-full bg-gradient-to-t from-blue-900/10 via-blue-500/50 to-blue-400 border border-white/10" />
                <span>0</span>
             </div>
          </div>
        </div>
      )}

      <p className="text-center text-[11px] font-bold italic text-white/20">
        Probabilities derived from the joint-outcome AMM world table.
      </p>
    </div>
  );
};
