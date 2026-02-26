"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isApp, setIsApp] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if running in Capacitor native app
    const checkPlatform = () => {
      const capacitor = (window as any).Capacitor;
      if (capacitor && typeof capacitor.isNativePlatform === "function") {
        return capacitor.isNativePlatform();
      }
      // Check for Capacitor indicators in user agent or URL scheme
      const isCapacitorWebView = 
        window.location.protocol === "capacitor:" ||
        window.location.hostname === "localhost" && navigator.userAgent.includes("wv");
      return isCapacitorWebView;
    };

    const isNative = checkPlatform();
    setIsApp(isNative);
    
    // Capacitor app: redirect to login
    if (isNative) {
      router.replace("/login/");
    }
  }, [router]);

  // Still checking platform
  if (isApp === null) {
    return (
      <div className="web-page" style={{ minHeight: '100vh', background: '#0a0e14' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🐸</div>
            <p style={{ color: '#55EFC4', fontSize: 18, fontWeight: 500 }}>SlimeTopia</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirecting to login (app detected)
  if (isApp === true) {
    return (
      <div className="web-page" style={{ minHeight: '100vh', background: '#0a0e14' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🐸</div>
            <p style={{ color: '#55EFC4', fontSize: 18, fontWeight: 500 }}>SlimeTopia</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 }}>Loading game...</p>
          </div>
        </div>
      </div>
    );
  }

  // Web browser: show full website layout
  return (
    <div className="web-page">
      <Header />
      <main className="relative z-10">{children}</main>
      <Footer />
    </div>
  );
}
