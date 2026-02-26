"use client";

import { useGameStore } from "@/lib/store/gameStore";
import { useLocaleStore } from "@/lib/store/localeStore";

const navItems = [
  { id: "home" as const, labelKey: "home", emoji: "\uD83C\uDFE0" },
  { id: "community" as const, labelKey: "community", emoji: "\uD83D\uDCAC" },
  { id: "merge" as const, labelKey: "merge", emoji: "\u2697\uFE0F" },
  { id: "discovery" as const, labelKey: "explore", emoji: "\uD83E\uDDED" },
] as const;

export default function BottomNav() {
  const {
    activePanel, setActivePanel,
    setShowCommunity, setShowProfile,
    setShowShorts, setShowMiniContents, setShowCollection,
    slimes, explorations, dailyMissions, unreadMailCount,
    showProfile, showCommunity, showShorts, showMiniContents, showCollection,
  } = useGameStore();
  const t = useLocaleStore((s) => s.t);

  const closeOverlays = () => {
    setShowCommunity(false);
    setShowProfile(false);
    setShowShorts(false);
    setShowMiniContents(false);
    setShowCollection(false);
  };

  const handleNav = (panel: string) => {
    closeOverlays();
    if (panel === "community") {
      setActivePanel("home");
      setTimeout(() => setShowCommunity(true), 50);
    } else {
      setActivePanel(panel as typeof activePanel);
    }
  };

  const hungryCount = slimes.filter((s) => s.hunger < 20).length;
  const readyExplorations = explorations.filter((e) => !e.claimed && new Date(e.ends_at).getTime() <= Date.now()).length;
  const unclaimedMissions = dailyMissions.filter((m) => m.completed && !m.claimed).length;

  const getBadge = (id: string): number => {
    switch (id) {
      case "discovery": return readyExplorations;
      case "home": return unclaimedMissions + unreadMailCount + hungryCount;
      default: return 0;
    }
  };

  const isOverlayActive = (id: string) => {
    if (id === "community") return showCommunity;
    return false;
  };

  const overlayButtons = [
    { id: "mini", labelKey: "nav_mini_games", emoji: "\uD83C\uDFAE", active: showMiniContents, action: () => { closeOverlays(); setShowMiniContents(true); } },
    { id: "collection", labelKey: "nav_collection", emoji: "\uD83D\uDCD6", active: showCollection, action: () => { closeOverlays(); setShowCollection(true); } },
    { id: "profile", labelKey: "nav_profile", emoji: "\uD83D\uDC64", active: showProfile, action: () => { closeOverlays(); setShowProfile(true); } },
  ];

  const anyOverlay = showCommunity || showProfile || showShorts || showMiniContents || showCollection;

  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      height: 80,
      background: "linear-gradient(180deg, #2C1810 0%, #1A0E08 100%)",
      borderTop: "2px solid #8B6914",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,168,76,0.08)",
    }}>
      <div className="flex justify-around items-center h-full px-1" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {navItems.map((item) => {
          const isActive = (activePanel === item.id && !anyOverlay) || isOverlayActive(item.id);
          const badge = getBadge(item.id);

          return (
            <button key={item.id} onClick={() => handleNav(item.id)}
              className="flex flex-col items-center justify-center gap-1 min-w-0 flex-1 relative py-1"
              style={{ WebkitTapHighlightColor: "transparent" }}>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-b-full"
                  style={{ background: "linear-gradient(90deg, transparent, #D4AF37, transparent)", boxShadow: "0 2px 10px rgba(212,175,55,0.5)" }} />
              )}

              <div className="relative" style={{
                width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                background: isActive
                  ? "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(139,105,20,0.12))"
                  : "linear-gradient(135deg, rgba(61,32,23,0.5), rgba(44,24,16,0.3))",
                border: isActive ? "1.5px solid rgba(201,168,76,0.35)" : "1px solid rgba(139,105,20,0.12)",
                boxShadow: isActive ? "0 2px 8px rgba(201,168,76,0.15), inset 0 1px 0 rgba(245,230,200,0.05)" : "none",
                transition: "all 0.2s ease",
              }}>
                <span style={{
                  fontSize: isActive ? 20 : 17,
                  filter: isActive ? "none" : "grayscale(0.6) opacity(0.5)",
                  transition: "all 0.2s ease",
                }}>{item.emoji}</span>

                {badge > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -4,
                    minWidth: 16, height: 16, borderRadius: 8, padding: "0 3px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "linear-gradient(135deg, #C0392B, #E74C3C)",
                    color: "white", fontSize: 8, fontWeight: 800,
                    border: "2px solid #1A0E08",
                    boxShadow: "0 2px 4px rgba(192,57,43,0.5)",
                  }}>{badge > 9 ? "9+" : badge}</span>
                )}
              </div>

              <span style={{
                fontSize: 9, fontWeight: 700, lineHeight: 1,
                fontFamily: "Georgia, serif",
                color: isActive ? "#D4AF37" : "rgba(201,168,76,0.35)",
                textShadow: isActive ? "0 0 6px rgba(212,175,55,0.3)" : "none",
                transition: "all 0.2s ease",
              }}>{t(item.labelKey)}</span>
            </button>
          );
        })}

        {overlayButtons.map((btn) => (
          <button key={btn.id} onClick={btn.action}
            className="flex flex-col items-center justify-center gap-1 min-w-0 flex-1 relative py-1"
            style={{ WebkitTapHighlightColor: "transparent" }}>
            {btn.active && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-b-full"
                style={{ background: "linear-gradient(90deg, transparent, #D4AF37, transparent)", boxShadow: "0 2px 10px rgba(212,175,55,0.5)" }} />
            )}

            <div style={{
              width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              background: btn.active
                ? "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(139,105,20,0.12))"
                : "linear-gradient(135deg, rgba(61,32,23,0.5), rgba(44,24,16,0.3))",
              border: btn.active ? "1.5px solid rgba(201,168,76,0.35)" : "1px solid rgba(139,105,20,0.12)",
              boxShadow: btn.active ? "0 2px 8px rgba(201,168,76,0.15), inset 0 1px 0 rgba(245,230,200,0.05)" : "none",
              transition: "all 0.2s ease",
            }}>
              <span style={{
                fontSize: btn.active ? 20 : 17,
                filter: btn.active ? "none" : "grayscale(0.6) opacity(0.5)",
                transition: "all 0.2s ease",
              }}>{btn.emoji}</span>
            </div>

            <span style={{
              fontSize: 9, fontWeight: 700, lineHeight: 1,
              fontFamily: "Georgia, serif",
              color: btn.active ? "#D4AF37" : "rgba(201,168,76,0.35)",
              textShadow: btn.active ? "0 0 6px rgba(212,175,55,0.3)" : "none",
              transition: "all 0.2s ease",
            }}>{t(btn.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
