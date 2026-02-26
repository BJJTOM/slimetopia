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
  multiplier: number;
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

const GRADE_MULTIPLIER: Record<string, number> = {
  common: 1.0, uncommon: 1.1, rare: 1.3,
  epic: 1.6, legendary: 2.0, mythic: 2.5,
};

const GRADE_PRIORITY: Record<string, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5,
};

type SortMode = "grade" | "level" | "name";

// Milestones (minutes) with label + emoji
const MILESTONES = [
  { mins: 60, label: "1시간 돌파!", emoji: "🔥" },
  { mins: 120, label: "2시간 달성!", emoji: "💪" },
  { mins: 240, label: "4시간! 절반 완료", emoji: "⚡" },
  { mins: 480, label: "MAX! 수령하세요!", emoji: "🏆" },
];

// Exercise types for banner animation variety
type ExerciseType = "jump" | "squat" | "pushup";
const EXERCISE_CYCLE: ExerciseType[] = ["jump", "squat", "pushup", "jump", "squat"];
const EXERCISE_DURATION = 4; // seconds per exercise

function formatDuration(mins: number): string {
  if (mins < 1) return "방금 시작";
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

function addTrainingExpToStorage(exp: number) {
  if (typeof window === "undefined") return;
  const prev = parseInt(localStorage.getItem("training_total_exp") || "0", 10);
  localStorage.setItem("training_total_exp", String(prev + exp));
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
  // Background gradient — leather brown tones
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#1A0E08"); bg.addColorStop(0.5, "#2C1810"); bg.addColorStop(1, "#1A0E08");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  // Subtle parchment texture overlay
  ctx.fillStyle = "rgba(245,230,200,0.03)";
  ctx.fillRect(0, 0, w, h);

  // Floor line
  const floorY = h * 0.82;
  ctx.beginPath(); ctx.moveTo(0, floorY);
  ctx.lineTo(w, floorY);
  ctx.strokeStyle = "rgba(201,168,76,0.2)"; ctx.lineWidth = 1; ctx.stroke();

  // Floor glow
  const fg = ctx.createLinearGradient(0, floorY, 0, h);
  fg.addColorStop(0, "rgba(201,168,76,0.08)"); fg.addColorStop(1, "transparent");
  ctx.fillStyle = fg; ctx.fillRect(0, floorY, w, h - floorY);

  // === Animated Slime with exercise variety ===
  const cx = w * 0.22;
  const baseY = floorY - 18;

  // Cycle through exercises
  const exerciseIdx = Math.floor(t / EXERCISE_DURATION) % EXERCISE_CYCLE.length;
  const exercise = EXERCISE_CYCLE[exerciseIdx];
  const phaseInExercise = (t % EXERCISE_DURATION) / EXERCISE_DURATION;

  let jumpHeight = 0;
  let squash = 1;
  let stretchX = 1;
  let offsetX = 0;

  if (exercise === "jump") {
    const jumpCycle = t * 2.5;
    const jumpPhase = jumpCycle % 1;
    jumpHeight = jumpPhase < 0.4 ? Math.sin(jumpPhase / 0.4 * Math.PI) * 18 : 0;
    squash = jumpPhase > 0.4 && jumpPhase < 0.5 ? 0.85 : jumpPhase < 0.1 ? 0.9 : 1;
  } else if (exercise === "squat") {
    // Squatting motion: flatten and widen
    const sqCycle = t * 2;
    const sqPhase = sqCycle % 1;
    const sqDown = sqPhase < 0.5 ? Math.sin(sqPhase / 0.5 * Math.PI) : 0;
    squash = 1 - sqDown * 0.3;
    stretchX = 1 + sqDown * 0.2;
  } else if (exercise === "pushup") {
    // Push-up: lean forward and bob up/down
    const puCycle = t * 1.8;
    const puPhase = puCycle % 1;
    const puDown = puPhase < 0.5 ? Math.sin(puPhase / 0.5 * Math.PI) * 0.3 : 0;
    squash = 1 - puDown * 0.25;
    offsetX = 4; // lean slightly forward
    jumpHeight = -puDown * 6; // go down instead of up
  }

  const sy = baseY - jumpHeight;

  ctx.save(); ctx.translate(cx + offsetX, sy);
  ctx.scale((1 + (1 - squash) * 0.3) * stretchX, squash);

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
  slimeG.addColorStop(0, "#D4AF37"); slimeG.addColorStop(1, "#8B6914");
  ctx.fillStyle = slimeG; ctx.fill();
  ctx.strokeStyle = "rgba(201,168,76,0.5)"; ctx.lineWidth = 1; ctx.stroke();

  // Highlight
  ctx.beginPath(); ctx.ellipse(-sz * 0.3, -sz * 0.5, sz * 0.25, sz * 0.12, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fill();

  // Eyes
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.arc(s * sz * 0.3, -sz * 0.1, sz * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.beginPath(); ctx.arc(s * sz * 0.32, -sz * 0.1, sz * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = "#2C1810"; ctx.fill();
  }
  // Determined mouth
  ctx.beginPath(); ctx.moveTo(-sz * 0.15, sz * 0.2); ctx.lineTo(sz * 0.15, sz * 0.15);
  ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.stroke();

  // Headband
  ctx.beginPath();
  ctx.moveTo(-sz * 0.9, -sz * 0.55); ctx.quadraticCurveTo(0, -sz * 0.9, sz * 0.9, -sz * 0.55);
  ctx.strokeStyle = "#C9A84C"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.stroke();
  // Headband tail
  ctx.beginPath(); ctx.moveTo(sz * 0.9, -sz * 0.55);
  ctx.quadraticCurveTo(sz * 1.3, -sz * 0.4 + Math.sin(t * 5) * 3, sz * 1.5, -sz * 0.7 + Math.sin(t * 4) * 4);
  ctx.strokeStyle = "#C9A84C"; ctx.lineWidth = 2; ctx.stroke();

  ctx.restore();

  // Sweat drops from exercising
  const sweatChance = exercise === "pushup" ? 0.06 : exercise === "squat" ? 0.04 : (jumpHeight < 1 && Math.random() < 0.5 ? 0.5 : 0);
  if (Math.random() < sweatChance) {
    particles.push({
      x: cx + (Math.random() - 0.5) * 20, y: sy - 10,
      vx: (Math.random() - 0.5) * 1.5, vy: -(1 + Math.random()),
      life: 0, maxLife: 0.8 + Math.random() * 0.4, size: 2 + Math.random(), type: "sweat",
    });
  }

  // Exercise label (bottom of banner)
  const exerciseLabels: Record<ExerciseType, string> = { jump: "점프 훈련", squat: "스쿼트", pushup: "팔굽혀펴기" };
  ctx.save();
  ctx.font = "bold 9px Georgia, 'Times New Roman', serif"; ctx.textAlign = "center";
  ctx.fillStyle = `rgba(201,168,76,${0.25 + Math.sin(t * 3) * 0.05})`;
  ctx.fillText(exerciseLabels[exercise], cx, h * 0.95);
  ctx.restore();

  // === Dumbbell on floor ===
  const dbX = w * 0.48, dbY = floorY - 6;
  ctx.save(); ctx.translate(dbX, dbY);
  // Bar
  ctx.beginPath(); ctx.roundRect(-18, -2, 36, 4, 2);
  ctx.fillStyle = "rgba(201,168,76,0.2)"; ctx.fill();
  // Weights
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.roundRect(s * 15, -6, 8 * s, 12, 2);
    ctx.fillStyle = "rgba(201,168,76,0.25)"; ctx.fill();
    ctx.strokeStyle = "rgba(201,168,76,0.15)"; ctx.lineWidth = 0.5; ctx.stroke();
  }
  ctx.restore();

  // === EXP Rate indicator ===
  const rateX = w * 0.72, rateY = h * 0.35;
  ctx.save();
  ctx.font = "bold 11px Georgia, 'Times New Roman', serif"; ctx.textAlign = "center";
  ctx.fillStyle = rgba("#C9A84C", 0.5 + Math.sin(t * 2) * 0.15);
  ctx.fillText("120 EXP/h", rateX, rateY);
  // Upward arrow
  ctx.beginPath();
  ctx.moveTo(rateX, rateY - 18); ctx.lineTo(rateX - 5, rateY - 12); ctx.moveTo(rateX, rateY - 18);
  ctx.lineTo(rateX + 5, rateY - 12);
  ctx.strokeStyle = rgba("#C9A84C", 0.3 + Math.sin(t * 3) * 0.1);
  ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.stroke();
  ctx.restore();

  // === Slot count circles ===
  const circX = w * 0.72, circY = h * 0.65;
  for (let i = 0; i < 3; i++) {
    const cx2 = circX + (i - 1) * 16;
    ctx.beginPath(); ctx.arc(cx2, circY, 5, 0, Math.PI * 2);
    ctx.fillStyle = i < slotCount ? rgba("#C9A84C", 0.6) : "rgba(245,230,200,0.08)";
    ctx.fill();
    if (i < slotCount) {
      const glow = ctx.createRadialGradient(cx2, circY, 0, cx2, circY, 8);
      glow.addColorStop(0, rgba("#C9A84C", 0.2)); glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow; ctx.fillRect(cx2 - 8, circY - 8, 16, 16);
    }
  }
  ctx.font = "9px Georgia, 'Times New Roman', serif"; ctx.textAlign = "center";
  ctx.fillStyle = "rgba(245,230,200,0.3)";
  ctx.fillText(`${slotCount}/3 슬롯`, circX, circY + 14);

  // === Total EXP (right side) ===
  if (totalExp > 0) {
    const expX = w * 0.9, expY = h * 0.5;
    ctx.save();
    ctx.font = "bold 14px Georgia, 'Times New Roman', serif"; ctx.textAlign = "center";
    ctx.fillStyle = "#D4AF37"; ctx.shadowColor = "#D4AF37"; ctx.shadowBlur = 8;
    ctx.fillText(`+${totalExp}`, expX, expY);
    ctx.shadowBlur = 0;
    ctx.font = "9px Georgia, 'Times New Roman', serif"; ctx.fillStyle = "rgba(212,175,55,0.5)";
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
  const [sortMode, setSortMode] = useState<SortMode>("grade");
  const [lastCollectedSlot, setLastCollectedSlot] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [milestone, setMilestone] = useState<{ label: string; emoji: string } | null>(null);
  const [realtimeExp, setRealtimeExp] = useState<Record<string, number>>({});
  const seenMilestones = useRef<Set<string>>(new Set());

  // Real-time EXP ticker: recalculate every second based on started_at
  useEffect(() => {
    if (!data?.slots.length) return;
    const tick = () => {
      const now = Date.now();
      const expMap: Record<string, number> = {};
      for (const slot of data.slots) {
        const startedMs = new Date(slot.started_at).getTime();
        const elapsedMins = Math.min(480, Math.floor((now - startedMs) / 60000));
        const baseExp = elapsedMins * 2; // 2 EXP per minute
        expMap[slot.id] = Math.floor(baseExp * slot.multiplier);

        // Check milestones
        for (const ms of MILESTONES) {
          const key = `${slot.id}-${ms.mins}`;
          if (elapsedMins >= ms.mins && !seenMilestones.current.has(key)) {
            seenMilestones.current.add(key);
            setMilestone({ label: `${slot.name} ${ms.label}`, emoji: ms.emoji });
            setTimeout(() => setMilestone(null), 3000);
          }
        }
      }
      setRealtimeExp(expMap);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data]);

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
          ctx.fillStyle = `rgba(212,175,55,${a * 0.5})`; ctx.fill();
        } else if (p.type === "sparkle") {
          const twinkle = Math.sin(t * 8 + p.x) > 0.3 ? 1 : 0.3;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * twinkle, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(201,168,76,${a * 0.4 * twinkle})`; ctx.fill();
        } else if (p.type === "exp") {
          ctx.save();
          ctx.font = "bold 9px Georgia, 'Times New Roman', serif"; ctx.textAlign = "center";
          ctx.globalAlpha = a * 0.6;
          ctx.fillStyle = "#C9A84C"; ctx.fillText(p.text || "+1", p.x, p.y);
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

  const collectTraining = async (slotId: string, keepTraining?: boolean) => {
    if (!token) return;
    const slot = data?.slots.find(s => s.id === slotId);
    setCollecting(slotId);
    try {
      const res = await authApi<{ exp_gained: number; new_level: number; level_up: boolean }>(
        `/api/training/${slotId}/collect`, token, { method: "POST" },
      );
      let msg = `EXP +${res.exp_gained} 획득!`;
      if (res.level_up) msg += ` Lv.${res.new_level} 달성!`;
      toastReward(msg, "🏋️");
      addTrainingExpToStorage(res.exp_gained);
      await fetchTraining();
      if (token) fetchSlimes(token);

      // If keep training, immediately restart training for the same slime
      if (keepTraining && slot) {
        try {
          await authApi("/api/training/start", token, { method: "POST", body: { slime_id: slot.slime_id } });
          toastReward("훈련을 다시 시작합니다!", "🔄");
          fetchTraining();
        } catch {
          // Slot might be full now, silently ignore
        }
      }
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
      addTrainingExpToStorage(totalExp);
    }
    fetchTraining();
    if (token) fetchSlimes(token);
    setCollectingAll(false);
  };

  const trainedSlimeIds = data?.slots.map((s) => s.slime_id) || [];
  const availableSlimes = slimes.filter((s) => !trainedSlimeIds.includes(s.id));
  const filledSlots = data?.slots.length || 0;
  const maxSlots = data?.max_slots || 3;
  const totalPendingExp = data?.slots.reduce((s, sl) => s + (realtimeExp[sl.id] ?? sl.pending_exp), 0) || 0;
  const hasCollectable = (data?.slots.length || 0) > 0 && totalPendingExp > 0;

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ bottom: 76, background: "linear-gradient(180deg, #1A0E08 0%, #2C1810 50%, #1A0E08 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0 overlay-header" style={{
        background: "linear-gradient(135deg, #3D2017 0%, #4A2515 50%, #3D2017 100%)",
        borderBottom: "2px solid #C9A84C",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(201,168,76,0.15)",
      }}>
        <div className="flex items-center gap-2.5">
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition" style={{
            background: "linear-gradient(135deg, #4A2515, #3D2017)",
            border: "1px solid rgba(201,168,76,0.3)",
            color: "#C9A84C",
          }}>{"←"}</button>
          <div>
            <h2 className="font-bold text-sm" style={{ color: "#C9A84C", fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: "0.05em" }}>TRAINING GROUNDS</h2>
            <span className="text-[9px]" style={{ color: "rgba(245,230,200,0.4)" }}>{filledSlots}/{maxSlots} 사용 중</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
        {/* Guide toggle */}
        <button onClick={() => setShowGuide(!showGuide)} className="minigame-guide-toggle">
          {"📖"} 가이드
        </button>
        {/* Collect All button */}
        {hasCollectable && filledSlots > 1 && (
          <button
            onClick={collectAll}
            disabled={collectingAll}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(212,175,55,0.15))",
              color: "#D4AF37",
              border: "1px solid rgba(201,168,76,0.35)",
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
          >
            {collectingAll ? "수령 중..." : `전체 수령 (+${totalPendingExp})`}
          </button>
        )}
        </div>
      </div>

      {/* Guide panel */}
      {showGuide && (
        <div className="px-4 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
          <div className="minigame-guide-content">
            <p><strong>기본 EXP:</strong> 시간당 120 EXP (분당 2 EXP)</p>
            <p><strong>최대 시간:</strong> 8시간 (최대 960 EXP)</p>
            <p><strong>등급 보너스:</strong> 고급 x1.1 / 희귀 x1.3 / 영웅 x1.6 / 전설 x2.0 / 신화 x2.5</p>
            <p><strong>슬롯:</strong> 최대 3마리 동시 훈련 가능</p>
            <p><strong>팁:</strong> 수령 후 계속 버튼으로 바로 재훈련!</p>
          </div>
        </div>
      )}

      {/* Animated Banner Canvas */}
      <div ref={ctrRef} className="shrink-0" style={{ height: 100, borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Milestone celebration banner */}
      {milestone && (
        <div className="shrink-0 px-4 py-2.5" style={{
          background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(201,168,76,0.08))",
          borderBottom: "1px solid rgba(201,168,76,0.2)",
          animation: "codex-stagger 0.3s ease-out",
        }}>
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg">{milestone.emoji}</span>
            <span className="text-[12px] font-bold" style={{ color: "#D4AF37", fontFamily: "Georgia, 'Times New Roman', serif" }}>
              {milestone.label}
            </span>
            <span className="text-lg">{milestone.emoji}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Training slots */}
        {data?.slots.map((slot, idx) => {
          // Use real-time calculated EXP if available, otherwise fallback to API value
          const liveExp = realtimeExp[slot.id] ?? slot.pending_exp;
          // Recalculate elapsed from started_at for smoother progress
          const nowMs = Date.now();
          const elapsedFromStart = Math.min(480, Math.floor((nowMs - new Date(slot.started_at).getTime()) / 60000));
          const progressPercent = Math.min(100, (elapsedFromStart / 480) * 100);
          const isCapped = elapsedFromStart >= 480;
          const gradeCol = GRADE_COLORS[slot.grade] || "#888";
          const progressAngle = (progressPercent / 100) * Math.PI * 2;

          return (
            <div key={slot.id} className="rounded-2xl overflow-hidden" style={{
              background: isCapped
                ? "linear-gradient(180deg, #3D2017 0%, #2C1810 100%)"
                : "linear-gradient(180deg, #2C1810 0%, #1A0E08 100%)",
              border: isCapped ? "1.5px solid rgba(201,168,76,0.4)" : "1.5px solid rgba(201,168,76,0.15)",
              animation: `stagger-slide-in 0.3s ease-out ${idx * 80}ms both`,
              boxShadow: isCapped
                ? "0 0 20px rgba(201,168,76,0.1), inset 0 1px 0 rgba(245,230,200,0.05)"
                : "inset 0 1px 0 rgba(245,230,200,0.03)",
            }}>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {/* Slime icon with circular progress */}
                  <div className="relative w-14 h-14 shrink-0">
                    {/* Progress ring (SVG overlay) */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="26" fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth="2" />
                      <circle cx="28" cy="28" r="26" fill="none"
                        stroke={isCapped ? "#D4AF37" : "#C9A84C"}
                        strokeWidth="2" strokeLinecap="round"
                        strokeDasharray={`${progressAngle * 26} ${Math.PI * 2 * 26}`}
                        style={{ filter: isCapped ? "drop-shadow(0 0 4px rgba(212,175,55,0.5))" : "none" }}
                      />
                    </svg>
                    <div className="absolute inset-[3px] rounded-full flex items-center justify-center" style={{
                      background: "rgba(245,230,200,0.06)", border: "1px solid rgba(201,168,76,0.15)",
                    }}>
                      <img src={generateSlimeIconSvg(slot.element, 36, undefined, undefined, slot.species_id)} alt="" className="w-9 h-9" />
                    </div>
                    {isCapped && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{
                        background: "linear-gradient(135deg, #D4AF37, #C9A84C)",
                        boxShadow: "0 0 8px rgba(212,175,55,0.5)",
                      }}>
                        <span className="text-[9px]">{"✨"}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-bold truncate" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>{slot.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{
                        background: `${gradeCol}20`, color: gradeCol,
                      }}>
                        {GRADE_NAMES[slot.grade] || slot.grade}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span style={{ color: "rgba(245,230,200,0.45)" }}>Lv.{slot.level}</span>
                      <span style={{ color: "rgba(201,168,76,0.2)" }}>|</span>
                      <span style={{ color: "rgba(245,230,200,0.45)" }}>{elementNames[slot.element] || slot.element}</span>
                      <span style={{ color: "rgba(201,168,76,0.2)" }}>|</span>
                      <span style={{ color: "rgba(245,230,200,0.45)" }}>{formatDuration(elapsedFromStart)}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(201,168,76,0.1)" }}>
                        <div className="h-full rounded-full transition-all duration-1000" style={{
                          width: `${progressPercent}%`,
                          background: isCapped
                            ? "linear-gradient(90deg, #D4AF37, #C9A84C)"
                            : "linear-gradient(90deg, #8B6914, #C9A84C)",
                          boxShadow: isCapped ? "0 0 6px rgba(212,175,55,0.5)" : "none",
                        }} />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[8px]" style={{ color: "rgba(245,230,200,0.25)" }}>{formatDuration(elapsedFromStart)}</span>
                        <span className={`text-[8px] font-bold`} style={{ color: isCapped ? "#D4AF37" : "rgba(245,230,200,0.3)" }}>
                          {isCapped ? "최대!" : "8시간"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* EXP badge */}
                  <div className="text-right shrink-0">
                    <div className="text-[16px] font-bold tabular-nums" style={{
                      color: isCapped ? "#D4AF37" : "#C9A84C",
                      textShadow: isCapped ? "0 0 10px rgba(212,175,55,0.3)" : "none",
                      fontFamily: "Georgia, 'Times New Roman', serif",
                    }}>+{liveExp}</div>
                    <div className="text-[9px]" style={{ color: "rgba(245,230,200,0.3)" }}>EXP</div>
                    {slot.multiplier > 1 && (
                      <div className="text-[8px] font-bold mt-0.5 px-1 rounded" style={{
                        color: "#D4AF37",
                        background: "rgba(201,168,76,0.12)",
                        border: "1px solid rgba(201,168,76,0.2)",
                      }}>x{slot.multiplier.toFixed(1)}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex border-t" style={{ borderColor: isCapped ? "rgba(201,168,76,0.2)" : "rgba(201,168,76,0.1)" }}>
                <button
                  onClick={() => collectTraining(slot.id)}
                  disabled={collecting === slot.id}
                  className={`flex-1 py-2.5 text-[12px] font-bold transition active:scale-[0.98] ${isCapped ? "animate-heartbeat" : ""}`}
                  style={{
                    background: isCapped
                      ? "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(201,168,76,0.1))"
                      : "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(139,105,20,0.05))",
                    color: isCapped ? "#D4AF37" : "#C9A84C",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                  }}
                >
                  {collecting === slot.id ? "수령 중..." : `EXP 수령 (+${liveExp})`}
                </button>
                <button
                  onClick={() => collectTraining(slot.id, true)}
                  disabled={collecting === slot.id}
                  className="px-3 py-2.5 text-[10px] font-bold transition active:scale-[0.98] border-l"
                  style={{
                    borderColor: isCapped ? "rgba(201,168,76,0.2)" : "rgba(201,168,76,0.1)",
                    background: "rgba(245,230,200,0.05)",
                    color: "#E8D5B0",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                  }}
                  title="수령 후 바로 다시 훈련 시작"
                >
                  {"🔄 계속"}
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty slots */}
        {data && Array.from({ length: maxSlots - filledSlots }).map((_, i) => (
          <button
            key={`empty-${i}`}
            onClick={() => setShowSelect(true)}
            className="w-full rounded-2xl border-2 border-dashed p-6 text-center transition group"
            style={{
              borderColor: "rgba(201,168,76,0.15)",
              background: "rgba(44,24,16,0.5)",
              animation: `stagger-slide-in 0.3s ease-out ${(filledSlots + i) * 80}ms both`,
            }}
          >
            <div className="w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 transition" style={{
              background: "rgba(201,168,76,0.06)",
              border: "1px solid rgba(201,168,76,0.1)",
            }}>
              <span className="text-xl transition" style={{ color: "rgba(201,168,76,0.3)" }}>+</span>
            </div>
            <div className="text-[11px] transition" style={{ color: "rgba(245,230,200,0.3)", fontFamily: "Georgia, 'Times New Roman', serif" }}>슬라임을 배치하세요</div>
          </button>
        ))}

        {/* Loading */}
        {!data && (
          <div className="text-center py-12 text-sm animate-pulse" style={{ color: "rgba(245,230,200,0.35)", fontFamily: "Georgia, 'Times New Roman', serif" }}>불러오는 중...</div>
        )}

        {/* Info: EXP rate & grade bonuses */}
        {data && (
          <div className="space-y-2">
            {/* Gold gradient divider */}
            <div className="h-px mx-4 my-1" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)" }} />

            <div className="rounded-xl p-3 flex items-center justify-between" style={{
              background: "rgba(44,24,16,0.6)",
              border: "1px solid rgba(201,168,76,0.12)",
            }}>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "#C9A84C" }}>{"💡"}</span>
                <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.4)" }}>기본 시간당 120 EXP / 최대 8시간</span>
              </div>
              {filledSlots > 0 && (
                <span className="text-[10px] font-bold tabular-nums" style={{ color: "rgba(201,168,76,0.6)", fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  합계 +{totalPendingExp} EXP
                </span>
              )}
            </div>
            {/* Grade bonus info */}
            <div className="rounded-xl p-3" style={{
              background: "rgba(44,24,16,0.6)",
              border: "1px solid rgba(201,168,76,0.12)",
            }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs" style={{ color: "#D4AF37" }}>{"⭐"}</span>
                <span className="text-[10px] font-bold" style={{ color: "rgba(245,230,200,0.5)", fontFamily: "Georgia, 'Times New Roman', serif" }}>등급별 훈련 보너스</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(GRADE_MULTIPLIER).filter(([,v]) => v > 1).map(([grade, mult]) => (
                  <div key={grade} className="flex items-center gap-1 px-1.5 py-1 rounded-lg" style={{
                    background: "rgba(201,168,76,0.06)",
                    border: "1px solid rgba(201,168,76,0.08)",
                  }}>
                    <span className="text-[9px] font-bold" style={{ color: GRADE_COLORS[grade] }}>{GRADE_NAMES[grade]}</span>
                    <span className="text-[9px]" style={{ color: "rgba(245,230,200,0.35)" }}>x{mult.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slime selector bottom sheet */}
      {showSelect && (
        <div className="absolute inset-0 z-10 backdrop-blur-sm flex flex-col justify-end" style={{ background: "rgba(26,14,8,0.7)" }} onClick={() => setShowSelect(false)}>
          <div className="rounded-t-2xl max-h-[70%] flex flex-col" style={{
            background: "linear-gradient(180deg, #2C1810 0%, #1A0E08 100%)",
            borderTop: "2px solid #C9A84C",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.5)",
          }} onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-bold text-sm" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>훈련할 슬라임 선택</span>
                  <span className="text-[10px] ml-2" style={{ color: "rgba(201,168,76,0.5)" }}>{availableSlimes.length}마리 가능</span>
                </div>
                <button onClick={() => setShowSelect(false)} className="text-xs transition" style={{ color: "rgba(245,230,200,0.4)" }}>닫기</button>
              </div>
              {/* Sort buttons */}
              <div className="flex gap-2">
                {([["grade", "등급순"], ["level", "레벨순"], ["name", "이름순"]] as [SortMode, string][]).map(([mode, label]) => (
                  <button key={mode} onClick={() => setSortMode(mode)}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold transition"
                    style={{
                      background: sortMode === mode ? "rgba(201,168,76,0.15)" : "rgba(245,230,200,0.05)",
                      color: sortMode === mode ? "#C9A84C" : "rgba(245,230,200,0.4)",
                      border: sortMode === mode ? "1px solid rgba(201,168,76,0.3)" : "1px solid transparent",
                      fontFamily: "Georgia, 'Times New Roman', serif",
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {availableSlimes.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="text-3xl mb-2">{"😴"}</div>
                  <div className="text-[12px]" style={{ color: "rgba(245,230,200,0.35)" }}>배치 가능한 슬라임이 없습니다</div>
                  <div className="text-[10px] mt-1" style={{ color: "rgba(245,230,200,0.2)" }}>탐험 중이거나 이미 훈련 중인 슬라임은 제외됩니다</div>
                </div>
              ) : (
                [...availableSlimes].sort((a, b) => {
                  const spA = species.find(sp => sp.id === a.species_id);
                  const spB = species.find(sp => sp.id === b.species_id);
                  if (sortMode === "grade") {
                    return (GRADE_PRIORITY[spB?.grade || "common"] || 0) - (GRADE_PRIORITY[spA?.grade || "common"] || 0);
                  } else if (sortMode === "level") {
                    return (b.level || 0) - (a.level || 0);
                  } else {
                    const nameA = a.name || spA?.name || "";
                    const nameB = b.name || spB?.name || "";
                    return nameA.localeCompare(nameB, "ko");
                  }
                }).map((s) => {
                  const sp = species.find((sp) => sp.id === s.species_id);
                  const displayName = s.name || sp?.name || "슬라임";
                  const grade = sp?.grade || "common";
                  const mult = GRADE_MULTIPLIER[grade] || 1;
                  return (
                    <button key={s.id} onClick={() => startTraining(s.id)} disabled={starting}
                      className="w-full px-4 py-3 flex items-center gap-3 transition text-left border-b last:border-0"
                      style={{ borderColor: "rgba(201,168,76,0.08)" }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                        background: "rgba(245,230,200,0.06)",
                        border: "1px solid rgba(201,168,76,0.1)",
                      }}>
                        <img src={generateSlimeIconSvg(s.element, 32, undefined, undefined, s.species_id)} alt="" className="w-8 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-bold truncate" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>{displayName}</span>
                          <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: `${GRADE_COLORS[grade]}20`, color: GRADE_COLORS[grade] }}>
                            {GRADE_NAMES[grade]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.35)" }}>Lv.{s.level}</span>
                          <span className="text-[10px]" style={{ color: "rgba(201,168,76,0.2)" }}>{"·"}</span>
                          <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.35)" }}>{elementNames[s.element] || s.element}</span>
                          {mult > 1 && (
                            <>
                              <span className="text-[10px]" style={{ color: "rgba(201,168,76,0.2)" }}>{"·"}</span>
                              <span className="text-[10px] font-bold" style={{ color: "#C9A84C" }}>x{mult.toFixed(1)} EXP</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px]" style={{ color: "rgba(201,168,76,0.45)", fontFamily: "Georgia, 'Times New Roman', serif" }}>{"배치 →"}</span>
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
