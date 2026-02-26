"use client";

import { useMemo } from "react";
import ScrollFadeIn from "@/components/common/ScrollFadeIn";
import Button from "@/components/common/Button";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";

const ELEMENTS_INFO = [
  { name: "Water", color: "#74B9FF", icon: "\uD83D\uDCA7" },
  { name: "Fire", color: "#FF6B6B", icon: "\uD83D\uDD25" },
  { name: "Grass", color: "#55EFC4", icon: "\uD83C\uDF3F" },
  { name: "Light", color: "#FFEAA7", icon: "\u2B50" },
  { name: "Dark", color: "#A29BFE", icon: "\uD83C\uDF19" },
  { name: "Ice", color: "#81ECEC", icon: "\u2744\uFE0F" },
  { name: "Electric", color: "#FDCB6E", icon: "\u26A1" },
  { name: "Poison", color: "#6C5CE7", icon: "\u2620\uFE0F" },
  { name: "Earth", color: "#E17055", icon: "\uD83C\uDF0D" },
  { name: "Wind", color: "#DFE6E9", icon: "\uD83D\uDCA8" },
  { name: "Celestial", color: "#FD79A8", icon: "\uD83D\uDCAB" },
];

const RECIPES_PREVIEW = [
  { from: ["Water", "Fire"], result: "Steam Slime", color: "#81ECEC" },
  { from: ["Grass", "Light"], result: "Bloom Slime", color: "#55EFC4" },
  { from: ["Dark", "Poison"], result: "Shadow Slime", color: "#6C5CE7" },
  { from: ["Electric", "Wind"], result: "Storm Slime", color: "#FDCB6E" },
];

const GRADES_INFO = [
  { name: "Common", color: "#B2BEC3", stars: 1 },
  { name: "Uncommon", color: "#55EFC4", stars: 2 },
  { name: "Rare", color: "#74B9FF", stars: 3 },
  { name: "Epic", color: "#A29BFE", stars: 4 },
  { name: "Legendary", color: "#FFEAA7", stars: 5 },
  { name: "Mythic", color: "#FF6B6B", stars: 6 },
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
            Game Guide
          </h1>
          <p className="text-white/40 max-w-2xl mx-auto">
            Everything you need to know about raising, collecting, and merging
            slimes in SlimeTopia.
          </p>
        </ScrollFadeIn>
      </section>

      <div className="web-divider" />

      {/* Elements */}
      <section className="py-20 px-6">
        <ScrollFadeIn className="text-center mb-12">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#55EFC4]/60 mb-3">
            Elements
          </p>
          <h2 className="text-3xl md:text-4xl font-black web-text-glow">
            11 Elemental Types
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
            Rarity
          </p>
          <h2 className="text-3xl md:text-4xl font-black web-text-glow-warm">
            6 Grade Tiers
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
            Synthesis
          </p>
          <h2 className="text-3xl md:text-4xl font-black web-text-glow">
            Merge & Discover
          </h2>
          <p className="text-white/40 mt-4 max-w-xl mx-auto">
            Combine different slimes to create entirely new species. 30 recipes
            to discover, including 3 hidden legendary mutations.
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
            Ready to Start Collecting?
          </h2>
          <Button variant="primary" size="lg" href="/play">
            Play Now
          </Button>
        </ScrollFadeIn>
      </section>
    </div>
  );
}
