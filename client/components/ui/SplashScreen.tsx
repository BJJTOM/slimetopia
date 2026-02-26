"use client";

import { useState, useEffect, useMemo } from "react";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { useLocaleStore } from "@/lib/store/localeStore";

const TIPS = [
  "splash_tip_collect",
  "splash_tip_merge",
  "splash_tip_explore",
  "splash_tip_evolve",
  "splash_tip_collection",
];

const PARTICLE_COUNT = 24;
const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  size: 2 + ((i * 7 + 3) % 4),
  x: (i * 37 + 13) % 100,
  y: (i * 29 + 7) % 100,
  opacity: 0.15 + ((i * 11) % 5) * 0.06,
  dur: 3 + ((i * 13) % 5),
  delay: ((i * 7) % 30) / 10,
}));

interface SplashScreenProps {
  onFinished?: () => void;
  minDuration?: number;
}

export default function SplashScreen({ onFinished, minDuration = 2000 }: SplashScreenProps) {
  const t = useLocaleStore((s) => s.t);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  const mascot = useMemo(() => generateSlimeIconSvg("grass", 120, "rare"), []);
  const orbitSlimes = useMemo(() => [
    generateSlimeIconSvg("water", 36, "common"),
    generateSlimeIconSvg("fire", 36, "common"),
    generateSlimeIconSvg("light", 28, "epic"),
    generateSlimeIconSvg("ice", 28, "uncommon"),
  ], []);

  // Progress bar animation
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / minDuration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        setFadeOut(true);
        setTimeout(() => onFinished?.(), 500);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [minDuration, onFinished]);

  // Cycle tips
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      style={{
        background: "radial-gradient(ellipse at 50% 30%, #0e1a2d 0%, #060a18 50%, #020408 100%)",
      }}
    >
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: p.opacity,
              background: i % 3 === 0 ? "#55EFC4" : i % 3 === 1 ? "#74B9FF" : "#A29BFE",
              animation: `glow-pulse ${p.dur}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Ambient glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 300,
          height: 300,
          left: "50%",
          top: "38%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(85,239,196,0.12) 0%, rgba(116,185,255,0.06) 40%, transparent 70%)",
          filter: "blur(30px)",
          animation: "glow-pulse 4s ease-in-out infinite",
        }}
      />

      {/* Mascot with orbiting slimes */}
      <div className="relative mb-8" style={{ width: 200, height: 200 }}>
        {/* Orbiting slimes */}
        {orbitSlimes.map((svg, i) => (
          <img
            key={i}
            src={svg}
            alt=""
            draggable={false}
            className="absolute"
            style={{
              width: i < 2 ? 36 : 28,
              height: i < 2 ? 36 : 28,
              left: "50%",
              top: "50%",
              marginLeft: i < 2 ? -18 : -14,
              marginTop: i < 2 ? -18 : -14,
              opacity: 0.6,
              animation: `splash-orbit ${8 + i * 2}s linear infinite`,
              animationDelay: `${i * -2}s`,
              transformOrigin: "center center",
              filter: `drop-shadow(0 0 8px rgba(${i === 0 ? "116,185,255" : i === 1 ? "255,107,107" : i === 2 ? "255,234,167" : "116,220,255"},0.4))`,
            }}
          />
        ))}

        {/* Main mascot */}
        <img
          src={mascot}
          alt="SlimeTopia"
          draggable={false}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 120,
            height: 120,
            animation: "float 3s ease-in-out infinite",
            filter: "drop-shadow(0 0 32px rgba(85,239,196,0.5))",
          }}
        />

        {/* Ground glow */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: 10,
            width: 100,
            height: 16,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(85,239,196,0.3), transparent 70%)",
            filter: "blur(8px)",
          }}
        />
      </div>

      {/* Title */}
      <h1
        className="text-4xl font-extrabold tracking-tight mb-2"
        style={{
          background: "linear-gradient(135deg, #55EFC4, #74B9FF, #A29BFE)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 0 20px rgba(85,239,196,0.3))",
        }}
      >
        SlimeTopia
      </h1>

      {/* Tip text */}
      <div className="h-5 mt-3 mb-8 relative overflow-hidden" style={{ width: 260 }}>
        <p
          key={tipIndex}
          className="text-white/40 text-xs text-center font-medium animate-fade-in-up absolute inset-0"
        >
          {t(TIPS[tipIndex])}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-100 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #55EFC4, #74B9FF, #A29BFE)",
            boxShadow: "0 0 12px rgba(85,239,196,0.4)",
          }}
        />
      </div>

      {/* Loading text */}
      <p className="text-white/25 text-[10px] mt-3 tracking-widest font-medium">
        {t("splash_loading")}
      </p>
    </div>
  );
}
