"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useShortsStore, type Short } from "@/lib/store/shortsStore";
import ShortsUploadModal from "./ShortsUploadModal";
import ShortsCommentSheet from "./ShortsCommentSheet";
import ShortsGiftSheet from "./ShortsGiftSheet";
import { toastSuccess } from "./Toast";

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/* Card colors for shorts without video */
const CARD_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)",
  "linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)",
  "linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)",
];

const CARD_EMOJIS = ["🐌", "🌟", "✨", "🎮", "🏆", "💎", "🔥", "🌊", "🌿", "⚡", "🎯", "🎪"];

function getCardStyle(index: number) {
  return {
    background: CARD_GRADIENTS[index % CARD_GRADIENTS.length],
  };
}

/* ─── Skeleton ────────────────────────────────────────────────────────────── */
function ShortsSkeleton() {
  return (
    <div className="absolute inset-0 bg-[#0a0a1a] flex flex-col items-center justify-center">
      <div className="w-20 h-20 rounded-2xl skeleton mb-4" />
      <div className="w-32 h-3 skeleton rounded mb-2" />
      <div className="w-24 h-2 skeleton rounded" />
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-10 h-10 rounded-full skeleton" />
        ))}
      </div>
    </div>
  );
}

/* ─── ShortsCard — renders a content card for shorts ───────────────── */
interface ShortsCardProps {
  short: Short;
  index: number;
  isActive: boolean;
  onLike: () => void;
  onUnlike: () => void;
  onComment: () => void;
  onGift: () => void;
  onShare: () => void;
  onView: () => void;
}

function ShortsCard({ short, index, isActive, onLike, onUnlike, onComment, onGift, onShare, onView }: ShortsCardProps) {
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef(0);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (isActive && !viewedRef.current) {
      viewedRef.current = true;
      onView();
    }
  }, [isActive, onView]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!short.liked) onLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
      if (navigator.vibrate) navigator.vibrate(50);
    }
    lastTapRef.current = now;
  }, [short.liked, onLike]);

  const emoji = CARD_EMOJIS[index % CARD_EMOJIS.length];

  return (
    <div className="absolute inset-0" style={getCardStyle(index)} onClick={handleTap}>
      {/* Decorative pattern overlay */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Double-tap heart animation */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="text-7xl opacity-90" style={{ animation: "heartBurst 0.8s ease-out forwards" }}>
            ❤️
          </div>
        </div>
      )}

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 z-10">
        <div className="text-6xl mb-4" style={{ animation: isActive ? "float 3s ease-in-out infinite" : "none" }}>
          {emoji}
        </div>
        <h2 className="text-white font-black text-xl text-center leading-tight mb-3 drop-shadow-lg">
          {short.title}
        </h2>
        {short.description && (
          <p className="text-white/80 text-sm text-center leading-relaxed max-w-[280px] drop-shadow">
            {short.description}
          </p>
        )}
        {short.tags && short.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
            {short.tags.slice(0, 5).map((tag) => (
              <span key={tag} className="text-[11px] text-white/90 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-16 left-4 right-16 z-20">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-xs font-bold text-white">
            {short.nickname[0]}
          </div>
          <span className="text-white font-bold text-sm drop-shadow-lg">@{short.nickname}</span>
        </div>
      </div>

      {/* Right side action buttons */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-20">
        {/* Like */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            short.liked ? onUnlike() : onLike();
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
            short.liked ? "bg-red-500/40 scale-110" : "bg-black/30 backdrop-blur-sm"
          }`}>
            <span className={`text-xl transition-transform duration-200 ${short.liked ? "scale-125" : ""}`}>
              {short.liked ? "❤️" : "🤍"}
            </span>
          </div>
          <span className="text-white/80 text-[10px] font-bold tabular-nums">{formatCount(short.likes)}</span>
        </button>

        {/* Comment */}
        <button onClick={(e) => { e.stopPropagation(); onComment(); }} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <span className="text-xl">💬</span>
          </div>
          <span className="text-white/80 text-[10px] font-bold tabular-nums">{formatCount(short.comment_count)}</span>
        </button>

        {/* Share */}
        <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <span className="text-xl">🔗</span>
          </div>
          <span className="text-white/80 text-[10px] font-bold">공유</span>
        </button>

        {/* Gift */}
        {!short.is_mine && (
          <button onClick={(e) => { e.stopPropagation(); onGift(); }} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <span className="text-xl">🎁</span>
            </div>
            <span className="text-white/80 text-[10px] font-bold">선물</span>
          </button>
        )}

        {/* Views */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <span className="text-xl">👁️</span>
          </div>
          <span className="text-white/80 text-[10px] font-bold tabular-nums">{formatCount(short.views)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ShortsPage ─────────────────────────────────────────────────────── */

export default function ShortsPage({ onClose, embedded }: { onClose: () => void; embedded?: boolean }) {
  const token = useAuthStore((s) => s.accessToken);
  const { shorts, hasMore, loading, fetchFeed, likeShort, unlikeShort, viewShort } = useShortsStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swiping, setSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const [showUpload, setShowUpload] = useState(false);
  const [commentShortId, setCommentShortId] = useState<string | null>(null);
  const [giftShortId, setGiftShortId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);

  // Initial feed load
  useEffect(() => {
    if (token) {
      fetchFeed(token, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Loading timeout — if loading takes >5s, show empty state
  useEffect(() => {
    if (loading && shorts.length === 0) {
      const timer = setTimeout(() => setLoadTimeout(true), 5000);
      return () => clearTimeout(timer);
    }
    setLoadTimeout(false);
  }, [loading, shorts.length]);

  // Prefetch more when near end
  useEffect(() => {
    if (token && currentIndex >= shorts.length - 3 && hasMore && !loading) {
      fetchFeed(token);
    }
  }, [currentIndex, shorts.length, hasMore, loading, token, fetchFeed]);

  const currentShort = shorts[currentIndex];

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= shorts.length) return;
    setCurrentIndex(index);
  }, [shorts.length]);

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  // Share via Web Share API or clipboard
  const handleShare = useCallback(async () => {
    if (!currentShort) return;
    const shareUrl = `${window.location.origin}/shorts/${currentShort.id}`;
    const shareData = {
      title: currentShort.title,
      text: `${currentShort.title} - SlimeTopia Shorts`,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toastSuccess("링크가 복사되었어요!");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toastSuccess("링크가 복사되었어요!");
      } catch {
        // ignore
      }
    }
  }, [currentShort]);

  // Optimistic like/unlike
  const handleLike = useCallback(() => {
    if (!token || !currentShort) return;
    useShortsStore.setState((s) => ({
      shorts: s.shorts.map((sh) =>
        sh.id === currentShort.id ? { ...sh, liked: true, likes: sh.likes + 1 } : sh
      ),
    }));
    likeShort(token, currentShort.id).catch(() => {
      useShortsStore.setState((s) => ({
        shorts: s.shorts.map((sh) =>
          sh.id === currentShort.id ? { ...sh, liked: false, likes: Math.max(0, sh.likes - 1) } : sh
        ),
      }));
    });
  }, [token, currentShort, likeShort]);

  const handleUnlike = useCallback(() => {
    if (!token || !currentShort) return;
    useShortsStore.setState((s) => ({
      shorts: s.shorts.map((sh) =>
        sh.id === currentShort.id ? { ...sh, liked: false, likes: Math.max(0, sh.likes - 1) } : sh
      ),
    }));
    unlikeShort(token, currentShort.id).catch(() => {
      useShortsStore.setState((s) => ({
        shorts: s.shorts.map((sh) =>
          sh.id === currentShort.id ? { ...sh, liked: true, likes: sh.likes + 1 } : sh
        ),
      }));
    });
  }, [token, currentShort, unlikeShort]);

  // Touch swipe — improved scrolling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (commentShortId || giftShortId || showUpload) return;
    setTouchStart(e.touches[0].clientY);
    setSwiping(true);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null || !swiping) return;
    const diff = touchStart - e.touches[0].clientY;
    // Apply resistance at edges
    const atTop = currentIndex === 0 && diff < 0;
    const atBottom = currentIndex === shorts.length - 1 && diff > 0;
    const resistance = (atTop || atBottom) ? 0.2 : 0.5;
    setSwipeOffset(-diff * resistance);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientY;
    setSwiping(false);
    setSwipeOffset(0);
    setTouchStart(null);
    if (Math.abs(diff) > 60) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  // Mouse wheel navigation
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (wheelTimeoutRef.current) return;
    if (Math.abs(e.deltaY) > 30) {
      if (e.deltaY > 0) goNext();
      else goPrev();
      wheelTimeoutRef.current = setTimeout(() => {
        wheelTimeoutRef.current = null;
      }, 400);
    }
  }, [goNext, goPrev]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (commentShortId || giftShortId || showUpload) return;
      if (e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, commentShortId, giftShortId, showUpload]);

  // Skeleton loading state
  if (loading && shorts.length === 0 && !loadTimeout) {
    return (
      <div className="h-full flex flex-col bg-[#0a0a1a]">
        {!embedded && (
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-3"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm">
              <span className="text-white/80 text-sm">←</span>
            </button>
            <h1 className="text-white font-bold text-lg">쇼츠</h1>
          </div>
        )}
        <ShortsSkeleton />
      </div>
    );
  }

  // Empty state
  if (shorts.length === 0) {
    return (
      <div className="h-full flex flex-col bg-[#0a0a1a]">
        {!embedded && (
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-3"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm">
              <span className="text-white/80 text-sm">←</span>
            </button>
            <h1 className="text-white font-bold text-lg">쇼츠</h1>
          </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="text-6xl">🎬</div>
          <p className="text-white/50 text-center">
            아직 쇼츠가 없어요<br/>
            첫 번째 쇼츠를 올려보세요!
          </p>
          <button onClick={() => setShowUpload(true)}
            className="px-6 py-2.5 rounded-full text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #55EFC4, #00B894)" }}>
            업로드
          </button>
        </div>
        {showUpload && <ShortsUploadModal onClose={() => setShowUpload(false)} />}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      {!embedded && (
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm">
            <span className="text-white/80 text-sm">←</span>
          </button>
          <h1 className="text-white font-bold text-lg drop-shadow-lg">쇼츠</h1>
          <div className="ml-auto text-[10px] text-white/50 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full tabular-nums">
            {currentIndex + 1}/{shorts.length}
          </div>
        </div>
      )}

      {/* Scrollable card container */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Current card */}
        <div
          className="absolute inset-0 transition-transform ease-out"
          style={{
            transform: `translateY(${swipeOffset}px)`,
            transitionDuration: swiping ? "0ms" : "300ms",
          }}
        >
          {currentShort && (
            <ShortsCard
              key={currentShort.id}
              short={currentShort}
              index={currentIndex}
              isActive={true}
              onLike={handleLike}
              onUnlike={handleUnlike}
              onComment={() => setCommentShortId(currentShort.id)}
              onGift={() => setGiftShortId(currentShort.id)}
              onShare={handleShare}
              onView={() => token && viewShort(token, currentShort.id)}
            />
          )}
        </div>

        {/* Loading for next page */}
        {loading && shorts.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}

        {/* Navigation hints */}
        {currentIndex > 0 && (
          <button onClick={goPrev} className="absolute top-24 left-1/2 -translate-x-1/2 z-20">
            <div className="text-white/40 text-xs animate-bounce">▲ 이전</div>
          </button>
        )}
        {currentIndex < shorts.length - 1 && (
          <button onClick={goNext} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
            <div className="text-white/40 text-xs animate-bounce">▼ 다음</div>
          </button>
        )}

        {/* Bottom dots indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1">
          {shorts.slice(Math.max(0, currentIndex - 3), currentIndex + 4).map((s, i) => {
            const realIdx = Math.max(0, currentIndex - 3) + i;
            return (
              <div key={s.id}
                className="rounded-full transition-all duration-200"
                style={{
                  width: realIdx === currentIndex ? 16 : 4,
                  height: 4,
                  background: realIdx === currentIndex ? "white" : "rgba(255,255,255,0.3)",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Upload FAB */}
      <button
        onClick={() => setShowUpload(true)}
        className="absolute bottom-20 right-4 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: "linear-gradient(135deg, #55EFC4, #00B894)", boxShadow: "0 4px 16px rgba(85,239,196,0.3)" }}
      >
        <span className="text-[#0a0a1a] text-2xl leading-none font-bold">+</span>
      </button>

      {/* Modals */}
      {showUpload && <ShortsUploadModal onClose={() => setShowUpload(false)} />}
      {commentShortId && (
        <ShortsCommentSheet shortId={commentShortId} onClose={() => setCommentShortId(null)} />
      )}
      {giftShortId && (
        <ShortsGiftSheet shortId={giftShortId} onClose={() => setGiftShortId(null)} />
      )}

      <style jsx global>{`
        @keyframes heartBurst {
          0% { transform: scale(0); opacity: 0; }
          30% { transform: scale(1.3); opacity: 1; }
          60% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
