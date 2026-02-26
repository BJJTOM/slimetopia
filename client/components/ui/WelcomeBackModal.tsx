"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore } from "@/lib/store/gameStore";

export default function WelcomeBackModal() {
  const token = useAuthStore((s) => s.accessToken);
  const { idleStatus, fetchIdleStatus, collectIdleReward } = useGameStore();
  const [show, setShow] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collected, setCollected] = useState(false);
  const [goldCountUp, setGoldCountUp] = useState(0);

  useEffect(() => {
    if (token) {
      fetchIdleStatus(token);
    }
  }, [token, fetchIdleStatus]);

  useEffect(() => {
    if (idleStatus && idleStatus.total_gold > 0 && idleStatus.elapsed_minutes >= 5) {
      setShow(true);
    }
  }, [idleStatus]);

  // Animated gold count-up
  useEffect(() => {
    if (!show || !idleStatus) return;
    const target = idleStatus.total_gold;
    const duration = 1200;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setGoldCountUp(Math.floor(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [show, idleStatus]);

  if (!show || !idleStatus || collected) return null;

  const hours = Math.floor(idleStatus.elapsed_minutes / 60);
  const mins = idleStatus.elapsed_minutes % 60;
  const timeStr = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
  const isLongAbsence = idleStatus.elapsed_minutes >= 120; // 2+ hours

  const handleCollect = async () => {
    if (!token || collecting) return;
    setCollecting(true);
    await collectIdleReward(token);
    setCollecting(false);
    setCollected(true);
    setTimeout(() => setShow(false), 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="game-panel rounded-3xl p-8 w-[320px] text-center relative overflow-hidden animate-scale-in"
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            background: "radial-gradient(circle at 50% 30%, #FFEAA7, transparent 70%)",
          }}
        />

        {/* Shimmer sweep */}
        <div
          className="absolute inset-0 animate-gold-shimmer"
          style={{
            background: "linear-gradient(90deg, transparent 20%, rgba(255,234,167,0.06) 50%, transparent 80%)",
            backgroundSize: "200% 100%",
          }}
        />

        <div className="relative z-10">
          {/* Moon / Stars */}
          <div className="text-5xl mb-3 animate-celebrate-bounce">
            {isLongAbsence ? (
              <span role="img" aria-label="stars">🌙✨</span>
            ) : (
              <span role="img" aria-label="moon" style={{ filter: "drop-shadow(0 0 8px #FFEAA7)" }}>🌙</span>
            )}
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            돌아오신 것을 환영합니다!
          </h2>
          <p className="text-[#B2BEC3] text-xs mb-4">
            <span className="text-[#55EFC4] font-bold">{timeStr}</span> 동안 슬라임들이 열심히 일했어요
          </p>

          {/* Reward preview */}
          <div
            className="rounded-xl p-4 mb-4 relative overflow-hidden"
            style={{
              background: "rgba(255,234,167,0.08)",
              border: "1px solid rgba(255,234,167,0.15)",
            }}
          >
            {/* Floating gold particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-[#FFEAA7] animate-float"
                  style={{
                    left: `${15 + i * 14}%`,
                    top: `${20 + (i % 3) * 25}%`,
                    opacity: 0.3 + (i % 3) * 0.1,
                    animationDelay: `${i * 0.4}s`,
                    animationDuration: `${2 + (i % 3)}s`,
                  }}
                />
              ))}
            </div>

            <div className="relative flex items-center justify-center gap-3">
              <div>
                <span className="text-3xl font-bold text-[#FFEAA7] animate-number-pop" style={{ textShadow: "0 0 12px rgba(255,234,167,0.4)" }}>
                  {goldCountUp.toLocaleString()}
                </span>
                <span className="text-[#FFEAA7] text-sm ml-1">Gold</span>
              </div>
            </div>
            <div className="relative flex items-center justify-center gap-3 mt-2 text-[10px] text-[#B2BEC3]">
              <span>🐾 슬라임 {idleStatus.slime_count}마리</span>
              <span className="text-white/20">|</span>
              <span>📊 {idleStatus.gold_rate}G/분</span>
            </div>
          </div>

          <button
            onClick={handleCollect}
            disabled={collecting}
            className="btn-primary w-full py-3.5 text-sm active:scale-95 transition-transform"
          >
            {collecting ? "수령 중..." : "💰 수령하기"}
          </button>

          <button
            onClick={() => { setShow(false); setCollected(true); }}
            className="w-full mt-2 py-2 text-[10px] text-[#636e72] hover:text-white/60 transition"
          >
            나중에 받기
          </button>
        </div>
      </div>
    </div>
  );
}
