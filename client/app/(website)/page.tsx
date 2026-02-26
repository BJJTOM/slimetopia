"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import SlimeShowcase from "@/components/home/SlimeShowcase";
import ScreenshotSection from "@/components/home/ScreenshotSection";
import CtaSection from "@/components/home/CtaSection";

export default function LandingPage() {
  const router = useRouter();

  // Capacitor (Android/iOS) opens at root - redirect to game
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
      router.replace("/play");
    }
  }, [router]);

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
