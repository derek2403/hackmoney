import React, { useState, useMemo } from "react"
import { TrendingUp, LayoutGrid } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { cn } from "./utils"
import JointMarket3D from "./JointMarket3D"
import ElectricBorder from "./ElectricBorder"
import {
  JOINT_OUTCOMES,
  doesOutcomeMatch,
  probabilitySumForOutcomeIds,
  outcomesFromPrices,
  type JointOutcome,
} from "@/lib/selectedOdds"
import type { CornerPrice, MarginalPrice } from "@/lib/yellow/market/types"

const QUESTIONS = [
  {
    id: 1,
    text: "Khamenei out as Supreme Leader of Iran by March 31?",
    image: "/Khamenei.jpg",
    shortLabel: "Khamenei",
  },
  {
    id: 2,
    text: "US strikes Iran by March 31?",
    image: "/US%20Iran.jpg",
    shortLabel: "US",
  },
  {
    id: 3,
    text: "Israel next strikes Iran by March 31?",
    image: "/israeliran.jpg",
    shortLabel: "IL",
  },
];

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart"

const OUTCOME_COLORS = ["bg-rose-500", "bg-yellow-500", "bg-emerald-500"];

// Pills for 2D market selection (same order as QUESTIONS)
const MARKET_PILL_ITEMS = [
  { id: 1, label: "Khamenei out" },
  { id: 2, label: "US strikes Iran" },
  { id: 3, label: "Israel strikes" },
];

// Market id (1,2,3) -> index in JOINT_OUTCOMES.outcomes (Khamenei=0, US=1, Israel=2)
const MARKET_ID_TO_OUTCOME_INDEX: Record<number, number> = { 1: 0, 2: 1, 3: 2 };

/** Compute 2D heatmap cell values for two markets. Order: No/Yes, Yes/Yes, No/No, Yes/No. */
function getHeatmapCellsFromOdds(
  marketAId: number,
  marketBId: number,
  outcomes: JointOutcome[]
): { value: number; label: string; aYes: boolean; bYes: boolean }[] {
  const aIdx = MARKET_ID_TO_OUTCOME_INDEX[marketAId] ?? 0;
  const bIdx = MARKET_ID_TO_OUTCOME_INDEX[marketBId] ?? 1;
  const sum = (aYes: boolean, bYes: boolean) =>
    outcomes.filter(
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
  selectedOutcomeIds: number[];
  onToggleOutcome: (outcomeId: number) => void;
  onSelectionChange?: (selections: Record<number, string | null>) => void;
  volume: number;
  /** Live corner prices from the market API. When provided, overrides hardcoded probabilities. */
  liveCornerPrices?: CornerPrice[] | null;
  /** Live marginal prices from the market API. */
  liveMarginals?: MarginalPrice[] | null;
  /** Selected market IDs for 2D view (from header dropdowns) */
  selected2DMarkets?: number[];
}

export const Visualizations = ({ activeView, selections, selectedOutcomeIds, onToggleOutcome, onSelectionChange, volume, liveCornerPrices, liveMarginals, selected2DMarkets = [] }: VisualizationsProps) => {
  const [range, setRange] = useState<"1D" | "1M" | "ALL">("1M");

  // Build outcomes from live prices or fall back to hardcoded
  const outcomes: JointOutcome[] = useMemo(() => {
    if (liveCornerPrices && liveCornerPrices.length === 8) {
      return outcomesFromPrices(liveCornerPrices);
    }
    return JOINT_OUTCOMES;
  }, [liveCornerPrices]);

  // Live marginal Yes percentages for the 3 events (0-100)
  const marginalYes = useMemo(() => {
    if (liveMarginals && liveMarginals.length === 3) {
      return liveMarginals.map((m) => Math.round(m.yes * 100));
    }
    // Derive from outcomes
    return [
      Math.round(outcomes.filter((o) => o.outcomes[0]).reduce((s, o) => s + o.probability, 0)),
      Math.round(outcomes.filter((o) => o.outcomes[1]).reduce((s, o) => s + o.probability, 0)),
      Math.round(outcomes.filter((o) => o.outcomes[2]).reduce((s, o) => s + o.probability, 0)),
    ];
  }, [liveMarginals, outcomes]);

  const selectedMarketProbability =
    selectedOutcomeIds.length > 0
      ? probabilitySumForOutcomeIds(selectedOutcomeIds, outcomes)
      : null;

  const data = useMemo(() => {
    // Seeded PRNG so chart noise is stable across re-renders
    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed & 0x7fffffff) / 0x7fffffff;
    };
    const noise = (val: number) => (seededRandom() - 0.5) * val;
    const currentSelectedProb = selectedMarketProbability;
    const [khaYes, usYes, isrYes] = marginalYes;

    if (range === "1D") {
      return Array.from({ length: 24 }, (_, i) => {
        const t = i / 23;
        const hour = i.toString().padStart(2, '0');
        const isLast = i === 23;

        let selectedMarketValue: number | null = null;
        if (currentSelectedProb !== null) {
          if (isLast) {
            selectedMarketValue = currentSelectedProb;
          } else {
            const baseTrend = currentSelectedProb - 5 + (t * 5);
            selectedMarketValue = Number((baseTrend + noise(1.5)).toFixed(2));
            selectedMarketValue = Math.max(0, Math.min(100, selectedMarketValue));
          }
        }

        return {
          label: `${hour}:00`,
          khamenei: isLast ? khaYes : Number(((khaYes - 1) + (t * 1) + noise(0.5)).toFixed(1)),
          us_strikes: isLast ? usYes : Number(((usYes - 1) + (t * 1) + noise(0.5)).toFixed(1)),
          israel_strikes: isLast ? isrYes : Number(((isrYes - 1) + (t * 1) + noise(0.5)).toFixed(1)),
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
          khamenei: isLast ? khaYes : Number(((khaYes - 10) + (t * 10) + noise(2)).toFixed(1)),
          us_strikes: isLast ? usYes : Number(((usYes - 10) + (t * 10) + noise(2)).toFixed(1)),
          israel_strikes: isLast ? isrYes : Number(((isrYes - 10) + (t * 10) + noise(2)).toFixed(1)),
          selected_market: selectedMarketValue,
        };
      });
    }
    // ALL (Monthly - Full Year Trend)
    const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
    return months.map((m, i) => {
      const t = i / (months.length - 1);
      const isLast = i === months.length - 1;

      const baseK = isLast ? khaYes : Math.max(0.5, khaYes * (0.3 + t * 0.7) + noise(2));
      const baseUS = isLast ? usYes : Math.max(0.5, usYes * (0.3 + t * 0.7) + noise(1));
      const baseIsr = isLast ? isrYes : Math.max(0.5, isrYes * (0.3 + t * 0.7) + noise(1));

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
        khamenei: Number(baseK.toFixed(1)),
        us_strikes: Number(baseUS.toFixed(1)),
        israel_strikes: Number(baseIsr.toFixed(1)),
        selected_market: selectedMarketValue,
      };
    });
  }, [range, selectedMarketProbability, marginalYes]);

  const wrapperClasses =
    activeView === "Odds"
      ? "flex flex-col gap-12 rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur-xl"
      : "flex flex-col h-full";

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
                {selectedOutcomeIds.length === 1 ? (
                  <div className="flex items-center gap-3 text-xs font-bold text-black/60">
                    {QUESTIONS.map((q) => {
                      const selection = selections[q.id];
                      if (!selection) return null;
                      return (
                        <div key={q.id} className="flex items-center gap-2">
                          <img
                            src={q.image}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover border border-black/10 shrink-0"
                          />
                          <span className="text-black/50">{q.shortLabel}</span>
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
                ) : (
                  <span className="text-xs font-bold text-black/60">
                    {selectedOutcomeIds.length} outcomes selected
                  </span>
                )}
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
                {outcomes.map((row) => {
                  const isSelected = selectedOutcomeIds.includes(row.id);
                  return (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onToggleOutcome(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onToggleOutcome(row.id);
                        }
                      }}
                      className={cn(
                        "group transition-all cursor-pointer",
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
                                  ? cn(OUTCOME_COLORS[idx], "border-transparent")
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
        <div className="w-full flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-[200px] w-full relative">
            <ChartContainer config={chartConfig} className="h-full w-full aspect-auto relative">
              <LineChart
                data={data}
                margin={{ left: 0, right: 5, top: 10, bottom: 20 }}
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

        </div>
      ) : activeView === "2D" ? (
        <div className="flex flex-col items-center justify-center gap-6 pt-2 pb-10 min-h-[420px]">
          <div className="relative flex flex-col items-center">
            {selected2DMarkets.length === 2 ? (
              (() => {
                const marketAId = selected2DMarkets[0];
                const marketBId = selected2DMarkets[1];
                const xLabel = MARKET_PILL_ITEMS.find((m) => m.id === marketAId)?.label ?? "";
                const yLabel = MARKET_PILL_ITEMS.find((m) => m.id === marketBId)?.label ?? "";
                const heatmapCells = getHeatmapCellsFromOdds(marketAId, marketBId, outcomes);
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
                                onSelectionChange?.({
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
                                  onSelectionChange?.({
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
              <p className="text-sm font-bold text-white/40 py-8">Select two markets from the dropdowns above to see the joint probability chart.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-black text-white tabular-nums">${volume.toLocaleString()} vol</span>
            </div>
          </div>
          <JointMarket3D
            outcomes={outcomes.map((o) => ({
              id: o.id,
              aYes: o.outcomes[0],
              bYes: o.outcomes[1],
              cYes: o.outcomes[2],
              label: o.description,
              probability: o.probability,
            }))}
            selections={selections}
            onSelectionChange={onSelectionChange}
          />
        </div>
      )}

    </div>
  );
};
