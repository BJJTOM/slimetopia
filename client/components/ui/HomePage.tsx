"use client";

import { useState } from "react";
import { useGameStore } from "@/lib/store/gameStore";

// ─── 10 Home Background Themes ────────────────────────────────────────────
export const HOME_BACKGROUNDS = [
  {
    id: "default",
    name: "기본",
    css: "linear-gradient(180deg, #080816 0%, #0f0f2a 100%)",
    price: 0,
    currency: "gold" as const,
    icon: "🌑",
  },
  {
    id: "sunset_meadow",
    name: "노을 초원",
    css: "linear-gradient(180deg, #2D1B4E 0%, #FF6B35 30%, #F7C948 60%, #2D5016 80%, #1A3A0A 100%)",
    price: 500,
    currency: "gold" as const,
    icon: "🌅",
  },
  {
    id: "deep_ocean",
    name: "심해",
    css: "linear-gradient(180deg, #000428 0%, #004E92 40%, #002040 70%, #001020 100%)",
    price: 500,
    currency: "gold" as const,
    icon: "🌊",
  },
  {
    id: "cherry_blossom",
    name: "벚꽃 정원",
    css: "linear-gradient(180deg, #FFB7C5 0%, #FF69B4 20%, #DB7093 40%, #8B4513 70%, #2F1B0E 100%)",
    price: 800,
    currency: "gold" as const,
    icon: "🌸",
  },
  {
    id: "aurora",
    name: "오로라",
    css: "linear-gradient(180deg, #0B0B2B 0%, #1B4332 25%, #2D6A4F 40%, #40916C 55%, #081C15 80%, #040D08 100%)",
    price: 800,
    currency: "gold" as const,
    icon: "🌌",
  },
  {
    id: "lava_cave",
    name: "용암 동굴",
    css: "linear-gradient(180deg, #1A0A00 0%, #4A1C0A 30%, #8B2500 50%, #4A1C0A 70%, #1A0A00 100%)",
    price: 1000,
    currency: "gold" as const,
    icon: "🌋",
  },
  {
    id: "crystal_cave",
    name: "수정 동굴",
    css: "linear-gradient(180deg, #0A0A2E 0%, #1A1A4E 25%, #2828A0 45%, #4040D0 55%, #1A1A4E 75%, #0A0A2E 100%)",
    price: 1000,
    currency: "gold" as const,
    icon: "💎",
  },
  {
    id: "starlight",
    name: "별빛 하늘",
    css: "radial-gradient(ellipse at 50% 20%, #1B2735 0%, #090A0F 80%)",
    price: 3,
    currency: "gems" as const,
    icon: "⭐",
  },
  {
    id: "rainbow_field",
    name: "무지개 들판",
    css: "linear-gradient(180deg, #667eea 0%, #764ba2 20%, #f093fb 40%, #f5576c 55%, #4facfe 70%, #00f2fe 85%, #1A3A0A 100%)",
    price: 5,
    currency: "gems" as const,
    icon: "🌈",
  },
  {
    id: "void_realm",
    name: "혼돈의 영역",
    css: "radial-gradient(ellipse at 30% 50%, #2D0053 0%, #0D001A 40%, #1A0033 60%, #000000 100%)",
    price: 10,
    currency: "gems" as const,
    icon: "🕳️",
  },
];

export default function HomePage() {
  const {
    setShowMissionModal,
    setShowAttendanceModal,
    setActivePanel,
    setShowMailbox,
    dailyMissions,
    slimes,
    unreadMailCount,
  } = useGameStore();

  const [showBgPicker, setShowBgPicker] = useState(false);

  const unclaimedCount = dailyMissions.filter((m) => m.completed && !m.claimed).length;
  const slimeCount = slimes.length;
  const needsCareCount = slimes.filter(
    (s) => s.hunger < 20 || s.condition < 20 || s.is_sick
  ).length;

  // Get owned backgrounds from localStorage
  const getOwned = (): string[] => {
    if (typeof window === "undefined") return ["default"];
    const saved = localStorage.getItem("owned_backgrounds");
    return saved ? JSON.parse(saved) : ["default"];
  };
  const getCurrent = (): string => {
    if (typeof window === "undefined") return "default";
    return localStorage.getItem("home_background") || "default";
  };

  const [ownedBgs, setOwnedBgs] = useState(getOwned);
  const [currentBg, setCurrentBg] = useState(getCurrent);

  const handleBuyBg = (bg: typeof HOME_BACKGROUNDS[0]) => {
    if (ownedBgs.includes(bg.id)) {
      // Already owned, just equip
      setCurrentBg(bg.id);
      localStorage.setItem("home_background", bg.id);
      return;
    }
    // Buy it (client-side for now — price deduction via shop later)
    const newOwned = [...ownedBgs, bg.id];
    setOwnedBgs(newOwned);
    localStorage.setItem("owned_backgrounds", JSON.stringify(newOwned));
    setCurrentBg(bg.id);
    localStorage.setItem("home_background", bg.id);
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none" style={{ top: "calc(env(safe-area-inset-top, 0px) + 84px)", bottom: 76 }}>

      {/* ===== LEFT SIDE — Info badges + Daily buttons ===== */}
      <div className="floating-menu-left pointer-events-auto">
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

        {/* Background changer */}
        <button onClick={() => setShowBgPicker(!showBgPicker)} className="side-icon-btn">
          <span className="text-xl leading-none">🎨</span>
          <span className="side-icon-label">배경</span>
        </button>
      </div>

      {/* ===== RIGHT SIDE — 2-column grid ===== */}
      <div className="floating-menu-right pointer-events-auto">
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
          <button onClick={() => setActivePanel("inventory")} className="side-icon-btn">
            <span className="text-xl leading-none">{"\uD83C\uDF92"}</span>
            <span className="side-icon-label">{"\uBCF4\uAD00\uD568"}</span>
          </button>
          <button onClick={() => setActivePanel("shop")} className="side-icon-btn">
            <span className="text-xl leading-none">{"\uD83D\uDED2"}</span>
            <span className="side-icon-label">{"\uC0C1\uC810"}</span>
          </button>
        </div>
      </div>

      {/* Background Picker Bottom Sheet */}
      {showBgPicker && (
        <div className="absolute inset-0 z-20 pointer-events-auto" onClick={() => setShowBgPicker(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-[#0a0a1a]/95 backdrop-blur-lg border-t border-white/10 rounded-t-2xl max-h-[60%] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-white font-bold text-sm">🎨 배경 변경</h3>
                <p className="text-white/30 text-[10px]">배경을 선택하세요</p>
              </div>
              <button onClick={() => setShowBgPicker(false)} className="text-white/40 text-xs">닫기</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 gap-2">
                {HOME_BACKGROUNDS.map(bg => {
                  const owned = ownedBgs.includes(bg.id);
                  const active = currentBg === bg.id;
                  return (
                    <button key={bg.id} onClick={() => handleBuyBg(bg)}
                      className="relative rounded-xl overflow-hidden transition-all active:scale-[0.97]"
                      style={{
                        border: active ? "2px solid #D4AF37" : "2px solid rgba(255,255,255,0.08)",
                        boxShadow: active ? "0 0 12px rgba(212,175,55,0.3)" : "none",
                      }}>
                      <div className="h-20 w-full" style={{ background: bg.css }} />
                      <div className="px-2 py-1.5 bg-black/60">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-[11px] font-bold">{bg.icon} {bg.name}</span>
                          {owned ? (
                            <span className="text-[9px] font-bold text-[#D4AF37]">{active ? "사용 중" : "보유"}</span>
                          ) : (
                            <span className="text-[9px] font-bold" style={{ color: bg.currency === "gems" ? "#C9A84C" : "#FFEAA7" }}>
                              {bg.currency === "gems" ? `💎${bg.price}` : `🪙${bg.price}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
