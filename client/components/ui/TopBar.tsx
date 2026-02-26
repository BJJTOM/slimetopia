"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore } from "@/lib/store/gameStore";
import { authApi, resolveMediaUrl } from "@/lib/api/client";
import { gradeColors } from "@/lib/constants";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";

interface ActiveBooster {
  type: string;
  remaining_seconds: number;
}

const boosterConfig: Record<string, { icon: string; label: string; color: string }> = {
  exp_2x: { icon: "📖", label: "EXP", color: "#74B9FF" },
  gold_2x: { icon: "💰", label: "골드", color: "#FFEAA7" },
  luck_up: { icon: "🍀", label: "행운", color: "#55EFC4" },
};

const GRADE_PRIORITY: Record<string, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5,
};

function formatBoosterTime(seconds: number): string {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h${rm}m` : `${h}h`;
}

export default function TopBar() {
  const user = useAuthStore((s) => s.user);
  const slimes = useGameStore((s) => s.slimes);
  const species = useGameStore((s) => s.species);
  const equippedAccessories = useGameStore((s) => s.equippedAccessories);

  const { bestSlime, highestGrade } = useMemo(() => {
    let hg = "common";
    let bs = slimes[0];
    for (const sl of slimes) {
      const sp = species.find((s) => s.id === sl.species_id);
      if (sp && (GRADE_PRIORITY[sp.grade] || 0) > (GRADE_PRIORITY[hg] || 0)) {
        hg = sp.grade;
        bs = sl;
      }
    }
    return { bestSlime: bs, highestGrade: hg };
  }, [slimes, species]);

  const glowColor = gradeColors[highestGrade] || gradeColors.common;
  const bestSpecies = bestSlime ? species.find(s => s.id === bestSlime.species_id) : undefined;

  const token = useAuthStore((s) => s.accessToken);
  const [boosters, setBoosters] = useState<ActiveBooster[]>([]);
  const [liveBoosterSeconds, setLiveBoosterSeconds] = useState<Record<string, number>>({});

  const fetchBoosters = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authApi<{ boosters: ActiveBooster[] }>("/api/boosters", token);
      const b = res.boosters || [];
      setBoosters(b);
      const live: Record<string, number> = {};
      for (const booster of b) {
        live[booster.type] = booster.remaining_seconds;
      }
      setLiveBoosterSeconds(live);
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    fetchBoosters();
    const interval = setInterval(fetchBoosters, 30000);
    return () => clearInterval(interval);
  }, [fetchBoosters]);

  useEffect(() => {
    if (boosters.length === 0) return;
    const interval = setInterval(() => {
      setLiveBoosterSeconds(prev => {
        const next = { ...prev };
        let anyPositive = false;
        for (const key of Object.keys(next)) {
          next[key] = Math.max(0, next[key] - 1);
          if (next[key] > 0) anyPositive = true;
        }
        if (!anyPositive) clearInterval(interval);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [boosters]);

  const levelProgress = user ? Math.min((user.level * 15) % 100, 100) : 0;

  if (!user) return null;

  return (
    <div className="top-hud">
      <div className="flex items-center justify-between w-full gap-2">
        {/* Left: Avatar + Name */}
        <div className="profile-section pointer-events-auto shrink-0">
          <div className="relative">
            <div
              className="w-[48px] h-[48px] rounded-2xl flex items-center justify-center overflow-hidden"
              style={{
                background: highestGrade !== "common"
                  ? `linear-gradient(135deg, ${glowColor}40, ${glowColor}18)`
                  : "linear-gradient(135deg, rgba(0,210,211,0.25), rgba(255,234,167,0.15))",
                border: `2px solid ${highestGrade !== "common" ? glowColor + "60" : "rgba(255,255,255,0.12)"}`,
                boxShadow: highestGrade !== "common"
                  ? `0 4px 20px ${glowColor}25`
                  : "0 4px 16px rgba(0,0,0,0.3)",
              }}
            >
              {user.profile_image_url ? (
                <img
                  src={resolveMediaUrl(user.profile_image_url)}
                  alt="" className="w-full h-full object-cover" draggable={false}
                />
              ) : bestSlime ? (
                <img
                  src={generateSlimeIconSvg(bestSlime.element, 36, bestSpecies?.grade, (equippedAccessories[bestSlime.id] || []).map(e => e.svg_overlay).filter(Boolean), bestSlime.species_id)}
                  alt="" className="w-[36px] h-[36px] drop-shadow-lg" draggable={false}
                />
              ) : (
                <span className="text-lg font-bold text-[#55EFC4]">{user.nickname[0]}</span>
              )}
            </div>
            <div
              className="absolute -bottom-1 -right-1 rounded-lg w-[20px] h-[20px] flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${glowColor}, ${glowColor}CC)`,
                border: "2px solid rgba(10,8,20,0.9)",
                boxShadow: `0 2px 6px ${glowColor}40`,
              }}
            >
              <span className="text-[8px] text-[#0a0814] font-black">{user.level}</span>
            </div>
          </div>

          <div className="min-w-0 flex flex-col justify-center gap-0.5">
            <span className="text-white font-extrabold text-[12px] truncate max-w-[70px] leading-tight">
              {user.nickname}
            </span>
            {/* Boosters */}
            <div className="flex items-center gap-1 flex-wrap">
              {boosters.filter(b => (liveBoosterSeconds[b.type] ?? b.remaining_seconds) > 0).map((b) => {
                const config = boosterConfig[b.type] || { icon: "⚡", label: "부스트", color: "#00D2D3" };
                const secs = liveBoosterSeconds[b.type] ?? b.remaining_seconds;
                const isLow = secs < 300;
                return (
                  <div key={b.type} className="rounded-md px-1 py-[1px] flex items-center gap-0.5"
                    style={{ background: `${config.color}12`, border: `1px solid ${isLow ? "#FF6B6B30" : config.color + "20"}` }}>
                    <span className="text-[7px]">{config.icon}</span>
                    <span className={`text-[7px] font-bold tabular-nums ${isLow ? "animate-pulse" : ""}`}
                      style={{ color: isLow ? "#FF6B6B" : config.color }}>
                      {formatBoosterTime(secs)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: EXP bar — pastel pixel-art style */}
        <div className="pointer-events-auto flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-[2px]">
            <span className="text-[10px] font-black tracking-wider"
              style={{ color: glowColor, textShadow: `0 0 6px ${glowColor}40` }}>
              Lv.{user.level}
            </span>
            <span className="text-[10px] font-bold tabular-nums text-white/50">
              {Math.floor(levelProgress)}%
            </span>
          </div>
          <div className="relative">
            <div
              className="w-full h-[10px] rounded-lg overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div
                className="h-full rounded-md transition-all duration-700 relative overflow-hidden"
                style={{
                  width: `${levelProgress}%`,
                  background: `linear-gradient(180deg, ${glowColor}DD 0%, ${glowColor}88 100%)`,
                  boxShadow: `0 0 8px ${glowColor}40, inset 0 1px 0 rgba(255,255,255,0.3)`,
                }}
              >
                {/* Pixel shine effect */}
                <div className="absolute inset-0"
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                    animation: "exp-shine 3s ease-in-out infinite",
                  }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Currency — pixel-art pastel style */}
        <div className="flex flex-col gap-1.5 pointer-events-auto shrink-0">
          <CurrencyPill type="gold" value={user.gold} />
          <CurrencyPill type="gem" value={user.gems} />
        </div>
      </div>

      <style jsx>{`
        @keyframes exp-shine {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

function CurrencyPill({ type, value }: { type: "gold" | "gem"; value: number }) {
  const prevValue = useRef(value);
  const [bumping, setBumping] = useState(false);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    if (prevValue.current !== value && prevValue.current !== 0) {
      const diff = value - prevValue.current;
      setDelta(diff);
      setBumping(true);
      const timer = setTimeout(() => {
        setBumping(false);
        setDelta(null);
      }, 1200);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
    prevValue.current = value;
  }, [value]);

  const isGold = type === "gold";

  let displayValue: string;
  let fontSize: string;
  if (value >= 1000000) {
    displayValue = `${(value / 1000000).toFixed(1)}M`;
    fontSize = "text-[11px]";
  } else if (value >= 100000) {
    displayValue = `${(value / 1000).toFixed(0)}k`;
    fontSize = "text-[12px]";
  } else if (value >= 10000) {
    displayValue = `${(value / 1000).toFixed(1)}k`;
    fontSize = "text-[12px]";
  } else {
    displayValue = value.toLocaleString();
    fontSize = "text-[12px]";
  }

  return (
    <div
      className="relative flex items-center gap-1.5 rounded-xl px-2 py-[4px]"
      style={{
        background: isGold
          ? "linear-gradient(135deg, rgba(255,234,167,0.12) 0%, rgba(249,202,36,0.06) 100%)"
          : "linear-gradient(135deg, rgba(116,185,255,0.12) 0%, rgba(0,210,211,0.06) 100%)",
        border: isGold
          ? "1.5px solid rgba(255,234,167,0.2)"
          : "1.5px solid rgba(116,185,255,0.2)",
        boxShadow: isGold
          ? "0 2px 8px rgba(249,202,36,0.1), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 2px 8px rgba(116,185,255,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
        minWidth: 90,
      }}
    >
      {/* Pixel-art icon */}
      <div
        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${bumping ? "animate-squish" : ""}`}
        style={{
          background: isGold
            ? "linear-gradient(180deg, #FFE69C 0%, #F9CA24 50%, #D4A017 100%)"
            : "linear-gradient(180deg, #89CFF0 0%, #74B9FF 50%, #5BA4E6 100%)",
          boxShadow: isGold
            ? "0 1px 4px rgba(249,202,36,0.4), inset 0 -1px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)"
            : "0 1px 4px rgba(116,185,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)",
        }}
      >
        <span className="text-[9px] font-black" style={{ color: isGold ? "#5a4200" : "#1a3a5c", textShadow: "0 1px 0 rgba(255,255,255,0.3)" }}>
          {isGold ? "G" : "D"}
        </span>
      </div>
      <span
        className={`${fontSize} font-extrabold tabular-nums whitespace-nowrap ${bumping ? "animate-currency-bump" : ""}`}
        style={{ color: isGold ? "#FFEAA7" : "#74B9FF" }}
      >
        {displayValue}
      </span>
      {delta !== null && (
        <span
          className="absolute -top-3 right-1 text-[9px] font-black tabular-nums pointer-events-none"
          style={{
            color: delta > 0 ? "#55EFC4" : "#FF6B6B",
            animation: "currency-delta-float 1.2s ease-out forwards",
            textShadow: `0 0 6px ${delta > 0 ? "rgba(85,239,196,0.5)" : "rgba(255,107,107,0.5)"}`,
          }}
        >
          {delta > 0 ? "+" : ""}{delta.toLocaleString()}
        </span>
      )}
      <style jsx>{`
        @keyframes currency-delta-float {
          0% { opacity: 1; transform: translateY(0); }
          70% { opacity: 1; transform: translateY(-8px); }
          100% { opacity: 0; transform: translateY(-14px); }
        }
      `}</style>
    </div>
  );
}
