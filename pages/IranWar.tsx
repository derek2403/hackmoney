import Head from "next/head";
import Link from "next/link";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
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

import { OrderBook } from "../components/OrderBook";
import { MarketRules } from "../components/MarketRules";
import { SidebarFeed } from "../components/SidebarFeed";
import { MarketPositions } from "../components/MarketPositions";
import { fetchMarketPrices, fetchPositions, registerSession, fundMarket } from "@/lib/yellow/market/marketClient";
import type { MarketPrices } from "@/lib/yellow/market/types";
import { useYellowSession } from "../hooks/useYellowSession";
import { useAccount } from "wagmi";
import { cn } from "../components/utils";

const spaceGrotesk = Space_Grotesk({
  weight: "400",
  subsets: ["latin"],
});


export default function IranWar() {
  const yellow = useYellowSession();
  const { address: wagmiAddress } = useAccount();

  const [view, setView] = useState<"1D" | "2D" | "3D" | "Odds">("1D");
  const [selectedOutcomeIds, setSelectedOutcomeIds] = useState<number[]>([]);
  const [marketData, setMarketData] = useState<MarketPrices | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fundAmount, setFundAmount] = useState("100");

  const [selectedMarket, setSelectedMarket] = useState(0);
  const [selected2DMarkets, setSelected2DMarkets] = useState<number[]>([]);
  const [selectedCorner, setSelectedCorner] = useState("000");
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [serverUsdBalance, setServerUsdBalance] = useState(0);
  const [orderBookCollapsed, setOrderBookCollapsed] = useState(false);

  // Auto-connect Yellow session when wagmi wallet connects
  useEffect(() => {
    if (wagmiAddress && !yellow.account) {
      yellow.connectWallet();
    }
  }, [wagmiAddress, yellow.account, yellow.connectWallet]);

  // Auto-create trading session with full ledger balance once authenticated + CLOB ready
  // Manual session creation flow:
  // 1. User clicks "Request Faucet" -> requesting faucet + setting isWaitingForFunds = true
  // 2. Once ledger balance > 0 and isWaitingForFunds = true -> create session
  const [isWaitingForFunds, setIsWaitingForFunds] = useState(false);
  const ledgerNum = parseFloat(yellow.ledgerBalance) || 0;

  useEffect(() => {
    if (
      isWaitingForFunds &&
      ledgerNum > 0 &&
      yellow.appSessionStatus === 'none' &&
      !yellow.isSessionLoading
    ) {
      console.log('[IranWar] Funds received, creating session...');
      // Small delay to ensure balance is fully propagated/usable if needed, 
      // or just call it immediately.
      yellow.createAppSession(ledgerNum);
      setIsWaitingForFunds(false);
    }
  }, [ledgerNum, isWaitingForFunds, yellow.appSessionStatus, yellow.isSessionLoading, yellow.createAppSession]);

  const handleRequestFaucetAndCreateSession = useCallback(async () => {
    await yellow.requestFaucet();
    setIsWaitingForFunds(true);
  }, [yellow.requestFaucet]);

  // Fetch portfolio value + server-tracked USD balance
  useEffect(() => {
    if (yellow.account) {
      fetchPositions(yellow.account)
        .then((p) => {
          setPortfolioValue(p.totalShareValue);
          setServerUsdBalance(p.usdBalance ?? 0);
        })
        .catch(() => { });
    }
  }, [yellow.account, refreshKey]);

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
  }, [fetchPrices, refreshKey]);

  const volume = marketData?.totalVolume ?? 0;

  // When session becomes active, register it with the market server
  useEffect(() => {
    if (yellow.appSessionStatus === "active" && yellow.account && yellow.appSessionId) {
      registerSession({
        user: yellow.account,
        sessionId: yellow.appSessionId,
        userBalance: yellow.payerBalance,
      }).catch(() => { });
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
    if (cost <= 0) return;

    // If Yellow session is active, send instant payment
    if (yellow.appSessionStatus === "active") {
      const ok = await yellow.sendPaymentToCLOB(cost);
      if (!ok) {
        console.warn("Failed to send instant payment for trade — session may be out of sync");
      }
      if (yellow.account) {
        await registerSession({ user: yellow.account, userBalance: yellow.payerBalance - cost }).catch(() => { });
      }
    }

    // Refresh server-tracked balance
    setRefreshKey((k) => k + 1);
  }, [yellow]);

  // ==================== SELL FLOW ====================
  const handlePostSell = useCallback(async (revenue: number) => {
    if (revenue <= 0) return;

    // If Yellow session is active, receive instant payment
    if (yellow.appSessionStatus === "active") {
      const ok = await yellow.receivePaymentFromCLOB(revenue);
      if (!ok) {
        console.warn("Failed to receive instant payment for sale");
      }
      if (yellow.account) {
        await registerSession({ user: yellow.account, userBalance: yellow.payerBalance + revenue }).catch(() => { });
      }
    }

    // Refresh server-tracked balance
    setRefreshKey((k) => k + 1);
  }, [yellow]);

  // ==================== NAVBAR DEPOSIT HANDLER ====================
  const handleNavbarCreateSession = useCallback(async (amount: number) => {
    await yellow.createAppSession(amount);
  }, [yellow.createAppSession]);

  const handleNavbarDeposit = useCallback(async (amount: number) => {
    return yellow.depositToSession(amount);
  }, [yellow.depositToSession]);

  return (
    <div className={`${spaceGrotesk.className} relative min-h-screen bg-[#0a0a0b] text-white selection:bg-blue-500/30 selection:text-white overflow-x-hidden no-scrollbar`}>
      <Head>
        <title>Iran War | OnlyTruth</title>
        <meta name="description" content="Prediction market for the Iran War" />
        <style>{`html, body { scrollbar-width: none; -ms-overflow-style: none; } html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }`}</style>
      </Head>


      {/* Dark overlay for content readability */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#0a0a0b]/40" />
      <div className="fixed inset-0 z-0 pointer-events-none bg-black/40" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar
          portfolioValue={portfolioValue}
          cash={yellow.appSessionStatus === 'active' ? yellow.payerBalance || 0 : 0}
          ledgerBalance={yellow.ledgerBalance}
          isYellowAuthenticated={yellow.isAuthenticated}
          isClobReady={!!yellow.clobInfo?.authenticated}
          appSessionStatus={yellow.appSessionStatus}
          isSessionLoading={yellow.isSessionLoading}
          onCreateSession={handleNavbarCreateSession}
          onDepositToSession={handleNavbarDeposit}
          onRequestFaucet={handleRequestFaucetAndCreateSession}
          onCloseSession={yellow.closeSession}
        />

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
                  orderBookCollapsed={orderBookCollapsed}
                  onToggleOrderBook={() => setOrderBookCollapsed((v) => !v)}
                />

                {/* Chart + Order Book side by side (vertical line spans full height) */}
                <div className="flex items-stretch min-h-[520px]">
                  {/* Left: Chart / Visualizations */}
                  <div className={cn("flex-1 pl-6 pr-2 py-2 flex flex-col", !orderBookCollapsed && "border-r border-white/[0.06]")}>
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

                  {/* Right: Order Book (inline) — collapsible */}
                  {!orderBookCollapsed && (
                    <div className="w-95 shrink-0">
                      <OrderBook avgPriceCents={avgPriceCents} volume={volume} inline selectedCorner={selectedCorner} refreshKey={refreshKey} />
                    </div>
                  )}
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
                  userBalance={yellow.appSessionStatus === 'active' ? yellow.payerBalance : serverUsdBalance}
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
