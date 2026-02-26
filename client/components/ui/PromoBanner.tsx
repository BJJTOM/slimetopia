"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGameStore } from "@/lib/store/gameStore";
import { useLocaleStore } from "@/lib/store/localeStore";

interface Promo {
  id: string;
  titleKey: string;
  subtitleKey: string;
  gradient: string;
  emoji: string;
  action: () => void;
  actionLabelKey: string;
  accentColor: string;
}

const AUTO_PLAY_INTERVAL = 5000;

export default function PromoBanner() {
  const { setActivePanel, setShowWheel, setShowRace } = useGameStore();
  const t = useLocaleStore((s) => s.t);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [sliding, setSliding] = useState(false);
  const touchStartRef = useRef<number>(0);
  const progressRef = useRef<number>(0);
  const animRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);

  const promos: Promo[] = [
    {
      id: "ten-pull",
      titleKey: "promo_ten_pull_title",
      subtitleKey: "promo_ten_pull_subtitle",
      gradient: "linear-gradient(135deg, rgba(255,234,167,0.12), rgba(255,159,243,0.08))",
      emoji: "\uD83E\uDD5A",
      action: () => setActivePanel("shop"),
      actionLabelKey: "promo_ten_pull_btn",
      accentColor: "#FFEAA7",
    },
    {
      id: "daily-wheel",
      titleKey: "promo_wheel_title",
      subtitleKey: "promo_wheel_subtitle",
      gradient: "linear-gradient(135deg, rgba(255,107,107,0.12), rgba(201,168,76,0.08))",
      emoji: "\uD83C\uDFB0",
      action: () => setShowWheel(true),
      actionLabelKey: "promo_wheel_btn",
      accentColor: "#FF6B6B",
    },
    {
      id: "race",
      titleKey: "promo_race_title",
      subtitleKey: "promo_race_subtitle",
      gradient: "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(116,185,255,0.08))",
      emoji: "\uD83C\uDFC3",
      action: () => setShowRace(true),
      actionLabelKey: "promo_race_btn",
      accentColor: "#C9A84C",
    },
    {
      id: "booster",
      titleKey: "promo_booster_title",
      subtitleKey: "promo_booster_subtitle",
      gradient: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(253,203,110,0.08))",
      emoji: "\u26A1",
      action: () => setActivePanel("shop"),
      actionLabelKey: "promo_booster_btn",
      accentColor: "#D4AF37",
    },
  ];

  const goTo = useCallback((idx: number, dir: "left" | "right") => {
    if (sliding) return;
    setDirection(dir);
    setSliding(true);
    setTimeout(() => {
      setCurrentIdx(idx);
      setSliding(false);
    }, 200);
    progressRef.current = 0;
    setProgress(0);
  }, [sliding]);

  const goNext = useCallback(() => {
    goTo((currentIdx + 1) % promos.length, "right");
  }, [currentIdx, promos.length, goTo]);

  const goPrev = useCallback(() => {
    goTo((currentIdx - 1 + promos.length) % promos.length, "left");
  }, [currentIdx, promos.length, goTo]);

  // Auto-play with progress
  useEffect(() => {
    if (paused) {
      cancelAnimationFrame(animRef.current);
      return;
    }
    lastTickRef.current = performance.now();
    const tick = (now: number) => {
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      progressRef.current += dt;
      const pct = Math.min((progressRef.current / AUTO_PLAY_INTERVAL) * 100, 100);
      setProgress(pct);
      if (progressRef.current >= AUTO_PLAY_INTERVAL) {
        goNext();
        progressRef.current = 0;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [paused, goNext]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    setPaused(true);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartRef.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    setPaused(false);
  };

  const promo = promos[currentIdx];

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
      style={{
        background: promo.gradient,
        border: `1px solid ${promo.accentColor}18`,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={promo.action}
    >
      {/* Content */}
      <div className={`p-3 flex items-center gap-3 transition-all duration-200 ${
        sliding
          ? direction === "right" ? "opacity-0 -translate-x-2" : "opacity-0 translate-x-2"
          : "opacity-100 translate-x-0"
      }`}>
        {/* Emoji */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${promo.accentColor}12`, border: `1px solid ${promo.accentColor}10` }}
        >
          <span className="text-xl">{promo.emoji}</span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="text-white text-[11px] font-bold">{t(promo.titleKey)}</div>
          <div className="text-white/40 text-[9px] mt-0.5">{t(promo.subtitleKey)}</div>
        </div>

        {/* Action button */}
        <button
          className="flex-shrink-0 text-[9px] font-bold px-3 py-1.5 rounded-full transition"
          style={{
            background: `${promo.accentColor}20`,
            color: promo.accentColor,
            border: `1px solid ${promo.accentColor}25`,
          }}
          onClick={(e) => { e.stopPropagation(); promo.action(); }}
        >
          {t(promo.actionLabelKey)} →
        </button>
      </div>

      {/* Nav arrows (visible on hover/pause) */}
      <button
        className={`absolute left-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-opacity ${
          paused ? "opacity-60" : "opacity-0"
        }`}
        style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
        onClick={(e) => { e.stopPropagation(); goPrev(); }}
      >
        <span className="text-[8px] text-white">‹</span>
      </button>
      <button
        className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-opacity ${
          paused ? "opacity-60" : "opacity-0"
        }`}
        style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
        onClick={(e) => { e.stopPropagation(); goNext(); }}
      >
        <span className="text-[8px] text-white">›</span>
      </button>

      {/* Bottom: progress dots */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 items-center">
        {promos.map((_, i) => (
          <div key={i} className="relative h-1 rounded-full overflow-hidden transition-all duration-300"
            style={{
              width: i === currentIdx ? 14 : 4,
              background: i === currentIdx ? `${promo.accentColor}30` : "rgba(255,255,255,0.15)",
            }}>
            {i === currentIdx && (
              <div className="absolute inset-y-0 left-0 rounded-full transition-none"
                style={{
                  width: `${progress}%`,
                  background: promo.accentColor,
                }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
