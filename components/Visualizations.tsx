import React, { useState, useMemo } from "react"
import { TrendingUp, LayoutGrid } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { cn } from "./utils"
import JointMarket3D from "./JointMarket3D"
import ElectricBorder from "./ElectricBorder"
import MarketPillSelector from "./MarketPillSelector"
import {
  JOINT_OUTCOMES,
  doesOutcomeMatch,
  calculateSelectedMarketProbability,
} from "@/lib/selectedOdds"

const QUESTIONS = [
  {
    id: 1,
    text: "Khamenei out as Supreme Leader of Iran by January 31?",
    image: "👳‍♂️",
  },
  {
    id: 2,
    text: "US strikes Iran by January 31?",
    image: "🇺🇸",
  },
  {
    id: 3,
    text: "Israel next strikes Iran by January 31?",
    image: "🇮🇱",
  },
];

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart"

const OUTCOMES = [
  { label: "Khamenei out as Supreme Leader of Iran by January 31?", prob: "70%", color: "bg-rose-500" },
  { label: "US strikes Iran by January 31?", prob: "60%", color: "bg-yellow-500" },
  { label: "Israel next strikes Iran by January 31?", prob: "50%", color: "bg-emerald-500" },
];

// Pills for 2D market selection (same order as QUESTIONS)
const MARKET_PILL_ITEMS = [
  { id: 1, label: "Khamenei out" },
  { id: 2, label: "US strikes Iran" },
  { id: 3, label: "Israel strikes" },
];

// Market id (1,2,3) -> index in JOINT_OUTCOMES.outcomes (Khamenei=0, US=1, Israel=2)
const MARKET_ID_TO_OUTCOME_INDEX: Record<number, number> = { 1: 0, 2: 1, 3: 2 };

/** Compute 2D heatmap cell values from JOINT_OUTCOMES for two markets. Order: No/Yes, Yes/Yes, No/No, Yes/No. */
function getHeatmapCellsFromOdds(
  marketAId: number,
  marketBId: number
): { value: number; label: string; aYes: boolean; bYes: boolean }[] {
  const aIdx = MARKET_ID_TO_OUTCOME_INDEX[marketAId] ?? 0;
  const bIdx = MARKET_ID_TO_OUTCOME_INDEX[marketBId] ?? 1;
  const sum = (aYes: boolean, bYes: boolean) =>
    JOINT_OUTCOMES.filter(
      (o) => o.outcomes[aIdx] === aYes && o.outcomes[bIdx] === bYes
    ).reduce((acc, o) => acc + o.probability, 0);

  return [
    { value: sum(false, true), label: "NO/YES", aYes: false, bYes: true },
    { value: sum(true, true), label: "YES/YES", aYes: true, bYes: true },
    { value: sum(false, false), label: "NO/NO", aYes: false, bYes: false },
    { value: sum(true, false), label: "YES/NO", aYes: true, bYes: false },
  ];
}

// Map probability 0–100 to opacity so heatmap matches the scale legend
/** Opacity: lower odds → very transparent; higher odds → very obvious/solid. */
const heatmapOpacityByOdds = (pct: number) => 0.04 + (pct / 100) * 0.88;

const chartConfig = {
  khamenei: { label: "Khamenei", color: "#f43f5e" },
  us_strikes: { label: "US", color: "#eab308" },
  israel_strikes: { label: "Israel", color: "#10b981" },
  selected_market: { label: "Selected Market", color: "#3b82f6" },
} satisfies ChartConfig

interface VisualizationsProps {
  activeView: "1D" | "2D" | "3D" | "Odds";
  selections: Record<number, string | null>;
  onSelectionChange: (selections: Record<number, string | null>) => void;
}

export const Visualizations = ({ activeView, selections, onSelectionChange }: VisualizationsProps) => {
  const [range, setRange] = useState<"1D" | "1M" | "ALL">("ALL");
  const [selectedMarketIds, setSelectedMarketIds] = useState<number[]>([]);

  const handleMarketSelect = (id: number) => {
    setSelectedMarketIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx !== -1) return prev.filter((_, i) => i !== idx);
      if (prev.length < 2) return [...prev, id];
      return [prev[0], id];
    });
  };

  const selectedMarketProbability = useMemo(() => {
    return calculateSelectedMarketProbability(selections);
  }, [selections]);

  const data = useMemo(() => {
    const noise = (val: number) => (Math.random() - 0.5) * val;
    const currentSelectedProb = selectedMarketProbability;

    if (range === "1D") {
      return Array.from({ length: 24 }, (_, i) => {
        const t = i / 23;
        const hour = i.toString().padStart(2, '0');
        const isLast = i === 23;
        
        // Generate historical data for selected market (dummy data with trend)
        let selectedMarketValue: number | null = null;
        if (currentSelectedProb !== null) {
          if (isLast) {
            // Latest value must be calculated correctly
            selectedMarketValue = currentSelectedProb;
          } else {
            // Historical data: trend towards current value with some noise
            const baseTrend = currentSelectedProb - 5 + (t * 5); // Trend from -5% to current
            selectedMarketValue = Number((baseTrend + noise(1.5)).toFixed(2));
            selectedMarketValue = Math.max(0, Math.min(100, selectedMarketValue)); // Clamp to 0-100
          }
        }
        
        return {
          label: `${hour}:00`,
          khamenei: Number((69 + (t * 1) + noise(0.5)).toFixed(1)),
          us_strikes: Number((59 + (t * 1) + noise(0.5)).toFixed(1)),
          israel_strikes: Number((49 + (t * 1) + noise(0.5)).toFixed(1)),
          selected_market: selectedMarketValue,
        };
      });
    }
    if (range === "1M") {
      return Array.from({ length: 30 }, (_, i) => {
        const t = i / 29;
        const isLast = i === 29;
        
        let selectedMarketValue: number | null = null;
        if (currentSelectedProb !== null) {
          if (isLast) {
            selectedMarketValue = currentSelectedProb;
          } else {
            const baseTrend = currentSelectedProb - 8 + (t * 8);
            selectedMarketValue = Number((baseTrend + noise(2)).toFixed(2));
            selectedMarketValue = Math.max(0, Math.min(100, selectedMarketValue));
          }
        }
        
        return {
          label: `Day ${i + 1}`,
          khamenei: Number((60 + (t * 10) + noise(2)).toFixed(1)),
          us_strikes: Number((50 + (t * 10) + noise(2)).toFixed(1)),
          israel_strikes: Number((40 + (t * 10) + noise(2)).toFixed(1)),
          selected_market: selectedMarketValue,
        };
      });
    }
    // ALL (Monthly - Full Year Trend)
    const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
    return months.map((m, i) => {
      const t = i / (months.length - 1);
      const isLast = i === months.length - 1;
      
      // Historical data for Khamenei climb
      const baseK = i < 8 ? 10 + (i * 3) : 34 + (i - 8) * 4.5;
      // Historical data for US and Israel strikes
      const baseUS = i < 8 ? 20 + (i * 2) : 36 + (i - 8) * 3;
      const baseIsr = i < 8 ? 15 + (i * 1.5) : 28.5 + (i - 8) * 2.7;

      let selectedMarketValue: number | null = null;
      if (currentSelectedProb !== null) {
        if (isLast) {
          selectedMarketValue = currentSelectedProb;
        } else {
          const baseTrend = currentSelectedProb - 10 + (t * 10);
          selectedMarketValue = Number((baseTrend + noise(3)).toFixed(2));
          selectedMarketValue = Math.max(0, Math.min(100, selectedMarketValue));
        }
      }

      return {
        label: m,
        khamenei: i === months.length - 1 ? 70 : Number((baseK + noise(2)).toFixed(1)),
        us_strikes: i === months.length - 1 ? 60 : Math.max(0.5, Number((baseUS + noise(1)).toFixed(1))),
        israel_strikes: i === months.length - 1 ? 50 : Math.max(0.5, Number((baseIsr + noise(1)).toFixed(1))),
        selected_market: selectedMarketValue,
      };
    });
  }, [range, selectedMarketProbability]);

  const wrapperClasses =
    activeView === "Odds"
      ? "flex flex-col gap-12 rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur-xl"
      : "flex flex-col gap-12";

  return (
    <div className={wrapperClasses}>
      {activeView === "Odds" ? (
        <div className="flex flex-col gap-8">
          {/* Selected Market Indicator */}
          {selectedMarketProbability !== null && (
            <div className="flex items-center justify-between rounded-xl bg-white text-black shadow-xl shadow-white/20 px-6 py-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-black uppercase tracking-widest">Selected Odds</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 text-xs font-bold text-black/60">
                  {QUESTIONS.map((q, idx) => {
                    const selection = selections[q.id];
                    if (!selection) return null;
                    return (
                      <div key={q.id} className="flex items-center gap-2">
                        <span>{q.image}</span>
                        <span className={cn(
                          selection === "Yes" ? "text-emerald-600" : 
                          selection === "No" ? "text-rose-600" : 
                          "text-black/60"
                        )}>
                          {selection}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-black">
                    {selectedMarketProbability.toFixed(2)}%
                  </div>
                  <div className="text-[10px] font-bold text-black/40 uppercase tracking-widest">For The Win</div>
                </div>
              </div>
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                  <th className="px-6 py-4">Yes Selection</th>
                  <th className="px-6 py-4">Market</th>
                  <th className="px-6 py-4 text-right">Odds</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {JOINT_OUTCOMES.map((row) => {
                  const isSelected = doesOutcomeMatch(row, selections);
                  return (
                    <tr 
                      key={row.id} 
                      className={cn(
                        "group transition-all",
                        isSelected 
                          ? "bg-white text-black shadow-xl shadow-white/20" 
                          : "hover:bg-white/[0.02]"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex gap-2 items-center">
                          {row.outcomes.map((isOn, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "h-3 w-3 rounded-full border-2",
                                isOn 
                                  ? cn(OUTCOMES[idx].color, "border-transparent") 
                                  : isSelected
                                  ? "border-black/20 bg-transparent"
                                  : "border-white/10 bg-transparent"
                              )}
                            />
                          ))}
                        </div>
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-sm font-bold transition-colors",
                        isSelected 
                          ? "text-black" 
                          : "text-white/40 group-hover:text-white/70"
                      )}>
                        {row.description}
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-right text-sm font-black transition-colors",
                        isSelected 
                          ? "text-black" 
                          : "text-white"
                      )}>
                        {row.probability.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
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
            <ChartContainer config={chartConfig} className="h-full w-full aspect-auto relative">
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
                  interval={range === "1D" ? 3 : range === "1M" ? 5 : 0}
                  minTickGap={20}
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
                  stroke="#eab308"
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
                {selectedMarketProbability !== null && (
                  <Line
                    dataKey="selected_market"
                    type="monotone"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    dot={(props: any) => {
                      // Only show dot on the last data point
                      const isLast = props.index === data.length - 1;
                      if (!isLast) return null;
                      return (
                        <circle
                          {...props}
                          r={6}
                          fill="#3b82f6"
                          stroke="#ffffff"
                          strokeWidth={2}
                          style={{
                            filter: "drop-shadow(0 0 12px rgba(59, 130, 246, 1))",
                            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                          }}
                        />
                      );
                    }}
                    activeDot={{
                      r: 8,
                      fill: "#3b82f6",
                      stroke: "#ffffff",
                      strokeWidth: 3,
                      style: {
                        filter: "drop-shadow(0 0 16px rgba(59, 130, 246, 1))",
                      },
                    }}
                    animationDuration={300}
                    style={{
                      filter: "drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))",
                    }}
                  />
                )}
              </LineChart>
            </ChartContainer>
            
            {/* Shining effect overlay */}
            {selectedMarketProbability !== null && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                <div 
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(90deg, 
                      transparent 0%, 
                      rgba(59, 130, 246, 0.1) 45%, 
                      rgba(59, 130, 246, 0.3) 50%, 
                      rgba(59, 130, 246, 0.1) 55%, 
                      transparent 100%
                    )`,
                    animation: "shine 3s ease-in-out infinite",
                    width: "200%",
                    height: "100%",
                  }}
                />
              </div>
            )}
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
      ) : activeView === "2D" ? (
        <div className="flex flex-col items-center gap-6 pt-2 pb-10">
          <div className="flex flex-col items-center gap-4">
            <p className="text-lg font-black text-white tracking-tight">Select two markets to view the 2D graph</p>
            <MarketPillSelector
              items={MARKET_PILL_ITEMS}
              selectedIds={selectedMarketIds}
              onSelect={handleMarketSelect}
              multiSelect
              className="market-pill-selector"
              baseColor="#0a0a0a"
              pillColor="#ffffff"
              pillTextColor="#000000"
              hoveredPillTextColor="#ffffff"
            />
          </div>

          <div className="relative flex flex-col items-center">
            {selectedMarketIds.length === 2 ? (
              (() => {
                const marketAId = selectedMarketIds[0];
                const marketBId = selectedMarketIds[1];
                const xLabel = MARKET_PILL_ITEMS.find((m) => m.id === marketAId)?.label ?? "";
                const yLabel = MARKET_PILL_ITEMS.find((m) => m.id === marketBId)?.label ?? "";
                const heatmapCells = getHeatmapCellsFromOdds(marketAId, marketBId);
                return (
                  <div className="flex items-stretch gap-3">
                    {/* Y axis (left): label rotated + Yes/No */}
                    <div className="flex flex-col items-center justify-between shrink-0 py-2" style={{ width: 32, height: 380 }}>
                      <span className="text-[10px] font-black text-white/40">Yes</span>
                      <span
                        className="text-[10px] font-black text-white/60 uppercase tracking-widest whitespace-nowrap"
                        style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                      >
                        {yLabel}
                      </span>
                      <span className="text-[10px] font-black text-white/40">No</span>
                    </div>
                    {/* Chart + X axis */}
                    <div className="flex flex-col items-center gap-2">
                      <ElectricBorder
                        color="#7df9ff"
                        speed={0.4}
                        chaos={0.15}
                        style={{ borderRadius: 16 }}
                      >
                        <div className="grid h-[380px] w-[380px] grid-cols-2 grid-rows-2 gap-2.5 rounded-2xl p-1 bg-transparent shadow-2xl">
                          {heatmapCells.map((cell) => (
                            <div
                              key={cell.label}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                const thirdMarketId = [1, 2, 3].find((id) => id !== marketAId && id !== marketBId);
                                onSelectionChange({
                                  ...selections,
                                  [marketAId]: cell.aYes ? "Yes" : "No",
                                  [marketBId]: cell.bYes ? "Yes" : "No",
                                  ...(thirdMarketId != null && { [thirdMarketId]: "Any" }),
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  const thirdMarketId = [1, 2, 3].find((id) => id !== marketAId && id !== marketBId);
                                  onSelectionChange({
                                    ...selections,
                                    [marketAId]: cell.aYes ? "Yes" : "No",
                                    [marketBId]: cell.bYes ? "Yes" : "No",
                                    ...(thirdMarketId != null && { [thirdMarketId]: "Any" }),
                                  });
                                }
                              }}
                              className="heatmap-cell-breath flex flex-col items-center justify-center relative group cursor-pointer transition-all hover:brightness-110 rounded-xl border border-white/20 backdrop-blur-xl overflow-hidden"
                              style={{
                                backgroundColor: `rgba(59, 130, 246, ${heatmapOpacityByOdds(cell.value)})`,
                                boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.15), 0 4px 24px -4px rgba(0,0,0,0.2)",
                              }}
                            >
                              <span className={cn(
                                "font-black text-white group-hover:scale-110 transition-transform",
                                cell.value >= 35 ? "text-4xl" : "text-3xl"
                              )}>
                                {cell.value.toFixed(1)}%
                              </span>
                              <span className="text-[10px] font-black text-white/70 absolute bottom-6 tracking-widest uppercase">
                                {cell.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ElectricBorder>
                      {/* X axis (below): No | label | Yes */}
                      <div className="flex items-center justify-between w-full mt-1" style={{ width: 380 }}>
                        <span className="text-[10px] font-black text-white/40">No</span>
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{xLabel}</span>
                        <span className="text-[10px] font-black text-white/40">Yes</span>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <p className="text-sm font-bold text-white/40 py-8">Select two markets above to see the joint probability chart.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-black text-white">$166,140,452 vol</span>
            </div>
          </div>
          <JointMarket3D selections={selections} onSelectionChange={onSelectionChange} />
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
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="h-3 w-3 rounded-full shadow-lg transition-transform group-hover:scale-125 bg-blue-500" />
            <p className="text-sm font-bold text-white/50 group-hover:text-white transition-colors">
              User Selected Odds <span className="text-white ml-2">{selectedMarketProbability != null ? `${selectedMarketProbability.toFixed(1)}%` : "—"}</span>
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] font-bold italic text-white/20">
        Probabilities derived from the joint-outcome AMM world table.
      </p>
    </div>
  );
};
