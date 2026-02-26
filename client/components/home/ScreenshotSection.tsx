"use client";

import { useState } from "react";
import ScrollFadeIn from "@/components/common/ScrollFadeIn";

const SCREENSHOTS = [
  {
    id: "home",
    label: "Home",
    desc: "Your personal slime habitat with real-time PixiJS rendering",
    color: "#55EFC4",
  },
  {
    id: "collection",
    label: "Collection",
    desc: "Track your progress across 200+ species and 1200 variants",
    color: "#74B9FF",
  },
  {
    id: "merge",
    label: "Merge Lab",
    desc: "Combine slimes to discover new species and rare mutations",
    color: "#FFEAA7",
  },
  {
    id: "shop",
    label: "Shop",
    desc: "Purchase eggs, food, and decorations for your village",
    color: "#A29BFE",
  },
];

export default function ScreenshotSection() {
  const [active, setActive] = useState(0);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <ScrollFadeIn className="text-center mb-16">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#74B9FF]/60 mb-3">
            Screenshots
          </p>
          <h2 className="text-4xl md:text-5xl font-black web-text-glow">
            See It In Action
          </h2>
        </ScrollFadeIn>

        <ScrollFadeIn>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            {/* Device frame */}
            <div className="lg:col-span-3 flex justify-center">
              <div className="web-device-phone w-[280px] h-[500px] md:w-[320px] md:h-[570px]">
                {/* Screen content placeholder */}
                <div
                  className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
                  style={{
                    background: `linear-gradient(135deg, ${SCREENSHOTS[active].color}08, rgba(10, 14, 20, 0.95))`,
                  }}
                >
                  <div
                    className="text-6xl mb-4"
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
            <div className="lg:col-span-2 flex flex-row lg:flex-col gap-3">
              {SCREENSHOTS.map((ss, i) => (
                <button
                  key={ss.id}
                  onClick={() => setActive(i)}
                  className="flex-1 lg:flex-none p-4 rounded-2xl text-left transition-all duration-300 cursor-pointer"
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
