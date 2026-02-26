"use client";

import Link from "next/link";

const FOOTER_LINKS = {
  Game: [
    { label: "Play Now", href: "/login" },
    { label: "Game Info", href: "/game" },
    { label: "News", href: "/news" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Support", href: "/support" },
  ],
};

export default function Footer() {
  return (
    <footer className="relative" style={{ background: "#040810" }}>
      {/* Top gradient divider */}
      <div className="web-divider" />

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #00D2D3, #55EFC4)",
                  boxShadow: "0 0 20px rgba(0, 210, 211, 0.2)",
                }}
              >
                <span className="text-[#0a0e14] font-black text-sm">S</span>
              </div>
              <span
                className="font-extrabold text-lg"
                style={{
                  background: "linear-gradient(135deg, #55EFC4, #FFEAA7)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                SlimeTopia
              </span>
            </div>
            <p
              className="text-sm max-w-xs leading-relaxed"
              style={{ color: "rgba(178, 190, 195, 0.6)" }}
            >
              Collect, merge, and raise adorable slimes. Build your dream
              village in a world of 200+ unique species.
            </p>

            {/* Decorative slimes */}
            <div className="flex gap-3 mt-6">
              {["water", "fire", "grass"].map((el) => (
                <div
                  key={el}
                  className="w-8 h-8 rounded-full"
                  style={{
                    background: `var(--color-${el})`,
                    opacity: 0.3,
                    filter: "blur(1px)",
                    animation: `web-float-gentle 4s ease-in-out infinite`,
                    animationDelay: `${["water", "fire", "grass"].indexOf(el) * 0.8}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4
                className="text-xs font-bold uppercase tracking-wider mb-4"
                style={{ color: "rgba(85, 239, 196, 0.6)" }}
              >
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors duration-300"
                      style={{
                        color: "rgba(178, 190, 195, 0.5)",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#55EFC4")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "rgba(178, 190, 195, 0.5)")
                      }
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.04)",
          }}
        >
          <p
            className="text-xs"
            style={{ color: "rgba(178, 190, 195, 0.3)" }}
          >
            &copy; 2026 SlimeTopia. All rights reserved.
          </p>
          <p
            className="text-xs"
            style={{ color: "rgba(178, 190, 195, 0.2)" }}
          >
            Made with care for slime lovers everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}
