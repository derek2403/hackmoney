"use client";

import React, { useState, useEffect } from "react";
import { ExternalLink, Circle } from "lucide-react";
import { cn } from "./utils";

export interface ActivityItem {
  id: string;
  user: string;
  action: "bought" | "sold";
  quantity: number;
  outcome: "Yes" | "No";
  eventLabel: string;
  priceCents: number;
  totalUsd: number;
  timeAgo: string;
}

const INITIAL_ACTIVITY: ActivityItem[] = [
  { id: "1", user: "QMG-CORE", action: "bought", quantity: 139, outcome: "Yes", eventLabel: "February 8", priceCents: 1.2, totalUsd: 2, timeAgo: "39m ago" },
  { id: "2", user: "Casdifer", action: "bought", quantity: 6471, outcome: "Yes", eventLabel: "March 31", priceCents: 63, totalUsd: 4077, timeAgo: "40m ago" },
  { id: "3", user: "Innocent-Terrap...", action: "bought", quantity: 45, outcome: "No", eventLabel: "February 28", priceCents: 21, totalUsd: 10, timeAgo: "41m ago" },
  { id: "4", user: "0x491f...f81f", action: "bought", quantity: 13, outcome: "Yes", eventLabel: "June 30", priceCents: 52, totalUsd: 7, timeAgo: "42m ago" },
  { id: "5", user: "0x32e8...5b06", action: "bought", quantity: 288, outcome: "No", eventLabel: "January 31", priceCents: 49, totalUsd: 150, timeAgo: "44m ago" },
  { id: "6", user: "trader_42", action: "bought", quantity: 7792, outcome: "Yes", eventLabel: "March 31", priceCents: 49, totalUsd: 3818, timeAgo: "1h ago" },
];

const ACTIVITY_USERS = [
  "QMG-CORE", "Casdifer", "Innocent-Terrap...", "trader_42", "0x491f...f81f", "0x32e8...5b06",
  "Polymarket_anon", "Kalshi_trader", "Manifold_bot", "gnosis_0x", "Augur_v2", "staker_99",
];
const EVENT_LABELS = ["January 31", "February 8", "February 28", "March 31", "June 30"];
const PRICE_CENTS_OPTIONS = [1.2, 21, 49, 52, 63, 14, 28, 35, 71];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generateRandomActivity(): ActivityItem {
  const outcome = pick(["Yes", "No"] as const);
  const quantity = Math.floor(10 + Math.random() * 8000);
  const priceCents = pick(PRICE_CENTS_OPTIONS);
  const totalUsd = Math.round((quantity * priceCents) / 100);
  return {
    id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user: pick(ACTIVITY_USERS),
    action: "bought",
    quantity,
    outcome,
    eventLabel: pick(EVENT_LABELS),
    priceCents,
    totalUsd: totalUsd < 1 ? 1 : totalUsd,
    timeAgo: "just now",
  };
}

function Avatar({ name }: { name: string }) {
  const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="h-8 w-8 shrink-0 rounded-full bg-white/10"
      style={{ background: `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${hue}, 50%, 25%))` }}
    />
  );
}

export function ActivityFeed() {
  const [activity, setActivity] = useState<ActivityItem[]>(() => INITIAL_ACTIVITY);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivity((prev) => [generateRandomActivity(), ...prev].slice(0, 50));
    }, 8000 + Math.random() * 7000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivity((prev) =>
        prev.map((item) => {
          if (item.timeAgo !== "just now") return item;
          return { ...item, timeAgo: "1m ago" };
        })
      );
    }, 55000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col">
      {/* Live indicator */}
      <div className="flex justify-end border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <Circle className="h-1.5 w-1.5 fill-current animate-live-blink" />
          Live
        </div>
      </div>
      {/* List */}
      <div className="max-h-[320px] overflow-y-auto scrollbar-transparent">
        {activity.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 border-b border-white/5 px-3 py-3 hover:bg-white/[0.06]"
          >
            <Avatar name={item.user} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-zinc-200">
                <span className="font-medium text-white">{item.user}</span>
                {" "}
                <span className="text-zinc-400">{item.action}</span>
                {" "}
                <span className="text-white">{item.quantity.toLocaleString()}</span>
                {" "}
                <span className={cn(item.outcome === "Yes" ? "text-emerald-400" : "text-red-400")}>
                  {item.outcome}
                </span>
                {" "}
                <span className="text-zinc-400">for {item.eventLabel}</span>
                {" "}
                <span className="text-zinc-500">at {item.priceCents}¢</span>
                {" "}
                <span className="text-zinc-500">(${item.totalUsd.toLocaleString()})</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="text-[10px] text-zinc-500">{item.timeAgo}</span>
              <a
                href="#"
                className="text-zinc-500 hover:text-zinc-300"
                aria-label="View on explorer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
