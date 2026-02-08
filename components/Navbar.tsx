'use client';

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, ChevronDown, ChevronUp, Plus, X, Wallet, CreditCard, ArrowLeftRight, Zap, Trophy, Gift, Code, Users, Moon } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useDisconnect } from "wagmi";
import { formatUnits } from "viem";

const NAV_LINKS = [
  { label: "Trade", href: "#" },
  { label: "Analytics", href: "#", hasDropdown: true },
  { label: "Portfolio", href: "#" },
  { label: "Earn", href: "#" },
];

const DEPOSIT_OPTIONS = [
  { icon: Wallet, label: "Wallet", sub: "Instant", limit: "", logos: [] },
  { icon: ArrowLeftRight, label: "Transfer Crypto", sub: "No limit · Instant", limit: "", logos: ["ETH", "USDC", "USDT", "DAI"] },
  { icon: CreditCard, label: "Deposit with Card", sub: "$20,000 · 5 min", limit: "", logos: ["VISA", "MC"] },
  { icon: Zap, label: "Connect Exchange", sub: "No limit · 2 min", limit: "", logos: ["CB", "BN"] },
];

const PROFILE_MENU = [
  { icon: Trophy, label: "Leaderboard", action: null },
  { icon: Gift, label: "Rewards", action: null },
  { icon: Code, label: "APIs", action: null },
  { icon: Users, label: "Builders", action: null },
  { icon: Moon, label: "Dark mode", action: null, toggle: true },
];

const PROFILE_LINKS = [
  { label: "Accuracy" },
  { label: "Support" },
  { label: "Documentation" },
  { label: "Terms of Use" },
];

export const Navbar = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const { disconnect } = useDisconnect();
  const profileRef = useRef<HTMLDivElement>(null);

  const cashDisplay = balanceData
    ? `$${parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(2)}`
    : "$0.00";

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
                <span className="text-base font-bold text-emerald-400">$0.00</span>
              </div>
              <div className="h-7 w-px bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-zinc-500">Cash</span>
                <span className="text-base font-bold text-emerald-400">{cashDisplay}</span>
              </div>
            </div>

            {isConnected && (
              <button
                onClick={() => setDepositOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-emerald-400 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Deposit
              </button>
            )}

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
                            {account.ensAvatar ? (
                              <img src={account.ensAvatar} alt="" className="h-7 w-7 rounded-full" />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                            )}
                            {account.displayName}
                            {profileOpen ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
                          </button>

                          {/* Profile dropdown */}
                          {profileOpen && (
                            <div className="absolute right-0 top-full mt-3 w-[260px] rounded-2xl border border-white/10 bg-[#1a1a1c] shadow-2xl shadow-black/60 z-50 overflow-hidden">
                              {/* Profile header */}
                              <div className="flex items-center gap-3 px-5 pt-5 pb-4">
                                {account.ensAvatar ? (
                                  <img src={account.ensAvatar} alt="" className="h-10 w-10 rounded-full" />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-white truncate">{account.ensName || account.displayName}</p>
                                  <p className="text-xs text-zinc-500 font-mono">{account.displayName}</p>
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

                              {/* Logout */}
                              <div className="py-2">
                                <button
                                  onClick={() => {
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
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Deposit</h3>
                <p className="text-sm text-zinc-500">Truth Balance: {cashDisplay}</p>
              </div>
              <button onClick={() => setDepositOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 pb-4 space-y-2">
              <button className="flex items-center justify-between w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 hover:bg-white/[0.08] transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                    <Wallet className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">Wallet ({address ? `...${address.slice(-4)}` : ""})</span>
                    <p className="text-xs text-zinc-500">{cashDisplay} · Instant</p>
                  </div>
                </div>
              </button>

              <div className="text-center text-xs text-zinc-600 py-1">more</div>

              {DEPOSIT_OPTIONS.slice(1).map((opt) => (
                <button key={opt.label} className="flex items-center justify-between w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 hover:bg-white/5 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                      <opt.icon className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white">{opt.label}</span>
                      <p className="text-xs text-zinc-500">{opt.sub}</p>
                    </div>
                  </div>
                  {opt.logos.length > 0 && (
                    <div className="flex items-center gap-1">
                      {opt.logos.map((l) => (
                        <div key={l} className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-zinc-400">
                          {l}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
