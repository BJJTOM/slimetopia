"use client";

import { useState } from "react";
import ScrollFadeIn from "@/components/common/ScrollFadeIn";

const SCREENSHOTS = [
  {
    id: "home",
    label: "홈",
    desc: "PixiJS로 실시간 렌더링되는 나만의 슬라임 서식지",
    color: "#55EFC4",
  },
  {
    id: "collection",
    label: "컬렉션",
    desc: "200종 이상, 1200가지 변종에 걸친 수집 진행도 추적",
    color: "#74B9FF",
  },
  {
    id: "merge",
    label: "합성소",
    desc: "슬라임을 합성하여 새로운 종과 희귀 돌연변이를 발견",
    color: "#FFEAA7",
  },
  {
    id: "shop",
    label: "상점",
    desc: "알, 먹이, 장식품을 구매하여 마을을 꾸미세요",
    color: "#A29BFE",
  },
];

export default function ScreenshotSection() {
  const [active, setActive] = useState(0);

  return (
    <section className="relative py-16 md:py-32 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <ScrollFadeIn className="text-center mb-10 md:mb-16">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[#74B9FF]/60 mb-2 sm:mb-3">
            스크린샷
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black web-text-glow">
            직접 확인해보세요
          </h2>
        </ScrollFadeIn>

        <ScrollFadeIn>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 items-center">
            {/* Device frame */}
            <div className="lg:col-span-3 flex justify-center">
              <div className="web-device-phone w-[240px] h-[420px] sm:w-[280px] sm:h-[500px] md:w-[320px] md:h-[570px]">
                {/* Screen content placeholder */}
                <div
                  className="w-full h-full flex flex-col items-center justify-center p-5 sm:p-8 text-center"
                  style={{
                    background: `linear-gradient(135deg, ${SCREENSHOTS[active].color}08, rgba(10, 14, 20, 0.95))`,
                  }}
                >
                  <div
                    className="text-4xl sm:text-6xl mb-3 sm:mb-4"
                    style={{
                      filter: `drop-shadow(0 0 20px ${SCREENSHOTS[active].color}60)`,
                    }}
                  >
                    {active === 0
                      ? "\uD83C\uDFE0"
                      : active === 1
                      ? "\uD83D\uDCDA"
                      : active === 2
                      ? "\u2728"
                      : "\uD83D\uDED2"}
                  </div>
                  <h3
                    className="text-lg font-bold mb-2"
                    style={{ color: SCREENSHOTS[active].color }}
                  >
                    {SCREENSHOTS[active].label}
                  </h3>
                  <p className="text-sm text-white/40">
                    {SCREENSHOTS[active].desc}
                  </p>
                  {/* Decorative grid */}
                  <div className="mt-6 grid grid-cols-3 gap-2 w-full max-w-[200px]">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg"
                        style={{
                          background: `${SCREENSHOTS[active].color}${8 + i * 3 > 15 ? (8 + i * 3).toString(16) : "0" + (8 + i * 3).toString(16)}`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Glowing border */}
                <div
                  className="absolute inset-0 rounded-[32px] pointer-events-none transition-all duration-500"
                  style={{
                    boxShadow: `inset 0 0 30px ${SCREENSHOTS[active].color}10, 0 0 40px ${SCREENSHOTS[active].color}10`,
                  }}
                />
              </div>
            </div>

            {/* Thumbnail list */}
            <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3">
              {SCREENSHOTS.map((ss, i) => (
                <button
                  key={ss.id}
                  onClick={() => setActive(i)}
                  className="p-3 sm:p-4 rounded-xl sm:rounded-2xl text-left transition-all duration-300 cursor-pointer touch-manipulation"
                  style={{
                    background:
                      active === i
                        ? `${ss.color}10`
                        : "rgba(14, 18, 30, 0.4)",
                    border: `1px solid ${active === i ? `${ss.color}30` : "rgba(255,255,255,0.04)"}`,
                    boxShadow:
                      active === i
                        ? `0 0 24px ${ss.color}10`
                        : "none",
                  }}
                >
                  {/* Active indicator bar */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1 h-8 rounded-full transition-all duration-300"
                      style={{
                        background: active === i ? ss.color : "rgba(255,255,255,0.06)",
                        boxShadow:
                          active === i ? `0 0 8px ${ss.color}60` : "none",
                      }}
                    />
                    <div>
                      <h4
                        className="text-sm font-bold transition-colors duration-300"
                        style={{
                          color: active === i ? ss.color : "rgba(255,255,255,0.5)",
                        }}
                      >
                        {ss.label}
                      </h4>
                      <p className="text-xs text-white/30 mt-1 hidden lg:block">
                        {ss.desc}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </ScrollFadeIn>
      </div>
    </section>
  );
}
