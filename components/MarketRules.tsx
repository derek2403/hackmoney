import React from "react";

export const MarketRules = () => {
  return (
    <div className="max-w-4xl p-1 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl">
      <div className="px-8 py-6 space-y-4 text-sm font-medium leading-relaxed text-white/50">
        <div>
          <span className="text-white block font-bold mb-1">Rules</span>
          <p>
            This market will resolve to "Yes" if the US initiates a drone, missile, or air strike on Iranian soil or any official Iranian embassy or consulate between the time of this market's creation and the listed date (ET). Otherwise, this market will resolve to "No".
          </p>
        </div>
        <p>
          For the purposes of this market, a qualifying "strike" is defined as the use of aerial bombs, drones or missiles (including cruise or ballistic missiles) launched by US military forces that impact Iranian ground territory or any official Iranian embassy or consulate (e.g., if a weapons depot on Iranian soil is hit by an US missile, this market will resolve to "Yes").
        </p>
        <p>
          Missiles or drones which are intercepted and surface-to-air missile strikes will not be sufficient for a "Yes" resolution regardless of whether they land on Iranian territory or cause damage.
        </p>
        <p>
          Actions such as artillery fire, small arms fire, FPV or ATGM strikes directly, ground incursions, naval shelling, cyberattacks, or other operations conducted by US ground operatives will not qualify.
        </p>
        <div className="pt-2 border-t border-white/5 text-[10px] font-black uppercase tracking-widest text-white/30">
          Created At: Jan 29, 2026, 5:19 PM ET
        </div>
      </div>
    </div>
  );
};
