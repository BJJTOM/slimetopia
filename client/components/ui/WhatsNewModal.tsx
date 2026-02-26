"use client";

import { useState, useEffect } from "react";

const CURRENT_VERSION = "3.0";
const STORAGE_KEY = "slimetopia_seen_version";

const features = [
  { emoji: "🎣", title: "낚시 미니게임", desc: "연못을 탭하여 물고기를 낚아보세요!" },
  { emoji: "🏃", title: "슬라임 레이스 리뉴얼", desc: "장애물, 콤보, 파워업이 추가되었습니다" },
  { emoji: "🎰", title: "매일 무료 룰렛", desc: "매일 1회 무료 스핀으로 보상을 받으세요" },
  { emoji: "🥚", title: "10연차 소환", desc: "10개를 한번에 소환! 10% 할인 혜택" },
  { emoji: "⚡", title: "부스터 시스템", desc: "EXP 2배, 골드 2배, 행운 부스터 사용 가능" },
  { emoji: "🏆", title: "리더보드", desc: "다른 플레이어와 순위를 겨뤄보세요" },
  { emoji: "🏅", title: "업적 시스템", desc: "12개의 업적을 달성하고 보상을 획득!" },
  { emoji: "🧊", title: "새로운 탐험지 6곳", desc: "얼음 동굴, 천둥 봉우리 등 9곳 탐험 가능" },
];

export default function WhatsNewModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== CURRENT_VERSION) {
      setVisible(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="game-panel rounded-3xl p-6 w-[340px] max-h-[85vh] animate-scale-in relative overflow-hidden">
        {/* Header glow */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle at 50% 0%, #55EFC4, transparent 60%)" }}
        />

        <div className="relative z-10">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🎉</div>
            <h2 className="text-white font-bold text-lg">새로운 업데이트!</h2>
            <p className="text-[#B2BEC3] text-[10px] mt-1">v{CURRENT_VERSION} — 대규모 콘텐츠 업데이트</p>
          </div>

          <div className="space-y-2 max-h-[45vh] overflow-y-auto game-scroll pr-1">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover-glow"
                style={{ animation: `stagger-slide-in 0.3s ease-out ${i * 60}ms both` }}
              >
                <span className="text-lg flex-shrink-0 mt-0.5">{f.emoji}</span>
                <div>
                  <div className="text-white text-xs font-bold">{f.title}</div>
                  <div className="text-[#B2BEC3] text-[9px] mt-0.5 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleClose}
            className="btn-primary w-full py-3 text-sm mt-4 active:scale-95 transition-transform font-bold"
          >
            🎮 시작하기!
          </button>
        </div>
      </div>
    </div>
  );
}
