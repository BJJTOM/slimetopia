"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useShortsStore } from "@/lib/store/shortsStore";
import { toastError } from "@/components/ui/Toast";

interface Props {
  shortId: string;
  onClose: () => void;
}

export default function ShortsCommentSheet({ shortId, onClose }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const { comments, commentsLoading, fetchComments, createComment } = useShortsStore();

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) fetchComments(token, shortId);
  }, [token, shortId]);

  const handleSend = async () => {
    if (!token || !text.trim() || sending) return;
    if (text.length > 200) {
      toastError("200자 이하로 작성해주세요");
      return;
    }
    setSending(true);
    try {
      await createComment(token, shortId, text.trim());
      setText("");
      // Scroll to top to see new comment
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toastError("댓글 작성에 실패했어요");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-[#1a1a2e] rounded-t-3xl max-h-[55vh] flex flex-col"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar + header */}
        <div className="flex flex-col items-center pt-3 pb-2 px-5 border-b border-white/5">
          <div className="w-10 h-1 rounded-full bg-white/20 mb-2" />
          <div className="flex items-center justify-between w-full">
            <h3 className="text-white font-bold text-sm">댓글 {comments.length > 0 ? `(${comments.length})` : ""}</h3>
            <button onClick={onClose} className="text-white/40 text-sm">닫기</button>
          </div>
        </div>

        {/* Comment list */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {commentsLoading && comments.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-white/30 text-sm">
              <span className="text-3xl mb-2">💬</span>
              첫 댓글을 남겨보세요!
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white/70 text-xs font-bold">{c.nickname}</span>
                    <span className="text-white/20 text-[10px]">{formatTime(c.created_at)}</span>
                    {c.is_mine && (
                      <span className="text-[10px] text-purple-400/60 bg-purple-500/10 px-1.5 py-0.5 rounded">나</span>
                    )}
                  </div>
                  <p className="text-white/80 text-xs leading-relaxed mt-0.5">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/5 flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 200))}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="댓글을 입력하세요..."
            className="flex-1 bg-white/5 text-white text-sm rounded-full px-4 py-2.5 outline-none border border-white/5 focus:border-purple-500/30 placeholder:text-white/20"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="px-4 py-2.5 rounded-full bg-purple-500/30 text-purple-300 text-sm font-bold disabled:opacity-30"
          >
            {sending ? "..." : "전송"}
          </button>
        </div>
      </div>
    </div>
  );
}
