"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore, MailItem } from "@/lib/store/gameStore";

type MailFilter = "all" | "announcement" | "unread" | "rewards";

const typeIcons: Record<string, string> = {
  announcement: "📢",
  reward: "🎁",
  system: "⚙️",
};

const typeColors: Record<string, string> = {
  announcement: "#74B9FF",
  reward: "#FFEAA7",
  system: "#C9A84C",
};

function getRelativeTime(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

export default function MailboxModal() {
  const token = useAuthStore((s) => s.accessToken);
  const {
    mails,
    unreadMailCount,
    fetchMailbox,
    readMail,
    claimMail,
    setShowMailbox,
  } = useGameStore();

  const [filter, setFilter] = useState<MailFilter>("all");
  const [claimingAll, setClaimingAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (token) fetchMailbox(token);
  }, [token, fetchMailbox]);

  // Filtered mails
  const announcementCount = mails.filter((m) => m.mail_type === "announcement").length;
  const filtered = mails.filter((m) => {
    if (filter === "announcement") return m.mail_type === "announcement";
    if (filter === "unread") return !m.read;
    if (filter === "rewards") return (m.reward_gold > 0 || m.reward_gems > 0) && !m.claimed;
    return true;
  });

  // Claimable mails (has unclaimed rewards)
  const claimable = mails.filter((m) => (m.reward_gold > 0 || m.reward_gems > 0) && !m.claimed);
  const totalClaimGold = claimable.reduce((s, m) => s + m.reward_gold, 0);
  const totalClaimGems = claimable.reduce((s, m) => s + m.reward_gems, 0);
  const rewardCount = mails.filter((m) => (m.reward_gold > 0 || m.reward_gems > 0) && !m.claimed).length;

  const handleClaimAll = useCallback(async () => {
    if (!token || claimingAll || claimable.length === 0) return;
    setClaimingAll(true);
    for (const m of claimable) {
      await claimMail(token, m.id);
    }
    setClaimingAll(false);
  }, [token, claimingAll, claimable, claimMail]);

  const handleMailClick = (mail: MailItem) => {
    if (!mail.read && token) readMail(token, mail.id);
    setExpandedId(expandedId === mail.id ? null : mail.id);
  };

  const FILTERS: { id: MailFilter; label: string; count?: number }[] = [
    { id: "all", label: "전체" },
    { id: "announcement", label: "공지", count: announcementCount },
    { id: "unread", label: "읽지않음", count: unreadMailCount },
    { id: "rewards", label: "보상", count: rewardCount },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center modal-backdrop" onClick={() => setShowMailbox(false)}>
      <div
        className="modal-panel w-[360px] max-w-[94%] max-h-[82vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "mailbox-pop-in 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{
          background: "linear-gradient(180deg, #4A2515 0%, #3D2017 50%, #2C1810 100%)",
          borderBottom: "3px solid #8B6914",
          borderRadius: "24px 24px 0 0",
        }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center relative"
              style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}
            >
              <span className="text-lg">📬</span>
              {unreadMailCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #FF6B6B, #E17055)", boxShadow: "0 1px 4px rgba(255,107,107,0.5)" }}>
                  {unreadMailCount > 9 ? "9+" : unreadMailCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-bold text-[15px]" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>우편함</h2>
              <span className="text-[9px] text-white/30">{mails.length}통</span>
            </div>
          </div>
          <button
            onClick={() => setShowMailbox(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] transition text-white/40 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>

        {/* Filter tabs + Claim All */}
        <div className="px-4 py-2.5 flex items-center justify-between" style={{
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition"
                style={{
                  background: filter === f.id ? "rgba(201,168,76,0.12)" : "transparent",
                  color: filter === f.id ? "#D4AF37" : "rgba(255,255,255,0.3)",
                  border: filter === f.id ? "1px solid rgba(201,168,76,0.2)" : "1px solid transparent",
                }}>
                {f.label}
                {f.count !== undefined && f.count > 0 && (
                  <span className="ml-1 text-[8px] opacity-60">{f.count}</span>
                )}
              </button>
            ))}
          </div>
          {claimable.length > 1 && (
            <button
              onClick={handleClaimAll}
              disabled={claimingAll}
              className="text-[8px] font-bold px-2.5 py-1 rounded-lg active:scale-95 transition disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(139,105,20,0.06))",
                color: "#D4AF37",
                border: "1px solid rgba(201,168,76,0.15)",
              }}
            >
              {claimingAll ? "수령중..." : `모두 수령 (${claimable.length})`}
            </button>
          )}
        </div>

        {/* Claim All reward preview */}
        {claimable.length > 1 && !claimingAll && (
          <div className="px-4 py-1.5 flex items-center justify-center gap-2" style={{
            background: "rgba(201,168,76,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
          }}>
            <span className="text-[9px] text-white/25">총 보상:</span>
            {totalClaimGold > 0 && (
              <span className="text-[9px] text-[#FFEAA7] font-bold flex items-center gap-0.5">
                <img src="/assets/icons/gold.png" alt="" className="w-3 h-3 pixel-art" />
                {totalClaimGold.toLocaleString()}
              </span>
            )}
            {totalClaimGems > 0 && (
              <span className="text-[9px] text-[#D4AF37] font-bold flex items-center gap-0.5">
                <img src="/assets/icons/gems.png" alt="" className="w-3 h-3 pixel-art" />
                {totalClaimGems}
              </span>
            )}
          </div>
        )}

        {/* Mail list */}
        <div className="flex-1 overflow-y-auto game-scroll p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="empty-state py-10">
              <span className="empty-state-icon text-4xl animate-float">
                {filter === "announcement" ? "📢" : filter === "unread" ? "✅" : filter === "rewards" ? "🎁" : "📭"}
              </span>
              <span className="empty-state-text text-xs mt-2">
                {filter === "announcement" ? "공지사항이 없습니다" : filter === "unread" ? "모든 우편을 읽었습니다" : filter === "rewards" ? "수령할 보상이 없습니다" : "새로운 우편이 없습니다"}
              </span>
              <span className="text-[10px] text-white/20 mt-0.5">
                {filter !== "all" ? (
                  <button onClick={() => setFilter("all")} className="text-[#D4AF37]/50 hover:text-[#D4AF37] transition">
                    전체 보기 →
                  </button>
                ) : "새 메시지를 기다리는 중..."}
              </span>
            </div>
          ) : (
            filtered.map((mail, idx) => {
              const icon = typeIcons[mail.mail_type] || "📨";
              const typeColor = typeColors[mail.mail_type] || "#74B9FF";
              const hasReward = mail.reward_gold > 0 || mail.reward_gems > 0;
              const isExpanded = expandedId === mail.id;

              return (
                <div
                  key={mail.id}
                  className="rounded-2xl transition-all cursor-pointer"
                  style={{
                    background: mail.read
                      ? "rgba(22,18,36,0.5)"
                      : `linear-gradient(135deg, ${typeColor}08, ${typeColor}03)`,
                    border: mail.read
                      ? "1px solid rgba(255,255,255,0.04)"
                      : `1px solid ${typeColor}18`,
                    boxShadow: !mail.read ? `inset 0 0 12px ${typeColor}06, 0 0 8px ${typeColor}05` : undefined,
                    animation: `stagger-slide-in 0.3s ease-out ${idx * 40}ms both`,
                  }}
                  onClick={() => handleMailClick(mail)}
                >
                  <div className="p-3.5">
                    <div className="flex items-start gap-3">
                      {/* Mail icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                        style={{
                          background: !mail.read
                            ? `linear-gradient(135deg, ${typeColor}18, ${typeColor}08)`
                            : "rgba(255,255,255,0.03)",
                          border: `1px solid ${!mail.read ? `${typeColor}15` : "rgba(255,255,255,0.03)"}`,
                        }}
                      >
                        <span className={`text-lg ${mail.read ? "opacity-50 grayscale" : ""}`}>{icon}</span>
                        {mail.claimed && (
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
                            <h3 className={`text-xs font-bold truncate ${mail.read ? "text-white/40" : "text-white"}`}>
                              {mail.title}
                            </h3>
                            {!mail.read && (
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
                                style={{ background: typeColor, boxShadow: `0 0 6px ${typeColor}80` }} />
                            )}
                          </div>
                          {/* Time */}
                          <span className="text-[8px] text-white/20 flex-shrink-0 ml-2 tabular-nums">
                            {getRelativeTime(mail.created_at)}
                          </span>
                        </div>

                        {/* Body preview (or full if expanded) */}
                        {mail.body && (
                          <p className={`text-white/35 text-[10px] mb-1.5 ${isExpanded ? "" : "line-clamp-1"}`}>
                            {mail.body}
                          </p>
                        )}

                        {/* Rewards + claim */}
                        {hasReward && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {mail.reward_gold > 0 && (
                                <span className="text-[9px] text-[#FFEAA7] font-bold flex items-center gap-0.5 bg-[#FFEAA7]/[0.08] rounded-full px-2 py-0.5">
                                  <img src="/assets/icons/gold.png" alt="" className="w-3 h-3 pixel-art" />
                                  +{mail.reward_gold.toLocaleString()}
                                </span>
                              )}
                              {mail.reward_gems > 0 && (
                                <span className="text-[9px] text-[#D4AF37] font-bold flex items-center gap-0.5 bg-[#D4AF37]/[0.08] rounded-full px-2 py-0.5">
                                  <img src="/assets/icons/gems.png" alt="" className="w-3 h-3 pixel-art" />
                                  +{mail.reward_gems}
                                </span>
                              )}
                            </div>
                            {mail.claimed ? (
                              <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#55EFC4]/[0.06] text-[#55EFC4]/40 font-medium">
                                수령완료
                              </span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (token) claimMail(token, mail.id);
                                }}
                                className="text-[9px] font-bold px-3 py-1 rounded-full active:scale-90 transition-transform animate-heartbeat"
                                style={{
                                  background: "linear-gradient(135deg, #C9A84C, #8B6914)",
                                  color: "#1A0E08",
                                  boxShadow: "0 2px 8px rgba(201,168,76,0.3)",
                                }}
                              >
                                수령
                              </button>
                            )}
                          </div>
                        )}

                        {/* Expiry warning */}
                        {mail.expires_at && !mail.claimed && (() => {
                          const daysLeft = Math.ceil((new Date(mail.expires_at).getTime() - Date.now()) / 86400000);
                          if (daysLeft <= 3 && daysLeft > 0) {
                            return (
                              <div className="mt-1.5 text-[8px] text-[#FF6B6B]/60 font-medium animate-pulse">
                                ⚠️ {daysLeft}일 후 만료
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes mailbox-pop-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
