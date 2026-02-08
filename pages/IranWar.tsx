import Head from "next/head";
import React, { useState, useMemo, useEffect, useCallback } from "react";
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
import { fetchMarketPrices, fetchPositions, registerSession, fundMarket } from "@/lib/yellow/market/marketClient";
import type { MarketPrices } from "@/lib/yellow/market/types";
import { useYellowSession } from "../hooks/useYellowSession";
import { cn } from "../components/utils";

export default function Home() {
  const yellow = useYellowSession();

  const [view, setView] = useState<"1D" | "2D" | "3D" | "Odds">("1D");
  const [selectedOutcomeIds, setSelectedOutcomeIds] = useState<number[]>([]);
  const [marketData, setMarketData] = useState<MarketPrices | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [depositAmount, setDepositAmount] = useState("100");
  const [fundAmount, setFundAmount] = useState("100");

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

  // ==================== DEPOSIT FLOW ====================
  // 1. Connect wallet (MetaMask)
  // 2. Create Yellow session (deposits USD from ledger)
  // 3. Register balance with market server
  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (!yellow.account) {
      await yellow.connectWallet();
      return;
    }

    if (yellow.appSessionStatus === "none" || yellow.appSessionStatus === "closed") {
      // Create new session with initial deposit
      await yellow.createAppSession(amt);
      // Register with market
      if (yellow.account) {
        await registerSession({ user: yellow.account, userBalance: amt }).catch(() => {});
      }
      return;
    }

    if (yellow.appSessionStatus === "active") {
      // Deposit more into existing session
      const ok = await yellow.depositToSession(amt);
      if (ok && yellow.account) {
        await registerSession({ user: yellow.account, userBalance: yellow.payerBalance + amt }).catch(() => {});
      }
    }
  };

  // ==================== FUND (BUY COMPLETE SETS) ====================
  // Market maker buys complete sets to get shares of all 8 corners
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

  // ==================== CASHOUT FLOW ====================
  // 1. Claim any resolution payouts (CLOB → user instant payment)
  // 2. Withdraw from session → close session
  const handleCashout = async () => {
    if (yellow.appSessionStatus !== "active") return;

    // Check if user has unclaimed USD balance on the server (from resolution or sells)
    if (yellow.account) {
      try {
        const positions = await fetchPositions(yellow.account);
        const serverUsd = positions?.usdBalance ?? 0;
        if (serverUsd > 0) {
          // Receive payout from CLOB → user in Yellow session
          await yellow.receivePaymentFromCLOB(serverUsd);
        }
      } catch {
        // Continue with close even if payout claim fails
      }
    }

    // Withdraw all remaining funds and close session
    await yellow.closeSession();
  };

  // ==================== BUY FLOW ====================
  // Called from TradeSidebar after market API buy succeeds
  // Sends instant payment to CLOB for the trade cost
  const handlePostBuy = useCallback(async (cost: number) => {
    if (yellow.appSessionStatus !== "active" || cost <= 0) return;

    // Send instant payment (user → CLOB) for the trade cost
    const ok = await yellow.sendPaymentToCLOB(cost);
    if (!ok) {
      console.warn("Failed to send instant payment for trade — session may be out of sync");
    }

    // Update market server with new balance
    if (yellow.account) {
      await registerSession({ user: yellow.account, userBalance: yellow.payerBalance - cost }).catch(() => {});
    }
  }, [yellow]);

  // ==================== SELL FLOW ====================
  // Called from TradeSidebar after market API sell succeeds
  // Receives instant payment from CLOB for the sale revenue
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

  const formatAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-blue-500/30 selection:text-white overflow-x-hidden">
      <Head>
        <title>Iran War | OnlyTruth</title>
        <meta name="description" content="Prediction market for the Iran War" />
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
      <div className="fixed inset-0 z-0 pointer-events-none bg-black/40" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />

        <main className="mx-auto flex-1 w-full max-w-[1440px] px-6 py-12">
          <div className="flex items-start gap-12">
            {/* Main Content Area */}
            <div className="flex-1 space-y-12">
              <MarketHeader activeView={view} onViewChange={setView} />

              {/* Market Status Banner */}
              <div className={cn(
                "rounded-2xl border px-5 py-3 flex items-center justify-between",
                marketStatus === "seeding" ? "border-yellow-500/30 bg-yellow-500/10" :
                marketStatus === "open" ? "border-emerald-500/30 bg-emerald-500/10" :
                "border-rose-500/30 bg-rose-500/10"
              )}>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    marketStatus === "seeding" ? "bg-yellow-400 animate-pulse" :
                    marketStatus === "open" ? "bg-emerald-400" :
                    "bg-rose-400"
                  )} />
                  <span className={cn(
                    "text-sm font-bold uppercase tracking-wider",
                    marketStatus === "seeding" ? "text-yellow-400" :
                    marketStatus === "open" ? "text-emerald-400" :
                    "text-rose-400"
                  )}>
                    {marketStatus === "seeding" ? "Market Seeding" :
                     marketStatus === "open" ? "Market Open" :
                     "Market Resolved"}
                  </span>
                </div>
                {marketStatus === "seeding" && (
                  <span className="text-[11px] text-yellow-400/60">Maker must fund & place sell orders on all 8 corners</span>
                )}
                {marketStatus === "open" && (
                  <span className="text-[11px] text-emerald-400/60">${volume.toLocaleString()} volume</span>
                )}
              </div>

              {/* Maker Controls — visible during seeding */}
              {yellow.account && marketStatus === "seeding" && (
                <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/5 p-6 backdrop-blur-xl space-y-3">
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
              )}

              {/* Yellow Session Panel */}
              <div className="rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Trading Account</h2>
                  <div className="flex items-center gap-2">
                    {/* Connection status dots */}
                    <span className={cn(
                      "h-2 w-2 rounded-full",
                      yellow.wsStatus === "Connected" ? "bg-emerald-400" : yellow.wsStatus === "Connecting" ? "bg-yellow-400 animate-pulse" : "bg-red-400"
                    )} />
                    <span className="text-[10px] font-bold text-white/40 uppercase">{yellow.wsStatus}</span>
                    {yellow.isAuthenticated && (
                      <span className="text-[10px] font-bold text-emerald-400 ml-2">Authenticated</span>
                    )}
                    {yellow.clobInfo?.authenticated && (
                      <span className="text-[10px] font-bold text-blue-400 ml-2">CLOB Ready</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Step 1: Connect / Account */}
                  {!yellow.account ? (
                    <button
                      onClick={yellow.connectWallet}
                      className="px-6 py-3 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-400 transition-colors"
                    >
                      Connect Wallet
                    </button>
                  ) : (
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-white/60">{formatAddr(yellow.account)}</span>
                      <span className="text-[11px] text-white/40">Ledger: {yellow.ledgerBalance} ytest.usd</span>
                    </div>
                  )}

                  {/* Step 2: Session Status */}
                  {yellow.account && (
                    <div className="flex items-center gap-3">
                      {yellow.appSessionStatus === "active" ? (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-sm font-bold text-emerald-400">Session Active</span>
                          </div>
                          <span className="text-sm font-bold text-white">
                            ${yellow.payerBalance.toFixed(2)} <span className="text-white/40 text-xs">available</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-white/30">
                          {yellow.appSessionStatus === "creating" ? "Creating session..." :
                           yellow.appSessionStatus === "closing" ? "Closing session..." :
                           "No active session"}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Deposit / Withdraw / Faucet controls */}
                {yellow.account && (
                  <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                    <input
                      type="text"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-20 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-bold text-white outline-none focus:border-white/30 text-right"
                      placeholder="100"
                    />
                    <span className="text-xs text-white/30">USD</span>

                    <button
                      onClick={handleDeposit}
                      disabled={yellow.isSessionLoading}
                      className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                      {yellow.appSessionStatus === "none" || yellow.appSessionStatus === "closed"
                        ? "Create Session & Deposit"
                        : "Deposit More"}
                    </button>

                    {yellow.appSessionStatus === "active" && (
                      <button
                        onClick={handleCashout}
                        disabled={yellow.isSessionLoading}
                        className="px-4 py-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/30 transition-colors disabled:opacity-50"
                      >
                        Cash Out & Close
                      </button>
                    )}

                    <button
                      onClick={yellow.requestFaucet}
                      className="ml-auto px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs font-bold hover:text-white/60 transition-colors"
                    >
                      Faucet
                    </button>
                  </div>
                )}
              </div>

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
              />
              <OrderBook avgPriceCents={avgPriceCents} volume={volume} />
              <MarketPositions
                userAddress={yellow.account ?? null}
                refreshKey={refreshKey}
              />
              <MarketRules />
            </div>

            {/* Sidebar */}
            <div className="sticky top-32 flex flex-col items-start gap-6">
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
