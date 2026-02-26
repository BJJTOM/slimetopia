"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/common/Button";

const NAV_LINKS = [
  { href: "/", label: "홈" },
  { href: "/game", label: "게임 소개" },
  { href: "/about", label: "소개" },
  { href: "/news", label: "소식" },
  { href: "/support", label: "고객지원" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`web-header ${scrolled ? "web-header-scrolled" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group"
          style={{ textDecoration: "none" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
            style={{
              background: "linear-gradient(135deg, #00D2D3, #55EFC4)",
              boxShadow: "0 0 20px rgba(0, 210, 211, 0.3)",
              transition: "box-shadow 0.3s ease",
            }}
          >
            <span className="text-[#0a0e14] font-black text-sm">S</span>
          </div>
          <span
            className="font-extrabold text-lg tracking-tight"
            style={{
              background: "linear-gradient(135deg, #55EFC4, #FFEAA7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            SlimeTopia
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="web-nav-link text-sm font-semibold tracking-wide"
              style={{ textDecoration: "none" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="primary" size="sm" href="/login">
            지금 플레이
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-3 -mr-2 touch-manipulation min-w-[44px] min-h-[44px] items-center justify-center"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span
            className="block w-5 h-0.5 bg-[#55EFC4] transition-all duration-300 rounded-full"
            style={{
              transform: mobileOpen ? "rotate(45deg) translate(2px, 5px)" : "none",
            }}
          />
          <span
            className="block w-5 h-0.5 bg-[#55EFC4] transition-all duration-300 rounded-full"
            style={{ opacity: mobileOpen ? 0 : 1 }}
          />
          <span
            className="block w-5 h-0.5 bg-[#55EFC4] transition-all duration-300 rounded-full"
            style={{
              transform: mobileOpen ? "rotate(-45deg) translate(2px, -5px)" : "none",
            }}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="md:hidden web-glass-strong"
          style={{
            padding: "12px 16px 20px",
            borderTop: "1px solid rgba(0, 210, 211, 0.1)",
          }}
        >
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold py-3 px-2 rounded-lg touch-manipulation"
                style={{
                  color: "rgba(232, 236, 240, 0.8)",
                  textDecoration: "none",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                  minHeight: "44px",
                  display: "flex",
                  alignItems: "center",
                }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2">
              <Button variant="primary" size="sm" href="/login" className="w-full">
                지금 플레이
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
