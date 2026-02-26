"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore } from "@/lib/store/gameStore";

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const MILESTONE_DAYS = new Set([7, 14, 21, 28]);

const MILESTONE_REWARDS: Record<number, { label: string; icon: string; color: string }> = {
  7: { label: "1주 달성", icon: "🎁", color: "#74B9FF" },
  14: { label: "2주 달성", icon: "🎊", color: "#A29BFE" },
  21: { label: "3주 달성", icon: "🏅", color: "#FF9FF3" },
  28: { label: "개근 달성", icon: "🏆", color: "#FFEAA7" },
};

function getRewardEmoji(gold: number, gems: number): string {
  if (gems >= 10) return "💎";
  if (gold >= 1000) return "💰";
  if (gems > 0) return "✨";
  return "🪙";
}

export default function AttendanceModal() {
  const token = useAuthStore((s) => s.accessToken);
  const {
    attendance,
    fetchAttendance,
    claimAttendance,
    setShowAttendanceModal,
  } = useGameStore();

  const [claiming, setClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);

  useEffect(() => {
    if (token) fetchAttendance(token);
  }, [token, fetchAttendance]);

  const handleClaim = useCallback(async () => {
    if (!token || claiming) return;
    setClaiming(true);
    await claimAttendance(token);
    setClaiming(false);
    setJustClaimed(true);
    setTimeout(() => setJustClaimed(false), 2000);
  }, [token, claiming, claimAttendance]);

  const rewards = attendance?.rewards || [];
  const currentDay = attendance?.day_number || 1;
  const claimed = attendance?.reward_claimed || false;

  const weeks: (typeof rewards[number] | null)[][] = [];
  for (let w = 0; w < 4; w++) {
    const week: (typeof rewards[number] | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const dayNum = w * 7 + d + 1;
      const reward = rewards.find((r) => r.day === dayNum);
      week.push(reward || null);
    }
    weeks.push(week);
  }

  const progressPercent = Math.round((currentDay / 28) * 100);
  const currentWeek = Math.ceil(currentDay / 7);
  const nextMilestone = [7, 14, 21, 28].find((d) => d >= currentDay) || 28;
  const daysUntilMilestone = nextMilestone - currentDay;

  // Today's reward
  const todayReward = rewards.find((r) => r.day === currentDay);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center modal-backdrop" onClick={() => setShowAttendanceModal(false)}>
      <div
        className="modal-panel w-[400px] max-w-[95%] max-h-[85vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modal-pop-in 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{
          background: "linear-gradient(135deg, rgba(255,234,167,0.08), rgba(255,159,243,0.04))",
          borderBottom: "1px solid rgba(162,155,254,0.08)",
          borderRadius: "24px 24px 0 0",
        }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #FFEAA730, #FF9FF320)" }}
            >
              <span className="text-lg">📅</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-[15px]">월간 출석 보상</h2>
              <span className="text-[9px] text-white/30">{currentWeek}주차 진행 중</span>
            </div>
          </div>
          <button
            onClick={() => setShowAttendanceModal(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] transition text-white/40 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Progress bar with milestone markers */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-white/40 font-medium">출석 진행</span>
              <div className="flex items-center gap-2">
                {daysUntilMilestone > 0 && (
                  <span className="text-[9px] text-white/25">
                    {MILESTONE_REWARDS[nextMilestone]?.icon} {daysUntilMilestone}일 남음
                  </span>
                )}
                <span
                  className="text-[11px] font-extrabold"
                  style={{
                    background: "linear-gradient(90deg, #FFEAA7, #FF9FF3)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {currentDay}/28일
                </span>
              </div>
            </div>
            <div className="relative h-3 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 relative"
                style={{
                  width: `${progressPercent}%`,
                  background: "linear-gradient(90deg, #FFEAA7, #FF9FF3, #A29BFE)",
                  boxShadow: "0 0 8px rgba(255,234,167,0.4)",
                }}
              />
              {/* Milestone dots on progress bar */}
              {[7, 14, 21, 28].map((day) => {
                const pct = (day / 28) * 100;
                const reached = currentDay >= day;
                return (
                  <div key={day} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                    style={{ left: `${pct}%` }}>
                    <div className={`w-2.5 h-2.5 rounded-full border-2 transition-all ${
                      reached ? "border-[#FFEAA7] bg-[#FFEAA7]" : "border-white/20 bg-[#161224]"
                    }`}
                      style={reached ? { boxShadow: "0 0 6px rgba(255,234,167,0.5)" } : {}} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {DAY_LABELS.map((label, i) => (
              <div key={label} className={`text-center text-[8px] font-bold ${
                i >= 5 ? "text-[#FF9FF3]/40" : "text-white/25"
              }`}>
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1" style={{ animation: `stagger-slide-in 0.3s ease-out ${wi * 60}ms both` }}>
                {week.map((reward, di) => {
                  const dayNum = wi * 7 + di + 1;
                  if (!reward) {
                    return (
                      <div key={di} className="h-[66px] rounded-xl bg-white/[0.015] flex items-center justify-center">
                        <span className="text-[9px] text-white/10">D{dayNum}</span>
                      </div>
                    );
                  }

                  const isPast = dayNum < currentDay;
                  const isToday = dayNum === currentDay;
                  const isMilestone = MILESTONE_DAYS.has(dayNum);
                  const isDay28 = dayNum === 28;
                  const milestoneInfo = MILESTONE_REWARDS[dayNum];
                  const emoji = getRewardEmoji(reward.gold, reward.gems);

                  return (
                    <div
                      key={di}
                      className={`h-[66px] flex flex-col items-center justify-center rounded-xl text-center transition-all relative ${
                        isToday && !claimed ? "animate-glow-pulse" : ""
                      }`}
                      style={
                        isToday
                          ? {
                              background: claimed
                                ? "linear-gradient(135deg, rgba(85,239,196,0.1), rgba(85,239,196,0.04))"
                                : "linear-gradient(135deg, rgba(162,155,254,0.18), rgba(255,159,243,0.12))",
                              border: claimed
                                ? "1.5px solid rgba(85,239,196,0.3)"
                                : "1.5px solid rgba(162,155,254,0.4)",
                              boxShadow: claimed
                                ? "0 0 12px rgba(85,239,196,0.15)"
                                : "0 0 16px rgba(162,155,254,0.25), inset 0 0 8px rgba(162,155,254,0.05)",
                            }
                          : isPast
                          ? {
                              background: "rgba(85,239,196,0.03)",
                              border: "1px solid rgba(85,239,196,0.06)",
                              opacity: 0.5,
                            }
                          : isMilestone
                          ? {
                              background: `linear-gradient(135deg, ${milestoneInfo.color}10, ${milestoneInfo.color}05)`,
                              border: `1px solid ${milestoneInfo.color}20`,
                            }
                          : {
                              background: "rgba(22,18,36,0.4)",
                              border: "1px solid rgba(255,255,255,0.03)",
                            }
                      }
                    >
                      {/* Day number or icon */}
                      <span className={`text-[10px] font-bold leading-none ${
                        isToday ? (claimed ? "text-[#55EFC4]" : "text-[#C8B6FF]")
                        : isMilestone ? `text-[${milestoneInfo.color}]`
                        : "text-white/30"
                      }`}>
                        {isDay28 ? "🥚" : isMilestone ? milestoneInfo.icon : `D${dayNum}`}
                      </span>

                      {/* Reward display */}
                      <div className="text-[8px] leading-tight mt-1 space-y-0.5">
                        {reward.gold > 0 && (
                          <span className="text-[#FFEAA7] block font-bold">
                            {reward.gold >= 1000 ? `${(reward.gold / 1000).toFixed(1)}k` : reward.gold}G
                          </span>
                        )}
                        {reward.gems > 0 && (
                          <span className="text-[#C8B6FF] block font-bold">{reward.gems}💎</span>
                        )}
                      </div>

                      {/* Check mark for past days */}
                      {isPast && (
                        <div
                          className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #55EFC4, #74B9FF)", width: 18, height: 18 }}
                        >
                          <span className="text-[8px] text-[#0c0a18] font-bold">✓</span>
                        </div>
                      )}

                      {/* Today indicator */}
                      {isToday && claimed && (
                        <div
                          className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #55EFC4, #74B9FF)", width: 18, height: 18 }}
                        >
                          <span className="text-[8px] text-[#0c0a18] font-bold">✓</span>
                        </div>
                      )}

                      {/* Milestone crown for unclaimed future milestones */}
                      {isMilestone && !isPast && !isToday && (
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px]">👑</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Milestone reward cards */}
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(MILESTONE_REWARDS).map(([day, info]) => {
              const dayNum = Number(day);
              const reached = currentDay >= dayNum;
              return (
                <div key={day} className="rounded-xl p-2 text-center" style={{
                  background: reached
                    ? `linear-gradient(135deg, ${info.color}12, ${info.color}06)`
                    : "rgba(22,18,36,0.3)",
                  border: reached
                    ? `1px solid ${info.color}25`
                    : "1px solid rgba(255,255,255,0.03)",
                  opacity: reached ? 1 : 0.5,
                }}>
                  <span className={`text-sm ${reached ? "" : "grayscale opacity-60"}`}>{info.icon}</span>
                  <div className="text-[8px] font-bold mt-0.5" style={{ color: reached ? info.color : "rgba(255,255,255,0.3)" }}>
                    {info.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Day 28 special reward banner */}
          <div
            className="rounded-xl p-3 text-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(255,234,167,0.08), rgba(255,159,243,0.04))",
              border: "1px solid rgba(255,234,167,0.15)",
            }}
          >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 animate-gold-shimmer" style={{
              background: "linear-gradient(105deg, transparent 40%, rgba(255,234,167,0.06) 50%, transparent 60%)",
              backgroundSize: "200% 100%",
            }} />
            <div className="relative">
              <div className="text-lg mb-1">🏆</div>
              <div className="text-[10px] font-bold mb-1" style={{
                background: "linear-gradient(90deg, #FFEAA7, #FF9FF3)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                28일 개근 보상
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-[9px] text-[#FFEAA7] font-bold bg-[#FFEAA7]/[0.08] rounded-full px-2 py-0.5">1,500G</span>
                <span className="text-[9px] text-[#C8B6FF] font-bold bg-[#C8B6FF]/[0.08] rounded-full px-2 py-0.5">15💎</span>
                <span className="text-[9px] text-[#FF9FF3] font-bold bg-[#FF9FF3]/[0.08] rounded-full px-2 py-0.5">🥚 전설의 알</span>
              </div>
            </div>
          </div>

          {/* Today's reward preview + Claim button */}
          {claimed || justClaimed ? (
            <div className="text-center py-1">
              <div
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full"
                style={{
                  background: "linear-gradient(135deg, rgba(85,239,196,0.1), rgba(162,155,254,0.05))",
                  border: "1px solid rgba(85,239,196,0.15)",
                  animation: justClaimed ? "celebrate-pop 0.5s ease-out" : undefined,
                }}
              >
                <span className="text-base">{justClaimed ? "🎉" : "✨"}</span>
                <div>
                  <span className="text-[#55EFC4] text-xs font-bold block">
                    {justClaimed ? "보상 획득!" : "오늘 출석 완료!"}
                  </span>
                  <span className="text-white/30 text-[9px]">
                    {justClaimed && todayReward ? (
                      <>
                        {todayReward.gold > 0 && `${todayReward.gold}G `}
                        {todayReward.gems > 0 && `${todayReward.gems}💎 `}
                        획득
                      </>
                    ) : "내일 다시 접속하세요"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Today's reward preview */}
              {todayReward && (
                <div className="flex items-center justify-center gap-2 text-[10px]">
                  <span className="text-white/30">오늘 보상:</span>
                  {todayReward.gold > 0 && (
                    <span className="text-[#FFEAA7] font-bold">{todayReward.gold}G</span>
                  )}
                  {todayReward.gems > 0 && (
                    <span className="text-[#C8B6FF] font-bold">{todayReward.gems}💎</span>
                  )}
                </div>
              )}
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="btn-primary w-full py-3 text-sm font-bold animate-heartbeat active:scale-95 transition-transform disabled:opacity-50 disabled:animate-none"
              >
                {claiming ? "수령 중..." : `📅 Day ${currentDay} 보상 수령`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Celebration keyframes */}
      <style jsx>{`
        @keyframes celebrate-pop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes modal-pop-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
