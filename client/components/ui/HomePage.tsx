"use client";

import { useState, useMemo } from "react";
import { useGameStore } from "@/lib/store/gameStore";
import { useLocaleStore } from "@/lib/store/localeStore";

// ─── 10 Home Background Themes ────────────────────────────────────────────
export const HOME_BACKGROUNDS = [
  {
    id: "default",
    nameKey: "bg_default",
    css: "linear-gradient(180deg, #080816 0%, #0f0f2a 100%)",
    price: 0,
    currency: "gold" as const,
    icon: "\uD83C\uDF11",
  },
  {
    id: "sunset_meadow",
    nameKey: "bg_sunset_meadow",
    css: "linear-gradient(180deg, #2D1B4E 0%, #FF6B35 30%, #F7C948 60%, #2D5016 80%, #1A3A0A 100%)",
    price: 500,
    currency: "gold" as const,
    icon: "\uD83C\uDF05",
  },
  {
    id: "deep_ocean",
    nameKey: "bg_deep_ocean",
    css: "linear-gradient(180deg, #000428 0%, #004E92 40%, #002040 70%, #001020 100%)",
    price: 500,
    currency: "gold" as const,
    icon: "\uD83C\uDF0A",
  },
  {
    id: "cherry_blossom",
    nameKey: "bg_cherry_blossom",
    css: "linear-gradient(180deg, #FFB7C5 0%, #FF69B4 20%, #DB7093 40%, #8B4513 70%, #2F1B0E 100%)",
    price: 800,
    currency: "gold" as const,
    icon: "\uD83C\uDF38",
  },
  {
    id: "aurora",
    nameKey: "bg_aurora",
    css: "linear-gradient(180deg, #0B0B2B 0%, #1B4332 25%, #2D6A4F 40%, #40916C 55%, #081C15 80%, #040D08 100%)",
    price: 800,
    currency: "gold" as const,
    icon: "\uD83C\uDF0C",
  },
  {
    id: "lava_cave",
    nameKey: "bg_lava_cave",
    css: "linear-gradient(180deg, #1A0A00 0%, #4A1C0A 30%, #8B2500 50%, #4A1C0A 70%, #1A0A00 100%)",
    price: 1000,
    currency: "gold" as const,
    icon: "\uD83C\uDF0B",
  },
  {
    id: "crystal_cave",
    nameKey: "bg_crystal_cave",
    css: "linear-gradient(180deg, #0A0A2E 0%, #1A1A4E 25%, #2828A0 45%, #4040D0 55%, #1A1A4E 75%, #0A0A2E 100%)",
    price: 1000,
    currency: "gold" as const,
    icon: "\uD83D\uDC8E",
  },
  {
    id: "starlight",
    nameKey: "bg_starlight",
    css: "radial-gradient(ellipse at 50% 20%, #1B2735 0%, #090A0F 80%)",
    price: 3,
    currency: "gems" as const,
    icon: "\u2B50",
  },
  {
    id: "rainbow_field",
    nameKey: "bg_rainbow_field",
    css: "linear-gradient(180deg, #667eea 0%, #764ba2 20%, #f093fb 40%, #f5576c 55%, #4facfe 70%, #00f2fe 85%, #1A3A0A 100%)",
    price: 5,
    currency: "gems" as const,
    icon: "\uD83C\uDF08",
  },
  {
    id: "void_realm",
    nameKey: "bg_void_realm",
    css: "radial-gradient(ellipse at 30% 50%, #2D0053 0%, #0D001A 40%, #1A0033 60%, #000000 100%)",
    price: 10,
    currency: "gems" as const,
    icon: "\uD83D\uDD73\uFE0F",
  },
];

export default function HomePage() {
  // Individual selectors to avoid unnecessary re-renders
  const setShowMissionModal = useGameStore((s) => s.setShowMissionModal);
  const setShowAttendanceModal = useGameStore((s) => s.setShowAttendanceModal);
  const setActivePanel = useGameStore((s) => s.setActivePanel);
  const setShowMailbox = useGameStore((s) => s.setShowMailbox);
  const dailyMissions = useGameStore((s) => s.dailyMissions);
  const slimes = useGameStore((s) => s.slimes);
  const unreadMailCount = useGameStore((s) => s.unreadMailCount);
  const t = useLocaleStore((s) => s.t);

  const [showBgPicker, setShowBgPicker] = useState(false);

  const unclaimedCount = useMemo(
    () => dailyMissions.filter((m) => m.completed && !m.claimed).length,
    [dailyMissions]
  );
  const slimeCount = slimes.length;
  const needsCareCount = useMemo(
    () => slimes.filter((s) => s.hunger < 20 || s.condition < 20 || s.is_sick).length,
    [slimes]
  );

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
      window.dispatchEvent(new Event("bg-change"));
      return;
    }
    // Buy it (client-side for now — price deduction via shop later)
    const newOwned = [...ownedBgs, bg.id];
    setOwnedBgs(newOwned);
    localStorage.setItem("owned_backgrounds", JSON.stringify(newOwned));
    setCurrentBg(bg.id);
    localStorage.setItem("home_background", bg.id);
    window.dispatchEvent(new Event("bg-change"));
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none" style={{ top: "calc(env(safe-area-inset-top, 0px) + 84px)", bottom: 76 }}>

      {/* ===== LEFT SIDE — Info badges + Daily buttons ===== */}
      <div className="floating-menu-left pointer-events-auto">
        {/* Slime count + care alert */}
        <div className="relative" style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "linear-gradient(145deg, #3D2017, #2C1810)",
          border: "1.5px solid rgba(139,105,20,0.35)",
          borderRadius: 14, padding: "6px 10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,235,180,0.08)",
        }}>
          <span className="text-lg leading-none">{"\uD83D\uDC3E"}</span>
          <span style={{ fontSize: 11, color: "#E8D5A3", fontFamily: "Georgia, serif", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {slimeCount}<span style={{ color: "rgba(232,213,163,0.3)" }}>/30</span>
          </span>
          {needsCareCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold text-white animate-pulse"
              style={{ background: "#FF6B6B", boxShadow: "0 0 6px rgba(255,107,107,0.5)" }}>
              {needsCareCount}
            </span>
          )}
        </div>

        {/* Attendance */}
        <button onClick={() => setShowAttendanceModal(true)} style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
          width: 50, height: 50,
          background: "linear-gradient(145deg, #3D2017, #2C1810)",
          border: "1.5px solid rgba(139,105,20,0.3)",
          borderRadius: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,235,180,0.08)",
          cursor: "pointer",
        }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{"\uD83D\uDCC5"}</span>
          <span style={{ fontSize: 10, color: "#D4AF37", fontFamily: "Georgia, serif", fontWeight: 700 }}>{t("home_attendance")}</span>
        </button>

        {/* Mission */}
        <button onClick={() => setShowMissionModal(true)} className="relative" style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
          width: 50, height: 50,
          background: "linear-gradient(145deg, #3D2017, #2C1810)",
          border: "1.5px solid rgba(139,105,20,0.3)",
          borderRadius: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,235,180,0.08)",
          cursor: "pointer",
        }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{"\uD83D\uDCCB"}</span>
          <span style={{ fontSize: 10, color: "#D4AF37", fontFamily: "Georgia, serif", fontWeight: 700 }}>{t("home_mission")}</span>
          {unclaimedCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold text-white animate-pulse"
              style={{ background: "linear-gradient(135deg, #D4AF37, #8B6914)", boxShadow: "0 0 6px rgba(212,175,55,0.5)", border: "1px solid rgba(255,235,180,0.3)" }}>
              {unclaimedCount}
            </span>
          )}
        </button>

        {/* Mailbox */}
        <button onClick={() => setShowMailbox(true)} className="relative" style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
          width: 50, height: 50,
          background: "linear-gradient(145deg, #3D2017, #2C1810)",
          border: "1.5px solid rgba(139,105,20,0.3)",
          borderRadius: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,235,180,0.08)",
          cursor: "pointer",
        }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{"\uD83D\uDCEC"}</span>
          <span style={{ fontSize: 10, color: "#D4AF37", fontFamily: "Georgia, serif", fontWeight: 700 }}>{t("home_mailbox")}</span>
          {unreadMailCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold text-white animate-pulse"
              style={{ background: "linear-gradient(135deg, #D4AF37, #8B6914)", boxShadow: "0 0 6px rgba(212,175,55,0.5)", border: "1px solid rgba(255,235,180,0.3)" }}>
              {unreadMailCount}
            </span>
          )}
        </button>

        {/* Background changer */}
        <button onClick={() => setShowBgPicker(!showBgPicker)} style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
          width: 50, height: 50,
          background: "linear-gradient(145deg, #3D2017, #2C1810)",
          border: "1.5px solid rgba(139,105,20,0.3)",
          borderRadius: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,235,180,0.08)",
          cursor: "pointer",
        }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{"\uD83C\uDFA8"}</span>
          <span style={{ fontSize: 10, color: "#D4AF37", fontFamily: "Georgia, serif", fontWeight: 700 }}>{t("home_background")}</span>
        </button>
      </div>

      {/* ===== RIGHT SIDE — 2-column grid ===== */}
      <div className="floating-menu-right pointer-events-auto">
        <div className="side-grid-2col">
          {([
            { panel: "codex" as const, icon: "\uD83D\uDCD6", labelKey: "home_codex" },
            { panel: "achievements" as const, icon: "\uD83C\uDFC6", labelKey: "home_achievements" },
            { panel: "leaderboard" as const, icon: "\uD83D\uDC51", labelKey: "home_leaderboard" },
            { panel: "inventory" as const, icon: "\uD83C\uDF92", labelKey: "home_inventory" },
            { panel: "gacha" as const, icon: "\uD83E\uDD5A", labelKey: "home_gacha" },
            { panel: "shop" as const, icon: "\uD83D\uDED2", labelKey: "home_shop" },
          ] as const).map(({ panel, icon, labelKey }) => (
            <button key={panel} onClick={() => setActivePanel(panel)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
              width: 50, height: 50,
              background: "linear-gradient(145deg, #3D2017, #2C1810)",
              border: "1.5px solid rgba(139,105,20,0.3)",
              borderRadius: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,235,180,0.08)",
              cursor: "pointer",
            }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: 10, color: "#D4AF37", fontFamily: "Georgia, serif", fontWeight: 700 }}>{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Background Picker Bottom Sheet */}
      {showBgPicker && (
        <div className="absolute inset-0 z-20 pointer-events-auto" onClick={() => setShowBgPicker(false)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl max-h-[60%] flex flex-col"
            style={{
              background: "linear-gradient(180deg, #2C1810 0%, #1A0E08 100%)",
              backdropFilter: "blur(16px)",
              border: "1.5px solid rgba(139,105,20,0.3)",
              borderBottom: "none",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,235,180,0.06)",
            }}
            onClick={e => e.stopPropagation()}>
            <div className="shrink-0" style={{
              padding: "12px 16px",
              background: "linear-gradient(145deg, #3D2017, #2C1810)",
              borderBottom: "1.5px solid rgba(139,105,20,0.35)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              borderRadius: "16px 16px 0 0",
            }}>
              <div>
                <h3 style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 14, color: "#E8D5A3", margin: 0 }}>{"\uD83C\uDFA8"} {t("home_bg_title")}</h3>
                <p style={{ fontSize: 10, color: "rgba(232,213,163,0.4)", margin: "2px 0 0 0" }}>{t("home_bg_subtitle")}</p>
              </div>
              <button onClick={() => setShowBgPicker(false)} style={{
                fontSize: 11, color: "#D4AF37", fontFamily: "Georgia, serif", fontWeight: 700,
                background: "none", border: "none", cursor: "pointer",
              }}>{t("home_bg_close")}</button>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ padding: 12 }}>
              <div className="grid grid-cols-2 gap-2">
                {HOME_BACKGROUNDS.map(bg => {
                  const owned = ownedBgs.includes(bg.id);
                  const active = currentBg === bg.id;
                  return (
                    <button key={bg.id} onClick={() => handleBuyBg(bg)}
                      className="transition-all active:scale-[0.97]"
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        borderRadius: 12, overflow: "hidden",
                        border: active ? "2px solid #D4AF37" : "2px solid rgba(139,105,20,0.25)",
                        boxShadow: active
                          ? "0 0 12px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,235,180,0.1)"
                          : "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,235,180,0.04)",
                        background: "linear-gradient(145deg, #3D2017, #2C1810)",
                        cursor: "pointer",
                      }}>
                      <div style={{ height: 80, width: "100%", background: bg.css }} />
                      <div style={{
                        padding: "6px 8px",
                        background: "linear-gradient(145deg, rgba(44,24,16,0.9), rgba(26,14,8,0.95))",
                        borderTop: "1px solid rgba(139,105,20,0.15)",
                      }}>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: 11, color: "#E8D5A3", fontFamily: "Georgia, serif", fontWeight: 700 }}>{bg.icon} {t(bg.nameKey)}</span>
                          {owned ? (
                            <span style={{ fontSize: 9, fontWeight: 700, color: "#D4AF37", fontFamily: "Georgia, serif" }}>{active ? t("home_bg_in_use") : t("home_bg_owned")}</span>
                          ) : (
                            <span style={{
                              fontSize: 9, fontWeight: 700, fontFamily: "Georgia, serif",
                              color: bg.currency === "gems" ? "#C9A84C" : "#D4AF37",
                              background: "rgba(139,105,20,0.15)",
                              padding: "1px 5px", borderRadius: 6,
                              border: "1px solid rgba(139,105,20,0.2)",
                            }}>
                              {bg.currency === "gems" ? `\uD83D\uDC8E${bg.price}` : `\uD83E\uDE99${bg.price}`}
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
