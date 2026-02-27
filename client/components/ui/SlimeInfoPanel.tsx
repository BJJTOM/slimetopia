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
      <div className="rounded-2xl relative overflow-hidden" style={{
        background: "linear-gradient(180deg, #2C1810 0%, #1A0E08 100%)",
        border: "2px solid #8B6914",
        boxShadow: `0 16px 48px rgba(0,0,0,0.6), 0 0 30px rgba(201,168,76,0.08), inset 0 1px 0 rgba(245,230,200,0.05)`,
      }}>
      <div className="p-4 max-h-[calc(100vh-180px)] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
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
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-sm transition"
          style={{ background: "linear-gradient(135deg, #3D2017, #2C1810)", border: "1px solid rgba(139,105,20,0.3)", color: "#C9A84C" }}
        >
          {"\u2715"}
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
            style={{
              background: `linear-gradient(145deg, #3D2017 0%, #2C1810 100%)`,
              border: `2px solid ${gradeColor}50`,
              boxShadow: `0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(245,230,200,0.05)`,
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
                className="bg-white/10 text-white font-bold text-base rounded-lg px-2 py-0.5 w-full outline-none border border-[#C9A84C]/30 focus:border-[#D4AF37]/60"
              />
            ) : (
              <h3
                className="font-bold text-base truncate cursor-pointer group flex items-center gap-1"
                style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}
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
            {/* Star badge */}
            {(slime.star_level ?? 0) > 0 && (
              <div className="flex items-center justify-center gap-0.5 mt-0.5">
                {Array.from({ length: slime.star_level ?? 0 }).map((_, i) => (
                  <span key={i} className="text-[10px]" style={{ color: "#FFD700", textShadow: "0 0 4px rgba(255,215,0,0.6)" }}>
                    {"\u2605"}
                  </span>
                ))}
                {Array.from({ length: 3 - (slime.star_level ?? 0) }).map((_, i) => (
                  <span key={i} className="text-[10px] opacity-20">{"\u2606"}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2 mb-3 p-2.5 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(61,32,23,0.4), rgba(44,24,16,0.3))", border: "1px solid rgba(139,105,20,0.15)" }}>
          <StatBar label="친밀도" value={slime.affection} color="#FF6B6B" icon={"\u2764\uFE0F"} warn={slime.affection < 20} warnText="외로워해요!" />
          <StatBar label="만복도" value={slime.hunger} color="#FFEAA7" icon={"\uD83C\uDF56"} warn={slime.hunger < 20} warnText="배고파요!" />
          <StatBar label="컨디션" value={slime.condition} color="#55EFC4" icon={"\u2728"} warn={slime.condition < 20} warnText="컨디션 나빠요!" />
        </div>

        {/* EXP bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] flex items-center gap-1" style={{ color: "#C9A84C", fontFamily: "Georgia, serif", fontWeight: 700 }}>
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

        {/* Talent Stats (IV) */}
        <TalentSection slime={slime} color={color} />

        {/* Skills */}
        <SkillSection slimeId={slime.id} slimeLevel={slime.level} token={token} />

        {/* Equipped accessories row */}
        {equipped.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 p-2 rounded-xl" style={{
            background: "linear-gradient(135deg, rgba(201,168,76,0.06), rgba(139,105,20,0.04))",
            border: "1px solid rgba(139,105,20,0.15)",
          }}>
            <span className="text-[10px] text-white/40 font-medium">장착:</span>
            {equipped.map((eq) => (
              <div key={eq.slot} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                style={{
                  background: "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(139,105,20,0.08))",
                  border: "1px solid rgba(139,105,20,0.2)",
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
            className="btn-icon-pixel"
            style={{ background: "linear-gradient(135deg, rgba(61,32,23,0.5), rgba(44,24,16,0.3))", border: "1px solid rgba(139,105,20,0.2)" }}
          >
            <span className="text-xl">{"\uD83C\uDF80"}</span>
            <div className="text-[10px] font-semibold text-[#B2BEC3]">꾸미기</div>
          </button>
        </div>

        {/* Collection submit button — compact in action area */}
        {(() => {
          const alreadySubmitted = collectionEntries.some(
            (e) => e.species_id === slime.species_id && e.personality === slime.personality
          );
          const requiredLevel = sp?.grade ? (collectionRequirements[sp.grade] ?? 3) : 3;
          const levelMet = slime.level >= requiredLevel;
          if (alreadySubmitted) return (
            <div className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#55EFC4]/[0.06] border border-[#55EFC4]/[0.12]">
              <span className="text-[#55EFC4] text-xs font-bold">{"\u2713"} 컬렉션 등록 완료</span>
            </div>
          );
          return (
            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={!levelMet}
              className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
              style={levelMet ? {
                background: "linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.1))",
                border: "1px solid rgba(201,168,76,0.35)",
                boxShadow: "0 2px 8px rgba(201,168,76,0.15)",
                color: "#D4AF37",
              } : {
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(178,190,195,0.5)",
                cursor: "not-allowed",
              }}
            >
              {!levelMet
                ? `컬렉션 제출 (Lv.${requiredLevel} 필요)`
                : `📜 컬렉션에 제출 (${personalityNames[slime.personality]})`}
            </button>
          );
        })()}
      </div>{/* end scrollable content */}
      </div>{/* end frosted-card */}

      {/* Collection submit modal — portalled to body, centered */}
      {showSubmitConfirm && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => !submitting && setShowSubmitConfirm(false)}
        >
          <div
            className="w-[320px] rounded-2xl overflow-hidden animate-bounce-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(180deg, #2C1810 0%, #1A0E08 100%)",
              border: "2px solid #8B6914",
              boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 40px rgba(201,168,76,0.1)",
            }}
          >
            {/* Header */}
            <div className="px-5 py-3 text-center" style={{
              background: "linear-gradient(180deg, #4A2515, #3D2017)",
              borderBottom: "2px solid #8B6914",
            }}>
              <h3 className="font-bold text-[15px]" style={{
                color: "#F5E6C8",
                fontFamily: "Georgia, 'Times New Roman', serif",
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              }}>📜 컬렉션 제출</h3>
            </div>

            <div className="p-5">
              {/* Slime preview card */}
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{
                background: "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(139,105,20,0.04))",
                border: "1px solid rgba(201,168,76,0.15)",
              }}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{
                  background: `linear-gradient(145deg, ${color}20, ${gradeColor}10)`,
                  border: `1px solid ${gradeColor}25`,
                }}>
                  <img
                    src={generateSlimeIconSvg(slime.element, 48, sp?.grade, equipped.map(e => e.svg_overlay).filter(Boolean), slime.species_id)}
                    alt="" className="w-12 h-12" draggable={false}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "#F5E6C8" }}>
                    {slime.name || sp?.name || "???"}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "#C9A84C" }}>
                    Lv.{slime.level} · {personalityNames[slime.personality]}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {sp && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: gradeColor + "18", color: gradeColor }}>
                        {gradeNames[sp.grade] || sp.grade}
                      </span>
                    )}
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: color + "20", color }}>
                      {elementNames[slime.element] || slime.element}
                    </span>
                  </div>
                </div>
              </div>

              {/* Personality collection progress */}
              <div className="mb-4 p-2.5 rounded-lg" style={{
                background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.1)",
              }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold" style={{ color: "#C9A84C" }}>성격 수집 현황</span>
                  <span className="text-[10px] font-bold" style={{ color: submittedPersonalities.size >= 6 ? "#55EFC4" : "#C9A84C" }}>
                    {submittedPersonalities.size}/6
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {ALL_PERSONALITIES.map((p) => {
                    const has = submittedPersonalities.has(p);
                    const isCurrent = p === slime.personality;
                    return (
                      <div key={p} className="flex flex-col items-center gap-0.5 flex-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isCurrent && !has ? "ring-2 ring-[#D4AF37]/50" : ""}`}
                          style={{
                            background: has ? "linear-gradient(135deg, #55EFC4, #00B894)" : isCurrent ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.06)",
                            border: has ? "1px solid rgba(85,239,196,0.5)" : "1px solid rgba(255,255,255,0.08)",
                            color: has ? "#fff" : isCurrent ? "#D4AF37" : "rgba(255,255,255,0.3)",
                          }}>
                          {has ? "✓" : personalityEmoji[p]}
                        </div>
                        <span className="text-[7px]" style={{ color: has ? "#55EFC4" : "rgba(255,255,255,0.25)" }}>
                          {personalityNames[p]?.slice(0, 2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Warning */}
              <div className="text-center mb-4 p-3 rounded-xl" style={{
                background: "linear-gradient(135deg, rgba(255,107,107,0.08), rgba(255,107,107,0.04))",
                border: "1px solid rgba(255,107,107,0.15)",
              }}>
                <p className="text-[#FF6B6B] text-xs font-bold">
                  ⚠️ 이 슬라임은 영구적으로 삭제됩니다
                </p>
                <p className="text-[#FF6B6B]/50 text-[10px] mt-1">
                  컬렉션에 등록되며 되돌릴 수 없습니다
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#B2BEC3" }}
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
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition active:scale-[0.97]"
                  style={{
                    background: submitting
                      ? "rgba(201,168,76,0.2)"
                      : "linear-gradient(135deg, #C9A84C, #8B6914)",
                    color: submitting ? "#C9A84C" : "#1A0E08",
                    opacity: submitting ? 0.6 : 1,
                    boxShadow: submitting ? "none" : "0 4px 12px rgba(201,168,76,0.3)",
                  }}
                >
                  {submitting ? "제출 중..." : "📜 제출하기"}
                </button>
              </div>
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
        <div className="flex-1 h-[7px] rounded-full overflow-hidden relative" style={{ background: "rgba(26,14,8,0.8)", border: "1px solid rgba(139,105,20,0.12)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)" }}>
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

// ===== Skill Section =====
interface SkillData {
  slot: number;
  skill_id: number;
  name: string;
  name_en: string;
  description: string;
  icon: string;
  skill_type: "passive" | "active";
  learn_level: number;
  can_learn: boolean;
  inherited?: boolean;
}

function SkillSection({ slimeId, slimeLevel, token }: { slimeId: string; slimeLevel: number; token: string }) {
  const [expanded, setExpanded] = useState(false);
  const [learned, setLearned] = useState<SkillData[]>([]);
  const [available, setAvailable] = useState<SkillData[]>([]);
  const [loading, setLoading] = useState(false);
  const [learning, setLearning] = useState<number | null>(null);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/slimes/${slimeId}/skills`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setLearned(data.skills || []);
      setAvailable(data.available || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [slimeId, token]);

  const handleLearn = async (skillId: number) => {
    setLearning(skillId);
    try {
      const res = await fetch(`/api/slimes/${slimeId}/learn-skill`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ skill_id: skillId }),
      });
      if (res.ok) {
        await fetchSkills();
      }
    } catch {
      // ignore
    } finally {
      setLearning(null);
    }
  };

  // Build slot map: learned skills by slot, then fill with available
  const slots: (SkillData & { status: "learned" | "available" | "locked" })[] = [];
  for (let s = 1; s <= 3; s++) {
    const l = learned.find((sk) => sk.slot === s);
    if (l) {
      slots.push({ ...l, status: "learned" });
    } else {
      const a = available.find((sk) => sk.slot === s);
      if (a) {
        slots.push({ ...a, status: a.can_learn ? "available" : "locked" });
      }
    }
  }

  const learnedCount = learned.length;
  const totalSlots = slots.length || available.length || 3;

  return (
    <div className="mb-3 rounded-xl overflow-hidden" style={{
      background: "linear-gradient(135deg, rgba(61,32,23,0.4), rgba(44,24,16,0.3))",
      border: "1px solid rgba(139,105,20,0.15)",
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs">{"\u26A1"}</span>
          <span className="text-[10px] font-bold" style={{ color: "#C9A84C" }}>스킬 (Skills)</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: "rgba(116,185,255,0.15)", color: "#74B9FF", border: "1px solid rgba(116,185,255,0.25)" }}>
            {learnedCount}/{totalSlots}
          </span>
        </div>
        <span className="text-[10px] text-[#B2BEC3] transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>
          {"\u25BC"}
        </span>
      </button>

      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2">
          {loading ? (
            <div className="text-center py-3">
              <span className="text-[10px] text-[#B2BEC3] animate-pulse">로딩 중...</span>
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-3">
              <span className="text-[10px] text-[#B2BEC3]/50">습득 가능한 스킬이 없습니다</span>
            </div>
          ) : (
            slots.map((sk) => {
              const isLearned = sk.status === "learned";
              const isAvailable = sk.status === "available";
              const isLocked = sk.status === "locked";
              const isLearning = learning === sk.skill_id;

              return (
                <div key={sk.slot} className="flex items-center gap-2.5 p-2 rounded-lg transition-colors" style={{
                  background: isLearned
                    ? "linear-gradient(135deg, rgba(85,239,196,0.08), rgba(0,184,148,0.04))"
                    : isAvailable
                    ? "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(139,105,20,0.04))"
                    : "rgba(255,255,255,0.02)",
                  border: isLearned
                    ? "1px solid rgba(85,239,196,0.2)"
                    : isAvailable
                    ? "1px solid rgba(201,168,76,0.2)"
                    : "1px solid rgba(255,255,255,0.05)",
                }}>
                  {/* Skill icon */}
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                    background: isLearned
                      ? "linear-gradient(135deg, rgba(85,239,196,0.15), rgba(0,184,148,0.1))"
                      : isAvailable
                      ? "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(139,105,20,0.08))"
                      : "rgba(255,255,255,0.04)",
                    border: isLearned ? "1px solid rgba(85,239,196,0.25)" : "1px solid rgba(255,255,255,0.06)",
                    opacity: isLocked ? 0.5 : 1,
                  }}>
                    <span className="text-lg">{sk.icon}</span>
                  </div>

                  {/* Skill info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold truncate" style={{
                        color: isLearned ? "#55EFC4" : isAvailable ? "#F5E6C8" : "#B2BEC3",
                        opacity: isLocked ? 0.5 : 1,
                      }}>
                        {sk.name}
                      </span>
                      <span className="text-[8px] px-1 py-0.5 rounded-full flex-shrink-0" style={{
                        background: sk.skill_type === "active" ? "rgba(255,107,107,0.12)" : "rgba(116,185,255,0.12)",
                        color: sk.skill_type === "active" ? "#FF6B6B" : "#74B9FF",
                        border: sk.skill_type === "active" ? "1px solid rgba(255,107,107,0.2)" : "1px solid rgba(116,185,255,0.2)",
                      }}>
                        {sk.skill_type === "active" ? "액티브" : "패시브"}
                      </span>
                      {isLearned && sk.inherited && (
                        <span className="text-[8px] px-1 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: "rgba(253,121,168,0.12)", color: "#FD79A8", border: "1px solid rgba(253,121,168,0.2)" }}>
                          유전
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] mt-0.5 truncate" style={{ color: isLocked ? "rgba(178,190,195,0.4)" : "rgba(178,190,195,0.7)" }}>
                      {sk.description}
                    </p>
                    {!isLearned && (
                      <span className="text-[8px] mt-0.5 inline-block" style={{
                        color: isAvailable ? "#C9A84C" : "rgba(178,190,195,0.4)",
                      }}>
                        Lv.{sk.learn_level} 필요 {isLocked ? `(현재 Lv.${slimeLevel})` : ""}
                      </span>
                    )}
                  </div>

                  {/* Action / Status */}
                  <div className="flex-shrink-0">
                    {isLearned ? (
                      <span className="text-[9px] font-bold px-2 py-1 rounded-full"
                        style={{ background: "rgba(85,239,196,0.1)", color: "#55EFC4", border: "1px solid rgba(85,239,196,0.2)" }}>
                        습득
                      </span>
                    ) : isAvailable ? (
                      <button
                        onClick={() => handleLearn(sk.skill_id)}
                        disabled={isLearning}
                        className="text-[9px] font-bold px-2.5 py-1 rounded-full transition-all active:scale-95"
                        style={{
                          background: isLearning
                            ? "rgba(201,168,76,0.15)"
                            : "linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.1))",
                          color: "#D4AF37",
                          border: "1px solid rgba(201,168,76,0.35)",
                          opacity: isLearning ? 0.6 : 1,
                        }}
                      >
                        {isLearning ? "..." : "습득"}
                      </button>
                    ) : (
                      <span className="text-[9px] px-2 py-1 rounded-full"
                        style={{ background: "rgba(255,255,255,0.03)", color: "rgba(178,190,195,0.4)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        {"\uD83D\uDD12"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ===== Talent Radar Section =====
const TALENT_LABELS: { key: string; label: string; color: string }[] = [
  { key: "talent_str", label: "STR", color: "#FF6B6B" },
  { key: "talent_vit", label: "VIT", color: "#55EFC4" },
  { key: "talent_spd", label: "SPD", color: "#74B9FF" },
  { key: "talent_int", label: "INT", color: "#A29BFE" },
  { key: "talent_cha", label: "CHA", color: "#FD79A8" },
  { key: "talent_lck", label: "LCK", color: "#FFEAA7" },
];

const TALENT_GRADE_COLORS: Record<string, string> = {
  S: "#FFD700",
  A: "#55EFC4",
  B: "#74B9FF",
  C: "#B2BEC3",
  D: "#636E72",
};

function TalentSection({ slime, color }: { slime: { talent_str?: number; talent_vit?: number; talent_spd?: number; talent_int?: number; talent_cha?: number; talent_lck?: number; talent_total?: number; talent_grade?: string }; color: string }) {
  const [expanded, setExpanded] = useState(false);
  const talentGrade = slime.talent_grade || "D";
  const talentTotal = slime.talent_total || 0;
  const gradeColor = TALENT_GRADE_COLORS[talentGrade] || "#B2BEC3";
  const talents = [slime.talent_str || 0, slime.talent_vit || 0, slime.talent_spd || 0, slime.talent_int || 0, slime.talent_cha || 0, slime.talent_lck || 0];
  const maxTalent = 31;

  return (
    <div className="mb-3 rounded-xl overflow-hidden" style={{
      background: "linear-gradient(135deg, rgba(61,32,23,0.4), rgba(44,24,16,0.3))",
      border: "1px solid rgba(139,105,20,0.15)",
    }}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs">{"\uD83E\uDDEC"}</span>
          <span className="text-[10px] font-bold" style={{ color: "#C9A84C" }}>재능 (Talent)</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black"
            style={{ backgroundColor: gradeColor + "20", color: gradeColor, border: `1px solid ${gradeColor}30` }}>
            {talentGrade}
          </span>
          <span className="text-[9px] text-[#B2BEC3] tabular-nums">{talentTotal}/186</span>
        </div>
        <span className="text-[10px] text-[#B2BEC3] transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>
          {"\u25BC"}
        </span>
      </button>

      {/* Expanded: hexagonal radar chart (simplified as bars) */}
      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-1.5">
          {TALENT_LABELS.map((t, i) => {
            const val = talents[i];
            const pct = (val / maxTalent) * 100;
            return (
              <div key={t.key} className="flex items-center gap-2">
                <span className="text-[9px] w-7 font-bold tabular-nums" style={{ color: t.color }}>{t.label}</span>
                <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{
                  background: "rgba(26,14,8,0.8)",
                  border: "1px solid rgba(139,105,20,0.08)",
                }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${t.color}, ${t.color}AA)`,
                      boxShadow: `0 0 4px ${t.color}40`,
                    }}
                  />
                </div>
                <span className="text-[9px] w-5 text-right font-bold tabular-nums" style={{ color: t.color }}>{val}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

