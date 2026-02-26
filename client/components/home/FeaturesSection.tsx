"use client";

import { useRef, useState, MouseEvent } from "react";
import ScrollFadeIn from "@/components/common/ScrollFadeIn";

const FEATURES = [
  {
    icon: "\uD83E\uDDEC",
    title: "200+ Species",
    desc: "Discover over 200 unique slime species across 15 factions, each with distinct elements and personalities.",
    color: "#55EFC4",
    gradient: "from-[#00D2D3] to-[#55EFC4]",
  },
  {
    icon: "\u2728",
    title: "Merge & Evolve",
    desc: "Combine slimes to create powerful new breeds. Unlock 30 synthesis recipes including 3 hidden legendary mutations.",
    color: "#FFEAA7",
    gradient: "from-[#FFEAA7] to-[#FDCB6E]",
  },
  {
    icon: "\uD83C\uDFE1",
    title: "Village Builder",
    desc: "Design and decorate your personal slime village. Place buildings, gardens, and watch your slimes roam freely.",
    color: "#74B9FF",
    gradient: "from-[#74B9FF] to-[#0984E3]",
  },
  {
    icon: "\uD83C\uDFC6",
    title: "Compete & Collect",
    desc: "Race to complete your collection, climb the leaderboards, and earn achievements. Can you catch them all?",
    color: "#A29BFE",
    gradient: "from-[#A29BFE] to-[#6C5CE7]",
  },
  {
    icon: "\uD83C\uDF1F",
    title: "Daily Rewards",
    desc: "Log in daily for attendance bonuses, spin the lucky wheel, and complete missions for exclusive rewards.",
    color: "#FD79A8",
    gradient: "from-[#FD79A8] to-[#E84393]",
  },
  {
    icon: "\uD83C\uDF0D",
    title: "Community",
    desc: "Visit friends' villages, trade slimes, and share your rarest finds with the global slime community.",
    color: "#81ECEC",
    gradient: "from-[#81ECEC] to-[#00CEC9]",
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[0];
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -12, y: x * 12 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setHovering(false);
  };

  return (
    <ScrollFadeIn delay={index * 100} direction="up">
      <div
        ref={cardRef}
        className="web-card-gradient web-card-tilt group cursor-default"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          "--ring-color": `${feature.color}33`,
        } as React.CSSProperties}
      >
        <div
          className="relative p-8 rounded-[23px]"
          style={{
            background: "rgba(10, 14, 24, 0.9)",
          }}
        >
          {/* Background glow on hover */}
          <div
            className="absolute inset-0 rounded-[23px] transition-opacity duration-500"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${feature.color}12, transparent 70%)`,
              opacity: hovering ? 1 : 0,
            }}
          />

          {/* Icon */}
          <div
            className="relative text-4xl mb-5 w-16 h-16 flex items-center justify-center rounded-2xl transition-transform duration-300"
            style={{
              background: `${feature.color}10`,
              transform: hovering ? "scale(1.1) translateY(-4px)" : "scale(1)",
            }}
          >
            <span style={{ filter: hovering ? `drop-shadow(0 0 8px ${feature.color})` : "none" }}>
              {feature.icon}
            </span>
          </div>

          {/* Text */}
          <h3
            className="relative text-xl font-bold mb-3"
            style={{ color: feature.color }}
          >
            {feature.title}
          </h3>
          <p className="relative text-sm leading-relaxed text-white/50">
            {feature.desc}
          </p>
        </div>
      </div>
    </ScrollFadeIn>
  );
}

export default function FeaturesSection() {
  return (
    <section className="relative py-32 px-6">
      {/* Section header */}
      <ScrollFadeIn className="text-center mb-16">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#55EFC4]/60 mb-3">
          Features
        </p>
        <h2 className="text-4xl md:text-5xl font-black web-text-glow">
          Everything You Need
        </h2>
        <p className="text-white/40 mt-4 max-w-xl mx-auto">
          A complete slime-raising experience packed with collection, strategy,
          and social features.
        </p>
      </ScrollFadeIn>

      {/* Cards grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((feature, i) => (
          <FeatureCard key={feature.title} feature={feature} index={i} />
        ))}
      </div>
    </section>
  );
}
