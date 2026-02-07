import Head from "next/head";
import React, { useState, useMemo } from "react";
import { Navbar } from "../components/Navbar";
import { calculateSelectedMarketProbability } from "@/lib/selectedOdds";
import { MarketHeader } from "../components/MarketHeader";
import { Visualizations } from "../components/Visualizations";
import { TradeSidebar } from "../components/TradeSidebar";
import Galaxy from "../components/Galaxy";
import { OrderBook } from "../components/OrderBook";
import { MarketRules } from "../components/MarketRules";

export default function Home() {
  const [view, setView] = useState<"1D" | "2D" | "3D" | "Odds">("1D");
  const [selections, setSelections] = useState<Record<number, string | null>>({
    1: null,
    2: null,
    3: null,
  });

  const avgPriceCents = useMemo(
    () => calculateSelectedMarketProbability(selections),
    [selections]
  );

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-blue-500/30 selection:text-white overflow-x-hidden">
      <Head>
        <title>Iran War | OnlyTruth</title>
        <meta name="description" content="Prediction market for the Iran War" />
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
      <div className="fixed inset-0 z-0 pointer-events-none bg-black/40" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />

        <main className="mx-auto flex-1 w-full max-w-[1440px] px-6 py-12">
          <div className="flex items-start gap-12">
            {/* Main Content Area */}
            <div className="flex-1 space-y-12">
              <MarketHeader activeView={view} onViewChange={setView} />
              <Visualizations activeView={view} selections={selections} onSelectionChange={setSelections} />
              <OrderBook avgPriceCents={avgPriceCents} />
              <MarketRules />
            </div>

            {/* Sidebar */}
            <div className="sticky top-32">
              <TradeSidebar selections={selections} onSelectionChange={setSelections} />
            </div>
          </div>
        </main>

        <footer className="mt-24 border-t border-white/5 bg-white/5 backdrop-blur-xl py-12">
          <div className="mx-auto max-w-[1440px] px-6 flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <span>© 2026 OnlyTruth</span>
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
