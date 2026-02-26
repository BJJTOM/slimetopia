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
    title: "프로젝트 시작",
    desc: "슬라임토피아 개발 시작. 핵심 게임 엔진과 슬라임 렌더링 시스템 구축.",
    color: "#55EFC4",
  },
  {
    date: "2025 Q2",
    title: "핵심 시스템",
    desc: "수집, 합성, 합성 시스템 구현. 최초 50종 슬라임 디자인 완료.",
    color: "#74B9FF",
  },
  {
    date: "2025 Q3",
    title: "확장",
    desc: "15개 세력에 걸쳐 200종 이상으로 확장. 업적, 리더보드, 일일 시스템 추가.",
    color: "#FFEAA7",
  },
  {
    date: "2025 Q4",
    title: "소셜 기능",
    desc: "커뮤니티 광장, 마을 방문, 숏츠 공유, 방명록 시스템 출시.",
    color: "#A29BFE",
  },
  {
    date: "2026 Q1",
    title: "모바일 출시",
    desc: "Capacitor를 통한 Android 빌드, PWA 지원, 크로스 플랫폼 플레이 활성화.",
    color: "#FD79A8",
  },
  {
    date: "2026 Q2",
    title: "앞으로의 계획",
    desc: "거래 시스템, 길드 배틀, 시즌 이벤트, 월드보스 레이드가 곧 찾아옵니다.",
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
