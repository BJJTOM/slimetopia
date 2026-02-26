"use client";

import { useGameStore } from "@/lib/store/gameStore";

const navItems = [
  { id: "home" as const, label: "홈", emoji: "🏠" },
  { id: "community" as const, label: "커뮤니티", emoji: "💬" },
  { id: "codex" as const, label: "도감", emoji: "📖" },
  { id: "merge" as const, label: "합성", emoji: "🔮" },
  { id: "explore" as const, label: "탐험", emoji: "🧭" },
  { id: "shop" as const, label: "상점", emoji: "🛒" },
] as const;

export default function BottomNav() {
  const {
    activePanel, setActivePanel,
    setShowVillage, setShowRace, setShowFishing,
    setShowCommunity, setShowWorldBoss, setShowTraining, setShowProfile,
    setShowPlaza, setShowShorts,
    slimes, explorations, dailyMissions, unreadMailCount,
    showProfile, showCommunity, showPlaza, showShorts,
  } = useGameStore();

  const closeOverlays = () => {
    setShowVillage(false); setShowRace(false); setShowFishing(false);
    setShowCommunity(false); setShowWorldBoss(false); setShowTraining(false);
    setShowProfile(false); setShowPlaza(false); setShowShorts(false);
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

  // Badge calculations
  const hungryCount = slimes.filter((s) => s.hunger < 20).length;
  const readyExplorations = explorations.filter((e) => !e.claimed && new Date(e.ends_at).getTime() <= Date.now()).length;
  const unclaimedMissions = dailyMissions.filter((m) => m.completed && !m.claimed).length;

  const getBadge = (id: string): number => {
    switch (id) {
      case "explore": return readyExplorations;
      case "home": return unclaimedMissions + unreadMailCount + hungryCount;
      default: return 0;
    }
  };

  const isOverlayActive = (id: string) => {
    if (id === "community") return showCommunity;
    return false;
  };

  // Extra overlay buttons (shorts moved to community)
  const overlayButtons = [
    { id: "plaza", label: "광장", emoji: "🏟️", active: showPlaza, action: () => { closeOverlays(); setShowPlaza(true); } },
    { id: "profile", label: "프로필", emoji: "👤", active: showProfile, action: () => { closeOverlays(); setShowProfile(true); } },
  ];

  return (
    <div className="bottom-nav" style={{ zIndex: 60 }}>
      <div className="flex justify-around items-center h-full px-1 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = (activePanel === item.id && !showCommunity && !showProfile && !showPlaza && !showShorts) || isOverlayActive(item.id);
          const badge = getBadge(item.id);

          return (
            <button key={item.id} onClick={() => handleNav(item.id)}
              className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 relative group py-1">
              {isActive && (
                <div className="absolute inset-x-1 inset-y-0 rounded-2xl"
                  style={{ background: "linear-gradient(180deg, rgba(162,155,254,0.15) 0%, rgba(162,155,254,0.04) 100%)" }} />
              )}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full"
                  style={{ background: "linear-gradient(90deg, #A29BFE, #FF9FF3)", boxShadow: "0 2px 12px rgba(162,155,254,0.6)" }} />
              )}

              <span className={`relative z-10 transition-all duration-200 ${
                isActive
                  ? "text-[26px] -translate-y-0.5 drop-shadow-[0_2px_8px_rgba(162,155,254,0.5)]"
                  : "text-[20px] opacity-40 group-hover:opacity-60 grayscale group-hover:grayscale-0"
              }`}>
                {item.emoji}
                {badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #FF6B6B, #E17055)", boxShadow: "0 1px 4px rgba(255,107,107,0.5)" }}>
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>

              <span className={`relative z-10 font-bold leading-none transition-all duration-200 ${
                isActive ? "text-[10px] text-[#C8B6FF]" : "text-[9px] text-[#636e72] group-hover:text-[#B2BEC3]"
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Overlay buttons: Plaza, Shorts, Profile */}
        {overlayButtons.map((btn) => (
          <button key={btn.id} onClick={btn.action}
            className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 relative group py-1">
            {btn.active && (
              <div className="absolute inset-x-1 inset-y-0 rounded-2xl"
                style={{ background: "linear-gradient(180deg, rgba(162,155,254,0.15) 0%, rgba(162,155,254,0.04) 100%)" }} />
            )}
            {btn.active && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full"
                style={{ background: "linear-gradient(90deg, #A29BFE, #FF9FF3)", boxShadow: "0 2px 12px rgba(162,155,254,0.6)" }} />
            )}
            <span className={`relative z-10 transition-all duration-200 ${
              btn.active
                ? "text-[26px] -translate-y-0.5 drop-shadow-[0_2px_8px_rgba(162,155,254,0.5)]"
                : "text-[20px] opacity-40 group-hover:opacity-60"
            }`}>
              {btn.emoji}
            </span>
            <span className={`relative z-10 font-bold leading-none transition-all duration-200 ${
              btn.active ? "text-[10px] text-[#C8B6FF]" : "text-[9px] text-[#636e72] group-hover:text-[#B2BEC3]"
            }`}>
              {btn.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
