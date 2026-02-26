"use client";

import { useState } from "react";
import ScrollFadeIn from "@/components/common/ScrollFadeIn";

const FAQ_ITEMS = [
  {
    q: "How do I start playing?",
    a: "Click 'Play Now' and choose guest login to start immediately. You can link your email later to save your progress across devices.",
  },
  {
    q: "How does the merge system work?",
    a: "Place two slimes in the Merge Lab. If they match a recipe, you'll discover a new species! Same-species merges upgrade the grade. There are 30 recipes including 3 hidden legendary mutations.",
  },
  {
    q: "How many slimes can I collect?",
    a: "There are 200+ regular species and 3 hidden legendaries. Each species has 6 grade variants, making the full collection 1200+ unique combinations.",
  },
  {
    q: "Is the game free to play?",
    a: "Yes! SlimeTopia is completely free to play. All features are accessible without spending money. The shop exists for convenience items only.",
  },
  {
    q: "Can I play on mobile?",
    a: "Yes! SlimeTopia works as a PWA in mobile browsers and is also available as a native Android app. iOS support is coming soon.",
  },
  {
    q: "How do I report a bug?",
    a: "You can report bugs through the in-game support system or contact us directly. We appreciate all feedback to improve the game!",
  },
  {
    q: "What are the hidden legendary slimes?",
    a: "There are 3 secret slimes (IDs 777, 888, 999) that can only be obtained through special mutation recipes using rare catalyst materials. Discover the recipes yourself!",
  },
  {
    q: "How do daily rewards work?",
    a: "Log in each day to receive attendance rewards. You can also spin the daily lucky wheel for bonus prizes. Complete daily missions for even more rewards.",
  },
];

function FaqItem({
  q,
  a,
  index,
}: {
  q: string;
  a: string;
  index: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <ScrollFadeIn delay={index * 60}>
      <div
        className={`rounded-2xl transition-all duration-300 cursor-pointer ${open ? "web-faq-open" : ""}`}
        style={{
          background: "rgba(14, 18, 30, 0.6)",
          border: `1px solid ${open ? "rgba(0, 210, 211, 0.15)" : "rgba(255, 255, 255, 0.04)"}`,
        }}
        onClick={() => setOpen(!open)}
      >
        <div className="p-5 flex items-center justify-between gap-4">
          <h3
            className="text-sm font-bold transition-colors duration-300"
            style={{ color: open ? "#55EFC4" : "rgba(255, 255, 255, 0.7)" }}
          >
            {q}
          </h3>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            className="flex-shrink-0 transition-transform duration-300"
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              color: open ? "#55EFC4" : "rgba(255, 255, 255, 0.3)",
            }}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
        {open && (
          <div className="px-5 pb-5 -mt-1">
            <p className="text-sm text-white/40 leading-relaxed">{a}</p>
          </div>
        )}
      </div>
    </ScrollFadeIn>
  );
}

export default function SupportPage() {
  return (
    <div style={{ paddingTop: 80 }}>
      <section className="py-20 px-6">
        <ScrollFadeIn className="text-center mb-16">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#55EFC4]/60 mb-3">
            Support
          </p>
          <h1 className="text-4xl md:text-6xl font-black web-text-gradient mb-6">
            How Can We Help?
          </h1>
          <p className="text-white/40 max-w-xl mx-auto">
            Find answers to common questions or reach out to our support team.
          </p>
        </ScrollFadeIn>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto space-y-3 mb-20">
          <ScrollFadeIn className="mb-8">
            <h2 className="text-xl font-bold web-text-glow">
              Frequently Asked Questions
            </h2>
          </ScrollFadeIn>
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={item.q} q={item.q} a={item.a} index={i} />
          ))}
        </div>

        {/* Contact */}
        <ScrollFadeIn className="max-w-2xl mx-auto">
          <div
            className="p-8 rounded-2xl text-center"
            style={{
              background: "rgba(14, 18, 30, 0.6)",
              border: "1px solid rgba(0, 210, 211, 0.08)",
            }}
          >
            <h2 className="text-xl font-bold mb-3 web-text-glow">
              Still Need Help?
            </h2>
            <p className="text-sm text-white/40 mb-6">
              Our team is here to help you with any questions or issues.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div
                className="px-6 py-4 rounded-xl"
                style={{
                  background: "rgba(0, 210, 211, 0.06)",
                  border: "1px solid rgba(0, 210, 211, 0.1)",
                }}
              >
                <p className="text-xs text-white/30 mb-1">Email</p>
                <p className="text-sm font-bold text-[#55EFC4]">
                  support@slimetopia.com
                </p>
              </div>
              <div
                className="px-6 py-4 rounded-xl"
                style={{
                  background: "rgba(162, 155, 254, 0.06)",
                  border: "1px solid rgba(162, 155, 254, 0.1)",
                }}
              >
                <p className="text-xs text-white/30 mb-1">Discord</p>
                <p className="text-sm font-bold text-[#A29BFE]">
                  discord.gg/slimetopia
                </p>
              </div>
            </div>
          </div>
        </ScrollFadeIn>
      </section>
    </div>
  );
}
