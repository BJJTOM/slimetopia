"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi } from "@/lib/api/client";
import { toastReward } from "./Toast";

interface WheelReward {
  id: number;
  name: string;
  icon: string;
  type: string;
  amount: number;
  color: string;
}

interface Props {
  onClose: () => void;
}

const WHEEL_COLORS = [
  "rgba(162,155,254,0.12)",
  "rgba(255,159,243,0.08)",
  "rgba(85,239,196,0.10)",
  "rgba(255,234,167,0.08)",
  "rgba(116,185,255,0.10)",
  "rgba(253,121,168,0.08)",
  "rgba(129,236,236,0.10)",
  "rgba(200,182,255,0.08)",
];

const RARITY_COLORS: Record<string, string> = {
  gold: "#FFEAA7",
  gem: "#A29BFE",
  egg: "#FF9FF3",
  item: "#55EFC4",
  stardust: "#81ECEC",
};

function getRewardRarity(reward: WheelReward): "common" | "rare" | "epic" {
  if (reward.type === "egg" || reward.type === "gem") return "epic";
  if (reward.amount >= 500) return "rare";
  return "common";
}

export default function DailyWheelModal({ onClose }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const [rewards, setRewards] = useState<WheelReward[]>([]);
  const [freeSpins, setFreeSpins] = useState(0);
  const [extraCost, setExtraCost] = useState(3);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<WheelReward | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [sparkles, setSparkles] = useState<{ x: number; y: number; delay: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!token) return;
    authApi<{ rewards: WheelReward[]; free_spins: number; extra_cost: number }>("/api/wheel", token)
      .then((res) => {
        setRewards(res.rewards);
        setFreeSpins(res.free_spins);
        setExtraCost(res.extra_cost);
      })
      .catch(() => {});
  }, [token]);

  // Generate sparkles during spin
  useEffect(() => {
    if (!spinning) {
      setSparkles([]);
      return;
    }
    const interval = setInterval(() => {
      setSparkles(prev => {
        const next = [...prev, {
          x: 140 + (Math.random() - 0.5) * 240,
          y: 140 + (Math.random() - 0.5) * 240,
          delay: 0,
        }];
        return next.slice(-12);
      });
    }, 200);
    return () => clearInterval(interval);
  }, [spinning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rewards.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 280;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 8;
    const segments = rewards.length;
    const segAngle = (Math.PI * 2) / segments;

    ctx.clearRect(0, 0, size, size);

    // Draw segments
    for (let i = 0; i < segments; i++) {
      const startAngle = i * segAngle + (rotation * Math.PI) / 180;
      const endAngle = startAngle + segAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();

      // Segment divider
      ctx.strokeStyle = "rgba(162,155,254,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Segment content
      const midAngle = startAngle + segAngle / 2;
      const textR = r * 0.65;
      const tx = cx + Math.cos(midAngle) * textR;
      const ty = cy + Math.sin(midAngle) * textR;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(midAngle + Math.PI / 2);

      ctx.font = "22px serif";
      ctx.textAlign = "center";
      ctx.fillText(rewards[i].icon, 0, -6);

      ctx.font = "bold 9px sans-serif";
      ctx.fillStyle = rewards[i].color;
      ctx.fillText(rewards[i].name, 0, 12);

      ctx.restore();
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(162,155,254,0.15)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(200,182,255,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tick dots around outer ring
    const dotCount = segments * 3;
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2;
      const dx = cx + Math.cos(angle) * (r + 6);
      const dy = cy + Math.sin(angle) * (r + 6);
      const isMajor = i % 3 === 0;

      ctx.beginPath();
      ctx.arc(dx, dy, isMajor ? 2.5 : 1.5, 0, Math.PI * 2);
      ctx.fillStyle = isMajor
        ? "rgba(200,182,255,0.35)"
        : "rgba(200,182,255,0.15)";
      ctx.fill();
    }

    // Center circle
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
    grad.addColorStop(0, "rgba(28,22,42,1)");
    grad.addColorStop(1, "rgba(18,15,30,1)");
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(162,155,254,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = spinning ? "#FF9FF3" : "#C8B6FF";
    ctx.textAlign = "center";
    ctx.fillText(spinning ? "..." : "SPIN", cx, cy + 4);
  }, [rewards, rotation, spinning]);

  const handleSpin = async (useGems: boolean) => {
    if (!token || spinning) return;
    setSpinning(true);
    setResult(null);
    setShowResult(false);

    try {
      const res = await authApi<{ reward_id: number; reward: WheelReward; free_spins: number }>(
        "/api/wheel/spin",
        token,
        { method: "POST", body: { use_gems: useGems } }
      );

      const segments = rewards.length;
      const segAngle = 360 / segments;
      const targetSegment = res.reward_id;
      const spins = 5 + Math.floor(Math.random() * 3);
      const targetRotation = spins * 360 + (360 - targetSegment * segAngle - segAngle / 2);

      const startRotation = rotation;
      const totalRotation = targetRotation;
      const duration = 4500;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Smooth deceleration curve
        const eased = 1 - Math.pow(1 - progress, 4);
        setRotation(startRotation + totalRotation * eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setSpinning(false);
          setResult(res.reward);
          setFreeSpins(res.free_spins);
          // Delay result card appearance for dramatic effect
          setTimeout(() => {
            setShowResult(true);
            toastReward(`${res.reward.icon} ${res.reward.name} 획득!`);
          }, 300);
          useAuthStore.getState().fetchUser();
        }
      };

      requestAnimationFrame(animate);
    } catch {
      setSpinning(false);
    }
  };

  const resultRarity = result ? getRewardRarity(result) : "common";
  const resultColor = result ? (RARITY_COLORS[result.type] || result.color) : "#B2BEC3";

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center modal-backdrop">
      <div className="modal-panel p-6 w-[340px] max-h-[90vh] overflow-y-auto text-center relative">
        {/* Decorative background orbs */}
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #FF9FF3, transparent)" }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #A29BFE, transparent)" }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #FF6B6B30, #FF9FF320)" }}
            >
              <span className={`text-xl ${spinning ? "animate-spin" : ""}`}>🎰</span>
            </div>
            <div className="text-left">
              <h2 className="text-white font-bold text-[15px]">행운의 룰렛</h2>
              {freeSpins > 0 && (
                <span className="text-[9px] font-bold text-[#55EFC4]">
                  무료 {freeSpins}회 남음
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] transition text-white/40 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>

        {/* Wheel */}
        <div className="relative mx-auto w-[280px] h-[280px] mb-4">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
            <div
              className={`w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent transition-transform ${
                spinning ? "scale-110" : ""
              }`}
              style={{
                borderTopColor: "#FF6B6B",
                filter: `drop-shadow(0 2px 6px rgba(255,107,107,${spinning ? "0.8" : "0.5"}))`,
              }}
            />
          </div>

          {/* Spin sparkle particles */}
          {spinning && sparkles.map((s, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
              style={{
                left: s.x,
                top: s.y,
                background: "#FFEAA7",
                boxShadow: "0 0 4px #FFEAA7",
                animation: "wheel-sparkle 0.6s ease-out forwards",
              }}
            />
          ))}

          <canvas
            ref={canvasRef}
            className={`w-full h-full ${spinning ? "animate-wheel-glow" : ""}`}
            style={{ borderRadius: "50%" }}
          />

          {/* Outer glow ring during spin */}
          {spinning && (
            <div
              className="absolute inset-[-4px] rounded-full pointer-events-none"
              style={{
                border: "2px solid rgba(162,155,254,0.3)",
                boxShadow: "0 0 20px rgba(162,155,254,0.2), inset 0 0 20px rgba(162,155,254,0.1)",
                animation: "wheel-ring-pulse 1s ease-in-out infinite",
              }}
            />
          )}
        </div>

        {/* Result */}
        {result && showResult && (
          <div
            className="mb-4 p-4 rounded-2xl relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${resultColor}18, ${resultColor}08)`,
              border: `1px solid ${resultColor}30`,
              boxShadow: resultRarity !== "common"
                ? `0 0 30px ${resultColor}20, 0 0 60px ${resultColor}10`
                : `0 0 20px ${resultColor}15`,
              animation: "wheel-result-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
            }}
          >
            {/* Shimmer */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent, ${resultColor}12, transparent)`,
                animation: "wheel-shimmer 2s ease-in-out infinite",
              }}
            />

            {/* Rarity burst for rare+ */}
            {resultRarity !== "common" && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 w-px origin-bottom"
                    style={{
                      height: 60,
                      background: `linear-gradient(to top, transparent, ${resultColor}40)`,
                      transform: `translate(-50%, -100%) rotate(${i * 45}deg)`,
                      animation: `wheel-ray 2s ease-in-out ${i * 0.1}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}

            <span
              className="text-4xl inline-block relative z-10"
              style={{ animation: "wheel-icon-bounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s both" }}
            >
              {result.icon}
            </span>
            <p className="text-white font-bold text-sm mt-1 relative z-10">{result.name}</p>
            {result.amount > 0 && (
              <p
                className="text-[12px] mt-0.5 font-black relative z-10"
                style={{ color: resultColor }}
              >
                +{result.amount.toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Spin buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSpin(false)}
            disabled={spinning || freeSpins <= 0}
            className={`flex-1 btn-primary py-3 text-xs font-bold active:scale-95 transition-transform ${
              freeSpins > 0 && !spinning ? "animate-heartbeat" : ""
            }`}
          >
            {spinning ? (
              <span className="inline-flex items-center gap-1">
                <span className="animate-spin text-sm">🎰</span> 회전 중...
              </span>
            ) : freeSpins > 0 ? (
              `🎰 무료 스핀 (${freeSpins}회)`
            ) : (
              "스핀 소진"
            )}
          </button>
          <button
            onClick={() => handleSpin(true)}
            disabled={spinning}
            className="flex-1 btn-secondary py-3 text-xs font-bold active:scale-95 transition-transform"
          >
            💎 {extraCost}젬 추가 스핀
          </button>
        </div>

        {/* Hint */}
        {freeSpins > 0 && !spinning && !result && (
          <p
            className="text-[10px] mt-3 font-medium"
            style={{
              background: "linear-gradient(90deg, #A29BFE, #FF9FF3)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            매일 무료 1회 스핀!
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes wheel-sparkle {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0); }
        }
        @keyframes wheel-ring-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes wheel-result-pop {
          0% { opacity: 0; transform: scale(0.8) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes wheel-shimmer {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes wheel-icon-bounce {
          0% { transform: scale(0) rotate(-20deg); }
          60% { transform: scale(1.3) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes wheel-ray {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
