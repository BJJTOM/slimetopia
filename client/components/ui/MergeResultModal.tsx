"use client";

import { useEffect, useState, useMemo } from "react";
import { useGameStore } from "@/lib/store/gameStore";
import { generateSlimeSvg } from "@/lib/slimeSvg";
import { gradeColors, gradeNames, gradeRank } from "@/lib/constants";
import { toastReward, toastSuccess } from "./Toast";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  rotation: number;
  duration: number;
}

function Confetti({ color, count }: { color: string; count: number }) {
  const pieces = useMemo(() => {
    const colors = [color, "#FFEAA7", "#74B9FF", "#FF6B6B", "#55EFC4", "#A29BFE"];
    return Array.from({ length: count }, (_, i): ConfettiPiece => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.6,
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
      duration: 1.5 + Math.random() * 1.5,
    }));
  }, [color, count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: "1px",
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            opacity: 0,
            animationFillMode: "forwards",
          }}
        />
      ))}
    </div>
  );
}

export default function MergeResultModal() {
  const { showMergeResult, clearMergeResult, collectionEntries, setActivePanel,
          recipes, slimes, setMergeSlot, selectSlime } = useGameStore();
  const [phase, setPhase] = useState<"burst" | "reveal" | "shown">("burst");

  useEffect(() => {
    if (!showMergeResult) {
      setPhase("burst");
      return;
    }
    setPhase("burst");
    const t1 = setTimeout(() => setPhase("reveal"), 800);
    const t2 = setTimeout(() => setPhase("shown"), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [showMergeResult]);

  useEffect(() => {
    if (showMergeResult && phase === "shown") {
      const { species } = showMergeResult.result;
      if (gradeRank[species.grade] >= 2) {
        toastReward(`${gradeNames[species.grade]} 등급 합성 성공!`, "✨");
      }
      if (showMergeResult.new_discovery) {
        toastSuccess(`새로운 레시피 발견! ${species.name}`, "📖");
      }
    }
  }, [phase, showMergeResult]);

  if (!showMergeResult) return null;

  const { merge_type, result } = showMergeResult;
  const { slime, species } = result;
  const gradeColor = gradeColors[species.grade] || "#B2BEC3";
  const rank = gradeRank[species.grade] || 0;
  const confettiCount = rank >= 4 ? 60 : rank >= 2 ? 35 : 15;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Light burst */}
      {phase === "burst" && (
        <div
          className="absolute animate-light-burst rounded-full"
          style={{
            width: 120,
            height: 120,
            background: `radial-gradient(circle, ${gradeColor}80 0%, ${gradeColor}20 50%, transparent 70%)`,
          }}
        />
      )}

      {/* Confetti for rare+ */}
      {rank >= 2 && <Confetti color={gradeColor} count={confettiCount} />}

      <div
        className={`frosted-card rounded-3xl p-8 w-[340px] text-center relative overflow-hidden ${
          phase === "burst" ? "opacity-0 scale-50" : phase === "reveal" ? "animate-card-flip" : "animate-scale-in"
        }`}
        style={{
          transition: phase === "burst" ? "none" : "opacity 0.3s, transform 0.3s",
          borderColor: `${gradeColor}20`,
          boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 60px ${gradeColor}10, inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${gradeColor}, transparent 70%)`,
          }}
        />

        {/* Shimmer overlay for legendary+ */}
        {rank >= 4 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent 20%, ${gradeColor}15 50%, transparent 80%)`,
              backgroundSize: "200% 100%",
              animation: "grade-shimmer 2s linear infinite",
            }}
          />
        )}

        <div className="relative z-10">
          {/* Type badges */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
            <span className="inline-block text-[10px] text-[#B2BEC3] px-3 py-1 rounded-full bg-white/5 tracking-wider uppercase font-medium">
              {merge_type === "combination" ? (rank >= 4 ? "✨ 조합" : "⚗️ 조합") : merge_type === "mutation" ? "🧬 돌연변이" : merge_type === "catalyzed" ? "🔮 촉매 합성" : "⬆️ 업그레이드"}
            </span>
            {showMergeResult.is_mutation && (
              <span className="inline-block text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wider" style={{ background: "rgba(253,121,168,0.2)", color: "#FD79A8", border: "1px solid rgba(253,121,168,0.3)" }}>
                🧬 MUTATION
              </span>
            )}
            {showMergeResult.is_great_success && (
              <span className="inline-block text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wider" style={{ background: "rgba(255,234,167,0.2)", color: "#FFEAA7", border: "1px solid rgba(255,234,167,0.3)" }}>
                GREAT!
              </span>
            )}
            {showMergeResult.is_first_discovery && (
              <span className="inline-block text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wider" style={{ background: "rgba(85,239,196,0.2)", color: "#55EFC4", border: "1px solid rgba(85,239,196,0.3)" }}>
                FIRST!
              </span>
            )}
          </div>

          {/* Slime visual */}
          <div className="relative mx-auto w-40 h-40 mb-4">
            {/* Pulsing glow ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${gradeColor}30 0%, transparent 70%)`,
                boxShadow: `0 0 60px ${gradeColor}40`,
                animation: "glow-pulse 2s ease-in-out infinite",
              }}
            />
            {/* Sparkle ring for epic+ */}
            {rank >= 3 && (
              <div className="absolute inset-[-8px] rounded-full border-2 border-dashed animate-[spin_8s_linear_infinite] opacity-30" style={{ borderColor: gradeColor }} />
            )}
            {/* Particle ring for rare+ */}
            {rank >= 2 && (
              <div className="absolute inset-[-12px]">
                {Array.from({ length: rank >= 4 ? 12 : rank >= 3 ? 8 : 5 }).map((_, i) => {
                  const angle = (i / (rank >= 4 ? 12 : rank >= 3 ? 8 : 5)) * 360;
                  return (
                    <div
                      key={i}
                      className="absolute w-1.5 h-1.5 rounded-full"
                      style={{
                        background: gradeColor,
                        top: "50%",
                        left: "50%",
                        transform: `rotate(${angle}deg) translateY(-${rank >= 4 ? 88 : 76}px)`,
                        boxShadow: `0 0 8px ${gradeColor}`,
                        animation: `glow-pulse ${1.5 + (i % 3) * 0.3}s ease-in-out infinite`,
                        animationDelay: `${(i / (rank >= 4 ? 12 : rank >= 3 ? 8 : 5)) * 0.4}s`,
                      }}
                    />
                  );
                })}
              </div>
            )}
            <img
              src={generateSlimeSvg(slime.element, slime.personality || "gentle", species.grade, slime.species_id)}
              alt={species.name}
              className="absolute inset-2 w-36 h-36 drop-shadow-xl"
              style={{ filter: rank >= 4 ? `drop-shadow(0 0 16px ${gradeColor})` : rank >= 2 ? `drop-shadow(0 0 8px ${gradeColor}80)` : undefined }}
              draggable={false}
            />
          </div>

          {/* Name with grade color */}
          <h2
            className="text-2xl font-bold mb-0.5 animate-number-pop"
            style={{
              color: rank >= 3 ? gradeColor : "white",
              textShadow: rank >= 4 ? `0 0 16px ${gradeColor}60` : undefined,
            }}
          >
            {species.name}
          </h2>
          <p className="text-xs text-[#B2BEC3] mb-2">{species.name_en}</p>

          {/* Grade badge */}
          <span
            className="inline-block text-[10px] px-4 py-1.5 rounded-full font-bold tracking-wider mb-3"
            style={{
              backgroundColor: gradeColor + "25",
              color: gradeColor,
              boxShadow: `0 0 16px ${gradeColor}30`,
              border: `1px solid ${gradeColor}40`,
            }}
          >
            {(gradeNames[species.grade] || species.grade).toUpperCase()}
          </span>

          {/* Description */}
          <p className="text-[#B2BEC3] text-xs mb-6 leading-relaxed">{species.description}</p>

          {/* Flow connection buttons */}
          {(() => {
            const alreadySubmitted = collectionEntries.some(
              (e) => e.species_id === slime.species_id && e.personality === slime.personality
            );
            const ownedSpeciesIds = new Set(slimes.map(s => s.species_id));
            const nextRecipe = recipes.find(r =>
              !r.discovered && !r.hidden &&
              ownedSpeciesIds.has(r.input_a) && ownedSpeciesIds.has(r.input_b)
            );
            return (
              <div className="flex flex-col gap-2 w-full">
                {!alreadySubmitted && (
                  <button
                    onClick={() => {
                      selectSlime(slime.id);
                      clearMergeResult();
                    }}
                    className="w-full py-2.5 text-xs font-bold rounded-xl transition active:scale-95"
                    style={{
                      background: "rgba(85,239,196,0.1)",
                      border: "1px solid rgba(85,239,196,0.2)",
                      color: "#55EFC4",
                    }}
                  >
                    컬렉션 등록 →
                  </button>
                )}
                {nextRecipe && (
                  <button
                    onClick={() => {
                      const slimeA = slimes.find(s => s.species_id === nextRecipe.input_a);
                      const slimeB = slimes.find(s => s.species_id === nextRecipe.input_b && s.id !== slimeA?.id);
                      if (slimeA) setMergeSlot("A", slimeA.id);
                      if (slimeB) setMergeSlot("B", slimeB.id);
                      clearMergeResult();
                    }}
                    className="w-full py-2.5 text-xs font-bold rounded-xl transition active:scale-95"
                    style={{
                      background: "rgba(201,168,76,0.12)",
                      border: "1px solid rgba(201,168,76,0.25)",
                      color: "#D4AF37",
                    }}
                  >
                    추천 합성하기 →
                  </button>
                )}
                <button
                  onClick={clearMergeResult}
                  className="btn-primary w-full py-3 text-sm active:scale-95 transition-transform"
                >
                  확인
                </button>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
