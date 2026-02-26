"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi } from "@/lib/api/client";
import { toastSuccess, toastError } from "@/components/ui/Toast";

const GOLD_AMOUNTS = [100, 500, 1000];
const GEMS_AMOUNTS = [1, 5, 10];

interface Props {
  shortId: string;
  onClose: () => void;
}

export default function ShortsGiftSheet({ shortId, onClose }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const gold = user?.gold || 0;
  const gems = user?.gems || 0;

  const [tipType, setTipType] = useState<"gold" | "gems">("gold");
  const [amount, setAmount] = useState(100);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const amounts = tipType === "gold" ? GOLD_AMOUNTS : GEMS_AMOUNTS;
  const balance = tipType === "gold" ? gold : gems;
  const unit = tipType === "gold" ? "G" : " 젬";

  const handleSend = async () => {
    if (!token || sending) return;
    if (amount > balance) {
      toastError("잔액이 부족해요");
      return;
    }

    setSending(true);
    try {
      await authApi(`/api/shorts/${shortId}/tip`, token, {
        method: "POST",
        body: { type: tipType, amount, message: message.trim() },
      });
      toastSuccess(`${amount}${unit} 선물 완료!`);
      fetchUser();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "선물에 실패했어요";
      if (msg.includes("daily_limit")) {
        toastError("일일 선물 한도를 초과했어요");
      } else if (msg.includes("insufficient")) {
        toastError("잔액이 부족해요");
      } else {
        toastError(msg);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          background: "linear-gradient(180deg, #2C1810, #1A0E08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar + header */}
        <div className="flex flex-col items-center pt-3 pb-2 px-5"
          style={{ borderBottom: "3px double #8B6914" }}>
          <div className="w-10 h-1 rounded-full mb-2" style={{ background: "rgba(201,168,76,0.3)" }} />
          <div className="flex items-center justify-between w-full">
            <h3 className="font-bold text-sm" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>선물하기 🎁</h3>
            <button onClick={onClose} className="text-sm" style={{ color: "rgba(245,230,200,0.4)" }}>닫기</button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Balance display */}
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: "#D4AF37" }}>{gold.toLocaleString()}</p>
              <p className="text-[10px]" style={{ color: "rgba(245,230,200,0.3)" }}>골드</p>
            </div>
            <div className="w-px h-8" style={{ background: "rgba(139,105,20,0.2)" }} />
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: "#A29BFE" }}>{gems.toLocaleString()}</p>
              <p className="text-[10px]" style={{ color: "rgba(245,230,200,0.3)" }}>젬</p>
            </div>
          </div>

          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => { setTipType("gold"); setAmount(100); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: tipType === "gold" ? "rgba(212,175,55,0.15)" : "rgba(245,230,200,0.04)",
                color: tipType === "gold" ? "#D4AF37" : "rgba(245,230,200,0.3)",
                border: tipType === "gold" ? "1px solid rgba(212,175,55,0.3)" : "1px solid rgba(139,105,20,0.1)",
              }}
            >
              골드
            </button>
            <button
              onClick={() => { setTipType("gems"); setAmount(1); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: tipType === "gems" ? "rgba(162,155,254,0.15)" : "rgba(245,230,200,0.04)",
                color: tipType === "gems" ? "#A29BFE" : "rgba(245,230,200,0.3)",
                border: tipType === "gems" ? "1px solid rgba(162,155,254,0.3)" : "1px solid rgba(139,105,20,0.1)",
              }}
            >
              젬
            </button>
          </div>

          {/* Amount buttons */}
          <div className="flex gap-2">
            {amounts.map((a) => {
              const isActive = amount === a;
              const activeColor = tipType === "gold" ? "#D4AF37" : "#A29BFE";
              return (
                <button
                  key={a}
                  onClick={() => setAmount(a)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: isActive ? `${activeColor}18` : "rgba(245,230,200,0.04)",
                    color: isActive ? activeColor : "rgba(245,230,200,0.4)",
                    border: isActive ? `1px solid ${activeColor}40` : "1px solid rgba(139,105,20,0.1)",
                  }}
                >
                  {a.toLocaleString()}{unit}
                </button>
              );
            })}
          </div>

          {/* Insufficient balance warning */}
          {amount > balance && (
            <p className="text-xs text-center" style={{ color: "#FF6B6B" }}>잔액이 부족해요</p>
          )}

          {/* Message */}
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            placeholder="메시지 (선택)"
            className="w-full text-sm rounded-xl px-4 py-2.5 outline-none"
            style={{
              background: "rgba(245,230,200,0.05)",
              color: "#F5E6C8",
              border: "1px solid rgba(139,105,20,0.15)",
            }}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || amount > balance}
            className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-30 transition active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)", color: "#fff" }}
          >
            {sending ? "전송 중..." : `${amount.toLocaleString()}${unit} 선물하기`}
          </button>
        </div>
      </div>
    </div>
  );
}
