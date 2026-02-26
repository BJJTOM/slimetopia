"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import ScrollFadeIn from "@/components/common/ScrollFadeIn";

const ELEMENTS = [
  { key: "all", label: "전체", color: "#55EFC4" },
  { key: "water", label: "물", color: "#74B9FF" },
  { key: "fire", label: "불", color: "#FF6B6B" },
  { key: "grass", label: "풀", color: "#55EFC4" },
  { key: "light", label: "빛", color: "#FFEAA7" },
  { key: "dark", label: "어둠", color: "#A29BFE" },
  { key: "ice", label: "얼음", color: "#81ECEC" },
  { key: "electric", label: "번개", color: "#FDCB6E" },
  { key: "poison", label: "독", color: "#6C5CE7" },
  { key: "earth", label: "대지", color: "#E17055" },
  { key: "wind", label: "바람", color: "#DFE6E9" },
  { key: "celestial", label: "천상", color: "#FD79A8" },
];

const GRADES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

const SHOWCASE_SLIMES = ELEMENTS.slice(1).flatMap((el) =>
  GRADES.slice(0, 4).map((grade) => ({
    element: el.key,
    grade,
    color: el.color,
    label: `${grade.charAt(0).toUpperCase() + grade.slice(1)} ${el.label}`,
  }))
);

function CountUpNumber({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}</span>;
}

export default function SlimeShowcase() {
  const [filter, setFilter] = useState("all");

  const filteredSlimes =
    filter === "all"
      ? SHOWCASE_SLIMES
      : SHOWCASE_SLIMES.filter((s) => s.element === filter);

  // Generate marquee items (double for seamless loop)
  const marqueeItems = useMemo(() => {
    const items = filteredSlimes.slice(0, 20);
    return [...items, ...items];
  }, [filteredSlimes]);

  return (
    <section className="relative py-16 md:py-32 overflow-hidden">
      {/* Background element watermark */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 text-[200px] md:text-[300px] font-black pointer-events-none select-none"
        style={{ color: "rgba(255, 255, 255, 0.01)" }}
      >
        S
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <ScrollFadeIn className="text-center mb-8 md:mb-12">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[#FFEAA7]/60 mb-2 sm:mb-3">
            컬렉션
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black web-text-glow-warm">
            <CountUpNumber target={200} />종 이상의 슬라임
          </h2>
          <p className="text-sm sm:text-base text-white/40 mt-3 sm:mt-4 max-w-xl mx-auto">
            평범한 물 슬라임부터 신비로운 천상의 드래곤까지.
            모든 슬라임은 고유한 속성, 등급, 성격을 가지고 있습니다.
          </p>
        </ScrollFadeIn>

        {/* Filter buttons */}
        <ScrollFadeIn className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-8 md:mb-12">
          {ELEMENTS.map((el) => (
            <button
              key={el.key}
              onClick={() => setFilter(el.key)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold transition-all duration-300 cursor-pointer touch-manipulation"
              style={{
                background:
                  filter === el.key ? `${el.color}20` : "rgba(255,255,255,0.03)",
                color: filter === el.key ? el.color : "rgba(255,255,255,0.4)",
                border: `1px solid ${filter === el.key ? `${el.color}40` : "rgba(255,255,255,0.06)"}`,
                boxShadow:
                  filter === el.key
                    ? `0 0 16px ${el.color}20`
                    : "none",
              }}
            >
              {el.label}
            </button>
          ))}
        </ScrollFadeIn>

        {/* Marquee */}
        <div className="relative">
          {/* Fade edges */}
          <div
            className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 z-10 pointer-events-none"
            style={{
              background: "linear-gradient(to right, #060a10, transparent)",
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 z-10 pointer-events-none"
            style={{
              background: "linear-gradient(to left, #060a10, transparent)",
            }}
          />

          <div className="overflow-hidden">
            <div className="web-marquee-track">
              {marqueeItems.map((slime, i) => (
                <SlimeCard key={`${slime.element}-${slime.grade}-${i}`} slime={slime} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SlimeCard({
  slime,
}: {
  slime: { element: string; grade: string; color: string; label: string };
}) {
  const svg = useMemo(
    () => generateSlimeIconSvg(slime.element, 80, slime.grade),
    [slime.element, slime.grade]
  );

  return (
    <div
      className="flex-shrink-0 mx-1.5 sm:mx-3 group cursor-default"
      style={{ width: 110 }}
    >
      <div
        className="rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 transition-all duration-300"
        style={{
          background: "rgba(14, 18, 30, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.04)",
        }}
      >
        <div
          className="transition-all duration-300"
          style={{
            filter: `drop-shadow(0 0 12px ${slime.color}40)`,
          }}
        >
          <img
            src={svg}
            alt={slime.label}
            className="w-12 h-12 sm:w-16 sm:h-16 transition-transform duration-300 group-hover:scale-110"
            draggable={false}
          />
        </div>
        <div className="text-center">
          <p
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: slime.color }}
          >
            {slime.grade}
          </p>
          <p className="text-xs text-white/40 mt-0.5 capitalize">
            {slime.element}
          </p>
        </div>
      </div>
    </div>
  );
}
