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
        className="w-full bg-[#1a1a2e] rounded-t-3xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar + header */}
        <div className="flex flex-col items-center pt-3 pb-2 px-5 border-b border-white/5">
          <div className="w-10 h-1 rounded-full bg-white/20 mb-2" />
          <div className="flex items-center justify-between w-full">
            <h3 className="text-white font-bold text-sm">선물하기 🎁</h3>
            <button onClick={onClose} className="text-white/40 text-sm">닫기</button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Balance display */}
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="text-center">
              <p className="text-yellow-400 text-lg font-bold">{gold.toLocaleString()}</p>
              <p className="text-white/30 text-[10px]">골드</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-purple-400 text-lg font-bold">{gems.toLocaleString()}</p>
              <p className="text-white/30 text-[10px]">젬</p>
            </div>
          </div>

          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => { setTipType("gold"); setAmount(100); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tipType === "gold"
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                  : "bg-white/5 text-white/30 border border-white/5"
              }`}
            >
              골드
            </button>
            <button
              onClick={() => { setTipType("gems"); setAmount(1); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tipType === "gems"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "bg-white/5 text-white/30 border border-white/5"
              }`}
            >
              젬
            </button>
          </div>

          {/* Amount buttons */}
          <div className="flex gap-2">
            {amounts.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  amount === a
                    ? tipType === "gold"
                      ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                      : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "bg-white/5 text-white/40 border border-white/5"
                }`}
              >
                {a.toLocaleString()}{unit}
              </button>
            ))}
          </div>

          {/* Insufficient balance warning */}
          {amount > balance && (
            <p className="text-red-400/80 text-xs text-center">잔액이 부족해요</p>
          )}

          {/* Message */}
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            placeholder="메시지 (선택)"
            className="w-full bg-white/5 text-white text-sm rounded-xl px-4 py-2.5 outline-none border border-white/5 focus:border-purple-500/30 placeholder:text-white/20"
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || amount > balance}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm disabled:opacity-30"
          >
            {sending ? "전송 중..." : `${amount.toLocaleString()}${unit} 선물하기`}
          </button>
        </div>
      </div>
    </div>
  );
}
