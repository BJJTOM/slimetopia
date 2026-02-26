"use client";

import { useGameStore } from "@/lib/store/gameStore";
import { getWeather, getWeatherIcon, getWeatherName, getWeatherBuffs } from "@/lib/WeatherSystem";
import { elementNames } from "@/lib/constants";

export default function HomePage() {
  const {
    setShowMissionModal,
    setShowAttendanceModal,
    setShowRace,
    setShowVillage,
    setShowWheel,
    setShowFishing,
    setShowMailbox,
    setActivePanel,
    dailyMissions,
    slimes,
    unreadMailCount,
    collectionCount,
  } = useGameStore();

  const weather = getWeather();
  const weatherIcon = getWeatherIcon(weather);
  const weatherName = getWeatherName(weather);
  const buffs = getWeatherBuffs(weather);

  const bestBuff = Object.entries(buffs).reduce(
    (best, [elem, val]) => (val > best[1] ? [elem, val] : best),
    ["", 1]
  );
  const buffText =
    bestBuff[1] > 1
      ? `${elementNames[bestBuff[0] as string] || bestBuff[0]} +${Math.round((bestBuff[1] as number - 1) * 100)}%`
      : "";

  const unclaimedCount = dailyMissions.filter((m) => m.completed && !m.claimed).length;
  const slimeCount = slimes.length;
  const needsCareCount = slimes.filter(
    (s) => s.hunger < 20 || s.condition < 20 || s.is_sick
  ).length;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none" style={{ top: "calc(env(safe-area-inset-top, 0px) + 108px)", bottom: 76 }}>

      {/* ===== LEFT SIDE — Info badges + Daily buttons ===== */}
      <div className="floating-menu-left pointer-events-auto">
        {/* Weather */}
        <div className="side-badge">
          <span className="text-lg leading-none">{weatherIcon}</span>
          <div className="leading-none">
            <span className="text-[11px] text-white/80 font-bold block">{weatherName}</span>
            {buffText && (
              <span className="text-[9px] text-[#55EFC4] font-bold block mt-0.5">{buffText}</span>
            )}
          </div>
        </div>

        {/* Slime count + care alert */}
        <div className="side-badge relative">
          <span className="text-lg leading-none">{"\uD83D\uDC3E"}</span>
          <span className="text-[11px] text-white/80 font-bold tabular-nums">
            {slimeCount}<span className="text-white/30">/30</span>
          </span>
          {needsCareCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold text-white animate-pulse"
              style={{ background: "#FF6B6B", boxShadow: "0 0 6px rgba(255,107,107,0.5)" }}>
              {needsCareCount}
            </span>
          )}
        </div>

        {/* Collection progress */}
        <div className="side-badge">
          <span className="text-lg leading-none">{"\u2728"}</span>
          <span className="text-[11px] text-white/80 font-bold tabular-nums">
            {collectionCount}<span className="text-white/30">/1200</span>
          </span>
        </div>

        {/* Attendance */}
        <button onClick={() => setShowAttendanceModal(true)} className="side-icon-btn">
          <span className="text-xl leading-none">{"\uD83D\uDCC5"}</span>
          <span className="side-icon-label">{"\uCD9C\uC11D"}</span>
        </button>

        {/* Mission */}
        <button onClick={() => setShowMissionModal(true)} className="side-icon-btn relative">
          <span className="text-xl leading-none">{"\uD83D\uDCCB"}</span>
          <span className="side-icon-label">{"\uBBF8\uC158"}</span>
          {unclaimedCount > 0 && (
            <span className="side-badge-count">{unclaimedCount}</span>
          )}
        </button>

        {/* Mailbox */}
        <button onClick={() => setShowMailbox(true)} className="side-icon-btn relative">
          <span className="text-xl leading-none">{"\uD83D\uDCEC"}</span>
          <span className="side-icon-label">{"\uC6B0\uD3B8"}</span>
          {unreadMailCount > 0 && (
            <span className="side-badge-count">{unreadMailCount}</span>
          )}
        </button>
      </div>

      {/* ===== RIGHT SIDE — 2-column grid ===== */}
      <div className="floating-menu-right pointer-events-auto">
        {/* Utility grid: Codex, Achievements, Leaderboard, Customize */}
        <div className="side-grid-2col">
          <button onClick={() => setActivePanel("codex")} className="side-icon-btn">
            <span className="text-xl leading-none">{"\uD83D\uDCD6"}</span>
            <span className="side-icon-label">{"\uB3C4\uAC10"}</span>
          </button>
          <button onClick={() => setActivePanel("achievements")} className="side-icon-btn">
            <span className="text-xl leading-none">{"\uD83C\uDFC6"}</span>
            <span className="side-icon-label">{"\uC5C5\uC801"}</span>
          </button>
          <button onClick={() => setActivePanel("leaderboard")} className="side-icon-btn">
            <span className="text-xl leading-none">{"\uD83D\uDC51"}</span>
            <span className="side-icon-label">{"\uB7AD\uD0B9"}</span>
          </button>
          <button onClick={() => useGameStore.getState().setShowAccessoryPanel(true)} className="side-icon-btn">
            <span className="text-xl leading-none">{"\uD83C\uDF80"}</span>
            <span className="side-icon-label">{"\uAFB8\uBBF8\uAE30"}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="w-full h-[1px] opacity-20" style={{ background: "linear-gradient(90deg, transparent, #C8B6FF, transparent)" }} />

        {/* Activities grid */}
        <div className="side-grid-2col">
          <button onClick={() => setShowWheel(true)} className="side-icon-btn side-icon-btn-accent" style={{ "--accent": "#FF6B6B" } as React.CSSProperties}>
            <span className="text-xl leading-none">{"\uD83C\uDFB0"}</span>
            <span className="side-icon-label">{"\uB8F0\uB81B"}</span>
          </button>
          <button onClick={() => setShowVillage(true)} className="side-icon-btn side-icon-btn-accent" style={{ "--accent": "#55EFC4" } as React.CSSProperties}>
            <span className="text-xl leading-none">{"\uD83C\uDFD8\uFE0F"}</span>
            <span className="side-icon-label">{"\uB9C8\uC744"}</span>
          </button>
          <button onClick={() => setShowRace(true)} className="side-icon-btn side-icon-btn-accent" style={{ "--accent": "#A29BFE" } as React.CSSProperties}>
            <span className="text-xl leading-none">{"\uD83C\uDFC3"}</span>
            <span className="side-icon-label">{"\uB808\uC774\uC2A4"}</span>
          </button>
          <button onClick={() => setShowFishing(true)} className="side-icon-btn side-icon-btn-accent" style={{ "--accent": "#74B9FF" } as React.CSSProperties}>
            <span className="text-xl leading-none">{"\uD83C\uDFA3"}</span>
            <span className="side-icon-label">{"\uB0DA\uC2DC"}</span>
          </button>
          <button onClick={() => setActivePanel("inventory")} className="side-icon-btn side-icon-btn-accent" style={{ "--accent": "#FD79A8" } as React.CSSProperties}>
            <span className="text-xl leading-none">{"\uD83C\uDF92"}</span>
            <span className="side-icon-label">{"\uBCF4\uAD00\uD568"}</span>
          </button>
          <button onClick={() => useGameStore.getState().setShowWorldBoss(true)} className="side-icon-btn side-icon-btn-accent" style={{ "--accent": "#FF6B6B" } as React.CSSProperties}>
            <span className="text-xl leading-none">{"\u2694\uFE0F"}</span>
            <span className="side-icon-label">{"\uBCF4\uC2A4"}</span>
          </button>
          <button onClick={() => useGameStore.getState().setShowTraining(true)} className="side-icon-btn side-icon-btn-accent" style={{ "--accent": "#A29BFE" } as React.CSSProperties}>
            <span className="text-xl leading-none">{"\uD83C\uDFCB\uFE0F"}</span>
            <span className="side-icon-label">{"\uD6C8\uB828"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
