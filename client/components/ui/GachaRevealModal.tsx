"use client";

import { useEffect, useState, useMemo } from "react";
import { generateSlimeSvg, generateSlimeIconSvg } from "@/lib/slimeSvg";
import { elementNames, personalityNames, gradeColors, gradeNames, gradeRank } from "@/lib/constants";
import { toastReward } from "./Toast";
import type { Slime, SlimeSpecies } from "@/lib/store/gameStore";

interface Props {
  results: { slime: Slime; species: SlimeSpecies }[];
  onClose: () => void;
}

type Phase = "egg" | "crack" | "burst" | "reveal";

interface ConfettiPiece {
  x: number;
  color: string;
  delay: number;
  size: number;
  duration: number;
  rotation: number;
  drift: number;
  shape: "rect" | "circle" | "diamond";
}

export default function GachaRevealModal({ results, onClose }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("egg");
  const [showSummary, setShowSummary] = useState(false);
  const isMulti = results.length > 1;
  const current = results[currentIdx];
  const gradeColor = gradeColors[current.species.grade] || "#B2BEC3";
  const rank = gradeRank[current.species.grade] || 0;

  const confetti = useMemo(() => {
    const colors = [gradeColor, "#FFEAA7", "#74B9FF", "#FF6B6B", "#55EFC4", "#FF9FF3"];
    const shapes: ConfettiPiece["shape"][] = ["rect", "circle", "diamond"];
    return Array.from({ length: rank >= 3 ? 60 : 25 }, (_, i): ConfettiPiece => ({
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.8,
      size: 4 + Math.random() * 6,
      duration: 1.8 + Math.random() * 1.5,
      rotation: Math.random() * 360,
      drift: (Math.random() - 0.5) * 60,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeColor, rank, currentIdx]);

  useEffect(() => {
    setPhase("egg");
    const t1 = setTimeout(() => setPhase("crack"), 800);
    const t2 = setTimeout(() => setPhase("burst"), 1800);
    const t3 = setTimeout(() => {
      setPhase("reveal");
      if (rank >= 2) {
        toastReward(`${gradeNames[current.species.grade]} 등급 슬라임 획득!`, "🎉");
      }
    }, 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [currentIdx, rank, current.species.grade]);

  const handleNext = () => {
    if (currentIdx < results.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else if (isMulti && !showSummary) {
      setShowSummary(true);
    } else {
      onClose();
    }
  };

  const handleSkipAll = () => {
    if (isMulti) {
      setShowSummary(true);
    } else {
      onClose();
    }
  };

  // Multi-pull summary stats
  const summaryStats = useMemo(() => {
    if (!isMulti) return null;
    const gradeCount: Record<string, number> = {};
    let bestGrade = "common";
    for (const r of results) {
      const g = r.species.grade;
      gradeCount[g] = (gradeCount[g] || 0) + 1;
      if ((gradeRank[g] || 0) > (gradeRank[bestGrade] || 0)) bestGrade = g;
    }
    return { gradeCount, bestGrade };
  }, [results, isMulti]);

  // Summary view for multi-pull
  if (showSummary && isMulti) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md">
        <div className="relative flex flex-col items-center max-w-[360px] w-full px-4">
          {/* Title */}
          <div className="mb-4 text-center">
            <h2 className="text-white font-bold text-lg mb-1">소환 결과</h2>
            <p className="text-white/40 text-[11px]">{results.length}마리 획득</p>
          </div>

          {/* Grade distribution bar */}
          {summaryStats && (
            <div className="w-full flex items-center gap-2 mb-4">
              {Object.entries(summaryStats.gradeCount)
                .sort((a, b) => (gradeRank[b[0]] || 0) - (gradeRank[a[0]] || 0))
                .map(([grade, count]) => (
                  <div key={grade} className="flex items-center gap-1">
                    <span
                      className="text-[9px] font-bold px-1.5 py-px rounded-full"
                      style={{
                        background: `${gradeColors[grade] || "#B2BEC3"}20`,
                        color: gradeColors[grade] || "#B2BEC3",
                      }}
                    >
                      {gradeNames[grade] || grade}
                    </span>
                    <span className="text-[10px] font-bold" style={{ color: gradeColors[grade] }}>
                      x{count}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Grid of results */}
          <div className="w-full grid grid-cols-5 gap-2 mb-6">
            {results.map((r, i) => {
              const gc = gradeColors[r.species.grade] || "#B2BEC3";
              const rk = gradeRank[r.species.grade] || 0;
              return (
                <div
                  key={i}
                  className="flex flex-col items-center p-1.5 rounded-xl"
                  style={{
                    background: `${gc}10`,
                    border: `1px solid ${gc}20`,
                    animation: `gacha-grid-pop 0.3s ease-out ${i * 0.05}s both`,
                  }}
                >
                  <div className="relative">
                    <img
                      src={generateSlimeIconSvg(r.slime.element, 36, r.species.grade, undefined, r.species.id)}
                      alt="" className="w-9 h-9 drop-shadow-md" draggable={false}
                    />
                    {rk >= 3 && (
                      <div
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
                        style={{ background: gc, boxShadow: `0 0 6px ${gc}80` }}
                      >
                        <span className="text-[6px] text-black font-black">★</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] text-white/70 font-bold mt-0.5 truncate max-w-full text-center leading-tight">
                    {r.species.name}
                  </span>
                  <span className="text-[7px] font-bold" style={{ color: gc }}>
                    {gradeNames[r.species.grade]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="btn-primary py-2.5 px-12 text-sm active:scale-95 transition-transform font-bold"
          >
            확인
          </button>
        </div>

        <style jsx>{`
          @keyframes gacha-grid-pop {
            0% { opacity: 0; transform: scale(0.7); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md">
      {/* Background aura for high-grade */}
      {phase === "reveal" && rank >= 3 && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: 400,
            height: 400,
            background: `radial-gradient(circle, ${gradeColor}15 0%, ${gradeColor}05 40%, transparent 70%)`,
            animation: "gacha-aura-pulse 3s ease-in-out infinite",
          }}
        />
      )}

      {/* Confetti for rare+ */}
      {phase === "reveal" && rank >= 2 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confetti.map((p, i) => (
            <div
              key={i}
              className="absolute top-0"
              style={{
                left: `${p.x}%`,
                width: p.shape === "circle" ? p.size : p.size,
                height: p.shape === "circle" ? p.size : p.size * 0.6,
                backgroundColor: p.color,
                borderRadius: p.shape === "circle" ? "50%" : p.shape === "diamond" ? "2px" : "1px",
                animation: `gacha-confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
                opacity: 0,
                transform: `rotate(${p.rotation}deg)`,
                ["--drift" as string]: `${p.drift}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Star burst for legendary+ */}
      {phase === "reveal" && rank >= 4 && (
        <div className="absolute pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 origin-bottom"
              style={{
                width: 2,
                height: 80 + Math.random() * 40,
                background: `linear-gradient(to top, transparent, ${gradeColor}50, transparent)`,
                transform: `translate(-50%, -100%) rotate(${i * 30}deg)`,
                animation: `gacha-star-ray 2s ease-in-out ${i * 0.08}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* Light burst */}
      {phase === "burst" && (
        <div
          className="absolute animate-light-burst rounded-full"
          style={{
            width: rank >= 3 ? 200 : 150,
            height: rank >= 3 ? 200 : 150,
            background: `radial-gradient(circle, ${gradeColor}90 0%, ${gradeColor}30 40%, transparent 70%)`,
          }}
        />
      )}

      {/* Main content */}
      <div className="relative flex flex-col items-center">
        {/* Counter for multi-pull with progress bar */}
        {isMulti && (
          <div className="mb-4 flex flex-col items-center gap-1.5">
            <div
              className="px-3 py-1 rounded-full font-bold text-xs"
              style={{
                background: "rgba(162,155,254,0.1)",
                border: "1px solid rgba(162,155,254,0.2)",
                color: "#C8B6FF",
              }}
            >
              {currentIdx + 1} / {results.length}
            </div>
            {/* Progress dots */}
            <div className="flex gap-1">
              {results.map((r, i) => {
                const gc = gradeColors[r.species.grade] || "#B2BEC3";
                return (
                  <div
                    key={i}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      width: i === currentIdx ? 12 : 4,
                      background: i <= currentIdx ? gc : "rgba(255,255,255,0.15)",
                      boxShadow: i === currentIdx ? `0 0 4px ${gc}` : undefined,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Egg phase */}
        {(phase === "egg" || phase === "crack") && (
          <div className="relative">
            <div
              className={`text-8xl ${phase === "crack" ? "animate-egg-crack" : "animate-float"}`}
              style={phase === "egg" ? {
                filter: `drop-shadow(0 0 20px ${gradeColor}60)`,
              } : undefined}
            >
              🥚
            </div>
            {/* Glow under egg */}
            <div
              className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-24 h-4 rounded-full"
              style={{
                background: `radial-gradient(ellipse, ${gradeColor}30, transparent)`,
                animation: "glow-pulse 1.5s ease-in-out infinite",
              }}
            />
            {/* Crack particles */}
            {phase === "crack" && (
              <>
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 rounded-full"
                    style={{
                      width: i % 2 === 0 ? 3 : 2,
                      height: i % 2 === 0 ? 3 : 2,
                      background: i < 4 ? "#FFEAA7" : gradeColor,
                      animation: `sparkle-float 0.8s ease-out ${i * 0.08}s forwards`,
                      transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
                      boxShadow: `0 0 4px ${i < 4 ? "#FFEAA7" : gradeColor}`,
                    }}
                  />
                ))}
              </>
            )}
            {/* Grade hint glow during crack */}
            {phase === "crack" && rank >= 3 && (
              <div
                className="absolute inset-[-20px] rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${gradeColor}30, transparent)`,
                  animation: "gacha-grade-hint 0.8s ease-out forwards",
                }}
              />
            )}
          </div>
        )}

        {/* Reveal phase */}
        {(phase === "burst" || phase === "reveal") && (
          <div
            className={`flex flex-col items-center ${
              phase === "reveal" ? "animate-scale-in" : "opacity-0"
            }`}
          >
            {/* Slime image */}
            <div className="relative w-36 h-36 mb-4">
              {rank >= 3 && (
                <div
                  className="absolute inset-[-12px] rounded-full animate-[spin_6s_linear_infinite] border-2 border-dashed opacity-25"
                  style={{ borderColor: gradeColor }}
                />
              )}
              {rank >= 4 && (
                <div
                  className="absolute inset-[-20px] rounded-full animate-[spin_10s_linear_infinite_reverse] border border-dotted opacity-15"
                  style={{ borderColor: gradeColor }}
                />
              )}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${gradeColor}25 0%, transparent 70%)`,
                  boxShadow: `0 0 50px ${gradeColor}30`,
                }}
              />
              <img
                src={generateSlimeSvg(current.slime.element, current.slime.personality || "gentle", current.species.grade, current.slime.species_id)}
                alt={current.species.name}
                className="absolute inset-3 drop-shadow-2xl"
                style={{
                  filter: rank >= 4 ? `drop-shadow(0 0 16px ${gradeColor})` : undefined,
                  width: "120px",
                  height: "120px",
                }}
                draggable={false}
              />
            </div>

            {/* Name with stagger */}
            <h2
              className="text-2xl font-bold mb-1"
              style={{
                color: rank >= 3 ? gradeColor : "white",
                textShadow: rank >= 4 ? `0 0 20px ${gradeColor}80` : undefined,
                animation: "gacha-name-pop 0.4s ease-out 0.1s both",
              }}
            >
              {current.species.name}
            </h2>
            <p
              className="text-[11px] text-[#B2BEC3] mb-2"
              style={{ animation: "gacha-name-pop 0.4s ease-out 0.2s both" }}
            >
              {current.species.name_en}
            </p>

            {/* Grade + Element + Personality badges */}
            <div
              className="flex items-center gap-2 mb-4 flex-wrap justify-center"
              style={{ animation: "gacha-name-pop 0.4s ease-out 0.3s both" }}
            >
              <span
                className="text-[10px] px-3 py-1 rounded-full font-bold tracking-wider"
                style={{
                  backgroundColor: gradeColor + "25",
                  color: gradeColor,
                  border: `1px solid ${gradeColor}40`,
                  boxShadow: rank >= 3 ? `0 0 10px ${gradeColor}20` : undefined,
                }}
              >
                {(gradeNames[current.species.grade] || current.species.grade).toUpperCase()}
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded-full font-medium bg-white/5 text-[#B2BEC3]">
                {elementNames[current.species.element] || current.species.element}
              </span>
              {current.slime.personality && (
                <span className="text-[10px] px-2.5 py-1 rounded-full font-medium bg-white/5 text-[#B2BEC3]">
                  {personalityNames[current.slime.personality] || current.slime.personality}
                </span>
              )}
            </div>

            {/* Description */}
            <p
              className="text-[#B2BEC3] text-xs mb-6 max-w-[260px] leading-relaxed text-center"
              style={{ animation: "gacha-name-pop 0.4s ease-out 0.4s both" }}
            >
              {current.species.description}
            </p>

            {/* Buttons */}
            <div className="flex gap-2 w-full max-w-[260px]">
              {isMulti && currentIdx < results.length - 1 && (
                <button
                  onClick={handleSkipAll}
                  className="flex-1 py-2.5 text-xs text-[#B2BEC3] bg-white/5 rounded-xl hover:bg-white/10 transition font-medium active:scale-95"
                >
                  전체 보기
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex-1 btn-primary py-2.5 text-sm active:scale-95 transition-transform font-bold"
              >
                {currentIdx < results.length - 1 ? "다음 ▶" : isMulti ? "전체 보기" : "확인"}
              </button>
            </div>
          </div>
        )}

        {/* Tap to skip hint during egg animation */}
        {(phase === "egg" || phase === "crack") && (
          <button
            onClick={() => setPhase("reveal")}
            className="mt-8 text-[10px] text-[#B2BEC3]/50 hover:text-[#B2BEC3] transition"
          >
            탭하여 건너뛰기
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes gacha-confetti-fall {
          0% { opacity: 1; transform: translateY(-20px) rotate(0deg); }
          100% { opacity: 0; transform: translateY(100vh) translateX(var(--drift, 0px)) rotate(720deg); }
        }
        @keyframes gacha-aura-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes gacha-star-ray {
          0%, 100% { opacity: 0.15; transform: translate(-50%, -100%) rotate(var(--r, 0deg)) scaleY(0.8); }
          50% { opacity: 0.5; transform: translate(-50%, -100%) rotate(var(--r, 0deg)) scaleY(1.1); }
        }
        @keyframes gacha-name-pop {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes gacha-grade-hint {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes gacha-grid-pop {
          0% { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
