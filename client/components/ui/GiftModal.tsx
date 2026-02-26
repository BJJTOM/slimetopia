"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore } from "@/lib/store/gameStore";

interface GiftModalProps {
  onClose: () => void;
  defaultNickname?: string;
}

export default function GiftModal({ onClose, defaultNickname = "" }: GiftModalProps) {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const { sendGift } = useGameStore();

  const [nickname, setNickname] = useState(defaultNickname);
  const [giftType, setGiftType] = useState<"gold" | "gems">("gold");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!token || !nickname.trim() || !amount || sending) return;
    const amountNum = parseInt(amount, 10);
    if (isNaN(amountNum) || amountNum <= 0) return;

    setSending(true);
    const success = await sendGift(token, nickname.trim(), giftType, amountNum, message.trim() || undefined);
    setSending(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="game-panel rounded-3xl p-6 w-[320px] relative overflow-hidden animate-scale-in">
        {/* Background glow */}
        <div
          className="absolute inset-0 opacity-10"
          style={{ background: "radial-gradient(circle at 50% 30%, #FF9FF3, transparent 70%)" }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              <span className="mr-1.5">&#x1F381;</span> 선물 보내기
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white text-xs transition"
            >
              &#x2715;
            </button>
          </div>

          {/* Nickname */}
          <div className="mb-3">
            <label className="text-[10px] text-[#B2BEC3] block mb-1">받는 사람 닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임 입력..."
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-xs placeholder:text-[#636e72] focus:outline-none focus:border-[#FF9FF3]/30"
            />
          </div>

          {/* Gift type */}
          <div className="mb-3">
            <label className="text-[10px] text-[#B2BEC3] block mb-1">선물 종류</label>
            <div className="flex gap-2">
              <button
                onClick={() => setGiftType("gold")}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: giftType === "gold" ? "rgba(255,234,167,0.15)" : "rgba(255,255,255,0.05)",
                  color: giftType === "gold" ? "#FFEAA7" : "#B2BEC3",
                  border: giftType === "gold" ? "1px solid rgba(255,234,167,0.3)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                Gold {user ? `(${user.gold.toLocaleString()})` : ""}
              </button>
              <button
                onClick={() => setGiftType("gems")}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: giftType === "gems" ? "rgba(162,155,254,0.15)" : "rgba(255,255,255,0.05)",
                  color: giftType === "gems" ? "#A29BFE" : "#B2BEC3",
                  border: giftType === "gems" ? "1px solid rgba(162,155,254,0.3)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                Gems {user ? `(${user.gems})` : ""}
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="mb-3">
            <label className="text-[10px] text-[#B2BEC3] block mb-1">
              수량 (일일 한도: {giftType === "gold" ? "1,000G" : "10 Gems"})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="수량 입력..."
              min="1"
              max={giftType === "gold" ? 1000 : 10}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-xs placeholder:text-[#636e72] focus:outline-none focus:border-[#FF9FF3]/30"
            />
          </div>

          {/* Message */}
          <div className="mb-4">
            <label className="text-[10px] text-[#B2BEC3] block mb-1">메시지 (선택)</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              placeholder="마음을 전해보세요..."
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-xs placeholder:text-[#636e72] focus:outline-none focus:border-[#FF9FF3]/30"
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!nickname.trim() || !amount || sending}
            className="btn-primary w-full py-3 text-sm"
          >
            {sending ? "보내는 중..." : "선물 보내기"}
          </button>
        </div>
      </div>
    </div>
  );
}
