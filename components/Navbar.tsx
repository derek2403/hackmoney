import React from "react";
import { Search } from "lucide-react";
import { cn } from "./utils";

const CATEGORIES = [
  "For You",
  "Trending",
  "Politics",
  "Sports",
  "Crypto",
  "Finance",
  "More",

];

export const Navbar = () => {
  return (
    <div className="sticky top-0 z-50 w-full border-b border-white/5 bg-white/5 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="h-6 w-6 rounded-md bg-white transition-transform group-hover:scale-110" />
            <span className="text-xl font-bold tracking-tight text-white">
              Phỏcast
            </span>
          </div>

          <div className="relative group flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-zinc-500 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="Search markets"
              className="h-10 w-[400px] rounded-xl bg-white/5 border border-white/5 pl-10 pr-4 text-sm text-white outline-none transition-all focus:bg-white/10 focus:border-white/20 focus:ring-4 focus:ring-white/5 placeholder:text-zinc-600"
            />
            <div className="absolute right-3 flex h-5 w-5 items-center justify-center rounded border border-white/10 bg-white/5 text-[10px] text-zinc-500">
              /
            </div>
          </div>
        </div>

        <button className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition-all hover:bg-zinc-200 hover:scale-105 active:scale-95 shadow-lg shadow-white/10">
          Connect Wallet
        </button>
      </div>

      <div className="mx-auto flex h-12 max-w-[1440px] items-center px-6">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-2">
          {CATEGORIES.map((category, i) => (
            <button
              key={category}
              className={cn(
                "whitespace-nowrap text-sm font-bold transition-all hover:text-white",
                i === 0
                  ? "text-white border-b-2 border-white pb-1"
                  : "text-zinc-500"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
