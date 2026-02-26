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
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) fetchComments(token, shortId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const safeComments = comments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl max-h-[55vh] flex flex-col"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background: "linear-gradient(180deg, #2C1810, #1A0E08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar + header */}
        <div className="flex flex-col items-center pt-3 pb-2 px-5"
          style={{ borderBottom: "3px double #8B6914" }}>
          <div className="w-10 h-1 rounded-full mb-2" style={{ background: "rgba(201,168,76,0.3)" }} />
          <div className="flex items-center justify-between w-full">
            <h3 className="font-bold text-sm" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>
              댓글 {safeComments.length > 0 ? `(${safeComments.length})` : ""}
            </h3>
            <button onClick={onClose} className="text-sm" style={{ color: "rgba(245,230,200,0.4)" }}>닫기</button>
          </div>
        </div>

        {/* Comment list */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {commentsLoading && safeComments.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full animate-spin"
                style={{ border: "2px solid rgba(201,168,76,0.2)", borderTopColor: "rgba(201,168,76,0.6)" }} />
            </div>
          ) : safeComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-sm"
              style={{ color: "rgba(245,230,200,0.3)" }}>
              <span className="text-3xl mb-2 opacity-50">💬</span>
              첫 댓글을 남겨보세요!
            </div>
          ) : (
            safeComments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
                  {c.nickname?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: "rgba(245,230,200,0.7)" }}>{c.nickname}</span>
                    <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.2)" }}>{formatTime(c.created_at)}</span>
                    {c.is_mine && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C" }}>나</span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: "rgba(245,230,200,0.8)" }}>{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 flex gap-2" style={{ borderTop: "1px solid rgba(139,105,20,0.15)" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 200))}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="댓글을 입력하세요..."
            className="flex-1 text-sm rounded-full px-4 py-2.5 outline-none"
            style={{
              background: "rgba(245,230,200,0.05)",
              color: "#F5E6C8",
              border: "1px solid rgba(139,105,20,0.15)",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="px-4 py-2.5 rounded-full text-sm font-bold disabled:opacity-30 transition"
            style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)", color: "#fff" }}
          >
            {sending ? "..." : "전송"}
          </button>
        </div>
      </div>
    </div>
  );
}
