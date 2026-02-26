"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import Button from "@/components/common/Button";

const PARTICLES = Array.from({ length: 70 }, (_, i) => ({
  x: Math.random() * 100,
  size: 1 + Math.random() * 3,
  opacity: 0.15 + Math.random() * 0.3,
  duration: 8 + Math.random() * 16,
  delay: Math.random() * 20,
  color:
    i % 5 === 0
      ? "#55EFC4"
      : i % 5 === 1
      ? "#74B9FF"
      : i % 5 === 2
      ? "#FFEAA7"
      : i % 5 === 3
      ? "#A29BFE"
      : "#FD79A8",
}));

const SUBTITLES = [
  "Collect 200+ unique slime species",
  "Merge and evolve rare breeds",
  "Build your dream slime village",
  "Discover hidden legendary slimes",
];

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [typedText, setTypedText] = useState("");
  const [subtitleIdx, setSubtitleIdx] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  // Generate slime SVGs
  const slimeWater = useMemo(() => generateSlimeIconSvg("water", 120, "rare"), []);
  const slimeFire = useMemo(() => generateSlimeIconSvg("fire", 120, "epic"), []);
  const slimeGrass = useMemo(() => generateSlimeIconSvg("grass", 140, "legendary"), []);

  // Mouse parallax
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

  // Typing effect
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
      // Erase
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
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ paddingTop: 64 }}
    >
      {/* Background gradient orbs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          left: "10%",
          top: "10%",
          background: "radial-gradient(circle, rgba(0, 210, 211, 0.08), transparent 70%)",
          filter: "blur(60px)",
          animation: "web-glow-breathe 6s ease-in-out infinite",
          transform: `translate(${px * -15}px, ${py * -15}px)`,
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          right: "5%",
          bottom: "10%",
          background: "radial-gradient(circle, rgba(162, 155, 254, 0.06), transparent 70%)",
          filter: "blur(60px)",
          animation: "web-glow-breathe 8s ease-in-out infinite 2s",
          transform: `translate(${px * 10}px, ${py * 10}px)`,
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          left: "50%",
          top: "60%",
          background: "radial-gradient(circle, rgba(255, 234, 167, 0.05), transparent 70%)",
          filter: "blur(50px)",
          animation: "web-glow-breathe 7s ease-in-out infinite 4s",
        }}
      />

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              bottom: "-5%",
              width: p.size,
              height: p.size,
              background: p.color,
              opacity: p.opacity,
              animation: `web-particle-float ${p.duration}s linear infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Slimes */}
        <div className="relative flex items-end justify-center gap-4 mb-8 h-48">
          {/* Left slime */}
          <div
            className="web-glow-ring web-glow-water"
            style={{
              transform: `translate(${px * -20}px, ${py * -10}px)`,
              transition: "transform 0.3s ease-out",
              animation: "web-float-gentle 5s ease-in-out infinite",
            }}
          >
            <img
              src={slimeWater}
              alt="Water Slime"
              className="w-24 h-24 md:w-28 md:h-28 drop-shadow-[0_0_24px_rgba(116,185,255,0.5)]"
              draggable={false}
            />
          </div>

          {/* Center slime (main) */}
          <div
            className="web-glow-ring web-glow-grass relative"
            style={{
              transform: `translate(${px * -8}px, ${py * -5}px) scale(1.1)`,
              transition: "transform 0.3s ease-out",
              animation: "web-float-gentle 4s ease-in-out infinite 0.5s",
              zIndex: 10,
            }}
          >
            <img
              src={slimeGrass}
              alt="Grass Slime"
              className="w-32 h-32 md:w-36 md:h-36 drop-shadow-[0_0_32px_rgba(85,239,196,0.6)]"
              draggable={false}
            />
          </div>

          {/* Right slime */}
          <div
            className="web-glow-ring web-glow-fire"
            style={{
              transform: `translate(${px * 20}px, ${py * -10}px)`,
              transition: "transform 0.3s ease-out",
              animation: "web-float-gentle 5s ease-in-out infinite 1s",
            }}
          >
            <img
              src={slimeFire}
              alt="Fire Slime"
              className="w-24 h-24 md:w-28 md:h-28 drop-shadow-[0_0_24px_rgba(255,107,107,0.5)]"
              draggable={false}
            />
          </div>
        </div>

        {/* Title */}
        <h1
          className="text-5xl md:text-7xl font-black mb-4 tracking-tight web-text-gradient"
          style={{ lineHeight: 1.1 }}
        >
          SlimeTopia
        </h1>

        {/* Subtitle with typing effect */}
        <div className="h-8 mb-8">
          <p className="text-lg md:text-xl text-white/50 font-medium">
            {typedText}
            <span
              className="inline-block w-0.5 h-5 bg-[#55EFC4] ml-1 align-middle"
              style={{ animation: "web-typing-cursor 1s step-end infinite" }}
            />
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="primary" size="lg" href="/play">
            Start Playing
          </Button>
          <Button variant="secondary" size="lg" href="/game">
            Learn More
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ animation: "web-scroll-indicator 2s ease-in-out infinite" }}
      >
        <span className="text-xs text-white/30 font-medium tracking-wider">SCROLL</span>
        <svg
          width="20"
          height="12"
          viewBox="0 0 20 12"
          fill="none"
          className="text-white/30"
        >
          <path
            d="M1 1L10 10L19 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </section>
  );
}
