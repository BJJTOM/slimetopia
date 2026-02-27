"use client";

import { useGameStore } from "@/lib/store/gameStore";
import { useLocaleStore } from "@/lib/store/localeStore";
import { getGameIcon } from "@/lib/gameIcons";

type NavItem = { id: string; labelKey: string; panel: string | null };

const navItems: NavItem[] = [
  { id: "home", labelKey: "home", panel: "home" },
  { id: "slimes", labelKey: "nav_slimes", panel: "inventory" },
  { id: "merge", labelKey: "merge", panel: "merge" },
  { id: "collection", labelKey: "nav_collection", panel: "collection" },
  { id: "more", labelKey: "nav_more", panel: null },
];

export default function BottomNav() {
  const activePanel = useGameStore((s) => s.activePanel);
  const setActivePanel = useGameStore((s) => s.setActivePanel);
  const setShowCommunity = useGameStore((s) => s.setShowCommunity);
  const setShowProfile = useGameStore((s) => s.setShowProfile);
  const setShowShorts = useGameStore((s) => s.setShowShorts);
  const setShowMiniContents = useGameStore((s) => s.setShowMiniContents);
  const setShowCollection = useGameStore((s) => s.setShowCollection);
  const setShowMore = useGameStore((s) => s.setShowMore);
  const showMore = useGameStore((s) => s.showMore);
  const slimes = useGameStore((s) => s.slimes);
  const dailyMissions = useGameStore((s) => s.dailyMissions);
  const unreadMailCount = useGameStore((s) => s.unreadMailCount);
  const t = useLocaleStore((s) => s.t);

  const closeOverlays = () => {
    setShowCommunity(false);
    setShowProfile(false);
    setShowShorts(false);
    setShowMiniContents(false);
    setShowCollection(false);
    setShowMore(false);
  };

  const hungryCount = slimes.filter((s) => s.hunger < 20).length;
  const unclaimedMissions = dailyMissions.filter((m) => m.completed && !m.claimed).length;

  const getBadge = (id: string): number => {
    switch (id) {
      case "home": return unclaimedMissions + unreadMailCount;
      case "slimes": return hungryCount;
      default: return 0;
    }
  };

  const getIsActive = (item: NavItem): boolean => {
    if (item.id === "more") return showMore;
    if (item.id === "slimes") return activePanel === "inventory" && !showMore;
    if (item.id === "collection") return activePanel === "collection" && !showMore;
    return activePanel === item.panel && !showMore;
  };

  const handleNav = (item: NavItem) => {
    if (item.id === "more") {
      setShowMore(!showMore);
      return;
    }
    closeOverlays();
    if (item.panel) {
      setActivePanel(item.panel as Parameters<typeof setActivePanel>[0]);
    }
  };

  const getIconName = (id: string): string => {
    if (id === "slimes") return "inventory";
    return id;
  };

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
          const isActive = getIsActive(item);
          const badge = getBadge(item.id);

          return (
            <button key={item.id} onClick={() => handleNav(item)}
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
                <img src={getGameIcon(getIconName(item.id), 22, isActive)} alt="" style={{
                  width: isActive ? 22 : 19,
                  height: isActive ? 22 : 19,
                  transition: "all 0.2s ease",
                }} />

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
      </div>
    </div>
  );
}
