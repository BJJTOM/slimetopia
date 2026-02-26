"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore, type Achievement } from "@/lib/store/gameStore";
import PageLayout from "./PageLayout";

// ===== Achievement Categories & Rarity =====

interface AchCategory {
  id: string;
  label: string;
  icon: string;
  keys: string[];
}

const CATEGORIES: AchCategory[] = [
  { id: "all", label: "전체", icon: "🏆", keys: [] },
  { id: "growth", label: "성장", icon: "🎯", keys: ["first_slime", "max_level", "attendance_28"] },
  { id: "collect", label: "수집", icon: "📚", keys: ["collector_10", "collector_30", "mythic_owner"] },
  { id: "activity", label: "활동", icon: "⚔️", keys: ["merge_master", "race_champion", "fishing_pro", "explorer"] },
  { id: "social", label: "소셜", icon: "🌟", keys: ["social_butterfly", "rich"] },
];

type Rarity = "bronze" | "silver" | "gold" | "platinum";

const RARITY_INFO: Record<Rarity, { label: string; color: string; glow: string; bg: string }> = {
  bronze: { label: "브론즈", color: "#CD7F32", glow: "rgba(205,127,50,0.3)", bg: "rgba(205,127,50,0.1)" },
  silver: { label: "실버", color: "#C0C0C0", glow: "rgba(192,192,192,0.3)", bg: "rgba(192,192,192,0.1)" },
  gold: { label: "골드", color: "#D4AF37", glow: "rgba(212,175,55,0.35)", bg: "rgba(212,175,55,0.1)" },
  platinum: { label: "플래티넘", color: "#C9A84C", glow: "rgba(201,168,76,0.4)", bg: "rgba(201,168,76,0.12)" },
};

function getRarity(ach: Achievement): Rarity {
  const gems = ach.reward_gems;
  if (gems >= 9) return "platinum";
  if (gems >= 4) return "gold";
  if (gems >= 1) return "silver";
  return "bronze";
}

// ===== Progress Calculation =====

function getProgress(key: string, slimeCount: number, collectionCount: number, maxLevel: number, gold: number): { current: number; target: number } | null {
  switch (key) {
    case "first_slime": return { current: Math.min(slimeCount, 1), target: 1 };
    case "collector_10": return { current: Math.min(collectionCount, 10), target: 10 };
    case "collector_30": return { current: Math.min(collectionCount, 30), target: 30 };
    case "max_level": return { current: Math.min(maxLevel, 30), target: 30 };
    case "rich": return { current: Math.min(gold, 10000), target: 10000 };
    default: return null;
  }
}

function formatRelativeTime(dateStr: string): string {
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

// ===== Book Theme Constants =====

const BOOK = {
  darkBg: "#1A0E08",
  leather: "#3D2017",
  leatherMid: "#2C1810",
  leatherDeep: "#4A2515",
  parchment: "#F5E6C8",
  parchmentMid: "#E8D5B0",
  parchmentDark: "#DCC9A3",
  gold: "#C9A84C",
  goldBright: "#D4AF37",
  goldDark: "#8B6914",
  textLight: "#F5E6C8",
  textGold: "#C9A84C",
  textDark: "#2C1810",
  textDarkSub: "#6B3A2A",
  serif: "Georgia, 'Times New Roman', serif",
};

// ===== Component =====

export default function AchievementPage() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const { achievements, fetchAchievements, slimes, collectionCount } = useGameStore();
  const [category, setCategory] = useState("all");
  const [detail, setDetail] = useState<Achievement | null>(null);

  useEffect(() => {
    if (token) fetchAchievements(token);
  }, [token, fetchAchievements]);

  const unlocked = achievements.filter((a) => a.unlocked);
  const pct = achievements.length > 0 ? Math.round((unlocked.length / achievements.length) * 100) : 0;

  // Stats for progress calculation
  const maxLevel = slimes.reduce((m, s) => Math.max(m, s.level), 0);
  const gold = user?.gold || 0;

  // Rarity distribution
  const rarityCount = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  unlocked.forEach((a) => { rarityCount[getRarity(a)]++; });

  // Filter
  const filtered = category === "all"
    ? achievements
    : achievements.filter((a) => CATEGORIES.find((c) => c.id === category)?.keys.includes(a.key));

  const filteredUnlocked = filtered.filter((a) => a.unlocked);
  const filteredLocked = filtered.filter((a) => !a.unlocked);

  return (
    <PageLayout
      title="업적"
      icon="/assets/icons/collect.png"
      badge={
        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold" style={{
          background: `linear-gradient(135deg, ${BOOK.goldDark}, ${BOOK.gold})`,
          color: BOOK.parchment,
          boxShadow: `0 2px 8px rgba(201,168,76,0.4), inset 0 1px 0 rgba(255,255,255,0.15)`,
          border: `1px solid ${BOOK.goldBright}`,
        }}>
          {unlocked.length}/{achievements.length}
        </span>
      }
    >
      <div className="space-y-4">
        {/* ===== HEADER: Leather banner with gold title ===== */}
        <div className="rounded-2xl p-4 relative overflow-hidden" style={{
          background: `linear-gradient(180deg, ${BOOK.leatherDeep}, ${BOOK.leather}, ${BOOK.leatherMid})`,
          border: `2px solid ${BOOK.gold}`,
          boxShadow: `0 4px 20px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.05), 0 0 15px rgba(201,168,76,0.15)`,
        }}>
          {/* Leather texture overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)",
          }} />

          {/* Title */}
          <div className="text-center mb-3 relative">
            <h2 className="text-lg font-bold tracking-[0.15em]" style={{
              fontFamily: BOOK.serif,
              color: BOOK.goldBright,
              textShadow: `0 0 10px rgba(212,175,55,0.4), 0 2px 4px rgba(0,0,0,0.5)`,
            }}>
              ACHIEVEMENTS
            </h2>
          </div>

          {/* Gold divider with diamond */}
          <div className="flex items-center gap-2 mb-3 relative">
            <div className="flex-1 h-[1px]" style={{
              background: `linear-gradient(90deg, transparent, ${BOOK.gold}, transparent)`,
            }} />
            <div className="w-2 h-2 rotate-45" style={{
              background: `linear-gradient(135deg, ${BOOK.goldBright}, ${BOOK.goldDark})`,
              boxShadow: `0 0 6px rgba(212,175,55,0.5)`,
            }} />
            <div className="flex-1 h-[1px]" style={{
              background: `linear-gradient(90deg, transparent, ${BOOK.gold}, transparent)`,
            }} />
          </div>

          <div className="flex items-center justify-between mb-3 relative">
            <div>
              <div className="text-3xl font-extrabold" style={{
                fontFamily: BOOK.serif,
                color: BOOK.parchment,
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              }}>{pct}%</div>
              <div className="text-[10px]" style={{ color: `${BOOK.parchmentDark}88` }}>업적 달성률</div>
            </div>
            {/* Rarity breakdown */}
            <div className="flex items-center gap-1.5">
              {(["platinum", "gold", "silver", "bronze"] as Rarity[]).map((r) => (
                rarityCount[r] > 0 && (
                  <div key={r} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{
                    background: RARITY_INFO[r].bg, color: RARITY_INFO[r].color,
                    border: `1px solid ${RARITY_INFO[r].color}40`,
                  }}>
                    {rarityCount[r]}
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Progress bar with gold fill */}
          <div className="h-2.5 rounded-full overflow-hidden relative" style={{
            background: "rgba(0,0,0,0.3)",
            border: `1px solid ${BOOK.goldDark}60`,
          }}>
            <div className="h-full rounded-full transition-all duration-700" style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${BOOK.goldDark}, ${BOOK.goldBright}, ${BOOK.gold})`,
              boxShadow: `0 0 8px rgba(212,175,55,0.5)`,
            }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[9px] relative" style={{ color: `${BOOK.parchmentDark}66` }}>
            <span>{unlocked.length}개 달성</span>
            <span>{achievements.length - unlocked.length}개 남음</span>
          </div>
        </div>

        {/* ===== Category tabs: leather tab style ===== */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.id;
            const catAchs = cat.id === "all" ? achievements : achievements.filter((a) => cat.keys.includes(a.key));
            const catUnlocked = catAchs.filter((a) => a.unlocked).length;
            return (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition shrink-0"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${BOOK.leather}, ${BOOK.leatherDeep})`
                    : `rgba(26,14,8,0.4)`,
                  color: isActive ? BOOK.goldBright : `${BOOK.parchmentDark}66`,
                  border: isActive
                    ? `1px solid ${BOOK.gold}`
                    : `1px solid ${BOOK.leather}60`,
                  boxShadow: isActive ? `0 0 8px rgba(201,168,76,0.2)` : "none",
                }}>
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className="text-[8px]" style={{ color: isActive ? `${BOOK.gold}99` : `${BOOK.parchmentDark}44` }}>
                  {catUnlocked}/{catAchs.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* ===== Section Divider: Gold ornament ===== */}

        {/* Unlocked section */}
        {filteredUnlocked.length > 0 && (
          <div>
            {/* Section header with gold divider */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-[1px]" style={{
                background: `linear-gradient(90deg, ${BOOK.gold}60, transparent)`,
              }} />
              <h3 className="text-[11px] font-bold flex items-center gap-1.5" style={{
                fontFamily: BOOK.serif,
                color: BOOK.goldBright,
              }}>
                <span style={{ color: BOOK.goldBright }}>{"✦"}</span> 달성 완료
                <span className="text-[9px]" style={{ color: `${BOOK.gold}66` }}>({filteredUnlocked.length})</span>
              </h3>
              <div className="flex-1 h-[1px]" style={{
                background: `linear-gradient(90deg, transparent, ${BOOK.gold}60)`,
              }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filteredUnlocked.map((ach, idx) => (
                <AchCard key={ach.key} achievement={ach} idx={idx}
                  slimeCount={slimes.length} collectionCount={collectionCount} maxLevel={maxLevel} gold={gold}
                  onClick={() => setDetail(ach)} />
              ))}
            </div>
          </div>
        )}

        {/* Locked section */}
        {filteredLocked.length > 0 && (
          <div>
            {/* Section header with gold divider */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-[1px]" style={{
                background: `linear-gradient(90deg, ${BOOK.goldDark}40, transparent)`,
              }} />
              <h3 className="text-[11px] font-bold flex items-center gap-1.5" style={{
                fontFamily: BOOK.serif,
                color: `${BOOK.parchmentDark}88`,
              }}>
                <span style={{ color: `${BOOK.goldDark}88` }}>{"◇"}</span> 도전 중
                <span className="text-[9px]" style={{ color: `${BOOK.goldDark}55` }}>({filteredLocked.length})</span>
              </h3>
              <div className="flex-1 h-[1px]" style={{
                background: `linear-gradient(90deg, transparent, ${BOOK.goldDark}40)`,
              }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filteredLocked.map((ach, idx) => (
                <AchCard key={ach.key} achievement={ach} idx={idx}
                  slimeCount={slimes.length} collectionCount={collectionCount} maxLevel={maxLevel} gold={gold}
                  onClick={() => setDetail(ach)} />
              ))}
            </div>
          </div>
        )}

        {achievements.length === 0 && (
          <div className="empty-state"><span className="empty-state-icon">{"🏆"}</span><span className="empty-state-text">업적 정보를 불러오는 중...</span></div>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <AchDetailModal achievement={detail} onClose={() => setDetail(null)}
          slimeCount={slimes.length} collectionCount={collectionCount} maxLevel={maxLevel} gold={gold} />
      )}
    </PageLayout>
  );
}

// ===== Achievement Card =====

function AchCard({
  achievement: ach, idx, slimeCount, collectionCount, maxLevel, gold, onClick,
}: {
  achievement: Achievement; idx: number;
  slimeCount: number; collectionCount: number; maxLevel: number; gold: number;
  onClick: () => void;
}) {
  const unlocked = ach.unlocked;
  const rarity = getRarity(ach);
  const ri = RARITY_INFO[rarity];
  const progress = !unlocked ? getProgress(ach.key, slimeCount, collectionCount, maxLevel, gold) : null;
  const progressPct = progress ? Math.min(100, (progress.current / progress.target) * 100) : 0;

  return (
    <button onClick={onClick} className={`text-left w-full rounded-2xl p-3 transition-all active:scale-[0.97] relative overflow-hidden`} style={{
      background: unlocked
        ? `linear-gradient(135deg, ${BOOK.leatherDeep}, ${BOOK.leather}, ${BOOK.leatherMid})`
        : `linear-gradient(135deg, ${BOOK.darkBg}, ${BOOK.leatherMid}cc)`,
      border: unlocked
        ? `2px solid ${BOOK.goldBright}`
        : `1px solid ${BOOK.leather}88`,
      boxShadow: unlocked
        ? `0 0 20px rgba(212,175,55,0.2), 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`
        : "0 2px 8px rgba(0,0,0,0.2)",
      opacity: unlocked ? 1 : 0.75,
      animation: `stagger-slide-in 0.3s ease-out ${idx * 50}ms both`,
    }}>
      {/* Leather texture overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.02) 4px, rgba(0,0,0,0.02) 5px)",
      }} />

      {/* Unlocked gold shimmer overlay */}
      {unlocked && (
        <div className="absolute inset-0 animate-gold-shimmer pointer-events-none" style={{
          background: `linear-gradient(105deg, transparent 35%, rgba(212,175,55,0.08) 50%, transparent 65%)`,
          backgroundSize: "200% 100%",
        }} />
      )}

      {/* Gold wax seal stamp for completed achievements */}
      {unlocked && (
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center z-10" style={{
          background: `radial-gradient(circle at 35% 35%, ${BOOK.goldBright}, ${BOOK.goldDark})`,
          boxShadow: `0 2px 8px rgba(139,105,20,0.6), inset 0 -1px 3px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)`,
          border: `1.5px solid ${BOOK.goldDark}`,
        }}>
          <span className="text-[10px] font-black" style={{ color: BOOK.leatherMid, textShadow: "0 1px 0 rgba(255,255,255,0.2)" }}>{"✦"}</span>
        </div>
      )}

      <div className="flex flex-col items-center text-center gap-1.5 relative">
        {/* Icon + rarity badge */}
        <div className="relative">
          {/* Glow ring behind icon for unlocked */}
          {unlocked && (
            <div className="absolute inset-0 -m-2 rounded-full" style={{
              background: `radial-gradient(circle, rgba(212,175,55,0.2), transparent 70%)`,
              filter: "blur(4px)",
            }} />
          )}
          <span className={`text-2xl relative ${unlocked ? "" : "grayscale opacity-40"}`} style={{
            filter: unlocked ? `drop-shadow(0 0 8px rgba(212,175,55,0.6))` : "grayscale(1)",
          }}>
            {ach.icon}
          </span>
        </div>

        {/* Name */}
        <h4 className={`text-[11px] font-bold leading-tight`} style={{
          fontFamily: BOOK.serif,
          color: unlocked ? BOOK.parchment : `${BOOK.parchmentDark}66`,
        }}>
          {ach.name}
        </h4>

        {/* Rarity + achieved label */}
        <div className="flex items-center gap-1">
          <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold" style={{
            background: unlocked ? `${ri.color}20` : `${BOOK.leather}88`,
            color: unlocked ? ri.color : `${BOOK.parchmentDark}44`,
            border: unlocked ? `1px solid ${ri.color}30` : `1px solid ${BOOK.leather}`,
          }}>
            {ri.label}
          </span>
          {unlocked && (
            <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold" style={{
              background: `rgba(212,175,55,0.15)`,
              color: BOOK.goldBright,
              border: `1px solid ${BOOK.gold}40`,
            }}>
              달성!
            </span>
          )}
        </div>

        {/* Progress bar for locked achievements */}
        {!unlocked && progress && (
          <div className="w-full mt-0.5">
            <div className="h-1 rounded-full overflow-hidden" style={{
              background: "rgba(0,0,0,0.3)",
              border: `1px solid ${BOOK.goldDark}30`,
            }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${BOOK.goldDark}, ${BOOK.goldBright})`,
              }} />
            </div>
            <div className="text-[8px] mt-0.5 tabular-nums" style={{ color: `${BOOK.parchmentDark}55` }}>
              {progress.current.toLocaleString()}/{progress.target.toLocaleString()}
            </div>
          </div>
        )}

        {/* Rewards */}
        <div className="flex items-center gap-1.5">
          {ach.reward_gold > 0 && (
            <span className="text-[8px] font-bold rounded-full px-1.5 py-0.5" style={{
              color: BOOK.goldBright,
              background: `rgba(212,175,55,0.12)`,
              border: `1px solid ${BOOK.gold}30`,
            }}>
              {ach.reward_gold}G
            </span>
          )}
          {ach.reward_gems > 0 && (
            <span className="text-[8px] font-bold rounded-full px-1.5 py-0.5" style={{
              color: BOOK.parchment,
              background: `rgba(245,230,200,0.08)`,
              border: `1px solid ${BOOK.parchmentDark}30`,
            }}>
              {ach.reward_gems}{"💎"}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ===== Detail Modal =====

function AchDetailModal({
  achievement: ach, onClose, slimeCount, collectionCount, maxLevel, gold,
}: {
  achievement: Achievement; onClose: () => void;
  slimeCount: number; collectionCount: number; maxLevel: number; gold: number;
}) {
  const rarity = getRarity(ach);
  const ri = RARITY_INFO[rarity];
  const progress = !ach.unlocked ? getProgress(ach.key, slimeCount, collectionCount, maxLevel, gold) : null;
  const progressPct = progress ? Math.min(100, (progress.current / progress.target) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[85%] max-w-xs rounded-2xl overflow-hidden relative" onClick={(e) => e.stopPropagation()} style={{
        background: `linear-gradient(180deg, ${BOOK.leatherDeep}, ${BOOK.leather}, ${BOOK.leatherMid})`,
        border: ach.unlocked ? `2px solid ${BOOK.goldBright}` : `2px solid ${BOOK.leather}`,
        boxShadow: ach.unlocked
          ? `0 0 50px rgba(212,175,55,0.2), 0 0 100px rgba(212,175,55,0.1), 0 8px 30px rgba(0,0,0,0.6)`
          : "0 8px 30px rgba(0,0,0,0.6)",
      }}>
        {/* Leather texture overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.02) 3px, rgba(0,0,0,0.02) 4px)",
        }} />

        {/* Inner gold border line */}
        <div className="absolute inset-[6px] pointer-events-none rounded-xl" style={{
          border: `1px solid ${BOOK.gold}30`,
        }} />

        {/* Header glow */}
        <div className="relative pt-8 pb-6 text-center" style={{
          background: ach.unlocked
            ? `radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.12), transparent 70%)`
            : "radial-gradient(ellipse at 50% 30%, rgba(245,230,200,0.03), transparent 70%)",
        }}>
          {/* Shimmer overlay for unlocked */}
          {ach.unlocked && (
            <div className="absolute inset-0 animate-gold-shimmer pointer-events-none" style={{
              background: `linear-gradient(105deg, transparent 35%, rgba(212,175,55,0.06) 50%, transparent 65%)`,
              backgroundSize: "200% 100%",
            }} />
          )}

          {/* Rarity badge */}
          <div className="absolute top-3 right-3">
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{
              background: `${ri.color}18`, color: ri.color, border: `1px solid ${ri.color}30`,
            }}>
              {ri.label}
            </span>
          </div>

          {/* Gold wax seal stamp for unlocked */}
          {ach.unlocked && (
            <div className="absolute top-3 left-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                background: `radial-gradient(circle at 35% 35%, ${BOOK.goldBright}, ${BOOK.goldDark})`,
                boxShadow: `0 2px 10px rgba(139,105,20,0.6), inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.3)`,
                border: `2px solid ${BOOK.goldDark}`,
              }}>
                <span className="text-sm font-black" style={{
                  color: BOOK.leatherMid,
                  textShadow: "0 1px 0 rgba(255,255,255,0.2)",
                  fontFamily: BOOK.serif,
                }}>{"✦"}</span>
              </div>
            </div>
          )}

          {/* Large icon */}
          <div className="relative inline-block mb-3">
            {/* Glow ring for unlocked */}
            {ach.unlocked && (
              <div className="absolute inset-0 -m-4 rounded-full animate-pulse" style={{
                background: `radial-gradient(circle, rgba(212,175,55,0.15), transparent 60%)`,
              }} />
            )}
            <span className={`text-5xl relative ${ach.unlocked ? "" : "grayscale opacity-50"}`} style={{
              filter: ach.unlocked ? `drop-shadow(0 0 20px rgba(212,175,55,0.7))` : "grayscale(1)",
            }}>
              {ach.icon}
            </span>
          </div>

          <h3 className="font-bold text-base" style={{
            fontFamily: BOOK.serif,
            color: BOOK.parchment,
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
          }}>{ach.name}</h3>
          <p className="text-[11px] mt-1 px-6 leading-relaxed" style={{
            color: `${BOOK.parchmentDark}88`,
          }}>{ach.description}</p>
        </div>

        {/* Gold divider between header and content */}
        <div className="flex items-center gap-2 px-5">
          <div className="flex-1 h-[1px]" style={{
            background: `linear-gradient(90deg, transparent, ${BOOK.gold}60, transparent)`,
          }} />
          <div className="w-1.5 h-1.5 rotate-45" style={{
            background: BOOK.goldBright,
            boxShadow: `0 0 4px rgba(212,175,55,0.5)`,
          }} />
          <div className="flex-1 h-[1px]" style={{
            background: `linear-gradient(90deg, transparent, ${BOOK.gold}60, transparent)`,
          }} />
        </div>

        <div className="px-5 pb-5 pt-4 space-y-4 relative">
          {/* Progress (locked only) */}
          {!ach.unlocked && progress && (
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span style={{ color: `${BOOK.parchmentDark}66` }}>진행도</span>
                <span className="font-bold tabular-nums" style={{ color: BOOK.parchment }}>
                  {progress.current.toLocaleString()} / {progress.target.toLocaleString()}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{
                background: "rgba(0,0,0,0.3)",
                border: `1px solid ${BOOK.goldDark}40`,
              }}>
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${BOOK.goldDark}, ${BOOK.goldBright})`,
                  boxShadow: `0 0 6px rgba(212,175,55,0.4)`,
                }} />
              </div>
            </div>
          )}

          {/* Unlock date */}
          {ach.unlocked && ach.unlocked_at && (
            <div className="flex items-center justify-center gap-1.5 text-[10px]" style={{
              color: `${BOOK.parchmentDark}88`,
            }}>
              <span>{"🎉"}</span>
              <span>{formatRelativeTime(ach.unlocked_at)} 달성</span>
            </div>
          )}

          {/* Rewards */}
          <div className="flex items-center justify-center gap-3">
            {ach.reward_gold > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{
                background: `rgba(212,175,55,0.1)`,
                border: `1px solid ${BOOK.gold}30`,
              }}>
                <span className="text-sm font-bold" style={{ color: BOOK.goldBright }}>{ach.reward_gold}</span>
                <span className="text-[10px]" style={{ color: `${BOOK.gold}88` }}>Gold</span>
              </div>
            )}
            {ach.reward_gems > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{
                background: `rgba(245,230,200,0.06)`,
                border: `1px solid ${BOOK.parchmentDark}30`,
              }}>
                <span className="text-sm font-bold" style={{ color: BOOK.parchment }}>{ach.reward_gems}</span>
                <span className="text-[10px]" style={{ color: `${BOOK.parchmentDark}66` }}>{"💎"}</span>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="text-center">
            {ach.unlocked ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{
                background: `linear-gradient(135deg, rgba(212,175,55,0.15), rgba(139,105,20,0.08))`,
                border: `1px solid ${BOOK.gold}40`,
                boxShadow: `0 0 12px rgba(212,175,55,0.15)`,
              }}>
                <span className="text-[11px] font-bold" style={{
                  fontFamily: BOOK.serif,
                  color: BOOK.goldBright,
                }}>{"✨"} 달성 완료!</span>
              </div>
            ) : (
              <span className="text-[11px] font-bold" style={{
                fontFamily: BOOK.serif,
                color: `${BOOK.parchmentDark}55`,
              }}>{"🔒"} 미달성</span>
            )}
          </div>

          {/* Close */}
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-[12px] font-bold transition" style={{
            fontFamily: BOOK.serif,
            color: BOOK.parchment,
            background: `linear-gradient(135deg, ${BOOK.leatherMid}, ${BOOK.darkBg})`,
            border: `1px solid ${BOOK.gold}40`,
          }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
