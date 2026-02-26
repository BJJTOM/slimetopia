import ScrollFadeIn from "@/components/common/ScrollFadeIn";

const NEWS_ITEMS = [
  {
    date: "Feb 26, 2026",
    category: "Update",
    title: "Website Visual Overhaul",
    desc: "Brand new premium website with glassmorphism design, interactive elements, and stunning visual effects.",
    color: "#55EFC4",
  },
  {
    date: "Feb 20, 2026",
    category: "Feature",
    title: "World Boss Raids",
    desc: "Team up with other players to take down massive boss slimes. New stages and rewards every week.",
    color: "#FF6B6B",
  },
  {
    date: "Feb 15, 2026",
    category: "Event",
    title: "Valentine's Day Collection",
    desc: "Limited-time Heart Slime available through special event missions. Collect all 3 variants!",
    color: "#FD79A8",
  },
  {
    date: "Feb 10, 2026",
    category: "Update",
    title: "Accessory System Launch",
    desc: "Dress up your slimes with hats, glasses, and more. Over 30 accessories to collect and equip.",
    color: "#FFEAA7",
  },
  {
    date: "Feb 5, 2026",
    category: "Feature",
    title: "Community Shorts",
    desc: "Share short video clips of your slime adventures. Like, comment, and discover other players' content.",
    color: "#74B9FF",
  },
  {
    date: "Jan 28, 2026",
    category: "Update",
    title: "Mobile Android Build",
    desc: "SlimeTopia is now available as a native Android app via Capacitor. Play anywhere, anytime.",
    color: "#A29BFE",
  },
];

export default function NewsPage() {
  return (
    <div style={{ paddingTop: 80 }}>
      <section className="py-20 px-6">
        <ScrollFadeIn className="text-center mb-16">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#55EFC4]/60 mb-3">
            News
          </p>
          <h1 className="text-4xl md:text-6xl font-black web-text-gradient mb-6">
            Latest Updates
          </h1>
          <p className="text-white/40 max-w-xl mx-auto">
            Stay up to date with the latest features, events, and improvements
            in SlimeTopia.
          </p>
        </ScrollFadeIn>

        <div className="max-w-3xl mx-auto space-y-4">
          {NEWS_ITEMS.map((item, i) => (
            <ScrollFadeIn key={item.title} delay={i * 80}>
              <article
                className="web-news-card p-6 rounded-2xl transition-all duration-300 hover:translate-y-[-2px] cursor-default"
                style={{
                  background: "rgba(14, 18, 30, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                  "--accent-color": item.color,
                } as React.CSSProperties}
              >
                <div className="flex items-start gap-4">
                  {/* Accent bar */}
                  <div
                    className="w-1 h-full min-h-[60px] rounded-full flex-shrink-0 hidden md:block"
                    style={{
                      background: `linear-gradient(180deg, ${item.color}, ${item.color}40)`,
                    }}
                  />

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          background: `${item.color}15`,
                          color: item.color,
                        }}
                      >
                        {item.category}
                      </span>
                      <span className="text-xs text-white/25">{item.date}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-white/40 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </article>
            </ScrollFadeIn>
          ))}
        </div>
      </section>
    </div>
  );
}
