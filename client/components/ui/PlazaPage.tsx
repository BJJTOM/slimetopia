"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore } from "@/lib/store/gameStore";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { elementColors } from "@/lib/constants";

interface PlazaSlime {
  id: string;
  nickname: string;
  slimeName: string;
  element: string;
  grade: string;
  level: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  direction: "left" | "right";
  isMoving: boolean;
}

interface ChatMessage {
  id: string;
  nickname: string;
  content: string;
  timestamp: number;
  color: string;
}

const PLAZA_W = 800;
const PLAZA_H = 600;
const SLIME_SIZE = 48;

const NPC_NICKNAMES = [
  "별빛슬라임", "달빛여우", "바다거북이", "구름위의고양이", "숲속의토끼",
  "눈꽃요정", "불꽃사자", "바람의나비", "대지의곰", "천둥늑대",
  "무지개달팽이", "새벽의부엉이", "황금두꺼비", "은하수물고기", "꽃잎개미",
];

const NPC_MESSAGES = [
  "안녕하세요! 🙋", "오늘 날씨가 좋네요~", "슬라임 귀엽다!", "합성 성공했어요!",
  "에픽 슬라임 구했다 ㅎㅎ", "레전더리 축하해요!", "탐험 보상 좋다",
  "같이 놀아요~", "보스 잡으러 가요!", "마을 꾸미기 재밌어요",
];

const CHAT_COLORS = ["#D4AF37", "#74B9FF", "#C9A84C", "#FFEAA7", "#FF6B6B", "#FD79A8", "#F5E6C8", "#FDCB6E"];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateNPCs(count: number): PlazaSlime[] {
  const elements = Object.keys(elementColors);
  const grades = ["common", "uncommon", "rare", "epic", "legendary"];
  return Array.from({ length: count }, (_, i) => {
    const x = randomBetween(60, PLAZA_W - 60);
    const y = randomBetween(60, PLAZA_H - 60);
    return {
      id: `npc-${i}`,
      nickname: NPC_NICKNAMES[i % NPC_NICKNAMES.length],
      slimeName: `슬라임 Lv.${randomBetween(1, 30)}`,
      element: elements[randomBetween(0, elements.length - 1)],
      grade: grades[randomBetween(0, grades.length - 1)],
      level: randomBetween(1, 30),
      x, y,
      targetX: x,
      targetY: y,
      direction: Math.random() > 0.5 ? "right" as const : "left" as const,
      isMoving: false,
    };
  });
}

export default function PlazaPage({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const { slimes, species, equippedAccessories } = useGameStore();

  // Selection phase vs plaza phase
  const [selectedSlimeId, setSelectedSlimeId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"select" | "plaza">("select");

  // Plaza state
  const [npcs, setNpcs] = useState<PlazaSlime[]>(() => generateNPCs(12));
  const [playerPos, setPlayerPos] = useState({ x: PLAZA_W / 2, y: PLAZA_H / 2 });
  const [playerDir, setPlayerDir] = useState<"left" | "right">("right");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const selectedSlime = slimes.find((s) => s.id === selectedSlimeId);
  const selectedSpecies = selectedSlime ? species.find((sp) => sp.id === selectedSlime.species_id) : null;

  // NPC random movement
  useEffect(() => {
    if (phase !== "plaza") return;
    const interval = setInterval(() => {
      setNpcs((prev) =>
        prev.map((npc) => {
          if (Math.random() > 0.3) return npc;
          const tx = randomBetween(60, PLAZA_W - 60);
          const ty = randomBetween(60, PLAZA_H - 60);
          return { ...npc, targetX: tx, targetY: ty, isMoving: true, direction: tx > npc.x ? "right" : "left" };
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [phase]);

  // NPC position animation
  useEffect(() => {
    if (phase !== "plaza") return;
    const step = () => {
      setNpcs((prev) =>
        prev.map((npc) => {
          if (!npc.isMoving) return npc;
          const dx = npc.targetX - npc.x;
          const dy = npc.targetY - npc.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 2) return { ...npc, x: npc.targetX, y: npc.targetY, isMoving: false };
          const speed = 1.2;
          return { ...npc, x: npc.x + (dx / dist) * speed, y: npc.y + (dy / dist) * speed };
        })
      );
      animFrameRef.current = requestAnimationFrame(step);
    };
    animFrameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [phase]);

  // NPC chat messages
  useEffect(() => {
    if (phase !== "plaza") return;
    const interval = setInterval(() => {
      if (Math.random() > 0.4) return;
      const npc = npcs[randomBetween(0, npcs.length - 1)];
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        nickname: npc.nickname,
        content: NPC_MESSAGES[randomBetween(0, NPC_MESSAGES.length - 1)],
        timestamp: Date.now(),
        color: CHAT_COLORS[randomBetween(0, CHAT_COLORS.length - 1)],
      };
      setChatMessages((prev) => [...prev.slice(-50), msg]);
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, npcs]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle tap on plaza to move player
  const handlePlazaTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== "plaza" || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = PLAZA_W / rect.width;
    const scaleY = PLAZA_H / rect.height;
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = Math.max(30, Math.min(PLAZA_W - 30, (clientX - rect.left) * scaleX));
    const y = Math.max(30, Math.min(PLAZA_H - 30, (clientY - rect.top) * scaleY));
    setPlayerDir(x > playerPos.x ? "right" : "left");
    setPlayerPos({ x, y });
  }, [phase, playerPos.x]);

  const sendChat = () => {
    if (!chatInput.trim() || !user) return;
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      nickname: user.nickname,
      content: chatInput.trim(),
      timestamp: Date.now(),
      color: "#D4AF37",
    };
    setChatMessages((prev) => [...prev.slice(-50), msg]);
    setChatInput("");
  };

  const enterPlaza = () => {
    if (!selectedSlimeId) return;
    setPhase("plaza");
  };

  // === SELECTION PHASE ===
  if (phase === "select") {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5">
            <span className="text-white/60 text-sm">←</span>
          </button>
          <h1 className="text-white font-bold text-lg">광장</h1>
        </div>

        {/* Description */}
        <div className="px-4 py-4">
          <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(139,105,20,0.1))" }}>
            <p className="text-white/90 text-sm font-bold mb-1">🏟️ 광장에 입장하세요!</p>
            <p className="text-white/50 text-xs">함께 돌아다니고 다른 플레이어와 채팅할 슬라임을 선택하세요.</p>
          </div>
        </div>

        {/* Slime grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <p className="text-white/40 text-xs font-bold mb-3">내 슬라임 선택</p>
          <div className="grid grid-cols-3 gap-3">
            {slimes.map((s) => {
              const sp = species.find((sp) => sp.id === s.species_id);
              const isSelected = selectedSlimeId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSlimeId(s.id)}
                  className="relative rounded-2xl p-3 flex flex-col items-center gap-2 transition-all"
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${elementColors[s.element]}22, ${elementColors[s.element]}11)`
                      : "rgba(255,255,255,0.03)",
                    border: isSelected ? `2px solid ${elementColors[s.element]}88` : "2px solid transparent",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: `${elementColors[s.element]}15` }}>
                    <img src={generateSlimeIconSvg(s.element, 40, sp?.grade, (equippedAccessories[s.id] || []).map(e => e.svg_overlay).filter(Boolean), s.species_id)} alt="" className="w-10 h-10" draggable={false} />
                  </div>
                  <div className="text-center">
                    <p className="text-white/90 text-xs font-bold truncate max-w-full">{s.name}</p>
                    <p className="text-white/40 text-[10px]">Lv.{s.level} · {sp?.name || ""}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: elementColors[s.element] }}>
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Enter button */}
        <div className="px-4 py-3 border-t border-white/5">
          <button
            onClick={enterPlaza}
            disabled={!selectedSlimeId}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all"
            style={{
              background: selectedSlimeId
                ? "linear-gradient(135deg, #C9A84C, #8B6914)"
                : "rgba(255,255,255,0.05)",
              color: selectedSlimeId ? "white" : "rgba(255,255,255,0.3)",
            }}
          >
            {selectedSlimeId ? "광장 입장하기 🏟️" : "슬라임을 선택하세요"}
          </button>
        </div>
      </div>
    );
  }

  // === PLAZA PHASE ===
  const playerElement = selectedSlime?.element || "water";
  const playerGrade = selectedSpecies?.grade || "common";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <button onClick={() => setPhase("select")} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5">
          <span className="text-white/60 text-sm">←</span>
        </button>
        <h1 className="text-white font-bold text-lg">🏟️ 광장</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-white/40 px-2 py-1 rounded-full bg-white/5">
            👥 {npcs.length + 1}명 접속중
          </span>
          <button
            onClick={() => setShowChat(!showChat)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5"
          >
            <span className="text-sm">{showChat ? "💬" : "🔇"}</span>
          </button>
        </div>
      </div>

      {/* Plaza view */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={canvasRef}
          onClick={handlePlazaTap}
          onTouchStart={handlePlazaTap}
          className="w-full h-full relative cursor-pointer"
          style={{
            background: "linear-gradient(180deg, #0d1b2a 0%, #1b2838 40%, #2d4a3e 70%, #3d6b4f 100%)",
          }}
        >
          {/* Ground decorations */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Fountain in center */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(116,185,255,0.2) 0%, rgba(116,185,255,0.05) 60%, transparent 100%)" }}>
              <div className="absolute inset-3 rounded-full border border-[#74B9FF]/20" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl animate-pulse">⛲</div>
            </div>

            {/* Trees */}
            {[
              { left: "8%", top: "12%" }, { left: "85%", top: "8%" },
              { left: "5%", top: "75%" }, { left: "90%", top: "70%" },
              { left: "15%", top: "45%" }, { left: "80%", top: "45%" },
            ].map((pos, i) => (
              <div key={`tree-${i}`} className="absolute text-2xl" style={pos}>🌳</div>
            ))}

            {/* Flowers */}
            {[
              { left: "20%", top: "80%" }, { left: "60%", top: "15%" },
              { left: "35%", top: "90%" }, { left: "75%", top: "85%" },
            ].map((pos, i) => (
              <div key={`flower-${i}`} className="absolute text-lg opacity-60" style={pos}>
                {["🌸", "🌼", "🌺", "💐"][i]}
              </div>
            ))}

            {/* Benches */}
            <div className="absolute text-xl" style={{ left: "25%", top: "30%" }}>🪑</div>
            <div className="absolute text-xl" style={{ left: "70%", top: "65%" }}>🪑</div>

            {/* Lanterns */}
            <div className="absolute text-lg opacity-70" style={{ left: "40%", top: "10%" }}>🏮</div>
            <div className="absolute text-lg opacity-70" style={{ left: "55%", top: "85%" }}>🏮</div>
          </div>

          {/* NPC slimes */}
          {npcs.map((npc) => {
            const pctX = (npc.x / PLAZA_W) * 100;
            const pctY = (npc.y / PLAZA_H) * 100;
            return (
              <div
                key={npc.id}
                className="absolute transition-all duration-1000 ease-linear"
                style={{
                  left: `${pctX}%`,
                  top: `${pctY}%`,
                  transform: `translate(-50%, -50%) scaleX(${npc.direction === "left" ? -1 : 1})`,
                  zIndex: Math.floor(npc.y),
                }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-white/60 font-bold mb-0.5 whitespace-nowrap"
                    style={{ transform: `scaleX(${npc.direction === "left" ? -1 : 1})` }}>
                    {npc.nickname}
                  </span>
                  <img src={generateSlimeIconSvg(npc.element, 36, npc.grade)} alt="" className="w-10 h-10" draggable={false} />
                  {npc.isMoving && (
                    <div className="flex gap-0.5 mt-0.5"
                      style={{ transform: `scaleX(${npc.direction === "left" ? -1 : 1})` }}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-white/20 animate-bounce"
                          style={{ animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Player slime */}
          <div
            className="absolute transition-all duration-500 ease-out"
            style={{
              left: `${(playerPos.x / PLAZA_W) * 100}%`,
              top: `${(playerPos.y / PLAZA_H) * 100}%`,
              transform: `translate(-50%, -50%) scaleX(${playerDir === "left" ? -1 : 1})`,
              zIndex: Math.floor(playerPos.y) + 1,
            }}
          >
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold mb-0.5 whitespace-nowrap"
                style={{ color: "#D4AF37", transform: `scaleX(${playerDir === "left" ? -1 : 1})` }}>
                {user?.nickname || "나"}
              </span>
              <div className="relative">
                <div className="absolute -inset-2 rounded-full animate-pulse opacity-30"
                  style={{ background: `radial-gradient(circle, ${elementColors[playerElement]}40, transparent)` }} />
                <img src={generateSlimeIconSvg(playerElement, 44, playerGrade,
                  selectedSlime ? (equippedAccessories[selectedSlime.id] || []).map(e => e.svg_overlay).filter(Boolean) : undefined,
                  selectedSlime?.species_id
                )} alt="" className="w-12 h-12 relative z-10" draggable={false} />
              </div>
              <span className="text-[8px] text-white/40 mt-0.5"
                style={{ transform: `scaleX(${playerDir === "left" ? -1 : 1})` }}>
                {selectedSlime?.name}
              </span>
            </div>
          </div>
        </div>

        {/* Chat overlay */}
        {showChat && (
          <div className="absolute bottom-0 left-0 right-0 flex flex-col" style={{ maxHeight: "40%" }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
              style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.7) 30%)" }}>
              {chatMessages.slice(-20).map((msg) => (
                <div key={msg.id} className="flex items-start gap-1.5">
                  <span className="text-[10px] font-bold shrink-0" style={{ color: msg.color }}>
                    {msg.nickname}
                  </span>
                  <span className="text-[11px] text-white/80">{msg.content}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="메시지를 입력하세요..."
                maxLength={100}
                className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none border border-white/5 focus:border-[#C9A84C]/50"
              />
              <button
                onClick={sendChat}
                disabled={!chatInput.trim()}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: chatInput.trim() ? "linear-gradient(135deg, #C9A84C, #8B6914)" : "rgba(255,255,255,0.05)",
                }}
              >
                <span className="text-sm">↑</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
