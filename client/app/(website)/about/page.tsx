import ScrollFadeIn from "@/components/common/ScrollFadeIn";
import Timeline from "@/components/about/Timeline";

export default function AboutPage() {
  return (
    <div style={{ paddingTop: 80 }}>
      {/* Hero */}
      <section className="py-20 px-6 text-center">
        <ScrollFadeIn>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#55EFC4]/60 mb-3">
            소개
          </p>
          <h1 className="text-4xl md:text-6xl font-black web-text-gradient mb-6">
            슬라임토피아 이야기
          </h1>
          <p className="text-white/40 max-w-2xl mx-auto leading-relaxed">
            슬라임토피아는 단순한 아이디어에서 탄생했습니다: 크리처 수집이
            뽁뽁이 터뜨리기만큼 만족스러우면 어떨까? 깊이 있는 합성 메커니즘과
            활기찬 커뮤니티를 갖춘 가장 귀엽고 중독성 있는 수집 게임을
            만들어보기로 했습니다.
          </p>
        </ScrollFadeIn>
      </section>

      <div className="web-divider" />

      {/* Vision */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "수집",
              desc: "고유한 속성, 등급, 성격을 가진 200종 이상의 슬라임. 모든 슬라임에는 이야기가 있습니다.",
              color: "#55EFC4",
              icon: "\uD83E\uDDEC",
            },
            {
              title: "소통",
              desc: "친구를 방문하고, 컬렉션을 공유하고, 활기찬 슬라임 커뮤니티에서 함께 성장하세요.",
              color: "#74B9FF",
              icon: "\uD83C\uDF0D",
            },
            {
              title: "창조",
              desc: "슬라임을 합성하고, 숨겨진 레시피를 발견하고, 전설의 경지까지 진화하세요.",
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
            로드맵
          </p>
          <h2 className="text-3xl md:text-4xl font-black web-text-glow">
            우리의 여정
          </h2>
        </ScrollFadeIn>
        <Timeline />
      </section>

      {/* Team section */}
      <section className="py-20 px-6">
        <ScrollFadeIn className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#FD79A8]/60 mb-3">
            팀
          </p>
          <h2 className="text-3xl md:text-4xl font-black mb-6 web-text-glow">
            사랑을 담아 만들었습니다
          </h2>
          <p className="text-white/40 leading-relaxed">
            슬라임토피아는 게임이 기쁨을 줘야 한다고 믿는 열정적인 소규모 팀이
            만들었습니다. Next.js, PixiJS, Go로 제작 — 우리 슬라임들은
            최고의 기술 스택을 누릴 자격이 있으니까요.
          </p>
        </ScrollFadeIn>
      </section>
    </div>
  );
}
