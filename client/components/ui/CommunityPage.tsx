"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi, uploadApi } from "@/lib/api/client";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import ShortsPage from "@/components/ui/ShortsPage";

type CommunityTab = "board" | "shorts" | "updates";

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
  content: string;
  post_type: string;
  likes: number;
  reply_count: number;
  view_count: number;
  image_urls: string[];
  created_at: string;
  liked: boolean;
  is_mine: boolean;
}

interface Reply {
  id: string;
  user_id: string;
  nickname: string;
  content: string;
  likes: number;
  reply_count: number;
  created_at: string;
  liked: boolean;
  is_mine: boolean;
  parent_id?: string;
}

type SortMode = "new" | "hot";

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

function PostSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden mb-2.5" style={{
      background: "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div className="px-3 pt-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full skeleton" />
        <div className="flex-1 space-y-1.5">
          <div className="w-20 h-3 skeleton rounded" />
          <div className="w-14 h-2 skeleton rounded" />
        </div>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <div className="w-full h-3 skeleton rounded" />
        <div className="w-3/4 h-3 skeleton rounded" />
      </div>
      <div className="px-3 pb-2.5 flex gap-4">
        <div className="w-10 h-3 skeleton rounded" />
        <div className="w-10 h-3 skeleton rounded" />
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
          <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
            <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
        {images.length > 3 && (
          <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center text-white/30 text-[10px]">
            +{images.length - 3}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative mt-3 rounded-xl overflow-hidden">
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
            <img src={url} alt="" className="w-full max-h-[300px] object-contain bg-black/20 rounded-xl" loading="lazy" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                background: i === current ? "#fff" : "rgba(255,255,255,0.3)",
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
      <div className="bg-[#1a1a2e] rounded-2xl p-5 w-full max-w-[340px] border border-white/10"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "report-pop 0.2s ease-out" }}>
        <h3 className="text-white font-bold text-sm mb-3">신고하기</h3>

        <div className="space-y-2 mb-3">
          {REPORT_REASONS.map((r) => (
            <button key={r.value} onClick={() => setReason(r.value)}
              className="w-full text-left px-3 py-2 rounded-lg text-[12px] transition"
              style={{
                background: reason === r.value ? "rgba(255,107,107,0.1)" : "rgba(255,255,255,0.04)",
                color: reason === r.value ? "#FF6B6B" : "rgba(255,255,255,0.6)",
                border: reason === r.value ? "1px solid rgba(255,107,107,0.2)" : "1px solid transparent",
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
          className="w-full bg-white/5 text-white text-[12px] rounded-lg px-3 py-2 border border-white/10 focus:border-red-400/40 focus:outline-none placeholder-white/20 resize-none mb-3"
        />

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-[12px] font-bold text-white/40 hover:text-white/60 transition"
            style={{ background: "rgba(255,255,255,0.04)" }}>
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
        className="w-7 h-7 rounded-full flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/5 transition text-sm">
        ...
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 rounded-xl overflow-hidden shadow-lg"
          style={{ background: "#1e1e36", border: "1px solid rgba(255,255,255,0.08)", minWidth: 120 }}>
          {isMine && onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-[11px] text-red-400/80 hover:bg-red-500/10 transition">
              삭제
            </button>
          )}
          {!isMine && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onReport(); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-[11px] text-yellow-400/80 hover:bg-yellow-500/10 transition">
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

  // Compose
  const [showCompose, setShowCompose] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [composeType, setComposeType] = useState("general");
  const [composeImages, setComposeImages] = useState<File[]>([]);
  const [composeImagePreviews, setComposeImagePreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Post detail
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; nickname: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  // Report
  const [reportTarget, setReportTarget] = useState<{ type: string; id: string } | null>(null);

  const fetchPosts = useCallback(async (pageNum: number, filterType: string, append = false) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum) });
      if (filterType) params.set("type", filterType);
      const res = await authApi<{ posts: Post[]; page: number }>(
        `/api/community/posts?${params}`, token
      );
      const newPosts = (res.posts || []).map((p) => ({
        ...p,
        image_urls: p.image_urls || [],
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
    fetchPosts(0, filter);
  }, [filter, fetchPosts]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(next, filter, true);
  };

  // Sort posts client-side
  const sortedPosts = sortMode === "hot"
    ? [...posts].sort((a, b) => {
        const ageA = (Date.now() - new Date(a.created_at).getTime()) / 3600000;
        const ageB = (Date.now() - new Date(b.created_at).getTime()) / 3600000;
        const scoreA = (a.likes * 2 + a.reply_count) / Math.max(1, Math.pow(ageA + 2, 0.5));
        const scoreB = (b.likes * 2 + b.reply_count) / Math.max(1, Math.pow(ageB + 2, 0.5));
        return scoreB - scoreA;
      })
    : posts;

  // ===== Compose with images =====
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - composeImages.length;
    const selected = files.slice(0, remaining);

    setComposeImages((prev) => [...prev, ...selected]);

    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setComposeImagePreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setComposeImages((prev) => prev.filter((_, i) => i !== index));
    setComposeImagePreviews((prev) => prev.filter((_, i) => i !== index));
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

        await uploadApi<{ id: string }>("/api/community/posts", formData, token, (pct) => {
          setUploadProgress(pct);
        });
      } else {
        // JSON body (no images)
        await authApi<{ id: string }>("/api/community/posts", token, {
          method: "POST",
          body: { content: composeText.trim(), post_type: composeType },
        });
      }
      setComposeText("");
      setComposeImages([]);
      setComposeImagePreviews([]);
      setShowCompose(false);
      toastSuccess("게시글이 등록되었습니다!", "📝");
      fetchPosts(0, filter);
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
      // Rollback
      const rollback = (p: Post) =>
        p.id === postId ? { ...p, liked, likes: p.likes + (liked ? 1 : -1) } : p;
      setPosts((prev) => prev.map(rollback));
      if (selectedPost?.id === postId) {
        setSelectedPost((prev) => prev ? rollback(prev) : null);
      }
    }
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

  // Block
  const blockUser = async (userId: string, nickname: string) => {
    if (!token) return;
    try {
      await authApi(`/api/community/users/${userId}/block`, token, { method: "POST" });
      toastSuccess(`${nickname}님을 차단했습니다`);
      // Remove their posts from feed
      setPosts((prev) => prev.filter((p) => p.user_id !== userId));
      if (selectedPost?.user_id === userId) setSelectedPost(null);
    } catch {
      toastError("차단에 실패했습니다");
    }
  };

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
      <div className="h-full flex flex-col bg-[#0a0a1a]">
        {/* Detail header */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0 border-b border-white/[0.06] overlay-header" style={{ background: "rgba(255,255,255,0.02)" }}>
          <button onClick={() => setSelectedPost(null)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 text-sm transition">
            &larr;
          </button>
          <span className="text-white font-bold text-sm flex-1">게시글</span>
          <div className="flex items-center gap-1.5">
            <PostTypeTag type={selectedPost.post_type} />
            {isHot && <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: "rgba(255,107,107,0.12)", color: "#FF6B6B" }}>🔥 Hot</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Post content */}
          <div className="px-4 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-sm font-bold text-white`}>
                {selectedPost.nickname.charAt(0)}
              </div>
              <div className="flex-1">
                <span className="text-white font-bold text-[13px]">{selectedPost.nickname}</span>
                <div className="text-white/30 text-[10px] mt-0.5">{timeAgo(selectedPost.created_at)}</div>
              </div>
              <MoreMenu
                isMine={selectedPost.is_mine}
                onDelete={() => deletePost(selectedPost.id)}
                onReport={() => setReportTarget({ type: "post", id: selectedPost.id })}
                onBlock={() => blockUser(selectedPost.user_id, selectedPost.nickname)}
              />
            </div>

            <p className="text-white/90 text-[14px] leading-relaxed whitespace-pre-wrap break-words">
              {selectedPost.content}
            </p>

            {/* Images carousel */}
            {selectedPost.image_urls.length > 0 && (
              <ImageCarousel images={selectedPost.image_urls} size="large" />
            )}

            {/* Stats + Actions */}
            <div className="flex items-center gap-4 pt-3 mt-3 border-t border-white/[0.04]">
              <button onClick={() => toggleLike(selectedPost.id, selectedPost.liked)}
                className={`flex items-center gap-1.5 text-[12px] font-bold transition ${
                  selectedPost.liked ? "text-pink-400" : "text-white/30 hover:text-pink-300"
                }`}>
                {selectedPost.liked ? "❤️" : "🤍"} <span className="tabular-nums">{selectedPost.likes > 0 ? selectedPost.likes : ""}</span>
                {selectedPost.likes > 0 ? "명이 좋아합니다" : "좋아요"}
              </button>
              <span className="text-white/20 text-[12px]">💬 <span className="tabular-nums">{selectedPost.reply_count}</span>개 답글</span>
              <span className="text-white/15 text-[11px] ml-auto">👁 <span className="tabular-nums">{selectedPost.view_count}</span></span>
            </div>
          </div>

          {/* Replies */}
          <div className="px-4 py-2">
            <p className="text-white/50 text-[11px] font-bold mb-2">답글 {topReplies.length}개</p>
            {loadingReplies && postReplies.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-3">
                    <div className="w-7 h-7 rounded-full skeleton flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="w-16 h-2.5 skeleton rounded" />
                      <div className="w-full h-3 skeleton rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topReplies.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-2xl block mb-2 opacity-30">💬</span>
                <p className="text-white/20 text-[12px]">아직 답글이 없습니다</p>
                <p className="text-white/15 text-[10px] mt-0.5">첫 번째 답글을 남겨보세요!</p>
              </div>
            ) : (
              topReplies.map((r, idx) => {
                const replyGrad = getAvatarGradient(r.nickname);
                const subReplies = subRepliesMap[r.id] || [];
                const isExpanded = expandedReplies.has(r.id);
                return (
                  <div key={r.id} className="py-3 border-b border-white/[0.04] last:border-0"
                    style={{ animation: `stagger-slide-in 0.2s ease-out ${idx * 30}ms both` }}>
                    <div className="flex items-start gap-2.5">
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${replyGrad} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5`}>
                        {r.nickname.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white/80 text-[12px] font-bold">{r.nickname}</span>
                          <span className="text-white/20 text-[9px]">{timeAgo(r.created_at)}</span>
                          <div className="ml-auto">
                            <MoreMenu
                              isMine={r.is_mine}
                              onReport={() => setReportTarget({ type: "reply", id: r.id })}
                              onBlock={() => blockUser(r.user_id, r.nickname)}
                            />
                          </div>
                        </div>
                        <p className="text-white/65 text-[13px] leading-relaxed mt-0.5 break-words">
                          {r.content}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <button onClick={() => toggleReplyLike(r.id, r.liked, selectedPost.id)}
                            className={`text-[10px] ${r.liked ? "text-pink-400" : "text-white/20 hover:text-pink-300"} transition`}>
                            {r.liked ? "❤️" : "🤍"} {r.likes > 0 && <span className="tabular-nums">{r.likes}</span>}
                          </button>
                          <button onClick={() => { setReplyingTo({ id: r.id, nickname: r.nickname }); }}
                            className="text-[10px] text-white/20 hover:text-white/40 transition">
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
                              className="text-[10px] text-[#74B9FF] hover:text-[#C9A84C] transition">
                              {isExpanded ? "접기" : `답글 ${subReplies.length}개 보기`}
                            </button>
                          )}
                        </div>

                        {/* Sub-replies (1-level) */}
                        {isExpanded && subReplies.map((sr) => {
                          const srGrad = getAvatarGradient(sr.nickname);
                          return (
                            <div key={sr.id} className="mt-2 ml-2 pl-3 border-l border-white/[0.06]">
                              <div className="flex items-start gap-2">
                                <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${srGrad} flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 mt-0.5`}>
                                  {sr.nickname.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-white/70 text-[11px] font-bold">{sr.nickname}</span>
                                    <span className="text-white/15 text-[8px]">{timeAgo(sr.created_at)}</span>
                                  </div>
                                  <p className="text-white/55 text-[12px] mt-0.5 break-words">{sr.content}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <button onClick={() => toggleReplyLike(sr.id, sr.liked, selectedPost.id)}
                                      className={`text-[9px] ${sr.liked ? "text-pink-400" : "text-white/15 hover:text-pink-300"} transition`}>
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
        <div className="shrink-0 px-4 py-3 border-t border-white/[0.06]" style={{ background: "rgba(18,18,32,0.95)" }}>
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-[#74B9FF]">@{replyingTo.nickname}에게 답글</span>
              <button onClick={() => setReplyingTo(null)} className="text-white/20 text-[10px] hover:text-white/40 transition">취소</button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submitReply(selectedPost.id)}
              placeholder={replyingTo ? `@${replyingTo.nickname}에게 답글...` : "답글을 입력하세요..."}
              maxLength={300}
              className="flex-1 bg-white/5 text-white text-[13px] rounded-xl px-4 py-2.5 border border-white/10 focus:border-[#C9A84C]/40 focus:outline-none placeholder-white/20"
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
              <div className="flex-1 h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(replyText.length / 300) * 100}%`,
                    background: replyText.length > 270 ? "#FF6B6B" : replyText.length > 200 ? "#FFEAA7" : "#C9A84C",
                  }} />
              </div>
              <span className={`text-[8px] tabular-nums ${replyText.length > 270 ? "text-[#FF6B6B]" : "text-white/20"}`}>
                {replyText.length}/300
              </span>
            </div>
          )}
        </div>

        {/* Report modal */}
        {reportTarget && <ReportModal onClose={() => setReportTarget(null)} onSubmit={submitReport} />}
      </div>
    );
  }

  // ===== Shorts tab =====
  if (communityTab === "updates") {
    return (
      <div className="h-full flex flex-col bg-[#0a0a1a]">
        <div className="px-4 pt-3 pb-2 shrink-0 overlay-header">
          <div className="flex items-center gap-3 mb-2">
            {onClose && (
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white text-sm transition">
                &larr;
              </button>
            )}
            <h2 className="text-white font-bold text-[15px] flex-1">💬 커뮤니티</h2>
          </div>
          <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.04)" }}>
            <button onClick={() => setCommunityTab("board")}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "transparent", color: "rgba(255,255,255,0.4)" }}>
              📋 게시판
            </button>
            <button onClick={() => setCommunityTab("shorts")}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "transparent", color: "rgba(255,255,255,0.4)" }}>
              📱 쇼츠
            </button>
            <button
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "rgba(255,107,107,0.15)", color: "#FF6B6B" }}>
              📢 공지
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {UPDATE_NOTES.map((note, idx) => (
            <div key={idx} className="rounded-2xl overflow-hidden border border-white/5"
              style={{ background: "linear-gradient(180deg, rgba(20,20,40,0.9), rgba(15,15,30,0.95))" }}>
              <div className="p-4 border-b border-white/5"
                style={{ background: idx === 0 ? "linear-gradient(135deg, rgba(255,107,107,0.08), rgba(255,234,167,0.04))" : "transparent" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{note.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">{note.title}</span>
                      {idx === 0 && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold bg-[#FF6B6B]/20 text-[#FF6B6B]">NEW</span>
                      )}
                    </div>
                    <span className="text-white/30 text-[10px]">{note.version} · {note.date}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-1.5">
                {note.changes.map((change, ci) => (
                  <p key={ci} className="text-white/70 text-[12px] leading-relaxed">{change}</p>
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
      <div className="h-full flex flex-col bg-[#0a0a1a]">
        <div className="px-4 pt-3 pb-2 shrink-0 overlay-header">
          <div className="flex items-center gap-3 mb-2">
            {onClose && (
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white text-sm transition">
                &larr;
              </button>
            )}
            <h2 className="text-white font-bold text-[15px] flex-1">💬 커뮤니티</h2>
          </div>
          <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.04)" }}>
            <button onClick={() => setCommunityTab("board")}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "transparent", color: "rgba(255,255,255,0.4)" }}>
              📋 게시판
            </button>
            <button
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "rgba(201,168,76,0.15)", color: "#D4AF37" }}>
              📱 쇼츠
            </button>
            <button onClick={() => setCommunityTab("updates")}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "transparent", color: "rgba(255,255,255,0.4)" }}>
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

  // ===== Feed View =====
  return (
    <div className="h-full flex flex-col bg-[#0a0a1a]">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 shrink-0 overlay-header">
        <div className="flex items-center gap-3 mb-2">
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white text-sm transition"
            >
              &larr;
            </button>
          )}
          <h2 className="text-white font-bold text-[15px] flex-1">💬 커뮤니티</h2>
          {/* Sort toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => setSortMode("new")}
              className="text-[9px] font-bold px-2.5 py-1 transition"
              style={{
                background: sortMode === "new" ? "rgba(201,168,76,0.12)" : "transparent",
                color: sortMode === "new" ? "#D4AF37" : "rgba(255,255,255,0.3)",
              }}>
              🕐 최신
            </button>
            <button onClick={() => setSortMode("hot")}
              className="text-[9px] font-bold px-2.5 py-1 transition"
              style={{
                background: sortMode === "hot" ? "rgba(255,107,107,0.12)" : "transparent",
                color: sortMode === "hot" ? "#FF6B6B" : "rgba(255,255,255,0.3)",
              }}>
              🔥 인기
            </button>
          </div>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl p-1 mb-2" style={{ background: "rgba(255,255,255,0.04)" }}>
          <button
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
            style={{ background: "rgba(201,168,76,0.15)", color: "#D4AF37" }}>
            📋 게시판
          </button>
          <button onClick={() => setCommunityTab("shorts")}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
            style={{ background: "transparent", color: "rgba(255,255,255,0.4)" }}>
            📱 쇼츠
          </button>
          <button onClick={() => setCommunityTab("updates")}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
            style={{ background: "transparent", color: "rgba(255,255,255,0.4)" }}>
            📢 공지
          </button>
        </div>
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
                  : "rgba(255,255,255,0.04)",
                color: filter === t.value ? t.color : "#B2BEC3",
                border: filter === t.value
                  ? `1px solid ${t.color}25`
                  : "1px solid transparent",
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts list */}
      <div className="flex-1 overflow-y-auto px-3 pb-20">
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
            <p className="text-white/30 text-sm">아직 게시글이 없습니다</p>
            <p className="text-white/15 text-[11px] mt-1">첫 번째 게시글을 작성해 보세요!</p>
          </div>
        )}

        {sortedPosts.map((post, idx) => {
          const avatarGrad = getAvatarGradient(post.nickname);
          const isHot = post.likes >= 3;
          return (
            <button
              key={post.id}
              onClick={() => openPostDetail(post)}
              className="w-full text-left mb-2.5 rounded-xl overflow-hidden transition-all active:scale-[0.99]"
              style={{
                background: isHot
                  ? "linear-gradient(160deg, rgba(255,107,107,0.04) 0%, rgba(255,255,255,0.02) 100%)"
                  : "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                border: isHot
                  ? "1px solid rgba(255,107,107,0.1)"
                  : "1px solid rgba(255,255,255,0.06)",
                animation: `stagger-slide-in 0.25s ease-out ${idx * 30}ms both`,
              }}>
              {/* Post header */}
              <div className="px-3 pt-3 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-[11px] font-bold text-white`}>
                  {post.nickname.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/90 text-[12px] font-bold">{post.nickname}</span>
                    <PostTypeTag type={post.post_type} />
                    {isHot && <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ background: "rgba(255,107,107,0.12)", color: "#FF6B6B" }}>🔥</span>}
                  </div>
                  <span className="text-white/25 text-[10px]">{timeAgo(post.created_at)}</span>
                </div>
                <MoreMenu
                  isMine={post.is_mine}
                  onDelete={() => { deletePost(post.id); }}
                  onReport={() => setReportTarget({ type: "post", id: post.id })}
                  onBlock={() => blockUser(post.user_id, post.nickname)}
                />
              </div>

              {/* Post content preview */}
              <div className="px-3 py-2">
                <p className="text-white/75 text-[13px] leading-relaxed line-clamp-3 break-words">
                  {post.content}
                </p>
                {/* Image thumbnails */}
                {post.image_urls.length > 0 && (
                  <ImageCarousel images={post.image_urls} size="thumb" />
                )}
              </div>

              {/* Post footer */}
              <div className="px-3 pb-2.5 flex items-center gap-4">
                <span className={`flex items-center gap-1 text-[11px] ${post.liked ? "text-pink-400" : "text-white/25"}`}>
                  {post.liked ? "❤️" : "🤍"} <span className="tabular-nums">{post.likes > 0 ? post.likes : ""}</span>
                </span>
                <span className="flex items-center gap-1 text-[11px] text-white/25">
                  💬 <span className="tabular-nums">{post.reply_count > 0 ? post.reply_count : "답글"}</span>
                </span>
                <span className="flex items-center gap-1 text-[11px] text-white/15 ml-auto">
                  👁 <span className="tabular-nums">{post.view_count > 0 ? post.view_count : ""}</span>
                </span>
              </div>
            </button>
          );
        })}

        {hasMore && posts.length > 0 && (
          <button onClick={loadMore} disabled={loading}
            className="w-full py-3 text-white/30 text-[12px] hover:text-white/50 transition rounded-xl"
            style={{ background: "rgba(255,255,255,0.02)" }}>
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
          <div className="bg-[#121220] rounded-t-2xl p-4 border-t border-white/10" onClick={(e) => e.stopPropagation()}
            style={{ animation: "compose-slide-up 0.25s ease-out" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-bold text-sm">새 게시글</span>
              <button onClick={() => setShowCompose(false)} className="text-white/40 hover:text-white/70 text-sm transition">취소</button>
            </div>

            {/* Post type selector */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {POST_TYPES.filter((t) => t.value !== "").map((t) => (
                <button key={t.value} onClick={() => setComposeType(t.value)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition"
                  style={{
                    background: composeType === t.value ? `${t.color}15` : "rgba(255,255,255,0.04)",
                    color: composeType === t.value ? t.color : "#B2BEC3",
                    border: composeType === t.value ? `1px solid ${t.color}25` : "1px solid transparent",
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
              className="w-full bg-white/5 text-white text-[13px] rounded-xl px-4 py-3 border border-white/10 focus:border-[#C9A84C]/40 focus:outline-none placeholder-white/20 resize-none"
              autoFocus
            />

            {/* Image previews */}
            {composeImagePreviews.length > 0 && (
              <div className="flex gap-2 mt-3">
                {composeImagePreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-white/5">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white text-[10px] hover:bg-red-500/80 transition">
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload progress */}
            {posting && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${uploadProgress}%`, background: "#C9A84C" }} />
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                {/* Image upload button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={composeImages.length >= 3}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg transition disabled:opacity-20"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>
                  📷 {composeImages.length}/3
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect}
                  className="hidden" />

                {/* Character count */}
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(composeText.length / 500) * 100}%`,
                        background: composeText.length > 450 ? "#FF6B6B" : composeText.length > 350 ? "#FFEAA7" : "#C9A84C",
                      }} />
                  </div>
                  <span className={`text-[10px] tabular-nums ${composeText.length > 450 ? "text-[#FF6B6B]" : "text-white/20"}`}>
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

      <style jsx>{`
        @keyframes compose-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes report-pop {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
