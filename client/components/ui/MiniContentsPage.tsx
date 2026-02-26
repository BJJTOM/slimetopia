"use client";

import { useState, useEffect } from "react";
import SlimeRace from "@/components/game/SlimeRace";
import FishingGame from "@/components/game/FishingGame";
import WorldBossPage from "@/components/ui/WorldBossPage";
import TrainingPage from "@/components/ui/TrainingPage";

type MiniContent = "menu" | "race" | "fishing" | "boss" | "training";

// Personal best keys
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
    emoji: "🏃",
    accent: "#C9A84C",
    accentDim: "rgba(201,168,76,0.15)",
    reward: "Gold + EXP",
    rewardEmoji: "🪙",
    limit: "무제한",
    bestKey: BEST_KEYS.race,
    bestLabel: "최고점수",
    tips: ["점프: 화면 탭", "더블점프: 공중에서 한번 더!", "엎드리기: 아래 스와이프"],
    tag: "HOT",
  },
  {
    id: "fishing" as const,
    name: "낚시",
    desc: "릴링 미니게임으로 희귀한 물고기를 낚아올려요!",
    emoji: "🎣",
    accent: "#74B9FF",
    accentDim: "rgba(116,185,255,0.15)",
    reward: "Gold + Gems",
    rewardEmoji: "💎",
    limit: "일 10회",
    bestKey: BEST_KEYS.fishing,
    bestLabel: "총 수집",
    tips: ["길게 누르면 릴 올리기", "물고기가 초록 존 안에 있을 때!", "콤보 유지시 보너스"],
    tag: null,
  },
  {
    id: "boss" as const,
    name: "월드 보스",
    desc: "5단계 보스를 파티로 공격! 속성 유리를 활용하세요",
    emoji: "⚔️",
    accent: "#FF6B6B",
    accentDim: "rgba(255,107,107,0.15)",
    reward: "Gold + Gems",
    rewardEmoji: "💎",
    limit: "일 10회/보스",
    bestKey: BEST_KEYS.boss,
    bestLabel: "최고 데미지",
    tips: ["유리 속성 슬라임 배치", "5마리 파티로 콤보 보너스", "보스 약점 속성을 노려요!"],
    tag: null,
  },
  {
    id: "training" as const,
    name: "훈련소",
    desc: "슬라임을 방치 훈련! 최대 8시간 EXP 자동 획득",
    emoji: "🏋️",
    accent: "#FDCB6E",
    accentDim: "rgba(253,203,110,0.15)",
    reward: "EXP",
    rewardEmoji: "✨",
    limit: "5슬롯",
    bestKey: BEST_KEYS.training,
    bestLabel: "총 EXP",
    tips: ["높은 등급 = 더 많은 EXP", "8시간 꽉 채우면 960 EXP!", "주기적으로 수령하세요"],
    tag: "NEW",
  },
];

export default function MiniContentsPage({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<MiniContent>("menu");
  const [bests, setBests] = useState<Record<string, number>>({});
  const [expandedTip, setExpandedTip] = useState<string | null>(null);

  useEffect(() => {
    const b: Record<string, number> = {};
    for (const c of CONTENTS) {
      b[c.id] = getBest(c.bestKey);
    }
    setBests(b);
  }, [active]); // refresh when returning from a game

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
      <div className="flex items-center gap-3 px-4 shrink-0 minigame-header"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 12 }}>
        <button onClick={onClose} className="minigame-back-btn">
          <span>{"←"}</span>
        </button>
        <h1 className="text-gold font-bold text-lg font-serif-game flex-1" style={{ letterSpacing: "0.05em" }}>
          미니게임 광장
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {/* Daily tip banner */}
        <div className="rounded-xl px-3 py-2.5 mb-4" style={{
          background: "linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.04))",
          border: "1px solid rgba(201,168,76,0.15)",
        }}>
          <p className="text-[11px] font-bold" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>
            💡 오늘의 팁
          </p>
          <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: "rgba(245,230,200,0.5)" }}>
            레이스에서 콤보 15회 달성 시 FEVER 모드 발동! 낚시는 릴링 중 물고기 위치를 잘 추적하세요.
          </p>
        </div>

        {/* Game cards — vertical list with rich info */}
        <div className="space-y-3">
          {CONTENTS.map((c, idx) => {
            const best = bests[c.id] || 0;
            const isTipOpen = expandedTip === c.id;
            return (
              <div
                key={c.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "linear-gradient(160deg, rgba(61,32,23,0.7) 0%, rgba(44,24,16,0.9) 100%)",
                  border: `1px solid ${c.accent}25`,
                  boxShadow: `0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,235,180,0.04)`,
                  animation: `codex-stagger 0.4s ease-out ${idx * 80}ms both`,
                }}
              >
                {/* Main card content */}
                <button
                  onClick={() => setActive(c.id)}
                  className="w-full text-left px-4 py-3.5 flex items-start gap-3 active:opacity-80 transition"
                >
                  {/* Icon */}
                  <div className="relative">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${c.accentDim}, rgba(44,24,16,0.8))`,
                        border: `1.5px solid ${c.accent}30`,
                        boxShadow: `0 4px 12px ${c.accent}15`,
                      }}
                    >
                      {c.emoji}
                    </div>
                    {/* Tag badge */}
                    {c.tag && (
                      <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: c.tag === "HOT"
                            ? "linear-gradient(135deg, #FF6B6B, #E17055)"
                            : "linear-gradient(135deg, #55EFC4, #00B894)",
                          color: "white",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                        }}>
                        {c.tag}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>
                        {c.name}
                      </p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold" style={{
                        background: `${c.accent}15`,
                        color: c.accent,
                        border: `1px solid ${c.accent}20`,
                      }}>
                        {c.limit}
                      </span>
                    </div>
                    <p className="text-[10px] mt-1 leading-relaxed" style={{ color: "rgba(245,230,200,0.45)" }}>
                      {c.desc}
                    </p>
                    {/* Stats row */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] flex items-center gap-1" style={{ color: "rgba(245,230,200,0.35)" }}>
                        {c.rewardEmoji} <span style={{ color: c.accent }}>{c.reward}</span>
                      </span>
                      {best > 0 && (
                        <span className="text-[10px] flex items-center gap-1" style={{ color: "rgba(245,230,200,0.35)" }}>
                          🏆 <span style={{ color: "#FFEAA7", fontVariantNumeric: "tabular-nums" }}>
                            {c.bestLabel}: {best.toLocaleString()}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Play button */}
                  <div className="flex-shrink-0 self-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                      background: `linear-gradient(135deg, ${c.accent}, ${c.accent}80)`,
                      boxShadow: `0 2px 8px ${c.accent}40`,
                    }}>
                      <span className="text-white text-lg" style={{ marginLeft: 2 }}>▶</span>
                    </div>
                  </div>
                </button>

                {/* Tips toggle */}
                <div style={{ borderTop: `1px solid ${c.accent}10` }}>
                  <button
                    onClick={() => setExpandedTip(isTipOpen ? null : c.id)}
                    className="w-full px-4 py-2 flex items-center justify-between active:opacity-70 transition"
                  >
                    <span className="text-[10px] font-bold" style={{ color: `${c.accent}80`, fontFamily: "Georgia, serif" }}>
                      💡 공략 팁
                    </span>
                    <span className="text-[10px] transition-transform" style={{
                      color: `${c.accent}50`,
                      transform: isTipOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}>▼</span>
                  </button>
                  {isTipOpen && (
                    <div className="px-4 pb-3 space-y-1">
                      {c.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-[9px] mt-0.5 flex-shrink-0" style={{ color: c.accent }}>●</span>
                          <span className="text-[10px] leading-relaxed" style={{ color: "rgba(245,230,200,0.5)" }}>{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <p className="text-center text-[9px] mt-6" style={{ color: "rgba(201,168,76,0.2)", fontFamily: "Georgia, serif" }}>
          보상은 매일 자정에 초기화됩니다
        </p>
      </div>
    </div>
  );
}
