import Head from "next/head";
import Link from "next/link";
import React, { useState } from "react";
import { Space_Grotesk } from "next/font/google";
import { ChevronRight } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { MarketHeader } from "../components/MarketHeader";
import { Visualizations } from "../components/Visualizations";
import { TradeSidebar } from "../components/TradeSidebar";
import Galaxy from "../components/Galaxy";
import { MarketRules } from "../components/MarketRules";
import { cn } from "../components/utils";

const spaceGrotesk = Space_Grotesk({
  weight: "400",
  subsets: ["latin"],
});

const RECENT_TRADES = [
  { time: "2m ago", user: "0x1a2b...9f3c", market: "Khamenei", side: "Yes", amount: "$420", color: "text-emerald-400" },
  { time: "5m ago", user: "0x4d5e...2a1b", market: "US strikes", side: "No", amount: "$1,200", color: "text-rose-400" },
  { time: "8m ago", user: "0x7f8g...5c4d", market: "Israel strikes", side: "Yes", amount: "$350", color: "text-emerald-400" },
  { time: "12m ago", user: "0x2b3c...8e7f", market: "Khamenei", side: "Yes", amount: "$800", color: "text-emerald-400" },
  { time: "15m ago", user: "0x9a0b...1d2e", market: "US strikes", side: "Yes", amount: "$2,500", color: "text-emerald-400" },
];

const MARKET_INFO = [
  { label: "Volume", value: "$1.2M", color: "" },
  { label: "24h Change", value: "+5.2%", color: "text-emerald-400" },
  { label: "Participants", value: "2.4K", color: "" },
  { label: "Resolution", value: "Jan 31, 2026", color: "" },
];

const OUTCOMES_TABLE = [
  { label: "Khamenei out as Supreme Leader of Iran by January 31?", chance: "70%", volume: "$800K", yesPrice: "70¢", noPrice: "30¢" },
  { label: "US strikes Iran by January 31?", chance: "60%", volume: "$600K", yesPrice: "60¢", noPrice: "40¢" },
  { label: "Israel next strikes Iran by January 31?", chance: "50%", volume: "$400K", yesPrice: "50¢", noPrice: "50¢" },
];

const BOTTOM_TABS = ["Rules", "History", "Activity"] as const;

export default function Home() {
  const [view, setView] = useState<"1D" | "2D" | "3D" | "Odds">("1D");
  const [selections, setSelections] = useState<Record<number, string | null>>({
    1: null,
    2: null,
    3: null,
  });
  const [bottomTab, setBottomTab] = useState<typeof BOTTOM_TABS[number]>("Rules");

  return (
    <div className={`${spaceGrotesk.className} relative min-h-screen bg-[#0a0a0b] text-white selection:bg-blue-500/30 selection:text-white overflow-x-hidden no-scrollbar`}>
      <Head>
        <title>Iran War | OnlyTruth</title>
        <meta name="description" content="Prediction market for the Iran War" />
        <style>{`html, body { scrollbar-width: none; -ms-overflow-style: none; } html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }`}</style>
      </Head>

      {/* Galaxy background – full viewport, no mouse interaction */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
        <Galaxy
          mouseRepulsion={false}
          mouseInteraction={false}
          density={0.7}
          glowIntensity={0.2}
          saturation={0.4}
          hueShift={140}
          twinkleIntensity={0.9}
          rotationSpeed={0.05}
          repulsionStrength={8}
          autoCenterRepulsion={0}
          starSpeed={0.3}
          speed={0.3}
        />
      </div>
      {/* Dark overlay for content readability */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#0a0a0b]/40" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />

        <main className="mx-auto flex-1 w-full max-w-[1440px] px-6 pt-4 pb-12">
          <div className="flex items-stretch gap-12">
            {/* Main Content Area */}
            <div className="flex-1">
              {/* Unified Market Card */}
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-xs font-bold text-white/30 px-8 pt-6">
                  <Link href="/" className="hover:text-white transition-colors">Home</Link>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-white/60">Iran War</span>
                </nav>

                {/* Header */}
                <MarketHeader activeView={view} onViewChange={setView} />

                {/* Market Info Strip */}
                <div className="flex items-center justify-between border-t border-white/[0.06] px-8 py-4">
                  {MARKET_INFO.map((item, idx) => (
                    <React.Fragment key={item.label}>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                          {item.label}
                        </span>
                        <span className={cn("text-lg font-black", item.color || "text-white")}>
                          {item.value}
                        </span>
                      </div>
                      {idx < 3 && <div className="h-8 w-px bg-white/[0.06]" />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Chart / Visualizations */}
                <div className="border-t border-white/[0.06] px-8 py-8">
                  <Visualizations activeView={view} selections={selections} onSelectionChange={setSelections} />
                </div>

                {/* Outcome Table (Polymarket style) */}
                <div className="border-t border-white/[0.06]">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                        <th className="px-8 py-4 text-left">Outcome</th>
                        <th className="px-4 py-4 text-center">Chance</th>
                        <th className="px-4 py-4 text-center">Volume</th>
                        <th className="px-8 py-4 text-right">Trade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {OUTCOMES_TABLE.map((outcome) => (
                        <tr key={outcome.label} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-5">
                            <span className="text-sm font-bold text-white/80">{outcome.label}</span>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <span className="text-sm font-black text-white">{outcome.chance}</span>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <span className="text-sm font-bold text-white/40">{outcome.volume}</span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex gap-2 justify-end">
                              <button className="rounded-lg bg-emerald-500/15 border border-emerald-500/25 px-4 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                                Yes {outcome.yesPrice}
                              </button>
                              <button className="rounded-lg bg-rose-500/15 border border-rose-500/25 px-4 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/25 transition-colors">
                                No {outcome.noPrice}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Tabs */}
                <div className="border-t border-white/[0.06]">
                  <div className="flex items-center gap-12 px-8 pt-6 pb-0">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Market</span>
                      <div className="flex gap-2 mt-3">
                        {BOTTOM_TABS.map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setBottomTab(tab)}
                            className={cn(
                              "rounded-full px-4 py-1.5 text-xs font-bold transition-all",
                              bottomTab === tab
                                ? "bg-white text-black"
                                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                            )}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="px-8 py-6">
                    {bottomTab === "Rules" && <MarketRules />}
                    {bottomTab === "History" && (
                      <p className="text-sm text-white/30 py-4">No trade history yet.</p>
                    )}
                    {bottomTab === "Activity" && (
                      <div className="divide-y divide-white/[0.04]">
                        {RECENT_TRADES.map((trade, idx) => (
                          <div key={idx} className="flex items-center justify-between py-4 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] font-black text-white/20 w-16">{trade.time}</span>
                              <span className="text-xs font-bold text-white/40 font-mono">{trade.user}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-bold text-white/50">{trade.market}</span>
                              <span className={cn("text-xs font-black", trade.color)}>{trade.side}</span>
                              <span className="text-sm font-black text-white w-20 text-right">{trade.amount}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-95 shrink-0">
              <div className="sticky top-20">
                <TradeSidebar selections={selections} onSelectionChange={setSelections} />
              </div>
            </div>
          </div>
        </main>

        <footer className="mt-16 border-t border-white/5 bg-white/5 backdrop-blur-xl py-12">
          <div className="mx-auto max-w-[1440px] px-6 flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <span>&copy; 2026 OnlyTruth</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">Discord</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
