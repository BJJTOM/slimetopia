"use client";

import { useState } from "react";
import ExplorePage from "./ExplorePage";
import PlazaPage from "./PlazaPage";

type DiscoveryTab = "explore" | "plaza";

export default function DiscoveryPage() {
  const [tab, setTab] = useState<DiscoveryTab>("explore");

  return (
    <div className="h-full flex flex-col" style={{ background: "#1A0E08" }}>
      {/* Tab bar — book chapter style */}
      <div className="shrink-0 px-4 pt-2 pb-1">
        <div className="flex gap-1 rounded-xl p-1" style={{
          background: "linear-gradient(180deg, rgba(74,37,21,0.4), rgba(44,24,16,0.3))",
          border: "1px solid rgba(139,105,20,0.15)",
        }}>
          <button
            onClick={() => setTab("explore")}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition"
            style={{
              background: tab === "explore" ? "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(139,105,20,0.1))" : "transparent",
              color: tab === "explore" ? "#D4AF37" : "rgba(245,230,200,0.35)",
              borderBottom: tab === "explore" ? "2px solid #C9A84C" : "2px solid transparent",
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}>
            🧭 탐험
          </button>
          <button
            onClick={() => setTab("plaza")}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition"
            style={{
              background: tab === "plaza" ? "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(139,105,20,0.1))" : "transparent",
              color: tab === "plaza" ? "#D4AF37" : "rgba(245,230,200,0.35)",
              borderBottom: tab === "plaza" ? "2px solid #C9A84C" : "2px solid transparent",
              fontFamily: "Georgia, 'Times New Roman', serif",
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
