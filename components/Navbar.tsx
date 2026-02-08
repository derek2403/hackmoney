'use client';

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, ChevronDown, ChevronUp, X, Wallet, Trophy, Gift, Code, Users, Moon, Copy, Check, ChevronLeft, CreditCard, Zap, Landmark, Globe } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect, useEnsName, useEnsAvatar } from "wagmi";
import { ENS_CHAIN_ID } from "../lib/networkConfig";

const NAV_LINKS = [
  { label: "Trade", href: "#" },
  { label: "Analytics", href: "#", hasDropdown: true },
  { label: "Portfolio", href: "#" },
  { label: "Earn", href: "#" },
];

const PROFILE_MENU = [
  { icon: Trophy, label: "Leaderboard", action: null },
  { icon: Gift, label: "Rewards", action: null },
  { icon: Code, label: "APIs", action: null },
  { icon: Users, label: "Builders", action: null },
  { icon: Moon, label: "Dark mode", action: null, toggle: true },
];

const PROFILE_LINKS: { label: string }[] = [];

export interface NavbarProps {
  /** Total value of shares user holds in the market. */
  portfolioValue?: number;
  /** ytest.usd available in the Yellow app session (tradable cash). */
  cash?: number;
  /** ytest.usd on the Yellow Network ledger (available to deposit). */
  ledgerBalance?: string;
  /** Whether Yellow WebSocket auth is complete. */
  isYellowAuthenticated?: boolean;
  /** Whether CLOB server is authenticated and ready. */
  isClobReady?: boolean;
  /** Yellow app session status. */
  appSessionStatus?: 'none' | 'creating' | 'active' | 'closing' | 'closed';
  /** Session loading indicator. */
  isSessionLoading?: boolean;
  /** Create a new app session with this initial ytest.usd amount. */
  onCreateSession?: (amount: number) => Promise<void>;
  /** Deposit more ytest.usd into an existing session. */
  onDepositToSession?: (amount: number) => Promise<boolean>;
  /** Request faucet tokens. */
  onRequestFaucet?: () => Promise<void>;
  /** Close the current Yellow app session. */
  onCloseSession?: () => Promise<void>;
}

export const Navbar = ({
  portfolioValue = 0,
  cash = 0,
  ledgerBalance = "0",
  isYellowAuthenticated = false,
  isClobReady = false,
  appSessionStatus = "none",
  isSessionLoading = false,
  onCreateSession,
  onDepositToSession,
  onRequestFaucet,
  onCloseSession,
}: NavbarProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [depositStep, setDepositStep] = useState<'menu' | 'amount'>('menu');
  const [depositAmount, setDepositAmount] = useState("100");
  const [isDepositing, setIsDepositing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleOpenDeposit = () => {
    setDepositStep('menu');
    setDepositOpen(true);
  };

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const { address } = useAccount();
  const { data: ensName } = useEnsName({ address, chainId: ENS_CHAIN_ID });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName!, chainId: ENS_CHAIN_ID });
  const { disconnect } = useDisconnect();
  const profileRef = useRef<HTMLDivElement>(null);

  const ledgerNum = parseFloat(ledgerBalance) || 0;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;
    setIsDepositing(true);
    try {
      if (appSessionStatus === "active" && onDepositToSession) {
        await onDepositToSession(amt);
      } else if (onCreateSession) {
        await onCreateSession(amt);
      }
      setDepositOpen(false);
    } catch (err) {
      console.error("Deposit failed:", err);
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[1920px] items-center justify-between px-10">
          {/* Left: Logo + Nav Links */}
          <div className="flex items-center gap-12">
            <Link href="/market" className="flex items-center cursor-pointer">
              <img src="/feather.png" alt="Logo" className="h-14 w-14" />
              <span className="text-2xl font-bold tracking-tight text-white">
                OnlyTruth
              </span>
            </Link>

            <nav className="flex items-center gap-9">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-1 text-base text-zinc-400 transition-colors hover:text-white"
                >
                  {link.label}
                  {link.hasDropdown && <ChevronDown className="h-4 w-4" />}
                </a>
              ))}
            </nav>

            {/* Search */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-zinc-400 transition-colors hover:border-white/20 hover:text-white w-[280px]"
            >
              <Search className="h-4 w-4" />
              <span>Search markets</span>
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6 px-4">
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-zinc-500">Portfolio</span>
                <span className="text-base font-bold text-emerald-400">
                  ${portfolioValue.toFixed(2)}
                </span>
              </div>
              <div className="h-7 w-px bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-zinc-500">Cash</span>
                <span className="text-base font-bold text-emerald-400" title={`${Math.floor(cash).toLocaleString()} ytest.usd`}>
                  {cash > 0 ? `$${String(Math.floor(cash - 1)).slice(-4)}` : "$0"}
                </span>
              </div>
            </div>

            <button
              onClick={handleOpenDeposit}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-base font-semibold text-white transition-all hover:bg-emerald-500 active:scale-95"
            >
              Deposit
            </button>

            <ConnectButton.Custom>
              {({ account, chain, openChainModal, openConnectModal, mounted }) => {
                const connected = mounted && account && chain;
                return (
                  <div {...(!mounted && { "aria-hidden": true, style: { opacity: 0, pointerEvents: "none" as const, userSelect: "none" as const } })}>
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-base font-semibold text-white transition-all hover:bg-indigo-500 active:scale-95"
                          >
                            Connect Wallet
                          </button>
                        );
                      }
                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            className="rounded-lg bg-rose-600 px-6 py-2.5 text-base font-semibold text-white transition-all hover:bg-rose-500 active:scale-95"
                          >
                            Wrong Network
                          </button>
                        );
                      }
                      return (
                        <div ref={profileRef} className="relative">
                          <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition-all hover:bg-white/15 active:scale-95"
                          >
                            {ensAvatar ? (
                              <img src={ensAvatar} alt="" className="h-7 w-7 rounded-full" />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                            )}
                            {ensName || account.displayName}
                            {profileOpen ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
                          </button>

                          {/* Profile dropdown */}
                          {profileOpen && (
                            <div className="absolute right-0 top-full mt-3 w-[260px] rounded-2xl border border-white/10 bg-[#1a1a1c] shadow-2xl shadow-black/60 z-50 overflow-hidden">
                              {/* Profile header */}
                              <div className="flex items-center gap-3 px-5 pt-5 pb-4">
                                {ensAvatar ? (
                                  <img src={ensAvatar} alt="" className="h-10 w-10 rounded-full" />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-white truncate">{ensName || account.displayName}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs text-zinc-500 font-mono">{account.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : account.displayName}</p>
                                    {account.address && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyAddress(account.address);
                                        }}
                                        className="text-zinc-500 hover:text-white transition-colors"
                                      >
                                        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="border-t border-white/5" />

                              {/* Ledger balance */}
                              <div className="px-5 py-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ledger (Off-Chain)</p>
                                <p className="text-lg font-bold text-yellow-400">{ledgerNum.toLocaleString()} <span className="text-sm text-zinc-500">ytest.usd</span></p>
                              </div>

                              <div className="border-t border-white/5" />

                              {/* Session info */}
                              <div className="px-5 py-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Trading Session</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`h-2 w-2 rounded-full ${appSessionStatus === "active" ? "bg-emerald-400" :
                                    appSessionStatus === "creating" ? "bg-yellow-400 animate-pulse" :
                                      "bg-zinc-600"
                                    }`} />
                                  <span className="text-sm text-zinc-400 capitalize">
                                    {appSessionStatus === "none" ? "Not started" : appSessionStatus}
                                  </span>
                                </div>
                              </div>

                              <div className="border-t border-white/5" />

                              {/* Menu items */}
                              <div className="py-2">

                                {PROFILE_MENU.map((item) => (
                                  <button
                                    key={item.label}
                                    className="flex items-center justify-between w-full px-5 py-2.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-white transition-colors cursor-default"
                                  >
                                    <div className="flex items-center gap-3">
                                      <item.icon className="h-4 w-4" />
                                      {item.label}
                                    </div>
                                    {item.toggle && (
                                      <div className="h-5 w-9 rounded-full bg-white/10 relative">
                                        <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-zinc-500 transition-all" />
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>

                              <div className="border-t border-white/5" />

                              {/* Links */}
                              <div className="py-2">
                                {PROFILE_LINKS.map((link) => (
                                  <button
                                    key={link.label}
                                    className="w-full px-5 py-2.5 text-sm text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors text-left cursor-default"
                                  >
                                    {link.label}
                                  </button>
                                ))}
                              </div>

                              <div className="border-t border-white/5" />

                              {/* Close Session + Logout */}
                              <div className="py-2">
                                {appSessionStatus === "active" && onCloseSession && (
                                  <button
                                    onClick={async () => {
                                      await onCloseSession();
                                      setProfileOpen(false);
                                    }}
                                    className="w-full px-5 py-2.5 text-sm font-semibold text-yellow-400 hover:bg-yellow-500/10 transition-colors text-left"
                                  >
                                    Close Session
                                  </button>
                                )}
                                <button
                                  onClick={async () => {
                                    if (appSessionStatus === "active" && onCloseSession) {
                                      await onCloseSession();
                                    }
                                    disconnect();
                                    setProfileOpen(false);
                                  }}
                                  className="w-full px-5 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                                >
                                  Logout
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {depositOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDepositOpen(false)} />
          <div className="relative w-[440px] rounded-2xl border border-white/10 bg-[#1a1a1c] shadow-2xl shadow-black/60 overflow-hidden">

            {/* Modal Header */}
            <div className="relative flex flex-col items-center justify-center pt-6 pb-2">
              {depositStep === 'amount' && (
                <button
                  onClick={() => setDepositStep('menu')}
                  className="absolute left-4 top-6 p-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              <h3 className="text-xl font-bold text-white">Deposit</h3>
              <p className="text-sm text-zinc-500 mt-1">
                Cash balance: <span className="text-emerald-400 font-medium">${cash.toFixed(2)}</span>
              </p>

              <button
                onClick={() => setDepositOpen(false)}
                className="absolute right-4 top-6 p-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Switcher */}
            {depositStep === 'menu' ? (
              <div className="p-6 space-y-6">

                {/* Available Option: Wallet */}
                <button
                  onClick={() => setDepositStep('amount')}
                  className="w-full group relative flex items-center justify-between rounded-xl bg-[#27272a] p-4 transition-all hover:bg-[#3f3f46] border border-white/5 hover:border-white/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Wallet className="h-6 w-6 text-orange-500" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">Wallet ({address ? `${address.slice(0, 4)}...${address.slice(-4)}` : 'Connect'})</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span>${ledgerNum.toLocaleString()}</span>
                        <span className="h-1 w-1 rounded-full bg-zinc-600" />
                        <span className="text-emerald-400 font-medium">Instant</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Faucet Option */}
                {onRequestFaucet && (
                  <button
                    onClick={() => { onRequestFaucet(); setDepositOpen(false); }}
                    className="w-full group relative flex items-center justify-between rounded-xl bg-[#27272a] p-4 transition-all hover:bg-[#3f3f46] border border-white/5 hover:border-white/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Gift className="h-6 w-6 text-yellow-500" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white">Request Faucet</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span>Get testnet tokens</span>
                          <span className="h-1 w-1 rounded-full bg-zinc-600" />
                          <span className="text-yellow-400 font-medium">Free</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                {/* Divider with 'more' */}
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink-0 mx-4 text-xs text-zinc-600 font-medium uppercase tracking-wider">more</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                {/* Secondary Options (Visual Only for now) */}
                <div className="space-y-3">
                  {/* Transfer Crypto */}
                  <div className="w-full flex items-center justify-between rounded-xl bg-white/[0.03] p-4 border border-white/5 opacity-60 cursor-not-allowed">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white">Transfer Crypto</div>
                        <div className="text-xs text-zinc-500">No limit • Instant</div>
                      </div>
                    </div>
                    {/* Fake Coin Icons */}
                    <div className="flex -space-x-2">
                      <div className="h-5 w-5 rounded-full bg-blue-500 border border-[#1a1a1c]" />
                      <div className="h-5 w-5 rounded-full bg-orange-500 border border-[#1a1a1c]" />
                      <div className="h-5 w-5 rounded-full bg-purple-500 border border-[#1a1a1c]" />
                    </div>
                  </div>

                  {/* Deposit with Card */}
                  <div className="w-full flex items-center justify-between rounded-xl bg-white/[0.03] p-4 border border-white/5 opacity-60 cursor-not-allowed">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-pink-500" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white">Deposit with Card</div>
                        <div className="text-xs text-zinc-500">$20,000 • 5 min</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-3 w-5 rounded-sm bg-white/20" />
                      <div className="h-3 w-5 rounded-sm bg-white/20" />
                    </div>
                  </div>

                  {/* Connect Exchange */}
                  <div className="w-full flex items-center justify-between rounded-xl bg-white/[0.03] p-4 border border-white/5 opacity-60 cursor-not-allowed">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Landmark className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white">Connect Exchange</div>
                        <div className="text-xs text-zinc-500">No limit • 2 min</div>
                      </div>
                    </div>
                  </div>

                  {/* PayPal */}
                  <div className="w-full flex items-center justify-between rounded-xl bg-white/[0.03] p-4 border border-white/5 opacity-60 cursor-not-allowed">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                        <span className="font-bold text-indigo-500 italic">P</span>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white">Deposit with PayPal</div>
                        <div className="text-xs text-zinc-500">$10,000 • 5 min</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              /* Amount Input Step (Original Content Wrapped) */
              <div className="w-full">
                {!isYellowAuthenticated || !isClobReady ? (
                  <div className="px-6 pb-6 pt-4">
                    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
                      <Wallet className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-yellow-400">
                        {!isYellowAuthenticated ? "Authenticating with Yellow Network..." : "Connecting to CLOB server..."}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Please wait while we establish a secure connection.</p>
                    </div>
                  </div>
                ) : (
                  <div className="px-6 pb-6 space-y-4 pt-2">
                    {/* Amount input */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          Amount (ytest.usd)
                        </label>
                        <span className="text-xs text-zinc-400">Available: {ledgerNum.toLocaleString()}</span>
                      </div>
                      <input
                        type="text"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-2xl font-bold text-white outline-none focus:border-emerald-500/50 transition-colors text-right"
                        placeholder="100"
                      />
                      <div className="flex items-center justify-end gap-2 pt-1">
                        {[100, 500, 1000].map((v) => (
                          <button
                            key={v}
                            onClick={() => setDepositAmount(String(v))}
                            className="px-3 py-1 rounded-lg text-[11px] font-bold text-zinc-400 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            {v.toLocaleString()}
                          </button>
                        ))}
                        <button
                          onClick={() => setDepositAmount(String(Math.floor(ledgerNum)))}
                          className="px-3 py-1 rounded-lg text-[11px] font-bold text-zinc-400 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          Max
                        </button>
                      </div>
                    </div>

                    {/* Current session info */}
                    {appSessionStatus === "active" && (
                      <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-4 py-3">
                        <span className="text-xs font-bold text-zinc-500">Session Active</span>
                        <span className="text-xs font-bold text-emerald-400">Deposit adds to existing session</span>
                      </div>
                    )}

                    {/* Deposit button */}
                    <button
                      onClick={handleDeposit}
                      disabled={isDepositing || isSessionLoading || parseFloat(depositAmount) <= 0}
                      className="w-full rounded-xl bg-emerald-500 py-3.5 text-base font-bold text-white transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDepositing || isSessionLoading
                        ? "Processing..."
                        : appSessionStatus === "active"
                          ? "Confirm Deposit"
                          : "Create Session & Deposit"
                      }
                    </button>

                    {appSessionStatus !== "active" && (
                      <p className="text-[11px] text-zinc-600 text-center">
                        This creates a bilateral trading session with the CLOB server.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};