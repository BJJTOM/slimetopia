"use client";

import { useEffect, useState } from "react";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { gradeColors, gradeNames, personalityNames, elementNames } from "@/lib/constants";

interface CollectionRewardModalProps {
  speciesName: string;
  speciesId: number;
  element: string;
  grade: string;
  personality: string;
  goldReward: number;
  gemReward: number;
  isFirstOfSpecies: boolean;
  factionName?: string;
  factionProgress?: { completed: number; total: number };
  hasMoreRegisterable: boolean;
  onClose: () => void;
  onNextRegister: () => void;
}

export default function CollectionRewardModal({
  speciesName,
  speciesId,
  element,
  grade,
  personality,
  goldReward,
  gemReward,
  isFirstOfSpecies,
  factionName,
  factionProgress,
  hasMoreRegisterable,
  onClose,
  onNextRegister,
}: CollectionRewardModalProps) {
  const [show, setShow] = useState(false);
  const gColor = gradeColors[grade] || "#B2BEC3";

  // Grade-based glow colors
  const glowMap: Record<string, string> = {
    common: "rgba(178,190,195,0.3)",
    uncommon: "rgba(85,239,196,0.4)",
    rare: "rgba(116,185,255,0.5)",
    epic: "rgba(162,155,254,0.5)",
    legendary: "rgba(255,234,167,0.6)",
    mythic: "rgba(255,107,107,0.6)",
  };
  const glowColor = glowMap[grade] || "rgba(201,168,76,0.3)";

  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
  }, []);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 200);
  };

  const factionPct = factionProgress
    ? Math.round((factionProgress.completed / factionProgress.total) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{
        background: show ? "rgba(26,14,8,0.85)" : "rgba(26,14,8,0)",
        backdropFilter: show ? "blur(8px)" : "none",
        transition: "all 0.3s ease",
      }}
      onClick={handleClose}
    >
      {/* Confetti particles */}
      {show && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-sm"
              style={{
                left: `${5 + Math.random() * 90}%`,
                top: `-${Math.random() * 10}%`,
                background: [
                  "#D4AF37", "#FF6B6B", "#55EFC4", "#74B9FF",
                  "#A29BFE", "#FFEAA7", "#FD79A8", "#FDCB6E",
                ][i % 8],
                animation: `confetti-fall ${2 + Math.random() * 2}s ease-in ${Math.random() * 0.5}s forwards`,
                transform: `rotate(${Math.random() * 360}deg)`,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
      )}

      <div
        className="w-[88%] max-w-sm rounded-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(180deg, #2C1810 0%, #1A0E08 100%)",
          border: `2px solid ${gColor}`,
          boxShadow: `0 0 40px ${glowColor}, 0 8px 32px rgba(0,0,0,0.5)`,
          transform: show ? "scale(1) translateY(0)" : "scale(0.8) translateY(20px)",
          opacity: show ? 1 : 0,
          transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grade glow background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 30%, ${glowColor}, transparent 70%)`,
            animation: "reward-pulse 2s ease-in-out infinite",
          }}
        />

        {/* First species banner */}
        {isFirstOfSpecies && (
          <div
            className="relative z-10 text-center py-2"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)",
              borderBottom: "1px solid rgba(212,175,55,0.2)",
            }}
          >
            <span
              className="text-[11px] font-black tracking-wider"
              style={{ color: "#D4AF37" }}
            >
              NEW SPECIES FIRST ENTRY! x2 REWARD
            </span>
          </div>
        )}

        {/* Slime display */}
        <div className="flex flex-col items-center pt-6 pb-3 relative z-10">
          <div
            className="relative w-24 h-24 flex items-center justify-center rounded-full mb-3"
            style={{
              background: `radial-gradient(circle, ${gColor}20, transparent 70%)`,
              animation: "reward-float 3s ease-in-out infinite",
            }}
          >
            <img
              src={generateSlimeIconSvg(element, 80, grade, undefined, speciesId)}
              alt={speciesName}
              className="w-20 h-20"
              style={{
                filter: `drop-shadow(0 4px 12px ${glowColor})`,
              }}
              draggable={false}
            />
            {/* Gold stamp */}
            <div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #D4AF37, #C9A84C)",
                border: "2px solid #8B6914",
                boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
              }}
            >
              <span className="text-sm font-black" style={{ color: "#3D2017" }}>
                &#10003;
              </span>
            </div>
          </div>

          <h3
            className="text-lg font-bold mb-1"
            style={{
              color: "#F5E6C8",
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            {speciesName}
          </h3>

          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-[10px] px-2 py-0.5 rounded font-bold"
              style={{
                background: `${gColor}20`,
                color: gColor,
                border: `1px solid ${gColor}40`,
              }}
            >
              {gradeNames[grade] || grade}
            </span>
            <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.5)" }}>
              {elementNames[element] || element}
            </span>
            <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.5)" }}>
              {personalityNames[personality] || personality}
            </span>
          </div>

          {/* Rewards section */}
          <div
            className="w-full mx-6 px-6 py-3 rounded-xl mb-3"
            style={{
              background: "linear-gradient(135deg, rgba(139,105,20,0.12), rgba(61,32,23,0.2))",
              border: "1px solid rgba(139,105,20,0.2)",
            }}
          >
            <p
              className="text-[9px] text-center mb-2 tracking-wider font-bold"
              style={{ color: "#8B6914" }}
            >
              REWARDS
            </p>
            <div className="flex items-center justify-center gap-6">
              {goldReward > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">&#128176;</span>
                  <span
                    className="text-base font-black"
                    style={{
                      color: "#FFEAA7",
                      textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    }}
                  >
                    +{goldReward.toLocaleString()}
                  </span>
                </div>
              )}
              {gemReward > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">&#128142;</span>
                  <span
                    className="text-base font-black"
                    style={{
                      color: "#74B9FF",
                      textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    }}
                  >
                    +{gemReward}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Faction progress */}
          {factionName && factionProgress && (
            <div className="w-full px-6 mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-[9px] font-bold" style={{ color: "#C9A84C" }}>
                  {factionName}
                </span>
                <span className="text-[9px]" style={{ color: "rgba(201,168,76,0.6)" }}>
                  {factionProgress.completed}/{factionProgress.total}
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(139,105,20,0.2)",
                }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${factionPct}%`,
                    background:
                      factionPct >= 100
                        ? "linear-gradient(90deg, #2ECC71, #27AE60)"
                        : "linear-gradient(90deg, #8B6914, #D4AF37)",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="px-5 pb-5 flex gap-2 relative z-10">
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #3D2017, #2C1810)",
              color: "#C9A84C",
              border: "1px solid rgba(139,105,20,0.3)",
            }}
          >
            &#54869;&#51064;
          </button>
          {hasMoreRegisterable && (
            <button
              onClick={() => {
                setShow(false);
                setTimeout(onNextRegister, 200);
              }}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #C9A84C, #8B6914)",
                color: "#3D2017",
                boxShadow: "0 2px 8px rgba(212,175,55,0.3)",
              }}
            >
              &#45796;&#51020; &#46321;&#47197; &#8594;
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes reward-pulse {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes reward-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </div>
  );
}
