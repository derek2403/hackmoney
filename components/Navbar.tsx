'use client';

import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Dock from "./Dock";

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
  const [selectedIndex, setSelectedIndex] = useState(0);

  const dockItems = useMemo(
    () =>
      CATEGORIES.map((category, i) => ({
        icon: (
          <span className="dock-category-text whitespace-nowrap text-sm font-bold">
            {category}
          </span>
        ),
        label: category,
        onClick: () => setSelectedIndex(i),
        className: i === selectedIndex ? "dock-item--active" : "",
      })),
    [selectedIndex]
  );

  return (
    <div className="sticky top-0 z-50 w-full border-b border-white/5 bg-white/5 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6 pt-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="h-6 w-6 rounded-md bg-white transition-transform group-hover:scale-110" />
            <span className="text-xl font-bold tracking-tight text-white">
              OnlyTruth
            </span>
          </div>

          <div className="relative group flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="Search markets"
              className="h-8 w-[260px] rounded-lg bg-white/5 border border-white/5 pl-8 pr-3 text-xs text-white outline-none transition-all focus:bg-white/10 focus:border-white/20 focus:ring-2 focus:ring-white/5 placeholder:text-zinc-600"
            />
            <div className="absolute right-2.5 flex h-4 w-4 items-center justify-center rounded border border-white/10 bg-white/5 text-[9px] text-zinc-500">
              /
            </div>
          </div>
        </div>

        <button className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition-all hover:bg-zinc-200 hover:scale-105 active:scale-95 shadow-lg shadow-white/10">
          Connect Wallet
        </button>
      </div>

      <div className="mx-auto flex h-12 max-w-[1440px] items-center px-6">
        <div className="dock-navbar-wrapper flex items-center justify-center overflow-x-auto no-scrollbar py-2 w-full">
          <Dock
            items={dockItems}
            panelHeight={30}
            baseItemSize={52}
            magnification={68}
            distance={140}
            className="dock-panel--navbar"
          />
        </div>
      </div>
    </div>
  );
};
