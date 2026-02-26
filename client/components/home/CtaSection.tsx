"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import Button from "@/components/common/Button";
import ScrollFadeIn from "@/components/common/ScrollFadeIn";

const STATS = [
  { value: 200, suffix: "+", label: "Species", color: "#55EFC4" },
  { value: 11, suffix: "", label: "Elements", color: "#74B9FF" },
  { value: 30, suffix: "", label: "Recipes", color: "#FFEAA7" },
  { value: 15, suffix: "", label: "Factions", color: "#A29BFE" },
];

const CTA_PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  x: Math.random() * 100,
  size: 1 + Math.random() * 2,
  duration: 10 + Math.random() * 15,
  delay: Math.random() * 15,
  color: ["#55EFC4", "#74B9FF", "#FFEAA7", "#A29BFE", "#FD79A8"][i % 5],
}));

function StatCounter({
  value,
  suffix,
  label,
  color,
}: {
  value: number;
  suffix: string;
  label: string;
  color: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
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
            const progress = Math.min((now - startTime) / 1500, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-black" style={{ color }}>
        {count}
        {suffix}
      </div>
      <div className="text-sm text-white/40 mt-1 font-medium">{label}</div>
    </div>
  );
}

export default function CtaSection() {
  const slimeLight = useMemo(
    () => generateSlimeIconSvg("light", 80, "legendary"),
    []
  );
  const slimeIce = useMemo(
    () => generateSlimeIconSvg("ice", 64, "rare"),
    []
  );
  const slimeCelestial = useMemo(
    () => generateSlimeIconSvg("celestial", 72, "mythic"),
    []
  );

  return (
    <section className="relative py-32 px-6 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0, 210, 211, 0.06), transparent 60%)",
        }}
      />

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {CTA_PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              bottom: "-5%",
              width: p.size,
              height: p.size,
              background: p.color,
              opacity: 0.2,
              animation: `web-particle-float ${p.duration}s linear infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Stats */}
        <ScrollFadeIn className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {STATS.map((stat) => (
            <StatCounter key={stat.label} {...stat} />
          ))}
        </ScrollFadeIn>

        {/* CTA Card */}
        <ScrollFadeIn>
          <div
            className="web-card-gradient"
            style={{ borderRadius: 32 }}
          >
            <div
              className="relative rounded-[31px] p-12 md:p-16 text-center overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(10, 14, 24, 0.95), rgba(16, 20, 32, 0.9))",
              }}
            >
              {/* Floating slimes */}
              <img
                src={slimeLight}
                alt=""
                className="absolute top-6 left-8 w-16 h-16 opacity-40"
                style={{ animation: "web-float-gentle 5s ease-in-out infinite" }}
                draggable={false}
              />
              <img
                src={slimeIce}
                alt=""
                className="absolute bottom-8 right-12 w-12 h-12 opacity-30"
                style={{ animation: "web-float-gentle 6s ease-in-out infinite 1s" }}
                draggable={false}
              />
              <img
                src={slimeCelestial}
                alt=""
                className="absolute top-12 right-8 w-14 h-14 opacity-35"
                style={{ animation: "web-float-gentle 5.5s ease-in-out infinite 2s" }}
                draggable={false}
              />

              <h2 className="text-3xl md:text-5xl font-black mb-4 web-text-gradient">
                Ready to Start?
              </h2>
              <p className="text-white/40 mb-8 max-w-md mx-auto">
                Join thousands of players collecting, merging, and raising
                slimes in SlimeTopia. Free to play, forever.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="primary" size="lg" href="/play">
                  Play Now — Free
                </Button>
                <Button variant="secondary" size="md" href="/game">
                  See All Features
                </Button>
              </div>
            </div>
          </div>
        </ScrollFadeIn>
      </div>
    </section>
  );
}
