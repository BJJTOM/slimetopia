"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore } from "@/lib/store/gameStore";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import {
  elementNames, personalityNames, personalityEmoji, elementColors,
  gradeColors, gradeNames, moodEmojis, moodNames, moodColors, deriveMood,
} from "@/lib/constants";
import AccessoryPanel from "./AccessoryPanel";

const ALL_PERSONALITIES = ["energetic", "chill", "foodie", "curious", "tsundere", "gentle"];

export default function SlimeInfoPanel() {
  const token = useAuthStore((s) => s.accessToken);
  const {
    slimes,
    species,
    selectedSlimeId,
    selectSlime,
    feedSlime,
    petSlime,
    playSlime,
    bathSlime,
    medicineSlime,
    reactionMessage,
    getCooldownRemaining,
    renameSlime,
    showAccessoryPanel,
    setShowAccessoryPanel,
    equippedAccessories,
    fetchEquippedAccessories,
    collectionEntries,
    collectionRequirements,
    submitToCollection,
    activePanel,
    showCommunity,
    showProfile,
    showShorts,
    showMiniContents,
    showCollection,
  } = useGameStore();

  const slime = slimes.find((s) => s.id === selectedSlimeId);
  const sp = species.find((s) => s.id === slime?.species_id);

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-close panel when navigating to another tab/overlay
  useEffect(() => {
    if (selectedSlimeId && (activePanel !== "home" || showCommunity || showProfile || showShorts || showMiniContents || showCollection)) {
      selectSlime(null);
    }
  }, [activePanel, showCommunity, showProfile, showShorts, showMiniContents, showCollection]);

  // Fetch equipped accessories when slime selected
  useEffect(() => {
    if (selectedSlimeId && token) {
      fetchEquippedAccessories(token, selectedSlimeId);
    }
  }, [selectedSlimeId, token, fetchEquippedAccessories]);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRenameStart = () => {
    if (!slime) return;
    setRenameName(slime.name || sp?.name || "");
    setIsRenaming(true);
  };

  const handleRenameSubmit = async () => {
    if (!token || !slime || !renameName.trim()) {
      setIsRenaming(false);
      return;
    }
    if (renameName.trim().length > 20) return;
    try {
      await renameSlime(token, slime.id, renameName.trim());
    } catch {
      // ignore
    }
    setIsRenaming(false);
  };

  if (!slime || !token) return null;

  const feedCD = getCooldownRemaining(slime.id, "feed");
  const petCD = getCooldownRemaining(slime.id, "pet");
  const playCD = getCooldownRemaining(slime.id, "play");
  const bathCD = getCooldownRemaining(slime.id, "bath");
  const medicineCD = getCooldownRemaining(slime.id, "medicine");

  const expRequired = slime.level * 100;
  const expPct = slime.level >= 30 ? 100 : Math.min((slime.exp / expRequired) * 100, 100);

  const color = elementColors[slime.element] || "#B2BEC3";
  const gradeColor = sp ? gradeColors[sp.grade] || "#B2BEC3" : "#B2BEC3";
  const showReaction = reactionMessage && reactionMessage.slimeId === slime.id;
  const equipped = equippedAccessories[slime.id] || [];

  // Mood
  const mood = slime.mood || deriveMood(slime.hunger, slime.condition, slime.affection, slime.is_sick);
  const moodEmoji = moodEmojis[mood] || "";
  const moodName = moodNames[mood] || "";
  const moodColor = moodColors[mood] || "#B2BEC3";

  // Personality collection for this species
  const submittedPersonalities = new Set(
    collectionEntries.filter((e) => e.species_id === slime.species_id).map((e) => e.personality)
  );

  return (
    <div className="absolute bottom-[84px] left-1/2 -translate-x-1/2 z-[60] w-[340px] max-w-[calc(100%-24px)] animate-fade-in-up pointer-events-auto">
      <div className="frosted-card rounded-2xl p-4 relative overflow-hidden" style={{
        borderColor: `${gradeColor}20`,
        boxShadow: `0 16px 48px rgba(0,0,0,0.5), 0 0 40px ${gradeColor}10, inset 0 1px 0 rgba(255,255,255,0.06)`,
        backdropFilter: "blur(24px) saturate(1.4)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
      }}>
        {/* Sick alert banner */}
        {slime.is_sick && (
          <div className="mb-3 p-2 rounded-xl text-center animate-pulse"
            style={{
              background: "linear-gradient(135deg, rgba(108,92,231,0.15), rgba(108,92,231,0.08))",
              border: "1px solid rgba(108,92,231,0.3)",
            }}>
            <span className="text-xs font-bold" style={{ color: "#6C5CE7" }}>
              {"\uD83E\uDD12"} 이 슬라임이 아파요! 약을 주세요!
            </span>
          </div>
        )}

        {/* Reaction bubble */}
        {showReaction && (
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
            <div className="bg-white/95 text-[#0a0a1a] text-sm font-medium px-4 py-2.5 rounded-2xl shadow-lg whitespace-nowrap">
              {reactionMessage.text}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white/95 rotate-45 rounded-sm" />
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={() => selectSlime(null)}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#B2BEC3] hover:text-white text-sm transition"
        >
          {"\u2715"}
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
            style={{
              background: `linear-gradient(145deg, ${color}20 0%, ${gradeColor}10 100%)`,
              border: `1px solid ${gradeColor}25`,
              boxShadow: `0 0 20px ${color}15, inset 0 0 16px ${color}08`,
            }}
          >
            <img
              src={generateSlimeIconSvg(slime.element, 52, sp?.grade, equipped.map(e => e.svg_overlay).filter(Boolean), slime.species_id)}
              alt=""
              className="w-13 h-13 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
              style={slime.is_sick ? { filter: "hue-rotate(90deg) saturate(0.6)" } : undefined}
              draggable={false}
            />
            <span className="absolute -bottom-0.5 -right-0.5 text-xs">
              {personalityEmoji[slime.personality] || ""}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <input
                autoFocus
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") setIsRenaming(false);
                }}
                onBlur={handleRenameSubmit}
                maxLength={20}
                className="bg-white/10 text-white font-bold text-base rounded-lg px-2 py-0.5 w-full outline-none border border-[#55EFC4]/30 focus:border-[#55EFC4]/60"
              />
            ) : (
              <h3
                className="text-white font-bold text-base truncate cursor-pointer group flex items-center gap-1"
                onClick={handleRenameStart}
              >
                {slime.name || sp?.name || "???"}
                <span className="text-[#B2BEC3]/40 group-hover:text-[#B2BEC3] text-xs transition">{"\u270F\uFE0F"}</span>
                {/* Mood badge */}
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold ml-1"
                  style={{ backgroundColor: moodColor + "20", color: moodColor, border: `1px solid ${moodColor}30`, fontSize: "9px" }}>
                  {moodEmoji} {moodName}
                </span>
              </h3>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              {sp && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ backgroundColor: gradeColor + "18", color: gradeColor, border: `1px solid ${gradeColor}25` }}>
                  {gradeNames[sp.grade] || sp.grade}
                </span>
              )}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: color + "20", color }}>
                {elementNames[slime.element] || slime.element}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-white/5 text-[#B2BEC3]">
                {personalityNames[slime.personality] || slime.personality}
              </span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color }}>
              {slime.level}
            </div>
            <div className="text-[9px] text-[#B2BEC3] -mt-1">LEVEL</div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2 mb-3 p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <StatBar label="친밀도" value={slime.affection} color="#FF6B6B" icon={"\u2764\uFE0F"} warn={slime.affection < 20} warnText="외로워해요!" />
          <StatBar label="만복도" value={slime.hunger} color="#FFEAA7" icon={"\uD83C\uDF56"} warn={slime.hunger < 20} warnText="배고파요!" />
          <StatBar label="컨디션" value={slime.condition} color="#55EFC4" icon={"\u2728"} warn={slime.condition < 20} warnText="컨디션 나빠요!" />
        </div>

        {/* EXP bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#B2BEC3] flex items-center gap-1">
              <span>{"\u2B50"}</span> EXP
            </span>
            <span className="text-[10px] font-medium" style={{ color: slime.is_sick ? "#6C5CE7" : color }}>
              {slime.is_sick ? "아파서 경험치를 얻을 수 없어요" : slime.level >= 30 ? "MAX" : `${slime.exp} / ${expRequired}`}
            </span>
          </div>
          <div className="stat-bar-track h-[6px]">
            <div
              className="stat-bar-fill"
              style={{
                width: `${expPct}%`,
                backgroundColor: slime.is_sick ? "#636e72" : color,
                color: slime.is_sick ? "#636e72" : color,
              }}
            />
          </div>
          {!slime.is_sick && slime.level < 30 && expPct >= 80 && (
            <div className="text-[8px] text-right mt-0.5" style={{ color }}>
              레벨업까지 EXP {expRequired - slime.exp} 남음
            </div>
          )}
        </div>

        {/* Equipped accessories row */}
        {equipped.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 p-2 rounded-xl" style={{
            background: "linear-gradient(135deg, rgba(162,155,254,0.06), rgba(255,159,243,0.03))",
            border: "1px solid rgba(162,155,254,0.08)",
          }}>
            <span className="text-[10px] text-white/40 font-medium">장착:</span>
            {equipped.map((eq) => (
              <div key={eq.slot} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                style={{
                  background: "linear-gradient(135deg, rgba(162,155,254,0.12), rgba(255,159,243,0.12))",
                  border: "1px solid rgba(162,155,254,0.12)",
                }}>
                <span className="text-xs">{eq.icon || "\uD83C\uDF80"}</span>
                <span className="text-[8px] text-white/50 font-medium">{eq.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons — 3 cols × 2 rows */}
        <div className="grid grid-cols-3 gap-1.5">
          <ActionButton
            iconSrc="/assets/icons/feed.png"
            label="먹이주기"
            cooldown={feedCD}
            maxCooldown={30}
            onClick={() => feedSlime(token, slime.id)}
            accentColor="#FFEAA7"
          />
          <ActionButton
            iconSrc="/assets/icons/pet.png"
            label="쓰다듬기"
            cooldown={petCD}
            maxCooldown={10}
            onClick={() => petSlime(token, slime.id)}
            accentColor="#FF6B6B"
          />
          <ActionButton
            iconSrc="/assets/icons/play.png"
            label="놀아주기"
            cooldown={playCD}
            maxCooldown={60}
            onClick={() => playSlime(token, slime.id)}
            accentColor="#55EFC4"
          />
          <ActionButton
            emoji={"\uD83D\uDEC1"}
            label="목욕시키기"
            cooldown={bathCD}
            maxCooldown={45}
            onClick={() => bathSlime(token, slime.id)}
            accentColor="#81ECEC"
          />
          <ActionButton
            emoji={"\uD83D\uDC8A"}
            label="약주기"
            cooldown={medicineCD}
            maxCooldown={120}
            onClick={() => medicineSlime(token, slime.id)}
            accentColor="#6C5CE7"
            pulse={slime.is_sick}
          />
          <button
            onClick={() => setShowAccessoryPanel(true)}
            className="btn-icon-pixel bg-white/[0.04] border border-white/[0.08]"
          >
            <span className="text-xl">{"\uD83C\uDF80"}</span>
            <div className="text-[10px] font-semibold text-[#B2BEC3]">꾸미기</div>
          </button>
        </div>

        {/* Collection submit section */}
        <CollectionSubmitSection
          slime={slime}
          grade={sp?.grade}
          collectionEntries={collectionEntries}
          collectionRequirements={collectionRequirements}
          submittedPersonalities={submittedPersonalities}
          onSubmit={() => setShowSubmitConfirm(true)}
        />
      </div>

      {/* Submit confirmation modal — portalled to body to avoid clipping */}
      {showSubmitConfirm && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !submitting && setShowSubmitConfirm(false)}
        >
          <div
            className="modal-panel w-[300px] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-sm text-center mb-4">컬렉션 제출</h3>

            {/* Slime preview */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <img
                src={generateSlimeIconSvg(slime.element, 40, sp?.grade, equipped.map(e => e.svg_overlay).filter(Boolean), slime.species_id)}
                alt=""
                className="w-10 h-10"
                draggable={false}
              />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">
                  {slime.name || sp?.name || "???"}
                </p>
                <p className="text-[#B2BEC3] text-[10px]">
                  Lv.{slime.level} · {personalityNames[slime.personality] || slime.personality}
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="text-center mb-4 p-2.5 rounded-lg bg-[#FF6B6B]/10 border border-[#FF6B6B]/20">
              <p className="text-[#FF6B6B] text-xs font-bold">
                이 슬라임은 영구 삭제됩니다
              </p>
              <p className="text-[#FF6B6B]/60 text-[10px] mt-1">
                제출 후 되돌릴 수 없습니다
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#B2BEC3] bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  setSubmitting(true);
                  await submitToCollection(token, slime.id);
                  setSubmitting(false);
                  setShowSubmitConfirm(false);
                }}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition"
                style={{
                  background: submitting
                    ? "rgba(85,239,196,0.2)"
                    : "linear-gradient(135deg, #55EFC4, #00B894)",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? "제출 중..." : "제출하기"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Accessory Panel Modal */}
      {showAccessoryPanel && <AccessoryPanel />}
    </div>
  );
}

function ActionButton({
  iconSrc,
  emoji,
  label,
  cooldown,
  maxCooldown,
  onClick,
  accentColor,
  pulse,
}: {
  iconSrc?: string;
  emoji?: string;
  label: string;
  cooldown: number;
  maxCooldown: number;
  onClick: () => void;
  accentColor: string;
  pulse?: boolean;
}) {
  const disabled = cooldown > 0;
  const cdPct = disabled ? (cooldown / maxCooldown) * 100 : 0;
  // SVG ring params
  const r = 16;
  const c = 2 * Math.PI * r;
  const offset = c - (cdPct / 100) * c;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-icon-pixel bg-white/[0.03] border border-white/[0.06] relative transition-all active:scale-95 ${pulse && !disabled ? "animate-pulse" : ""} ${!disabled ? "hover:bg-white/[0.06] hover:border-white/[0.12]" : ""}`}
      style={pulse && !disabled ? { borderColor: accentColor + "60", boxShadow: `0 0 12px ${accentColor}30` } : undefined}
    >
      {disabled ? (
        <div className="relative w-10 h-10 flex items-center justify-center">
          <svg width="40" height="40" className="absolute inset-0 rotate-[-90deg]">
            <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
            <circle cx="20" cy="20" r={r} fill="none"
              stroke={accentColor} strokeWidth="2" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={offset}
              className="transition-all duration-1000" opacity="0.5" />
          </svg>
          <span className="text-[11px] font-bold tabular-nums text-[#B2BEC3]/60">{cooldown}s</span>
        </div>
      ) : (
        <>
          {iconSrc ? (
            <img
              src={iconSrc}
              alt={label}
              className="w-9 h-9 pixel-art drop-shadow-md"
              draggable={false}
            />
          ) : (
            <span className="text-2xl">{emoji}</span>
          )}
          <div className="text-[10px] font-semibold text-[#B2BEC3]">{label}</div>
        </>
      )}
    </button>
  );
}

function StatBar({
  label,
  value,
  color,
  icon,
  warn,
  warnText,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
  warn?: boolean;
  warnText?: string;
}) {
  const pct = Math.min((value / 100) * 100, 100);
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`text-xs w-4 text-center ${warn ? "animate-pulse" : ""}`}>{icon}</span>
        <span className={`text-[10px] w-10 ${warn ? "text-[#FF6B6B] font-bold" : "text-[#B2BEC3]"}`}>{label}</span>
        <div className="flex-1 h-[7px] rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: warn
                ? "linear-gradient(90deg, #FF6B6B, #FF8E8E)"
                : `linear-gradient(90deg, ${color}, ${color}CC)`,
              boxShadow: warn ? "0 0 8px rgba(255,107,107,0.5)" : `0 0 6px ${color}40`,
            }}
          />
        </div>
        <span className={`text-[10px] w-7 text-right font-bold tabular-nums ${warn ? "text-[#FF6B6B]" : ""}`}
          style={warn ? {} : { color }}>
          {value}
        </span>
      </div>
      {warn && warnText && (
        <div className="text-[8px] text-[#FF6B6B] font-bold ml-6 mt-0.5 animate-pulse">{warnText}</div>
      )}
    </div>
  );
}

function CollectionSubmitSection({
  slime,
  grade,
  collectionEntries,
  collectionRequirements,
  submittedPersonalities,
  onSubmit,
}: {
  slime: { id: string; species_id: number; personality: string; level: number };
  grade?: string;
  collectionEntries: { species_id: number; personality: string }[];
  collectionRequirements: Record<string, number>;
  submittedPersonalities: Set<string>;
  onSubmit: () => void;
}) {
  const alreadySubmitted = collectionEntries.some(
    (e) => e.species_id === slime.species_id && e.personality === slime.personality
  );
  const requiredLevel = grade ? (collectionRequirements[grade] ?? 3) : 3;
  const levelMet = slime.level >= requiredLevel;
  const totalSubmitted = submittedPersonalities.size;

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.06]">
      {/* Personality collection progress */}
      {totalSubmitted > 0 && (
        <div className="mb-2.5 flex items-center gap-2">
          <span className="text-[9px] text-white/30">수집:</span>
          <div className="flex items-center gap-0.5">
            {ALL_PERSONALITIES.map((p) => {
              const has = submittedPersonalities.has(p);
              const isCurrent = p === slime.personality;
              return (
                <div key={p} className="relative" title={`${personalityEmoji[p]} ${personalityNames[p]}`}>
                  <div className={`w-3 h-3 rounded-full transition-all ${isCurrent && !has ? "ring-1 ring-[#FFEAA7]/50" : ""}`}
                    style={{
                      background: has ? "#55EFC4" : isCurrent ? "rgba(255,234,167,0.2)" : "rgba(255,255,255,0.06)",
                      border: has ? "1px solid rgba(85,239,196,0.5)" : "1px solid rgba(255,255,255,0.08)",
                    }} />
                </div>
              );
            })}
          </div>
          <span className={`text-[8px] font-bold ${totalSubmitted >= 6 ? "text-[#55EFC4]" : "text-white/30"}`}>
            {totalSubmitted}/6
          </span>
        </div>
      )}

      {alreadySubmitted ? (
        <div className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#55EFC4]/[0.06] border border-[#55EFC4]/[0.12]">
          <span className="text-[#55EFC4] text-xs font-bold">{"\u2713"} 컬렉션 등록 완료</span>
        </div>
      ) : !levelMet ? (
        <button
          disabled
          className="w-full py-2.5 rounded-xl text-xs font-bold text-[#B2BEC3]/50 bg-white/[0.03] border border-white/[0.06] cursor-not-allowed"
        >
          컬렉션 제출 (Lv.{requiredLevel} 필요 — 현재 Lv.{slime.level})
        </button>
      ) : (
        <button
          onClick={onSubmit}
          className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, rgba(85,239,196,0.2), rgba(85,239,196,0.1))",
            border: "1px solid rgba(85,239,196,0.25)",
            boxShadow: "0 2px 8px rgba(85,239,196,0.15)",
          }}
        >
          {"\u2728"} 컬렉션 제출 ({personalityNames[slime.personality]})
        </button>
      )}
    </div>
  );
}
