"use client";

import React, { useState, useEffect } from "react";
import { MessageCircle, Send } from "lucide-react";
import { cn } from "./utils";

export interface Comment {
  id: string;
  author: string;
  body: string;
  timeAgo: string;
}

const INITIAL_COMMENTS: Comment[] = [
  { id: "1", author: "trader_42", body: "Leaning Yes on Khamenei, odds look fair here.", timeAgo: "2m" },
  { id: "2", author: "anon_0x7f", body: "US strike before month end — 60% feels right.", timeAgo: "12m" },
  { id: "3", author: "onlytruth", body: "Remember: resolve is per market rules. Check dates.", timeAgo: "1h" },
];

const COMMENT_AUTHORS = [
  "trader_42", "anon_0x7f", "Polymarket_anon", "Kalshi_trader", "Manifold_bot", "gnosis_0x",
  "staker_99", "prediction_fan", "market_watcher", "0x_degens", "onlytruth",
];
const COMMENT_BODIES = [
  "Leaning Yes on Khamenei, odds look fair here.",
  "US strike before month end — 60% feels right.",
  "Remember: resolve is per market rules. Check dates.",
  "Just went Yes on Israel. Volume picking up.",
  "Khamenei out by Mar 31 is my main bet.",
  "No on US strike, Yes on Israel. Hedging.",
  "Fair value around 50¢ for the joint outcome.",
  "Anyone else seeing the move in the last hour?",
  "Resolve dates are key — read the rules.",
  "Bought more Yes at 48¢. Conviction play.",
  "Market feels efficient. Small edge on No here.",
  "Top holders loading up on Yes from what I see.",
  "60% implied for US strike seems high to me.",
  "Joint market is the play. Single markets too noisy.",
  "Resolved per OnlyTruth rules. Don’t forget.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generateRandomComment(): Comment {
  return {
    id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author: pick(COMMENT_AUTHORS),
    body: pick(COMMENT_BODIES),
    timeAgo: "just now",
  };
}

interface CommentSectionProps {
  /** When true, omit outer card and header (for use inside tabs). */
  embedded?: boolean;
}

export function CommentSection({ embedded }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(() => INITIAL_COMMENTS);
  const [input, setInput] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setComments((prev) => [generateRandomComment(), ...prev].slice(0, 100));
    }, 25000 + Math.random() * 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setComments((prev) =>
        prev.map((c) => (c.timeAgo === "just now" ? { ...c, timeAgo: "1m" } : c))
      );
    }, 55000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setComments((prev) => [
      { id: Date.now().toString(), author: "You", body: trimmed, timeAgo: "now" },
      ...prev,
    ]);
    setInput("");
  };

  const content = (
    <>
      {!embedded && (
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <MessageCircle className="h-4 w-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-white">Comments</h3>
        </div>
      )}
      <form onSubmit={handleSubmit} className="border-b border-white/10 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a comment..."
            className={cn(
              "flex-1 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-zinc-500",
              "focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
            )}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              "rounded-lg bg-white/90 px-3 py-2 text-black transition-colors",
              "hover:bg-white disabled:opacity-40 disabled:pointer-events-none"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
      <div className="max-h-[280px] overflow-y-auto scrollbar-transparent p-3">
        {comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">No comments yet. Be the first.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg bg-white/[0.06] p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-white/90">{c.author}</span>
                  <span className="text-[10px] text-zinc-500">{c.timeAgo}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-200">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );

  if (embedded) return <div className="flex flex-col">{content}</div>;

  return (
    <div className="mt-8 w-full max-w-[340px] rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
      {content}
    </div>
  );
}
