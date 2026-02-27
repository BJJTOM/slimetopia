"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi } from "@/lib/api/client";

interface ActiveBooster {
  type: string;
  remaining_seconds: number;
}

const boosterConfig: Record<string, { icon: string; color: string }> = {
  exp_2x: { icon: "\uD83D\uDCD6", color: "#D4AF37" },
  gold_2x: { icon: "\uD83D\uDCB0", color: "#C9A84C" },
  luck_up: { icon: "\uD83C\uDF40", color: "#8B6914" },
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
  const activeBoosters = boosters.filter(b => (liveBoosterSeconds[b.type] ?? b.remaining_seconds) > 0);

  if (!user) return null;

  return (
    <div className="top-hud">
      <div className="flex items-center w-full gap-2">
        {/* Left: Lv + Boosters */}
        <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
          <span
            className="text-[11px] font-black tracking-wider"
            style={{
              color: "#D4AF37",
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 0 6px rgba(212,175,55,0.4)",
            }}
          >
            Lv.{user.level}
          </span>
          {activeBoosters.map((b) => {
            const config = boosterConfig[b.type] || { icon: "\u26A1", color: "#C9A84C" };
            const secs = liveBoosterSeconds[b.type] ?? b.remaining_seconds;
            const isLow = secs < 300;
            return (
              <div
                key={b.type}
                className="rounded-md px-1.5 py-[2px] flex items-center gap-0.5"
                style={{
                  background: "linear-gradient(135deg, #2C1810, #1A0E08)",
                  border: `1px solid ${isLow ? "rgba(255,107,107,0.4)" : "#8B691440"}`,
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)",
                }}
              >
                <span className="text-[7px]">{config.icon}</span>
                <span
                  className={`text-[7px] font-bold tabular-nums ${isLow ? "animate-pulse" : ""}`}
                  style={{
                    color: isLow ? "#FF6B6B" : "#D4AF37",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                  }}
                >
                  {formatBoosterTime(secs)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Center: EXP bar */}
        <div className="pointer-events-auto flex-1 min-w-0 flex flex-col justify-center mx-1">
          <div className="flex items-center justify-end mb-[2px]">
            <span
              className="text-[10px] font-bold tabular-nums"
              style={{
                color: "#F5E6C880",
                fontFamily: "Georgia, 'Times New Roman', serif",
              }}
            >
              {Math.floor(levelProgress)}%
            </span>
          </div>
          <div className="relative">
            <div
              className="absolute -top-[1px] left-1 right-1 h-[1px]"
              style={{ background: "linear-gradient(90deg, transparent, #8B691460, #D4AF3740, #8B691460, transparent)" }}
            />
            <div
              className="w-full h-[10px] rounded-lg overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #1A0E08 0%, #2C1810 40%, #1A0E08 100%)",
                border: "1.5px solid #8B691440",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6), 0 1px 0 rgba(139,105,20,0.1)",
              }}
            >
              <div
                className="h-full rounded-md transition-all duration-700 relative overflow-hidden"
                style={{
                  width: `${levelProgress}%`,
                  background: "linear-gradient(180deg, #D4AF37 0%, #C9A84C 50%, #8B6914 100%)",
                  boxShadow: "0 0 8px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,234,167,0.4), inset 0 -1px 0 rgba(0,0,0,0.2)",
                }}
              >
                <div className="absolute inset-0"
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,234,167,0.25) 50%, transparent 100%)",
                    animation: "exp-shine 3s ease-in-out infinite",
                  }} />
              </div>
            </div>
            <div
              className="absolute -bottom-[1px] left-1 right-1 h-[1px]"
              style={{ background: "linear-gradient(90deg, transparent, #8B691460, #D4AF3740, #8B691460, transparent)" }}
            />
          </div>
        </div>

        {/* Right: Currency */}
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
        background: "linear-gradient(135deg, #2C1810, #1A0E08)",
        border: isGold
          ? "1.5px solid rgba(139,105,20,0.5)"
          : "1.5px solid rgba(90,120,180,0.4)",
        boxShadow: isGold
          ? "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 2px rgba(139,105,20,0.15)"
          : "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 2px rgba(90,120,180,0.15)",
        minWidth: 90,
      }}
    >
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${bumping ? "animate-squish" : ""}`}
        style={{
          background: isGold
            ? "linear-gradient(135deg, #D4AF37 0%, #C9A84C 50%, #8B6914 100%)"
            : "linear-gradient(135deg, #7BA4D9 0%, #5A8DC4 50%, #3D6FA0 100%)",
          boxShadow: isGold
            ? "0 1px 4px rgba(139,105,20,0.5), inset 0 1px 0 rgba(255,234,167,0.4)"
            : "0 1px 4px rgba(90,120,180,0.5), inset 0 1px 0 rgba(180,210,255,0.4)",
        }}
      >
        <span className="text-[10px]" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.3))" }}>
          {isGold ? "\uD83E\uDE99" : "\uD83D\uDC8E"}
        </span>
      </div>
      <span
        className={`${fontSize} font-extrabold tabular-nums whitespace-nowrap ${bumping ? "animate-currency-bump" : ""}`}
        style={{
          color: "#F5E6C8",
          fontFamily: "Georgia, 'Times New Roman', serif",
          textShadow: isGold
            ? "0 0 4px rgba(212,175,55,0.3)"
            : "0 0 4px rgba(90,120,180,0.3)",
        }}
      >
        {displayValue}
      </span>
      {delta !== null && (
        <span
          className="absolute -top-3 right-1 text-[9px] font-black tabular-nums pointer-events-none"
          style={{
            color: delta > 0 ? "#D4AF37" : "#FF6B6B",
            fontFamily: "Georgia, 'Times New Roman', serif",
            animation: "currency-delta-float 1.2s ease-out forwards",
            textShadow: `0 0 6px ${delta > 0 ? "rgba(212,175,55,0.5)" : "rgba(255,107,107,0.5)"}`,
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
