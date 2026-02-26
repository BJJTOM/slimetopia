"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore } from "@/lib/store/gameStore";
import { authApi } from "@/lib/api/client";
import { toastReward, toastError } from "@/components/ui/Toast";
import { elementNames } from "@/lib/constants";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";

// ===== Types =====

interface BossData {
  id: number;
  name: string;
  element: string;
  max_hp: number;
  current_hp: number;
  reward_gold: number;
  reward_gems: number;
  expires_at: string;
  defeated: boolean;
}

interface Attacker {
  nickname: string;
  damage: number;
}

interface BossState {
  boss: BossData;
  my_attacks: number;
  max_attacks: number;
  my_damage: number;
  top_attackers: Attacker[];
}

interface AttackAnim {
  phase: "charge" | "rush" | "impact" | "settle";
  time: number;
  damage: number;
  element: string;
  critical: boolean;
}

interface DmgFloat {
  x: number;
  y: number;
  vy: number;
  damage: number;
  alpha: number;
  critical: boolean;
}

interface BossParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: "ambient" | "impact" | "steam";
}

// ===== Constants =====

const ELEM_COL: Record<string, string> = {
  fire: "#FF6B6B", water: "#74B9FF", grass: "#55EFC4", earth: "#DFE6E9",
  electric: "#FFEAA7", ice: "#81ECEC", wind: "#A29BFE", poison: "#6C5CE7",
  light: "#FFF3BF", dark: "#636E72", celestial: "#FF9FF3",
};

const ELEM_DARK: Record<string, string> = {
  fire: "#E17055", water: "#0984E3", grass: "#00B894", earth: "#B2BEC3",
  electric: "#FDCB6E", ice: "#00CEC9", wind: "#6C5CE7", poison: "#5E35B1",
  light: "#FDD835", dark: "#2D3436", celestial: "#E84393",
};

const STRONG: Record<string, string[]> = {
  fire: ["grass", "ice"], water: ["fire", "earth"], grass: ["water", "electric"],
  electric: ["water", "wind"], ice: ["grass", "wind"], earth: ["fire", "electric", "poison"],
  wind: ["grass", "earth"], poison: ["grass", "water"], light: ["dark"],
  dark: ["light"], celestial: ["dark", "poison"],
};

const IMPACT_COLORS: Record<string, string[]> = {
  fire: ["#FF6B6B", "#FF9F43", "#FFEAA7"], water: ["#74B9FF", "#0984E3", "#81ECEC"],
  grass: ["#55EFC4", "#00B894", "#BADC58"], electric: ["#FFEAA7", "#FDCB6E", "#FFF"],
  ice: ["#81ECEC", "#00CEC9", "#DFE6E9"], earth: ["#DFE6E9", "#B2BEC3", "#636E72"],
  wind: ["#A29BFE", "#C8B6FF", "#DFE6E9"], poison: ["#6C5CE7", "#A29BFE", "#81ECEC"],
  light: ["#FFF3BF", "#FFEAA7", "#FFF"], dark: ["#636E72", "#2D3436", "#A29BFE"],
  celestial: ["#FF9FF3", "#E84393", "#FFF"],
};

// ===== Helpers =====

function isStrong(atk: string, def: string) { return STRONG[atk]?.includes(def) ?? false; }
function isWeak(atk: string, def: string) { return STRONG[def]?.includes(atk) ?? false; }
function getPhase(hp: number): "normal" | "enraged" | "critical" {
  if (hp <= 20) return "critical";
  if (hp <= 50) return "enraged";
  return "normal";
}
function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function easeIn(t: number) { return t * t * t; }
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function rgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function fmtCountdown(exp: string) {
  const d = new Date(exp).getTime() - Date.now();
  if (d <= 0) return "만료됨";
  return `${Math.floor(d / 3600000)}시간 ${Math.floor((d % 3600000) / 60000)}분`;
}

// ===== Canvas Drawing =====

function drawBoss(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number,
  elem: string, breath: number, phase: "normal" | "enraged" | "critical",
  t: number, shake: { x: number; y: number },
) {
  const col = ELEM_COL[elem] || "#A29BFE";
  const dark = ELEM_DARK[elem] || "#6C5CE7";
  ctx.save();
  ctx.translate(cx + shake.x, cy + shake.y);

  // Breathing
  const bAmp = phase === "critical" ? 0.06 : phase === "enraged" ? 0.04 : 0.025;
  const bSpd = phase === "critical" ? 6 : phase === "enraged" ? 4 : 2;
  ctx.scale(1 + Math.sin(breath * bSpd + 0.5) * bAmp * 0.3, 1 + Math.sin(breath * bSpd) * bAmp);

  // Aura
  const aAlpha = phase === "critical" ? 0.4 : phase === "enraged" ? 0.25 : 0.15;
  const aR = sz * (1.3 + Math.sin(t * 2) * 0.1);
  const ag = ctx.createRadialGradient(0, 0, sz * 0.3, 0, 0, aR);
  ag.addColorStop(0, rgba(col, aAlpha));
  ag.addColorStop(1, rgba(col, 0));
  ctx.beginPath(); ctx.arc(0, 0, aR, 0, Math.PI * 2); ctx.fillStyle = ag; ctx.fill();

  // Shadow
  ctx.beginPath(); ctx.ellipse(0, sz * 0.42, sz * 0.55, sz * 0.07, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fill();

  // Body
  ctx.beginPath();
  ctx.moveTo(-sz * 0.5, sz * 0.38);
  ctx.bezierCurveTo(-sz * 0.55, sz * 0.1, -sz * 0.45, -sz * 0.35, -sz * 0.2, -sz * 0.48);
  ctx.bezierCurveTo(-sz * 0.05, -sz * 0.55, sz * 0.05, -sz * 0.55, sz * 0.2, -sz * 0.48);
  ctx.bezierCurveTo(sz * 0.45, -sz * 0.35, sz * 0.55, sz * 0.1, sz * 0.5, sz * 0.38);
  ctx.bezierCurveTo(sz * 0.35, sz * 0.5, -sz * 0.35, sz * 0.5, -sz * 0.5, sz * 0.38);
  ctx.closePath();
  const bg = ctx.createLinearGradient(0, -sz * 0.5, 0, sz * 0.4);
  bg.addColorStop(0, col); bg.addColorStop(1, dark);
  ctx.fillStyle = bg; ctx.fill();

  // Phase overlay
  if (phase === "enraged") { ctx.fillStyle = `rgba(255,60,60,${0.1 + Math.sin(t * 5) * 0.05})`; ctx.fill(); }
  else if (phase === "critical") { ctx.fillStyle = `rgba(255,30,30,${0.2 + Math.sin(t * 8) * 0.1})`; ctx.fill(); }

  ctx.strokeStyle = rgba(col, 0.3); ctx.lineWidth = 2; ctx.stroke();

  // Highlight
  ctx.beginPath(); ctx.ellipse(-sz * 0.15, -sz * 0.28, sz * 0.13, sz * 0.07, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fill();

  // Crown horns
  const hCol = phase === "critical" ? "#FF3333" : phase === "enraged" ? "#FF6B6B" : col;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * sz * 0.15, -sz * 0.48); ctx.lineTo(s * sz * 0.25, -sz * 0.72); ctx.lineTo(s * sz * 0.08, -sz * 0.52);
    ctx.fillStyle = hCol; ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-sz * 0.05, -sz * 0.52); ctx.lineTo(0, -sz * 0.78); ctx.lineTo(sz * 0.05, -sz * 0.52);
  ctx.fillStyle = hCol; ctx.fill();

  // Horn glow tips
  for (const s of [-1, 0, 1]) {
    const tipX = s === 0 ? 0 : s * sz * 0.25;
    const tipY = s === 0 ? -sz * 0.78 : -sz * 0.72;
    const tg = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, sz * 0.08);
    tg.addColorStop(0, rgba(hCol, 0.6)); tg.addColorStop(1, rgba(hCol, 0));
    ctx.beginPath(); ctx.arc(tipX, tipY, sz * 0.08, 0, Math.PI * 2); ctx.fillStyle = tg; ctx.fill();
  }

  // Eyes
  const eY = -sz * 0.08, eSp = sz * 0.16, eSz = sz * 0.07;
  for (const s of [-1, 1]) {
    const ex = s * eSp;
    ctx.beginPath(); ctx.ellipse(ex, eY, eSz, eSz * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s * eSz * 0.15, eY, eSz * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = phase === "critical" ? "#FF1111" : "#2D3436"; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s * eSz * 0.05, eY - eSz * 0.2, eSz * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fill();
    if (phase !== "normal") {
      ctx.beginPath(); ctx.moveTo(ex - eSz * 1.2, eY - eSz * 1.5);
      ctx.lineTo(ex + s * eSz * 0.8, eY - eSz * (phase === "critical" ? 0.6 : 0.8));
      ctx.strokeStyle = phase === "critical" ? "#FF1111" : "#FF6B6B";
      ctx.lineWidth = sz * 0.03; ctx.lineCap = "round"; ctx.stroke();
    }
  }

  // Mouth
  if (phase === "critical") {
    ctx.beginPath(); ctx.ellipse(0, sz * 0.12, sz * 0.12, sz * 0.08, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#2D3436"; ctx.fill();
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * sz * 0.06, sz * 0.06);
      ctx.lineTo(s * sz * 0.04, sz * 0.16); ctx.lineTo(s * sz * 0.02, sz * 0.06);
      ctx.fillStyle = "#fff"; ctx.fill();
    }
  } else if (phase === "enraged") {
    ctx.beginPath(); ctx.arc(0, sz * 0.12, sz * 0.08, 0, Math.PI);
    ctx.strokeStyle = "#2D3436"; ctx.lineWidth = sz * 0.025; ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, sz * 0.1, sz * 0.06, 0.1, Math.PI - 0.1);
    ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = sz * 0.02; ctx.stroke();
  }

  // Cracks for critical
  if (phase === "critical") {
    ctx.strokeStyle = "rgba(255,50,50,0.6)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-sz * 0.1, -sz * 0.3); ctx.lineTo(-sz * 0.2, -sz * 0.1); ctx.lineTo(-sz * 0.15, sz * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz * 0.15, -sz * 0.2); ctx.lineTo(sz * 0.25, sz * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz * 0.05, -sz * 0.35); ctx.lineTo(sz * 0.12, -sz * 0.15); ctx.lineTo(sz * 0.18, sz * 0.02); ctx.stroke();
  }

  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, elem: string,
) {
  const col = ELEM_COL[elem] || "#A29BFE";
  const dark = ELEM_DARK[elem] || "#6C5CE7";
  ctx.save(); ctx.translate(x, y);

  // Glow
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, sz * 1.2);
  g.addColorStop(0, rgba(col, 0.3)); g.addColorStop(1, rgba(col, 0));
  ctx.beginPath(); ctx.arc(0, 0, sz * 1.2, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();

  // Shadow
  ctx.beginPath(); ctx.ellipse(0, sz * 0.35, sz * 0.4, sz * 0.06, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill();

  // Body
  ctx.beginPath();
  ctx.moveTo(-sz * 0.4, sz * 0.3);
  ctx.bezierCurveTo(-sz * 0.45, 0, -sz * 0.35, -sz * 0.35, 0, -sz * 0.4);
  ctx.bezierCurveTo(sz * 0.35, -sz * 0.35, sz * 0.45, 0, sz * 0.4, sz * 0.3);
  ctx.bezierCurveTo(sz * 0.25, sz * 0.4, -sz * 0.25, sz * 0.4, -sz * 0.4, sz * 0.3);
  ctx.closePath();
  const bg = ctx.createLinearGradient(0, -sz * 0.4, 0, sz * 0.3);
  bg.addColorStop(0, col); bg.addColorStop(1, dark);
  ctx.fillStyle = bg; ctx.fill();

  // Highlight
  ctx.beginPath(); ctx.ellipse(-sz * 0.1, -sz * 0.2, sz * 0.1, sz * 0.05, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fill();

  // Eyes
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.arc(s * sz * 0.1, -sz * 0.05, sz * 0.04, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.beginPath(); ctx.arc(s * sz * 0.11, -sz * 0.05, sz * 0.025, 0, Math.PI * 2);
    ctx.fillStyle = "#2D3436"; ctx.fill();
  }

  // Determined expression
  ctx.beginPath(); ctx.moveTo(-sz * 0.05, sz * 0.08); ctx.lineTo(sz * 0.05, sz * 0.06);
  ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.stroke();

  ctx.restore();
}

// ===== Component =====

export default function WorldBossPage({ onClose }: { onClose: () => void }) {
  const token = useAuthStore((s) => s.accessToken);
  const slimes = useGameStore((s) => s.slimes);
  const [bossState, setBossState] = useState<BossState | null>(null);
  const [selectedSlime, setSelectedSlime] = useState<string | null>(null);
  const [attacking, setAttacking] = useState(false);
  const [showSelect, setShowSelect] = useState(false);
  const [countdown, setCountdown] = useState("");

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrRef = useRef<HTMLDivElement>(null);
  const animRef = useRef(0);
  const tRef = useRef(0);
  const lastRef = useRef(0);
  const atkRef = useRef<AttackAnim | null>(null);
  const shakeRef = useRef({ x: 0, y: 0 });
  const floatsRef = useRef<DmgFloat[]>([]);
  const partsRef = useRef<BossParticle[]>([]);
  const bossRef = useRef<BossData | null>(null);
  const flashRef = useRef(0);

  const fetchBoss = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authApi<BossState>("/api/boss", token);
      setBossState(res);
      bossRef.current = res.boss;
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { fetchBoss(); }, [fetchBoss]);

  // Countdown
  useEffect(() => {
    if (!bossState?.boss.expires_at) return;
    const up = () => setCountdown(fmtCountdown(bossState.boss.expires_at));
    up();
    const iv = setInterval(up, 60000);
    return () => clearInterval(iv);
  }, [bossState?.boss.expires_at]);

  // Canvas loop
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
      lastRef.current = ts;
      tRef.current += dt;
      const t = tRef.current;
      const w = canvas.width / dpr, h = canvas.height / dpr;

      ctx.save(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);

      const boss = bossRef.current;
      if (!boss) { ctx.restore(); animRef.current = requestAnimationFrame(draw); return; }

      const hpPct = Math.max(0, (boss.current_hp / boss.max_hp) * 100);
      const phase = getPhase(hpPct);
      const col = ELEM_COL[boss.element] || "#A29BFE";

      // --- Background ---
      const bgG = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, w * 0.8);
      bgG.addColorStop(0, rgba(col, phase === "critical" ? 0.15 : phase === "enraged" ? 0.1 : 0.06));
      bgG.addColorStop(0.5, "rgba(10,10,26,0.95)"); bgG.addColorStop(1, "#0a0a1a");
      ctx.fillStyle = bgG; ctx.fillRect(0, 0, w, h);

      // Arena floor
      ctx.beginPath(); ctx.moveTo(0, h * 0.85);
      ctx.quadraticCurveTo(w / 2, h * 0.82, w, h * 0.85);
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      const flG = ctx.createLinearGradient(0, h * 0.82, 0, h);
      flG.addColorStop(0, rgba(col, 0.08)); flG.addColorStop(1, "rgba(10,10,26,0)");
      ctx.fillStyle = flG; ctx.fill();

      // Floor glow
      ctx.beginPath(); ctx.moveTo(0, h * 0.85);
      ctx.quadraticCurveTo(w / 2, h * 0.82, w, h * 0.85);
      ctx.strokeStyle = rgba(col, 0.15 + Math.sin(t * 2) * 0.05); ctx.lineWidth = 1.5; ctx.stroke();

      // Arena circle on floor
      ctx.save(); ctx.translate(w / 2, h * 0.85);
      ctx.scale(1, 0.25);
      ctx.beginPath(); ctx.arc(0, 0, w * 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(col, 0.1 + Math.sin(t * 1.5) * 0.03); ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();

      // Ambient particles
      if (Math.random() < (phase === "critical" ? 0.3 : phase === "enraged" ? 0.15 : 0.06)) {
        partsRef.current.push({
          x: Math.random() * w, y: h + 5,
          vx: (Math.random() - 0.5) * 0.5, vy: -(0.3 + Math.random() * 0.5),
          life: 0, maxLife: 3 + Math.random() * 3, size: 2 + Math.random() * 3,
          color: col, type: "ambient",
        });
      }

      // Update & draw particles
      partsRef.current = partsRef.current.filter((p) => {
        p.life += dt; if (p.life >= p.maxLife) return false;
        p.x += p.vx * dt * 60; p.y += p.vy * dt * 60;
        if (p.type === "steam") p.vy -= 0.02 * dt * 60;
        if (p.type === "impact") { p.vx *= 0.97; p.vy += 0.03 * dt * 60; }
        const lr = p.life / p.maxLife;
        const a = lr < 0.1 ? lr * 10 : lr > 0.7 ? (1 - lr) / 0.3 : 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - lr * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = rgba(p.color, a * 0.6); ctx.fill();
        return true;
      });

      // Steam for enraged/critical
      if (phase !== "normal" && Math.random() < (phase === "critical" ? 0.4 : 0.15)) {
        partsRef.current.push({
          x: w / 2 + (Math.random() - 0.5) * 40, y: h * 0.45 - 40,
          vx: (Math.random() - 0.5) * 0.5, vy: -(0.5 + Math.random() * 0.8),
          life: 0, maxLife: 1 + Math.random(), size: 3 + Math.random() * 3,
          color: phase === "critical" ? "#FF3333" : "#FF8888", type: "steam",
        });
      }

      // --- Boss ---
      const bCx = w / 2, bCy = h * 0.45, bSz = Math.min(w * 0.2, 65);

      // Phase shake
      if (phase === "critical") {
        shakeRef.current.x = (Math.random() - 0.5) * 3; shakeRef.current.y = (Math.random() - 0.5) * 2;
      } else if (phase === "enraged") {
        shakeRef.current.x = (Math.random() - 0.5) * 1; shakeRef.current.y = (Math.random() - 0.5) * 0.5;
      } else {
        shakeRef.current.x *= 0.9; shakeRef.current.y *= 0.9;
      }

      // --- Attack Animation ---
      const anim = atkRef.current;
      let bExX = 0, bExY = 0;
      if (anim) {
        anim.time += dt;
        const pSz = bSz * 0.5;
        const sX = w * 0.15, sY = h * 0.75;
        const tX = bCx - bSz * 0.3, tY = bCy + bSz * 0.1;

        if (anim.phase === "charge") {
          if (anim.time > 0.3) { anim.phase = "rush"; anim.time = 0; }
          else {
            drawPlayer(ctx, sX, sY, pSz, anim.element);
            const ga = anim.time / 0.3;
            const cg = ctx.createRadialGradient(sX, sY, 0, sX, sY, pSz * 2);
            cg.addColorStop(0, rgba(ELEM_COL[anim.element] || "#fff", ga * 0.4));
            cg.addColorStop(1, "transparent");
            ctx.fillStyle = cg; ctx.fillRect(0, 0, w, h);
          }
        } else if (anim.phase === "rush") {
          if (anim.time > 0.25) { anim.phase = "impact"; anim.time = 0; }
          else {
            const p = easeIn(anim.time / 0.25);
            const px = lerp(sX, tX, p), py = lerp(sY, tY, p);
            drawPlayer(ctx, px, py, pSz, anim.element);
            // Motion trail
            for (let i = 1; i <= 4; i++) {
              const tp = Math.max(0, p - i * 0.08);
              const tx = lerp(sX, tX, tp), ty = lerp(sY, tY, tp);
              ctx.beginPath(); ctx.arc(tx, ty, pSz * 0.3 * (1 - i * 0.2), 0, Math.PI * 2);
              ctx.fillStyle = rgba(ELEM_COL[anim.element] || "#fff", 0.2 * (1 - i * 0.2)); ctx.fill();
            }
          }
        } else if (anim.phase === "impact") {
          if (anim.time > 0.5) { anim.phase = "settle"; anim.time = 0; }
          else {
            if (anim.time < 0.1) flashRef.current = (1 - anim.time / 0.1) * 0.4;
            // Shockwave
            const rp = easeOut(anim.time / 0.5);
            const rR = rp * bSz * 2, rA = 1 - rp;
            ctx.beginPath(); ctx.arc(bCx, bCy, rR, 0, Math.PI * 2);
            ctx.strokeStyle = rgba(ELEM_COL[anim.element] || "#fff", rA * 0.6);
            ctx.lineWidth = 3 * (1 - rp); ctx.stroke();
            // Second ring
            const rp2 = easeOut(Math.max(0, anim.time - 0.05) / 0.5);
            if (rp2 > 0) {
              ctx.beginPath(); ctx.arc(bCx, bCy, rp2 * bSz * 1.5, 0, Math.PI * 2);
              ctx.strokeStyle = rgba(ELEM_COL[anim.element] || "#fff", (1 - rp2) * 0.3);
              ctx.lineWidth = 2 * (1 - rp2); ctx.stroke();
            }
            // Impact particles
            if (anim.time < 0.08) {
              const cols = IMPACT_COLORS[anim.element] || ["#A29BFE", "#C8B6FF", "#DFE6E9"];
              for (let i = 0; i < 15; i++) {
                const ang = (Math.PI * 2 * i) / 15 + Math.random() * 0.3;
                const spd = 2 + Math.random() * 5;
                partsRef.current.push({
                  x: bCx, y: bCy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                  life: 0, maxLife: 0.4 + Math.random() * 0.4,
                  size: 2 + Math.random() * 4,
                  color: anim.critical ? "#FFEAA7" : cols[Math.floor(Math.random() * cols.length)],
                  type: "impact",
                });
              }
            }
            // Boss knockback
            bExX = Math.sin(anim.time * 30) * (1 - anim.time / 0.5) * 8;
            bExY = Math.sin(anim.time * 25) * (1 - anim.time / 0.5) * 4;
          }
        } else if (anim.phase === "settle") {
          if (anim.time > 0.5) atkRef.current = null;
        }
      }

      // Draw boss
      drawBoss(ctx, bCx, bCy, bSz, boss.element, t, phase, t,
        { x: shakeRef.current.x + bExX, y: shakeRef.current.y + bExY });

      // Defeated text
      if (boss.defeated) {
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.1;
        ctx.font = `bold ${Math.min(w * 0.08, 32)}px sans-serif`;
        ctx.textAlign = "center"; ctx.fillStyle = "#55EFC4";
        ctx.shadowColor = "#55EFC4"; ctx.shadowBlur = 20;
        ctx.fillText("DEFEATED!", w / 2, h * 0.2);
        ctx.restore();
      }

      // Phase badge
      if (!boss.defeated) {
        const pl = phase === "critical" ? "위험!" : phase === "enraged" ? "분노" : "";
        if (pl) {
          ctx.save(); ctx.font = "bold 10px sans-serif";
          const bw = ctx.measureText(pl).width + 16;
          const bx = w - bw - 8, by = 8;
          ctx.beginPath(); ctx.roundRect(bx, by, bw, 20, 10);
          ctx.fillStyle = phase === "critical" ? "rgba(255,50,50,0.3)" : "rgba(255,107,107,0.2)";
          ctx.fill();
          ctx.fillStyle = phase === "critical" ? "#FF3333" : "#FF6B6B";
          ctx.textAlign = "center"; ctx.fillText(pl, bx + bw / 2, by + 14);
          ctx.restore();
        }
      }

      // Element badge top-left
      ctx.save(); ctx.font = "bold 9px sans-serif";
      const eName = elementNames[boss.element] || boss.element;
      const ew = ctx.measureText(eName).width + 14;
      ctx.beginPath(); ctx.roundRect(8, 8, ew, 18, 9);
      ctx.fillStyle = rgba(col, 0.2); ctx.fill();
      ctx.fillStyle = col; ctx.textAlign = "center";
      ctx.fillText(eName, 8 + ew / 2, 20);
      ctx.restore();

      // Damage floats
      floatsRef.current = floatsRef.current.filter((d) => {
        d.y += d.vy * dt * 60; d.vy -= 0.02 * dt * 60; d.alpha -= 0.012 * dt * 60;
        if (d.alpha <= 0) return false;
        ctx.save();
        ctx.font = `bold ${d.critical ? 24 : 18}px sans-serif`;
        ctx.textAlign = "center"; ctx.globalAlpha = d.alpha;
        ctx.fillStyle = d.critical ? "#FFEAA7" : "#FF6B6B";
        ctx.shadowColor = d.critical ? "#FFEAA7" : "#FF6B6B"; ctx.shadowBlur = 12;
        ctx.fillText(`-${d.damage}`, d.x, d.y);
        if (d.critical) {
          ctx.font = "bold 10px sans-serif"; ctx.fillStyle = "#FFEAA7";
          ctx.fillText("유리!", d.x, d.y - 22);
        }
        ctx.restore();
        return true;
      });

      // Screen flash
      if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(255,255,255,${flashRef.current})`; ctx.fillRect(0, 0, w, h);
        flashRef.current *= 0.85; if (flashRef.current < 0.01) flashRef.current = 0;
      }

      // Vignette for critical
      if (phase === "critical") {
        const va = 0.2 + Math.sin(t * 3) * 0.1;
        const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
        vg.addColorStop(0, "transparent"); vg.addColorStop(1, `rgba(200,0,0,${va})`);
        ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, []);

  // Trigger attack
  const triggerAtk = (damage: number, element: string, critical: boolean) => {
    atkRef.current = { phase: "charge", time: 0, damage, element, critical };
    setTimeout(() => {
      const c = canvasRef.current; if (!c) return;
      const d = window.devicePixelRatio || 1;
      const w = c.width / d, h = c.height / d;
      floatsRef.current.push({
        x: w / 2 + (Math.random() - 0.5) * 30, y: h * 0.35,
        vy: -1.5, damage, alpha: 1, critical,
      });
    }, 550);
  };

  const attack = async () => {
    if (!token || !selectedSlime || attacking) return;
    setAttacking(true);
    try {
      const res = await authApi<{
        damage: number; boss_hp_remaining: number; defeated: boolean;
        participation_gold: number; bonus_gold: number; bonus_gems: number;
        slime_exp: number; slime_level_up: boolean; slime_new_level: number;
        remaining_attacks: number;
      }>("/api/boss/attack", token, { method: "POST", body: { slime_id: selectedSlime } });

      const playerElem = slimes.find((s) => s.id === selectedSlime)?.element || "water";
      triggerAtk(res.damage, playerElem, isStrong(playerElem, bossState!.boss.element));

      if (bossRef.current) {
        bossRef.current = { ...bossRef.current, current_hp: res.boss_hp_remaining, defeated: res.defeated };
      }

      setTimeout(() => {
        let msg = `${res.damage} 데미지! +${res.participation_gold}G`;
        if (res.defeated) msg += " 보스 격파!";
        if (res.bonus_gold > 0) msg += ` +보너스 ${res.bonus_gold}G`;
        if (res.slime_level_up) msg += ` Lv.${res.slime_new_level}!`;
        toastReward(msg, "⚔️");
        useAuthStore.getState().fetchUser();
        fetchBoss();
      }, 1000);
    } catch {
      toastError("공격 실패");
    }
    setTimeout(() => setAttacking(false), 1200);
  };

  if (!bossState) {
    return (
      <div className="absolute inset-0 z-50 bg-[#0a0a1a] flex items-center justify-center">
        <span className="text-white/30 animate-pulse">로딩 중...</span>
      </div>
    );
  }

  const { boss, my_attacks, max_attacks, my_damage, top_attackers } = bossState;
  const hpPct = Math.max(0, (boss.current_hp / boss.max_hp) * 100);
  const selData = slimes.find((s) => s.id === selectedSlime);
  const adv = selData ? (isStrong(selData.element, boss.element) ? "strong" : isWeak(selData.element, boss.element) ? "weak" : "neutral") : null;

  const sorted = [...slimes].sort((a, b) => {
    const as = isStrong(a.element, boss.element) ? 2 : isWeak(a.element, boss.element) ? 0 : 1;
    const bs = isStrong(b.element, boss.element) ? 2 : isWeak(b.element, boss.element) ? 0 : 1;
    return bs - as || b.level - a.level;
  });

  return (
    <div className="absolute inset-0 z-50 bg-[#0a0a1a] flex flex-col" style={{ bottom: 76 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/30 shrink-0 overlay-header">
        <div className="flex items-center gap-2.5">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white text-sm transition">{"←"}</button>
          <div>
            <h2 className="text-white font-bold text-sm">{"⚔️"} 월드 보스</h2>
            {countdown && <span className="text-white/30 text-[9px]">{"⏰"} {countdown}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-white/30">공격 {my_attacks}/{max_attacks}</span>
        </div>
      </div>

      {/* Battle Canvas */}
      <div ref={ctrRef} className="relative shrink-0" style={{ height: "38%" }}>
        <canvas ref={canvasRef} className="w-full h-full" />
        {/* HP overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-2">
          <div className="flex items-center justify-between text-[9px] mb-1">
            <span className="text-white/50 font-bold">{boss.name}</span>
            <span className="text-white/40 tabular-nums">{boss.current_hp.toLocaleString()} / {boss.max_hp.toLocaleString()}</span>
          </div>
          <div className="h-2.5 bg-black/50 backdrop-blur-sm rounded-full overflow-hidden border border-white/10">
            <div className="h-full rounded-full transition-all duration-700" style={{
              width: `${hpPct}%`,
              background: hpPct > 50 ? "linear-gradient(90deg, #55EFC4, #00B894)" : hpPct > 20 ? "linear-gradient(90deg, #FFEAA7, #FDCB6E)" : "linear-gradient(90deg, #FF6B6B, #E17055)",
              boxShadow: `0 0 8px ${hpPct > 50 ? "#55EFC4" : hpPct > 20 ? "#FFEAA7" : "#FF6B6B"}40`,
            }} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {!boss.defeated ? (
          <>
            {/* Slime select + advantage */}
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSelect(!showSelect)} className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-left px-3 flex items-center gap-2">
                {selData ? (
                  <>
                    <div className="w-7 h-7" dangerouslySetInnerHTML={{ __html: generateSlimeIconSvg(selData.element, 28) }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-[11px] font-bold truncate block">{selData.name || `슬라임 #${selData.species_id}`}</span>
                      <span className="text-white/30 text-[9px]">Lv.{selData.level}</span>
                    </div>
                  </>
                ) : (
                  <span className="text-white/30 text-[11px]">슬라임을 선택하세요</span>
                )}
              </button>
              {adv && (
                <div className={`px-3 py-2 rounded-xl text-[11px] font-bold shrink-0 ${
                  adv === "strong" ? "bg-[#55EFC4]/15 text-[#55EFC4] border border-[#55EFC4]/20"
                    : adv === "weak" ? "bg-[#FF6B6B]/15 text-[#FF6B6B] border border-[#FF6B6B]/20"
                    : "bg-white/[0.04] text-white/40 border border-white/[0.06]"
                }`}>
                  {adv === "strong" ? "유리! ×1.5" : adv === "weak" ? "불리... ×0.7" : "보통"}
                </div>
              )}
            </div>

            {/* Slime dropdown */}
            {showSelect && (
              <div className="max-h-36 overflow-y-auto rounded-xl bg-[#121220] border border-white/[0.08]">
                {sorted.map((s) => {
                  const sa = isStrong(s.element, boss.element);
                  const sw = isWeak(s.element, boss.element);
                  return (
                    <button key={s.id} onClick={() => { setSelectedSlime(s.id); setShowSelect(false); }}
                      className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition text-left border-b border-white/[0.03] last:border-0">
                      <div className="w-6 h-6" dangerouslySetInnerHTML={{ __html: generateSlimeIconSvg(s.element, 24) }} />
                      <span className="text-white/70 text-[11px] flex-1 truncate">{s.name || `#${s.species_id}`}</span>
                      <span className="text-white/30 text-[9px]">Lv.{s.level}</span>
                      {sa && <span className="text-[#55EFC4] text-[9px] font-bold">유리</span>}
                      {sw && <span className="text-[#FF6B6B] text-[9px]">불리</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Attack button */}
            <button onClick={attack} disabled={!selectedSlime || attacking || my_attacks >= max_attacks}
              className="w-full py-3 rounded-xl font-bold text-sm text-[#0a0a1a] disabled:opacity-30 transition active:scale-[0.97]"
              style={{
                background: attacking ? "linear-gradient(135deg, #636E72, #2D3436)" : "linear-gradient(135deg, #FF6B6B, #E17055)",
                boxShadow: !attacking && selectedSlime ? "0 4px 20px rgba(255,107,107,0.3)" : "none",
              }}>
              {attacking ? "⚔️ 공격 중..." : my_attacks >= max_attacks ? "🔒 오늘의 공격 횟수 소진" : `⚔️ 공격하기 (${my_attacks}/${max_attacks})`}
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            <span className="text-[#55EFC4] font-bold text-lg" style={{ textShadow: "0 0 16px rgba(85,239,196,0.4)" }}>
              {"🎉"} 보스 격파 완료! {"🎉"}
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-2">
          <div className="flex-1 bg-white/[0.04] rounded-xl p-2.5 text-center border border-white/[0.04]">
            <div className="text-white/25 text-[9px]">내 총 데미지</div>
            <div className="text-white font-bold text-[13px] tabular-nums">{my_damage.toLocaleString()}</div>
          </div>
          <div className="flex-1 bg-white/[0.04] rounded-xl p-2.5 text-center border border-white/[0.04]">
            <div className="text-white/25 text-[9px]">보상</div>
            <div className="text-[#FFEAA7] font-bold text-[13px]">{boss.reward_gold}G +{boss.reward_gems}{"💎"}</div>
          </div>
          <div className="flex-1 bg-white/[0.04] rounded-xl p-2.5 text-center border border-white/[0.04]">
            <div className="text-white/25 text-[9px]">속성</div>
            <div className="font-bold text-[13px]" style={{ color: ELEM_COL[boss.element] || "#A29BFE" }}>
              {elementNames[boss.element] || boss.element}
            </div>
          </div>
        </div>

        {/* Ranking */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-white/50 text-[11px] font-bold">{"⚔️"} 데미지 랭킹</span>
            <span className="text-white/20 text-[9px]">{top_attackers.length}명 참여</span>
          </div>
          {top_attackers.length === 0 ? (
            <div className="px-3 py-6 text-center text-white/15 text-[11px]">아직 공격 기록이 없습니다</div>
          ) : (
            top_attackers.map((a, i) => (
              <div key={i} className="px-3 py-2 flex items-center gap-2 border-b border-white/[0.03] last:border-0"
                style={{ background: i < 3 ? `linear-gradient(135deg, ${["rgba(255,234,167,0.04)", "rgba(200,182,255,0.03)", "rgba(255,159,243,0.03)"][i]}, transparent)` : undefined }}>
                <span className="text-[10px] w-5 text-center font-bold" style={{ color: i < 3 ? ["#FFEAA7", "#C8B6FF", "#FF9FF3"][i] : "rgba(255,255,255,0.2)" }}>
                  {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                </span>
                <span className="text-white/60 text-[11px] flex-1 truncate">{a.nickname}</span>
                <span className="text-[#FF6B6B] text-[10px] font-bold tabular-nums">{a.damage.toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
