import Head from "next/head";
import React, { useState } from "react";
import { Navbar } from "../components/Navbar";
import { MarketHeader } from "../components/MarketHeader";
import { Visualizations } from "../components/Visualizations";
import { TradeSidebar } from "../components/TradeSidebar";

export default function Home() {
  const [view, setView] = useState<"1D" | "2D" | "Table">("1D");

  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white selection:bg-blue-100 selection:text-blue-900">
      <Head>
        <title>Iran War | Phỏcast</title>
        <meta name="description" content="Prediction market for the Iran War" />
      </Head>

      <Navbar />

      <main className="mx-auto max-w-[1440px] px-6 py-12">
        <div className="flex items-start gap-12">
          {/* Main Content Area */}
          <div className="flex-1 space-y-12">
            <MarketHeader activeView={view} onViewChange={setView} />
            <Visualizations activeView={view} />
          </div>

          {/* Sidebar */}
          <TradeSidebar />
        </div>
      </main>

      <footer className="mt-24 border-t border-zinc-100 py-12 dark:border-zinc-900">
        <div className="mx-auto max-w-[1440px] px-6 flex justify-between items-center text-[10px] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">
          <span>© 2026 Phỏcast</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Discord</a>
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
