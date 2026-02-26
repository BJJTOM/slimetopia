"use client";

import { useGameStore } from "@/lib/store/gameStore";
import { generateSlimeSvg } from "@/lib/slimeSvg";
import { elementColors } from "@/lib/constants";

export default function LevelUpModal() {
  const { levelUpInfo, clearLevelUp, slimes, species } = useGameStore();

  if (!levelUpInfo) return null;

  const slime = slimes.find((s) => s.id === levelUpInfo.slimeId);
  const sp = species.find((s) => s.id === slime?.species_id);
  const color = elementColors[slime?.element || ""] || "#B2BEC3";

  // Milestone levels get extra flair
  const isMilestone = levelUpInfo.newLevel % 10 === 0;
  const isMaxLevel = levelUpInfo.newLevel >= 30;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="frosted-card rounded-3xl p-8 w-[300px] text-center animate-scale-in relative overflow-hidden" style={{
        borderColor: `${color}18`,
        boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 40px ${color}08, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}>
        {/* Background glow */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${color}, transparent 70%)`,
          }}
        />

        {/* Milestone / Max glow ring */}
        {(isMilestone || isMaxLevel) && (
          <div
            className="absolute inset-0 rounded-3xl animate-glow-pulse"
            style={{
              boxShadow: `inset 0 0 30px ${isMaxLevel ? "#FF6B6B" : color}25, 0 0 40px ${isMaxLevel ? "#FF6B6B" : color}20`,
            }}
          />
        )}

        <div className="relative z-10">
          {/* Sparkle decorations — more sparkles for milestones */}
          <div className="absolute top-2 left-6 text-lg animate-float" style={{ animationDelay: "0s" }}>✨</div>
          <div className="absolute top-4 right-8 text-sm animate-float" style={{ animationDelay: "0.5s" }}>⭐</div>
          <div className="absolute top-16 left-4 text-sm animate-float" style={{ animationDelay: "1s" }}>🌟</div>
          {isMilestone && (
            <>
              <div className="absolute top-8 right-4 text-base animate-float" style={{ animationDelay: "0.3s" }}>🎊</div>
              <div className="absolute top-20 right-6 text-xs animate-float" style={{ animationDelay: "0.8s" }}>💫</div>
              <div className="absolute top-1 left-1/2 text-xs animate-float" style={{ animationDelay: "1.2s" }}>⭐</div>
            </>
          )}

          <div className="text-4xl mb-2 animate-celebrate-bounce">{isMaxLevel ? "🏆" : isMilestone ? "🎊" : "🎉"}</div>

          {/* Slime SVG */}
          <div className="relative mx-auto w-24 h-24 mb-4">
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
                boxShadow: `0 0 40px ${color}30`,
              }}
            />
            {/* Shimmer overlay */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(135deg, transparent 30%, ${color}20 50%, transparent 70%)`,
                backgroundSize: "200% 200%",
                animation: "gold-shimmer 2s linear infinite",
              }}
            />
            {slime && (
              <img
                src={generateSlimeSvg(slime.element, slime.personality, sp?.grade, slime.species_id)}
                alt=""
                className="absolute inset-1 w-[88px] h-[88px] drop-shadow-xl"
                draggable={false}
              />
            )}
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            {isMaxLevel ? "최대 레벨 달성!" : isMilestone ? "마일스톤 달성!" : "레벨 업!"}
          </h2>
          <p className="text-sm text-[#B2BEC3] mb-3">
            {slime?.name || sp?.name || "???"}
          </p>

          <div className="inline-flex items-baseline gap-1 mb-2 animate-number-pop">
            <span className="text-3xl font-bold" style={{ color }}>
              Lv. {levelUpInfo.newLevel}
            </span>
          </div>

          {/* Milestone badge */}
          {isMilestone && (
            <div className="mb-3">
              <span
                className="inline-block text-[10px] px-3 py-1 rounded-full font-bold"
                style={{
                  background: `${color}20`,
                  color: color,
                  border: `1px solid ${color}30`,
                }}
              >
                {isMaxLevel ? "MAX LEVEL" : `MILESTONE Lv.${levelUpInfo.newLevel}`}
              </span>
            </div>
          )}

          <button
            onClick={clearLevelUp}
            className="btn-primary w-full py-3 text-sm active:scale-95 transition-transform"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
