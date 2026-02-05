import React, { useState, useMemo } from "react"
import { TrendingUp, LayoutGrid } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { cn } from "./utils"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart"

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

const chartConfig = {
  khamenei: { label: "Khamenei", color: "#f43f5e" },
  us_strikes: { label: "US", color: "#f97316" },
  israel_strikes: { label: "Israel", color: "#10b981" },
} satisfies ChartConfig

interface VisualizationsProps {
  activeView: "1D" | "2D" | "Table";
}

export const Visualizations = ({ activeView }: VisualizationsProps) => {
  const [range, setRange] = useState<"1D" | "1M" | "ALL">("ALL");

  const data = useMemo(() => {
    // Helper for organic noise
    const noise = (val: number) => (Math.random() - 0.5) * val;

    if (range === "1D") {
      return Array.from({ length: 24 }, (_, i) => {
        const t = i / 23;
        return {
          label: `${i}:00`,
          khamenei: Number((76 + (t * 1) + noise(0.5)).toFixed(1)),
          us_strikes: Number((3 - (t * 0.7) + noise(0.2)).toFixed(1)),
          israel_strikes: Number((2.5 - (t * 0.8) + noise(0.2)).toFixed(1)),
        };
      });
    }
    if (range === "1M") {
      return Array.from({ length: 30 }, (_, i) => {
        const t = i / 29;
        return {
          label: `${i + 1}日`,
          khamenei: Number((65 + (t * 12) + noise(2)).toFixed(1)),
          us_strikes: Number((8 - (t * 5.7) + noise(1)).toFixed(1)),
          israel_strikes: Number((7 - (t * 5.3) + noise(1)).toFixed(1)),
        };
      });
    }
    // ALL (Monthly)
    return [
      { label: "10月", khamenei: 15, us_strikes: 12, israel_strikes: 10 },
      { label: "11月", khamenei: 22, us_strikes: 18, israel_strikes: 15 },
      { label: "12月", khamenei: 38, us_strikes: 25, israel_strikes: 20 },
      { label: "1月", khamenei: 62, us_strikes: 12, israel_strikes: 10 },
      { label: "2月", khamenei: 77, us_strikes: 2.3, israel_strikes: 1.7 },
    ];
  }, [range]);

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
        <div className="w-full">
          <div className="h-[350px] w-full relative">
            <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
              <LineChart
                data={data}
                margin={{ left: 0, right: 40, top: 10, bottom: 20 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900 }}
                  dy={10}
                  interval={range === "1D" ? 3 : range === "1M" ? 5 : 2}
                />
                <YAxis
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900 }}
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80]}
                  tickFormatter={(val) => `${val}%`}
                />
                <ChartTooltip 
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} 
                  content={<ChartTooltipContent hideLabel valueFormatter={(val) => `${val}%`} />} 
                />
                <Line
                  dataKey="khamenei"
                  type="monotone"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  dot={false}
                  animationDuration={0}
                />
                <Line
                  dataKey="us_strikes"
                  type="monotone"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={false}
                  animationDuration={0}
                />
                <Line
                  dataKey="israel_strikes"
                  type="monotone"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                  animationDuration={0}
                />
              </LineChart>
            </ChartContainer>
          </div>

          <div className="mt-12 flex justify-between items-center border-t border-white/5 pt-8">
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-black text-white">$166,140,452 vol</span>
            </div>
            
            <div className="flex items-center gap-4 text-[11px] font-black text-white/30 tracking-widest uppercase">
              <span 
                onClick={() => setRange("1D")}
                className={cn("hover:text-white cursor-pointer transition-colors", range === "1D" && "text-white")}
              >1D</span>
              <span 
                onClick={() => setRange("1M")}
                className={cn("hover:text-white cursor-pointer transition-colors", range === "1M" && "text-white")}
              >1M</span>
              <span 
                onClick={() => setRange("ALL")}
                className={cn("hover:text-white cursor-pointer transition-colors", range === "ALL" && "text-white")}
              >ALL</span>
              <LayoutGrid className="h-4 w-4 ml-2" />
            </div>
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
