import Head from "next/head";
import React, { useState } from "react";
import { Navbar } from "../components/Navbar";
import { MarketHeader } from "../components/MarketHeader";
import { Visualizations } from "../components/Visualizations";
import { TradeSidebar } from "../components/TradeSidebar";
import { LiquidChrome } from "../components/LiquidChrome";
import { MarketRules } from "../components/MarketRules";

export default function Home() {
  const [view, setView] = useState<"1D" | "2D" | "Odds">("1D");

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-blue-500/30 selection:text-white overflow-x-hidden">
      <Head>
        <title>Iran War | Phỏcast</title>
        <meta name="description" content="Prediction market for the Iran War" />
      </Head>

      {/* Hero Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <LiquidChrome
          baseColor={[0.1, 0.1, 0.1]}
          speed={0.3}
          amplitude={0.3}
          frequencyX={3}
          frequencyY={3}
          interactive={false}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />

        <main className="mx-auto flex-1 w-full max-w-[1440px] px-6 py-12">
          <div className="flex items-start gap-12">
            {/* Main Content Area */}
            <div className="flex-1 space-y-12">
              <MarketHeader activeView={view} onViewChange={setView} />
              <Visualizations activeView={view} />
              <MarketRules />
            </div>

            {/* Sidebar */}
            <div className="sticky top-32">
              <TradeSidebar />
            </div>
          </div>
        </main>

        <footer className="mt-24 border-t border-white/5 bg-white/5 backdrop-blur-xl py-12">
          <div className="mx-auto max-w-[1440px] px-6 flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <span>© 2026 Phỏcast</span>
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
