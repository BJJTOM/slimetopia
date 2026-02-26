"use client";

import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import SlimeShowcase from "@/components/home/SlimeShowcase";
import ScreenshotSection from "@/components/home/ScreenshotSection";
import CtaSection from "@/components/home/CtaSection";

// Note: Capacitor redirect is handled in layout.tsx
export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <div className="web-divider" />
      <FeaturesSection />
      <div className="web-divider-wave" />
      <SlimeShowcase />
      <div className="web-divider" />
      <ScreenshotSection />
      <CtaSection />
    </>
  );
}
