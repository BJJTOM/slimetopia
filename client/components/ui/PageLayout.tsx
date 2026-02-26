"use client";

import { type ReactNode } from "react";

interface PageLayoutProps {
  title: string;
  icon: string;
  badge?: ReactNode;
  children: ReactNode;
}

export default function PageLayout({ title, icon, badge, children }: PageLayoutProps) {
  return (
    <div className="page-content animate-page-enter" style={{ background: "#1A0E08" }}>
      {/* Leather header */}
      <div
        className="px-4 py-3 flex items-center justify-between relative"
        style={{
          background: "linear-gradient(180deg, #4A2515 0%, #3D2017 50%, #2C1810 100%)",
          borderBottom: "3px solid #8B6914",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}
      >
        {/* Leather texture overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
        }} />

        <div className="flex items-center gap-2.5 relative z-10">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #C9A84C, #8B6914)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 3px rgba(0,0,0,0.3)",
            }}
          >
            <img src={icon} alt="" className="w-5 h-5 pixel-art" draggable={false} />
          </div>
          <h2 className="font-bold text-[15px]" style={{
            color: "#F5E6C8",
            fontFamily: "Georgia, 'Times New Roman', serif",
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
          }}>{title}</h2>
        </div>
        <div className="relative z-10">{badge}</div>

        {/* Gold trim line */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{
          background: "linear-gradient(90deg, transparent 5%, #8B6914 30%, #D4AF37 50%, #8B6914 70%, transparent 95%)",
        }} />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto game-scroll p-3" style={{
        background: "linear-gradient(180deg, #1A0E08 0%, #241510 100%)",
      }}>
        {children}
      </div>
    </div>
  );
}
