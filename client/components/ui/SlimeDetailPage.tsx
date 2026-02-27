"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore, Slime } from "@/lib/store/gameStore";
import { generateSlimeSvg, generateSlimeIconSvg } from "@/lib/slimeSvg";
import {
  elementNames, personalityNames, personalityEmoji, elementColors,
  gradeColors, gradeNames, moodEmojis, moodNames, deriveMood,
} from "@/lib/constants";
import { toastReward, toastError, toastSuccess } from "@/components/ui/Toast";

const ALL_PERSONALITIES = ["energetic", "chill", "foodie", "curious", "tsundere", "gentle"];

// Personality reaction lines after nurture actions
const PERSONALITY_LINES: Record<string, string> = {
  energetic: "야호! 신난다~!",
  chill: "음... 좋아...",
  foodie: "맛있다! 더 줘~",
  curious: "오! 이건 뭐야?",
  tsundere: "흥, 고맙긴 한데...",
  gentle: "고마워요... \uD83D\uDC95",
};

// Action emoji + text for popup
const ACTION_FEEDBACK: Record<string, { emoji: string; text: string }> = {
  feed: { emoji: "\uD83C\uDF56", text: "+40" },
  pet: { emoji: "\u2764\uFE0F", text: "+8" },
  play: { emoji: "\u2B50", text: "+15 EXP" },
  bath: { emoji: "\u2728", text: "+30" },
  medicine: { emoji: "\uD83D\uDC8A", text: "회복!" },
};

const TALENT_LABELS = [
  { key: "talent_str", label: "STR", color: "#FF6B6B" },
  { key: "talent_vit", label: "VIT", color: "#55EFC4" },
  { key: "talent_spd", label: "SPD", color: "#74B9FF" },
  { key: "talent_int", label: "INT", color: "#A29BFE" },
  { key: "talent_cha", label: "CHA", color: "#FD79A8" },
  { key: "talent_lck", label: "LCK", color: "#FFEAA7" },
];

const TALENT_GRADE_COLORS: Record<string, string> = {
  S: "#FFD700", A: "#55EFC4", B: "#74B9FF", C: "#B2BEC3", D: "#636E72",
};

function fmtCD(sec: number) {
  if (sec <= 0) return "";
  if (sec >= 60) return `${Math.floor(sec / 60)}m`;
  return `${sec}s`;
}

interface Props {
  slimeId: string;
  onClose: () => void;
}

export default function SlimeDetailPage({ slimeId, onClose }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const {
    slimes, species, feedSlime, petSlime, playSlime, bathSlime, medicineSlime,
    getCooldownRemaining, renameSlime, equippedAccessories, fetchEquippedAccessories,
    collectionEntries, collectionRequirements, submitToCollection, fetchSlimes,
    setShowAccessoryPanel, showAccessoryPanel,
  } = useGameStore();

  const slime = slimes.find((s) => s.id === slimeId);
  const sp = species.find((s) => s.id === slime?.species_id);

  // Cooldown tick
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState("");

  // Collection submit
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Talent section collapsed
  const [talentOpen, setTalentOpen] = useState(false);

  // Reaction animation state
  const [reactionEmoji, setReactionEmoji] = useState<string | null>(null);
  const [reactionText, setReactionText] = useState<string | null>(null);

  // Animated EXP value for smooth transition
  const [animExp, setAnimExp] = useState(slime?.exp || 0);
  const [animLevel, setAnimLevel] = useState(slime?.level || 1);

  useEffect(() => {
    if (slime) {
      setAnimExp(slime.exp);
      setAnimLevel(slime.level);
    }
  }, [slime?.exp, slime?.level, slime]);

  // Fetch accessories on mount
  useEffect(() => {
    if (token && slimeId) fetchEquippedAccessories(token, slimeId);
  }, [token, slimeId, fetchEquippedAccessories]);

  const showReaction = useCallback((action: string, personality: string) => {
    const fb = ACTION_FEEDBACK[action];
    if (fb) {
      setReactionEmoji(`${fb.emoji} ${fb.text}`);
      setTimeout(() => setReactionEmoji(null), 800);
    }
    setTimeout(() => {
      setReactionText(PERSONALITY_LINES[personality] || "...!");
      setTimeout(() => setReactionText(null), 1500);
    }, 500);
  }, []);

  const doAction = useCallback(async (action: string) => {
    if (!token || !slime) return;
    const handlers: Record<string, (t: string, id: string) => Promise<void>> = {
      feed: feedSlime, pet: petSlime, play: playSlime, bath: bathSlime, medicine: medicineSlime,
    };
    try {
      await handlers[action](token, slime.id);
      showReaction(action, slime.personality);
    } catch {
      toastError("쿨타임 중입니다");
    }
  }, [token, slime, feedSlime, petSlime, playSlime, bathSlime, medicineSlime, showReaction]);

  // Rename handlers
  const handleRenameStart = () => {
    setRenameName(slime?.name || sp?.name || "");
    setIsRenaming(true);
  };
  const handleRenameSubmit = async () => {
    if (!token || !slime || !renameName.trim()) return;
    if (renameName.trim().length > 20) return;
    await renameSlime(token, slime.id, renameName.trim());
    setIsRenaming(false);
  };

  // Collection submit
  const handleCollectionSubmit = async () => {
    if (!token || !slime) return;
    setSubmitting(true);
    const ok = await submitToCollection(token, slime.id);
    setSubmitting(false);
    if (ok) {
      toastSuccess("컬렉션에 등록되었습니다!", "\uD83D\uDCDA");
      onClose();
    }
  };

  if (!slime || !sp) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="animate-pulse" style={{ color: "rgba(245,230,200,0.35)", fontFamily: "Georgia, serif" }}>로딩 중...</span>
      </div>
    );
  }

  const color = elementColors[slime.element] || "#B2BEC3";
  const gradeColor = gradeColors[sp.grade] || "#B2BEC3";
  const mood = slime.mood || deriveMood(slime.hunger, slime.condition, slime.affection, slime.is_sick);
  const expRequired = slime.level * 100;
  const expPct = slime.level >= 30 ? 100 : Math.min((animExp / expRequired) * 100, 100);

  // Cooldowns
  const feedCD = getCooldownRemaining(slimeId, "feed");
  const petCD = getCooldownRemaining(slimeId, "pet");
  const playCD = getCooldownRemaining(slimeId, "play");
  const bathCD = getCooldownRemaining(slimeId, "bath");
  const medCD = getCooldownRemaining(slimeId, "medicine");

  // Collection check
  const alreadySubmitted = collectionEntries.some(
    (e) => e.species_id === slime.species_id && e.personality === slime.personality
  );
  const reqLevel = collectionRequirements[sp.grade] || 999;
  const canSubmit = !alreadySubmitted && slime.level >= reqLevel;

  // Talent values
  const talentTotal = slime.talent_total ?? 0;
  const talentGrade = slime.talent_grade || "D";

  // Merge/upgrade recommendations
  const sameSpecies = slimes.filter((s) => s.species_id === slime.species_id && s.id !== slime.id);
  const canMerge = sameSpecies.length > 0;

  // Action button config
  const actions = [
    { key: "feed", label: "먹이주기", emoji: "\uD83C\uDF56", cd: feedCD, maxCd: 30, color: "#FFEAA7" },
    { key: "pet", label: "쓰다듬기", emoji: "\uD83E\uDD0D", cd: petCD, maxCd: 10, color: "#FD79A8" },
    { key: "play", label: "놀아주기", emoji: "\uD83C\uDFAE", cd: playCD, maxCd: 60, color: "#74B9FF" },
    { key: "bath", label: "목욕", emoji: "\uD83D\uDEC1", cd: bathCD, maxCd: 45, color: "#81ECEC" },
    { key: "medicine", label: "치료", emoji: "\uD83D\uDC8A", cd: medCD, maxCd: 120, color: "#FF6B6B", pulse: slime.is_sick },
    { key: "accessory", label: "꾸미기", emoji: "\uD83C\uDF80", cd: 0, maxCd: 0, color: "#A29BFE" },
  ];

  return (
    <div className="h-full flex flex-col" style={{ background: "#0a0a1a" }}>
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 safe-area-top" style={{
        background: "linear-gradient(180deg, #2C1810, #1A0E08)",
        borderBottom: "2px solid rgba(139,105,20,0.3)",
      }}>
        <button onClick={onClose} className="text-[14px] font-bold transition active:scale-90" style={{ color: "#D4AF37" }}>
          {"\u2190"}
        </button>
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              autoFocus
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(); if (e.key === "Escape") setIsRenaming(false); }}
              onBlur={handleRenameSubmit}
              maxLength={20}
              className="w-full bg-transparent text-[14px] font-bold outline-none px-1 rounded"
              style={{ color: "#F5E6C8", fontFamily: "Georgia, serif", borderBottom: "1px solid rgba(201,168,76,0.4)" }}
            />
          ) : (
            <button onClick={handleRenameStart} className="text-[14px] font-bold truncate block max-w-full text-left" style={{
              color: "#F5E6C8", fontFamily: "Georgia, serif",
            }}>
              {slime.name || sp.name}
            </button>
          )}
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase" style={{
          background: `${gradeColor}30`,
          color: gradeColor,
          border: `1px solid ${gradeColor}50`,
        }}>
          {gradeNames[sp.grade] || sp.grade}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto game-scroll">
        {/* Slime Profile */}
        <div className="relative flex flex-col items-center py-5 px-4" style={{
          background: `radial-gradient(ellipse at center, ${color}15, #0a0a1a 70%)`,
        }}>
          {/* Reaction emoji popup */}
          {reactionEmoji && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-lg font-bold animate-bounce z-20"
              style={{
                color: "#FFEAA7",
                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                animation: "floatUp 0.8s ease-out forwards",
              }}>
              {reactionEmoji}
            </div>
          )}
          {/* Reaction text bubble */}
          {reactionText && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl z-20 whitespace-nowrap"
              style={{
                background: "rgba(44,24,16,0.9)",
                border: "1px solid rgba(201,168,76,0.3)",
                color: "#F5E6C8",
                fontSize: "11px",
                fontFamily: "Georgia, serif",
                animation: "fadeInOut 1.5s ease-in-out forwards",
              }}>
              {reactionText}
            </div>
          )}

          <div className="relative">
            <img
              src={generateSlimeSvg(slime.element, slime.personality, sp.grade, slime.species_id)}
              alt="" className="w-24 h-24" draggable={false}
              style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))" }}
            />
            {/* Star level */}
            {(slime.star_level ?? 0) > 0 && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                {Array.from({ length: slime.star_level ?? 0 }).map((_, i) => (
                  <span key={i} className="text-[10px]" style={{ color: "#FFEAA7" }}>{"\u2605"}</span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 text-center">
            <span className="text-lg font-bold" style={{ color: "#D4AF37", fontFamily: "Georgia, serif" }}>
              Lv.{slime.level}
            </span>
            <span className="ml-1.5 text-xs" style={{ color: "rgba(245,230,200,0.4)" }}>
              {moodEmojis[mood]} {moodNames[mood]}
            </span>
          </div>

          {/* Badges row: grade | element | personality */}
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{
              background: `${gradeColor}20`, color: gradeColor, border: `1px solid ${gradeColor}40`,
            }}>
              {gradeNames[sp.grade]}
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{
              background: `${color}20`, color, border: `1px solid ${color}40`,
            }}>
              {elementNames[slime.element]}
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{
              background: "rgba(245,230,200,0.08)", color: "rgba(245,230,200,0.6)",
              border: "1px solid rgba(245,230,200,0.15)",
            }}>
              {personalityEmoji[slime.personality]} {personalityNames[slime.personality]}
            </span>
          </div>
        </div>

        {/* Sick alert */}
        {slime.is_sick && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl flex items-center gap-2" style={{
            background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)",
          }}>
            <span className="text-sm">{"\uD83E\uDD12"}</span>
            <span className="text-[11px] font-bold" style={{ color: "#FF6B6B" }}>아파요! 치료가 필요합니다</span>
          </div>
        )}

        {/* Status bars */}
        <div className="px-4 py-3 space-y-2">
          <StatusBar label="애정" emoji={"\u2764\uFE0F"} value={slime.affection} color="#E74C3C" />
          <StatusBar label="배고픔" emoji={"\uD83C\uDF56"} value={slime.hunger} color="#F39C12" warn={slime.hunger < 30} />
          <StatusBar label="컨디션" emoji={"\u2728"} value={slime.condition} color="#2ECC71" />
          {/* EXP bar with transition */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] font-bold" style={{ color: "rgba(245,230,200,0.5)", fontFamily: "Georgia, serif" }}>
                {"\uD83D\uDCCA"} EXP
              </span>
              <span className="text-[9px] tabular-nums" style={{ color: "rgba(245,230,200,0.4)" }}>
                {slime.level >= 30 ? "MAX" : `${slime.exp} / ${expRequired}`}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(139,105,20,0.1)" }}>
              <div className="h-full rounded-full" style={{
                width: `${expPct}%`,
                background: slime.level >= 30
                  ? "linear-gradient(90deg, #D4AF37, #FFEAA7)"
                  : "linear-gradient(90deg, #74B9FF, #A29BFE)",
                transition: "width 0.6s ease-out",
              }} />
            </div>
          </div>
        </div>

        {/* Action buttons - 2 rows x 3 cols */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-2">
            {actions.map((a) => (
              <button
                key={a.key}
                disabled={a.key !== "accessory" && a.cd > 0}
                onClick={() => {
                  if (a.key === "accessory") {
                    setShowAccessoryPanel(true);
                  } else {
                    doAction(a.key);
                  }
                }}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all active:scale-95 relative"
                style={{
                  background: a.cd > 0 ? "rgba(139,105,20,0.04)" : `${a.color}10`,
                  border: `1px solid ${a.cd > 0 ? "rgba(139,105,20,0.1)" : `${a.color}30`}`,
                  opacity: a.cd > 0 ? 0.5 : 1,
                }}
              >
                {a.pulse && (
                  <div className="absolute inset-0 rounded-xl animate-pulse" style={{
                    border: "2px solid rgba(255,107,107,0.4)",
                  }} />
                )}
                <span className="text-base">{a.emoji}</span>
                <span className="text-[9px] font-bold" style={{ color: a.cd > 0 ? "rgba(245,230,200,0.3)" : a.color, fontFamily: "Georgia, serif" }}>
                  {a.cd > 0 ? fmtCD(a.cd) : a.label}
                </span>
                {/* Cooldown ring overlay */}
                {a.cd > 0 && a.maxCd > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg width="32" height="32" viewBox="0 0 32 32" className="opacity-30">
                      <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(245,230,200,0.1)" strokeWidth="2" />
                      <circle cx="16" cy="16" r="14" fill="none" stroke={a.color} strokeWidth="2"
                        strokeDasharray={`${(1 - a.cd / a.maxCd) * 88} 88`}
                        strokeLinecap="round" transform="rotate(-90 16 16)" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Talent Section (collapsible) */}
        <div className="mx-4 mb-3 rounded-xl overflow-hidden" style={{
          background: "rgba(139,105,20,0.05)",
          border: "1px solid rgba(139,105,20,0.15)",
        }}>
          <button
            onClick={() => setTalentOpen(!talentOpen)}
            className="w-full px-3 py-2 flex items-center justify-between transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold" style={{ color: "rgba(245,230,200,0.5)", fontFamily: "Georgia, serif" }}>
                {"\uD83C\uDFAF"} 재능 (IV)
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{
                background: `${TALENT_GRADE_COLORS[talentGrade] || "#636E72"}25`,
                color: TALENT_GRADE_COLORS[talentGrade] || "#636E72",
              }}>
                {talentGrade} ({talentTotal}/186)
              </span>
            </div>
            <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.3)" }}>{talentOpen ? "\u25B2" : "\u25BC"}</span>
          </button>
          {talentOpen && (
            <div className="px-3 pb-3 space-y-1.5">
              {TALENT_LABELS.map(({ key, label, color: tc }) => {
                const val = (slime as unknown as Record<string, number>)[key] || 0;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[9px] font-bold w-6" style={{ color: tc }}>{label}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(139,105,20,0.1)" }}>
                      <div className="h-full rounded-full" style={{
                        width: `${(val / 31) * 100}%`,
                        background: `linear-gradient(90deg, ${tc}CC, ${tc})`,
                      }} />
                    </div>
                    <span className="text-[8px] w-5 text-right tabular-nums" style={{ color: "rgba(245,230,200,0.4)" }}>{val}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recommended actions */}
        {(canMerge || canSubmit) && (
          <div className="px-4 mb-3 space-y-1.5">
            {canMerge && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{
                background: "rgba(116,185,255,0.08)", border: "1px solid rgba(116,185,255,0.2)",
              }}>
                <span className="text-sm">{"\uD83D\uDD00"}</span>
                <span className="text-[10px] flex-1" style={{ color: "#74B9FF" }}>
                  동종 슬라임 {sameSpecies.length}마리! 합성/등급 업그레이드 가능
                </span>
              </div>
            )}
          </div>
        )}

        {/* Collection submit */}
        <div className="px-4 pb-6">
          {alreadySubmitted ? (
            <div className="w-full py-2.5 rounded-xl text-center text-[11px] font-bold" style={{
              background: "rgba(46,204,113,0.08)", border: "1px solid rgba(46,204,113,0.2)",
              color: "#2ECC71", fontFamily: "Georgia, serif",
            }}>
              {"\u2713"} 컬렉션 등록 완료
            </div>
          ) : (
            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={!canSubmit}
              className="w-full py-2.5 rounded-xl text-[11px] font-bold transition active:scale-[0.97] disabled:opacity-30"
              style={{
                background: canSubmit ? "rgba(201,168,76,0.12)" : "rgba(139,105,20,0.05)",
                border: `1px solid ${canSubmit ? "rgba(201,168,76,0.3)" : "rgba(139,105,20,0.1)"}`,
                color: canSubmit ? "#D4AF37" : "rgba(245,230,200,0.25)",
                fontFamily: "Georgia, serif",
              }}
            >
              {canSubmit
                ? "\uD83D\uDCDA 컬렉션에 등록하기"
                : `\uD83D\uDD12 Lv.${reqLevel} 필요 (현재 Lv.${slime.level})`
              }
            </button>
          )}
        </div>
      </div>

      {/* Collection submit confirmation modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6" style={{ background: "rgba(26,14,8,0.85)" }} onClick={() => setShowSubmitConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{
            background: "linear-gradient(180deg, #2C1810, #1A0E08)",
            border: "1.5px solid rgba(201,168,76,0.3)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
          }} onClick={(e) => e.stopPropagation()}>
            <div className="p-4 text-center" style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <img src={generateSlimeIconSvg(slime.element, 36, sp.grade, undefined, slime.species_id)}
                  alt="" className="w-9 h-9" draggable={false} />
                <div className="text-left">
                  <div className="text-[12px] font-bold" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>
                    {slime.name || sp.name}
                  </div>
                  <div className="text-[9px]" style={{ color: "rgba(245,230,200,0.4)" }}>
                    Lv.{slime.level} {gradeNames[sp.grade]} {elementNames[slime.element]}
                  </div>
                </div>
              </div>
              {/* Personality progress */}
              <div className="flex gap-1 justify-center mt-2 mb-3">
                {ALL_PERSONALITIES.map((p) => {
                  const collected = collectionEntries.some((e) => e.species_id === slime.species_id && e.personality === p);
                  const isCurrent = p === slime.personality;
                  return (
                    <span key={p} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{
                      background: collected ? "rgba(46,204,113,0.15)" : isCurrent ? "rgba(201,168,76,0.1)" : "rgba(245,230,200,0.03)",
                      color: collected ? "#2ECC71" : isCurrent ? "#D4AF37" : "rgba(245,230,200,0.2)",
                      border: `1px solid ${collected ? "rgba(46,204,113,0.3)" : isCurrent ? "rgba(201,168,76,0.3)" : "rgba(245,230,200,0.05)"}`,
                    }}>
                      {collected ? "\u2713 " : ""}{personalityEmoji[p]}
                    </span>
                  );
                })}
              </div>
              <div className="text-[10px] font-bold" style={{ color: "#FF6B6B" }}>
                {"\u26A0\uFE0F"} 이 슬라임은 영구적으로 삭제됩니다
              </div>
            </div>
            <div className="flex gap-2 p-4">
              <button onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold"
                style={{ background: "rgba(245,230,200,0.05)", color: "rgba(245,230,200,0.4)", border: "1px solid rgba(245,230,200,0.1)" }}>
                취소
              </button>
              <button onClick={handleCollectionSubmit} disabled={submitting}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition active:scale-[0.97] disabled:opacity-50"
                style={{ background: "rgba(201,168,76,0.2)", color: "#D4AF37", border: "1px solid rgba(201,168,76,0.4)" }}>
                {submitting ? "등록 중..." : "등록하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline keyframe styles */}
      <style jsx>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-40px); }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) scale(0.8); }
          15% { opacity: 1; transform: translateX(-50%) scale(1); }
          80% { opacity: 1; transform: translateX(-50%) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) scale(0.9); }
        }
      `}</style>
    </div>
  );
}

// Reusable status bar component
function StatusBar({
  label, emoji, value, color, warn,
}: {
  label: string; emoji: string; value: number; color: string; warn?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-bold" style={{
          color: warn ? "#FF6B6B" : "rgba(245,230,200,0.5)",
          fontFamily: "Georgia, serif",
        }}>
          {emoji} {label}
        </span>
        <span className="text-[9px] tabular-nums" style={{ color: warn ? "#FF6B6B" : "rgba(245,230,200,0.4)" }}>
          {value}/100
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(139,105,20,0.1)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{
          width: `${value}%`,
          background: warn ? "linear-gradient(90deg, #FF6B6B, #E17055)" : `linear-gradient(90deg, ${color}CC, ${color})`,
        }} />
      </div>
    </div>
  );
}
