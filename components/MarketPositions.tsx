"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "./utils";
import { fetchPositions, cancelOrder } from "@/lib/yellow/market/marketClient";
import type { UserPositions, Position, OpenOrder } from "@/lib/yellow/market/types";

const CORNER_DESCRIPTIONS: Record<string, string> = {
  "000": "Kha No, US No, Isr No",
  "001": "Kha No, US No, Isr Yes",
  "010": "Kha No, US Yes, Isr No",
  "011": "Kha No, US Yes, Isr Yes",
  "100": "Kha Yes, US No, Isr No",
  "101": "Kha Yes, US No, Isr Yes",
  "110": "Kha Yes, US Yes, Isr No",
  "111": "Kha Yes, US Yes, Isr Yes",
};

interface MarketPositionsProps {
  userAddress: string | null;
  /** Trigger a refresh after trades. Increment to re-fetch. */
  refreshKey?: number;
}

export const MarketPositions = ({ userAddress, refreshKey }: MarketPositionsProps) => {
  const [data, setData] = useState<UserPositions | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [cancelling, setCancelling] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!userAddress) return;
    try {
      const positions = await fetchPositions(userAddress);
      setData(positions);
    } catch {
      // Server may not be running
    }
  }, [userAddress]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleCancel = async (order: OpenOrder) => {
    if (!userAddress) return;
    setCancelling(order.id);
    try {
      await cancelOrder(userAddress, order.id, order.corner);
      load();
    } catch (err) {
      console.error("Cancel failed:", err);
    } finally {
      setCancelling(null);
    }
  };

  if (!userAddress || !data) return null;
  if (data.positions.length === 0 && data.openOrders.length === 0) return null;

  return (
    <div className="border-t border-white/6 px-8 py-6">
      <button
        type="button"
        onClick={() => setIsExpanded((e) => !e)}
        className={cn(
          "flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/5 rounded-t-3xl",
          isExpanded ? "border-b border-white/5" : "rounded-b-3xl"
        )}
      >
        <h2 className="text-lg font-bold text-white">Your Positions</h2>
        <span className="flex items-center gap-3 text-sm text-white/50">
          <span className="text-emerald-400 font-bold">${data.totalShareValue.toFixed(2)} value</span>
          <svg
            className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isExpanded && (
        <div className="px-6 py-4 space-y-6">
          {/* Share positions */}
          {data.positions.length > 0 && (
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Shares</h3>
              <div className="space-y-2">
                {data.positions.map((pos: Position) => (
                  <div
                    key={pos.corner}
                    className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-white/70">{pos.corner}</span>
                      <span className="text-[11px] text-white/40">{CORNER_DESCRIPTIONS[pos.corner]}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-white/60">{pos.shares} shares</span>
                      <span className="text-sm font-bold text-white/40">@ {Math.round(pos.price * 100)}¢</span>
                      <span className="text-sm font-bold text-emerald-400">${pos.value.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open orders */}
          {data.openOrders.length > 0 && (
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Open Orders</h3>
              <div className="space-y-2">
                {data.openOrders.map((order: OpenOrder) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        order.side === "buy" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                      )}>
                        {order.side.toUpperCase()}
                      </span>
                      <span className="font-mono text-sm font-bold text-white/70">{order.corner}</span>
                      <span className="text-sm text-white/40">
                        {order.quantity - order.filled} @ {Math.round(order.price * 100)}¢
                      </span>
                    </div>
                    <button
                      onClick={() => handleCancel(order)}
                      disabled={cancelling === order.id}
                      className="px-3 py-1 rounded-lg text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                    >
                      {cancelling === order.id ? "..." : "Cancel"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USD balance */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">USD Balance</span>
            <span className="text-sm font-bold text-blue-400">${data.usdBalance.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
