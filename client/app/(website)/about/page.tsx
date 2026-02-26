import ScrollFadeIn from "@/components/common/ScrollFadeIn";
import Timeline from "@/components/about/Timeline";

export default function AboutPage() {
  return (
    <div style={{ paddingTop: 80 }}>
      {/* Hero */}
      <section className="py-20 px-6 text-center">
        <ScrollFadeIn>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#55EFC4]/60 mb-3">
            About
          </p>
          <h1 className="text-4xl md:text-6xl font-black web-text-gradient mb-6">
            The Story of SlimeTopia
          </h1>
          <p className="text-white/40 max-w-2xl mx-auto leading-relaxed">
            SlimeTopia was born from a simple idea: what if collecting creatures
            was as satisfying as popping bubble wrap? We set out to create the
            most adorable, addictive collection game with deep merge mechanics
            and a vibrant community.
          </p>
        </ScrollFadeIn>
      </section>

      <div className="web-divider" />

      {/* Vision */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Collect",
              desc: "200+ species with unique elements, grades, and personalities. Every slime tells a story.",
              color: "#55EFC4",
              icon: "\uD83E\uDDEC",
            },
            {
              title: "Connect",
              desc: "Visit friends, share your collection, and build together in a vibrant slime community.",
              color: "#74B9FF",
              icon: "\uD83C\uDF0D",
            },
            {
              title: "Create",
              desc: "Merge slimes, discover hidden recipes, and evolve your way to legendary status.",
              color: "#FFEAA7",
              icon: "\u2728",
            },
          ].map((item, i) => (
            <ScrollFadeIn key={item.title} delay={i * 150}>
              <div
                className="p-8 rounded-2xl text-center transition-all duration-300 hover:translate-y-[-4px]"
                style={{
                  background: "rgba(14, 18, 30, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                }}
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold mb-3" style={{ color: item.color }}>
                  {item.title}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
              </div>
            </ScrollFadeIn>
          ))}
        </div>
      </section>

      <div className="web-divider" />

      {/* Timeline */}
      <section className="py-20 px-6">
        <ScrollFadeIn className="text-center mb-16">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#A29BFE]/60 mb-3">
            Roadmap
          </p>
          <h2 className="text-3xl md:text-4xl font-black web-text-glow">
            Our Journey
          </h2>
        </ScrollFadeIn>
        <Timeline />
      </section>

      {/* Team section */}
      <section className="py-20 px-6">
        <ScrollFadeIn className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#FD79A8]/60 mb-3">
            Team
          </p>
          <h2 className="text-3xl md:text-4xl font-black mb-6 web-text-glow">
            Made With Love
          </h2>
          <p className="text-white/40 leading-relaxed">
            SlimeTopia is crafted by a small passionate team who believes games
            should bring joy. Built with Next.js, PixiJS, and Go — because our
            slimes deserve the best tech stack.
          </p>
        </ScrollFadeIn>
      </section>
    </div>
  );
}
