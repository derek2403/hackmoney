import Head from "next/head";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Space_Grotesk } from "next/font/google";
import { Navbar } from "../components/Navbar";
import {
  probabilitySumForOutcomeIds,
  selectionsToOutcomeIds,
  selectedOutcomeIdsToSelections,
  outcomesFromPrices,
} from "@/lib/selectedOdds";
import { MarketHeader } from "../components/MarketHeader";
import { Visualizations } from "../components/Visualizations";
import { TradeSidebar } from "../components/TradeSidebar";
import Galaxy from "../components/Galaxy";
import { OrderBook } from "../components/OrderBook";
import { MarketRules } from "../components/MarketRules";
import { SidebarFeed } from "../components/SidebarFeed";
import { MarketPositions } from "../components/MarketPositions";
import { fetchMarketPrices, registerSession, fundMarket } from "@/lib/yellow/market/marketClient";
import type { MarketPrices } from "@/lib/yellow/market/types";
import { useYellowSession } from "../hooks/useYellowSession";
import { cn } from "../components/utils";

const spaceGrotesk = Space_Grotesk({
  weight: "400",
  subsets: ["latin"],
});


export default function IranWar() {
  const yellow = useYellowSession();

  const [view, setView] = useState<"1D" | "2D" | "3D" | "Odds">("1D");
  const [selectedOutcomeIds, setSelectedOutcomeIds] = useState<number[]>([]);
  const [marketData, setMarketData] = useState<MarketPrices | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fundAmount, setFundAmount] = useState("100");

  const [selectedMarket, setSelectedMarket] = useState(0);
  const [selected2DMarkets, setSelected2DMarkets] = useState<number[]>([]);
  const [selectedCorner, setSelectedCorner] = useState("000");

  const marketStatus = marketData?.status ?? "seeding";

  const selections = useMemo(
    () => selectedOutcomeIdsToSelections(selectedOutcomeIds),
    [selectedOutcomeIds]
  );

  const liveOutcomes = useMemo(() => {
    if (marketData?.corners && marketData.corners.length === 8) {
      return outcomesFromPrices(marketData.corners);
    }
    return undefined;
  }, [marketData?.corners]);

  const marginals = useMemo(() => {
    if (marketData?.marginals && marketData.marginals.length === 3) {
      return marketData.marginals.map((m) => Math.round(m.yes * 100));
    }
    return [70, 65, 65];
  }, [marketData?.marginals]);

  const avgPriceCents = useMemo(
    () =>
      selectedOutcomeIds.length > 0
        ? probabilitySumForOutcomeIds(selectedOutcomeIds, liveOutcomes)
        : null,
    [selectedOutcomeIds, liveOutcomes]
  );

  const handleToggleOutcome = (outcomeId: number) => {
    setSelectedOutcomeIds((prev) =>
      prev.includes(outcomeId)
        ? prev.filter((id) => id !== outcomeId)
        : [...prev, outcomeId]
    );
  };

  // Poll live market data from CLOB server
  const fetchPrices = useCallback(async () => {
    try {
      const data = await fetchMarketPrices();
      setMarketData(data);
    } catch {
      // Server not running
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, 3000);
    return () => clearInterval(id);
  }, [fetchPrices, refreshKey]);

  const volume = marketData?.totalVolume ?? 0;

  // When session becomes active, register it with the market server
  useEffect(() => {
    if (yellow.appSessionStatus === "active" && yellow.account && yellow.appSessionId) {
      registerSession({
        user: yellow.account,
        sessionId: yellow.appSessionId,
        userBalance: yellow.payerBalance,
      }).catch(() => {});
    }
  }, [yellow.appSessionStatus, yellow.account, yellow.appSessionId, yellow.payerBalance]);

  const handleTradeComplete = useCallback(async () => {
    setRefreshKey((k) => k + 1);
    fetchPrices();
  }, [fetchPrices]);

  // ==================== FUND (BUY COMPLETE SETS) ====================
  const handleFund = async () => {
    if (!yellow.account) return;
    const amt = parseFloat(fundAmount);
    if (isNaN(amt) || amt <= 0) return;
    try {
      await fundMarket(yellow.account, amt);
      fetchPrices();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Fund failed:", err);
    }
  };

  // ==================== BUY FLOW ====================
  const handlePostBuy = useCallback(async (cost: number) => {
    if (yellow.appSessionStatus !== "active" || cost <= 0) return;

    const ok = await yellow.sendPaymentToCLOB(cost);
    if (!ok) {
      console.warn("Failed to send instant payment for trade — session may be out of sync");
    }

    if (yellow.account) {
      await registerSession({ user: yellow.account, userBalance: yellow.payerBalance - cost }).catch(() => {});
    }
  }, [yellow]);

  // ==================== SELL FLOW ====================
  const handlePostSell = useCallback(async (revenue: number) => {
    if (yellow.appSessionStatus !== "active" || revenue <= 0) return;

    const ok = await yellow.receivePaymentFromCLOB(revenue);
    if (!ok) {
      console.warn("Failed to receive instant payment for sale");
    }

    if (yellow.account) {
      await registerSession({ user: yellow.account, userBalance: yellow.payerBalance + revenue }).catch(() => {});
    }
  }, [yellow]);

  return (
    <div className={`${spaceGrotesk.className} relative min-h-screen bg-[#0a0a0b] text-white selection:bg-blue-500/30 selection:text-white overflow-x-hidden no-scrollbar`}>
      <Head>
        <title>Iran War | OnlyTruth</title>
        <meta name="description" content="Prediction market for the Iran War" />
        <style>{`html, body { scrollbar-width: none; -ms-overflow-style: none; } html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }`}</style>
      </Head>

      {/* Galaxy background */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
        <Galaxy
          mouseRepulsion={false} mouseInteraction={false} density={0.7}
          glowIntensity={0.2} saturation={0.4} hueShift={140}
          twinkleIntensity={0.9} rotationSpeed={0.05} repulsionStrength={8}
          autoCenterRepulsion={0} starSpeed={0.3} speed={0.3}
        />
      </div>
      {/* Dark overlay for content readability */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#0a0a0b]/40" />
      <div className="fixed inset-0 z-0 pointer-events-none bg-black/40" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />

        <main className="mx-auto flex-1 w-full max-w-[1440px] px-6 pt-4 pb-12">
          <div className="flex items-stretch gap-12">
            {/* Main Content Area */}
            <div className="flex-1">
              {/* Unified Market Card */}
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
                {/* Header */}
                <MarketHeader
                  activeView={view}
                  onViewChange={setView}
                  marginals={marginals}
                  selectedMarket={selectedMarket}
                  onMarketChange={setSelectedMarket}
                  selected2DMarkets={selected2DMarkets}
                  onSelected2DMarketsChange={setSelected2DMarkets}
                  selectedCorner={selectedCorner}
                  onCornerChange={setSelectedCorner}
                />

                {/* Chart + Order Book side by side (vertical line spans full height) */}
                <div className="flex items-stretch">
                  {/* Left: Chart / Visualizations */}
                  <div className="flex-1 border-r border-white/[0.06] pl-6 pr-2 py-2 flex flex-col">
                    <div className="w-full flex-1 flex flex-col min-h-0">
                      <Visualizations
                        activeView={view}
                        selections={selections}
                        selectedOutcomeIds={selectedOutcomeIds}
                        onToggleOutcome={handleToggleOutcome}
                        onSelectionChange={(s: Record<number, string | null>) => {
                          const ids = selectionsToOutcomeIds(s);
                          setSelectedOutcomeIds(ids.length === 8 ? [] : ids);
                        }}
                        volume={volume}
                        liveCornerPrices={marketData?.corners ?? null}
                        liveMarginals={marketData?.marginals ?? null}
                        selected2DMarkets={selected2DMarkets}
                      />
                    </div>
                  </div>

                  {/* Right: Order Book (inline) */}
                  <div className="w-95 shrink-0">
                    <OrderBook avgPriceCents={avgPriceCents} volume={volume} inline selectedCorner={selectedCorner} />
                  </div>
                </div>


                {/* Positions */}
                <MarketPositions
                  userAddress={yellow.account ?? null}
                  refreshKey={refreshKey}
                />

                {/* Maker Controls — visible during seeding */}
                {yellow.account && marketStatus === "seeding" && (
                  <div className="border-t border-white/[0.06] px-8 py-6">
                    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 space-y-3">
                      <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Market Maker</h2>
                      <p className="text-[11px] text-white/40">Buy complete sets to get shares of all 8 corners, then place sell orders to set prices.</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          className="w-20 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-bold text-white outline-none focus:border-white/30 text-right"
                          placeholder="100"
                        />
                        <span className="text-xs text-white/30">sets</span>
                        <button
                          onClick={handleFund}
                          className="px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold hover:bg-yellow-500/30 transition-colors"
                        >
                          Buy Complete Sets ($1/set)
                        </button>
                        <span className="text-[11px] text-white/30 ml-2">Then use Sell + Limit in sidebar to set prices</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Market Rules */}
                <div className="border-t border-white/[0.06] px-8 py-6">
                  <MarketRules />
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-95 shrink-0">
              <div className="sticky top-20 flex flex-col gap-6">
                <TradeSidebar
                  selections={selections}
                  onSelectionChange={(s) => {
                    const ids = selectionsToOutcomeIds(s);
                    setSelectedOutcomeIds(ids.length === 8 ? [] : ids);
                  }}
                  forTheWinPercent={avgPriceCents}
                  userAddress={yellow.account ?? null}
                  liveMarginals={marketData?.marginals ?? null}
                  userBalance={yellow.payerBalance}
                  onTradeComplete={handleTradeComplete}
                  onPostBuy={handlePostBuy}
                  onPostSell={handlePostSell}
                />
                <SidebarFeed />
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
