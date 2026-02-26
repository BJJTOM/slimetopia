"use client";

import { useState, useRef, useEffect } from "react";

interface GuestbookEntry {
  id: string;
  author_nickname: string;
  message: string;
  created_at: string;
}

interface GuestbookPanelProps {
  entries: GuestbookEntry[];
  message: string;
  onMessageChange: (msg: string) => void;
  onSubmit: () => void;
}

function getRelativeTime(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "\uBC29\uAE08";
  if (mins < 60) return `${mins}\uBD84 \uC804`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}\uC2DC\uAC04 \uC804`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "\uC5B4\uC81C";
  if (days < 7) return `${days}\uC77C \uC804`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

// Color hash for avatar
function getAvatarColor(name: string): string {
  const colors = ["#55EFC4", "#74B9FF", "#A29BFE", "#FF9FF3", "#FFEAA7", "#FF6B6B", "#FD79A8", "#00CEC9", "#6C5CE7", "#E17055"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function GuestbookPanel({ entries, message, onMessageChange, onSubmit }: GuestbookPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [expanded, entries.length]);

  const previewEntries = entries.slice(-2);

  return (
    <div
      className="flex flex-col transition-all duration-300 ease-out"
      style={{
        maxHeight: expanded ? "60vh" : "auto",
        background: "linear-gradient(to top, rgba(10,10,26,0.95) 0%, rgba(10,10,26,0.85) 100%)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px 16px 0 0",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Title bar — tap to toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-4 py-2.5 w-full"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{"\uD83D\uDCDD"}</span>
          <span className="text-white text-xs font-bold">
            {"\uBC29\uBA85\uB85D"} ({entries.length})
          </span>
        </div>
        <div
          className="w-5 h-5 flex items-center justify-center text-white/40 transition-transform duration-200"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* Collapsed: preview last 2 */}
      {!expanded && previewEntries.length > 0 && (
        <div className="px-4 pb-2 space-y-1">
          {previewEntries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 text-[10px]">
              <span className="text-[#55EFC4] font-medium truncate max-w-[60px]">{entry.author_nickname}</span>
              <span className="text-white/60 truncate flex-1">{entry.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Expanded: full list + input */}
      {expanded && (
        <>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 pb-2 space-y-2"
            style={{ maxHeight: "calc(60vh - 110px)" }}
          >
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <span className="text-2xl mb-2 animate-float">{"\uD83D\uDCDD"}</span>
                <span className="text-white/30 text-[10px]">{"\uC544\uC9C1 \uBC29\uBA85\uB85D\uC774 \uBE44\uC5B4\uC788\uC5B4\uC694"}</span>
                <span className="text-white/15 text-[9px] mt-0.5">{"\uCCAB \uBC88\uC9F8 \uBC29\uBA85\uB85D\uC744 \uB0A8\uACB4\uBCF4\uC138\uC694!"}</span>
              </div>
            ) : (
              entries.map((entry, idx) => {
                const avatarColor = getAvatarColor(entry.author_nickname);
                const initial = entry.author_nickname.charAt(0).toUpperCase();
                return (
                  <div
                    key={entry.id}
                    className="flex gap-2.5 items-start"
                    style={{ animation: `stagger-slide-in 0.3s ease-out ${idx * 40}ms both` }}
                  >
                    {/* Avatar circle */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                      style={{ backgroundColor: avatarColor + "25", color: avatarColor }}
                    >
                      {initial}
                    </div>

                    {/* Bubble */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-medium" style={{ color: avatarColor }}>
                          {entry.author_nickname}
                        </span>
                        <span className="text-[8px] text-white/25">
                          {getRelativeTime(entry.created_at)}
                        </span>
                      </div>
                      <div
                        className="rounded-lg rounded-tl-sm px-3 py-1.5 text-white text-[10px] leading-relaxed"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {entry.message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input area */}
          <div className="px-4 py-2.5 border-t border-white/[0.06]">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={message}
                  onChange={(e) => onMessageChange(e.target.value.slice(0, 200))}
                  maxLength={200}
                  placeholder={"\uBA54\uC2DC\uC9C0\uB97C \uB0A8\uACA8\uBCF4\uC138\uC694..."}
                  rows={1}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-xs placeholder:text-[#636e72] focus:outline-none focus:border-[#55EFC4]/30 resize-none"
                  style={{ maxHeight: 72, minHeight: 34 }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = Math.min(target.scrollHeight, 72) + "px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (message.trim()) onSubmit();
                    }
                  }}
                />
                <span className="absolute right-2 bottom-1.5 text-[8px] text-white/20">
                  {message.length}/200
                </span>
              </div>
              <button
                onClick={onSubmit}
                disabled={!message.trim()}
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition"
                style={{
                  backgroundColor: message.trim() ? "rgba(85,239,196,0.2)" : "rgba(255,255,255,0.05)",
                  color: message.trim() ? "#55EFC4" : "rgba(255,255,255,0.2)",
                  border: `1px solid ${message.trim() ? "rgba(85,239,196,0.3)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
