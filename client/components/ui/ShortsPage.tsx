"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useGameStore } from "@/lib/store/gameStore";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { elementColors, elementNames, gradeNames, personalityNames, personalityEmoji } from "@/lib/constants";

interface ShortContent {
  id: string;
  type: "tip" | "showcase" | "recipe" | "fact" | "quiz";
  title: string;
  author: string;
  content: string;
  element?: string;
  grade?: string;
  likes: number;
  comments: number;
  shares: number;
  gradient: string;
  icon: string;
}

const SHORTS_DATA: ShortContent[] = [
  {
    id: "s1", type: "tip", title: "초보자 필수 팁!",
    author: "슬라임마스터", content: "매일 출석체크와 일일미션을 꼭 완료하세요!\n골드와 젬을 꾸준히 모을 수 있어요.",
    likes: 342, comments: 28, shares: 15,
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", icon: "💡",
  },
  {
    id: "s2", type: "showcase", title: "전설급 합성 성공!",
    author: "럭키가이", content: "불 + 물 속성 합성으로 전설급을 뽑았어요!\n확률이 정말 낮은데 대박!",
    element: "fire", grade: "legendary",
    likes: 891, comments: 67, shares: 44,
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", icon: "✨",
  },
  {
    id: "s3", type: "recipe", title: "숨겨진 합성 레시피",
    author: "연구원슬라임", content: "같은 종의 에픽 등급 2마리를 합성하면\n레전더리 등급으로 업그레이드 가능!",
    element: "dark", grade: "epic",
    likes: 1205, comments: 89, shares: 72,
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", icon: "🔮",
  },
  {
    id: "s4", type: "fact", title: "슬라임 성격의 비밀",
    author: "도감왕", content: "같은 종이라도 성격에 따라 행동이 달라요!\n먹보 성격은 배고파지는 속도가 빨라요.",
    likes: 567, comments: 34, shares: 21,
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", icon: "🧬",
  },
  {
    id: "s5", type: "tip", title: "탐험 효율 높이기",
    author: "탐험가", content: "탐험 보내기 전에 날씨를 확인하세요!\n날씨 버프가 적용되는 속성의 슬라임을\n보내면 보상이 더 좋아요.",
    likes: 423, comments: 41, shares: 33,
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", icon: "🧭",
  },
  {
    id: "s6", type: "quiz", title: "슬라임 퀴즈!",
    author: "퀴즈봇", content: "Q: 전체 슬라임 종류는 몇 개일까요?\n\nA: 200종 + 3종 히든 = 총 203종!\n도감 완성을 목표로 해보세요!",
    likes: 234, comments: 56, shares: 12,
    gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)", icon: "❓",
  },
  {
    id: "s7", type: "showcase", title: "미식 슬라임 6성 달성",
    author: "등급장인", content: "드디어 미식 등급 슬라임을 만들었습니다!\n레전더리 2마리 합성이 핵심!",
    element: "celestial", grade: "mythic",
    likes: 2341, comments: 156, shares: 98,
    gradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)", icon: "👑",
  },
  {
    id: "s8", type: "tip", title: "마을 건설 가이드",
    author: "건축왕", content: "마을 건물은 레벨이 높을수록 보너스도 커져요.\n골드 광산 → 상점 → 연구소 순서로\n업그레이드하는 게 효율적!",
    likes: 678, comments: 45, shares: 37,
    gradient: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)", icon: "🏗️",
  },
  {
    id: "s9", type: "fact", title: "히든 슬라임 존재?!",
    author: "루머헌터", content: "특별한 재료와 조합으로만 얻을 수 있는\n히든 슬라임 3종이 존재합니다!\n조이보이, 임, 원피스...",
    element: "light", grade: "mythic",
    likes: 3456, comments: 234, shares: 167,
    gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)", icon: "🔒",
  },
  {
    id: "s10", type: "tip", title: "낚시 미니게임 공략",
    author: "낚시왕", content: "타이밍 바가 초록 구간에 있을 때 탭하세요!\n연속 성공할수록 희귀한 보상이 나와요.\nPERFECT 노려보세요!",
    likes: 890, comments: 67, shares: 45,
    gradient: "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)", icon: "🎣",
  },
];

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function ShortsPage({ onClose, embedded }: { onClose: () => void; embedded?: boolean }) {
  const { species } = useGameStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentShort = SHORTS_DATA[currentIndex];

  const goNext = useCallback(() => {
    if (transitioning || currentIndex >= SHORTS_DATA.length - 1) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((i) => Math.min(i + 1, SHORTS_DATA.length - 1));
      setTransitioning(false);
    }, 200);
  }, [currentIndex, transitioning]);

  const goPrev = useCallback(() => {
    if (transitioning || currentIndex <= 0) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((i) => Math.max(i - 1, 0));
      setTransitioning(false);
    }, 200);
  }, [currentIndex, transitioning]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === " ") goNext();
      else if (e.key === "ArrowUp") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    tip: { label: "꿀팁", color: "#FFEAA7" },
    showcase: { label: "자랑", color: "#A29BFE" },
    recipe: { label: "레시피", color: "#55EFC4" },
    fact: { label: "상식", color: "#74B9FF" },
    quiz: { label: "퀴즈", color: "#FD79A8" },
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header — hidden in embedded mode */}
      {!embedded && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm">
            <span className="text-white/80 text-sm">←</span>
          </button>
          <h1 className="text-white font-bold text-lg drop-shadow-lg">쇼츠</h1>
          <div className="ml-auto text-[10px] text-white/50 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
            {currentIndex + 1}/{SHORTS_DATA.length}
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`absolute inset-0 flex flex-col transition-opacity duration-200 ${transitioning ? "opacity-0" : "opacity-100"}`}
          style={{ background: currentShort.gradient }}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -right-10 top-20 text-[120px] opacity-[0.08] rotate-12">
              {currentShort.icon}
            </div>
            <div className="absolute -left-5 bottom-32 text-[80px] opacity-[0.05] -rotate-12">
              {currentShort.icon}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 flex flex-col justify-center px-6 py-20 relative z-10">
            {/* Type badge */}
            <div className="mb-4">
              <span
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  background: `${typeLabels[currentShort.type]?.color}22`,
                  color: typeLabels[currentShort.type]?.color,
                  border: `1px solid ${typeLabels[currentShort.type]?.color}44`,
                }}
              >
                {typeLabels[currentShort.type]?.label}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-black text-white mb-4 drop-shadow-lg leading-tight">
              {currentShort.title}
            </h2>

            {/* Slime illustration if applicable */}
            {currentShort.element && (
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(10px)" }}>
                  <img src={generateSlimeIconSvg(currentShort.element, 48, currentShort.grade || "common")} alt="" className="w-12 h-12" draggable={false} />
                </div>
                <div>
                  <p className="text-white/90 text-sm font-bold">
                    {elementNames[currentShort.element]} 속성
                  </p>
                  <p className="text-white/60 text-xs">
                    {gradeNames[currentShort.grade || "common"]} 등급
                  </p>
                </div>
              </div>
            )}

            {/* Content text */}
            <div className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(10px)" }}>
              <p className="text-white/90 text-sm leading-relaxed whitespace-pre-line">
                {currentShort.content}
              </p>
            </div>

            {/* Author */}
            <div className="mt-4 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs">
                👤
              </div>
              <span className="text-white/70 text-sm font-bold">@{currentShort.author}</span>
            </div>
          </div>

          {/* Right side action buttons */}
          <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5 z-20">
            {/* Like */}
            <button onClick={() => toggleLike(currentShort.id)} className="flex flex-col items-center gap-1">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                liked.has(currentShort.id) ? "bg-red-500/30 scale-110" : "bg-black/30 backdrop-blur-sm"
              }`}>
                <span className="text-xl">{liked.has(currentShort.id) ? "❤️" : "🤍"}</span>
              </div>
              <span className="text-white/80 text-[10px] font-bold">
                {formatCount(currentShort.likes + (liked.has(currentShort.id) ? 1 : 0))}
              </span>
            </button>

            {/* Comment */}
            <button className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                <span className="text-xl">💬</span>
              </div>
              <span className="text-white/80 text-[10px] font-bold">
                {formatCount(currentShort.comments)}
              </span>
            </button>

            {/* Share */}
            <button className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                <span className="text-xl">↗️</span>
              </div>
              <span className="text-white/80 text-[10px] font-bold">
                {formatCount(currentShort.shares)}
              </span>
            </button>
          </div>

          {/* Bottom swipe indicator */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20 pointer-events-none">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm">
              {SHORTS_DATA.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === currentIndex ? 16 : 4,
                    height: 4,
                    background: i === currentIndex ? "white" : "rgba(255,255,255,0.3)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Navigation hints */}
          {currentIndex > 0 && (
            <button onClick={goPrev} className="absolute top-24 left-1/2 -translate-x-1/2 z-20">
              <div className="text-white/30 text-xs animate-bounce">▲ 이전</div>
            </button>
          )}
          {currentIndex < SHORTS_DATA.length - 1 && (
            <button onClick={goNext} className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20">
              <div className="text-white/30 text-xs animate-bounce">▼ 다음</div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
