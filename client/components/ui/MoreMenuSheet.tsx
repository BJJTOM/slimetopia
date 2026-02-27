"use client";

import { useGameStore } from "@/lib/store/gameStore";
import { useLocaleStore } from "@/lib/store/localeStore";
import { getGameIcon } from "@/lib/gameIcons";

interface MoreMenuSheetProps {
  onClose: () => void;
}

interface MenuItem {
  icon: string;
  labelKey: string;
  action: () => void;
}

export default function MoreMenuSheet({ onClose }: MoreMenuSheetProps) {
  const setActivePanel = useGameStore((s) => s.setActivePanel);
  const setShowCommunity = useGameStore((s) => s.setShowCommunity);
  const setShowProfile = useGameStore((s) => s.setShowProfile);
  const setShowMiniContents = useGameStore((s) => s.setShowMiniContents);
  const setShowMailbox = useGameStore((s) => s.setShowMailbox);
  const t = useLocaleStore((s) => s.t);

  const go = (panel: Parameters<typeof setActivePanel>[0]) => {
    setActivePanel(panel);
    onClose();
  };

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: t("more_section_content"),
      items: [
        { icon: "gacha", labelKey: "more_gacha", action: () => go("gacha") },
        { icon: "shop", labelKey: "more_shop", action: () => go("shop") },
        { icon: "discovery", labelKey: "more_discovery", action: () => go("discovery") },
        { icon: "mini", labelKey: "more_mini", action: () => { setShowMiniContents(true); onClose(); } },
      ],
    },
    {
      title: t("more_section_social"),
      items: [
        { icon: "community", labelKey: "more_community", action: () => { setShowCommunity(true); onClose(); } },
        { icon: "leaderboard", labelKey: "more_leaderboard", action: () => go("leaderboard") },
        { icon: "achievements", labelKey: "more_achievements", action: () => go("achievements") },
        { icon: "codex", labelKey: "more_codex", action: () => go("codex") },
      ],
    },
    {
      title: t("more_section_account"),
      items: [
        { icon: "profile", labelKey: "more_profile", action: () => { setShowProfile(true); onClose(); } },
        { icon: "mailbox", labelKey: "more_mailbox", action: () => { setShowMailbox(true); onClose(); } },
        { icon: "background", labelKey: "more_settings", action: () => { go("home"); } },
      ],
    },
  ];

  return (
    <div
      className="absolute inset-0 z-[65]"
      style={{ bottom: 80 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl"
        style={{
          background: "linear-gradient(180deg, #2C1810 0%, #1A0E08 100%)",
          border: "1.5px solid rgba(139,105,20,0.3)",
          borderBottom: "none",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,235,180,0.06)",
          animation: "more-sheet-up 0.25s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "rgba(139,105,20,0.4)",
          }} />
        </div>

        {/* Title */}
        <div style={{
          padding: "4px 16px 8px",
          borderBottom: "1px solid rgba(139,105,20,0.15)",
        }}>
          <span style={{
            fontSize: 14, fontWeight: 700,
            fontFamily: "Georgia, serif",
            color: "#E8D5A3",
          }}>{t("more_title")}</span>
        </div>

        {/* Sections */}
        <div style={{ padding: "8px 12px 16px" }}>
          {sections.map((section, si) => (
            <div key={si}>
              {si > 0 && (
                <div style={{
                  height: 1, margin: "8px 8px",
                  background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.25), transparent)",
                }} />
              )}
              <div style={{
                fontSize: 9, fontWeight: 700,
                fontFamily: "Georgia, serif",
                color: "rgba(212,175,55,0.5)",
                padding: "4px 4px 6px",
                letterSpacing: 0.5,
              }}>{section.title}</div>
              <div className="grid grid-cols-4 gap-2">
                {section.items.map((item) => (
                  <button
                    key={item.icon}
                    onClick={item.action}
                    className="flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all active:scale-95"
                    style={{
                      background: "linear-gradient(145deg, rgba(61,32,23,0.4), rgba(44,24,16,0.2))",
                      border: "1px solid rgba(139,105,20,0.12)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "linear-gradient(145deg, #3D2017, #2C1810)",
                      border: "1.5px solid rgba(139,105,20,0.25)",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,235,180,0.06)",
                    }}>
                      <img src={getGameIcon(item.icon, 24)} alt="" style={{ width: 24, height: 24 }} />
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      fontFamily: "Georgia, serif",
                      color: "#D4AF37",
                      lineHeight: 1,
                    }}>{t(item.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <style jsx>{`
          @keyframes more-sheet-up {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
