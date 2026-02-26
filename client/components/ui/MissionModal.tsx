"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore, DailyMission } from "@/lib/store/gameStore";

// Action-based categorization with color/icon
const MISSION_META: Record<string, { icon: string; color: string; label: string }> = {
  feed: { icon: "🍖", color: "#FF9FF3", label: "육성" },
  merge: { icon: "⚗️", color: "#A29BFE", label: "합성" },
  nurture: { icon: "💕", color: "#FF9FF3", label: "육성" },
  explore: { icon: "🗺️", color: "#55EFC4", label: "탐험" },
  race: { icon: "🏃", color: "#74B9FF", label: "경쟁" },
  login: { icon: "📅", color: "#FFEAA7", label: "출석" },
  fish: { icon: "🎣", color: "#74B9FF", label: "낚시" },
  collect: { icon: "📚", color: "#A29BFE", label: "수집" },
  train: { icon: "🏋️", color: "#FFEAA7", label: "훈련" },
  boss: { icon: "⚔️", color: "#FF6B6B", label: "전투" },
};

function getMissionMeta(mission: DailyMission) {
  // Try action field first, then match against name/description
  if (mission.action && MISSION_META[mission.action]) {
    return MISSION_META[mission.action];
  }
  for (const [key, meta] of Object.entries(MISSION_META)) {
    if (mission.name.includes(key) || mission.description?.includes(key)) {
      return meta;
    }
  }
  return { icon: "⭐", color: "#C8B6FF", label: "일반" };
}

function getDifficultyTier(target: number): { label: string; color: string } {
  if (target <= 1) return { label: "쉬움", color: "#55EFC4" };
  if (target <= 3) return { label: "보통", color: "#FFEAA7" };
  if (target <= 5) return { label: "어려움", color: "#FF9FF3" };
  return { label: "도전", color: "#FF6B6B" };
}

export default function MissionModal() {
  const token = useAuthStore((s) => s.accessToken);
  const {
    dailyMissions,
    fetchDailyMissions,
    claimMission,
    setShowMissionModal,
  } = useGameStore();

  const [claimingAll, setClaimingAll] = useState(false);

  useEffect(() => {
    if (token) fetchDailyMissions(token);
  }, [token, fetchDailyMissions]);

  const completedCount = dailyMissions.filter((m) => m.completed).length;
  const claimedCount = dailyMissions.filter((m) => m.claimed).length;
  const totalCount = dailyMissions.length;
  const claimable = dailyMissions.filter((m) => m.completed && !m.claimed);

  // Total rewards from claimable missions
  const totalClaimGold = claimable.reduce((s, m) => s + m.reward_gold, 0);
  const totalClaimGems = claimable.reduce((s, m) => s + m.reward_gems, 0);

  // Overall progress ring
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const ringR = 18;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - (progressPct / 100) * ringC;

  const handleClaimAll = useCallback(async () => {
    if (!token || claimingAll || claimable.length === 0) return;
    setClaimingAll(true);
    for (const m of claimable) {
      await claimMission(token, m.id);
    }
    setClaimingAll(false);
  }, [token, claimingAll, claimable, claimMission]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center modal-backdrop" onClick={() => setShowMissionModal(false)}>
      <div
        className="modal-panel w-[360px] max-w-[94%] max-h-[82vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "mission-pop-in 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{
          background: "linear-gradient(135deg, rgba(162,155,254,0.08), rgba(255,159,243,0.04))",
          borderBottom: "1px solid rgba(162,155,254,0.08)",
          borderRadius: "24px 24px 0 0",
        }}>
          <div className="flex items-center gap-3">
            {/* Progress ring */}
            <div className="relative w-10 h-10">
              <svg width="40" height="40" className="rotate-[-90deg]">
                <circle cx="20" cy="20" r={ringR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <circle cx="20" cy="20" r={ringR} fill="none"
                  stroke="url(#missionGrad)" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={ringC} strokeDashoffset={ringOffset}
                  className="transition-all duration-700" />
                <defs>
                  <linearGradient id="missionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#A29BFE" />
                    <stop offset="100%" stopColor="#FF9FF3" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-extrabold text-white/70">{completedCount}/{totalCount}</span>
              </div>
            </div>
            <div>
              <h2 className="text-white font-bold text-[15px]">일일 미션</h2>
              <span className="text-[9px] text-white/30">
                {claimedCount === totalCount ? "모든 보상 수령 완료!" : `${claimable.length}개 수령 가능`}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowMissionModal(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] transition text-white/40 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>

        {/* Claim All bar */}
        {claimable.length > 1 && (
          <div className="px-4 py-2.5 flex items-center justify-between" style={{
            background: "linear-gradient(135deg, rgba(162,155,254,0.06), rgba(255,159,243,0.03))",
            borderBottom: "1px solid rgba(162,155,254,0.06)",
          }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40">총 보상:</span>
              {totalClaimGold > 0 && (
                <span className="text-[10px] text-[#FFEAA7] font-bold">{totalClaimGold.toLocaleString()}G</span>
              )}
              {totalClaimGems > 0 && (
                <span className="text-[10px] text-[#C8B6FF] font-bold">{totalClaimGems}💎</span>
              )}
            </div>
            <button
              onClick={handleClaimAll}
              disabled={claimingAll}
              className="text-[9px] font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #A29BFE, #FF9FF3)",
                color: "#0c0a18",
                boxShadow: "0 2px 8px rgba(162,155,254,0.3)",
              }}
            >
              {claimingAll ? "수령 중..." : `🎯 모두 수령 (${claimable.length})`}
            </button>
          </div>
        )}

        {/* Mission list */}
        <div className="flex-1 overflow-y-auto game-scroll p-4 space-y-2">
          {dailyMissions.length === 0 ? (
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-3.5" style={{ background: "rgba(22,18,36,0.6)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 skeleton rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="w-28 h-3 skeleton" />
                      <div className="w-full h-2 skeleton" />
                      <div className="w-20 h-2 skeleton" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            dailyMissions.map((mission, idx) => {
              const meta = getMissionMeta(mission);
              const diff = getDifficultyTier(mission.target);
              const pct = Math.min((mission.progress / mission.target) * 100, 100);

              return (
                <div
                  key={mission.id}
                  className={`rounded-2xl p-3.5 transition-all ${mission.claimed ? "opacity-50" : ""}`}
                  style={{
                    background: mission.claimed
                      ? "rgba(22,18,36,0.3)"
                      : mission.completed
                      ? "linear-gradient(135deg, rgba(85,239,196,0.06), rgba(162,155,254,0.03))"
                      : "rgba(22,18,36,0.6)",
                    border: mission.claimed
                      ? "1px solid rgba(255,255,255,0.03)"
                      : mission.completed
                      ? "1px solid rgba(85,239,196,0.15)"
                      : "1px solid rgba(255,255,255,0.05)",
                    animation: `stagger-slide-in 0.3s ease-out ${idx * 50}ms both`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Mission icon with color accent */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                      style={{
                        background: mission.claimed
                          ? "rgba(255,255,255,0.03)"
                          : `linear-gradient(135deg, ${meta.color}18, ${meta.color}08)`,
                        border: `1px solid ${mission.claimed ? "rgba(255,255,255,0.03)" : `${meta.color}20`}`,
                      }}
                    >
                      <span className={`text-lg ${mission.claimed ? "grayscale" : ""}`}>{meta.icon}</span>
                      {/* Completed check overlay */}
                      {mission.claimed && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #55EFC4, #74B9FF)" }}>
                          <span className="text-[6px] text-[#0c0a18] font-bold">✓</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className={`text-xs font-bold truncate ${
                            mission.claimed ? "text-white/30 line-through" : "text-white"
                          }`}>
                            {mission.name}
                          </h3>
                        </div>
                        {/* Action button or status */}
                        {mission.claimed ? (
                          <span className="text-[8px] px-2 py-0.5 rounded-full bg-white/[0.03] text-[#55EFC4]/40 font-medium flex-shrink-0 ml-2">
                            수령 완료
                          </span>
                        ) : mission.completed ? (
                          <button
                            onClick={() => token && claimMission(token, mission.id)}
                            className="text-[9px] font-bold px-3 py-1 rounded-full flex-shrink-0 ml-2 animate-heartbeat active:scale-90 transition-transform"
                            style={{
                              background: "linear-gradient(135deg, #A29BFE, #FF9FF3)",
                              color: "#0c0a18",
                              boxShadow: "0 2px 8px rgba(162,155,254,0.3)",
                            }}
                          >
                            🎯 수령
                          </button>
                        ) : null}
                      </div>

                      {/* Tags row: category + difficulty */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: `${meta.color}12`, color: `${meta.color}AA` }}>
                          {meta.label}
                        </span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: `${diff.color}10`, color: `${diff.color}90` }}>
                          {diff.label}
                        </span>
                      </div>

                      <p className="text-white/35 text-[10px] mb-2">{mission.description}</p>

                      {/* Progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: mission.completed
                                ? "linear-gradient(90deg, #55EFC4, #74B9FF)"
                                : `linear-gradient(90deg, ${meta.color}90, ${meta.color}50)`,
                              boxShadow: mission.completed
                                ? "0 0 6px rgba(85,239,196,0.4)"
                                : `0 0 6px ${meta.color}30`,
                            }}
                          />
                        </div>
                        <span className={`text-[10px] font-bold tabular-nums w-12 text-right ${
                          mission.completed ? "text-[#55EFC4]" : "text-white/40"
                        }`}>
                          {mission.progress}/{mission.target}
                        </span>
                      </div>

                      {/* Rewards */}
                      <div className="flex items-center gap-2 mt-2">
                        {mission.reward_gold > 0 && (
                          <span className="text-[9px] text-[#FFEAA7] font-bold flex items-center gap-0.5 bg-[#FFEAA7]/[0.08] rounded-full px-2 py-0.5">
                            <img src="/assets/icons/gold.png" alt="" className="w-3 h-3 pixel-art" />
                            +{mission.reward_gold.toLocaleString()}
                          </span>
                        )}
                        {mission.reward_gems > 0 && (
                          <span className="text-[9px] text-[#C8B6FF] font-bold flex items-center gap-0.5 bg-[#C8B6FF]/[0.08] rounded-full px-2 py-0.5">
                            <img src="/assets/icons/gems.png" alt="" className="w-3 h-3 pixel-art" />
                            +{mission.reward_gems}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* All complete celebration */}
          {totalCount > 0 && claimedCount === totalCount && (
            <div className="text-center py-3 rounded-xl" style={{
              background: "linear-gradient(135deg, rgba(85,239,196,0.06), rgba(162,155,254,0.03))",
              border: "1px solid rgba(85,239,196,0.1)",
            }}>
              <span className="text-lg">🎉</span>
              <div className="text-[#55EFC4] text-xs font-bold mt-1">오늘 미션 모두 완료!</div>
              <div className="text-white/25 text-[9px] mt-0.5">내일 새로운 미션이 갱신됩니다</div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes mission-pop-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
