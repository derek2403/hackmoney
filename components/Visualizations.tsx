import React from "react";
import { cn } from "./utils";

const OUTCOMES = [
  { label: "Khamenei out as Supreme Leader of Iran by January 31?", prob: "77%", color: "bg-rose-500" },
  { label: "US strikes Iran by January 31?", prob: "2.3%", color: "bg-orange-500" },
  { label: "Israel next strikes Iran by January 31?", prob: "1.7%", color: "bg-emerald-500" },
];

const JOINT_OUTCOMES = [
  { id: 1, outcomes: [false, false, false], description: "Khamenei No, US No, Israel No", probability: "15.76%" },
  { id: 2, outcomes: [false, false, true], description: "Khamenei No, US No, Israel Yes", probability: "7.73%" },
  { id: 3, outcomes: [false, true, false], description: "Khamenei No, US Yes, Israel No", probability: "8.54%" },
  { id: 4, outcomes: [false, true, true], description: "Khamenei No, US Yes, Israel Yes", probability: "7.73%" },
  { id: 5, outcomes: [true, false, false], description: "Khamenei Yes, US No, Israel No", probability: "33.14%" },
  { id: 6, outcomes: [true, false, true], description: "Khamenei Yes, US No, Israel Yes", probability: "7.73%" },
  { id: 7, outcomes: [true, true, false], description: "Khamenei Yes, US Yes, Israel No", probability: "11.62%" },
  { id: 8, outcomes: [true, true, true], description: "Khamenei Yes, US Yes, Israel Yes", probability: "7.73%" },
];

interface VisualizationsProps {
  activeView: "1D" | "2D" | "Table";
}

export const Visualizations = ({ activeView }: VisualizationsProps) => {
  return (
    <div className="flex flex-col gap-12 rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur-xl">
      {activeView === "Table" ? (
        <div className="flex flex-col gap-8">
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                  <th className="px-6 py-4">Outcome</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Probability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {JOINT_OUTCOMES.map((row) => (
                  <tr key={row.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {row.outcomes.map((isOn, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "h-3 w-3 rounded-full border-2",
                              isOn 
                                ? cn(OUTCOMES[idx].color, "border-transparent") 
                                : "border-white/10 bg-transparent"
                            )}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-white/40 group-hover:text-white/70 transition-colors">
                      {row.description}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-black text-white">
                      {row.probability}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center gap-8 text-[10px] font-black uppercase tracking-widest text-white/20">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full border border-white/20 bg-rose-500" />
              <span>Filled means Yes</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full border border-white/20" />
              <span>Empty means No</span>
            </div>
          </div>
        </div>
      ) : activeView === "1D" ? (
        <div className="relative py-20 px-4">
          <div className="relative h-[2px] w-full bg-white/5">
            <div className="absolute top-1/2 left-[77%] h-4 w-4 -translate-y-1/2 rounded-full border-4 border-black bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)] transition-transform hover:scale-125 cursor-pointer" />
            <div className="absolute top-1/2 left-[2.3%] h-4 w-4 -translate-y-1/2 rounded-full border-4 border-black bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-transform hover:scale-125 cursor-pointer" />
            <div className="absolute top-1/2 left-[1.7%] h-4 w-4 -translate-y-1/2 rounded-full border-4 border-black bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-transform hover:scale-125 cursor-pointer" />
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

      {/* Legend / Status Bar */}
      <div className="flex flex-col gap-4 border-t border-white/5 pt-8">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {OUTCOMES.map((oc, i) => (
            <div key={i} className="flex items-center gap-3 group cursor-pointer">
              <div className={cn("h-3 w-3 rounded-full shadow-lg transition-transform group-hover:scale-125", oc.color)} />
              <p className="text-sm font-bold text-white/50 group-hover:text-white transition-colors">
                {oc.label} <span className="text-white ml-2">{oc.prob}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-[11px] font-bold italic text-white/20">
        Probabilities derived from the joint-outcome AMM world table.
      </p>
    </div>
  );
};
