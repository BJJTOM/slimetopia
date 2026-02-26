"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isApp, setIsApp] = useState(true); // assume app until proven otherwise

  useEffect(() => {
    setIsApp(!!(window as any).Capacitor?.isNativePlatform?.());
  }, []);

  // In Capacitor app — render nothing (page.tsx handles redirect)
  if (isApp) return null;

  return (
    <div className="web-page">
      <Header />
      <main className="relative z-10">{children}</main>
      <Footer />
    </div>
  );
}
