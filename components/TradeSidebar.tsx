import React, { useState } from "react";
import { cn } from "./utils";
import GooeyButton from "./GooeyButton";

const QUESTIONS = [
  {
    id: 1,
    text: "Khamenei out as Supreme Leader of Iran by January 31?",
    image: "/Khamenei.jpg",
  },
  {
    id: 2,
    text: "US strikes Iran by January 31?",
    image: "/US%20Iran.jpg",
  },
  {
    id: 3,
    text: "Israel next strikes Iran by January 31?",
    image: "/israeliran.jpg",
  },
];

interface TradeSidebarProps {
  selections: Record<number, string | null>;
  onSelectionChange: (selections: Record<number, string | null>) => void;
}

export const TradeSidebar = ({ selections, onSelectionChange }: TradeSidebarProps) => {
  const [activeTab, setActiveTab] = useState("Buy");
  const [orderType, setOrderType] = useState("Market");
  const [amount, setAmount] = useState("0");
  const [limitPrice, setLimitPrice] = useState("0.50");
  const [shares, setShares] = useState("0");

  const handleSelect = (qId: number, option: string) => {
    const newSelections = { ...selections, [qId]: option };
    onSelectionChange(newSelections);
  };

  return (
    <div className="w-[380px] shrink-0 space-y-4 rounded-3xl border border-white/10 bg-white/3 p-6 shadow-2xl backdrop-blur-3xl ring-1 ring-inset ring-white/5">
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

        <div className="relative group">
          <button className="flex items-center gap-1.5 text-lg font-bold text-white/40 group-hover:text-white transition-all cursor-pointer">
            {orderType} <span className="text-[10px] opacity-40 transition-transform group-hover:rotate-180">⌄</span>
          </button>

          <div className="absolute right-0 top-full pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
            <div className="w-32 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a]/90 backdrop-blur-3xl shadow-2xl">
              {["Market", "Limit"].map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={cn(
                    "w-full px-4 py-3 text-left text-xs font-bold transition-colors",
                    orderType === type
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 py-4">
        {QUESTIONS.map((q) => (
          <div key={q.id} className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/5 overflow-hidden">
                <img src={q.image} alt="" className="h-full w-full object-cover" />
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
                      : "bg-white/5 text-white/30 hover:bg-white/8 hover:text-white/50 border-white/5"
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
        {orderType === "Market" ? (
          <div className="flex items-center justify-between">
            <span className="text-sm font-black tracking-widest text-white/40 uppercase">Amount</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white/10">$</span>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-24 bg-transparent text-5xl font-black text-white/20 outline-none focus:text-white transition-colors text-right"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black tracking-widest text-white/40 uppercase">Limit Price</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white/10">$</span>
                <input
                  type="text"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-24 bg-transparent text-4xl font-black text-white/20 outline-none focus:text-white transition-colors text-right"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black tracking-widest text-white/40 uppercase">Shares</span>
              <div className="flex items-baseline gap-1">
                <input
                  type="text"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  className="w-24 bg-transparent text-4xl font-black text-white/20 outline-none focus:text-white transition-colors text-right"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[10px] font-black tracking-[0.2em] text-white/20 uppercase">Est. Total</span>
              <span className="text-sm font-black text-blue-400">
                ${(parseFloat(limitPrice) * (parseFloat(shares) || 0)).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {orderType === "Market" && (
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
        )}

        <div className="pt-2">
          <GooeyButton
            label={`${activeTab} ${orderType}`}
            onClick={() => console.log(`Executing ${activeTab} ${orderType} order`)}
          />
        </div>

        <p className="text-center text-[10px] font-bold text-white/20">
          By trading, you agree to the <span className="underline cursor-pointer hover:text-white transition-colors">Terms of Use</span>.
        </p>
      </div>
    </div>
  );
};
