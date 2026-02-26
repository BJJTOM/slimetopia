"use client";

import ScrollFadeIn from "@/components/common/ScrollFadeIn";

interface TimelineItem {
  date: string;
  title: string;
  desc: string;
  color: string;
}

const MILESTONES: TimelineItem[] = [
  {
    date: "2025 Q1",
    title: "Project Start",
    desc: "SlimeTopia development begins with core game engine and slime rendering system.",
    color: "#55EFC4",
  },
  {
    date: "2025 Q2",
    title: "Core Systems",
    desc: "Collection, merge, and synthesis systems implemented. First 50 species designed.",
    color: "#74B9FF",
  },
  {
    date: "2025 Q3",
    title: "Expansion",
    desc: "Expanded to 200+ species across 15 factions. Added achievements, leaderboards, and daily systems.",
    color: "#FFEAA7",
  },
  {
    date: "2025 Q4",
    title: "Social Features",
    desc: "Community plaza, village visiting, shorts sharing, and guestbook systems launched.",
    color: "#A29BFE",
  },
  {
    date: "2026 Q1",
    title: "Mobile Launch",
    desc: "Android build via Capacitor, PWA support, and cross-platform play enabled.",
    color: "#FD79A8",
  },
  {
    date: "2026 Q2",
    title: "What's Next",
    desc: "Trading system, guild battles, seasonal events, and world boss raids coming soon.",
    color: "#81ECEC",
  },
];

export default function Timeline() {
  return (
    <div className="relative max-w-3xl mx-auto">
      {/* Vertical line */}
      <div
        className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 web-timeline-line"
        style={{ transform: "translateX(-50%)" }}
      />

      {MILESTONES.map((item, i) => (
        <ScrollFadeIn
          key={item.date}
          delay={i * 100}
          direction={i % 2 === 0 ? "left" : "right"}
          className={`relative mb-12 pl-16 md:pl-0 ${
            i % 2 === 0
              ? "md:pr-[52%] md:text-right"
              : "md:pl-[52%] md:text-left"
          }`}
        >
          {/* Dot */}
          <div
            className="web-timeline-dot absolute left-6 md:left-1/2 w-3 h-3 rounded-full"
            style={{
              background: item.color,
              transform: "translate(-50%, 6px)",
              boxShadow: `0 0 12px ${item.color}60`,
            }}
          />

          {/* Card */}
          <div
            className="p-6 rounded-2xl transition-all duration-300 hover:translate-y-[-2px]"
            style={{
              background: "rgba(14, 18, 30, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.04)",
            }}
          >
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: item.color }}
            >
              {item.date}
            </span>
            <h3 className="text-lg font-bold text-white mt-1 mb-2">
              {item.title}
            </h3>
            <p className="text-sm text-white/40 leading-relaxed">
              {item.desc}
            </p>
          </div>
        </ScrollFadeIn>
      ))}
    </div>
  );
}
