"use client";

import { useRef, useState, MouseEvent } from "react";
import ScrollFadeIn from "@/components/common/ScrollFadeIn";

const FEATURES = [
  {
    icon: "\uD83E\uDDEC",
    title: "200종 이상",
    desc: "15개 세력에 걸쳐 200종 이상의 고유한 슬라임을 발견하세요. 각각 고유한 속성과 성격을 가지고 있습니다.",
    color: "#55EFC4",
    gradient: "from-[#00D2D3] to-[#55EFC4]",
  },
  {
    icon: "\u2728",
    title: "합성 & 진화",
    desc: "슬라임을 합성하여 강력한 새 종을 만드세요. 3종의 숨겨진 전설 돌연변이를 포함한 30가지 합성 레시피를 해금하세요.",
    color: "#FFEAA7",
    gradient: "from-[#FFEAA7] to-[#FDCB6E]",
  },
  {
    icon: "\uD83C\uDFE1",
    title: "마을 꾸미기",
    desc: "나만의 슬라임 마을을 디자인하고 꾸며보세요. 건물과 정원을 배치하고 슬라임들이 자유롭게 돌아다니는 걸 감상하세요.",
    color: "#74B9FF",
    gradient: "from-[#74B9FF] to-[#0984E3]",
  },
  {
    icon: "\uD83C\uDFC6",
    title: "경쟁 & 수집",
    desc: "컬렉션을 완성하고, 리더보드 순위를 올리고, 업적을 달성하세요. 모두 모을 수 있을까요?",
    color: "#A29BFE",
    gradient: "from-[#A29BFE] to-[#6C5CE7]",
  },
  {
    icon: "\uD83C\uDF1F",
    title: "매일 보상",
    desc: "매일 접속하면 출석 보너스, 행운의 룰렛, 미션 보상 등 다양한 혜택이 기다립니다.",
    color: "#FD79A8",
    gradient: "from-[#FD79A8] to-[#E84393]",
  },
  {
    icon: "\uD83C\uDF0D",
    title: "커뮤니티",
    desc: "친구의 마을을 방문하고, 슬라임을 교환하고, 희귀한 슬라임을 커뮤니티에 공유하세요.",
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
          className="relative p-5 sm:p-8 rounded-[23px]"
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
            className="relative text-3xl sm:text-4xl mb-4 sm:mb-5 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-xl sm:rounded-2xl transition-transform duration-300"
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
    <section className="relative py-16 md:py-32 px-4 sm:px-6">
      {/* Section header */}
      <ScrollFadeIn className="text-center mb-10 md:mb-16">
        <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[#55EFC4]/60 mb-2 sm:mb-3">
          주요 기능
        </p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black web-text-glow">
          모든 것이 준비되어 있어요
        </h2>
        <p className="text-sm sm:text-base text-white/40 mt-3 sm:mt-4 max-w-xl mx-auto">
          수집, 전략, 소셜 기능이 가득한 완벽한 슬라임 육성 경험을 만나보세요.
        </p>
      </ScrollFadeIn>

      {/* Cards grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {FEATURES.map((feature, i) => (
          <FeatureCard key={feature.title} feature={feature} index={i} />
        ))}
      </div>
    </section>
  );
}
