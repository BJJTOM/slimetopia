"use client";

import { useMemo } from "react";
import ScrollFadeIn from "@/components/common/ScrollFadeIn";
import Button from "@/components/common/Button";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";

const ELEMENTS_INFO = [
  { name: "물", color: "#74B9FF", icon: "\uD83D\uDCA7" },
  { name: "불", color: "#FF6B6B", icon: "\uD83D\uDD25" },
  { name: "풀", color: "#55EFC4", icon: "\uD83C\uDF3F" },
  { name: "빛", color: "#FFEAA7", icon: "\u2B50" },
  { name: "어둠", color: "#A29BFE", icon: "\uD83C\uDF19" },
  { name: "얼음", color: "#81ECEC", icon: "\u2744\uFE0F" },
  { name: "번개", color: "#FDCB6E", icon: "\u26A1" },
  { name: "독", color: "#6C5CE7", icon: "\u2620\uFE0F" },
  { name: "대지", color: "#E17055", icon: "\uD83C\uDF0D" },
  { name: "바람", color: "#DFE6E9", icon: "\uD83D\uDCA8" },
  { name: "천상", color: "#FD79A8", icon: "\uD83D\uDCAB" },
];

const RECIPES_PREVIEW = [
  { from: ["물", "불"], result: "증기 슬라임", color: "#81ECEC" },
  { from: ["풀", "빛"], result: "개화 슬라임", color: "#55EFC4" },
  { from: ["어둠", "독"], result: "그림자 슬라임", color: "#6C5CE7" },
  { from: ["번개", "바람"], result: "폭풍 슬라임", color: "#FDCB6E" },
];

const GRADES_INFO = [
  { name: "커먼", color: "#B2BEC3", stars: 1 },
  { name: "언커먼", color: "#55EFC4", stars: 2 },
  { name: "레어", color: "#74B9FF", stars: 3 },
  { name: "에픽", color: "#A29BFE", stars: 4 },
  { name: "레전더리", color: "#FFEAA7", stars: 5 },
  { name: "미식", color: "#FF6B6B", stars: 6 },
];

export default function GameInfoPage() {
  const heroSlime = useMemo(
    () => generateSlimeIconSvg("celestial", 120, "mythic"),
    []
  );

  return (
    <div style={{ paddingTop: 80 }}>
      {/* Hero */}
      <section className="py-20 px-6 text-center">
        <ScrollFadeIn>
          <img
            src={heroSlime}
            alt="Celestial Slime"
            className="w-24 h-24 mx-auto mb-6"
            style={{
              animation: "web-float-gentle 4s ease-in-out infinite",
              filter: "drop-shadow(0 0 24px rgba(253, 121, 168, 0.5))",
            }}
            draggable={false}
          />
          <h1 className="text-4xl md:text-6xl font-black web-text-gradient mb-6">
            게임 가이드
          </h1>
          <p className="text-white/40 max-w-2xl mx-auto">
            슬라임토피아에서 슬라임을 키우고, 수집하고, 합성하는 데
            필요한 모든 정보를 알려드립니다.
          </p>
        </ScrollFadeIn>
      </section>

      <div className="web-divider" />

      {/* Elements */}
      <section className="py-20 px-6">
        <ScrollFadeIn className="text-center mb-12">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#55EFC4]/60 mb-3">
            속성
          </p>
          <h2 className="text-3xl md:text-4xl font-black web-text-glow">
            11가지 속성
          </h2>
        </ScrollFadeIn>

        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {ELEMENTS_INFO.map((el, i) => (
            <ScrollFadeIn key={el.name} delay={i * 60}>
              <div
                className="p-5 rounded-2xl text-center transition-all duration-300 cursor-default group"
                style={{
                  background: "rgba(14, 18, 30, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${el.color}30`;
                  e.currentTarget.style.boxShadow = `0 0 24px ${el.color}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.04)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div className="text-2xl mb-2">{el.icon}</div>
                <p className="text-xs font-bold" style={{ color: el.color }}>
                  {el.name}
                </p>
              </div>
            </ScrollFadeIn>
          ))}
        </div>
      </section>

      <div className="web-divider" />

      {/* Grades */}
      <section className="py-20 px-6">
        <ScrollFadeIn className="text-center mb-12">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#FFEAA7]/60 mb-3">
            희귀도
          </p>
          <h2 className="text-3xl md:text-4xl font-black web-text-glow-warm">
            6단계 등급
          </h2>
        </ScrollFadeIn>

        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4">
          {GRADES_INFO.map((grade, i) => (
            <ScrollFadeIn key={grade.name} delay={i * 80}>
              <div
                className="p-5 rounded-2xl flex items-center gap-4 transition-all duration-300"
                style={{
                  background: "rgba(14, 18, 30, 0.6)",
                  border: `1px solid ${grade.color}15`,
                }}
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: grade.stars }).map((_, j) => (
                    <span key={j} style={{ color: grade.color, fontSize: 12 }}>
                      {"\u2605"}
                    </span>
                  ))}
                </div>
                <span className="text-sm font-bold" style={{ color: grade.color }}>
                  {grade.name}
                </span>
              </div>
            </ScrollFadeIn>
          ))}
        </div>
      </section>

      <div className="web-divider" />

      {/* Synthesis Preview */}
      <section className="py-20 px-6">
        <ScrollFadeIn className="text-center mb-12">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A29BFE]/60 mb-3">
            합성
          </p>
          <h2 className="text-3xl md:text-4xl font-black web-text-glow">
            합성 & 발견
          </h2>
          <p className="text-white/40 mt-4 max-w-xl mx-auto">
            서로 다른 슬라임을 합성하여 완전히 새로운 종을 만드세요.
            3종의 숨겨진 전설 돌연변이를 포함한 30가지 레시피를 발견하세요.
          </p>
        </ScrollFadeIn>

        <div className="max-w-2xl mx-auto space-y-4">
          {RECIPES_PREVIEW.map((recipe, i) => (
            <ScrollFadeIn key={recipe.result} delay={i * 100}>
              <div
                className="p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:translate-y-[-2px]"
                style={{
                  background: "rgba(14, 18, 30, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                }}
              >
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <span className="font-semibold">{recipe.from[0]}</span>
                  <span className="text-white/20">+</span>
                  <span className="font-semibold">{recipe.from[1]}</span>
                </div>
                <svg
                  width="24"
                  height="12"
                  viewBox="0 0 24 12"
                  className="text-white/20 flex-shrink-0"
                >
                  <path
                    d="M0 6H20M16 1L22 6L16 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </svg>
                <span
                  className="font-bold text-sm"
                  style={{ color: recipe.color }}
                >
                  {recipe.result}
                </span>
              </div>
            </ScrollFadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <ScrollFadeIn>
          <h2 className="text-3xl font-black mb-6 web-text-gradient">
            수집을 시작할 준비 되셨나요?
          </h2>
          <Button variant="primary" size="lg" href="/play">
            지금 플레이
          </Button>
        </ScrollFadeIn>
      </section>
    </div>
  );
}
