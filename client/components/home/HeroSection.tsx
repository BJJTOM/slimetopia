"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import Button from "@/components/common/Button";

const PARTICLES = Array.from({ length: 40 }, (_, i) => ({
  x: Math.random() * 100,
  size: 1 + Math.random() * 2.5,
  opacity: 0.15 + Math.random() * 0.25,
  duration: 10 + Math.random() * 14,
  delay: Math.random() * 15,
  color: ["#55EFC4", "#74B9FF", "#FFEAA7", "#A29BFE", "#FD79A8"][i % 5],
}));

const SUBTITLES = [
  "200종 이상의 슬라임을 수집하세요",
  "합성하고 진화시켜 희귀종을 만드세요",
  "나만의 슬라임 마을을 꾸며보세요",
  "숨겨진 전설의 슬라임을 발견하세요",
];

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [typedText, setTypedText] = useState("");
  const [subtitleIdx, setSubtitleIdx] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const slimeWater = useMemo(() => generateSlimeIconSvg("water", 100, "rare"), []);
  const slimeFire = useMemo(() => generateSlimeIconSvg("fire", 100, "epic"), []);
  const slimeGrass = useMemo(() => generateSlimeIconSvg("grass", 120, "legendary"), []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
    };
    const el = containerRef.current;
    el?.addEventListener("mousemove", handleMouseMove);
    return () => el?.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const text = SUBTITLES[subtitleIdx];
    let charIdx = 0;
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      const type = () => {
        if (charIdx <= text.length) {
          setTypedText(text.slice(0, charIdx));
          charIdx++;
          timeout = setTimeout(type, 40 + Math.random() * 30);
        } else {
          timeout = setTimeout(() => setIsTyping(false), 2000);
        }
      };
      type();
    } else {
      let len = text.length;
      const erase = () => {
        if (len >= 0) {
          setTypedText(text.slice(0, len));
          len--;
          timeout = setTimeout(erase, 20);
        } else {
          setSubtitleIdx((prev) => (prev + 1) % SUBTITLES.length);
          setIsTyping(true);
        }
      };
      erase();
    }

    return () => clearTimeout(timeout);
  }, [subtitleIdx, isTyping]);

  const px = (mousePos.x - 0.5) * 2;
  const py = (mousePos.y - 0.5) * 2;

  return (
    <section
      ref={containerRef}
      className="relative flex items-center justify-center overflow-hidden"
      style={{ minHeight: "calc(100vh - 20px)", paddingTop: 64, paddingBottom: 40 }}
    >
      {/* Background gradient orbs */}
      <div className="absolute w-[300px] md:w-[600px] h-[300px] md:h-[600px] rounded-full" style={{ left: "5%", top: "10%", background: "radial-gradient(circle, rgba(0, 210, 211, 0.08), transparent 70%)", filter: "blur(60px)", animation: "web-glow-breathe 6s ease-in-out infinite", transform: `translate(${px * -15}px, ${py * -15}px)` }} />
      <div className="absolute w-[250px] md:w-[500px] h-[250px] md:h-[500px] rounded-full" style={{ right: "0%", bottom: "10%", background: "radial-gradient(circle, rgba(162, 155, 254, 0.06), transparent 70%)", filter: "blur(60px)", animation: "web-glow-breathe 8s ease-in-out infinite 2s", transform: `translate(${px * 10}px, ${py * 10}px)` }} />

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLES.map((p, i) => (
          <div key={i} className="absolute rounded-full" style={{ left: `${p.x}%`, bottom: "-5%", width: p.size, height: p.size, background: p.color, opacity: p.opacity, animation: `web-particle-float ${p.duration}s linear infinite`, animationDelay: `${p.delay}s` }} />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-5 max-w-4xl mx-auto w-full">
        {/* Slimes */}
        <div className="relative flex items-end justify-center gap-2 sm:gap-4 mb-5 md:mb-8 h-32 sm:h-40 md:h-48">
          <div className="web-glow-ring web-glow-water" style={{ transform: `translate(${px * -20}px, ${py * -10}px)`, transition: "transform 0.3s ease-out", animation: "web-float-gentle 5s ease-in-out infinite" }}>
            <img src={slimeWater} alt="" className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 drop-shadow-[0_0_20px_rgba(116,185,255,0.5)]" draggable={false} />
          </div>
          <div className="web-glow-ring web-glow-grass relative" style={{ transform: `translate(${px * -8}px, ${py * -5}px) scale(1.1)`, transition: "transform 0.3s ease-out", animation: "web-float-gentle 4s ease-in-out infinite 0.5s", zIndex: 10 }}>
            <img src={slimeGrass} alt="" className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 drop-shadow-[0_0_28px_rgba(85,239,196,0.6)]" draggable={false} />
          </div>
          <div className="web-glow-ring web-glow-fire" style={{ transform: `translate(${px * 20}px, ${py * -10}px)`, transition: "transform 0.3s ease-out", animation: "web-float-gentle 5s ease-in-out infinite 1s" }}>
            <img src={slimeFire} alt="" className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 drop-shadow-[0_0_20px_rgba(255,107,107,0.5)]" draggable={false} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-3 tracking-tight web-text-gradient" style={{ lineHeight: 1.1 }}>
          SlimeTopia
        </h1>

        {/* Subtitle */}
        <div className="h-7 sm:h-8 mb-6 md:mb-8">
          <p className="text-sm sm:text-base md:text-xl text-white/50 font-medium">
            {typedText}
            <span className="inline-block w-0.5 h-4 sm:h-5 bg-[#55EFC4] ml-1 align-middle" style={{ animation: "web-typing-cursor 1s step-end infinite" }} />
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="primary" size="lg" href="/login" className="w-full sm:w-auto">
            지금 시작하기
          </Button>
          <Button variant="secondary" size="md" href="/game" className="w-full sm:w-auto">
            자세히 보기
          </Button>
        </div>
      </div>

      {/* Scroll indicator - hide on small mobile */}
      <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-1" style={{ animation: "web-scroll-indicator 2s ease-in-out infinite" }}>
        <span className="text-[10px] text-white/25 font-medium tracking-wider">아래로</span>
        <svg width="16" height="10" viewBox="0 0 20 12" fill="none" className="text-white/25">
          <path d="M1 1L10 10L19 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </section>
  );
}
