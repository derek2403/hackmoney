import React, { useState } from "react";
import { cn } from "./utils";

const QUESTIONS = [
  {
    id: 1,
    text: "Khamenei out as Supreme Leader of Iran by January 31?",
    image: "👳‍♂️",
  },
  {
    id: 2,
    text: "US strikes Iran by January 31?",
    image: "🇺🇸",
  },
  {
    id: 3,
    text: "Israel next strikes Iran by January 31?",
    image: "🇮🇱",
  },
];

export const TradeSidebar = () => {
  const [activeTab, setActiveTab] = useState("Buy");
  const [selections, setSelections] = useState<Record<number, string | null>>({
    1: null,
    2: null,
    3: null,
  });

  const handleSelect = (qId: number, option: string) => {
    setSelections((prev) => ({ ...prev, [qId]: option }));
  };

  return (
    <div className="w-[380px] shrink-0 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          {["Buy", "Sell"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-lg font-bold transition-all hover:scale-105 active:scale-95",
                activeTab === tab
                  ? "text-white"
                  : "text-white/20 hover:text-white/40"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1 text-xs font-bold text-white/40 hover:text-white transition-colors">
          Market ⌄
        </button>
      </div>

      <div className="space-y-6 py-4">
        {QUESTIONS.map((q) => (
          <div key={q.id} className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg border border-white/5">
                {q.image}
              </div>
              <p className="text-[13px] font-bold leading-tight text-white/70">
                {q.text}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["Yes", "No", "Any"].map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect(q.id, option)}
                  className={cn(
                    "rounded-xl py-2.5 text-xs font-bold transition-all border border-transparent",
                    selections[q.id] === option
                      ? option === "Yes"
                        ? "bg-emerald-500 shadow-lg shadow-emerald-500/20 text-white"
                        : option === "No"
                        ? "bg-rose-500 shadow-lg shadow-rose-500/20 text-white"
                        : "bg-blue-500 shadow-lg shadow-blue-500/20 text-white"
                      : "bg-white/5 text-white/30 hover:bg-white/10 border-white/5"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black tracking-widest text-white/40 uppercase">Amount</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white/10">$</span>
            <span className="text-5xl font-black text-white/20">0</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 text-white/30">
          {["+$1", "+$20", "+$100", "Max"].map((btn) => (
            <button
              key={btn}
              className="px-2 py-1 text-[11px] font-bold hover:text-white transition-colors"
            >
              {btn}
            </button>
          ))}
        </div>

        <button className="w-full rounded-2xl bg-blue-600/80 py-4 text-center text-lg font-black text-white transition-all hover:bg-blue-600 hover:scale-[1.02] shadow-xl shadow-blue-600/20 active:scale-95 group">
          <span className="group-hover:tracking-widest transition-all">TRADE</span>
        </button>

        <p className="text-center text-[10px] font-bold text-white/20">
          By trading, you agree to the <span className="underline cursor-pointer hover:text-white transition-colors">Terms of Use</span>.
        </p>
      </div>
    </div>
  );
};
