import Head from "next/head";
import Link from "next/link";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Space_Grotesk } from "next/font/google";
import { ChevronRight } from "lucide-react";
import { Navbar } from "../components/Navbar";
import {
  probabilitySumForOutcomeIds,
  selectionsToOutcomeIds,
  selectedOutcomeIdsToSelections,
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

const OUTCOMES_TABLE = [
  { label: "Khamenei out as Supreme Leader of Iran by January 31?", chance: "70%", volume: "$800K", yesPrice: "70¢", noPrice: "30¢" },
  { label: "US strikes Iran by January 31?", chance: "60%", volume: "$600K", yesPrice: "60¢", noPrice: "40¢" },
  { label: "Israel next strikes Iran by January 31?", chance: "50%", volume: "$400K", yesPrice: "50¢", noPrice: "50¢" },
];

const BOTTOM_TABS = ["Rules", "History", "Activity"] as const;

export default function Home() {
  const yellow = useYellowSession();

  const [view, setView] = useState<"1D" | "2D" | "3D" | "Odds">("1D");
  const [selectedOutcomeIds, setSelectedOutcomeIds] = useState<number[]>([]);
  const [marketData, setMarketData] = useState<MarketPrices | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [depositAmount, setDepositAmount] = useState("100");
  const [fundAmount, setFundAmount] = useState("100");
  const [bottomTab, setBottomTab] = useState<typeof BOTTOM_TABS[number]>("Rules");

  const marketStatus = marketData?.status ?? "seeding";

  const selections = useMemo(
    () => selectedOutcomeIdsToSelections(selectedOutcomeIds),
    [selectedOutcomeIds]
  );

  const avgPriceCents = useMemo(
    () =>
      selectedOutcomeIds.length > 0
        ? probabilitySumForOutcomeIds(selectedOutcomeIds)
        : null,
    [selectedOutcomeIds]
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
  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (!yellow.account) {
      await yellow.connectWallet();
      return;
    }

    if (yellow.appSessionStatus === "none" || yellow.appSessionStatus === "closed") {
      await yellow.createAppSession(amt);
      if (yellow.account) {
        await registerSession({ user: yellow.account, userBalance: amt }).catch(() => {});
      }
      return;
    }

    if (yellow.appSessionStatus === "active") {
      const ok = await yellow.depositToSession(amt);
      if (ok && yellow.account) {
        await registerSession({ user: yellow.account, userBalance: yellow.payerBalance + amt }).catch(() => {});
      }
    }
  };

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

  // ==================== CASHOUT FLOW ====================
  const handleCashout = async () => {
    if (yellow.appSessionStatus !== "active") return;

    if (yellow.account) {
      try {
        const positions = await fetchPositions(yellow.account);
        const serverUsd = positions?.usdBalance ?? 0;
        if (serverUsd > 0) {
          await yellow.receivePaymentFromCLOB(serverUsd);
        }
      } catch {
        // Continue with close even if payout claim fails
      }
    }

    await yellow.closeSession();
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

  const formatAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  const MARKET_INFO = [
    { label: "Volume", value: `$${volume.toLocaleString()}`, color: "" },
    { label: "24h Change", value: "+5.2%", color: "text-emerald-400" },
    { label: "Participants", value: "2.4K", color: "" },
    { label: "Resolution", value: "Jan 31, 2026", color: "" },
  ];

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
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-xs font-bold text-white/30 px-8 pt-6">
                  <Link href="/" className="hover:text-white transition-colors">Home</Link>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-white/60">Iran War</span>
                </nav>

                {/* Header */}
                <MarketHeader activeView={view} onViewChange={setView} />

                {/* Market Status Banner */}
                <div className={cn(
                  "mx-8 mb-4 rounded-2xl border px-5 py-3 flex items-center justify-between",
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
                  />
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

                {/* Order Book */}
                <div className="border-t border-white/[0.06] px-8 py-8">
                  <OrderBook avgPriceCents={avgPriceCents} volume={volume} />
                </div>

                {/* Positions */}
                <div className="border-t border-white/[0.06] px-8 py-8">
                  <MarketPositions
                    userAddress={yellow.account ?? null}
                    refreshKey={refreshKey}
                  />
                </div>

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

                {/* Trading Account Panel */}
                <div className="border-t border-white/[0.06] px-8 py-6">
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider">Trading Account</h2>
                      <div className="flex items-center gap-2">
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
