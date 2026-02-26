"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi } from "@/lib/api/client";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import ShortsPage from "@/components/ui/ShortsPage";

type CommunityTab = "board" | "shorts";

interface Post {
  id: string;
  user_id: string;
  nickname: string;
  content: string;
  post_type: string;
  likes: number;
  reply_count: number;
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
  created_at: string;
  liked: boolean;
  is_mine: boolean;
}

type SortMode = "new" | "hot";

const POST_TYPES = [
  { value: "", label: "전체", icon: "📋", color: "#B2BEC3" },
  { value: "general", label: "일반", icon: "💬", color: "#B2BEC3" },
  { value: "tip", label: "꿀팁", icon: "💡", color: "#FFEAA7" },
  { value: "question", label: "질문", icon: "❓", color: "#74B9FF" },
  { value: "flex", label: "자랑", icon: "✨", color: "#A29BFE" },
  { value: "screenshot", label: "스샷", icon: "📸", color: "#55EFC4" },
];

const AVATAR_GRADIENTS = [
  "from-[#55EFC4] to-[#00B894]",
  "from-[#74B9FF] to-[#0984E3]",
  "from-[#A29BFE] to-[#6C5CE7]",
  "from-[#FFEAA7] to-[#FDCB6E]",
  "from-[#FF6B6B] to-[#E17055]",
  "from-[#FD79A8] to-[#E84393]",
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
  const [posting, setPosting] = useState(false);

  // Post detail
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const fetchPosts = useCallback(async (pageNum: number, filterType: string, append = false) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum) });
      if (filterType) params.set("type", filterType);
      const res = await authApi<{ posts: Post[]; page: number }>(
        `/api/community/posts?${params}`, token
      );
      const newPosts = res.posts || [];
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
        // Hot = weighted by likes and recency
        const ageA = (Date.now() - new Date(a.created_at).getTime()) / 3600000; // hours
        const ageB = (Date.now() - new Date(b.created_at).getTime()) / 3600000;
        const scoreA = (a.likes * 2 + a.reply_count) / Math.max(1, Math.pow(ageA + 2, 0.5));
        const scoreB = (b.likes * 2 + b.reply_count) / Math.max(1, Math.pow(ageB + 2, 0.5));
        return scoreB - scoreA;
      })
    : posts;

  const createPost = async () => {
    if (!token || !composeText.trim()) return;
    setPosting(true);
    try {
      await authApi<{ id: string }>("/api/community/posts", token, {
        method: "POST",
        body: { content: composeText.trim(), post_type: composeType },
      });
      setComposeText("");
      setShowCompose(false);
      toastSuccess("게시글이 등록되었습니다!", "📝");
      fetchPosts(0, filter);
      setPage(0);
    } catch {
      toastError("게시글 등록에 실패했습니다");
    }
    setPosting(false);
  };

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!token) return;
    const endpoint = liked ? "unlike" : "like";
    try {
      await authApi(`/api/community/posts/${postId}/${endpoint}`, token, { method: "POST" });
      const update = (p: Post) =>
        p.id === postId ? { ...p, liked: !liked, likes: p.likes + (liked ? -1 : 1) } : p;
      setPosts((prev) => prev.map(update));
      if (selectedPost?.id === postId) {
        setSelectedPost((prev) => prev ? update(prev) : null);
      }
    } catch { /* ignore */ }
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
    if (!replies[post.id]) fetchReplies(post.id);
  };

  const submitReply = async (postId: string) => {
    if (!token || !replyText.trim()) return;
    setReplying(true);
    try {
      await authApi(`/api/community/posts/${postId}/replies`, token, {
        method: "POST",
        body: { content: replyText.trim() },
      });
      setReplyText("");
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

  // Post detail view
  if (selectedPost) {
    const postReplies = replies[selectedPost.id] || [];
    const avatarGrad = getAvatarGradient(selectedPost.nickname);
    return (
      <div className="h-full flex flex-col bg-[#0a0a1a]">
        {/* Detail header */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0 border-b border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
          <button onClick={() => setSelectedPost(null)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 text-sm transition">
            ←
          </button>
          <span className="text-white font-bold text-sm">게시글</span>
          <PostTypeTag type={selectedPost.post_type} />
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
              {selectedPost.is_mine && (
                <button onClick={() => deletePost(selectedPost.id)}
                  className="text-[10px] px-2 py-1 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition">
                  삭제
                </button>
              )}
            </div>

            <p className="text-white/90 text-[14px] leading-relaxed whitespace-pre-wrap break-words mb-4">
              {selectedPost.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-3 border-t border-white/[0.04]">
              <button onClick={() => toggleLike(selectedPost.id, selectedPost.liked)}
                className={`flex items-center gap-1.5 text-[12px] font-bold transition ${
                  selectedPost.liked ? "text-pink-400" : "text-white/30 hover:text-pink-300"
                }`}>
                {selectedPost.liked ? "❤️" : "🤍"} {selectedPost.likes > 0 ? `${selectedPost.likes}명이 좋아합니다` : "좋아요"}
              </button>
              <span className="text-white/20 text-[12px]">💬 {selectedPost.reply_count}개 답글</span>
            </div>
          </div>

          {/* Replies */}
          <div className="px-4 py-2">
            <p className="text-white/50 text-[11px] font-bold mb-2">답글 {postReplies.length}개</p>
            {loadingReplies && postReplies.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-3">
                    <div className="w-7 h-7 rounded-full skeleton flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="w-16 h-2.5 skeleton rounded" />
                      <div className="w-full h-3 skeleton rounded" />
                      <div className="w-2/3 h-3 skeleton rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : postReplies.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-2xl block mb-2 opacity-30">💬</span>
                <p className="text-white/20 text-[12px]">아직 답글이 없습니다</p>
                <p className="text-white/15 text-[10px] mt-0.5">첫 번째 답글을 남겨보세요!</p>
              </div>
            ) : (
              postReplies.map((r, idx) => {
                const replyGrad = getAvatarGradient(r.nickname);
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
                        </div>
                        <p className="text-white/65 text-[13px] leading-relaxed mt-0.5 break-words">
                          {r.content}
                        </p>
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
          <div className="flex gap-2">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submitReply(selectedPost.id)}
              placeholder="답글을 입력하세요..."
              maxLength={300}
              className="flex-1 bg-white/5 text-white text-[13px] rounded-xl px-4 py-2.5 border border-white/10 focus:border-[#55EFC4]/40 focus:outline-none placeholder-white/20"
            />
            <button
              onClick={() => submitReply(selectedPost.id)}
              disabled={replying || !replyText.trim()}
              className="px-4 py-2.5 rounded-xl font-bold text-[12px] disabled:opacity-30 transition"
              style={{ background: "linear-gradient(135deg, #55EFC4, #00B894)", color: "#0a0a1a" }}>
              {replying ? "..." : "전송"}
            </button>
          </div>
          {replyText.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(replyText.length / 300) * 100}%`,
                    background: replyText.length > 270 ? "#FF6B6B" : replyText.length > 200 ? "#FFEAA7" : "#55EFC4",
                  }} />
              </div>
              <span className={`text-[8px] tabular-nums ${replyText.length > 270 ? "text-[#FF6B6B]" : "text-white/20"}`}>
                {replyText.length}/300
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Shorts tab
  if (communityTab === "shorts") {
    return (
      <div className="h-full flex flex-col bg-[#0a0a1a]">
        {/* Header with tab switcher */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            {onClose && (
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white text-sm transition">
                ←
              </button>
            )}
            <h2 className="text-white font-bold text-[15px] flex-1">💬 커뮤니티</h2>
          </div>
          {/* Tab switcher */}
          <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.04)" }}>
            <button onClick={() => setCommunityTab("board")}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "transparent", color: "rgba(255,255,255,0.4)" }}>
              📋 게시판
            </button>
            <button
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
              style={{ background: "rgba(162,155,254,0.15)", color: "#C8B6FF" }}>
              📱 쇼츠
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ShortsPage onClose={() => setCommunityTab("board")} embedded />
        </div>
      </div>
    );
  }

  // Feed view
  return (
    <div className="h-full flex flex-col bg-[#0a0a1a]">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white text-sm transition"
            >
              ←
            </button>
          )}
          <h2 className="text-white font-bold text-[15px] flex-1">💬 커뮤니티</h2>
          {/* Sort toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => setSortMode("new")}
              className="text-[9px] font-bold px-2.5 py-1 transition"
              style={{
                background: sortMode === "new" ? "rgba(85,239,196,0.12)" : "transparent",
                color: sortMode === "new" ? "#55EFC4" : "rgba(255,255,255,0.3)",
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
            style={{ background: "rgba(162,155,254,0.15)", color: "#C8B6FF" }}>
            📋 게시판
          </button>
          <button onClick={() => setCommunityTab("shorts")}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
            style={{ background: "transparent", color: "rgba(255,255,255,0.4)" }}>
            📱 쇼츠
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
        {/* Skeleton loading */}
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
          const typeInfo = POST_TYPES.find((t) => t.value === post.post_type);
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
                    {isHot && <span className="text-[8px]">🔥</span>}
                  </div>
                  <span className="text-white/25 text-[10px]">{timeAgo(post.created_at)}</span>
                </div>
                {post.is_mine && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePost(post.id); }}
                    className="text-white/15 hover:text-red-400 text-[10px] transition px-1">
                    삭제
                  </button>
                )}
              </div>

              {/* Post content preview */}
              <div className="px-3 py-2">
                <p className="text-white/75 text-[13px] leading-relaxed line-clamp-3 break-words">
                  {post.content}
                </p>
              </div>

              {/* Post footer */}
              <div className="px-3 pb-2.5 flex items-center gap-4">
                <span className={`flex items-center gap-1 text-[11px] ${post.liked ? "text-pink-400" : "text-white/25"}`}>
                  {post.liked ? "❤️" : "🤍"} {post.likes > 0 && post.likes}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-white/25">
                  💬 {post.reply_count > 0 ? post.reply_count : "답글"}
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
            background: "linear-gradient(135deg, #55EFC4, #00B894)",
            boxShadow: "0 4px 20px rgba(85,239,196,0.4)",
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
              className="w-full bg-white/5 text-white text-[13px] rounded-xl px-4 py-3 border border-white/10 focus:border-[#55EFC4]/40 focus:outline-none placeholder-white/20 resize-none"
              autoFocus
            />

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                {/* Character count with progress bar */}
                <div className="w-20 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(composeText.length / 500) * 100}%`,
                      background: composeText.length > 450 ? "#FF6B6B" : composeText.length > 350 ? "#FFEAA7" : "#55EFC4",
                    }} />
                </div>
                <span className={`text-[10px] tabular-nums ${composeText.length > 450 ? "text-[#FF6B6B]" : "text-white/20"}`}>
                  {composeText.length}/500
                </span>
              </div>
              <button onClick={createPost} disabled={posting || !composeText.trim()}
                className="px-5 py-2 rounded-xl font-bold text-sm disabled:opacity-30 transition active:scale-95"
                style={{ background: "linear-gradient(135deg, #55EFC4, #00B894)", color: "#0a0a1a" }}>
                {posting ? "등록 중..." : "게시하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes compose-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
