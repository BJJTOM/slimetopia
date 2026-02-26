"use client";

import { useState } from "react";
import ExplorePage from "./ExplorePage";
import PlazaPage from "./PlazaPage";

type DiscoveryTab = "explore" | "plaza";

export default function DiscoveryPage() {
  const [tab, setTab] = useState<DiscoveryTab>("explore");

  return (
    <div className="h-full flex flex-col" style={{ background: "#1A0E08" }}>
      {/* Tab bar at top */}
      <div className="shrink-0 px-4 pt-2 pb-1">
        <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.04)" }}>
          <button
            onClick={() => setTab("explore")}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition"
            style={{
              background: tab === "explore" ? "rgba(162,155,254,0.15)" : "transparent",
              color: tab === "explore" ? "#C8B6FF" : "rgba(255,255,255,0.4)",
            }}>
            🧭 탐험
          </button>
          <button
            onClick={() => setTab("plaza")}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition"
            style={{
              background: tab === "plaza" ? "rgba(162,155,254,0.15)" : "transparent",
              color: tab === "plaza" ? "#C8B6FF" : "rgba(255,255,255,0.4)",
            }}>
            🏟️ 광장
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "explore" && <ExplorePage />}
        {tab === "plaza" && <PlazaPage onClose={() => setTab("explore")} />}
      </div>
    </div>
  );
}
