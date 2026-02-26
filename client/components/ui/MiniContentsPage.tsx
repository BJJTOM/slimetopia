"use client";

import { useState } from "react";
import SlimeRace from "@/components/game/SlimeRace";
import FishingGame from "@/components/game/FishingGame";
import WorldBossPage from "@/components/ui/WorldBossPage";
import TrainingPage from "@/components/ui/TrainingPage";

type MiniContent = "menu" | "race" | "fishing" | "boss" | "training";

const CONTENTS = [
  {
    id: "race" as const,
    name: "슬라임 레이스",
    desc: "슬라임을 선택하고 다른 슬라임과 경주하세요!",
    emoji: "🏃",
    gradient: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))",
    border: "rgba(201,168,76,0.2)",
    accent: "#C9A84C",
  },
  {
    id: "fishing" as const,
    name: "낚시",
    desc: "호수에서 보물과 재료를 낚아올리세요!",
    emoji: "🎣",
    gradient: "linear-gradient(135deg, rgba(116,185,255,0.15), rgba(116,185,255,0.05))",
    border: "rgba(116,185,255,0.2)",
    accent: "#74B9FF",
  },
  {
    id: "boss" as const,
    name: "월드 보스",
    desc: "강력한 보스에 도전하고 대량의 보상을 획득하세요!",
    emoji: "⚔️",
    gradient: "linear-gradient(135deg, rgba(255,107,107,0.15), rgba(255,107,107,0.05))",
    border: "rgba(255,107,107,0.2)",
    accent: "#FF6B6B",
  },
  {
    id: "training" as const,
    name: "훈련소",
    desc: "슬라임을 특별 훈련시켜 능력치를 올리세요!",
    emoji: "🏋️",
    gradient: "linear-gradient(135deg, rgba(253,203,110,0.15), rgba(253,203,110,0.05))",
    border: "rgba(253,203,110,0.2)",
    accent: "#FDCB6E",
  },
];

export default function MiniContentsPage({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<MiniContent>("menu");

  if (active === "race") {
    return <SlimeRace onClose={() => setActive("menu")} />;
  }
  if (active === "fishing") {
    return <FishingGame onClose={() => setActive("menu")} />;
  }
  if (active === "boss") {
    return <WorldBossPage onClose={() => setActive("menu")} />;
  }
  if (active === "training") {
    return <TrainingPage onClose={() => setActive("menu")} />;
  }

  return (
    <div className="h-full flex flex-col minigame-container">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0 minigame-header"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <button onClick={onClose} className="minigame-back-btn">
          <span>{"←"}</span>
        </button>
        <h1 className="text-gold font-bold text-lg font-serif-game" style={{ letterSpacing: "0.05em" }}>미니게임 광장</h1>
      </div>

      {/* Content grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-[11px] mb-4" style={{ color: "#F5E6C8", opacity: 0.45 }}>다양한 미니게임에 도전하고 보상을 획득하세요!</p>
        <div className="grid grid-cols-2 gap-3">
          {CONTENTS.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className="minigame-hub-card transition-all active:scale-95 hover:scale-[1.02]"
              style={{
                animation: `codex-stagger 0.4s ease-out ${idx * 80}ms both`,
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{
                  background: "rgba(201,168,76,0.08)",
                  border: "1px solid rgba(201,168,76,0.15)",
                  boxShadow: "0 4px 16px rgba(201,168,76,0.08)",
                }}
              >
                {c.emoji}
              </div>
              <div>
                <p className="font-bold text-sm font-serif-game text-parchment">{c.name}</p>
                <p className="text-[10px] mt-1 leading-relaxed" style={{ color: "rgba(245,230,200,0.4)" }}>{c.desc}</p>
              </div>
              <div
                className="px-4 py-1.5 rounded-full text-[10px] font-bold font-serif-game"
                style={{ background: "rgba(201,168,76,0.12)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.2)" }}
              >
                도전하기
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
