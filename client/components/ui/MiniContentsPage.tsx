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
    gradient: "linear-gradient(135deg, rgba(162,155,254,0.15), rgba(162,155,254,0.05))",
    border: "rgba(162,155,254,0.2)",
    accent: "#A29BFE",
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
    <div className="h-full flex flex-col bg-[#0a0a1a]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5">
          <span className="text-white/60 text-sm">←</span>
        </button>
        <h1 className="text-white font-bold text-lg">🎮 미니게임</h1>
      </div>

      {/* Content grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-white/40 text-xs mb-4">다양한 미니게임에 도전하고 보상을 획득하세요! 🎯</p>
        <div className="grid grid-cols-2 gap-3">
          {CONTENTS.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className="rounded-2xl p-4 flex flex-col items-center gap-3 text-center transition-all active:scale-95 hover:scale-[1.02]"
              style={{
                background: c.gradient,
                border: `1px solid ${c.border}`,
                animation: `stagger-slide-in 0.3s ease-out ${idx * 60}ms both`,
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{
                  background: `${c.accent}15`,
                  border: `1px solid ${c.accent}25`,
                  boxShadow: `0 4px 16px ${c.accent}15`,
                }}
              >
                {c.emoji}
              </div>
              <div>
                <p className="text-white font-bold text-sm">{c.name}</p>
                <p className="text-white/40 text-[10px] mt-1 leading-relaxed">{c.desc}</p>
              </div>
              <div
                className="px-4 py-1.5 rounded-full text-[10px] font-bold"
                style={{ background: `${c.accent}15`, color: c.accent, border: `1px solid ${c.accent}25` }}
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
