"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore, type Slime } from "@/lib/store/gameStore";
import { authApi, ApiError } from "@/lib/api/client";
import { toastReward, toastError } from "@/components/ui/Toast";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { elementNames } from "@/lib/constants";

interface TrainingSlot {
  id: string;
  slime_id: string;
  slot_number: number;
  started_at: string;
  species_id: number;
  level: number;
  exp: number;
  element: string;
  personality: string;
  name: string;
  grade: string;
  elapsed_mins: number;
  pending_exp: number;
}

interface TrainingData {
  slots: TrainingSlot[];
  max_slots: number;
}

const GRADE_COLORS: Record<string, string> = {
  common: "#B2BEC3", uncommon: "#55EFC4", rare: "#74B9FF",
  epic: "#A29BFE", legendary: "#FFEAA7", mythic: "#FF6B6B",
};

const GRADE_NAMES: Record<string, string> = {
  common: "일반", uncommon: "고급", rare: "희귀",
  epic: "영웅", legendary: "전설", mythic: "신화",
};

function formatDuration(mins: number): string {
  if (mins < 1) return "방금 시작";
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

function rgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ===== Canvas Banner Drawing =====

interface BannerParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; type: "sweat" | "exp" | "sparkle";
  text?: string;
}

function drawTrainingBanner(
  ctx: CanvasRenderingContext2D, w: number, h: number, t: number,
  particles: BannerParticle[], slotCount: number, totalExp: number,
) {
  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#0f0f2a"); bg.addColorStop(0.5, "#141430"); bg.addColorStop(1, "#0f0f2a");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  // Floor line
  const floorY = h * 0.82;
  ctx.beginPath(); ctx.moveTo(0, floorY);
  ctx.lineTo(w, floorY);
  ctx.strokeStyle = "rgba(162,155,254,0.15)"; ctx.lineWidth = 1; ctx.stroke();

  // Floor glow
  const fg = ctx.createLinearGradient(0, floorY, 0, h);
  fg.addColorStop(0, "rgba(162,155,254,0.06)"); fg.addColorStop(1, "transparent");
  ctx.fillStyle = fg; ctx.fillRect(0, floorY, w, h - floorY);

  // === Animated Slime ===
  const cx = w * 0.22;
  const baseY = floorY - 18;
  // Bounce (jumping exercise)
  const jumpCycle = t * 2.5;
  const jumpPhase = jumpCycle % 1;
  const jumpHeight = jumpPhase < 0.4 ? Math.sin(jumpPhase / 0.4 * Math.PI) * 18 : 0;
  const squash = jumpPhase > 0.4 && jumpPhase < 0.5 ? 0.85 : jumpPhase < 0.1 ? 0.9 : 1;
  const sy = baseY - jumpHeight;

  ctx.save(); ctx.translate(cx, sy);
  ctx.scale(1 + (1 - squash) * 0.3, squash);

  // Shadow
  ctx.beginPath(); ctx.ellipse(0, 18 + jumpHeight * 0.5, 16 * (1 - jumpHeight / 50), 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${0.3 - jumpHeight * 0.01})`; ctx.fill();

  // Body
  const sz = 16;
  ctx.beginPath();
  ctx.moveTo(-sz, sz * 0.7); ctx.bezierCurveTo(-sz * 1.1, 0, -sz * 0.9, -sz, 0, -sz * 1.1);
  ctx.bezierCurveTo(sz * 0.9, -sz, sz * 1.1, 0, sz, sz * 0.7);
  ctx.bezierCurveTo(sz * 0.7, sz, -sz * 0.7, sz, -sz, sz * 0.7); ctx.closePath();
  const slimeG = ctx.createLinearGradient(0, -sz, 0, sz);
  slimeG.addColorStop(0, "#A29BFE"); slimeG.addColorStop(1, "#6C5CE7");
  ctx.fillStyle = slimeG; ctx.fill();
  ctx.strokeStyle = "rgba(162,155,254,0.4)"; ctx.lineWidth = 1; ctx.stroke();

  // Highlight
  ctx.beginPath(); ctx.ellipse(-sz * 0.3, -sz * 0.5, sz * 0.25, sz * 0.12, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fill();

  // Eyes
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.arc(s * sz * 0.3, -sz * 0.1, sz * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.beginPath(); ctx.arc(s * sz * 0.32, -sz * 0.1, sz * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = "#2D3436"; ctx.fill();
  }
  // Determined mouth
  ctx.beginPath(); ctx.moveTo(-sz * 0.15, sz * 0.2); ctx.lineTo(sz * 0.15, sz * 0.15);
  ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.stroke();

  // Headband
  ctx.beginPath();
  ctx.moveTo(-sz * 0.9, -sz * 0.55); ctx.quadraticCurveTo(0, -sz * 0.9, sz * 0.9, -sz * 0.55);
  ctx.strokeStyle = "#FF6B6B"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.stroke();
  // Headband tail
  ctx.beginPath(); ctx.moveTo(sz * 0.9, -sz * 0.55);
  ctx.quadraticCurveTo(sz * 1.3, -sz * 0.4 + Math.sin(t * 5) * 3, sz * 1.5, -sz * 0.7 + Math.sin(t * 4) * 4);
  ctx.strokeStyle = "#FF6B6B"; ctx.lineWidth = 2; ctx.stroke();

  ctx.restore();

  // Sweat drops when jumping
  if (jumpPhase < 0.05 && Math.random() < 0.5) {
    particles.push({
      x: cx + (Math.random() - 0.5) * 20, y: sy - 10,
      vx: (Math.random() - 0.5) * 1.5, vy: -(1 + Math.random()),
      life: 0, maxLife: 0.8 + Math.random() * 0.4, size: 2 + Math.random(), type: "sweat",
    });
  }

  // === Dumbbell on floor ===
  const dbX = w * 0.48, dbY = floorY - 6;
  ctx.save(); ctx.translate(dbX, dbY);
  // Bar
  ctx.beginPath(); ctx.roundRect(-18, -2, 36, 4, 2);
  ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fill();
  // Weights
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.roundRect(s * 15, -6, 8 * s, 12, 2);
    ctx.fillStyle = "rgba(162,155,254,0.3)"; ctx.fill();
    ctx.strokeStyle = "rgba(162,155,254,0.2)"; ctx.lineWidth = 0.5; ctx.stroke();
  }
  ctx.restore();

  // === EXP Rate indicator ===
  const rateX = w * 0.72, rateY = h * 0.35;
  ctx.save();
  ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
  ctx.fillStyle = rgba("#A29BFE", 0.5 + Math.sin(t * 2) * 0.15);
  ctx.fillText("120 EXP/h", rateX, rateY);
  // Upward arrow
  ctx.beginPath();
  ctx.moveTo(rateX, rateY - 18); ctx.lineTo(rateX - 5, rateY - 12); ctx.moveTo(rateX, rateY - 18);
  ctx.lineTo(rateX + 5, rateY - 12);
  ctx.strokeStyle = rgba("#A29BFE", 0.3 + Math.sin(t * 3) * 0.1);
  ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.stroke();
  ctx.restore();

  // === Slot count circles ===
  const circX = w * 0.72, circY = h * 0.65;
  for (let i = 0; i < 3; i++) {
    const cx2 = circX + (i - 1) * 16;
    ctx.beginPath(); ctx.arc(cx2, circY, 5, 0, Math.PI * 2);
    ctx.fillStyle = i < slotCount ? rgba("#A29BFE", 0.6) : "rgba(255,255,255,0.08)";
    ctx.fill();
    if (i < slotCount) {
      const glow = ctx.createRadialGradient(cx2, circY, 0, cx2, circY, 8);
      glow.addColorStop(0, rgba("#A29BFE", 0.2)); glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow; ctx.fillRect(cx2 - 8, circY - 8, 16, 16);
    }
  }
  ctx.font = "9px sans-serif"; ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillText(`${slotCount}/3 슬롯`, circX, circY + 14);

  // === Total EXP (right side) ===
  if (totalExp > 0) {
    const expX = w * 0.9, expY = h * 0.5;
    ctx.save();
    ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
    ctx.fillStyle = "#FFEAA7"; ctx.shadowColor = "#FFEAA7"; ctx.shadowBlur = 8;
    ctx.fillText(`+${totalExp}`, expX, expY);
    ctx.shadowBlur = 0;
    ctx.font = "9px sans-serif"; ctx.fillStyle = "rgba(255,234,167,0.5)";
    ctx.fillText("EXP", expX, expY + 13);
    ctx.restore();
  }

  // === Sparkle particles (background ambiance) ===
  if (Math.random() < 0.08) {
    particles.push({
      x: Math.random() * w, y: Math.random() * h * 0.7,
      vx: 0, vy: -0.2, life: 0, maxLife: 1.5 + Math.random(), size: 1 + Math.random(), type: "sparkle",
    });
  }

  // EXP float particles (from training)
  if (slotCount > 0 && Math.random() < 0.04 * slotCount) {
    particles.push({
      x: cx + (Math.random() - 0.5) * 40, y: floorY - 30 - Math.random() * 20,
      vx: (Math.random() - 0.5) * 0.3, vy: -0.5 - Math.random() * 0.3,
      life: 0, maxLife: 2 + Math.random(), size: 0, type: "exp", text: `+${Math.floor(Math.random() * 5 + 1)}`,
    });
  }
}

// ===== Component =====

export default function TrainingPage({ onClose }: { onClose: () => void }) {
  const token = useAuthStore((s) => s.accessToken);
  const slimes = useGameStore((s) => s.slimes);
  const species = useGameStore((s) => s.species);
  const fetchSlimes = useGameStore((s) => s.fetchSlimes);
  const [data, setData] = useState<TrainingData | null>(null);
  const [showSelect, setShowSelect] = useState(false);
  const [collecting, setCollecting] = useState<string | null>(null);
  const [collectingAll, setCollectingAll] = useState(false);
  const [starting, setStarting] = useState(false);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrRef = useRef<HTMLDivElement>(null);
  const animRef = useRef(0);
  const tRef = useRef(0);
  const lastRef = useRef(0);
  const partsRef = useRef<BannerParticle[]>([]);
  const dataRef = useRef<TrainingData | null>(null);

  const fetchTraining = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authApi<TrainingData>("/api/training", token);
      setData(res);
      dataRef.current = res;
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    fetchTraining();
    const interval = setInterval(fetchTraining, 15000);
    return () => clearInterval(interval);
  }, [fetchTraining]);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctr = ctrRef.current;
    if (!canvas || !ctr) return;

    const resize = () => {
      const r = ctr.getBoundingClientRect();
      const d = window.devicePixelRatio || 1;
      canvas.width = r.width * d; canvas.height = r.height * d;
      canvas.style.width = `${r.width}px`; canvas.style.height = `${r.height}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    const draw = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastRef.current) / 1000);
      lastRef.current = ts; tRef.current += dt;
      const t = tRef.current;
      const w = canvas.width / dpr, h = canvas.height / dpr;

      ctx.save(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);

      const d = dataRef.current;
      const slotCount = d?.slots.length || 0;
      const totalExp = d?.slots.reduce((s, sl) => s + sl.pending_exp, 0) || 0;

      drawTrainingBanner(ctx, w, h, t, partsRef.current, slotCount, totalExp);

      // Update particles
      partsRef.current = partsRef.current.filter((p) => {
        p.life += dt; if (p.life >= p.maxLife) return false;
        p.x += p.vx * dt * 60; p.y += p.vy * dt * 60;
        const lr = p.life / p.maxLife;
        const a = lr < 0.15 ? lr / 0.15 : lr > 0.6 ? (1 - lr) / 0.4 : 1;

        if (p.type === "sweat") {
          p.vy += 0.05 * dt * 60;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(116,185,255,${a * 0.6})`; ctx.fill();
        } else if (p.type === "sparkle") {
          const twinkle = Math.sin(t * 8 + p.x) > 0.3 ? 1 : 0.3;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * twinkle, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(162,155,254,${a * 0.4 * twinkle})`; ctx.fill();
        } else if (p.type === "exp") {
          ctx.save();
          ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
          ctx.globalAlpha = a * 0.6;
          ctx.fillStyle = "#A29BFE"; ctx.fillText(p.text || "+1", p.x, p.y);
          ctx.restore();
        }
        return true;
      });

      ctx.restore();
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, []);

  const startTraining = async (slimeId: string) => {
    if (!token || starting) return;
    setStarting(true);
    try {
      await authApi("/api/training/start", token, { method: "POST", body: { slime_id: slimeId } });
      setShowSelect(false);
      toastReward("훈련을 시작했습니다!", "🏋️");
      fetchTraining();
    } catch (err) {
      if (err instanceof ApiError) {
        const code = err.data.error as string;
        if (code === "already_training") toastError("이미 훈련 중인 슬라임입니다");
        else if (code === "on_exploration") toastError("탐험 중인 슬라임은 훈련할 수 없습니다");
        else if (code === "slots_full") toastError("훈련 슬롯이 가득 찼습니다");
        else toastError("훈련 시작 실패");
      }
    }
    setStarting(false);
  };

  const collectTraining = async (slotId: string) => {
    if (!token) return;
    setCollecting(slotId);
    try {
      const res = await authApi<{ exp_gained: number; new_level: number; level_up: boolean }>(
        `/api/training/${slotId}/collect`, token, { method: "POST" },
      );
      let msg = `EXP +${res.exp_gained} 획득!`;
      if (res.level_up) msg += ` Lv.${res.new_level} 달성!`;
      toastReward(msg, "🏋️");
      fetchTraining();
      if (token) fetchSlimes(token);
    } catch {
      toastError("수령 실패");
    }
    setCollecting(null);
  };

  const collectAll = async () => {
    if (!token || !data || collectingAll) return;
    setCollectingAll(true);
    let totalExp = 0;
    let levelUps = 0;
    for (const slot of data.slots) {
      if (slot.pending_exp <= 0) continue;
      try {
        const res = await authApi<{ exp_gained: number; new_level: number; level_up: boolean }>(
          `/api/training/${slot.id}/collect`, token, { method: "POST" },
        );
        totalExp += res.exp_gained;
        if (res.level_up) levelUps++;
      } catch { /* continue */ }
    }
    if (totalExp > 0) {
      let msg = `총 EXP +${totalExp} 획득!`;
      if (levelUps > 0) msg += ` ${levelUps}마리 레벨업!`;
      toastReward(msg, "🏋️");
    }
    fetchTraining();
    if (token) fetchSlimes(token);
    setCollectingAll(false);
  };

  const trainedSlimeIds = data?.slots.map((s) => s.slime_id) || [];
  const availableSlimes = slimes.filter((s) => !trainedSlimeIds.includes(s.id));
  const filledSlots = data?.slots.length || 0;
  const maxSlots = data?.max_slots || 3;
  const totalPendingExp = data?.slots.reduce((s, sl) => s + sl.pending_exp, 0) || 0;
  const hasCollectable = (data?.slots.length || 0) > 0 && totalPendingExp > 0;

  return (
    <div className="absolute inset-0 z-50 bg-[#0a0a1a] flex flex-col" style={{ bottom: 76 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/30 shrink-0 overlay-header">
        <div className="flex items-center gap-2.5">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white text-sm transition">{"←"}</button>
          <div>
            <h2 className="text-white font-bold text-sm">{"🏋️"} 훈련장</h2>
            <span className="text-white/30 text-[9px]">{filledSlots}/{maxSlots} 사용 중</span>
          </div>
        </div>
        {/* Collect All button */}
        {hasCollectable && filledSlots > 1 && (
          <button
            onClick={collectAll}
            disabled={collectingAll}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, rgba(255,234,167,0.15), rgba(253,203,110,0.15))",
              color: "#FFEAA7",
              border: "1px solid rgba(255,234,167,0.2)",
            }}
          >
            {collectingAll ? "수령 중..." : `✨ 전체 수령 (+${totalPendingExp})`}
          </button>
        )}
      </div>

      {/* Animated Banner Canvas */}
      <div ref={ctrRef} className="shrink-0" style={{ height: 100 }}>
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Training slots */}
        {data?.slots.map((slot, idx) => {
          const progressPercent = Math.min(100, (slot.elapsed_mins / 480) * 100);
          const isCapped = slot.elapsed_mins >= 480;
          const gradeCol = GRADE_COLORS[slot.grade] || "#888";
          const progressAngle = (progressPercent / 100) * Math.PI * 2;

          return (
            <div key={slot.id} className="rounded-2xl overflow-hidden" style={{
              background: isCapped
                ? "linear-gradient(180deg, rgba(255,234,167,0.05) 0%, rgba(255,234,167,0.02) 100%)"
                : "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
              border: isCapped ? "1px solid rgba(255,234,167,0.15)" : "1px solid rgba(255,255,255,0.06)",
              animation: `stagger-slide-in 0.3s ease-out ${idx * 80}ms both`,
              boxShadow: isCapped ? "0 0 20px rgba(255,234,167,0.08)" : "none",
            }}>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {/* Slime icon with circular progress */}
                  <div className="relative w-14 h-14 shrink-0">
                    {/* Progress ring (SVG overlay) */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                      <circle cx="28" cy="28" r="26" fill="none"
                        stroke={isCapped ? "#FFEAA7" : "#A29BFE"}
                        strokeWidth="2" strokeLinecap="round"
                        strokeDasharray={`${progressAngle * 26} ${Math.PI * 2 * 26}`}
                        style={{ filter: isCapped ? "drop-shadow(0 0 4px rgba(255,234,167,0.4))" : "none" }}
                      />
                    </svg>
                    <div className="absolute inset-[3px] rounded-full flex items-center justify-center" style={{
                      background: `${gradeCol}10`, border: `1px solid ${gradeCol}20`,
                    }}>
                      <div dangerouslySetInnerHTML={{ __html: generateSlimeIconSvg(slot.element, 36) }} />
                    </div>
                    {isCapped && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FFEAA7] flex items-center justify-center" style={{ boxShadow: "0 0 8px rgba(255,234,167,0.5)" }}>
                        <span className="text-[9px]">{"✨"}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white text-[13px] font-bold truncate">{slot.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{
                        background: `${gradeCol}20`, color: gradeCol,
                      }}>
                        {GRADE_NAMES[slot.grade] || slot.grade}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-white/40">Lv.{slot.level}</span>
                      <span className="text-white/15">|</span>
                      <span className="text-white/40">{elementNames[slot.element] || slot.element}</span>
                      <span className="text-white/15">|</span>
                      <span className="text-white/40">{formatDuration(slot.elapsed_mins)}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" style={{
                          width: `${progressPercent}%`,
                          background: isCapped ? "linear-gradient(90deg, #FFEAA7, #FDCB6E)" : "linear-gradient(90deg, #A29BFE, #6C5CE7)",
                          boxShadow: isCapped ? "0 0 6px rgba(255,234,167,0.4)" : "none",
                        }} />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-white/20 text-[8px]">{formatDuration(slot.elapsed_mins)}</span>
                        <span className={`text-[8px] font-bold ${isCapped ? "text-[#FFEAA7]" : "text-white/25"}`}>
                          {isCapped ? "최대!" : "8시간"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* EXP badge */}
                  <div className="text-right shrink-0">
                    <div className={`text-[16px] font-bold tabular-nums ${isCapped ? "text-[#FFEAA7]" : "text-[#A29BFE]"}`} style={{
                      textShadow: isCapped ? "0 0 10px rgba(255,234,167,0.3)" : "none",
                    }}>+{slot.pending_exp}</div>
                    <div className="text-white/25 text-[9px]">EXP</div>
                  </div>
                </div>
              </div>

              {/* Collect button */}
              <button
                onClick={() => collectTraining(slot.id)}
                disabled={collecting === slot.id}
                className={`w-full py-2.5 text-[12px] font-bold transition border-t active:scale-[0.98] ${isCapped ? "animate-heartbeat" : ""}`}
                style={{
                  borderColor: isCapped ? "rgba(255,234,167,0.1)" : "rgba(255,255,255,0.06)",
                  background: isCapped ? "linear-gradient(135deg, rgba(255,234,167,0.12), rgba(253,203,110,0.08))" : "linear-gradient(135deg, rgba(162,155,254,0.08), rgba(108,92,231,0.05))",
                  color: isCapped ? "#FFEAA7" : "#A29BFE",
                }}
              >
                {collecting === slot.id ? "수령 중..." : `✨ EXP 수령 (+${slot.pending_exp})`}
              </button>
            </div>
          );
        })}

        {/* Empty slots */}
        {data && Array.from({ length: maxSlots - filledSlots }).map((_, i) => (
          <button
            key={`empty-${i}`}
            onClick={() => setShowSelect(true)}
            className="w-full rounded-2xl border-2 border-dashed border-white/[0.08] p-6 text-center hover:border-[#A29BFE]/30 hover:bg-[#A29BFE]/[0.03] transition group"
            style={{ animation: `stagger-slide-in 0.3s ease-out ${(filledSlots + i) * 80}ms both` }}
          >
            <div className="w-10 h-10 mx-auto rounded-full bg-white/[0.04] flex items-center justify-center mb-2 group-hover:bg-[#A29BFE]/10 transition">
              <span className="text-white/20 text-xl group-hover:text-[#A29BFE]/50 transition">+</span>
            </div>
            <div className="text-white/25 text-[11px] group-hover:text-white/40 transition">슬라임을 배치하세요</div>
          </button>
        ))}

        {/* Loading */}
        {!data && (
          <div className="text-center py-12 text-white/30 text-sm animate-pulse">불러오는 중...</div>
        )}

        {/* Info: EXP rate */}
        {data && (
          <div className="rounded-xl p-3 border border-white/[0.04] bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[#A29BFE] text-xs">{"💡"}</span>
              <span className="text-white/30 text-[10px]">시간당 120 EXP / 최대 8시간(960 EXP)</span>
            </div>
            {filledSlots > 0 && (
              <span className="text-[#A29BFE]/60 text-[10px] font-bold tabular-nums">
                합계 +{totalPendingExp} EXP
              </span>
            )}
          </div>
        )}
      </div>

      {/* Slime selector bottom sheet */}
      {showSelect && (
        <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col justify-end" onClick={() => setShowSelect(false)}>
          <div className="bg-[#121220] rounded-t-2xl border-t border-white/10 max-h-[70%] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <div>
                <span className="text-white font-bold text-sm">훈련할 슬라임 선택</span>
                <span className="text-white/30 text-[10px] ml-2">{availableSlimes.length}마리 가능</span>
              </div>
              <button onClick={() => setShowSelect(false)} className="text-white/40 hover:text-white/70 text-xs transition">닫기</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {availableSlimes.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="text-3xl mb-2">{"😴"}</div>
                  <div className="text-white/30 text-[12px]">배치 가능한 슬라임이 없습니다</div>
                  <div className="text-white/20 text-[10px] mt-1">탐험 중이거나 이미 훈련 중인 슬라임은 제외됩니다</div>
                </div>
              ) : (
                availableSlimes.map((s) => {
                  const sp = species.find((sp) => sp.id === s.species_id);
                  const displayName = s.name || sp?.name || "슬라임";
                  const grade = sp?.grade || "common";
                  return (
                    <button key={s.id} onClick={() => startTraining(s.id)} disabled={starting}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/8 transition text-left border-b border-white/[0.04] last:border-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GRADE_COLORS[grade] || "#888"}10` }}>
                        <div dangerouslySetInnerHTML={{ __html: generateSlimeIconSvg(s.element, 32) }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/80 text-[12px] font-bold truncate">{displayName}</span>
                          <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: `${GRADE_COLORS[grade]}20`, color: GRADE_COLORS[grade] }}>
                            {GRADE_NAMES[grade]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-white/30 text-[10px]">Lv.{s.level}</span>
                          <span className="text-white/15 text-[10px]">{"·"}</span>
                          <span className="text-white/30 text-[10px]">{elementNames[s.element] || s.element}</span>
                        </div>
                      </div>
                      <span className="text-[#A29BFE]/50 text-[10px]">{"배치 →"}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
