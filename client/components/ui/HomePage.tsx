"use client";

import { useState, useMemo } from "react";
import { useGameStore } from "@/lib/store/gameStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useLocaleStore } from "@/lib/store/localeStore";
import { toastSuccess } from "@/components/ui/Toast";
import { getGameIcon } from "@/lib/gameIcons";

const CARE_FOOD_ITEMS: Record<number, { name: string; icon: string }> = {
  3: { name: "\uB9DB\uC788\uB294 \uBA39\uC774", icon: "\uD83C\uDF56" },
  4: { name: "\uACE0\uAE09 \uBA39\uC774", icon: "\uD83E\uDD69" },
  7: { name: "\uC288\uD37C \uBA39\uC774", icon: "\uD83C\uDF57" },
  8: { name: "\uC6D0\uC18C\uAC15\uD654 \uBA39\uC774", icon: "\u2728" },
};

// ─── 25 Home Background Themes ────────────────────────────────────────────
export type HomeBg = {
  id: string;
  nameKey: string;
  css: string;
  price: number;
  currency: "gold" | "gems";
  icon: string;
  animated?: string;
  opacity?: number;
  tier: "free" | "basic" | "premium" | "legendary";
};

export const HOME_BACKGROUNDS: HomeBg[] = [
  { id: "default", nameKey: "bg_default", css: "linear-gradient(180deg, #080816 0%, #0f0f2a 100%)", price: 0, currency: "gold", icon: "\uD83C\uDF11", tier: "free" },
  { id: "sunset_meadow", nameKey: "bg_sunset_meadow", css: "linear-gradient(180deg, #2D1B4E 0%, #FF6B35 25%, #F7C948 50%, #8BC34A 70%, #2D5016 85%, #1A3A0A 100%)", price: 500, currency: "gold", icon: "\uD83C\uDF05", tier: "basic" },
  { id: "deep_ocean", nameKey: "bg_deep_ocean", css: "linear-gradient(180deg, #000428 0%, #003366 20%, #004E92 40%, #006699 55%, #003355 70%, #001428 100%)", price: 500, currency: "gold", icon: "\uD83C\uDF0A", tier: "basic", animated: "bg-anim-underwater" },
  { id: "cherry_blossom", nameKey: "bg_cherry_blossom", css: "linear-gradient(180deg, #FFD1DC 0%, #FFB7C5 15%, #FF69B4 35%, #DB7093 55%, #C44569 70%, #8B2252 85%, #4A0E2B 100%)", price: 800, currency: "gold", icon: "\uD83C\uDF38", tier: "basic", animated: "bg-anim-particles" },
  { id: "aurora", nameKey: "bg_aurora", css: "linear-gradient(180deg, #0B0B2B 0%, #0D2137 12%, #1B4332 28%, #2D6A4F 42%, #52B788 55%, #1B4332 70%, #081C15 85%, #040D08 100%)", price: 800, currency: "gold", icon: "\uD83C\uDF0C", tier: "basic", animated: "bg-anim-aurora", opacity: 0.65 },
  { id: "lava_cave", nameKey: "bg_lava_cave", css: "linear-gradient(180deg, #1A0A00 0%, #3D1503 15%, #8B2500 35%, #CC4400 50%, #8B2500 65%, #3D1503 80%, #1A0A00 100%)", price: 1000, currency: "gold", icon: "\uD83C\uDF0B", tier: "basic", animated: "bg-anim-fire-glow", opacity: 0.6 },
  { id: "crystal_cave", nameKey: "bg_crystal_cave", css: "linear-gradient(180deg, #0A0A2E 0%, #141450 18%, #1E1E80 32%, #3838C0 48%, #5050E0 55%, #3838C0 62%, #1E1E80 78%, #0A0A2E 100%)", price: 1000, currency: "gold", icon: "\uD83D\uDC8E", tier: "basic", animated: "bg-anim-shimmer" },
  { id: "bamboo_grove", nameKey: "bg_bamboo_grove", css: "linear-gradient(180deg, #1A2F1A 0%, #2D4A2D 15%, #3D6B3D 30%, #4A8C4A 45%, #3D6B3D 60%, #2D4A2D 75%, #1A2F1A 90%, #0D1A0D 100%)", price: 600, currency: "gold", icon: "\uD83C\uDF8D", tier: "basic" },
  { id: "desert_mirage", nameKey: "bg_desert_mirage", css: "linear-gradient(180deg, #87CEEB 0%, #F4A460 20%, #DEB887 35%, #D2B48C 50%, #C8A876 65%, #8B7355 80%, #4A3728 100%)", price: 600, currency: "gold", icon: "\uD83C\uDFDC\uFE0F", tier: "basic", animated: "bg-anim-heat-shimmer" },
  { id: "frozen_tundra", nameKey: "bg_frozen_tundra", css: "linear-gradient(180deg, #E8F4FD 0%, #B3D9F2 15%, #87CEEB 30%, #5DADE2 45%, #3498DB 55%, #2471A3 70%, #1A5276 85%, #0E2F44 100%)", price: 700, currency: "gold", icon: "\u2744\uFE0F", tier: "basic", animated: "bg-anim-frost" },
  { id: "twilight_garden", nameKey: "bg_twilight_garden", css: "linear-gradient(180deg, #1A0533 0%, #2D1B69 15%, #4A2C8A 30%, #6B3FA0 45%, #8B5CF6 55%, #A78BFA 65%, #7C3AED 78%, #3B0764 100%)", price: 800, currency: "gold", icon: "\uD83C\uDF1C", tier: "basic", animated: "bg-anim-fireflies" },
  { id: "thunderstorm", nameKey: "bg_thunderstorm", css: "linear-gradient(180deg, #0A0A12 0%, #1A1A2E 15%, #2C2C4A 30%, #1F1F35 45%, #333355 55%, #1A1A2E 70%, #0D0D1A 85%, #050510 100%)", price: 900, currency: "gold", icon: "\u26A1", tier: "basic", animated: "bg-anim-lightning" },
  { id: "starlight", nameKey: "bg_starlight", css: "radial-gradient(ellipse at 50% 20%, #1B2735 0%, #12192B 30%, #0C1220 55%, #090A0F 80%)", price: 3, currency: "gems", icon: "\u2B50", tier: "premium", animated: "bg-anim-stars", opacity: 0.7 },
  { id: "cosmic_nebula", nameKey: "bg_cosmic_nebula", css: "radial-gradient(ellipse at 30% 30%, #4A0E4E 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, #0E2F44 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, #2D1B4E 0%, transparent 40%), linear-gradient(180deg, #0A0015 0%, #150028 50%, #0A0015 100%)", price: 5, currency: "gems", icon: "\uD83C\uDF0C", tier: "premium", animated: "bg-anim-nebula", opacity: 0.7 },
  { id: "rainbow_field", nameKey: "bg_rainbow_field", css: "linear-gradient(180deg, #667eea 0%, #764ba2 16%, #f093fb 32%, #f5576c 48%, #feca57 60%, #4facfe 74%, #00f2fe 88%, #1A3A0A 100%)", price: 5, currency: "gems", icon: "\uD83C\uDF08", tier: "premium", animated: "bg-anim-rainbow" },
  { id: "enchanted_forest", nameKey: "bg_enchanted_forest", css: "linear-gradient(180deg, #001A0A 0%, #003318 15%, #004D25 28%, #006B3A 40%, #008F4F 52%, #006B3A 64%, #003318 78%, #001A0A 100%)", price: 5, currency: "gems", icon: "\uD83C\uDF32", tier: "premium", animated: "bg-anim-fireflies", opacity: 0.65 },
  { id: "sakura_night", nameKey: "bg_sakura_night", css: "linear-gradient(180deg, #0D0015 0%, #1A0A2E 15%, #2D1B4E 30%, #4A2040 45%, #6B2D5A 55%, #4A2040 68%, #1A0A2E 85%, #0D0015 100%)", price: 5, currency: "gems", icon: "\uD83C\uDF19", tier: "premium", animated: "bg-anim-particles", opacity: 0.65 },
  { id: "underwater_temple", nameKey: "bg_underwater_temple", css: "radial-gradient(ellipse at 50% 70%, #005577 0%, transparent 60%), linear-gradient(180deg, #001A28 0%, #002B44 20%, #003D5C 40%, #004466 55%, #003D5C 70%, #001A28 100%)", price: 8, currency: "gems", icon: "\uD83C\uDFDB\uFE0F", tier: "premium", animated: "bg-anim-underwater", opacity: 0.65 },
  { id: "blood_moon", nameKey: "bg_blood_moon", css: "radial-gradient(ellipse at 50% 15%, #8B0000 0%, transparent 45%), linear-gradient(180deg, #0A0000 0%, #1A0505 20%, #2D0A0A 40%, #1A0505 65%, #0A0000 100%)", price: 8, currency: "gems", icon: "\uD83C\uDF11", tier: "premium", animated: "bg-anim-fire-glow", opacity: 0.7 },
  { id: "void_realm", nameKey: "bg_void_realm", css: "radial-gradient(ellipse at 30% 50%, #2D0053 0%, transparent 40%), radial-gradient(ellipse at 70% 30%, #1A0033 0%, transparent 35%), radial-gradient(ellipse at 50% 80%, #0D001A 0%, transparent 50%), linear-gradient(180deg, #0A0010 0%, #050008 100%)", price: 10, currency: "gems", icon: "\uD83D\uDD73\uFE0F", tier: "legendary", animated: "bg-anim-nebula", opacity: 0.75 },
  { id: "golden_palace", nameKey: "bg_golden_palace", css: "radial-gradient(ellipse at 50% 30%, #8B6914 0%, transparent 50%), linear-gradient(180deg, #1A1200 0%, #2D1F00 15%, #4A3300 30%, #6B4C00 45%, #8B6914 55%, #6B4C00 68%, #2D1F00 85%, #1A1200 100%)", price: 15, currency: "gems", icon: "\uD83D\uDC51", tier: "legendary", animated: "bg-anim-gold-sparkle", opacity: 0.65 },
  { id: "emerald_valley", nameKey: "bg_emerald_valley", css: "radial-gradient(ellipse at 50% 40%, #00A86B 0%, transparent 50%), linear-gradient(180deg, #001A0D 0%, #003320 15%, #005533 30%, #008855 45%, #00AA6B 55%, #005533 70%, #002D1A 85%, #001208 100%)", price: 12, currency: "gems", icon: "\uD83D\uDC9A", tier: "legendary", animated: "bg-anim-shimmer", opacity: 0.65 },
  { id: "celestial_throne", nameKey: "bg_celestial_throne", css: "radial-gradient(ellipse at 50% 20%, #FFD700 0%, transparent 35%), radial-gradient(ellipse at 30% 70%, #FF69B4 0%, transparent 30%), radial-gradient(ellipse at 70% 60%, #87CEEB 0%, transparent 35%), linear-gradient(180deg, #0A0020 0%, #150040 30%, #1A0050 50%, #150040 70%, #0A0020 100%)", price: 20, currency: "gems", icon: "\uD83D\uDC7C", tier: "legendary", animated: "bg-anim-celestial", opacity: 0.75 },
  { id: "atlantis", nameKey: "bg_atlantis", css: "radial-gradient(ellipse at 50% 60%, #00CED1 0%, transparent 45%), radial-gradient(ellipse at 30% 30%, #006994 0%, transparent 40%), linear-gradient(180deg, #000A14 0%, #001428 20%, #002244 40%, #003366 55%, #002244 70%, #000A14 100%)", price: 15, currency: "gems", icon: "\uD83C\uDFF0", tier: "legendary", animated: "bg-anim-underwater", opacity: 0.7 },
  { id: "dragon_realm", nameKey: "bg_dragon_realm", css: "radial-gradient(ellipse at 50% 30%, #FF4500 0%, transparent 40%), radial-gradient(ellipse at 30% 70%, #8B0000 0%, transparent 35%), linear-gradient(180deg, #0A0000 0%, #1A0505 15%, #2D0A0A 30%, #4A1010 45%, #2D0A0A 65%, #0A0000 100%)", price: 20, currency: "gems", icon: "\uD83D\uDC09", tier: "legendary", animated: "bg-anim-fire-glow", opacity: 0.7 },
];

export default function HomePage() {
  const setShowMissionModal = useGameStore((s) => s.setShowMissionModal);
  const setShowAttendanceModal = useGameStore((s) => s.setShowAttendanceModal);
  const setActivePanel = useGameStore((s) => s.setActivePanel);
  const setShowMailbox = useGameStore((s) => s.setShowMailbox);
  const setShowMiniContents = useGameStore((s) => s.setShowMiniContents);
  const dailyMissions = useGameStore((s) => s.dailyMissions);
  const slimes = useGameStore((s) => s.slimes);
  const unreadMailCount = useGameStore((s) => s.unreadMailCount);
  const foodInventory = useGameStore((s) => s.foodInventory);
  const applyFoodAll = useGameStore((s) => s.applyFoodAll);
  const fetchFoodInventory = useGameStore((s) => s.fetchFoodInventory);
  const token = useAuthStore((s) => s.accessToken);
  const t = useLocaleStore((s) => s.t);

  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showCareSheet, setShowCareSheet] = useState(false);
  const [feedingItemId, setFeedingItemId] = useState<number | null>(null);

  const unclaimedCount = useMemo(
    () => dailyMissions.filter((m) => m.completed && !m.claimed).length,
    [dailyMissions]
  );
  const hungryCount = useMemo(
    () => slimes.filter((s) => s.hunger < 80).length,
    [slimes]
  );
  const hasFood = foodInventory.length > 0;

  const handleFeedAll = async (itemId: number) => {
    if (!token || feedingItemId) return;
    setFeedingItemId(itemId);
    const result = await applyFoodAll(token, itemId);
    setFeedingItemId(null);
    if (result) {
      const parts = [`${result.fedCount}\uB9C8\uB9AC \uAE09\uC2DD \uC644\uB8CC`];
      if (result.levelUps > 0) parts.push(`${result.levelUps}\uB9C8\uB9AC \uB808\uBCA8\uC5C5!`);
      toastSuccess(parts.join(" + "), "\uD83C\uDF56");
      await fetchFoodInventory(token);
      const remaining = useGameStore.getState().foodInventory;
      if (remaining.length === 0) setShowCareSheet(false);
    }
  };

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
      setCurrentBg(bg.id);
      localStorage.setItem("home_background", bg.id);
      window.dispatchEvent(new Event("bg-change"));
      return;
    }
    const newOwned = [...ownedBgs, bg.id];
    setOwnedBgs(newOwned);
    localStorage.setItem("owned_backgrounds", JSON.stringify(newOwned));
    setCurrentBg(bg.id);
    localStorage.setItem("home_background", bg.id);
    window.dispatchEvent(new Event("bg-change"));
  };

  // NextAction cards data
  const nextActions: { icon: string; label: string; badge?: number; action: () => void }[] = [];
  if (hungryCount > 0 && hasFood) {
    nextActions.push({ icon: "care", label: t("home_care") || "\uB3CC\uBD04", badge: hungryCount, action: () => setShowCareSheet(true) });
  }
  if (unclaimedCount > 0) {
    nextActions.push({ icon: "mission", label: t("home_mission"), badge: unclaimedCount, action: () => setShowMissionModal(true) });
  }
  if (unreadMailCount > 0) {
    nextActions.push({ icon: "mailbox", label: t("home_mailbox"), badge: unreadMailCount, action: () => setShowMailbox(true) });
  }
  nextActions.push({ icon: "attendance", label: t("home_attendance"), action: () => setShowAttendanceModal(true) });

  return (
    <div className="absolute inset-0 z-10 pointer-events-none" style={{ top: "calc(env(safe-area-inset-top, 0px) + 52px)", bottom: 76 }}>

      {/* ===== NextAction horizontal scroll cards ===== */}
      <div className="pointer-events-auto" style={{ padding: "8px 12px 0" }}>
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {nextActions.map((card) => (
            <button key={card.icon} onClick={card.action}
              className="shrink-0 flex items-center gap-2 rounded-xl px-3 py-2 transition-all active:scale-[0.97]"
              style={{
                width: 140, height: 56,
                background: "linear-gradient(145deg, rgba(61,32,23,0.85), rgba(44,24,16,0.85))",
                border: "1.5px solid rgba(139,105,20,0.3)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,235,180,0.06)",
                backdropFilter: "blur(8px)",
                cursor: "pointer",
              }}>
              <img src={getGameIcon(card.icon, 24)} alt="" style={{ width: 28, height: 28, flexShrink: 0 }} />
              <div className="flex flex-col items-start min-w-0">
                <span style={{ fontSize: 11, color: "#E8D5A3", fontFamily: "Georgia, serif", fontWeight: 700, lineHeight: 1.2 }}>{card.label}</span>
                {card.badge !== undefined && card.badge > 0 && (
                  <span style={{ fontSize: 9, color: "#D4AF37", fontFamily: "Georgia, serif", fontWeight: 700 }}>{card.badge}</span>
                )}
              </div>
            </button>
          ))}
          {/* Background changer card */}
          <button onClick={() => setShowBgPicker(!showBgPicker)}
            className="shrink-0 flex items-center gap-2 rounded-xl px-3 py-2 transition-all active:scale-[0.97]"
            style={{
              width: 140, height: 56,
              background: "linear-gradient(145deg, rgba(61,32,23,0.85), rgba(44,24,16,0.85))",
              border: "1.5px solid rgba(139,105,20,0.3)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,235,180,0.06)",
              backdropFilter: "blur(8px)",
              cursor: "pointer",
            }}>
            <img src={getGameIcon("background", 24)} alt="" style={{ width: 28, height: 28, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#E8D5A3", fontFamily: "Georgia, serif", fontWeight: 700, lineHeight: 1.2 }}>{t("home_background")}</span>
          </button>
        </div>
      </div>

      {/* ===== Quick Action bar (bottom) ===== */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-auto" style={{ height: 52 }}>
        <div className="flex justify-around items-center h-full px-2">
          {([
            { icon: "gacha", labelKey: "more_gacha", panel: "gacha" as const },
            { icon: "shop", labelKey: "more_shop", panel: "shop" as const },
            { icon: "discovery", labelKey: "more_discovery", panel: "discovery" as const },
            { icon: "mini", labelKey: "more_mini", panel: null },
          ]).map((btn) => (
            <button key={btn.icon}
              onClick={() => btn.panel ? setActivePanel(btn.panel) : setShowMiniContents(true)}
              className="flex flex-col items-center gap-0.5 transition-all active:scale-95"
              style={{ cursor: "pointer", background: "none", border: "none" }}>
              <img src={getGameIcon(btn.icon, 20)} alt="" style={{ width: 20, height: 20 }} />
              <span style={{ fontSize: 9, color: "rgba(212,175,55,0.6)", fontFamily: "Georgia, serif", fontWeight: 700 }}>{t(btn.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Care Bottom Sheet */}
      {showCareSheet && (
        <div className="absolute inset-0 z-20 pointer-events-auto" onClick={() => setShowCareSheet(false)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl flex flex-col"
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
                <h3 style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 14, color: "#E8D5A3", margin: 0 }}>{"\uD83C\uDF56"} {"\uBE60\uB978 \uB3CC\uBD04"}</h3>
                <p style={{ fontSize: 10, color: "rgba(232,213,163,0.4)", margin: "2px 0 0 0" }}>{"\uBC30\uACE0\uD508 \uC2AC\uB77C\uC784"} {hungryCount}{"\uB9C8\uB9AC\uC5D0\uAC8C \uBA39\uC774\uB97C \uC90D\uB2C8\uB2E4"}</p>
              </div>
              <button onClick={() => setShowCareSheet(false)} style={{
                fontSize: 11, color: "#D4AF37", fontFamily: "Georgia, serif", fontWeight: 700,
                background: "none", border: "none", cursor: "pointer",
              }}>{"\uB2EB\uAE30"}</button>
            </div>
            <div style={{ padding: 12 }}>
              <div className="flex flex-col gap-2">
                {foodInventory.map(fi => {
                  const info = CARE_FOOD_ITEMS[fi.item_id];
                  if (!info) return null;
                  const isFeeding = feedingItemId === fi.item_id;
                  return (
                    <button key={fi.item_id} onClick={() => handleFeedAll(fi.item_id)}
                      disabled={isFeeding}
                      className="transition-all active:scale-[0.97]"
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px",
                        borderRadius: 12,
                        background: isFeeding
                          ? "linear-gradient(145deg, #2A1508, #1E0F06)"
                          : "linear-gradient(145deg, #3D2017, #2C1810)",
                        border: "1.5px solid rgba(139,105,20,0.3)",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,235,180,0.06)",
                        cursor: isFeeding ? "wait" : "pointer",
                        opacity: isFeeding ? 0.7 : 1,
                        width: "100%",
                        textAlign: "left",
                      }}>
                      <span style={{ fontSize: 24 }}>{info.icon}</span>
                      <div className="flex-1">
                        <div style={{ fontSize: 12, color: "#E8D5A3", fontFamily: "Georgia, serif", fontWeight: 700 }}>{info.name}</div>
                        <div style={{ fontSize: 10, color: "rgba(232,213,163,0.5)" }}>{"\uBCF4\uC720"}: {fi.quantity}{"\uAC1C"}</div>
                      </div>
                      <div style={{
                        fontSize: 11, color: "#1A0E08", fontWeight: 700, fontFamily: "Georgia, serif",
                        background: "linear-gradient(135deg, #D4AF37, #8B6914)",
                        padding: "4px 10px", borderRadius: 8,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                      }}>
                        {isFeeding ? "\uAE09\uC2DD \uC911..." : "\uBAA8\uB450 \uBA39\uC774\uAE30"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background Picker Bottom Sheet */}
      {showBgPicker && (
        <div className="absolute inset-0 z-20 pointer-events-auto" onClick={() => setShowBgPicker(false)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl max-h-[70%] flex flex-col"
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
                <p style={{ fontSize: 10, color: "rgba(232,213,163,0.4)", margin: "2px 0 0 0" }}>{t("home_bg_subtitle")} ({HOME_BACKGROUNDS.length}{t("home_bg_count_suffix")})</p>
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
                  const tierBorder = bg.tier === "legendary"
                    ? "2px solid #FFD700"
                    : bg.tier === "premium"
                      ? "2px solid #A78BFA"
                      : active
                        ? "2px solid #D4AF37"
                        : "2px solid rgba(139,105,20,0.25)";
                  const tierGlow = bg.tier === "legendary"
                    ? "0 0 12px rgba(255,215,0,0.3)"
                    : bg.tier === "premium"
                      ? "0 0 8px rgba(167,139,250,0.2)"
                      : active
                        ? "0 0 12px rgba(212,175,55,0.35)"
                        : "0 2px 6px rgba(0,0,0,0.4)";
                  return (
                    <button key={bg.id} onClick={() => handleBuyBg(bg)}
                      className="transition-all active:scale-[0.97]"
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        borderRadius: 12, overflow: "hidden",
                        border: active ? "2px solid #D4AF37" : tierBorder,
                        boxShadow: `${tierGlow}, inset 0 1px 0 rgba(255,235,180,0.04)`,
                        background: "linear-gradient(145deg, #3D2017, #2C1810)",
                        cursor: "pointer",
                        position: "relative",
                      }}>
                      <div style={{ height: 80, width: "100%", background: bg.css, position: "relative", overflow: "hidden" }}>
                        {bg.animated && (
                          <div className={bg.animated} style={{ position: "absolute", inset: 0 }} />
                        )}
                        {bg.tier !== "free" && bg.tier !== "basic" && (
                          <span style={{
                            position: "absolute", top: 4, right: 4,
                            fontSize: 8, fontWeight: 800, fontFamily: "Georgia, serif",
                            padding: "1px 5px", borderRadius: 4,
                            color: bg.tier === "legendary" ? "#1A0E08" : "#fff",
                            background: bg.tier === "legendary"
                              ? "linear-gradient(135deg, #FFD700, #D4AF37)"
                              : "linear-gradient(135deg, #A78BFA, #7C3AED)",
                            boxShadow: bg.tier === "legendary"
                              ? "0 1px 4px rgba(255,215,0,0.4)"
                              : "0 1px 4px rgba(124,58,237,0.3)",
                            letterSpacing: 0.5, textTransform: "uppercase",
                          }}>
                            {bg.tier === "legendary" ? "\u2605" : "\u2726"}
                          </span>
                        )}
                      </div>
                      <div style={{
                        padding: "6px 8px",
                        background: "linear-gradient(145deg, rgba(44,24,16,0.9), rgba(26,14,8,0.95))",
                        borderTop: "1px solid rgba(139,105,20,0.15)",
                      }}>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: 11, color: "#E8D5A3", fontFamily: "Georgia, serif", fontWeight: 700 }}>{bg.icon} {t(bg.nameKey)}</span>
                          {owned ? (
                            <span style={{ fontSize: 9, fontWeight: 700, color: active ? "#55EFC4" : "#D4AF37", fontFamily: "Georgia, serif" }}>{active ? t("home_bg_in_use") : t("home_bg_owned")}</span>
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
