import React from "react";
import { Search } from "lucide-react";
import { cn } from "./utils";

const CATEGORIES = [
  "Trending",
  "Breaking",
  "New",
  "Politics",
  "Sports",
  "Crypto",
  "Finance",
  "Geopolitics",
  "Earnings",
  "Tech",
  "Culture",
  "World",
  "Economy",
  "Climate & Science",
  "Elections",
];

export const Navbar = () => {
  return (
    <div className="sticky top-0 z-50 w-full border-b border-zinc-100 bg-white dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-black dark:bg-white" />
            <span className="text-xl font-bold tracking-tight text-black dark:text-white">
              Phỏcast
            </span>
          </div>

          <div className="relative group flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-zinc-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="Search markets"
              className="h-10 w-[400px] rounded-xl bg-zinc-100 pl-10 pr-4 text-sm outline-none transition-all focus:bg-zinc-50 focus:ring-1 focus:ring-zinc-200 dark:bg-zinc-900 dark:focus:bg-zinc-800 dark:focus:ring-zinc-700"
            />
            <div className="absolute right-3 flex h-5 w-5 items-center justify-center rounded border border-zinc-200 bg-zinc-50 text-[10px] text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
              /
            </div>
          </div>
        </div>

        <button className="rounded-full bg-zinc-100 px-5 py-2 text-sm font-semibold text-black transition-all hover:bg-zinc-200 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800">
          Connect Wallet
        </button>
      </div>

      <div className="mx-auto flex h-12 max-w-[1440px] items-center px-6">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-2">
          {CATEGORIES.map((category, i) => (
            <button
              key={category}
              className={cn(
                "whitespace-nowrap text-sm font-medium transition-colors",
                i === 0
                  ? "text-black dark:text-white border-b-2 border-black dark:border-white pb-1"
                  : "text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white"
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
