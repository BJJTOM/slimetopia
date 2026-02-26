"use client";

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi, uploadApi, resolveMediaUrl } from "@/lib/api/client";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import ShortsPage from "@/components/ui/ShortsPage";

type CommunityTab = "board" | "shorts" | "saved" | "updates";

const UPDATE_NOTES = [
  {
    version: "v1.2.0",
    date: "2026.02.26",
    title: "대규모 컨텐츠 업데이트",
    icon: "🎉",
    changes: [
      "🔥 월드보스 시스템 전면 개편 (5스테이지, 파티 공격)",
      "📖 컬렉션 북 디자인 리뉴얼 (가죽 표지 + 양피지)",
      "🤖 AI 유저 100명 추가 (실시간 활동)",
      "💎 재화 상점 추가 (보석/골드/별가루)",
      "🎨 홈 배경 테마 10종 추가",
      "🏋️ 훈련장 등급 보너스 시스템",
      "📸 프로필 이미지 업로드 기능",
      "🔄 일괄 합성 원클릭 개선",
      "⛏️ 탐험 신규 구역 4곳 + 재료 드롭",
    ],
  },
  {
    version: "v1.1.0",
    date: "2026.02.25",
    title: "UI 개선 및 버그 수정",
    icon: "✨",
    changes: [
      "🎮 미니게임 탭 구조 변경",
      "📱 쇼츠 카드형 콘텐츠로 변경",
      "🇰🇷 합성 에러 메시지 한국어화",
      "📖 레시피 북 페이지네이션 추가",
      "🛒 상점 가격 밸런스 조정",
      "🐛 커뮤니티 게시글 생성 버그 수정",
      "🔧 각종 UI 오버랩 문제 해결",
    ],
  },
  {
    version: "v1.0.0",
    date: "2026.02.24",
    title: "SlimeTopia 정식 출시!",
    icon: "🚀",
    changes: [
      "🌍 200종 슬라임 + 3종 히든 슬라임",
      "⚔️ 합성 시스템 (레시피 + 등급 합성)",
      "🗺️ 탐험 시스템 (9개 구역)",
      "🎣 낚시 미니게임",
      "🏆 리더보드 & 업적 시스템",
      "💬 커뮤니티 게시판 + 쇼츠",
      "📅 출석체크 & 일일미션",
    ],
  },
];

interface Post {
  id: string;
  user_id: string;
  nickname: string;
  profile_image_url?: string;
  content: string;
  post_type: string;
  likes: number;
  reply_count: number;
  view_count: number;
  image_urls: string[];
  created_at: string;
  liked: boolean;
  is_mine: boolean;
  reaction_counts?: Record<string, number>;
  my_reaction?: string;
  bookmark_count?: number;
  bookmarked?: boolean;
  rank?: number;
  score?: number;
}

interface Reply {
  id: string;
  user_id: string;
  nickname: string;
  profile_image_url?: string;
  content: string;
  likes: number;
  reply_count: number;
  created_at: string;
  liked: boolean;
  is_mine: boolean;
  parent_id?: string;
}

interface PollData {
  id: string;
  options: { option: string; votes: number; percent: number }[];
  total_votes: number;
  my_vote: number | null;
  expires_at: string;
  expired: boolean;
}

type SortMode = "new" | "hot";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👏"] as const;

const POST_TYPES = [
  { value: "", label: "전체", icon: "📋", color: "#B2BEC3" },
  { value: "general", label: "일반", icon: "💬", color: "#B2BEC3" },
  { value: "tip", label: "꿀팁", icon: "💡", color: "#FFEAA7" },
  { value: "question", label: "질문", icon: "❓", color: "#74B9FF" },
  { value: "flex", label: "자랑", icon: "✨", color: "#D4AF37" },
  { value: "screenshot", label: "스샷", icon: "📸", color: "#C9A84C" },
];

const AVATAR_GRADIENTS = [
  "from-[#D4AF37] to-[#8B6914]",
  "from-[#74B9FF] to-[#0984E3]",
  "from-[#C9A84C] to-[#8B6914]",
  "from-[#FFEAA7] to-[#FDCB6E]",
  "from-[#FF6B6B] to-[#E17055]",
  "from-[#FD79A8] to-[#E84393]",
];

const REPORT_REASONS = [
  { value: "spam", label: "스팸/광고" },
  { value: "abuse", label: "욕설/비방" },
  { value: "inappropriate", label: "부적절한 콘텐츠" },
  { value: "other", label: "기타" },
];

function getAvatarGradient(nickname: string): string {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

function PostTypeTag({ type }: { type: string }) {
  const info = POST_TYPES.find((t) => t.value === type);
  if (!info) return null;
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
      style={{
        background: `${info.color}12`,
        color: info.color,
        border: `1px solid ${info.color}20`,
      }}>
      {info.icon} {info.label}
    </span>
  );
}

/* ===== Avatar with profile image support ===== */
function Avatar({ nickname, profileImageUrl, size = "md", gradient }: {
  nickname: string;
  profileImageUrl?: string;
  size?: "sm" | "md" | "lg";
  gradient: string;
}) {
  const sizeMap = { sm: "w-5 h-5 text-[8px]", md: "w-8 h-8 text-[11px]", lg: "w-10 h-10 text-sm" };
  if (profileImageUrl) {
    return (
      <img
        src={resolveMediaUrl(profileImageUrl)}
        alt={nickname}
        className={`${sizeMap[size].split(" ").slice(0, 2).join(" ")} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {nickname.charAt(0)}
    </div>
  );
}

/* ===== Reaction Bar ===== */
function ReactionBar({ post, onReact, onUnreact }: {
  post: Post;
  onReact: (postId: string, emoji: string) => void;
  onUnreact: (postId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const counts = post.reaction_counts || {};
  const totalReactions = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-1">
      {/* Collapsed: show summary */}
      {!expanded && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-lg transition hover:bg-white/5"
          style={{ color: post.my_reaction ? "#C9A84C" : "rgba(245,230,200,0.25)" }}
        >
          {totalReactions > 0 ? (
            <>
              {Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([emoji]) => (
                <span key={emoji} className="text-[11px]">{emoji}</span>
              ))}
              <span className="tabular-nums ml-0.5">{totalReactions}</span>
            </>
          ) : (
            <span>😊+</span>
          )}
        </button>
      )}

      {/* Expanded: show all emoji options */}
      {expanded && (
        <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-xl"
          style={{ background: "rgba(44,24,16,0.95)", border: "1px solid rgba(139,105,20,0.2)" }}
          onClick={(e) => e.stopPropagation()}>
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                if (post.my_reaction === emoji) {
                  onUnreact(post.id);
                } else {
                  onReact(post.id, emoji);
                }
                setExpanded(false);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full transition hover:bg-white/10"
              style={{
                background: post.my_reaction === emoji ? "rgba(201,168,76,0.2)" : "transparent",
                transform: post.my_reaction === emoji ? "scale(1.15)" : "scale(1)",
              }}
            >
              <span className="text-[14px]">{emoji}</span>
            </button>
          ))}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
            className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] hover:bg-white/10 transition"
            style={{ color: "rgba(245,230,200,0.3)" }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

/* ===== Memoized PostCard — prevents re-render when other posts change ===== */
const PostCard = memo(function PostCard({ post, idx, onOpen, onDelete, onReport, onBlock, onReact, onUnreact, onBookmark }: {
  post: Post;
  idx: number;
  onOpen: (post: Post) => void;
  onDelete: (id: string) => void;
  onReport: (target: { type: string; id: string }) => void;
  onBlock: (userId: string, nickname: string) => void;
  onReact: (postId: string, emoji: string) => void;
  onUnreact: (postId: string) => void;
  onBookmark: (postId: string, bookmarked: boolean) => void;
}) {
  const avatarGrad = getAvatarGradient(post.nickname);
  const isHot = post.likes >= 3;
  return (
    <button
      onClick={() => onOpen(post)}
      className="w-full text-left mb-2.5 rounded-xl overflow-hidden transition-all active:scale-[0.99]"
      style={{
        background: isHot
          ? "linear-gradient(160deg, rgba(201,168,76,0.06) 0%, rgba(245,230,200,0.02) 100%)"
          : "linear-gradient(160deg, rgba(245,230,200,0.05) 0%, rgba(245,230,200,0.02) 100%)",
        border: isHot
          ? "1px solid rgba(201,168,76,0.2)"
          : "1px solid rgba(139,105,20,0.15)",
        animation: `stagger-slide-in 0.25s ease-out ${idx * 30}ms both`,
      }}>
      {/* Post header */}
      <div className="px-3 pt-3 flex items-center gap-2">
        <Avatar nickname={post.nickname} profileImageUrl={post.profile_image_url} size="md" gradient={avatarGrad} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold" style={{ color: "rgba(245,230,200,0.9)" }}>{post.nickname}</span>
            <PostTypeTag type={post.post_type} />
            {isHot && <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>🔥</span>}
          </div>
          <span className="text-[10px]" style={{ color: "rgba(201,168,76,0.3)" }}>{timeAgo(post.created_at)}</span>
        </div>
        <MoreMenu
          isMine={post.is_mine}
          onDelete={() => onDelete(post.id)}
          onReport={() => onReport({ type: "post", id: post.id })}
          onBlock={() => onBlock(post.user_id, post.nickname)}
        />
      </div>

      {/* Post content preview */}
      <div className="px-3 py-2">
        <p className="text-[13px] leading-relaxed line-clamp-3 break-words" style={{ color: "rgba(245,230,200,0.75)" }}>
          <HashtagText text={post.content} />
        </p>
        {post.image_urls.length > 0 && (
          <ImageCarousel images={post.image_urls} size="thumb" />
        )}
      </div>

      {/* Post footer */}
      <div className="px-3 pb-2.5 flex items-center gap-2">
        <ReactionBar post={post} onReact={onReact} onUnreact={onUnreact} />
        <span className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(245,230,200,0.25)" }}>
          💬 <span className="tabular-nums">{post.reply_count > 0 ? post.reply_count : "답글"}</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] ml-auto" style={{ color: "rgba(245,230,200,0.4)" }}>
          👁 <span className="tabular-nums">{post.view_count}</span>
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onBookmark(post.id, !!post.bookmarked); }}
          className="text-[12px] transition"
          style={{ color: post.bookmarked ? "#C9A84C" : "rgba(245,230,200,0.2)" }}
        >
          {post.bookmarked ? "🔖" : "🏷️"}
        </button>
      </div>
    </button>
  );
});

/* ===== Hashtag Text Renderer ===== */
function HashtagText({ text, onTagClick }: { text: string; onTagClick?: (tag: string) => void }) {
  const parts = text.split(/(#[^\s#]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <span
            key={i}
            className="cursor-pointer font-bold transition hover:underline"
            style={{ color: "#C9A84C" }}
            onClick={(e) => {
              e.stopPropagation();
              onTagClick?.(part.slice(1));
            }}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function PostSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden mb-2.5" style={{
      background: "linear-gradient(160deg, rgba(245,230,200,0.04) 0%, rgba(245,230,200,0.02) 100%)",
      border: "1px solid rgba(139,105,20,0.1)",
    }}>
      <div className="px-3 pt-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full" style={{ background: "rgba(201,168,76,0.1)", animation: "skeleton-gold 1.5s ease-in-out infinite" }} />
        <div className="flex-1 space-y-1.5">
          <div className="w-20 h-3 rounded" style={{ background: "rgba(201,168,76,0.08)", animation: "skeleton-gold 1.5s ease-in-out infinite 0.1s" }} />
          <div className="w-14 h-2 rounded" style={{ background: "rgba(201,168,76,0.06)", animation: "skeleton-gold 1.5s ease-in-out infinite 0.2s" }} />
        </div>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <div className="w-full h-3 rounded" style={{ background: "rgba(201,168,76,0.08)", animation: "skeleton-gold 1.5s ease-in-out infinite 0.15s" }} />
        <div className="w-3/4 h-3 rounded" style={{ background: "rgba(201,168,76,0.06)", animation: "skeleton-gold 1.5s ease-in-out infinite 0.25s" }} />
      </div>
      <div className="px-3 pb-2.5 flex gap-4">
        <div className="w-10 h-3 rounded" style={{ background: "rgba(201,168,76,0.06)", animation: "skeleton-gold 1.5s ease-in-out infinite 0.3s" }} />
        <div className="w-10 h-3 rounded" style={{ background: "rgba(201,168,76,0.06)", animation: "skeleton-gold 1.5s ease-in-out infinite 0.35s" }} />
      </div>
    </div>
  );
}

/* ===== Image Carousel ===== */
function ImageCarousel({ images, size = "large" }: { images: string[]; size?: "large" | "thumb" }) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) return null;

  if (size === "thumb") {
    return (
      <div className="flex gap-1.5 mt-2">
        {images.slice(0, 3).map((url, i) => (
          <div key={i} className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "rgba(245,230,200,0.05)", border: "1px solid rgba(139,105,20,0.1)" }}>
            <img src={resolveMediaUrl(url)} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
        {images.length > 3 && (
          <div className="w-16 h-16 rounded-lg flex items-center justify-center text-[10px]" style={{ background: "rgba(245,230,200,0.05)", color: "rgba(201,168,76,0.4)", border: "1px solid rgba(139,105,20,0.1)" }}>
            +{images.length - 3}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(139,105,20,0.15)" }}>
      <div
        ref={containerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: "none" }}
        onScroll={(e) => {
          const el = e.target as HTMLDivElement;
          const idx = Math.round(el.scrollLeft / el.clientWidth);
          setCurrent(idx);
        }}
      >
        {images.map((url, i) => (
          <div key={i} className="w-full flex-shrink-0 snap-center">
            <img src={resolveMediaUrl(url)} alt="" className="w-full max-h-[300px] object-contain rounded-xl" style={{ background: "rgba(0,0,0,0.2)" }} loading="lazy" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                background: i === current ? "#C9A84C" : "rgba(201,168,76,0.3)",
                transform: i === current ? "scale(1.3)" : "scale(1)",
              }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== Report Modal ===== */
function ReportModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string, detail: string) => void }) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    await onSubmit(reason, detail);
    setSubmitting(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-[340px]"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: "report-pop 0.2s ease-out",
          background: "linear-gradient(180deg, #2C1810, #1A0E08)",
          border: "1px solid rgba(139,105,20,0.25)",
        }}>
        <h3 className="font-bold text-sm mb-3" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>신고하기</h3>

        <div className="space-y-2 mb-3">
          {REPORT_REASONS.map((r) => (
            <button key={r.value} onClick={() => setReason(r.value)}
              className="w-full text-left px-3 py-2 rounded-lg text-[12px] transition"
              style={{
                background: reason === r.value ? "rgba(255,107,107,0.1)" : "rgba(245,230,200,0.04)",
                color: reason === r.value ? "#FF6B6B" : "rgba(245,230,200,0.6)",
                border: reason === r.value ? "1px solid rgba(255,107,107,0.2)" : "1px solid rgba(139,105,20,0.1)",
              }}>
              {r.label}
            </button>
          ))}
        </div>

        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="상세 내용 (선택)"
          maxLength={500}
          rows={2}
          className="w-full text-[12px] rounded-lg px-3 py-2 focus:outline-none resize-none mb-3"
          style={{
            background: "rgba(245,230,200,0.05)",
            color: "#F5E6C8",
            border: "1px solid rgba(139,105,20,0.15)",
          }}
        />

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-[12px] font-bold transition"
            style={{ background: "rgba(245,230,200,0.04)", color: "rgba(245,230,200,0.4)", border: "1px solid rgba(139,105,20,0.1)" }}>
            취소
          </button>
          <button onClick={handleSubmit} disabled={!reason || submitting}
            className="flex-1 py-2 rounded-lg text-[12px] font-bold disabled:opacity-30 transition"
            style={{ background: "linear-gradient(135deg, #FF6B6B, #E17055)", color: "#fff" }}>
            {submitting ? "..." : "신고하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Delete Confirm Modal (Bug fix #5) ===== */
function DeleteConfirmModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-[300px]"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: "report-pop 0.2s ease-out",
          background: "linear-gradient(180deg, #2C1810, #1A0E08)",
          border: "1px solid rgba(139,105,20,0.25)",
        }}>
        <h3 className="font-bold text-sm mb-2" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>삭제 확인</h3>
        <p className="text-[12px] mb-4" style={{ color: "rgba(245,230,200,0.6)" }}>
          이 게시글을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-[12px] font-bold transition"
            style={{ background: "rgba(245,230,200,0.04)", color: "rgba(245,230,200,0.4)", border: "1px solid rgba(139,105,20,0.1)" }}>
            취소
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 rounded-lg text-[12px] font-bold transition"
            style={{ background: "linear-gradient(135deg, #FF6B6B, #E17055)", color: "#fff" }}>
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Poll Component ===== */
function PollView({ postId, token }: { postId: string; token: string }) {
  const [poll, setPoll] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    authApi<{ poll: PollData | null }>(`/api/community/posts/${postId}/poll`, token)
      .then((res) => setPoll(res.poll))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId, token]);

  if (loading || !poll) return null;

  const vote = async (idx: number) => {
    if (voting || poll.expired) return;
    setVoting(true);
    try {
      await authApi(`/api/community/posts/${postId}/vote`, token, {
        method: "POST",
        body: { option_index: idx },
      });
      // Refetch poll
      const res = await authApi<{ poll: PollData }>(`/api/community/posts/${postId}/poll`, token);
      setPoll(res.poll);
    } catch {
      toastError("투표에 실패했습니다");
    }
    setVoting(false);
  };

  const hasVoted = poll.my_vote !== null;
  const remainMs = new Date(poll.expires_at).getTime() - Date.now();
  const remainH = Math.max(0, Math.ceil(remainMs / 3600000));

  return (
    <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(245,230,200,0.03)", border: "1px solid rgba(139,105,20,0.12)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold" style={{ color: "#C9A84C" }}>📊 투표</span>
        <span className="text-[9px]" style={{ color: poll.expired ? "rgba(255,107,107,0.6)" : "rgba(245,230,200,0.3)" }}>
          {poll.expired ? "마감됨" : `${remainH}시간 남음`}
        </span>
      </div>
      <div className="space-y-1.5">
        {poll.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => vote(i)}
            disabled={poll.expired || voting}
            className="w-full text-left rounded-lg px-3 py-2 relative overflow-hidden transition disabled:cursor-default"
            style={{
              border: poll.my_vote === i ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(139,105,20,0.1)",
              background: "rgba(245,230,200,0.02)",
            }}
          >
            {/* Percent bar */}
            {hasVoted && (
              <div
                className="absolute left-0 top-0 bottom-0 rounded-lg transition-all duration-500"
                style={{
                  width: `${opt.percent}%`,
                  background: poll.my_vote === i ? "rgba(201,168,76,0.12)" : "rgba(245,230,200,0.04)",
                }}
              />
            )}
            <div className="relative flex items-center justify-between">
              <span className="text-[12px]" style={{ color: poll.my_vote === i ? "#C9A84C" : "rgba(245,230,200,0.7)" }}>
                {poll.my_vote === i && "✓ "}{opt.option}
              </span>
              {hasVoted && (
                <span className="text-[10px] tabular-nums font-bold" style={{ color: "rgba(245,230,200,0.4)" }}>
                  {opt.percent}%
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      <div className="text-[9px] mt-2 text-right" style={{ color: "rgba(245,230,200,0.2)" }}>
        {poll.total_votes}명 투표
      </div>
    </div>
  );
}

/* ===== Trending Card ===== */
function TrendingCard({ post, onOpen }: { post: Post; onOpen: (post: Post) => void }) {
  const isFirst = post.rank === 1;
  return (
    <button
      onClick={() => onOpen(post)}
      className="flex-shrink-0 w-[220px] rounded-xl p-3 transition active:scale-[0.98]"
      style={{
        background: isFirst
          ? "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(201,168,76,0.04))"
          : "linear-gradient(135deg, rgba(245,230,200,0.05), rgba(245,230,200,0.02))",
        border: isFirst
          ? "1px solid rgba(212,175,55,0.3)"
          : "1px solid rgba(139,105,20,0.15)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[14px] font-bold" style={{ color: isFirst ? "#D4AF37" : "rgba(245,230,200,0.5)" }}>
          #{post.rank}
        </span>
        <Avatar nickname={post.nickname} profileImageUrl={post.profile_image_url} size="sm" gradient={getAvatarGradient(post.nickname)} />
        <span className="text-[10px] font-bold truncate" style={{ color: "rgba(245,230,200,0.8)" }}>{post.nickname}</span>
      </div>
      <p className="text-[11px] leading-relaxed line-clamp-2 break-words mb-2" style={{ color: "rgba(245,230,200,0.65)" }}>
        {post.content}
      </p>
      <div className="flex items-center gap-3 text-[9px]" style={{ color: "rgba(245,230,200,0.3)" }}>
        <span>💬 {post.reply_count}</span>
        <span>👁 {post.view_count}</span>
        {isFirst && <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(212,175,55,0.2)", color: "#D4AF37" }}>🏆 Best</span>}
      </div>
    </button>
  );
}

/* ===== More Menu (3-dot) ===== */
function MoreMenu({ isMine, onDelete, onReport, onBlock }: {
  isMine: boolean;
  onDelete?: () => void;
  onReport: () => void;
  onBlock: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 transition text-sm"
        style={{ color: "rgba(201,168,76,0.3)" }}>
        ...
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 rounded-xl overflow-hidden shadow-lg"
          style={{ background: "#2C1810", border: "1px solid rgba(139,105,20,0.2)", minWidth: 120 }}>
          {isMine && onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-[11px] text-red-400/80 hover:bg-red-500/10 transition">
              삭제
            </button>
          )}
          {!isMine && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onReport(); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-[11px] hover:bg-yellow-500/10 transition"
                style={{ color: "#C9A84C" }}>
                신고
              </button>
              <button onClick={(e) => { e.stopPropagation(); onBlock(); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-[11px] text-red-400/80 hover:bg-red-500/10 transition">
                차단
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== Search Bar ===== */
function SearchBar({ onSearch, onTagClick }: { onSearch: (q: string) => void; onTagClick: (tag: string) => void }) {
  const [query, setQuery] = useState("");
  const [trendingTags, setTrendingTags] = useState<{ tag: string; count: number }[]>([]);
  const token = useAuthStore((s) => s.accessToken);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!token) return;
    authApi<{ tags: { tag: string; count: number }[] }>("/api/community/tags/trending", token)
      .then((res) => setTrendingTags(res.tags || []))
      .catch(() => {});
  }, [token]);

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(val.trim());
    }, 400);
  };

  return (
    <div className="mb-2">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="🔍 검색 (키워드 or #태그)"
          className="w-full text-[12px] rounded-xl px-4 py-2 pl-3 focus:outline-none"
          style={{
            background: "rgba(245,230,200,0.04)",
            color: "#F5E6C8",
            border: "1px solid rgba(139,105,20,0.12)",
          }}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(201,168,76,0.3)"; }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(139,105,20,0.12)"; }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); onSearch(""); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] w-5 h-5 rounded-full flex items-center justify-center"
            style={{ color: "rgba(245,230,200,0.3)" }}
          >
            ✕
          </button>
        )}
      </div>
      {trendingTags.length > 0 && !query && (
        <div className="flex gap-1.5 mt-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {trendingTags.slice(0, 6).map((t) => (
            <button
              key={t.tag}
              onClick={() => { setQuery(`#${t.tag}`); onTagClick(t.tag); }}
              className="text-[9px] px-2 py-1 rounded-full whitespace-nowrap transition hover:bg-white/5"
              style={{ background: "rgba(201,168,76,0.08)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.12)" }}
            >
              #{t.tag} <span className="opacity-50">{t.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== Main Component ===== */
export default function CommunityPage({ onClose }: { onClose?: () => void }) {
  const token = useAuthStore((s) => s.accessToken);
  const [communityTab, setCommunityTab] = useState<CommunityTab>("board");
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("new");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Trending
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);

  // Compose
  const [showCompose, setShowCompose] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [composeType, setComposeType] = useState("general");
  const [composeImages, setComposeImages] = useState<File[]>([]);
  const [composeImagePreviews, setComposeImagePreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [composePollOptions, setComposePollOptions] = useState<string[]>([]);
  const [showPollCompose, setShowPollCompose] = useState(false);

  // Post detail
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; nickname: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  // Report & Delete confirm
  const [reportTarget, setReportTarget] = useState<{ type: string; id: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch trending on mount
  useEffect(() => {
    if (!token) return;
    authApi<{ posts: Post[] }>("/api/community/posts/trending?period=week&limit=3", token)
      .then((res) => setTrendingPosts(res.posts || []))
      .catch(() => {});
  }, [token]);

  const fetchPosts = useCallback(async (pageNum: number, filterType: string, append = false, query = "") => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum) });
      if (filterType) params.set("type", filterType);
      if (query) params.set("q", query);
      const res = await authApi<{ posts: Post[]; page: number }>(
        `/api/community/posts?${params}`, token
      );
      const newPosts = (res.posts || []).map((p) => ({
        ...p,
        image_urls: p.image_urls || [],
        reaction_counts: p.reaction_counts || {},
      }));
      if (append) {
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      setHasMore(newPosts.length >= 20);
    } catch {
      toastError("게시글을 불러올 수 없습니다");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    setPage(0);
    fetchPosts(0, filter, false, searchQuery);
  }, [filter, fetchPosts, searchQuery]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(next, filter, true, searchQuery);
  };

  // Sort posts client-side (memoized to avoid O(n log n) on every render)
  const sortedPosts = useMemo(() => {
    if (sortMode !== "hot") return posts;
    return [...posts].sort((a, b) => {
      const ageA = (Date.now() - new Date(a.created_at).getTime()) / 3600000;
      const ageB = (Date.now() - new Date(b.created_at).getTime()) / 3600000;
      const scoreA = (a.likes * 2 + a.reply_count) / Math.max(1, Math.pow(ageA + 2, 0.5));
      const scoreB = (b.likes * 2 + b.reply_count) / Math.max(1, Math.pow(ageB + 2, 0.5));
      return scoreB - scoreA;
    });
  }, [posts, sortMode]);

  // ===== Compose with images =====
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - composeImages.length;
    const selected = files.slice(0, remaining);

    setComposeImages((prev) => [...prev, ...selected]);

    const urls = selected.map((file) => URL.createObjectURL(file));
    setComposeImagePreviews((prev) => [...prev, ...urls]);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setComposeImagePreviews((prev) => {
      const url = prev[index];
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
    setComposeImages((prev) => prev.filter((_, i) => i !== index));
  };

  const createPost = async () => {
    if (!token || !composeText.trim()) return;
    setPosting(true);
    setUploadProgress(0);
    try {
      if (composeImages.length > 0) {
        // Multipart upload
        const formData = new FormData();
        formData.append("content", composeText.trim());
        formData.append("post_type", composeType);
        composeImages.forEach((img) => formData.append("images", img));
        if (composePollOptions.length >= 2) {
          formData.append("poll_options", JSON.stringify(composePollOptions));
        }

        await uploadApi<{ id: string }>("/api/community/posts", formData, token, (pct) => {
          setUploadProgress(pct);
        });
      } else {
        // JSON body (no images)
        const body: Record<string, unknown> = { content: composeText.trim(), post_type: composeType };
        if (composePollOptions.length >= 2) {
          body.poll_options = composePollOptions;
        }
        await authApi<{ id: string }>("/api/community/posts", token, {
          method: "POST",
          body,
        });
      }
      setComposeText("");
      setComposeImages([]);
      setComposePollOptions([]);
      setShowPollCompose(false);
      // Revoke blob URLs before clearing
      composeImagePreviews.forEach((url) => { if (url.startsWith("blob:")) URL.revokeObjectURL(url); });
      setComposeImagePreviews([]);
      setShowCompose(false);
      toastSuccess("게시글이 등록되었습니다!", "📝");
      fetchPosts(0, filter, false, searchQuery);
      setPage(0);
    } catch (err: unknown) {
      const apiMsg = (err as { data?: { error?: string } })?.data?.error;
      if (apiMsg === "daily post limit reached") {
        toastError("오늘 작성 가능한 게시글 수를 초과했어요 (하루 10개)");
      } else if (apiMsg === "content required") {
        toastError("내용을 입력해 주세요");
      } else if (apiMsg === "content too long") {
        toastError("글이 너무 길어요 (최대 500자)");
      } else {
        toastError("게시글 등록에 실패했습니다. 다시 시도해 주세요");
      }
    }
    setPosting(false);
    setUploadProgress(0);
  };

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!token) return;
    // Optimistic update
    const update = (p: Post) =>
      p.id === postId ? { ...p, liked: !liked, likes: p.likes + (liked ? -1 : 1) } : p;
    setPosts((prev) => prev.map(update));
    if (selectedPost?.id === postId) {
      setSelectedPost((prev) => prev ? update(prev) : null);
    }

    const endpoint = liked ? "unlike" : "like";
    try {
      await authApi(`/api/community/posts/${postId}/${endpoint}`, token, { method: "POST" });
    } catch {
      // Bug fix #6: toast on like failure
      toastError("좋아요 처리에 실패했습니다");
      // Rollback
      const rollback = (p: Post) =>
        p.id === postId ? { ...p, liked, likes: p.likes + (liked ? 1 : -1) } : p;
      setPosts((prev) => prev.map(rollback));
      if (selectedPost?.id === postId) {
        setSelectedPost((prev) => prev ? rollback(prev) : null);
      }
    }
  };

  // ===== Reactions =====
  const reactToPost = async (postId: string, emoji: string) => {
    if (!token) return;
    // Optimistic
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      const counts = { ...(p.reaction_counts || {}) };
      if (p.my_reaction && counts[p.my_reaction]) counts[p.my_reaction]--;
      counts[emoji] = (counts[emoji] || 0) + 1;
      return { ...p, my_reaction: emoji, reaction_counts: counts };
    }));
    if (selectedPost?.id === postId) {
      setSelectedPost((prev) => {
        if (!prev) return null;
        const counts = { ...(prev.reaction_counts || {}) };
        if (prev.my_reaction && counts[prev.my_reaction]) counts[prev.my_reaction]--;
        counts[emoji] = (counts[emoji] || 0) + 1;
        return { ...prev, my_reaction: emoji, reaction_counts: counts };
      });
    }

    try {
      const res = await authApi<{ reaction_counts: Record<string, number>; my_reaction: string }>(
        `/api/community/posts/${postId}/react`, token, { method: "POST", body: { emoji } }
      );
      // Sync server counts
      const update = (p: Post) => p.id === postId ? { ...p, reaction_counts: res.reaction_counts, my_reaction: res.my_reaction } : p;
      setPosts((prev) => prev.map(update));
      if (selectedPost?.id === postId) setSelectedPost((prev) => prev ? update(prev) : null);
    } catch {
      toastError("리액션 실패");
      fetchPosts(0, filter, false, searchQuery);
    }
  };

  const unreactFromPost = async (postId: string) => {
    if (!token) return;
    // Optimistic
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      const counts = { ...(p.reaction_counts || {}) };
      if (p.my_reaction && counts[p.my_reaction]) {
        counts[p.my_reaction]--;
        if (counts[p.my_reaction] <= 0) delete counts[p.my_reaction];
      }
      return { ...p, my_reaction: undefined, reaction_counts: counts };
    }));
    if (selectedPost?.id === postId) {
      setSelectedPost((prev) => {
        if (!prev) return null;
        const counts = { ...(prev.reaction_counts || {}) };
        if (prev.my_reaction && counts[prev.my_reaction]) {
          counts[prev.my_reaction]--;
          if (counts[prev.my_reaction] <= 0) delete counts[prev.my_reaction];
        }
        return { ...prev, my_reaction: undefined, reaction_counts: counts };
      });
    }

    try {
      const res = await authApi<{ reaction_counts: Record<string, number> }>(
        `/api/community/posts/${postId}/react`, token, { method: "DELETE" }
      );
      const update = (p: Post) => p.id === postId ? { ...p, reaction_counts: res.reaction_counts, my_reaction: undefined } : p;
      setPosts((prev) => prev.map(update));
      if (selectedPost?.id === postId) setSelectedPost((prev) => prev ? update(prev) : null);
    } catch {
      toastError("리액션 취소 실패");
    }
  };

  // ===== Bookmarks =====
  const toggleBookmark = async (postId: string, bookmarked: boolean) => {
    if (!token) return;
    // Optimistic
    const update = (p: Post) =>
      p.id === postId ? { ...p, bookmarked: !bookmarked, bookmark_count: (p.bookmark_count || 0) + (bookmarked ? -1 : 1) } : p;
    setPosts((prev) => prev.map(update));
    if (selectedPost?.id === postId) setSelectedPost((prev) => prev ? update(prev) : null);

    try {
      if (bookmarked) {
        await authApi(`/api/community/posts/${postId}/bookmark`, token, { method: "DELETE" });
      } else {
        await authApi(`/api/community/posts/${postId}/bookmark`, token, { method: "POST" });
        toastSuccess("저장되었습니다", "🔖");
      }
    } catch {
      toastError("저장 실패");
      // Rollback
      const rollback = (p: Post) =>
        p.id === postId ? { ...p, bookmarked, bookmark_count: (p.bookmark_count || 0) + (bookmarked ? 1 : -1) } : p;
      setPosts((prev) => prev.map(rollback));
      if (selectedPost?.id === postId) setSelectedPost((prev) => prev ? rollback(prev) : null);
    }
  };

  // Bug fix #5: Delete with confirmation
  const confirmDelete = (postId: string) => {
    setDeleteConfirmId(postId);
  };

  const deletePost = async (postId: string) => {
    if (!token) return;
    try {
      await authApi(`/api/community/posts/${postId}`, token, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      if (selectedPost?.id === postId) setSelectedPost(null);
      toastSuccess("삭제되었습니다");
    } catch {
      toastError("삭제 실패");
    }
    setDeleteConfirmId(null);
  };

  const deleteReply = async (replyId: string, postId: string) => {
    if (!token) return;
    try {
      await authApi(`/api/community/replies/${replyId}`, token, { method: "DELETE" });
      setReplies((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((r) => r.id !== replyId && r.parent_id !== replyId),
      }));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, reply_count: Math.max(0, p.reply_count - 1) } : p));
      if (selectedPost?.id === postId) {
        setSelectedPost((prev) => prev ? { ...prev, reply_count: Math.max(0, prev.reply_count - 1) } : null);
      }
      toastSuccess("답글이 삭제되었습니다");
    } catch {
      toastError("답글 삭제 실패");
    }
  };

  const recordView = async (postId: string) => {
    if (!token) return;
    try {
      await authApi(`/api/community/posts/${postId}/view`, token, { method: "POST" });
      // Optimistic increment
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, view_count: p.view_count + 1 } : p));
    } catch { /* ignore */ }
  };

  const fetchReplies = async (postId: string) => {
    if (!token) return;
    setLoadingReplies(true);
    try {
      const res = await authApi<{ replies: Reply[] }>(
        `/api/community/posts/${postId}/replies`, token
      );
      setReplies((prev) => ({ ...prev, [postId]: res.replies || [] }));
    } catch { /* ignore */ }
    setLoadingReplies(false);
  };

  const openPostDetail = (post: Post) => {
    setSelectedPost(post);
    setReplyText("");
    setReplyingTo(null);
    setExpandedReplies(new Set());
    if (!replies[post.id]) fetchReplies(post.id);
    recordView(post.id);
  };

  const submitReply = async (postId: string) => {
    if (!token || !replyText.trim()) return;
    setReplying(true);
    try {
      const body: { content: string; parent_id?: string } = { content: replyText.trim() };
      if (replyingTo) body.parent_id = replyingTo.id;

      await authApi(`/api/community/posts/${postId}/replies`, token, {
        method: "POST",
        body,
      });
      setReplyText("");
      setReplyingTo(null);
      fetchReplies(postId);
      setPosts((prev) =>
        prev.map((p) => p.id === postId ? { ...p, reply_count: p.reply_count + 1 } : p)
      );
      if (selectedPost?.id === postId) {
        setSelectedPost((prev) => prev ? { ...prev, reply_count: prev.reply_count + 1 } : null);
      }
    } catch {
      toastError("답글 등록 실패");
    }
    setReplying(false);
  };

  const toggleReplyLike = async (replyId: string, liked: boolean, postId: string) => {
    if (!token) return;
    // Optimistic
    setReplies((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).map((r) =>
        r.id === replyId ? { ...r, liked: !liked, likes: r.likes + (liked ? -1 : 1) } : r
      ),
    }));

    const endpoint = liked ? "unlike" : "like";
    try {
      await authApi(`/api/community/replies/${replyId}/${endpoint}`, token, { method: "POST" });
    } catch {
      // Bug fix #6: toast on like failure
      toastError("좋아요 처리에 실패했습니다");
      // Rollback
      setReplies((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((r) =>
          r.id === replyId ? { ...r, liked, likes: r.likes + (liked ? 1 : -1) } : r
        ),
      }));
    }
  };

  // Report
  const submitReport = async (reason: string, detail: string) => {
    if (!token || !reportTarget) return;
    try {
      const path = reportTarget.type === "user"
        ? `/api/community/users/${reportTarget.id}/report`
        : reportTarget.type === "reply"
          ? `/api/community/replies/${reportTarget.id}/report`
          : `/api/community/posts/${reportTarget.id}/report`;
      await authApi(path, token, {
        method: "POST",
        body: { reason, detail },
      });
      toastSuccess("신고가 접수되었습니다");
    } catch {
      toastError("신고 접수에 실패했습니다");
    }
    setReportTarget(null);
  };

  // Bug fix #3: Block user - also filter replies
  const blockUser = async (userId: string, nickname: string) => {
    if (!token) return;
    try {
      await authApi(`/api/community/users/${userId}/block`, token, { method: "POST" });
      toastSuccess(`${nickname}님을 차단했습니다`);
      // Remove their posts from feed
      setPosts((prev) => prev.filter((p) => p.user_id !== userId));
      if (selectedPost?.user_id === userId) setSelectedPost(null);
      // Bug fix #3: Also filter replies from blocked user
      setReplies((prev) => {
        const updated: Record<string, Reply[]> = {};
        for (const [postId, replyList] of Object.entries(prev)) {
          updated[postId] = replyList.filter((r) => r.user_id !== userId);
        }
        return updated;
      });
    } catch {
      toastError("차단에 실패했습니다");
    }
  };

  // Fetch bookmarked posts for "saved" tab
  const fetchBookmarks = useCallback(async (pageNum: number) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await authApi<{ posts: Post[] }>(
        `/api/community/bookmarks?page=${pageNum}`, token
      );
      const newPosts = (res.posts || []).map((p) => ({
        ...p,
        image_urls: p.image_urls || [],
        reaction_counts: p.reaction_counts || {},
      }));
      if (pageNum === 0) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }
      setHasMore(newPosts.length >= 20);
    } catch {
      toastError("저장한 글을 불러올 수 없습니다");
    }
    setLoading(false);
  }, [token]);

  // Switch to saved tab
  useEffect(() => {
    if (communityTab === "saved") {
      setPage(0);
      fetchBookmarks(0);
    }
  }, [communityTab, fetchBookmarks]);

  // ===== Post Detail View =====
  if (selectedPost) {
    const postReplies = replies[selectedPost.id] || [];
    // Separate top-level replies and sub-replies
    const topReplies = postReplies.filter((r) => !r.parent_id);
    const subRepliesMap: Record<string, Reply[]> = {};
    postReplies.filter((r) => r.parent_id).forEach((r) => {
      if (!subRepliesMap[r.parent_id!]) subRepliesMap[r.parent_id!] = [];
      subRepliesMap[r.parent_id!].push(r);
    });

    const avatarGrad = getAvatarGradient(selectedPost.nickname);
    const isHot = selectedPost.likes >= 3;

    return (
      <div className="h-full flex flex-col" style={{ background: "#1A0E08" }}>
        {/* Detail header */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0 overlay-header" style={{
          background: "linear-gradient(180deg, #3D2017, #2C1810)",
          borderBottom: "3px double #8B6914",
        }}>
          <button onClick={() => setSelectedPost(null)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
            style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
            &larr;
          </button>
          <span className="font-bold text-sm flex-1" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>게시글</span>
          <div className="flex items-center gap-1.5">
            <PostTypeTag type={selectedPost.post_type} />
            {isHot && <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>🔥 Hot</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Post content */}
          <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(139,105,20,0.15)" }}>
            <div className="flex items-center gap-3 mb-3">
              <Avatar nickname={selectedPost.nickname} profileImageUrl={selectedPost.profile_image_url} size="lg" gradient={avatarGrad} />
              <div className="flex-1">
                <span className="font-bold text-[13px]" style={{ color: "#F5E6C8" }}>{selectedPost.nickname}</span>
                <div className="text-[10px] mt-0.5" style={{ color: "rgba(201,168,76,0.4)" }}>{timeAgo(selectedPost.created_at)}</div>
              </div>
              <button
                onClick={() => toggleBookmark(selectedPost.id, !!selectedPost.bookmarked)}
                className="text-[16px] mr-1 transition"
              >
                {selectedPost.bookmarked ? "🔖" : "🏷️"}
              </button>
              <MoreMenu
                isMine={selectedPost.is_mine}
                onDelete={() => confirmDelete(selectedPost.id)}
                onReport={() => setReportTarget({ type: "post", id: selectedPost.id })}
                onBlock={() => blockUser(selectedPost.user_id, selectedPost.nickname)}
              />
            </div>

            <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: "rgba(245,230,200,0.9)" }}>
              <HashtagText text={selectedPost.content} onTagClick={(tag) => {
                setSelectedPost(null);
                setSearchQuery(`#${tag}`);
              }} />
            </p>

            {/* Images carousel */}
            {selectedPost.image_urls.length > 0 && (
              <ImageCarousel images={selectedPost.image_urls} size="large" />
            )}

            {/* Poll */}
            {token && <PollView postId={selectedPost.id} token={token} />}

            {/* Stats + Actions */}
            <div className="flex items-center gap-3 pt-3 mt-3" style={{ borderTop: "1px solid rgba(139,105,20,0.08)" }}>
              <ReactionBar post={selectedPost} onReact={reactToPost} onUnreact={unreactFromPost} />
              <button onClick={() => toggleLike(selectedPost.id, selectedPost.liked)}
                className={`flex items-center gap-1.5 text-[12px] font-bold transition ${
                  selectedPost.liked ? "text-pink-400" : ""
                }`}
                style={selectedPost.liked ? {} : { color: "rgba(245,230,200,0.3)" }}>
                {selectedPost.liked ? "❤️" : "🤍"} <span className="tabular-nums">{selectedPost.likes > 0 ? selectedPost.likes : ""}</span>
              </button>
              <span className="text-[12px]" style={{ color: "rgba(245,230,200,0.25)" }}>💬 <span className="tabular-nums">{selectedPost.reply_count}</span>개 답글</span>
              <span className="text-[11px] ml-auto" style={{ color: "rgba(245,230,200,0.4)" }}>👁 <span className="tabular-nums">{selectedPost.view_count}</span></span>
            </div>
          </div>

          {/* Replies */}
          <div className="px-4 py-2">
            <p className="text-[11px] font-bold mb-2" style={{ color: "rgba(201,168,76,0.5)" }}>답글 {topReplies.length}개</p>
            {loadingReplies && postReplies.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-3">
                    <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: "rgba(201,168,76,0.1)", animation: "skeleton-gold 1.5s ease-in-out infinite" }} />
                    <div className="flex-1 space-y-1.5">
                      <div className="w-16 h-2.5 rounded" style={{ background: "rgba(201,168,76,0.08)", animation: "skeleton-gold 1.5s ease-in-out infinite 0.1s" }} />
                      <div className="w-full h-3 rounded" style={{ background: "rgba(201,168,76,0.06)", animation: "skeleton-gold 1.5s ease-in-out infinite 0.2s" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : topReplies.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-2xl block mb-2 opacity-30">💬</span>
                <p className="text-[12px]" style={{ color: "rgba(245,230,200,0.2)" }}>아직 답글이 없습니다</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(245,230,200,0.15)" }}>첫 번째 답글을 남겨보세요!</p>
              </div>
            ) : (
              topReplies.map((r, idx) => {
                const replyGrad = getAvatarGradient(r.nickname);
                const subReplies = subRepliesMap[r.id] || [];
                const isExpanded = expandedReplies.has(r.id);
                return (
                  <div key={r.id} className="py-3 last:border-0"
                    style={{
                      borderBottom: "1px solid rgba(139,105,20,0.08)",
                      animation: `stagger-slide-in 0.2s ease-out ${idx * 30}ms both`,
                    }}>
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        <Avatar nickname={r.nickname} profileImageUrl={r.profile_image_url} size="sm" gradient={replyGrad} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold" style={{ color: "rgba(245,230,200,0.8)" }}>{r.nickname}</span>
                          <span className="text-[9px]" style={{ color: "rgba(201,168,76,0.25)" }}>{timeAgo(r.created_at)}</span>
                          <div className="ml-auto">
                            <MoreMenu
                              isMine={r.is_mine}
                              onDelete={() => deleteReply(r.id, selectedPost.id)}
                              onReport={() => setReportTarget({ type: "reply", id: r.id })}
                              onBlock={() => blockUser(r.user_id, r.nickname)}
                            />
                          </div>
                        </div>
                        <p className="text-[13px] leading-relaxed mt-0.5 break-words" style={{ color: "rgba(245,230,200,0.65)" }}>
                          {r.content}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <button onClick={() => toggleReplyLike(r.id, r.liked, selectedPost.id)}
                            className={`text-[10px] ${r.liked ? "text-pink-400" : ""} transition`}
                            style={r.liked ? {} : { color: "rgba(245,230,200,0.2)" }}>
                            {r.liked ? "❤️" : "🤍"} {r.likes > 0 && <span className="tabular-nums">{r.likes}</span>}
                          </button>
                          <button onClick={() => { setReplyingTo({ id: r.id, nickname: r.nickname }); }}
                            className="text-[10px] transition"
                            style={{ color: "rgba(245,230,200,0.2)" }}>
                            답글
                          </button>
                          {subReplies.length > 0 && (
                            <button onClick={() => {
                              setExpandedReplies((prev) => {
                                const next = new Set(prev);
                                if (next.has(r.id)) next.delete(r.id);
                                else next.add(r.id);
                                return next;
                              });
                            }}
                              className="text-[10px] transition"
                              style={{ color: "#C9A84C" }}>
                              {isExpanded ? "접기" : `답글 ${subReplies.length}개 보기`}
                            </button>
                          )}
                        </div>

                        {/* Sub-replies (1-level) */}
                        {isExpanded && subReplies.map((sr) => {
                          const srGrad = getAvatarGradient(sr.nickname);
                          return (
                            <div key={sr.id} className="mt-2 ml-2 pl-3" style={{ borderLeft: "1px solid rgba(139,105,20,0.12)" }}>
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5">
                                  <Avatar nickname={sr.nickname} profileImageUrl={sr.profile_image_url} size="sm" gradient={srGrad} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold" style={{ color: "rgba(245,230,200,0.7)" }}>{sr.nickname}</span>
                                    <span className="text-[8px]" style={{ color: "rgba(201,168,76,0.2)" }}>{timeAgo(sr.created_at)}</span>
                                    <div className="ml-auto">
                                      <MoreMenu
                                        isMine={sr.is_mine}
                                        onDelete={() => deleteReply(sr.id, selectedPost.id)}
                                        onReport={() => setReportTarget({ type: "reply", id: sr.id })}
                                        onBlock={() => blockUser(sr.user_id, sr.nickname)}
                                      />
                                    </div>
                                  </div>
                                  <p className="text-[12px] mt-0.5 break-words" style={{ color: "rgba(245,230,200,0.55)" }}>{sr.content}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <button onClick={() => toggleReplyLike(sr.id, sr.liked, selectedPost.id)}
                                      className={`text-[9px] ${sr.liked ? "text-pink-400" : ""} transition`}
                                      style={sr.liked ? {} : { color: "rgba(245,230,200,0.15)" }}>
                                      {sr.liked ? "❤️" : "🤍"} {sr.likes > 0 && <span className="tabular-nums">{sr.likes}</span>}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Reply input - fixed at bottom */}
        <div className="shrink-0 px-4 py-3" style={{
          background: "rgba(26,14,8,0.95)",
          borderTop: "1px solid rgba(139,105,20,0.15)",
        }}>
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px]" style={{ color: "#C9A84C" }}>@{replyingTo.nickname}에게 답글</span>
              <button onClick={() => setReplyingTo(null)} className="text-[10px] transition" style={{ color: "rgba(245,230,200,0.2)" }}>취소</button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submitReply(selectedPost.id)}
              placeholder={replyingTo ? `@${replyingTo.nickname}에게 답글...` : "답글을 입력하세요..."}
              maxLength={300}
              className="flex-1 text-[13px] rounded-xl px-4 py-2.5 focus:outline-none"
              style={{
                background: "rgba(245,230,200,0.05)",
                color: "#F5E6C8",
                border: "1px solid rgba(139,105,20,0.15)",
              }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(201,168,76,0.4)"; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(139,105,20,0.15)"; }}
            />
            <button
              onClick={() => submitReply(selectedPost.id)}
              disabled={replying || !replyText.trim()}
              className="px-4 py-2.5 rounded-xl font-bold text-[12px] disabled:opacity-30 transition"
              style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)", color: "#fff" }}>
              {replying ? "..." : "전송"}
            </button>
          </div>
          {replyText.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(139,105,20,0.1)" }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(replyText.length / 300) * 100}%`,
                    background: replyText.length > 270 ? "#FF6B6B" : replyText.length > 200 ? "#FFEAA7" : "#C9A84C",
                  }} />
              </div>
              <span className={`text-[8px] tabular-nums ${replyText.length > 270 ? "text-[#FF6B6B]" : ""}`}
                style={replyText.length > 270 ? {} : { color: "rgba(245,230,200,0.2)" }}>
                {replyText.length}/300
              </span>
            </div>
          )}
        </div>

        {/* Report modal */}
        {reportTarget && <ReportModal onClose={() => setReportTarget(null)} onSubmit={submitReport} />}
        {/* Delete confirm modal */}
        {deleteConfirmId && (
          <DeleteConfirmModal
            onClose={() => setDeleteConfirmId(null)}
            onConfirm={() => deletePost(deleteConfirmId)}
          />
        )}
      </div>
    );
  }

  // ===== Updates tab =====
  if (communityTab === "updates") {
    return (
      <div className="h-full flex flex-col" style={{ background: "#1A0E08" }}>
        <div className="px-4 pt-3 pb-2 shrink-0 overlay-header" style={{
          background: "linear-gradient(180deg, #3D2017, #2C1810)",
          borderBottom: "3px double #8B6914",
        }}>
          <div className="flex items-center gap-3 mb-2">
            {onClose && (
              <button onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
                style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
                &larr;
              </button>
            )}
            <h2 className="font-bold text-[15px] flex-1" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>💬 커뮤니티</h2>
          </div>
          <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(139,105,20,0.08)", border: "1px solid rgba(139,105,20,0.1)" }}>
            <button onClick={() => setCommunityTab("board")}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "transparent", color: "rgba(245,230,200,0.4)" }}>
              📋 게시판
            </button>
            <button onClick={() => setCommunityTab("shorts")}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "transparent", color: "rgba(245,230,200,0.4)" }}>
              📱 쇼츠
            </button>
            <button onClick={() => setCommunityTab("saved")}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "transparent", color: "rgba(245,230,200,0.4)" }}>
              🔖 저장
            </button>
            <button
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
              📢 공지
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {UPDATE_NOTES.map((note, idx) => (
            <div key={idx} className="rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(61,32,23,0.6), rgba(44,24,16,0.8))",
                border: "1px solid rgba(139,105,20,0.15)",
              }}>
              <div className="p-4"
                style={{
                  borderBottom: "1px solid rgba(139,105,20,0.1)",
                  background: idx === 0 ? "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(212,175,55,0.04))" : "transparent",
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{note.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>{note.title}</span>
                      {idx === 0 && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(201,168,76,0.2)", color: "#C9A84C" }}>NEW</span>
                      )}
                    </div>
                    <span className="text-[10px]" style={{ color: "rgba(201,168,76,0.4)" }}>{note.version} · {note.date}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-1.5">
                {note.changes.map((change, ci) => (
                  <p key={ci} className="text-[12px] leading-relaxed" style={{ color: "rgba(245,230,200,0.7)" }}>{change}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (communityTab === "shorts") {
    return (
      <div className="h-full flex flex-col" style={{ background: "#1A0E08" }}>
        <div className="px-4 pt-3 pb-2 shrink-0 overlay-header" style={{
          background: "linear-gradient(180deg, #3D2017, #2C1810)",
          borderBottom: "3px double #8B6914",
        }}>
          <div className="flex items-center gap-3 mb-2">
            {onClose && (
              <button onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
                style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
                &larr;
              </button>
            )}
            <h2 className="font-bold text-[15px] flex-1" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>💬 커뮤니티</h2>
          </div>
          <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(139,105,20,0.08)", border: "1px solid rgba(139,105,20,0.1)" }}>
            <button onClick={() => setCommunityTab("board")}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "transparent", color: "rgba(245,230,200,0.4)" }}>
              📋 게시판
            </button>
            <button
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
              📱 쇼츠
            </button>
            <button onClick={() => setCommunityTab("saved")}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "transparent", color: "rgba(245,230,200,0.4)" }}>
              🔖 저장
            </button>
            <button onClick={() => setCommunityTab("updates")}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "transparent", color: "rgba(245,230,200,0.4)" }}>
              📢 공지
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ShortsPage onClose={() => setCommunityTab("board")} embedded />
        </div>
      </div>
    );
  }

  // ===== Saved tab =====
  if (communityTab === "saved") {
    return (
      <div className="h-full flex flex-col" style={{ background: "#1A0E08" }}>
        <div className="px-4 pt-3 pb-2 shrink-0 overlay-header" style={{
          background: "linear-gradient(180deg, #3D2017, #2C1810)",
          borderBottom: "3px double #8B6914",
        }}>
          <div className="flex items-center gap-3 mb-2">
            {onClose && (
              <button onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
                style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
                &larr;
              </button>
            )}
            <h2 className="font-bold text-[15px] flex-1" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>💬 커뮤니티</h2>
          </div>
          <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(139,105,20,0.08)", border: "1px solid rgba(139,105,20,0.1)" }}>
            <button onClick={() => setCommunityTab("board")}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "transparent", color: "rgba(245,230,200,0.4)" }}>
              📋 게시판
            </button>
            <button onClick={() => setCommunityTab("shorts")}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "transparent", color: "rgba(245,230,200,0.4)" }}>
              📱 쇼츠
            </button>
            <button
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
              🔖 저장
            </button>
            <button onClick={() => setCommunityTab("updates")}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "transparent", color: "rgba(245,230,200,0.4)" }}>
              📢 공지
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-20">
          {loading && posts.length === 0 && (
            <div>{Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)}</div>
          )}
          {posts.length === 0 && !loading && (
            <div className="text-center mt-12">
              <span className="text-4xl block mb-3 opacity-20">🔖</span>
              <p className="text-sm" style={{ color: "rgba(245,230,200,0.3)" }}>저장한 게시글이 없습니다</p>
              <p className="text-[11px] mt-1" style={{ color: "rgba(245,230,200,0.15)" }}>마음에 드는 글을 저장해 보세요!</p>
            </div>
          )}
          {posts.map((post, idx) => (
            <PostCard
              key={post.id}
              post={post}
              idx={idx}
              onOpen={openPostDetail}
              onDelete={confirmDelete}
              onReport={setReportTarget}
              onBlock={blockUser}
              onReact={reactToPost}
              onUnreact={unreactFromPost}
              onBookmark={toggleBookmark}
            />
          ))}
          {hasMore && posts.length > 0 && (
            <button onClick={() => { const next = page + 1; setPage(next); fetchBookmarks(next); }} disabled={loading}
              className="w-full py-3 text-[12px] transition rounded-xl"
              style={{ background: "rgba(245,230,200,0.02)", color: "rgba(245,230,200,0.3)", border: "1px solid rgba(139,105,20,0.1)" }}>
              {loading ? <span className="animate-pulse">로딩 중...</span> : "더 보기"}
            </button>
          )}
        </div>
        {/* Delete confirm */}
        {deleteConfirmId && (
          <DeleteConfirmModal
            onClose={() => setDeleteConfirmId(null)}
            onConfirm={() => deletePost(deleteConfirmId)}
          />
        )}
        {reportTarget && <ReportModal onClose={() => setReportTarget(null)} onSubmit={submitReport} />}
      </div>
    );
  }

  // ===== Feed View =====
  return (
    <div className="h-full flex flex-col" style={{ background: "#1A0E08" }}>
      {/* Header */}
      <div className="px-4 pt-3 pb-2 shrink-0 overlay-header" style={{
        background: "linear-gradient(180deg, #3D2017, #2C1810)",
        borderBottom: "3px double #8B6914",
      }}>
        <div className="flex items-center gap-3 mb-2">
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
              style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}
            >
              &larr;
            </button>
          )}
          <h2 className="font-bold text-[15px] flex-1" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>💬 커뮤니티</h2>
          {/* Sort toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(139,105,20,0.15)" }}>
            <button onClick={() => setSortMode("new")}
              className="text-[9px] font-bold px-2.5 py-1 transition"
              style={{
                background: sortMode === "new" ? "rgba(201,168,76,0.15)" : "transparent",
                color: sortMode === "new" ? "#C9A84C" : "rgba(245,230,200,0.3)",
              }}>
              🕐 최신
            </button>
            <button onClick={() => setSortMode("hot")}
              className="text-[9px] font-bold px-2.5 py-1 transition"
              style={{
                background: sortMode === "hot" ? "rgba(201,168,76,0.15)" : "transparent",
                color: sortMode === "hot" ? "#D4AF37" : "rgba(245,230,200,0.3)",
              }}>
              🔥 인기
            </button>
          </div>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl p-1 mb-2" style={{ background: "rgba(139,105,20,0.08)", border: "1px solid rgba(139,105,20,0.1)" }}>
          <button
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
            style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
            📋 게시판
          </button>
          <button onClick={() => setCommunityTab("shorts")}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
            style={{ background: "transparent", color: "rgba(245,230,200,0.4)" }}>
            📱 쇼츠
          </button>
          <button onClick={() => setCommunityTab("saved")}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
            style={{ background: "transparent", color: "rgba(245,230,200,0.4)" }}>
            🔖 저장
          </button>
          <button onClick={() => setCommunityTab("updates")}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
            style={{ background: "transparent", color: "rgba(245,230,200,0.4)" }}>
            📢 공지
          </button>
        </div>
        {/* Search */}
        <SearchBar
          onSearch={(q) => setSearchQuery(q)}
          onTagClick={(tag) => setSearchQuery(`#${tag}`)}
        />
        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {POST_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all"
              style={{
                background: filter === t.value
                  ? `${t.color}15`
                  : "rgba(245,230,200,0.04)",
                color: filter === t.value ? t.color : "rgba(245,230,200,0.4)",
                border: filter === t.value
                  ? `1px solid ${t.color}25`
                  : "1px solid rgba(139,105,20,0.08)",
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts list */}
      <div className="flex-1 overflow-y-auto px-3 pb-20">
        {/* Trending section */}
        {trendingPosts.length > 0 && !searchQuery && (
          <div className="mb-3 -mx-1">
            <div className="flex items-center gap-2 px-1 mb-2">
              <span className="text-[11px] font-bold" style={{ color: "#D4AF37" }}>🏆 Weekly Best</span>
              <div className="flex-1 h-px" style={{ background: "rgba(212,175,55,0.15)" }} />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 px-1" style={{ scrollbarWidth: "none" }}>
              {trendingPosts.map((post) => (
                <TrendingCard key={post.id} post={post} onOpen={openPostDetail} />
              ))}
            </div>
          </div>
        )}

        {loading && posts.length === 0 && (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <PostSkeleton key={i} />
            ))}
          </div>
        )}

        {posts.length === 0 && !loading && (
          <div className="text-center mt-12">
            <span className="text-4xl block mb-3 opacity-20">📝</span>
            <p className="text-sm" style={{ color: "rgba(245,230,200,0.3)" }}>
              {searchQuery ? "검색 결과가 없습니다" : "아직 게시글이 없습니다"}
            </p>
            <p className="text-[11px] mt-1" style={{ color: "rgba(245,230,200,0.15)" }}>
              {searchQuery ? "다른 키워드로 검색해 보세요" : "첫 번째 게시글을 작성해 보세요!"}
            </p>
          </div>
        )}

        {sortedPosts.map((post, idx) => (
          <PostCard
            key={post.id}
            post={post}
            idx={idx}
            onOpen={openPostDetail}
            onDelete={confirmDelete}
            onReport={setReportTarget}
            onBlock={blockUser}
            onReact={reactToPost}
            onUnreact={unreactFromPost}
            onBookmark={toggleBookmark}
          />
        ))}

        {hasMore && posts.length > 0 && (
          <button onClick={loadMore} disabled={loading}
            className="w-full py-3 text-[12px] transition rounded-xl"
            style={{ background: "rgba(245,230,200,0.02)", color: "rgba(245,230,200,0.3)", border: "1px solid rgba(139,105,20,0.1)" }}>
            {loading ? (
              <span className="animate-pulse">로딩 중...</span>
            ) : "더 보기"}
          </button>
        )}
      </div>

      {/* Floating compose button */}
      {!showCompose && (
        <button
          onClick={() => setShowCompose(true)}
          className="absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg transition hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #C9A84C, #8B6914)",
            boxShadow: "0 4px 20px rgba(201,168,76,0.4)",
          }}>
          ✏️
        </button>
      )}

      {/* Compose overlay */}
      {showCompose && (
        <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col justify-end" onClick={() => setShowCompose(false)}>
          <div className="rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}
            style={{
              animation: "compose-slide-up 0.25s ease-out",
              background: "linear-gradient(180deg, #2C1810, #1A0E08)",
              borderTop: "3px double #8B6914",
            }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>새 게시글</span>
              <button onClick={() => setShowCompose(false)} className="text-sm transition" style={{ color: "rgba(245,230,200,0.4)" }}>취소</button>
            </div>

            {/* Post type selector */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {POST_TYPES.filter((t) => t.value !== "").map((t) => (
                <button key={t.value} onClick={() => setComposeType(t.value)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition"
                  style={{
                    background: composeType === t.value ? `${t.color}15` : "rgba(245,230,200,0.04)",
                    color: composeType === t.value ? t.color : "rgba(245,230,200,0.4)",
                    border: composeType === t.value ? `1px solid ${t.color}25` : "1px solid rgba(139,105,20,0.08)",
                  }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <textarea
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              placeholder="슬라임토피아에서 무슨 일이 있었나요?"
              maxLength={500}
              rows={4}
              className="w-full text-[13px] rounded-xl px-4 py-3 focus:outline-none resize-none"
              style={{
                background: "rgba(245,230,200,0.05)",
                color: "#F5E6C8",
                border: "1px solid rgba(139,105,20,0.15)",
              }}
              onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(201,168,76,0.4)"; }}
              onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(139,105,20,0.15)"; }}
              autoFocus
            />

            {/* Image previews */}
            {composeImagePreviews.length > 0 && (
              <div className="flex gap-2 mt-3">
                {composeImagePreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden" style={{ background: "rgba(245,230,200,0.05)", border: "1px solid rgba(139,105,20,0.15)" }}>
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white text-[10px] hover:bg-red-500/80 transition">
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Poll compose */}
            {showPollCompose && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(245,230,200,0.03)", border: "1px solid rgba(139,105,20,0.12)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold" style={{ color: "#C9A84C" }}>📊 투표 추가</span>
                  <button onClick={() => { setShowPollCompose(false); setComposePollOptions([]); }}
                    className="text-[10px]" style={{ color: "rgba(245,230,200,0.3)" }}>제거</button>
                </div>
                {composePollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2 mb-1.5">
                    <input
                      value={opt}
                      onChange={(e) => {
                        const next = [...composePollOptions];
                        next[i] = e.target.value;
                        setComposePollOptions(next);
                      }}
                      placeholder={`선택지 ${i + 1}`}
                      maxLength={50}
                      className="flex-1 text-[11px] rounded-lg px-3 py-1.5 focus:outline-none"
                      style={{ background: "rgba(245,230,200,0.05)", color: "#F5E6C8", border: "1px solid rgba(139,105,20,0.1)" }}
                    />
                    {composePollOptions.length > 2 && (
                      <button onClick={() => setComposePollOptions((prev) => prev.filter((_, j) => j !== i))}
                        className="text-[10px] text-red-400/60">✕</button>
                    )}
                  </div>
                ))}
                {composePollOptions.length < 4 && (
                  <button onClick={() => setComposePollOptions((prev) => [...prev, ""])}
                    className="text-[10px] mt-1 transition"
                    style={{ color: "#C9A84C" }}>
                    + 선택지 추가
                  </button>
                )}
              </div>
            )}

            {/* Upload progress */}
            {posting && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(139,105,20,0.1)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${uploadProgress}%`, background: "#C9A84C" }} />
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                {/* Image upload button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={composeImages.length >= 3}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg transition disabled:opacity-20"
                  style={{ background: "rgba(245,230,200,0.04)", color: "rgba(245,230,200,0.5)", border: "1px solid rgba(139,105,20,0.1)" }}>
                  📷 {composeImages.length}/3
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect}
                  className="hidden" />

                {/* Poll button */}
                {!showPollCompose && (
                  <button
                    onClick={() => { setShowPollCompose(true); setComposePollOptions(["", ""]); }}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg transition"
                    style={{ background: "rgba(245,230,200,0.04)", color: "rgba(245,230,200,0.5)", border: "1px solid rgba(139,105,20,0.1)" }}>
                    📊 투표
                  </button>
                )}

                {/* Character count */}
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: "rgba(139,105,20,0.1)" }}>
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(composeText.length / 500) * 100}%`,
                        background: composeText.length > 450 ? "#FF6B6B" : composeText.length > 350 ? "#FFEAA7" : "#C9A84C",
                      }} />
                  </div>
                  <span className={`text-[10px] tabular-nums ${composeText.length > 450 ? "text-[#FF6B6B]" : ""}`}
                    style={composeText.length > 450 ? {} : { color: "rgba(245,230,200,0.2)" }}>
                    {composeText.length}/500
                  </span>
                </div>
              </div>
              <button onClick={createPost} disabled={posting || !composeText.trim()}
                className="px-5 py-2 rounded-xl font-bold text-sm disabled:opacity-30 transition active:scale-95"
                style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)", color: "#fff" }}>
                {posting ? "등록 중..." : "게시하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportTarget && <ReportModal onClose={() => setReportTarget(null)} onSubmit={submitReport} />}
      {/* Delete confirm modal */}
      {deleteConfirmId && (
        <DeleteConfirmModal
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={() => deletePost(deleteConfirmId)}
        />
      )}

      <style jsx>{`
        @keyframes compose-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes report-pop {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes skeleton-gold {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
