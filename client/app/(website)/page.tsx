"use client";

import { useEffect, useState } from "react";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import SlimeShowcase from "@/components/home/SlimeShowcase";
import ScreenshotSection from "@/components/home/ScreenshotSection";
import CtaSection from "@/components/home/CtaSection";

export default function LandingPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Capacitor (Android/iOS) — hard redirect, no Next.js router dependency
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      window.location.replace("/login/");
      return;
    }
    setReady(true);
  }, []);

  if (!ready)
    return (
      <div style={{ width: "100vw", height: "100vh", background: "#0a0e14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Loading...</p>
      </div>
    );

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
