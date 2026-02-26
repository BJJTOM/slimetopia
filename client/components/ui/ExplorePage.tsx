"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import {
  useGameStore,
  type Exploration,
  type ExplorationDestination,
  type MaterialDropInfo,
} from "@/lib/store/gameStore";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { elementColors, elementNames, gradeColors, gradeNames } from "@/lib/constants";
import PageLayout from "./PageLayout";

// Static material definitions lookup (from shared/materials.json)
const materialInfo: Record<number, { name: string; icon: string; rarity: string }> = {
  1:  { name: "철광석",       icon: "⛏️",  rarity: "common" },
  2:  { name: "별의 조각",    icon: "⭐",   rarity: "rare" },
  3:  { name: "신선한 먹이",  icon: "🥬",   rarity: "common" },
  4:  { name: "네잎클로버",   icon: "🍀",   rarity: "rare" },
  5:  { name: "고대 화석",    icon: "🦴",   rarity: "common" },
  6:  { name: "심해의 진주",  icon: "🦪",   rarity: "rare" },
  7:  { name: "불꽃 열매",    icon: "🔥",   rarity: "uncommon" },
  8:  { name: "황금 가루",    icon: "✨",   rarity: "rare" },
  9:  { name: "방사능 젤리",  icon: "☢️",   rarity: "epic" },
  10: { name: "얼음 결정",    icon: "❄️",   rarity: "uncommon" },
  11: { name: "천둥석",       icon: "⚡",   rarity: "uncommon" },
  12: { name: "독 에센스",    icon: "🧪",   rarity: "uncommon" },
  13: { name: "대지의 핵",    icon: "🪨",   rarity: "uncommon" },
  14: { name: "바람의 깃털",  icon: "🪶",   rarity: "uncommon" },
  15: { name: "천체의 파편",  icon: "💫",   rarity: "rare" },
  16: { name: "어둠의 수정",  icon: "🔮",   rarity: "uncommon" },
  17: { name: "자연의 정수",  icon: "🌿",   rarity: "uncommon" },
  18: { name: "무지개 젤",    icon: "🌈",   rarity: "legendary" },
  19: { name: "현자의 돌",    icon: "💎",   rarity: "epic" },
  20: { name: "공허의 파편",  icon: "🕳️",   rarity: "legendary" },
};

const rarityColors: Record<string, string> = {
  common: "#B2BEC3",
  uncommon: "#55EFC4",
  rare: "#74B9FF",
  epic: "#A29BFE",
  legendary: "#FFEAA7",
  mythic: "#FF6B6B",
};

// Destination theme config with SVG art
interface DestTheme {
  emoji: string;
  gradient: string;
  bgGradient: string;
  iconColor: string;
  illustration: string; // inline SVG illustration
}

const destThemes: Record<number, DestTheme> = {
  1: {
    emoji: "🌿", gradient: "linear-gradient(135deg, #1a4a2a, #0d2d18)",
    bgGradient: "linear-gradient(180deg, rgba(85,239,196,0.08), transparent)",
    iconColor: "#55EFC4",
    illustration: `<svg viewBox="0 0 80 40" fill="none"><ellipse cx="40" cy="35" rx="35" ry="5" fill="rgba(85,239,196,0.1)"/><path d="M15 30c5-15 10-20 15-25s10 5 15 8c5 3 10-5 15-2s5 12 5 19" stroke="rgba(85,239,196,0.3)" fill="none" stroke-width="1.5"/><circle cx="25" cy="15" r="2" fill="rgba(85,239,196,0.4)"/><circle cx="50" cy="10" r="3" fill="rgba(85,239,196,0.25)"/><circle cx="60" cy="20" r="1.5" fill="rgba(85,239,196,0.35)"/></svg>`,
  },
  2: {
    emoji: "💧", gradient: "linear-gradient(135deg, #0d3a5a, #061e38)",
    bgGradient: "linear-gradient(180deg, rgba(116,185,255,0.08), transparent)",
    iconColor: "#74B9FF",
    illustration: `<svg viewBox="0 0 80 40" fill="none"><ellipse cx="40" cy="36" rx="30" ry="4" fill="rgba(116,185,255,0.1)"/><path d="M10 30 Q20 15 30 25 Q40 10 50 20 Q60 8 70 25" stroke="rgba(116,185,255,0.3)" fill="none" stroke-width="1.5"/><circle cx="20" cy="20" r="2" fill="rgba(116,185,255,0.3)"/><circle cx="55" cy="15" r="2.5" fill="rgba(116,185,255,0.2)"/></svg>`,
  },
  3: {
    emoji: "🌋", gradient: "linear-gradient(135deg, #5a1a0d, #3d0f06)",
    bgGradient: "linear-gradient(180deg, rgba(255,107,107,0.08), transparent)",
    iconColor: "#FF6B6B",
    illustration: `<svg viewBox="0 0 80 40" fill="none"><polygon points="25,35 40,5 55,35" fill="rgba(255,107,107,0.15)" stroke="rgba(255,107,107,0.3)" stroke-width="1"/><circle cx="40" cy="8" r="3" fill="rgba(255,159,67,0.3)"/><circle cx="35" cy="15" r="1.5" fill="rgba(255,107,107,0.4)"/><circle cx="45" cy="12" r="1" fill="rgba(255,159,67,0.5)"/></svg>`,
  },
  4: {
    emoji: "🧊", gradient: "linear-gradient(135deg, #0d4a5a, #063038)",
    bgGradient: "linear-gradient(180deg, rgba(129,236,236,0.08), transparent)",
    iconColor: "#81ECEC",
    illustration: `<svg viewBox="0 0 80 40" fill="none"><polygon points="20,35 30,10 40,35" fill="rgba(129,236,236,0.12)" stroke="rgba(129,236,236,0.25)" stroke-width="1"/><polygon points="40,35 50,15 60,35" fill="rgba(129,236,236,0.1)" stroke="rgba(129,236,236,0.2)" stroke-width="1"/><circle cx="35" cy="25" r="1" fill="rgba(129,236,236,0.4)"/></svg>`,
  },
  5: {
    emoji: "⚡", gradient: "linear-gradient(135deg, #4a4a0d, #2d2d06)",
    bgGradient: "linear-gradient(180deg, rgba(253,203,110,0.08), transparent)",
    iconColor: "#FDCB6E",
    illustration: `<svg viewBox="0 0 80 40" fill="none"><path d="M35 5 L30 18 L38 18 L32 35" stroke="rgba(253,203,110,0.4)" fill="rgba(253,203,110,0.1)" stroke-width="1.5"/><circle cx="50" cy="12" r="2" fill="rgba(253,203,110,0.3)"/></svg>`,
  },
  6: {
    emoji: "☠️", gradient: "linear-gradient(135deg, #3a1a4a, #200d2d)",
    bgGradient: "linear-gradient(180deg, rgba(108,92,231,0.08), transparent)",
    iconColor: "#6C5CE7",
    illustration: `<svg viewBox="0 0 80 40" fill="none"><circle cx="40" cy="20" r="15" fill="none" stroke="rgba(108,92,231,0.2)" stroke-width="1" stroke-dasharray="3 3"/><circle cx="40" cy="20" r="8" fill="rgba(108,92,231,0.08)"/><circle cx="35" cy="18" r="2" fill="rgba(108,92,231,0.3)"/><circle cx="45" cy="18" r="2" fill="rgba(108,92,231,0.3)"/></svg>`,
  },
  7: {
    emoji: "🏔️", gradient: "linear-gradient(135deg, #4a3020, #2d1a10)",
    bgGradient: "linear-gradient(180deg, rgba(225,112,85,0.08), transparent)",
    iconColor: "#E17055",
    illustration: `<svg viewBox="0 0 80 40" fill="none"><polygon points="15,35 35,8 55,35" fill="rgba(225,112,85,0.12)" stroke="rgba(225,112,85,0.25)" stroke-width="1"/><polygon points="35,35 50,15 65,35" fill="rgba(225,112,85,0.08)" stroke="rgba(225,112,85,0.2)" stroke-width="1"/></svg>`,
  },
  8: {
    emoji: "🌬️", gradient: "linear-gradient(135deg, #2a4a4a, #1a2d2d)",
    bgGradient: "linear-gradient(180deg, rgba(223,230,233,0.06), transparent)",
    iconColor: "#DFE6E9",
    illustration: `<svg viewBox="0 0 80 40" fill="none"><path d="M10 20 Q25 10 40 20 Q55 30 70 20" stroke="rgba(223,230,233,0.25)" fill="none" stroke-width="1.5"/><path d="M15 28 Q30 18 45 28 Q60 38 75 28" stroke="rgba(223,230,233,0.15)" fill="none" stroke-width="1"/></svg>`,
  },
  9: {
    emoji: "🔭", gradient: "linear-gradient(135deg, #4a1a3a, #2d0d20)",
    bgGradient: "linear-gradient(180deg, rgba(253,121,168,0.08), transparent)",
    iconColor: "#FD79A8",
    illustration: `<svg viewBox="0 0 80 40" fill="none"><circle cx="40" cy="18" r="10" fill="none" stroke="rgba(253,121,168,0.2)" stroke-width="1"/><circle cx="25" cy="10" r="1.5" fill="rgba(253,121,168,0.3)"/><circle cx="55" cy="8" r="1" fill="rgba(253,121,168,0.4)"/><circle cx="60" cy="25" r="2" fill="rgba(253,121,168,0.2)"/><circle cx="40" cy="18" r="3" fill="rgba(253,121,168,0.1)"/></svg>`,
  },
  10: {
    emoji: "🌟", gradient: "linear-gradient(135deg, #4a4a1a, #2d2d0d)",
    bgGradient: "linear-gradient(180deg, rgba(255,234,167,0.08), transparent)",
    iconColor: "#FFEAA7",
    illustration: `<svg viewBox="0 0 80 40" fill="none"><polygon points="40,5 43,15 53,15 45,22 48,32 40,26 32,32 35,22 27,15 37,15" fill="rgba(255,234,167,0.1)" stroke="rgba(255,234,167,0.25)" stroke-width="1"/><circle cx="20" cy="10" r="1.5" fill="rgba(255,234,167,0.3)"/><circle cx="65" cy="30" r="1" fill="rgba(255,234,167,0.4)"/></svg>`,
  },
  11: {
    emoji: "🌑", gradient: "linear-gradient(135deg, #2a1a4a, #150d2d)",
    bgGradient: "linear-gradient(180deg, rgba(162,155,254,0.08), transparent)",
    iconColor: "#A29BFE",
    illustration: `<svg viewBox="0 0 80 40" fill="none"><circle cx="40" cy="20" r="12" fill="rgba(162,155,254,0.06)" stroke="rgba(162,155,254,0.15)" stroke-width="1"/><path d="M28 20 Q34 8 40 20 Q46 32 52 20" stroke="rgba(162,155,254,0.2)" fill="none" stroke-width="1.5"/><circle cx="30" cy="12" r="1.5" fill="rgba(162,155,254,0.3)"/><circle cx="55" cy="28" r="1" fill="rgba(162,155,254,0.35)"/></svg>`,
  },
  12: {
    emoji: "🌊", gradient: "linear-gradient(135deg, #5a1a1a, #3d0606)",
    bgGradient: "linear-gradient(180deg, rgba(255,107,107,0.06), rgba(116,185,255,0.04), transparent)",
    iconColor: "#FF9F43",
    illustration: `<svg viewBox="0 0 80 40" fill="none"><polygon points="30,35 40,8 50,35" fill="rgba(255,159,67,0.12)" stroke="rgba(255,159,67,0.25)" stroke-width="1"/><path d="M10 32 Q25 22 40 32 Q55 42 70 32" stroke="rgba(116,185,255,0.2)" fill="none" stroke-width="1.5"/><circle cx="40" cy="12" r="2" fill="rgba(255,107,107,0.3)"/></svg>`,
  },
  13: {
    emoji: "🌀", gradient: "linear-gradient(135deg, #3a1a4a, #1a0d3d)",
    bgGradient: "linear-gradient(180deg, rgba(253,121,168,0.06), rgba(162,155,254,0.06), transparent)",
    iconColor: "#E056A0",
    illustration: `<svg viewBox="0 0 80 40" fill="none"><circle cx="40" cy="20" r="15" fill="none" stroke="rgba(224,86,160,0.15)" stroke-width="1"/><circle cx="40" cy="20" r="9" fill="none" stroke="rgba(162,155,254,0.15)" stroke-width="1"/><circle cx="40" cy="20" r="3" fill="rgba(224,86,160,0.15)"/><circle cx="20" cy="8" r="1" fill="rgba(253,121,168,0.3)"/><circle cx="60" cy="32" r="1.5" fill="rgba(162,155,254,0.3)"/><circle cx="55" cy="10" r="1" fill="rgba(253,121,168,0.2)"/></svg>`,
  },
};

const defaultTheme: DestTheme = {
  emoji: "🗺️", gradient: "linear-gradient(135deg, #2a2a3a, #1a1a2d)",
  bgGradient: "linear-gradient(180deg, rgba(162,155,254,0.08), transparent)",
  iconColor: "#A29BFE",
  illustration: `<svg viewBox="0 0 80 40" fill="none"><circle cx="40" cy="20" r="12" fill="rgba(162,155,254,0.1)" stroke="rgba(162,155,254,0.2)" stroke-width="1"/></svg>`,
};

interface ClaimResultData {
  gold: number;
  gems: number;
  exp: number;
  bonus: boolean;
  materials: { material_id: number; quantity: number; name: string; icon: string }[];
}

function formatTime(endsAt: string): string {
  const d = new Date(endsAt);
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  return `${h >= 12 ? "오후" : "오전"} ${h % 12 || 12}:${m}`;
}

export default function ExplorePage() {
  const token = useAuthStore((s) => s.accessToken);
  const {
    destinations, explorations, slimes, species, equippedAccessories,
    fetchDestinations, fetchExplorations, startExploration, claimExploration,
  } = useGameStore();

  const [selectedDest, setSelectedDest] = useState<ExplorationDestination | null>(null);
  const [selectedSlimeIds, setSelectedSlimeIds] = useState<string[]>([]);
  const [claimResult, setClaimResult] = useState<ClaimResultData | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (token) { fetchDestinations(token); fetchExplorations(token); }
  }, [token, fetchDestinations, fetchExplorations]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSlime = (id: string) => {
    setSelectedSlimeIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleStart = async () => {
    if (!token || !selectedDest || selectedSlimeIds.length === 0) return;
    try { await startExploration(token, selectedDest.id, selectedSlimeIds); setSelectedDest(null); setSelectedSlimeIds([]); } catch {}
  };

  const handleClaim = async (exp: Exploration) => {
    if (!token) return;
    const res = await claimExploration(token, exp.id);
    if (res) {
      setClaimResult({ gold: res.gold_reward, gems: res.gems_reward, exp: res.exp_gain, bonus: res.element_bonus, materials: res.material_drops || [] });
      useAuthStore.getState().fetchUser();
    }
  };

  const busySlimeIds = new Set(explorations.filter((e) => !e.claimed).flatMap((e) => e.slime_ids));
  const availableSlimes = slimes.filter((s) => !busySlimeIds.has(s.id));

  const activeExplorations = explorations.filter((e) => !e.claimed);
  const readyExplorations = activeExplorations.filter((e) => new Date(e.ends_at).getTime() <= Date.now());
  const inProgressExplorations = activeExplorations.filter((e) => new Date(e.ends_at).getTime() > Date.now());

  const sortedAvailableSlimes = useMemo(() => {
    if (!selectedDest) return availableSlimes;
    const recEl = selectedDest.recommended_element;
    return [...availableSlimes].sort((a, b) => {
      const diff = (b.element === recEl ? 1 : 0) - (a.element === recEl ? 1 : 0);
      return diff !== 0 ? diff : b.level - a.level;
    });
  }, [availableSlimes, selectedDest]);

  const autoRecommend = useCallback(() => {
    if (!selectedDest) return;
    const recEl = selectedDest.recommended_element;
    const sorted = [...availableSlimes].sort((a, b) => {
      const diff = (b.element === recEl ? 1 : 0) - (a.element === recEl ? 1 : 0);
      return diff !== 0 ? diff : b.level - a.level;
    });
    setSelectedSlimeIds(sorted.slice(0, 3).map((s) => s.id));
  }, [selectedDest, availableSlimes]);

  const handleClaimAll = useCallback(async () => {
    if (!token || claimingAll || readyExplorations.length === 0) return;
    setClaimingAll(true);
    for (const exp of readyExplorations) await claimExploration(token, exp.id);
    useAuthStore.getState().fetchUser();
    setClaimingAll(false);
  }, [token, claimingAll, readyExplorations, claimExploration]);

  const getTimeLeft = (endsAt: string) => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const min = Math.floor(diff / 60000), sec = Math.floor((diff % 60000) / 1000);
    if (min >= 60) return `${Math.floor(min / 60)}시간 ${min % 60}분`;
    return `${min}분 ${sec}초`;
  };

  const getProgress = (exp: Exploration) => {
    const s = new Date(exp.started_at).getTime(), e = new Date(exp.ends_at).getTime();
    return Math.min(100, Math.max(0, ((Date.now() - s) / (e - s)) * 100));
  };

  return (
    <PageLayout title="탐험" icon="/assets/icons/explore.png"
      badge={activeExplorations.length > 0 ? (
        <div className="flex items-center gap-1.5">
          {readyExplorations.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold animate-glow-pulse" style={{ background: "linear-gradient(135deg, #55EFC4, #74B9FF)", color: "#0c0a18" }}>
              {readyExplorations.length}개 완료
            </span>
          )}
          {inProgressExplorations.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-[#FFEAA7] bg-[#FFEAA7]/10 border border-[#FFEAA7]/15">
              {inProgressExplorations.length}개 진행 중
            </span>
          )}
        </div>
      ) : undefined}>
      <div className="space-y-3">

        {/* Claim result */}
        {claimResult && (
          <div className="modal-panel p-6 animate-bounce-in relative overflow-hidden">
            <div className="absolute inset-0 animate-gold-shimmer pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, rgba(255,234,167,0.06), transparent)" }} />
            <div className="text-center mb-4 relative z-10">
              <span className="text-4xl block mb-2 animate-celebrate-bounce">🎉</span>
              <h3 className="text-white font-bold text-base">탐험 보상!</h3>
            </div>
            <div className="flex justify-center gap-6 text-sm relative z-10">
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">🪙</span>
                <span className="text-[#FFEAA7] font-bold text-lg">+{claimResult.gold}</span>
                <span className="text-white/30 text-[9px]">골드</span>
              </div>
              {claimResult.gems > 0 && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">💎</span>
                  <span className="text-[#D4AF37] font-bold text-lg">+{claimResult.gems}</span>
                  <span className="text-white/30 text-[9px]">젬</span>
                </div>
              )}
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">✨</span>
                <span className="text-[#55EFC4] font-bold text-lg">+{claimResult.exp}</span>
                <span className="text-white/30 text-[9px]">경험치</span>
              </div>
            </div>
            {claimResult.materials.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10 relative z-10">
                <p className="text-[10px] text-white/40 text-center mb-2">획득 재료</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {claimResult.materials.map((m, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white/5 rounded-xl px-3 py-1.5">
                      <span className="text-base">{m.icon}</span>
                      <span className="text-[11px] text-white/80 font-medium">{m.name}</span>
                      <span className="text-[11px] text-[#55EFC4] font-bold">x{m.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {claimResult.bonus && (
              <div className="text-center mt-3 relative z-10">
                <span className="text-[10px] text-[#55EFC4] font-bold bg-[#55EFC4]/10 rounded-full px-3 py-1 border border-[#55EFC4]/20">추천 원소 보너스 +50%!</span>
              </div>
            )}
            <button onClick={() => setClaimResult(null)} className="btn-primary w-full py-2.5 text-xs mt-5 active:scale-95 transition-transform relative z-10">확인</button>
          </div>
        )}

        {/* Claim All */}
        {readyExplorations.length > 1 && (
          <button onClick={handleClaimAll} disabled={claimingAll}
            className="w-full py-3 rounded-2xl text-sm font-bold active:scale-[0.98] transition disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, rgba(85,239,196,0.12), rgba(116,185,255,0.08))", border: "1px solid rgba(85,239,196,0.25)", color: "#55EFC4" }}>
            {claimingAll ? "수령 중..." : `🎁 완료된 탐험 모두 수령 (${readyExplorations.length}개)`}
          </button>
        )}

        {/* Active explorations */}
        {activeExplorations.map((exp) => {
          const dest = destinations.find((d) => d.id === exp.destination_id);
          const theme = destThemes[exp.destination_id] || defaultTheme;
          const timeLeft = getTimeLeft(exp.ends_at);
          const isReady = !timeLeft;
          const progress = getProgress(exp);

          return (
            <div key={exp.id} className="rounded-2xl overflow-hidden relative"
              style={{ background: theme.gradient, border: isReady ? `1px solid ${theme.iconColor}40` : "1px solid rgba(255,255,255,0.06)", boxShadow: isReady ? `0 0 20px ${theme.iconColor}15` : "0 4px 16px rgba(0,0,0,0.2)" }}>
              {/* Illustration */}
              <div className="absolute top-0 right-0 w-24 h-full opacity-60 pointer-events-none" dangerouslySetInnerHTML={{ __html: theme.illustration }} />

              <div className="p-4 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${theme.iconColor}15`, border: `1px solid ${theme.iconColor}25` }}>
                      {theme.emoji}
                    </div>
                    <div>
                      <span className="text-white font-bold text-sm block">{dest?.name || "탐험 중"}</span>
                      <span className="text-white/30 text-[9px]">{isReady ? "완료됨" : `완료: ${formatTime(exp.ends_at)}`}</span>
                    </div>
                  </div>
                  {isReady ? (
                    <span className="text-[10px] font-extrabold px-3 py-1.5 rounded-full animate-glow-pulse" style={{ background: `linear-gradient(135deg, ${theme.iconColor}, ${theme.iconColor}CC)`, color: "#0c0a18" }}>완료!</span>
                  ) : (
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1.5 bg-black/20 rounded-full px-2.5 py-1">
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: theme.iconColor }} />
                        <span className="text-[10px] font-bold tabular-nums" style={{ color: theme.iconColor }}>{timeLeft}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress */}
                {!isReady && (
                  <div className="w-full h-[6px] rounded-full bg-black/30 mb-3 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${theme.iconColor}, ${theme.iconColor}AA)` }} />
                  </div>
                )}

                {/* Slime icons */}
                <div className="flex gap-2 mb-3">
                  {exp.slime_ids.map((sid) => {
                    const sl = slimes.find((s) => s.id === sid);
                    const sp = sl ? species.find((s) => s.id === sl.species_id) : undefined;
                    const match = sl && dest && sl.element === dest.recommended_element;
                    return sl ? (
                      <div key={sid} className="flex flex-col items-center gap-0.5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${match ? "border" : "bg-black/20"}`}
                          style={match ? { background: `${theme.iconColor}10`, borderColor: `${theme.iconColor}30` } : undefined}>
                          <img src={generateSlimeIconSvg(sl.element, 36, sp?.grade, (equippedAccessories[sl.id] || []).map(e => e.svg_overlay).filter(Boolean), sl.species_id)} alt="" className="w-9 h-9 drop-shadow-md" />
                        </div>
                        <span className="text-[8px] text-white/40">Lv.{sl.level}</span>
                        {match && <span className="text-[7px] font-bold" style={{ color: theme.iconColor }}>+50%</span>}
                      </div>
                    ) : null;
                  })}
                </div>

                {isReady && (
                  <button onClick={() => handleClaim(exp)} className="btn-primary w-full py-2.5 text-xs animate-heartbeat active:scale-95 transition-transform font-bold">
                    🎁 보상 수령
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Destination selection or slime picker */}
        {selectedDest ? (
          <div className="space-y-3">
            {/* Selected destination card */}
            {(() => {
              const theme = destThemes[selectedDest.id] || defaultTheme;
              return (
                <div className="rounded-2xl overflow-hidden relative" style={{ background: theme.gradient, border: `1px solid ${theme.iconColor}20` }}>
                  <div className="absolute top-0 right-0 w-28 h-full opacity-50 pointer-events-none" dangerouslySetInnerHTML={{ __html: theme.illustration }} />
                  <div className="p-4 relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${theme.iconColor}15`, border: `1px solid ${theme.iconColor}25` }}>
                        {theme.emoji}
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-base">{selectedDest.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">⏱ {selectedDest.duration_minutes}분</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10">
                            추천: <span style={{ color: elementColors[selectedDest.recommended_element] || "#B2BEC3" }}>
                              {elementNames[selectedDest.recommended_element] || selectedDest.recommended_element}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Reward preview */}
                    <div className="flex items-center gap-2 text-[10px] flex-wrap">
                      {selectedDest.rewards.gold && <span className="text-[#FFEAA7] bg-[#FFEAA7]/10 rounded-full px-2.5 py-1 font-bold">🪙 {selectedDest.rewards.gold.min}~{selectedDest.rewards.gold.max}</span>}
                      {selectedDest.rewards.gems && <span className="text-[#D4AF37] bg-[#D4AF37]/10 rounded-full px-2.5 py-1 font-bold">💎 {selectedDest.rewards.gems.min}~{selectedDest.rewards.gems.max}</span>}
                      <span className="text-[#55EFC4] bg-[#55EFC4]/10 rounded-full px-2.5 py-1 font-bold">✨ EXP +{Math.max(5, Math.floor(selectedDest.duration_minutes / 3))}</span>
                    </div>

                    {/* Material drop details */}
                    {selectedDest.material_drops && selectedDest.material_drops.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/8">
                        <p className="text-[9px] text-white/40 mb-2">획득 가능 재료</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedDest.material_drops.map((md) => {
                            const mat = materialInfo[md.material_id];
                            if (!mat) return null;
                            const rc = rarityColors[mat.rarity] || "#B2BEC3";
                            return (
                              <div key={md.material_id} className="flex items-center gap-1 rounded-lg px-2 py-1"
                                style={{ background: `${rc}08`, border: `1px solid ${rc}18` }}>
                                <span className="text-sm">{mat.icon}</span>
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-medium" style={{ color: rc }}>{mat.name}</span>
                                  <span className="text-[8px] text-white/30">
                                    {Math.round(md.chance * 100)}% | {md.min_qty === md.max_qty ? `x${md.min_qty}` : `x${md.min_qty}~${md.max_qty}`}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Deployment area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="section-title">파견 슬라임 ({selectedSlimeIds.length}/3)</h4>
                {availableSlimes.length > 0 && (
                  <button onClick={autoRecommend} className="text-[9px] font-bold px-2.5 py-1 rounded-lg" style={{ background: "rgba(85,239,196,0.08)", color: "#55EFC4", border: "1px solid rgba(85,239,196,0.15)" }}>
                    🤖 자동 추천
                  </button>
                )}
              </div>

              {/* Slots */}
              <div className="flex gap-3 mb-4">
                {[0, 1, 2].map((idx) => {
                  const sid = selectedSlimeIds[idx];
                  const sl = sid ? slimes.find((s) => s.id === sid) : null;
                  const sp = sl ? species.find((s) => s.id === sl.species_id) : null;
                  const match = sl && sl.element === selectedDest.recommended_element;
                  return (
                    <button key={idx} onClick={() => sid && setSelectedSlimeIds((p) => p.filter((id) => id !== sid))}
                      className="flex-1 flex flex-col items-center gap-1.5 rounded-2xl py-3 transition-all"
                      style={{
                        background: sl ? (match ? "rgba(85,239,196,0.12)" : "rgba(201,168,76,0.10)") : "rgba(255,255,255,0.03)",
                        border: sl ? (match ? "2px dashed rgba(85,239,196,0.4)" : "2px solid rgba(201,168,76,0.2)") : "2px dashed rgba(255,255,255,0.08)",
                      }}>
                      {sl ? (
                        <>
                          <img src={generateSlimeIconSvg(sl.element, 44, sp?.grade, (equippedAccessories[sl.id] || []).map(e => e.svg_overlay).filter(Boolean), sl.species_id)} alt="" className="w-11 h-11 drop-shadow-md" />
                          <span className="text-[9px] text-white/60 truncate max-w-[70px] font-medium">{sl.name || sp?.name || "???"}</span>
                          <span className="text-[8px] text-white/40">Lv.{sl.level}</span>
                          {match && <span className="text-[8px] text-[#55EFC4] font-bold bg-[#55EFC4]/10 rounded-full px-1.5 py-0.5">+50%</span>}
                        </>
                      ) : (
                        <>
                          <div className="w-11 h-11 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                            <span className="text-white/15 text-2xl">+</span>
                          </div>
                          <span className="text-[9px] text-white/20">빈 슬롯</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Available slimes */}
              <h4 className="section-title mb-2">보유 슬라임</h4>
              <div className="space-y-1.5">
                {sortedAvailableSlimes.map((sl) => {
                  const sp = species.find((s) => s.id === sl.species_id);
                  const isSelected = selectedSlimeIds.includes(sl.id);
                  const match = sl.element === selectedDest.recommended_element;
                  const gc = sp ? gradeColors[sp.grade] : "#B2BEC3";
                  return (
                    <button key={sl.id} onClick={() => toggleSlime(sl.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isSelected ? "highlight-selected bg-[#C9A84C]/10" : "game-card"}`}>
                      <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                        <img src={generateSlimeIconSvg(sl.element, 32, sp?.grade, (equippedAccessories[sl.id] || []).map(e => e.svg_overlay).filter(Boolean), sl.species_id)} alt="" className="w-8 h-8 drop-shadow-md" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white text-xs font-bold truncate">{sl.name || sp?.name || "???"}</span>
                          {sp && <span className="text-[7px] px-1 py-0.5 rounded-full font-bold shrink-0" style={{ background: `${gc}15`, color: gc }}>{gradeNames[sp.grade] || sp.grade}</span>}
                        </div>
                        <div className="text-[9px] text-white/50 flex items-center gap-1">
                          Lv.{sl.level} · <span style={{ color: elementColors[sl.element] || "#B2BEC3" }}>{elementNames[sl.element] || sl.element}</span>
                          {match && <span className="text-[#55EFC4] font-bold ml-0.5">추천!</span>}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #C9A84C, #D4AF37)" }}>
                          <span className="text-white text-[10px] font-bold">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
                {availableSlimes.length === 0 && (
                  <div className="empty-state py-8">
                    <span className="empty-state-icon text-3xl">😢</span>
                    <span className="empty-state-text text-xs">보낼 수 있는 슬라임이 없어요</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setSelectedDest(null); setSelectedSlimeIds([]); }} className="btn-secondary flex-1 py-2.5 text-xs">취소</button>
              <button onClick={handleStart} disabled={selectedSlimeIds.length === 0} className="flex-1 btn-primary py-2.5 text-xs font-bold active:scale-95 transition-transform">
                🧭 탐험 출발!
              </button>
            </div>
          </div>
        ) : (
          /* Destination list */
          <div className="space-y-2.5">
            <h3 className="section-title">탐험지 선택</h3>
            <div className="space-y-2">
              {destinations.map((dest, idx) => {
                const theme = destThemes[dest.id] || defaultTheme;
                const locked = dest.unlock.type === "level" && !!dest.unlock.value && slimes.every((s) => s.level < (dest.unlock.value ?? 0));
                const matchCount = availableSlimes.filter((s) => s.element === dest.recommended_element).length;
                const goldMin = dest.rewards.gold?.min ?? 0;
                const goldMax = dest.rewards.gold?.max ?? 0;

                return (
                  <button key={dest.id} onClick={() => !locked && setSelectedDest(dest)} disabled={locked}
                    className={`w-full rounded-2xl overflow-hidden text-left transition-all relative ${locked ? "opacity-35 cursor-not-allowed" : "hover:scale-[1.01] active:scale-[0.98] hover-glow"}`}
                    style={{ animation: `stagger-slide-in 0.3s ease-out ${idx * 50}ms both` }}>
                    {/* Illustration BG */}
                    <div className="absolute top-0 right-0 w-24 h-full opacity-40 pointer-events-none" dangerouslySetInnerHTML={{ __html: theme.illustration }} />

                    <div className="p-4 rounded-2xl relative z-10" style={{ background: theme.gradient, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${theme.iconColor}12`, border: `1px solid ${theme.iconColor}20` }}>
                          {theme.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-bold text-sm">{dest.name}</span>
                            <span className="text-white/40 text-[10px] bg-white/10 rounded-full px-2 py-0.5">⏱ {dest.duration_minutes}분</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            <span className="bg-white/8 rounded-full px-2 py-0.5">
                              추천: <span style={{ color: elementColors[dest.recommended_element] || "#B2BEC3" }}>{elementNames[dest.recommended_element] || dest.recommended_element}</span>
                            </span>
                            {matchCount > 0 && !locked && (
                              <span className="font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${theme.iconColor}12`, color: theme.iconColor, border: `1px solid ${theme.iconColor}20` }}>
                                {matchCount}마리 적합
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Reward pills */}
                      <div className="flex items-center gap-1.5 text-[9px] ml-[52px]">
                        <span className="text-[#FFEAA7] bg-[#FFEAA7]/8 rounded-full px-2 py-0.5 font-bold">🪙 {goldMin}~{goldMax}</span>
                        {dest.rewards.gems && <span className="text-[#D4AF37] bg-[#D4AF37]/8 rounded-full px-2 py-0.5 font-bold">💎 {dest.rewards.gems.min}~{dest.rewards.gems.max}</span>}
                        <span className="text-[#55EFC4] bg-[#55EFC4]/8 rounded-full px-2 py-0.5 font-bold">✨ +{Math.max(5, Math.floor(dest.duration_minutes / 3))}</span>
                      </div>

                      {/* Material drop preview */}
                      {dest.material_drops && dest.material_drops.length > 0 && (
                        <div className="flex items-center gap-1 ml-[52px] mt-1.5">
                          <span className="text-[8px] text-white/30 shrink-0">재료:</span>
                          <div className="flex items-center gap-0.5 flex-wrap">
                            {dest.material_drops.slice(0, 4).map((md) => {
                              const mat = materialInfo[md.material_id];
                              if (!mat) return null;
                              return (
                                <span key={md.material_id} className="text-[9px] rounded-full px-1.5 py-0.5 flex items-center gap-0.5"
                                  style={{ background: `${rarityColors[mat.rarity] || "#B2BEC3"}10`, border: `1px solid ${rarityColors[mat.rarity] || "#B2BEC3"}15` }}
                                  title={`${mat.name} (${Math.round(md.chance * 100)}%)`}>
                                  <span className="text-[8px]">{mat.icon}</span>
                                </span>
                              );
                            })}
                            {dest.material_drops.length > 4 && (
                              <span className="text-[8px] text-white/25 ml-0.5">+{dest.material_drops.length - 4}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {locked && <p className="text-[#FF6B6B] text-[9px] mt-2 ml-[52px]">🔒 Lv.{dest.unlock.value} 이상 필요</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
