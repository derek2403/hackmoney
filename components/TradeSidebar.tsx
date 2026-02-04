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
    <div className="w-[380px] shrink-0 space-y-4 rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          {["Buy", "Sell"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-lg font-bold transition-colors",
                activeTab === tab
                  ? "text-black dark:text-white"
                  : "text-zinc-300 hover:text-zinc-400 dark:text-zinc-600"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-black dark:hover:text-white">
          Market ⌄
        </button>
      </div>

      <div className="space-y-6 py-4">
        {QUESTIONS.map((q) => (
          <div key={q.id} className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg dark:bg-zinc-800">
                {q.image}
              </div>
              <p className="text-[13px] font-medium leading-tight text-zinc-600 dark:text-zinc-300">
                {q.text}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["Yes", "No", "Any"].map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect(q.id, option)}
                  className={cn(
                    "rounded-xl py-2.5 text-xs font-bold transition-all",
                    selections[q.id] === option
                      ? option === "Yes"
                        ? "bg-emerald-500 text-white"
                        : option === "No"
                        ? "bg-rose-500 text-white"
                        : "bg-blue-500 text-white"
                      : "bg-zinc-50 text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:text-zinc-500 dark:hover:bg-zinc-900"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold tracking-tight text-black dark:text-white uppercase">Amount</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-zinc-300 dark:text-zinc-800">$</span>
            <span className="text-5xl font-bold text-zinc-200 dark:text-zinc-800">0</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {["+$1", "+$20", "+$100", "Max"].map((btn) => (
            <button
              key={btn}
              className="px-2 py-1 text-[11px] font-bold text-zinc-400 hover:text-black dark:text-zinc-600 dark:hover:text-white"
            >
              {btn}
            </button>
          ))}
        </div>

        <button className="w-full rounded-2xl bg-[#9db4ff] py-4 text-center text-lg font-bold text-white transition-opacity hover:opacity-90 dark:bg-blue-600/50">
          Trade
        </button>

        <p className="text-center text-[10px] text-zinc-400">
          By trading, you agree to the <span className="underline cursor-pointer">Terms of Use</span>.
        </p>
      </div>
    </div>
  );
};
