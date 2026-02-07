"use client";

import React, { useState } from "react";
import PillNav from "./PillNav";
import { CommentSection } from "./CommentSection";
import { ActivityFeed } from "./ActivityFeed";

type TabId = "comments" | "holders" | "activity";

const PILL_ITEMS = [
  { label: "Comments", href: "#comments" },
  { label: "Top Holders", href: "#holders" },
  { label: "Activity", href: "#activity" },
];

export function SidebarFeed() {
  const [activeTab, setActiveTab] = useState<TabId>("activity");

  const handleItemClick = (href: string) => {
    const id = href.slice(1) as TabId;
    if (id === "comments" || id === "holders" || id === "activity") {
      setActiveTab(id);
    }
  };

  return (
    <div className="sidebar-feed mt-8 w-[380px] shrink-0 rounded-xl bg-transparent">
      <div className="p-3">
        <PillNav
          items={PILL_ITEMS}
          activeHref={`#${activeTab}`}
          onItemClick={handleItemClick}
          containerClassName="pill-nav-container-inline"
          className="sidebar-feed-pills"
          ease="power2.easeOut"
          baseColor="rgba(255,255,255,0.08)"
          pillColor="transparent"
          hoveredPillTextColor="#ffffff"
          pillTextColor="rgba(228,228,231,0.85)"
          initialLoadAnimation={false}
        />
      </div>
      {/* Content */}
      {activeTab === "comments" && <CommentSection embedded />}
      {activeTab === "holders" && (
        <div className="max-h-[320px] overflow-y-auto scrollbar-transparent p-4">
          <p className="text-center text-sm text-zinc-500">Top holders coming soon.</p>
        </div>
      )}
      {activeTab === "activity" && <ActivityFeed />}
    </div>
  );
}
