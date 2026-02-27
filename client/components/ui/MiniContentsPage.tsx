"use client";

import { useState, useEffect } from "react";
import SlimeRace from "@/components/game/SlimeRace";
import FishingGame from "@/components/game/FishingGame";
import WorldBossPage from "@/components/ui/WorldBossPage";
import TrainingPage from "@/components/ui/TrainingPage";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";

type MiniContent = "menu" | "race" | "fishing" | "boss" | "training";

const BEST_KEYS = {
  race: "slimerace_best_score",
  fishing: "fishing_total_catches",
  boss: "boss_best_damage",
  training: "training_total_exp",
};

function getBest(key: string): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(key) || "0", 10);
}

const CONTENTS = [
  {
    id: "race" as const,
    name: "슬라임 레이스",
    desc: "장애물을 피하고 코인을 모아 최고 점수에 도전!",
    icon: { element: "grass", grade: "rare", speciesId: 3 },
    accent: "#C9A84C",
    bg: "/assets/bg/grassland.png",
    reward: "Gold + EXP",
    limit: "무제한",
    bestKey: BEST_KEYS.race,
    bestLabel: "최고점수",
    tag: "HOT" as const,
  },
  {
    id: "fishing" as const,
    name: "낚시",
    desc: "릴링 미니게임으로 희귀한 물고기를 낚아올려요!",
    icon: { element: "water", grade: "epic", speciesId: 1 },
    accent: "#74B9FF",
    bg: "/assets/bg/clear_lake.png",
    reward: "Gold + Gems",
    limit: "일 10회",
    bestKey: BEST_KEYS.fishing,
    bestLabel: "총 수집",
    tag: null,
  },
  {
    id: "boss" as const,
    name: "월드 보스",
    desc: "5단계 보스를 파티로 공격! 속성 유리를 활용하세요",
    icon: { element: "fire", grade: "legendary", speciesId: 2 },
    accent: "#FF6B6B",
    bg: "/assets/bg/red_volcano.png",
    reward: "Gold + Gems",
    limit: "일 10회",
    bestKey: BEST_KEYS.boss,
    bestLabel: "최고 데미지",
    tag: null,
  },
  {
    id: "training" as const,
    name: "훈련소",
    desc: "슬라임을 방치 훈련! 최대 8시간 EXP 자동 획득",
    icon: { element: "light", grade: "uncommon", speciesId: 30 },
    accent: "#FDCB6E",
    bg: "/assets/bg/starlight_cave.png",
    reward: "EXP",
    limit: "3슬롯",
    bestKey: BEST_KEYS.training,
    bestLabel: "총 EXP",
    tag: "NEW" as const,
  },
];

export default function MiniContentsPage({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<MiniContent>("menu");
  const [bests, setBests] = useState<Record<string, number>>({});

  useEffect(() => {
    const b: Record<string, number> = {};
    for (const c of CONTENTS) b[c.id] = getBest(c.bestKey);
    setBests(b);
  }, [active]);

  if (active === "race") return <SlimeRace onClose={() => setActive("menu")} />;
  if (active === "fishing") return <FishingGame onClose={() => setActive("menu")} />;
  if (active === "boss") return <WorldBossPage onClose={() => setActive("menu")} />;
  if (active === "training") return <TrainingPage onClose={() => setActive("menu")} />;

  return (
    <div className="h-full flex flex-col minigame-container">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 shrink-0 minigame-header"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 12 }}>
        <button onClick={onClose} className="minigame-back-btn">
          <span>{"←"}</span>
        </button>
        <h1 className="text-gold font-bold text-lg font-serif-game flex-1" style={{ letterSpacing: "0.05em" }}>
          미니게임
        </h1>
      </div>

      {/* Game cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2.5">
        {CONTENTS.map((c, idx) => {
          const best = bests[c.id] || 0;
          return (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className="w-full text-left rounded-xl overflow-hidden active:scale-[0.98] transition-transform relative"
              style={{
                height: 100,
                border: "1px solid rgba(201,168,76,0.15)",
                animation: `codex-stagger 0.35s ease-out ${idx * 60}ms both`,
              }}
            >
              {/* Background image */}
              <div className="absolute inset-0" style={{
                backgroundImage: `url(${c.bg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }} />
              {/* Dark overlay for readability */}
              <div className="absolute inset-0" style={{
                background: "linear-gradient(90deg, rgba(20,10,5,0.88) 0%, rgba(20,10,5,0.65) 50%, rgba(20,10,5,0.4) 100%)",
              }} />

              {/* Content */}
              <div className="relative h-full flex items-center gap-3 px-3.5">
                {/* Icon — themed slime */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-sm"
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      border: `1px solid ${c.accent}35`,
                    }}>
                    <img
                      src={generateSlimeIconSvg(c.icon.element, 36, c.icon.grade, undefined, c.icon.speciesId)}
                      alt="" className="w-9 h-9" draggable={false}
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>
                  {c.tag && (
                    <span className="absolute -top-1 -right-1 text-[7px] font-bold px-1 py-px rounded-full"
                      style={{
                        background: c.tag === "HOT" ? "#FF6B6B" : "#00B894",
                        color: "white",
                      }}>
                      {c.tag}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[13px]" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                      {c.name}
                    </span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded font-medium"
                      style={{ color: "rgba(245,230,200,0.5)", background: "rgba(0,0,0,0.3)" }}>
                      {c.limit}
                    </span>
                  </div>
                  <p className="text-[10px] mt-0.5 leading-snug" style={{ color: "rgba(245,230,200,0.55)", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                    {c.desc}
                  </p>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <span className="text-[9px] font-bold" style={{ color: c.accent, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{c.reward}</span>
                    {best > 0 && (
                      <span className="text-[9px] tabular-nums" style={{ color: "rgba(255,234,167,0.7)", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                        {c.bestLabel} {best.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <span className="text-sm shrink-0" style={{ color: "rgba(201,168,76,0.4)" }}>{"›"}</span>
              </div>
            </button>
          );
        })}

        <p className="text-center text-[9px] pt-4" style={{ color: "rgba(201,168,76,0.18)", fontFamily: "Georgia, serif" }}>
          보상은 매일 자정에 초기화됩니다
        </p>
      </div>
    </div>
  );
}
