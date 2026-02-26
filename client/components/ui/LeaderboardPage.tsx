"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi } from "@/lib/api/client";
import PageLayout from "./PageLayout";

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
}

type LBType = "collection" | "level" | "race" | "gold";

const TABS: { id: LBType; label: string; icon: string; unit: string; color: string }[] = [
  { id: "collection", label: "수집", icon: "📚", unit: "점", color: "#A29BFE" },
  { id: "level", label: "레벨", icon: "⭐", unit: "Lv", color: "#FFEAA7" },
  { id: "race", label: "레이스", icon: "🏃", unit: "점", color: "#55EFC4" },
  { id: "gold", label: "부자", icon: "💰", unit: "G", color: "#FF9FF3" },
];

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_COLORS = ["#D4AF37", "#A8A8A8", "#CD7F32"];
const MEDAL_BG = [
  "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(201,168,76,0.06))",
  "linear-gradient(135deg, rgba(168,168,168,0.12), rgba(168,168,168,0.04))",
  "linear-gradient(135deg, rgba(205,127,50,0.12), rgba(205,127,50,0.04))",
];

export default function LeaderboardPage() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<LBType>("collection");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [lbRes, rankRes] = await Promise.all([
        authApi<{ entries: LeaderboardEntry[] }>(`/api/leaderboard?type=${activeTab}`, token),
        authApi<{ rank: number }>("/api/leaderboard/my-rank", token),
      ]);
      setEntries(lbRes.entries || []);
      setMyRank(rankRes.rank || 0);
    } catch {
      setEntries([]);
    }
    setLoading(false);
  }, [token, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tabInfo = TABS.find((t) => t.id === activeTab)!;
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const maxScore = entries.length > 0 ? entries[0].score : 1;

  return (
    <PageLayout title="리더보드" icon="/assets/icons/collect.png">
      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, #3D2017, #4A2515, #2C1810)",
        border: "2px solid #C9A84C",
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 16,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(201,168,76,0.2)",
      }}>
        {/* Decorative gold lines */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, #C9A84C, #D4AF37, #C9A84C, transparent)",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, #8B6914, #C9A84C, #8B6914, transparent)",
        }} />
        <div style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 18,
          fontWeight: "bold",
          color: "#C9A84C",
          letterSpacing: 4,
          textShadow: "0 1px 4px rgba(0,0,0,0.5), 0 0 12px rgba(201,168,76,0.2)",
        }}>
          HALL OF FAME
        </div>
        <div style={{
          fontSize: 10,
          color: "#8B6914",
          fontFamily: "Georgia, 'Times New Roman', serif",
          marginTop: 2,
          letterSpacing: 2,
        }}>
          명예의 전당
        </div>
      </div>

      {/* Tab bar — book chapter tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar pb-0.5">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1 px-3 py-2 text-[11px] font-bold whitespace-nowrap transition shrink-0"
              style={{
                background: isActive
                  ? "linear-gradient(180deg, #4A2515, #3D2017)"
                  : "linear-gradient(180deg, #2C1810, #1A0E08)",
                color: isActive ? "#C9A84C" : "#6B3A2A",
                border: isActive ? "1px solid #C9A84C" : "1px solid #3D2017",
                borderBottom: isActive ? "2px solid #C9A84C" : "2px solid transparent",
                borderRadius: "10px 10px 4px 4px",
                boxShadow: isActive
                  ? "0 2px 8px rgba(201,168,76,0.15), inset 0 1px 0 rgba(201,168,76,0.15)"
                  : "none",
                fontFamily: "Georgia, 'Times New Roman', serif",
              }}>
              <span className="text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Gold divider line */}
      <div style={{
        height: 1,
        background: "linear-gradient(90deg, transparent, #8B6914, #C9A84C, #8B6914, transparent)",
        marginBottom: 14,
        marginTop: -4,
      }} />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3" style={{
              background: "rgba(44,24,16,0.6)",
              borderRadius: 12,
              border: "1px solid #3D2017",
            }}>
              <div className="w-8 h-8 skeleton rounded-full" style={{ background: "#3D2017" }} />
              <div className="flex-1 space-y-1.5">
                <div className="w-24 h-3 skeleton" style={{ background: "#3D2017", borderRadius: 4 }} />
                <div className="w-16 h-2 skeleton" style={{ background: "#3D2017", borderRadius: 4 }} />
              </div>
              <div className="w-12 h-4 skeleton" style={{ background: "#3D2017", borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state py-12" style={{
          background: "linear-gradient(180deg, rgba(44,24,16,0.4), rgba(26,14,8,0.6))",
          borderRadius: 14,
          border: "1px solid #3D2017",
        }}>
          <span className="empty-state-icon text-3xl">{"📊"}</span>
          <span className="empty-state-text" style={{ color: "#8B6914", fontFamily: "Georgia, 'Times New Roman', serif" }}>아직 기록이 없습니다</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* === Top 3 Podium === */}
          {top3.length >= 3 && (
            <div className="relative p-4 pt-5 pb-3" style={{
              background: "linear-gradient(180deg, rgba(74,37,21,0.5), rgba(44,24,16,0.7))",
              border: "1px solid #C9A84C40",
              borderRadius: 16,
              boxShadow: "inset 0 1px 0 rgba(201,168,76,0.1), 0 4px 16px rgba(0,0,0,0.3)",
            }}>
              {/* Top gold trim */}
              <div style={{
                position: "absolute", top: 0, left: 16, right: 16, height: 1,
                background: "linear-gradient(90deg, transparent, #C9A84C60, transparent)",
              }} />
              <div className="flex items-end justify-center gap-3">
                {/* 2nd place */}
                <PodiumSlot entry={top3[1]} rank={2} user={user} tabColor={tabInfo.color} unit={tabInfo.unit} />
                {/* 1st place (taller) */}
                <PodiumSlot entry={top3[0]} rank={1} user={user} tabColor={tabInfo.color} unit={tabInfo.unit} />
                {/* 3rd place */}
                <PodiumSlot entry={top3[2]} rank={3} user={user} tabColor={tabInfo.color} unit={tabInfo.unit} />
              </div>
            </div>
          )}

          {/* Gold section divider */}
          <div style={{
            height: 1,
            background: "linear-gradient(90deg, transparent, #8B691480, #C9A84C60, #8B691480, transparent)",
          }} />

          {/* === My Rank Card === */}
          {myRank > 0 && (
            <div className="flex items-center gap-3" style={{
              background: "linear-gradient(135deg, #3D2017, #4A2515)",
              border: "1.5px solid #C9A84C",
              borderRadius: 12,
              padding: "10px 12px",
              boxShadow: "0 2px 12px rgba(201,168,76,0.12), inset 0 1px 0 rgba(201,168,76,0.15)",
            }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                background: "linear-gradient(135deg, #C9A84C, #D4AF37)",
                boxShadow: "0 0 8px rgba(201,168,76,0.3)",
              }}>
                <span className="text-[10px] font-bold" style={{ color: "#1A0E08" }}>{user?.nickname?.[0] || "?"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate" style={{ color: "#F5E6C8" }}>
                  {user?.nickname || "나"} <span className="text-[9px]" style={{ color: "#8B6914" }}>(나)</span>
                </div>
                <div className="text-[9px]" style={{ color: "#8B6914" }}>전체 {myRank}위</div>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold tabular-nums" style={{
                  color: "#C9A84C",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  textShadow: "0 0 8px rgba(201,168,76,0.3)",
                }}>#{myRank}</span>
              </div>
            </div>
          )}

          {/* === Rank List (4th+) === */}
          {rest.length > 0 && (
            <div className="space-y-1.5">
              {rest.map((entry, idx) => {
                const isMe = user?.nickname === entry.nickname;
                const barWidth = maxScore > 0 ? Math.max(5, (entry.score / maxScore) * 100) : 5;
                return (
                  <div key={idx} className="flex items-center gap-2.5 px-3 py-2.5 transition-all"
                    style={{
                      animation: `stagger-slide-in 0.3s ease-out ${idx * 40}ms both`,
                      background: isMe
                        ? "linear-gradient(135deg, rgba(74,37,21,0.7), rgba(61,32,23,0.5))"
                        : "linear-gradient(135deg, rgba(44,24,16,0.5), rgba(26,14,8,0.4))",
                      border: isMe ? "1px solid #C9A84C80" : "1px solid #3D201740",
                      borderRadius: 12,
                      boxShadow: isMe ? "0 0 8px rgba(201,168,76,0.08)" : "none",
                    }}>
                    {/* Rank */}
                    <span className="w-7 text-center text-[11px] font-bold tabular-nums shrink-0" style={{
                      color: isMe ? "#C9A84C" : "#6B3A2A",
                      fontFamily: "Georgia, 'Times New Roman', serif",
                    }}>
                      {entry.rank}
                    </span>

                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{
                      background: isMe
                        ? "linear-gradient(135deg, #C9A84C, #D4AF37)"
                        : "rgba(61,32,23,0.8)",
                      color: isMe ? "#1A0E08" : "#8B6914",
                      border: isMe ? "1px solid #D4AF37" : "1px solid #3D201780",
                    }}>
                      {entry.nickname[0]}
                    </div>

                    {/* Name + Score bar */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] font-bold truncate`} style={{
                        color: isMe ? "#C9A84C" : "#E8D5B0",
                      }}>
                        {entry.nickname}
                        {isMe && <span className="text-[8px] ml-1" style={{ color: "#8B6914" }}>(나)</span>}
                      </div>
                      {/* Score bar */}
                      <div className="h-1 rounded-full mt-1 overflow-hidden" style={{
                        background: "rgba(61,32,23,0.5)",
                      }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{
                          width: `${barWidth}%`,
                          background: isMe
                            ? "linear-gradient(90deg, #C9A84C, #D4AF37)"
                            : "linear-gradient(90deg, #8B691480, #8B691430)",
                        }} />
                      </div>
                    </div>

                    {/* Score */}
                    <div className="shrink-0 text-right">
                      <span className={`text-[12px] font-extrabold tabular-nums`} style={{
                        color: isMe ? "#C9A84C" : "#DCC9A3",
                      }}>
                        {entry.score.toLocaleString()}
                      </span>
                      <span className="text-[8px] ml-0.5" style={{ color: "#6B3A2A" }}>{tabInfo.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Total participants */}
          <div className="text-center text-[9px] pt-1" style={{
            color: "#6B3A2A",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}>
            상위 {entries.length}명 표시
          </div>
        </div>
      )}
    </PageLayout>
  );
}

// ===== Podium Slot =====

function PodiumSlot({ entry, rank, user, tabColor, unit }: {
  entry: LeaderboardEntry; rank: 1 | 2 | 3;
  user: { nickname?: string } | null; tabColor: string; unit: string;
}) {
  const isMe = user?.nickname === entry.nickname;
  const idx = rank - 1;
  const height = rank === 1 ? "h-20" : rank === 2 ? "h-14" : "h-10";

  // Gold / Silver / Bronze parchment colors
  const podiumBorder = ["#D4AF37", "#A8A8A8", "#CD7F32"][idx];
  const podiumTextColor = ["#D4AF37", "#C0C0C0", "#CD7F32"][idx];

  return (
    <div className="flex flex-col items-center" style={{ width: rank === 1 ? 90 : 72 }}>
      {/* Medal */}
      <span className={`${rank === 1 ? "text-2xl" : "text-xl"} mb-1`}>{MEDAL[idx]}</span>

      {/* Avatar */}
      <div className={`${rank === 1 ? "w-12 h-12" : "w-9 h-9"} rounded-full flex items-center justify-center mb-1.5 font-bold`}
        style={{
          background: isMe
            ? "linear-gradient(135deg, #C9A84C, #D4AF37)"
            : `linear-gradient(135deg, ${podiumBorder}30, ${podiumBorder}10)`,
          border: `2px solid ${podiumBorder}80`,
          boxShadow: `0 0 12px ${podiumBorder}25`,
          color: isMe ? "#1A0E08" : podiumTextColor,
          fontSize: rank === 1 ? 14 : 11,
        }}>
        {entry.nickname[0]}
      </div>

      {/* Name */}
      <div className={`text-[10px] font-bold truncate w-full text-center`} style={{
        color: isMe ? "#C9A84C" : "#F5E6C8",
      }}>
        {entry.nickname}
      </div>

      {/* Score */}
      <div className="text-[9px] font-bold tabular-nums mt-0.5" style={{ color: podiumTextColor }}>
        {entry.score.toLocaleString()}{unit}
      </div>

      {/* Podium block — parchment style */}
      <div className={`w-full ${height} mt-1.5`} style={{
        background: MEDAL_BG[idx],
        border: `1px solid ${podiumBorder}25`,
        borderBottom: "none",
        borderRadius: "8px 8px 0 0",
        boxShadow: `inset 0 1px 0 ${podiumBorder}15`,
      }}>
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-lg font-extrabold" style={{
            color: `${podiumBorder}40`,
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}>
            {rank}
          </span>
        </div>
      </div>
    </div>
  );
}
