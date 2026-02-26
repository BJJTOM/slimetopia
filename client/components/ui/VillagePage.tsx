"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi } from "@/lib/api/client";
import GiftModal from "./GiftModal";
import GuestbookPanel from "./GuestbookPanel";

const VisitCanvas = dynamic(() => import("@/components/game/VisitCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-[#0a0a1a]">
      <p className="text-[#D4AF37] text-sm animate-pulse">{"\uB9C8\uC744 \uB85C\uB529 \uC911..."}</p>
    </div>
  ),
});

interface Village {
  id: string;
  name: string;
  visit_count: number;
  likes: number;
  owner?: { nickname: string };
  slime_count?: number;
}

interface GuestbookEntry {
  id: string;
  author_nickname: string;
  message: string;
  created_at: string;
}

interface VisitSlime {
  id: string;
  species_id: number;
  name: string | null;
  level: number;
  exp: number;
  element: string;
  personality: string;
  affection: number;
  hunger: number;
  condition: number;
}

type View = "my" | "list" | "visit";

export default function VillagePage({ onClose }: { onClose: () => void }) {
  const token = useAuthStore((s) => s.accessToken);

  const [view, setView] = useState<View>("my");
  const [myVillage, setMyVillage] = useState<Village | null>(null);
  const [randomVillages, setRandomVillages] = useState<Village[]>([]);
  const [visitVillage, setVisitVillage] = useState<Village | null>(null);
  const [visitSlimes, setVisitSlimes] = useState<VisitSlime[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGift, setShowGift] = useState(false);

  useEffect(() => {
    if (token) fetchMyVillage();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMyVillage = async () => {
    if (!token) return;
    try {
      const res = await authApi<Village>("/api/village", token);
      setMyVillage(res);
    } catch {
      // ignore
    }
  };

  const fetchRandomVillages = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await authApi<{ villages: Village[] }>("/api/village/visit", token);
      setRandomVillages(res.villages || []);
      setView("list");
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const handleVisit = async (villageId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await authApi<{
        village: Village;
        owner?: { id: string; nickname: string };
        slimes: VisitSlime[];
        guestbook: GuestbookEntry[];
      }>(`/api/village/${villageId}`, token);
      // Server sends owner as separate top-level field; merge into village
      const village = { ...res.village, owner: res.owner };
      setVisitVillage(village);
      setVisitSlimes(res.slimes || []);
      setGuestbook(res.guestbook || []);
      setView("visit");
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const handleLike = async () => {
    if (!token || !visitVillage) return;
    try {
      await authApi(`/api/village/${visitVillage.id}/like`, token, { method: "POST" });
      setVisitVillage({ ...visitVillage, likes: visitVillage.likes + 1 });
    } catch {
      // ignore
    }
  };

  const handlePostGuestbook = async () => {
    if (!token || !visitVillage || !message.trim()) return;
    try {
      await authApi(`/api/village/${visitVillage.id}/guestbook`, token, {
        method: "POST",
        body: { message: message.trim() },
      });
      setMessage("");
      const res = await authApi<{ entries: GuestbookEntry[] }>(
        `/api/village/${visitVillage.id}/guestbook`,
        token,
      );
      setGuestbook(res.entries || []);
    } catch {
      // ignore
    }
  };

  // ===== "my" and "list" views with internal header =====
  if (view !== "visit") {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-black/30 shrink-0 overlay-header">
          <button
            onClick={view === "list" ? () => setView("my") : onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white text-sm transition"
          >
            {"\u2190"}
          </button>
          <h2 className="text-white font-bold text-sm">
            {view === "list" ? "\uD83C\uDFD8\uFE0F \uB9C8\uC744 \uBAA9\uB85D" : "\uD83C\uDFD8\uFE0F \uB9C8\uC744"}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {view === "my" && (
            <div className="space-y-4">
              {myVillage && (
                <div className="game-panel rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#8B6914]/20 border border-[#D4AF37]/15 flex items-center justify-center text-lg">
                      {"\uD83C\uDFE1"}
                    </div>
                    <div>
                      <h3 className="text-white text-sm font-bold">{myVillage.name}</h3>
                      <div className="flex items-center gap-3 text-[10px] text-[#B2BEC3]">
                        <span>{"\uD83D\uDC41"} {myVillage.visit_count}</span>
                        <span>{"\u2764\uFE0F"} {myVillage.likes}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={fetchRandomVillages}
                disabled={loading}
                className="btn-primary w-full py-3 text-sm"
              >
                {loading ? "\uB85C\uB529 \uC911..." : "\uD83C\uDFD8\uFE0F \uB2E4\uB978 \uB9C8\uC744 \uBC29\uBB38\uD558\uAE30"}
              </button>
            </div>
          )}

          {view === "list" && (
            <div className="space-y-3">
              {randomVillages.length === 0 ? (
                <p className="text-center text-[#B2BEC3] text-xs py-8">
                  {"\uBC29\uBB38\uD560 \uC218 \uC788\uB294 \uB9C8\uC744\uC774 \uC5C6\uC2B5\uB2C8\uB2E4"}
                </p>
              ) : (
                randomVillages.map((v, idx) => (
                  <button
                    key={v.id}
                    onClick={() => handleVisit(v.id)}
                    className="w-full text-left rounded-xl p-3 hover:brightness-125 transition"
                    style={{
                      animation: `stagger-slide-in 0.3s ease-out ${idx * 50}ms both`,
                      background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#8B6914]/20 border border-[#D4AF37]/15 flex items-center justify-center text-lg shrink-0">
                        {"\uD83C\uDFE1"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-xs font-bold truncate">{v.name}</h4>
                        <p className="text-[#B2BEC3] text-[10px] mt-0.5">
                          {v.owner?.nickname || "???"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-[9px] text-[#B2BEC3] shrink-0">
                        <span>{"\uD83D\uDC41"} {v.visit_count}</span>
                        <span>{"\u2764\uFE0F"} {v.likes}</span>
                        {v.slime_count !== undefined && <span>{"\uD83D\uDC1B"} {v.slime_count}</span>}
                      </div>
                    </div>
                  </button>
                ))
              )}

              <button
                onClick={fetchRandomVillages}
                disabled={loading}
                className="w-full text-center text-[10px] text-[#C9A84C] py-2 hover:text-[#C9A84C]/80 transition"
              >
                {"\uC0C8\uB85C\uACE0\uCE68"}
              </button>
            </div>
          )}
        </div>

        {showGift && (
          <GiftModal
            onClose={() => setShowGift(false)}
            defaultNickname={visitVillage?.owner?.nickname || ""}
          />
        )}
      </div>
    );
  }

  // ===== "visit" view — full-screen canvas + floating UI =====
  return (
    <div className="relative w-full h-full">
      {/* PixiJS Canvas */}
      <VisitCanvas slimes={visitSlimes} />

      {/* Floating overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col">
        {/* Top bar */}
        <div
          className="pointer-events-auto shrink-0 flex items-center justify-between px-3 py-2 overlay-header"
          style={{
            background: "linear-gradient(to bottom, rgba(10,10,26,0.7) 0%, transparent 100%)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setView("list")}
              className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white text-sm transition"
            >
              {"\u2190"}
            </button>
            <div>
              <span className="text-white text-xs font-bold">
                {visitVillage?.owner?.nickname || "???"}{"\uC758 \uB9C8\uC744"}
              </span>
              <div className="flex items-center gap-2 text-[9px] text-white/40">
                <span>{"\uD83D\uDC41"} {visitVillage?.visit_count}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowGift(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#FF9FF3]/15 backdrop-blur-sm border border-[#FF9FF3]/20 text-[#FF9FF3] text-[10px] hover:brightness-125 transition"
            >
              {"\uD83C\uDF81"}
            </button>
            <button
              onClick={handleLike}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#FF6B6B]/15 backdrop-blur-sm border border-[#FF6B6B]/20 text-[#FF6B6B] text-[10px] hover:brightness-125 transition"
            >
              {"\u2764\uFE0F"} {visitVillage?.likes}
            </button>
          </div>
        </div>

        {/* Spacer pushes guestbook to bottom */}
        <div className="flex-1" />

        {/* Bottom: Guestbook panel */}
        <div className="pointer-events-auto">
          <GuestbookPanel
            entries={guestbook}
            message={message}
            onMessageChange={setMessage}
            onSubmit={handlePostGuestbook}
          />
        </div>
      </div>

      {showGift && (
        <GiftModal
          onClose={() => setShowGift(false)}
          defaultNickname={visitVillage?.owner?.nickname || ""}
        />
      )}
    </div>
  );
}
