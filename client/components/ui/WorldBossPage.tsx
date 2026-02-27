"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore } from "@/lib/store/gameStore";
import { authApi } from "@/lib/api/client";
import { toastReward, toastError, toastInfo } from "@/components/ui/Toast";
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
  stage: number;
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
  my_rank: number;
  top_attackers: Attacker[];
}

interface SlimeResult {
  id: string;
  element: string;
  damage: number;
  exp_gain: number;
  strong: boolean;
}

interface AttackAnim {
  phase: "charge" | "rush" | "impact" | "settle";
  time: number;
  damage: number;
  element: string;
  critical: boolean;
  currentSlimeIdx: number;
  slimeResults: SlimeResult[];
  comboMultiplier: number;
}

interface DmgFloat {
  x: number;
  y: number;
  vy: number;
  damage: number;
  alpha: number;
  critical: boolean;
  element?: string;
  scale: number;
  isCombo?: boolean;
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

const elementEmojis: Record<string, string> = {
  fire: "🔥", water: "💧", grass: "🌿", earth: "🪨", electric: "⚡",
  ice: "❄️", wind: "🌪️", poison: "☠️", light: "✨", dark: "🌑", celestial: "💫",
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

// Boss stage names and descriptions for the guide
const BOSS_STAGES = [
  { name: "1단계: 불꽃 드래곤", element: "fire", desc: "불꽃을 휘두르는 거대한 드래곤. 물 속성 슬라임이 유리!" },
  { name: "2단계: 심해 크라켄", element: "water", desc: "심해에서 올라온 거대한 크라켄. 풀 속성이 유리!" },
  { name: "3단계: 얼음 골렘", element: "ice", desc: "빙하 깊은 곳의 얼음 골렘. 불 속성이 유리!" },
  { name: "4단계: 독안개 히드라", element: "poison", desc: "독안개를 뿜는 다두 달린 히드라. 대지 속성이 유리!" },
  { name: "5단계: 혼돈의 슬라임킹", element: "dark", desc: "혼돈의 힘을 가진 최종 보스. 빛 속성이 유리!" },
  { name: "6단계: 번개 피닉스", element: "electric", desc: "번개를 몸에 두른 불사조. 대지 속성이 유리!" },
  { name: "7단계: 대지의 타이탄", element: "earth", desc: "바위와 용암의 거인. 풀 속성이 유리!" },
  { name: "8단계: 질풍 세르펜트", element: "wind", desc: "소용돌이를 일으키는 바람뱀. 얼음 속성이 유리!" },
  { name: "9단계: 천체의 수호자", element: "celestial", desc: "별의 힘을 가진 수호자. 어둠 속성이 유리!" },
  { name: "10단계: 공허의 황제", element: "light", desc: "모든 빛을 지배하는 최종 황제. 어둠 속성이 유리!" },
];

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
  if (d <= 0) return "\uB9CC\uB8CC\uB428";
  return `${Math.floor(d / 3600000)}\uC2DC\uAC04 ${Math.floor((d % 3600000) / 60000)}\uBD84`;
}

// ===== Boss Drawing Functions =====

// Each boss has unique visual features drawn on the canvas

function drawBossBody(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number,
  col: string, dark: string, breath: number,
  phase: "normal" | "enraged" | "critical", t: number,
) {
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
}

function drawBossEyes(
  ctx: CanvasRenderingContext2D, sz: number,
  phase: "normal" | "enraged" | "critical", t: number,
  glowColor?: string,
) {
  const eY = -sz * 0.08, eSp = sz * 0.16, eSz = sz * 0.07;
  for (const s of [-1, 1]) {
    const ex = s * eSp;
    ctx.beginPath(); ctx.ellipse(ex, eY, eSz, eSz * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s * eSz * 0.15, eY, eSz * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = phase === "critical" ? "#FF1111" : glowColor || "#2D3436"; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + s * eSz * 0.05, eY - eSz * 0.2, eSz * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fill();
    if (phase !== "normal") {
      ctx.beginPath(); ctx.moveTo(ex - eSz * 1.2, eY - eSz * 1.5);
      ctx.lineTo(ex + s * eSz * 0.8, eY - eSz * (phase === "critical" ? 0.6 : 0.8));
      ctx.strokeStyle = phase === "critical" ? "#FF1111" : "#FF6B6B";
      ctx.lineWidth = sz * 0.03; ctx.lineCap = "round"; ctx.stroke();
    }
  }
}

function drawBossMouth(
  ctx: CanvasRenderingContext2D, sz: number,
  phase: "normal" | "enraged" | "critical",
) {
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
}

// Stage 1: Fire Dragon - with dragon wings and flame crown
function drawFireDragon(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number,
  breath: number, phase: "normal" | "enraged" | "critical", t: number,
  shake: { x: number; y: number },
) {
  const col = "#FF6B6B", dark = "#E17055";
  ctx.save();
  ctx.translate(cx + shake.x, cy + shake.y);

  drawBossBody(ctx, 0, 0, sz, col, dark, breath, phase, t);

  // Dragon wings
  const wingFlap = Math.sin(t * 3) * 0.15;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.rotate(s * (0.3 + wingFlap));
    ctx.beginPath();
    ctx.moveTo(s * sz * 0.35, -sz * 0.1);
    ctx.quadraticCurveTo(s * sz * 0.9, -sz * 0.5, s * sz * 0.7, -sz * 0.15);
    ctx.quadraticCurveTo(s * sz * 0.85, sz * 0.05, s * sz * 0.55, sz * 0.1);
    ctx.closePath();
    const wg = ctx.createLinearGradient(0, -sz * 0.3, s * sz * 0.8, 0);
    wg.addColorStop(0, rgba(col, 0.6));
    wg.addColorStop(1, rgba("#FF9F43", 0.3));
    ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = rgba(col, 0.4); ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  // Flame crown (3 flames on head)
  for (let i = -1; i <= 1; i++) {
    const fx = i * sz * 0.15;
    const fy = -sz * 0.52;
    const fh = sz * (0.2 + Math.sin(t * 8 + i) * 0.08);
    const flameG = ctx.createLinearGradient(fx, fy, fx, fy - fh);
    flameG.addColorStop(0, "#FF9F43");
    flameG.addColorStop(0.5, "#FF6B6B");
    flameG.addColorStop(1, rgba("#FFEAA7", 0.6));
    ctx.beginPath();
    ctx.moveTo(fx - sz * 0.06, fy);
    ctx.quadraticCurveTo(fx - sz * 0.03, fy - fh * 0.7, fx, fy - fh);
    ctx.quadraticCurveTo(fx + sz * 0.03, fy - fh * 0.7, fx + sz * 0.06, fy);
    ctx.closePath();
    ctx.fillStyle = flameG; ctx.fill();
    // Flame glow
    const fg = ctx.createRadialGradient(fx, fy - fh * 0.5, 0, fx, fy - fh * 0.5, sz * 0.1);
    fg.addColorStop(0, rgba("#FFEAA7", 0.4)); fg.addColorStop(1, rgba("#FFEAA7", 0));
    ctx.beginPath(); ctx.arc(fx, fy - fh * 0.5, sz * 0.1, 0, Math.PI * 2); ctx.fillStyle = fg; ctx.fill();
  }

  drawBossEyes(ctx, sz, phase, t, "#E17055");
  drawBossMouth(ctx, sz, phase);

  // Cracks for critical
  if (phase === "critical") {
    ctx.strokeStyle = "rgba(255,50,50,0.6)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-sz * 0.1, -sz * 0.3); ctx.lineTo(-sz * 0.2, -sz * 0.1); ctx.lineTo(-sz * 0.15, sz * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz * 0.15, -sz * 0.2); ctx.lineTo(sz * 0.25, sz * 0.05); ctx.stroke();
  }

  ctx.restore();
}

// Stage 2: Deep Sea Kraken - with tentacles
function drawKraken(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number,
  breath: number, phase: "normal" | "enraged" | "critical", t: number,
  shake: { x: number; y: number },
) {
  const col = "#74B9FF", dark = "#0984E3";
  ctx.save();
  ctx.translate(cx + shake.x, cy + shake.y);

  // Tentacles behind body
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI - Math.PI * 0.1 + 0.1;
    const tx = Math.cos(angle) * sz * 0.35;
    const ty = sz * 0.3;
    const wave = Math.sin(t * 2.5 + i * 1.2) * sz * 0.15;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + wave, ty + sz * 0.25,
      tx + wave * 0.5, ty + sz * 0.45
    );
    ctx.strokeStyle = rgba(dark, 0.5 + Math.sin(t + i) * 0.1);
    ctx.lineWidth = sz * 0.05 * (1 - i * 0.05);
    ctx.lineCap = "round";
    ctx.stroke();
    // Sucker dots
    const dx = tx + wave * 0.3;
    const dy = ty + sz * 0.2;
    ctx.beginPath(); ctx.arc(dx, dy, sz * 0.015, 0, Math.PI * 2);
    ctx.fillStyle = rgba("#0984E3", 0.3); ctx.fill();
  }

  drawBossBody(ctx, 0, 0, sz, col, dark, breath, phase, t);

  // Kraken "dome" head accent
  ctx.beginPath();
  ctx.ellipse(0, -sz * 0.35, sz * 0.25, sz * 0.12, 0, Math.PI, 0);
  ctx.fillStyle = rgba("#81ECEC", 0.2); ctx.fill();

  drawBossEyes(ctx, sz, phase, t, "#0984E3");

  // Kraken-specific: third eye
  ctx.beginPath(); ctx.arc(0, -sz * 0.25, sz * 0.03, 0, Math.PI * 2);
  ctx.fillStyle = phase === "critical" ? "#FF1111" : "#81ECEC"; ctx.fill();

  drawBossMouth(ctx, sz, phase);

  if (phase === "critical") {
    ctx.strokeStyle = "rgba(50,50,255,0.6)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-sz * 0.15, -sz * 0.2); ctx.lineTo(-sz * 0.25, sz * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz * 0.1, -sz * 0.25); ctx.lineTo(sz * 0.2, sz * 0.0); ctx.stroke();
  }

  ctx.restore();
}

// Stage 3: Ice Golem - angular, crystalline
function drawIceGolem(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number,
  breath: number, phase: "normal" | "enraged" | "critical", t: number,
  shake: { x: number; y: number },
) {
  const col = "#81ECEC", dark = "#00CEC9";
  ctx.save();
  ctx.translate(cx + shake.x, cy + shake.y);

  drawBossBody(ctx, 0, 0, sz, col, dark, breath, phase, t);

  // Ice crystals growing from body
  const crystalPositions = [
    { x: -sz * 0.3, y: -sz * 0.35, h: sz * 0.25, r: -0.3 },
    { x: sz * 0.25, y: -sz * 0.38, h: sz * 0.3, r: 0.2 },
    { x: -sz * 0.15, y: -sz * 0.5, h: sz * 0.22, r: -0.1 },
    { x: sz * 0.35, y: -sz * 0.2, h: sz * 0.18, r: 0.4 },
    { x: -sz * 0.38, y: -sz * 0.15, h: sz * 0.15, r: -0.5 },
  ];
  for (const cp of crystalPositions) {
    ctx.save();
    ctx.translate(cp.x, cp.y);
    ctx.rotate(cp.r);
    // Crystal shape (hexagonal prism-like)
    ctx.beginPath();
    ctx.moveTo(-sz * 0.03, 0);
    ctx.lineTo(-sz * 0.05, -cp.h * 0.4);
    ctx.lineTo(0, -cp.h);
    ctx.lineTo(sz * 0.05, -cp.h * 0.4);
    ctx.lineTo(sz * 0.03, 0);
    ctx.closePath();
    const cg = ctx.createLinearGradient(0, 0, 0, -cp.h);
    cg.addColorStop(0, rgba("#00CEC9", 0.6));
    cg.addColorStop(0.5, rgba("#81ECEC", 0.8));
    cg.addColorStop(1, rgba("#DFE6E9", 0.9));
    ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = rgba("#fff", 0.3); ctx.lineWidth = 0.5; ctx.stroke();
    // Crystal shimmer
    const shimmer = Math.sin(t * 4 + cp.r * 3) * 0.3 + 0.5;
    ctx.beginPath(); ctx.arc(0, -cp.h * 0.5, sz * 0.02, 0, Math.PI * 2);
    ctx.fillStyle = rgba("#fff", shimmer); ctx.fill();
    ctx.restore();
  }

  drawBossEyes(ctx, sz, phase, t, "#00CEC9");

  // Golem-specific mouth: horizontal crack
  ctx.beginPath();
  ctx.moveTo(-sz * 0.08, sz * 0.1);
  ctx.lineTo(-sz * 0.03, sz * 0.13);
  ctx.lineTo(sz * 0.03, sz * 0.1);
  ctx.lineTo(sz * 0.08, sz * 0.12);
  ctx.strokeStyle = phase === "critical" ? "#FF3333" : "rgba(0,0,0,0.3)";
  ctx.lineWidth = sz * 0.02; ctx.lineCap = "round"; ctx.stroke();

  // Ice mist around base
  for (let i = 0; i < 3; i++) {
    const mx = Math.sin(t * 1.5 + i * 2) * sz * 0.4;
    const my = sz * 0.35 + Math.cos(t + i) * sz * 0.05;
    const ms = sz * 0.08 + Math.sin(t * 2 + i) * sz * 0.02;
    ctx.beginPath(); ctx.arc(mx, my, ms, 0, Math.PI * 2);
    ctx.fillStyle = rgba("#81ECEC", 0.1 + Math.sin(t + i) * 0.05); ctx.fill();
  }

  if (phase === "critical") {
    ctx.strokeStyle = "rgba(0,255,255,0.5)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-sz * 0.1, -sz * 0.2); ctx.lineTo(-sz * 0.25, sz * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz * 0.15, -sz * 0.3); ctx.lineTo(sz * 0.2, -sz * 0.05); ctx.stroke();
  }

  ctx.restore();
}

// Stage 4: Poison Hydra - multiple head protrusions
function drawPoisonHydra(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number,
  breath: number, phase: "normal" | "enraged" | "critical", t: number,
  shake: { x: number; y: number },
) {
  const col = "#6C5CE7", dark = "#5E35B1";
  ctx.save();
  ctx.translate(cx + shake.x, cy + shake.y);

  // Poison drip particles drawn behind body
  for (let i = 0; i < 4; i++) {
    const dx = (Math.sin(t * 1.5 + i * 1.7) * sz * 0.35);
    const dripY = sz * 0.4 + ((t * 30 + i * 20) % 40) * 0.01 * sz;
    const da = 1 - ((t * 30 + i * 20) % 40) / 40;
    ctx.beginPath(); ctx.arc(dx, dripY, sz * 0.015, 0, Math.PI * 2);
    ctx.fillStyle = rgba("#A29BFE", da * 0.5); ctx.fill();
  }

  drawBossBody(ctx, 0, 0, sz, col, dark, breath, phase, t);

  // Hydra "necks" / head bumps (3 mini-heads on top)
  const heads = [
    { x: -sz * 0.2, y: -sz * 0.5, size: sz * 0.12, angle: -0.2 },
    { x: 0, y: -sz * 0.58, size: sz * 0.14, angle: 0 },
    { x: sz * 0.2, y: -sz * 0.5, size: sz * 0.12, angle: 0.2 },
  ];
  for (const hd of heads) {
    ctx.save();
    ctx.translate(hd.x, hd.y);
    ctx.rotate(hd.angle + Math.sin(t * 2 + hd.x) * 0.1);
    // Neck
    ctx.beginPath();
    ctx.moveTo(-hd.size * 0.3, hd.size * 0.5);
    ctx.quadraticCurveTo(0, hd.size * 0.2, 0, -hd.size * 0.3);
    ctx.quadraticCurveTo(0, hd.size * 0.2, hd.size * 0.3, hd.size * 0.5);
    ctx.fillStyle = rgba(dark, 0.6); ctx.fill();
    // Mini head
    ctx.beginPath(); ctx.arc(0, -hd.size * 0.1, hd.size, 0, Math.PI * 2);
    const hg = ctx.createRadialGradient(0, -hd.size * 0.3, 0, 0, 0, hd.size);
    hg.addColorStop(0, col); hg.addColorStop(1, dark);
    ctx.fillStyle = hg; ctx.fill();
    // Mini eyes
    for (const es of [-1, 1]) {
      ctx.beginPath(); ctx.arc(es * hd.size * 0.3, -hd.size * 0.2, hd.size * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = phase === "critical" ? "#FF1111" : "#A29BFE"; ctx.fill();
      ctx.beginPath(); ctx.arc(es * hd.size * 0.3, -hd.size * 0.2, hd.size * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = "#2D3436"; ctx.fill();
    }
    ctx.restore();
  }

  drawBossEyes(ctx, sz, phase, t, "#A29BFE");
  drawBossMouth(ctx, sz, phase);

  // Poison gas effect around body
  for (let i = 0; i < 5; i++) {
    const gx = Math.sin(t * 0.8 + i * 1.3) * sz * 0.5;
    const gy = Math.cos(t * 0.6 + i * 0.9) * sz * 0.3 - sz * 0.1;
    const gs = sz * (0.06 + Math.sin(t + i) * 0.02);
    ctx.beginPath(); ctx.arc(gx, gy, gs, 0, Math.PI * 2);
    ctx.fillStyle = rgba("#A29BFE", 0.05 + Math.sin(t * 2 + i) * 0.02); ctx.fill();
  }

  if (phase === "critical") {
    ctx.strokeStyle = "rgba(162,155,254,0.6)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-sz * 0.1, -sz * 0.15); ctx.lineTo(-sz * 0.2, sz * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz * 0.12, -sz * 0.2); ctx.lineTo(sz * 0.22, sz * 0.05); ctx.stroke();
  }

  ctx.restore();
}

// Stage 5: Chaos Slime King - crown + chaotic aura
function drawSlimeKing(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number,
  breath: number, phase: "normal" | "enraged" | "critical", t: number,
  shake: { x: number; y: number },
) {
  const col = "#636E72", dark = "#2D3436";
  ctx.save();
  ctx.translate(cx + shake.x, cy + shake.y);

  // Chaotic aura ring
  const ringR = sz * (1.4 + Math.sin(t * 1.5) * 0.1);
  ctx.save();
  ctx.rotate(t * 0.3);
  ctx.beginPath();
  for (let i = 0; i < 360; i += 3) {
    const a = (i * Math.PI) / 180;
    const r = ringR + Math.sin(a * 8 + t * 5) * sz * 0.08;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.strokeStyle = rgba("#A29BFE", 0.15 + Math.sin(t * 3) * 0.05);
  ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  drawBossBody(ctx, 0, 0, sz, col, dark, breath, phase, t);

  // Crown (golden)
  ctx.beginPath();
  ctx.moveTo(-sz * 0.25, -sz * 0.48);
  ctx.lineTo(-sz * 0.28, -sz * 0.65);
  ctx.lineTo(-sz * 0.15, -sz * 0.55);
  ctx.lineTo(-sz * 0.05, -sz * 0.72);
  ctx.lineTo(sz * 0.05, -sz * 0.55);
  ctx.lineTo(sz * 0.15, -sz * 0.72);
  ctx.lineTo(sz * 0.25, -sz * 0.55);
  ctx.lineTo(sz * 0.28, -sz * 0.65);
  ctx.lineTo(sz * 0.25, -sz * 0.48);
  ctx.closePath();
  const crownG = ctx.createLinearGradient(0, -sz * 0.72, 0, -sz * 0.48);
  crownG.addColorStop(0, "#FFEAA7");
  crownG.addColorStop(1, "#FDCB6E");
  ctx.fillStyle = crownG; ctx.fill();
  ctx.strokeStyle = rgba("#F9CA24", 0.6); ctx.lineWidth = 1; ctx.stroke();

  // Crown jewels
  const jewels = ["#FF6B6B", "#74B9FF", "#55EFC4"];
  for (let i = 0; i < 3; i++) {
    const jx = (i - 1) * sz * 0.12;
    const jy = -sz * (i === 1 ? 0.65 : 0.58);
    ctx.beginPath(); ctx.arc(jx, jy, sz * 0.025, 0, Math.PI * 2);
    ctx.fillStyle = jewels[i]; ctx.fill();
    // Jewel sparkle
    const sp = Math.sin(t * 5 + i * 2) * 0.4 + 0.6;
    const sg = ctx.createRadialGradient(jx, jy, 0, jx, jy, sz * 0.04);
    sg.addColorStop(0, rgba(jewels[i], sp * 0.5)); sg.addColorStop(1, rgba(jewels[i], 0));
    ctx.beginPath(); ctx.arc(jx, jy, sz * 0.04, 0, Math.PI * 2); ctx.fillStyle = sg; ctx.fill();
  }

  drawBossEyes(ctx, sz, phase, t, "#A29BFE");

  // King's mouth: smirk
  if (phase === "critical") {
    drawBossMouth(ctx, sz, phase);
  } else {
    ctx.beginPath();
    ctx.moveTo(-sz * 0.08, sz * 0.1);
    ctx.quadraticCurveTo(0, sz * 0.18, sz * 0.08, sz * 0.08);
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = sz * 0.02;
    ctx.lineCap = "round"; ctx.stroke();
  }

  // Multi-element orbs orbiting
  const orbs = [
    { col: "#FF6B6B", off: 0 },
    { col: "#74B9FF", off: Math.PI * 0.67 },
    { col: "#55EFC4", off: Math.PI * 1.33 },
  ];
  for (const orb of orbs) {
    const oa = t * 1.5 + orb.off;
    const ox = Math.cos(oa) * sz * 0.65;
    const oy = Math.sin(oa) * sz * 0.25 + sz * 0.1;
    ctx.beginPath(); ctx.arc(ox, oy, sz * 0.035, 0, Math.PI * 2);
    ctx.fillStyle = rgba(orb.col, 0.7); ctx.fill();
    const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, sz * 0.07);
    og.addColorStop(0, rgba(orb.col, 0.3)); og.addColorStop(1, rgba(orb.col, 0));
    ctx.beginPath(); ctx.arc(ox, oy, sz * 0.07, 0, Math.PI * 2); ctx.fillStyle = og; ctx.fill();
  }

  if (phase === "critical") {
    ctx.strokeStyle = "rgba(162,155,254,0.5)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-sz * 0.1, -sz * 0.3); ctx.lineTo(-sz * 0.2, -sz * 0.1); ctx.lineTo(-sz * 0.15, sz * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz * 0.05, -sz * 0.35); ctx.lineTo(sz * 0.12, -sz * 0.15); ctx.lineTo(sz * 0.18, sz * 0.02); ctx.stroke();
  }

  ctx.restore();
}

// Stage 6: Thunder Phoenix - wide wings + lightning bolts
function drawThunderPhoenix(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number,
  breath: number, phase: "normal" | "enraged" | "critical", t: number,
  shake: { x: number; y: number },
) {
  const col = "#FFEAA7", dark = "#FDCB6E";
  ctx.save();
  ctx.translate(cx + shake.x, cy + shake.y);

  drawBossBody(ctx, 0, 0, sz, col, dark, breath, phase, t);

  // Wide wings
  const wingFlap = Math.sin(t * 4) * 0.2;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.rotate(s * (0.25 + wingFlap));
    ctx.beginPath();
    ctx.moveTo(s * sz * 0.3, -sz * 0.05);
    ctx.quadraticCurveTo(s * sz * 1.0, -sz * 0.6, s * sz * 0.85, -sz * 0.1);
    ctx.quadraticCurveTo(s * sz * 0.95, sz * 0.1, s * sz * 0.65, sz * 0.15);
    ctx.quadraticCurveTo(s * sz * 0.8, sz * 0.25, s * sz * 0.5, sz * 0.2);
    ctx.closePath();
    const wg = ctx.createLinearGradient(0, -sz * 0.4, s * sz * 0.9, 0);
    wg.addColorStop(0, rgba(col, 0.7));
    wg.addColorStop(0.5, rgba("#FF9F43", 0.5));
    wg.addColorStop(1, rgba("#FFEAA7", 0.2));
    ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = rgba(col, 0.3); ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  // Lightning bolt crest on forehead
  const boltY = -sz * 0.5;
  ctx.beginPath();
  ctx.moveTo(0, boltY - sz * 0.25);
  ctx.lineTo(-sz * 0.06, boltY - sz * 0.1);
  ctx.lineTo(sz * 0.02, boltY - sz * 0.12);
  ctx.lineTo(-sz * 0.04, boltY);
  ctx.lineTo(sz * 0.06, boltY - sz * 0.15);
  ctx.lineTo(-sz * 0.01, boltY - sz * 0.13);
  ctx.lineTo(sz * 0.04, boltY - sz * 0.25);
  ctx.closePath();
  ctx.fillStyle = "#FFEAA7"; ctx.fill();
  const bg = ctx.createRadialGradient(0, boltY - sz * 0.12, 0, 0, boltY - sz * 0.12, sz * 0.15);
  bg.addColorStop(0, rgba("#FFEAA7", 0.6)); bg.addColorStop(1, rgba("#FFEAA7", 0));
  ctx.beginPath(); ctx.arc(0, boltY - sz * 0.12, sz * 0.15, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();

  // Electric arcs around body
  for (let i = 0; i < 4; i++) {
    const arcA = t * 5 + i * Math.PI * 0.5;
    const ax1 = Math.cos(arcA) * sz * 0.45;
    const ay1 = Math.sin(arcA) * sz * 0.25;
    const ax2 = ax1 + (Math.random() - 0.5) * sz * 0.2;
    const ay2 = ay1 + (Math.random() - 0.5) * sz * 0.2;
    ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2);
    ctx.strokeStyle = rgba("#FFEAA7", 0.4 + Math.sin(t * 10 + i) * 0.2);
    ctx.lineWidth = 1.5; ctx.stroke();
  }

  drawBossEyes(ctx, sz, phase, t, "#FDCB6E");
  drawBossMouth(ctx, sz, phase);

  if (phase === "critical") {
    ctx.strokeStyle = "rgba(255,234,167,0.6)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-sz * 0.12, -sz * 0.2); ctx.lineTo(-sz * 0.22, sz * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz * 0.1, -sz * 0.25); ctx.lineTo(sz * 0.2, 0); ctx.stroke();
  }

  ctx.restore();
}

// Stage 7: Earth Titan - rocky shoulders + lava cracks + floating debris
function drawEarthTitan(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number,
  breath: number, phase: "normal" | "enraged" | "critical", t: number,
  shake: { x: number; y: number },
) {
  const col = "#DFE6E9", dark = "#B2BEC3";
  ctx.save();
  ctx.translate(cx + shake.x, cy + shake.y);

  // Floating debris behind body
  for (let i = 0; i < 5; i++) {
    const da = t * 0.8 + i * 1.3;
    const dx = Math.sin(da) * sz * (0.6 + i * 0.1);
    const dy = -sz * 0.3 + Math.cos(da * 0.7) * sz * 0.15 - i * sz * 0.08;
    const ds = sz * (0.04 + Math.sin(t + i) * 0.01);
    ctx.save(); ctx.translate(dx, dy); ctx.rotate(t + i);
    ctx.beginPath(); ctx.rect(-ds, -ds, ds * 2, ds * 2);
    ctx.fillStyle = rgba("#B2BEC3", 0.4 + Math.sin(t * 2 + i) * 0.1); ctx.fill();
    ctx.restore();
  }

  drawBossBody(ctx, 0, 0, sz, col, dark, breath, phase, t);

  // Rocky shoulder pads
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * sz * 0.35, -sz * 0.15);
    ctx.lineTo(s * sz * 0.55, -sz * 0.3);
    ctx.lineTo(s * sz * 0.6, -sz * 0.1);
    ctx.lineTo(s * sz * 0.5, sz * 0.05);
    ctx.closePath();
    const sg = ctx.createLinearGradient(s * sz * 0.35, -sz * 0.3, s * sz * 0.55, sz * 0.05);
    sg.addColorStop(0, "#B2BEC3");
    sg.addColorStop(0.6, "#636E72");
    sg.addColorStop(1, "#2D3436");
    ctx.fillStyle = sg; ctx.fill();
    ctx.strokeStyle = rgba("#636E72", 0.4); ctx.lineWidth = 1; ctx.stroke();
  }

  // Lava cracks on body
  ctx.strokeStyle = rgba("#FF6B6B", 0.5 + Math.sin(t * 3) * 0.2);
  ctx.lineWidth = 1.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-sz * 0.15, -sz * 0.1); ctx.lineTo(-sz * 0.05, sz * 0.15); ctx.lineTo(sz * 0.1, sz * 0.25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sz * 0.1, -sz * 0.2); ctx.lineTo(sz * 0.2, sz * 0.05); ctx.lineTo(sz * 0.15, sz * 0.2); ctx.stroke();
  // Lava glow
  const lg = ctx.createRadialGradient(0, sz * 0.05, 0, 0, sz * 0.05, sz * 0.3);
  lg.addColorStop(0, rgba("#FF6B6B", 0.1 + Math.sin(t * 4) * 0.05));
  lg.addColorStop(1, rgba("#FF6B6B", 0));
  ctx.beginPath(); ctx.arc(0, sz * 0.05, sz * 0.3, 0, Math.PI * 2); ctx.fillStyle = lg; ctx.fill();

  drawBossEyes(ctx, sz, phase, t, "#636E72");
  drawBossMouth(ctx, sz, phase);

  if (phase === "critical") {
    ctx.strokeStyle = "rgba(255,107,107,0.6)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-sz * 0.2, -sz * 0.3); ctx.lineTo(-sz * 0.1, sz * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz * 0.15, -sz * 0.25); ctx.lineTo(sz * 0.25, sz * 0.1); ctx.stroke();
  }

  ctx.restore();
}

// Stage 8: Wind Serpent - horizontal body + ribbon tentacles + vortex
function drawWindSerpent(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number,
  breath: number, phase: "normal" | "enraged" | "critical", t: number,
  shake: { x: number; y: number },
) {
  const col = "#A29BFE", dark = "#6C5CE7";
  ctx.save();
  ctx.translate(cx + shake.x, cy + shake.y);

  // Vortex rings behind body
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate(t * (1 + i * 0.3) + i * Math.PI * 0.67);
    const vr = sz * (0.8 + i * 0.25);
    ctx.beginPath();
    ctx.ellipse(0, 0, vr, vr * 0.3, 0, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(col, 0.08 + Math.sin(t * 2 + i) * 0.03);
    ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  drawBossBody(ctx, 0, 0, sz, col, dark, breath, phase, t);

  // Ribbon tentacles flowing from body
  for (let i = 0; i < 5; i++) {
    const ra = (i / 5) * Math.PI * 2 + t * 1.5;
    const rx = Math.cos(ra) * sz * 0.4;
    const ry = Math.sin(ra) * sz * 0.2 + sz * 0.1;
    ctx.beginPath();
    ctx.moveTo(rx * 0.5, ry * 0.5);
    const wave = Math.sin(t * 3 + i * 1.5) * sz * 0.15;
    ctx.quadraticCurveTo(rx + wave, ry + sz * 0.1, rx * 1.5 + wave * 0.5, ry + sz * 0.3);
    ctx.strokeStyle = rgba(col, 0.3 + Math.sin(t * 2 + i) * 0.1);
    ctx.lineWidth = sz * 0.03 * (1 - i * 0.08);
    ctx.lineCap = "round"; ctx.stroke();
  }

  // Horizontal elongation hint (wider eyes)
  drawBossEyes(ctx, sz, phase, t, "#C8B6FF");

  // Wind swirl marks near eyes
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * sz * 0.25, -sz * 0.15, sz * 0.08, s * 0.5, s * 0.5 + Math.PI * 1.5);
    ctx.strokeStyle = rgba("#C8B6FF", 0.2); ctx.lineWidth = 1; ctx.stroke();
  }

  drawBossMouth(ctx, sz, phase);

  if (phase === "critical") {
    ctx.strokeStyle = "rgba(162,155,254,0.6)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-sz * 0.15, -sz * 0.15); ctx.lineTo(-sz * 0.25, sz * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz * 0.12, -sz * 0.2); ctx.lineTo(sz * 0.22, sz * 0.05); ctx.stroke();
  }

  ctx.restore();
}

// Stage 9: Celestial Guardian - halo ring + hexagram emblem + constellation lines
function drawCelestialGuardian(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number,
  breath: number, phase: "normal" | "enraged" | "critical", t: number,
  shake: { x: number; y: number },
) {
  const col = "#FF9FF3", dark = "#E84393";
  ctx.save();
  ctx.translate(cx + shake.x, cy + shake.y);

  // Constellation lines behind body
  const stars = [
    { x: -sz * 0.7, y: -sz * 0.4 }, { x: -sz * 0.3, y: -sz * 0.7 },
    { x: sz * 0.2, y: -sz * 0.65 }, { x: sz * 0.6, y: -sz * 0.35 },
    { x: sz * 0.5, y: sz * 0.1 }, { x: -sz * 0.5, y: sz * 0.15 },
  ];
  ctx.strokeStyle = rgba("#FF9FF3", 0.12 + Math.sin(t * 1.5) * 0.04);
  ctx.lineWidth = 0.8;
  for (let i = 0; i < stars.length; i++) {
    const next = stars[(i + 1) % stars.length];
    ctx.beginPath(); ctx.moveTo(stars[i].x, stars[i].y); ctx.lineTo(next.x, next.y); ctx.stroke();
  }
  // Star dots
  for (const s of stars) {
    const twinkle = 0.3 + Math.sin(t * 4 + s.x + s.y) * 0.3;
    ctx.beginPath(); ctx.arc(s.x, s.y, sz * 0.02, 0, Math.PI * 2);
    ctx.fillStyle = rgba("#fff", twinkle); ctx.fill();
  }

  // Halo ring
  ctx.save();
  ctx.translate(0, -sz * 0.55);
  ctx.scale(1, 0.35);
  ctx.beginPath(); ctx.arc(0, 0, sz * 0.3, 0, Math.PI * 2);
  const hg = ctx.createLinearGradient(-sz * 0.3, 0, sz * 0.3, 0);
  hg.addColorStop(0, rgba("#FF9FF3", 0.1));
  hg.addColorStop(0.5, rgba("#FFF", 0.4));
  hg.addColorStop(1, rgba("#FF9FF3", 0.1));
  ctx.strokeStyle = hg; ctx.lineWidth = sz * 0.04; ctx.stroke();
  ctx.restore();

  drawBossBody(ctx, 0, 0, sz, col, dark, breath, phase, t);

  // Hexagram emblem on chest
  ctx.save();
  ctx.translate(0, -sz * 0.05);
  const hexR = sz * 0.1;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 2;
    const hx = Math.cos(a) * hexR, hy = Math.sin(a) * hexR;
    if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.strokeStyle = rgba("#FFF", 0.3 + Math.sin(t * 3) * 0.1);
  ctx.lineWidth = 1; ctx.stroke();
  // Inner star
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 2;
    const opp = ((i + 2) % 6 * Math.PI) / 3 - Math.PI / 2;
    ctx.moveTo(Math.cos(a) * hexR, Math.sin(a) * hexR);
    ctx.lineTo(Math.cos(opp) * hexR, Math.sin(opp) * hexR);
  }
  ctx.strokeStyle = rgba("#FF9FF3", 0.2); ctx.lineWidth = 0.5; ctx.stroke();
  ctx.restore();

  drawBossEyes(ctx, sz, phase, t, "#E84393");
  drawBossMouth(ctx, sz, phase);

  if (phase === "critical") {
    ctx.strokeStyle = "rgba(255,159,243,0.5)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-sz * 0.12, -sz * 0.25); ctx.lineTo(-sz * 0.2, sz * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz * 0.1, -sz * 0.3); ctx.lineTo(sz * 0.18, -sz * 0.05); ctx.stroke();
  }

  ctx.restore();
}

// Stage 10: Void Emperor - 7-point crown + cloak + void portal + 6-element orbit
function drawVoidEmperor(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number,
  breath: number, phase: "normal" | "enraged" | "critical", t: number,
  shake: { x: number; y: number },
) {
  const col = "#FFF3BF", dark = "#FDD835";
  ctx.save();
  ctx.translate(cx + shake.x, cy + shake.y);

  // Void portal behind body
  ctx.save();
  ctx.rotate(t * 0.5);
  for (let i = 0; i < 3; i++) {
    const pr = sz * (1.2 + i * 0.15);
    ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2);
    ctx.strokeStyle = rgba("#FDD835", 0.06 + Math.sin(t * 2 + i) * 0.03);
    ctx.lineWidth = 1 + Math.sin(t * 3 + i * 2) * 0.5; ctx.stroke();
  }
  ctx.restore();

  // Void vortex spiral
  ctx.save();
  ctx.globalAlpha = 0.08 + Math.sin(t * 1.5) * 0.03;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 6; a += 0.1) {
    const r = sz * 0.1 + a * sz * 0.08;
    const x = Math.cos(a + t * 0.8) * r;
    const y = Math.sin(a + t * 0.8) * r * 0.4;
    if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#FDD835"; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();

  // Cloak / cape behind body
  ctx.beginPath();
  ctx.moveTo(-sz * 0.4, -sz * 0.1);
  ctx.quadraticCurveTo(-sz * 0.6, sz * 0.2 + Math.sin(t * 2) * sz * 0.03, -sz * 0.45, sz * 0.55);
  ctx.lineTo(sz * 0.45, sz * 0.55);
  ctx.quadraticCurveTo(sz * 0.6, sz * 0.2 + Math.sin(t * 2 + 1) * sz * 0.03, sz * 0.4, -sz * 0.1);
  ctx.closePath();
  const cg = ctx.createLinearGradient(0, -sz * 0.1, 0, sz * 0.55);
  cg.addColorStop(0, rgba("#2D3436", 0.6));
  cg.addColorStop(0.5, rgba("#1A0E08", 0.7));
  cg.addColorStop(1, rgba("#FDD835", 0.1));
  ctx.fillStyle = cg; ctx.fill();

  drawBossBody(ctx, 0, 0, sz, col, dark, breath, phase, t);

  // 7-point crown
  ctx.beginPath();
  const crownBase = -sz * 0.48;
  const crownTop = -sz * 0.75;
  ctx.moveTo(-sz * 0.28, crownBase);
  for (let i = 0; i < 7; i++) {
    const cx2 = -sz * 0.25 + (i / 6) * sz * 0.5;
    const tip = i % 2 === 0 ? crownTop + Math.sin(t * 3 + i) * sz * 0.02 : crownBase - sz * 0.08;
    ctx.lineTo(cx2, tip);
  }
  ctx.lineTo(sz * 0.28, crownBase);
  ctx.closePath();
  const crG = ctx.createLinearGradient(0, crownTop, 0, crownBase);
  crG.addColorStop(0, "#FFF3BF");
  crG.addColorStop(0.5, "#FDD835");
  crG.addColorStop(1, "#F9CA24");
  ctx.fillStyle = crG; ctx.fill();
  ctx.strokeStyle = rgba("#FDD835", 0.6); ctx.lineWidth = 1; ctx.stroke();

  // Crown jewels
  const crJewels = ["#FF6B6B", "#74B9FF", "#55EFC4", "#A29BFE"];
  for (let i = 0; i < 4; i++) {
    const jx = -sz * 0.18 + i * sz * 0.12;
    const jy = crownTop + sz * 0.08;
    ctx.beginPath(); ctx.arc(jx, jy, sz * 0.02, 0, Math.PI * 2);
    ctx.fillStyle = crJewels[i]; ctx.fill();
  }

  drawBossEyes(ctx, sz, phase, t, "#FDD835");

  // Emperor smirk / mouth
  if (phase === "critical") {
    drawBossMouth(ctx, sz, phase);
  } else {
    ctx.beginPath();
    ctx.moveTo(-sz * 0.1, sz * 0.1);
    ctx.quadraticCurveTo(0, sz * 0.2, sz * 0.1, sz * 0.08);
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = sz * 0.02;
    ctx.lineCap = "round"; ctx.stroke();
  }

  // 6-element orbiting orbs
  const orbElements = [
    { col: "#FF6B6B", off: 0 }, { col: "#74B9FF", off: Math.PI / 3 },
    { col: "#55EFC4", off: Math.PI * 2 / 3 }, { col: "#FFEAA7", off: Math.PI },
    { col: "#A29BFE", off: Math.PI * 4 / 3 }, { col: "#81ECEC", off: Math.PI * 5 / 3 },
  ];
  for (const orb of orbElements) {
    const oa = t * 1.2 + orb.off;
    const ox = Math.cos(oa) * sz * 0.7;
    const oy = Math.sin(oa) * sz * 0.25 + sz * 0.1;
    ctx.beginPath(); ctx.arc(ox, oy, sz * 0.03, 0, Math.PI * 2);
    ctx.fillStyle = rgba(orb.col, 0.7); ctx.fill();
    const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, sz * 0.06);
    og.addColorStop(0, rgba(orb.col, 0.3)); og.addColorStop(1, rgba(orb.col, 0));
    ctx.beginPath(); ctx.arc(ox, oy, sz * 0.06, 0, Math.PI * 2); ctx.fillStyle = og; ctx.fill();
  }

  if (phase === "critical") {
    ctx.strokeStyle = "rgba(253,203,53,0.5)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-sz * 0.15, -sz * 0.3); ctx.lineTo(-sz * 0.22, -sz * 0.05); ctx.lineTo(-sz * 0.18, sz * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz * 0.1, -sz * 0.35); ctx.lineTo(sz * 0.15, -sz * 0.1); ctx.lineTo(sz * 0.2, sz * 0.05); ctx.stroke();
  }

  ctx.restore();
}

// Main boss draw dispatcher
function drawBoss(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number,
  stage: number, elem: string, breath: number,
  phase: "normal" | "enraged" | "critical", t: number,
  shake: { x: number; y: number },
) {
  switch (stage) {
    case 1: drawFireDragon(ctx, cx, cy, sz, breath, phase, t, shake); break;
    case 2: drawKraken(ctx, cx, cy, sz, breath, phase, t, shake); break;
    case 3: drawIceGolem(ctx, cx, cy, sz, breath, phase, t, shake); break;
    case 4: drawPoisonHydra(ctx, cx, cy, sz, breath, phase, t, shake); break;
    case 5: drawSlimeKing(ctx, cx, cy, sz, breath, phase, t, shake); break;
    case 6: drawThunderPhoenix(ctx, cx, cy, sz, breath, phase, t, shake); break;
    case 7: drawEarthTitan(ctx, cx, cy, sz, breath, phase, t, shake); break;
    case 8: drawWindSerpent(ctx, cx, cy, sz, breath, phase, t, shake); break;
    case 9: drawCelestialGuardian(ctx, cx, cy, sz, breath, phase, t, shake); break;
    case 10: drawVoidEmperor(ctx, cx, cy, sz, breath, phase, t, shake); break;
    default: drawFireDragon(ctx, cx, cy, sz, breath, phase, t, shake); break;
  }
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

// ===== Guide Modal =====

function GuideModal({ onClose, stage }: { onClose: () => void; stage: number }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: "rgba(26,14,8,0.8)" }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-5 space-y-4"
        style={{
          background: "linear-gradient(180deg, #2C1810, #1A0E08)",
          border: "1.5px solid rgba(201,168,76,0.3)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 40px rgba(201,168,76,0.05)",
        }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-gold font-bold text-base font-serif-game">{"\u2694\uFE0F"} 월드 보스 가이드</h3>
          <button onClick={onClose} className="text-[10px] font-bold transition" style={{ color: "rgba(245,230,200,0.4)" }}>닫기</button>
        </div>

        <div className="space-y-2 text-[11px] leading-relaxed" style={{ color: "rgba(245,230,200,0.5)" }}>
          <p className="font-bold font-serif-game" style={{ color: "#C9A84C" }}>{"\uD83D\uDCA1"} 기본 규칙</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>하루 <span className="text-parchment font-bold">10회</span> 공격 가능</li>
            <li>최대 <span className="text-parchment font-bold">5마리</span> 슬라임으로 파티 구성</li>
            <li>파티 인원이 많을수록 <span className="text-parchment font-bold">콤보 보너스</span> 데미지</li>
            <li>공격 시 슬라임에게 <span className="text-parchment font-bold">EXP</span> 획득</li>
            <li>보스 격파 시 추가 <span className="text-gold font-bold">보너스 보상</span></li>
          </ul>

          <p className="font-bold font-serif-game pt-2" style={{ color: "#C9A84C" }}>{"\uD83D\uDD25"} 속성 상성</p>
          <p>보스 속성에 유리한 슬라임으로 공격하면 <span className="text-gold font-bold">1.5배</span> 데미지!</p>
          <p>불리한 속성은 <span className="font-bold" style={{ color: "#FF6B6B" }}>0.7배</span> 데미지.</p>

          <p className="font-bold font-serif-game pt-2" style={{ color: "#C9A84C" }}>{"\uD83C\uDFC6"} 스테이지 시스템</p>
          <div className="space-y-1.5">
            {BOSS_STAGES.map((bs, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                style={{
                  background: i + 1 === stage ? "rgba(201,168,76,0.1)" : "transparent",
                  border: i + 1 === stage ? "1px solid rgba(201,168,76,0.2)" : "1px solid transparent",
                }}>
                <span className="text-[10px] font-bold w-4 shrink-0" style={{ color: i + 1 <= stage ? ELEM_COL[bs.element] || "#A29BFE" : "rgba(245,230,200,0.2)" }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold truncate" style={{ color: ELEM_COL[bs.element] || "#A29BFE" }}>
                    {bs.name}
                  </div>
                  <div className="text-[9px] truncate" style={{ color: "rgba(245,230,200,0.35)" }}>{bs.desc}</div>
                </div>
                {i + 1 === stage && (
                  <span className="text-[8px] text-gold font-bold shrink-0">현재</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <button onClick={onClose}
          className="w-full py-2.5 rounded-xl text-[12px] font-bold transition minigame-btn-gold">
          닫기
        </button>
      </div>
    </div>
  );
}

// ===== Attack Result Modal =====

function AttackResultModal({
  damage,
  gold,
  bonusGold,
  bonusGems,
  defeated,
  nextStage,
  comboMultiplier,
  slimeResults,
  bossElement,
  onClose,
}: {
  damage: number;
  gold: number;
  bonusGold: number;
  bonusGems: number;
  defeated: boolean;
  nextStage: boolean;
  comboMultiplier: number;
  slimeResults: SlimeResult[];
  bossElement: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6"
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #2C1810, #1A0E08)",
          border: "1.5px solid rgba(201,168,76,0.3)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 40px rgba(201,168,76,0.05)",
        }}
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 text-center" style={{
          background: defeated
            ? "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(212,175,55,0.1))"
            : "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(139,105,20,0.05))",
          borderBottom: "1px solid rgba(201,168,76,0.15)",
        }}>
          <div className="text-2xl mb-1">{defeated ? "\uD83C\uDF89" : "\u2694\uFE0F"}</div>
          <h3 className="text-parchment font-bold text-base font-serif-game">
            {defeated ? "보스 격파!" : "공격 성공!"}
          </h3>
          <div className="text-[#FF6B6B] font-bold text-xl mt-1"
            style={{ textShadow: "0 0 12px rgba(255,107,107,0.4)" }}>
            {damage.toLocaleString()} DMG
          </div>
          {comboMultiplier > 1 && (
            <div className="text-[#FFEAA7] text-[10px] font-bold mt-0.5">
              {"\u2728"} \uCF64\uBCF4 x{comboMultiplier.toFixed(1)}
            </div>
          )}
        </div>

        {/* Slime results */}
        {slimeResults.length > 0 && (
          <div className="px-4 py-2" style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}>
            <div className="text-[9px] font-bold mb-1.5 font-serif-game" style={{ color: "rgba(245,230,200,0.4)" }}>파티 결과</div>
            <div className="flex gap-1.5 flex-wrap">
              {slimeResults.map((sr, i) => (
                <div key={i} className="flex items-center gap-1 rounded-lg px-2 py-1"
                  style={{
                    background: rgba(ELEM_COL[sr.element] || "#A29BFE", 0.08),
                    border: `1px solid ${rgba(ELEM_COL[sr.element] || "#A29BFE", 0.15)}`,
                  }}>
                  <span className="text-[10px] font-bold" style={{ color: ELEM_COL[sr.element] || "#A29BFE" }}>
                    {sr.damage.toLocaleString()}
                  </span>
                  {sr.strong && <span className="text-[#55EFC4] text-[8px]">{"\u2191"}유리</span>}
                  <span className="text-[8px]" style={{ color: "rgba(245,230,200,0.3)" }}>+{sr.exp_gain}EXP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rewards */}
        <div className="px-4 py-3 space-y-1.5" style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.4)" }}>참여 보상</span>
            <span className="text-[#FFEAA7] text-[11px] font-bold">+{gold.toLocaleString()} G</span>
          </div>
          {defeated && bonusGold > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.4)" }}>격파 보너스</span>
              <span className="text-[#55EFC4] text-[11px] font-bold">+{bonusGold.toLocaleString()} G</span>
            </div>
          )}
          {defeated && bonusGems > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.4)" }}>{"\uD83D\uDC8E"} 보석 보너스</span>
              <span className="text-[#C9A84C] text-[11px] font-bold">+{bonusGems}</span>
            </div>
          )}
          {nextStage && (
            <div className="mt-2 text-center text-[#D4AF37] text-[11px] font-bold"
              style={{ textShadow: "0 0 8px rgba(212,175,55,0.3)" }}>
              {"\uD83D\uDD1D"} \uB2E4\uC74C \uC2A4\uD14C\uC774\uC9C0\uB85C \uC9C4\uD589!
            </div>
          )}
        </div>

        <div className="p-4 pt-0">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl text-[12px] font-bold transition minigame-btn-gold">
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Component =====

export default function WorldBossPage({ onClose }: { onClose: () => void }) {
  const token = useAuthStore((s) => s.accessToken);
  const slimes = useGameStore((s) => s.slimes);
  const [bossState, setBossState] = useState<BossState | null>(null);
  const [partySlimes, setPartySlimes] = useState<string[]>([]);
  const [attacking, setAttacking] = useState(false);
  const [showSelect, setShowSelect] = useState(false);
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);
  const [countdown, setCountdown] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [attackResult, setAttackResult] = useState<{
    damage: number; gold: number; bonusGold: number; bonusGems: number;
    defeated: boolean; nextStage: boolean; comboMultiplier: number;
    slimeResults: SlimeResult[]; bossElement: string;
  } | null>(null);

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

      // --- Sequential Attack Animation ---
      const anim = atkRef.current;
      let bExX = 0, bExY = 0;
      if (anim) {
        anim.time += dt;
        const pSz = bSz * 0.5;
        const curResult = anim.slimeResults[anim.currentSlimeIdx];
        const curElem = curResult?.element || anim.element;
        const curCol = ELEM_COL[curElem] || "#fff";
        // Stagger start positions for each slime
        const slimeCount = anim.slimeResults.length || 1;
        const startOffsetX = (anim.currentSlimeIdx / Math.max(1, slimeCount - 1) - 0.5) * w * 0.15;
        const sX = w * 0.15 + startOffsetX, sY = h * 0.75;
        const tX = bCx - bSz * 0.3, tY = bCy + bSz * 0.1;

        if (anim.phase === "charge") {
          if (anim.time > 0.2) { anim.phase = "rush"; anim.time = 0; }
          else {
            drawPlayer(ctx, sX, sY, pSz, curElem);
            const ga = anim.time / 0.2;
            const cg = ctx.createRadialGradient(sX, sY, 0, sX, sY, pSz * 2);
            cg.addColorStop(0, rgba(curCol, ga * 0.4));
            cg.addColorStop(1, "transparent");
            ctx.fillStyle = cg; ctx.fillRect(0, 0, w, h);
          }
        } else if (anim.phase === "rush") {
          if (anim.time > 0.2) { anim.phase = "impact"; anim.time = 0; }
          else {
            const p = easeIn(anim.time / 0.2);
            const px = lerp(sX, tX, p), py = lerp(sY, tY, p);
            drawPlayer(ctx, px, py, pSz, curElem);
            // Element-colored motion trail
            for (let i = 1; i <= 4; i++) {
              const tp = Math.max(0, p - i * 0.08);
              const tx = lerp(sX, tX, tp), ty = lerp(sY, tY, tp);
              ctx.beginPath(); ctx.arc(tx, ty, pSz * 0.3 * (1 - i * 0.2), 0, Math.PI * 2);
              ctx.fillStyle = rgba(curCol, 0.25 * (1 - i * 0.2)); ctx.fill();
            }
          }
        } else if (anim.phase === "impact") {
          if (anim.time > 0.3) {
            // Spawn per-slime damage float
            if (curResult) {
              const c = canvasRef.current;
              if (c) {
                const d2 = window.devicePixelRatio || 1;
                const cw = c.width / d2, ch = c.height / d2;
                floatsRef.current.push({
                  x: cw / 2 + (Math.random() - 0.5) * 40 + anim.currentSlimeIdx * 12 - slimeCount * 6,
                  y: ch * 0.33 - anim.currentSlimeIdx * 14,
                  vy: -1.5, damage: curResult.damage, alpha: 1,
                  critical: curResult.strong, element: curResult.element,
                  scale: 1.5,
                });
                // Star burst on strong hit
                if (curResult.strong) {
                  const cols = IMPACT_COLORS[curElem] || ["#FFEAA7", "#FFF"];
                  for (let si = 0; si < 8; si++) {
                    const ang = (Math.PI * 2 * si) / 8;
                    partsRef.current.push({
                      x: bCx, y: bCy - bSz * 0.1, vx: Math.cos(ang) * 3, vy: Math.sin(ang) * 3,
                      life: 0, maxLife: 0.3, size: 3, color: cols[si % cols.length], type: "impact",
                    });
                  }
                }
              }
            }
            // Move to next slime or settle
            if (anim.currentSlimeIdx < slimeCount - 1) {
              anim.currentSlimeIdx++;
              anim.phase = "charge";
              anim.time = 0;
            } else {
              anim.phase = "settle";
              anim.time = 0;
              // Show combo text if multiplier > 1
              if (anim.comboMultiplier > 1) {
                const c = canvasRef.current;
                if (c) {
                  const d2 = window.devicePixelRatio || 1;
                  const cw = c.width / d2, ch = c.height / d2;
                  floatsRef.current.push({
                    x: cw / 2, y: ch * 0.25, vy: -1, damage: anim.damage, alpha: 1.2,
                    critical: false, element: undefined, scale: 1.5, isCombo: true,
                  });
                }
              }
            }
          } else {
            if (anim.time < 0.08) flashRef.current = (1 - anim.time / 0.08) * 0.3;
            // Shockwave with element color
            const rp = easeOut(anim.time / 0.3);
            const rR = rp * bSz * 1.8, rA = 1 - rp;
            ctx.beginPath(); ctx.arc(bCx, bCy, rR, 0, Math.PI * 2);
            ctx.strokeStyle = rgba(curCol, rA * 0.5);
            ctx.lineWidth = 2.5 * (1 - rp); ctx.stroke();
            // Second ring
            const rp2 = easeOut(Math.max(0, anim.time - 0.04) / 0.3);
            if (rp2 > 0) {
              ctx.beginPath(); ctx.arc(bCx, bCy, rp2 * bSz * 1.3, 0, Math.PI * 2);
              ctx.strokeStyle = rgba(curCol, (1 - rp2) * 0.25);
              ctx.lineWidth = 1.5 * (1 - rp2); ctx.stroke();
            }
            // Impact particles in element color
            if (anim.time < 0.06) {
              const cols = IMPACT_COLORS[curElem] || ["#A29BFE", "#C8B6FF", "#DFE6E9"];
              for (let i = 0; i < 10; i++) {
                const ang = (Math.PI * 2 * i) / 10 + Math.random() * 0.3;
                const spd = 1.5 + Math.random() * 4;
                partsRef.current.push({
                  x: bCx, y: bCy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                  life: 0, maxLife: 0.3 + Math.random() * 0.3,
                  size: 2 + Math.random() * 3,
                  color: curResult?.strong ? "#FFEAA7" : cols[Math.floor(Math.random() * cols.length)],
                  type: "impact",
                });
              }
            }
            // Boss knockback
            bExX = Math.sin(anim.time * 30) * (1 - anim.time / 0.3) * 6;
            bExY = Math.sin(anim.time * 25) * (1 - anim.time / 0.3) * 3;
          }
        } else if (anim.phase === "settle") {
          if (anim.time > 0.4) atkRef.current = null;
        }
      }

      // Draw boss - pass stage for unique visuals
      drawBoss(ctx, bCx, bCy, bSz, boss.stage || 1, boss.element, t, phase, t,
        { x: shakeRef.current.x + bExX, y: shakeRef.current.y + bExY });

      // Defeated text
      if (boss.defeated) {
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.1;
        ctx.font = `bold ${Math.min(w * 0.08, 32)}px sans-serif`;
        ctx.textAlign = "center"; ctx.fillStyle = "#D4AF37";
        ctx.shadowColor = "#D4AF37"; ctx.shadowBlur = 20;
        ctx.fillText("격파 완료!", w / 2, h * 0.2);
        ctx.restore();
      }

      // Stage badge top-right
      if (!boss.defeated) {
        const phaseLabel = phase === "critical" ? "\uC704\uD5D8!" : phase === "enraged" ? "\uBD84\uB178" : "";
        if (phaseLabel) {
          ctx.save(); ctx.font = "bold 10px sans-serif";
          const bw = ctx.measureText(phaseLabel).width + 16;
          const bx = w - bw - 8, by = 8;
          ctx.beginPath(); ctx.roundRect(bx, by, bw, 20, 10);
          ctx.fillStyle = phase === "critical" ? "rgba(255,50,50,0.3)" : "rgba(255,107,107,0.2)";
          ctx.fill();
          ctx.fillStyle = phase === "critical" ? "#FF3333" : "#FF6B6B";
          ctx.textAlign = "center"; ctx.fillText(phaseLabel, bx + bw / 2, by + 14);
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

      // Damage floats with element colors, pop-in, and combo text
      floatsRef.current = floatsRef.current.filter((d) => {
        d.y += d.vy * dt * 60; d.vy -= 0.02 * dt * 60; d.alpha -= 0.012 * dt * 60;
        if (d.scale > 1) d.scale = Math.max(1, d.scale - dt * 4);
        if (d.alpha <= 0) return false;
        ctx.save();
        ctx.textAlign = "center"; ctx.globalAlpha = Math.min(1, d.alpha);

        if (d.isCombo) {
          // Combo multiplier text (gold)
          const comboScale = d.scale;
          ctx.translate(d.x, d.y);
          ctx.scale(comboScale, comboScale);
          ctx.font = "bold 22px sans-serif";
          ctx.fillStyle = "#D4AF37";
          ctx.shadowColor = "#D4AF37"; ctx.shadowBlur = 16;
          ctx.fillText(`COMBO x${(d.damage > 0 ? (d.damage / d.damage).toFixed(0) : "")}\u2728`, 0, 0);
        } else {
          // Per-slime damage float with element color
          const elemCol = d.element ? (ELEM_COL[d.element] || "#FF6B6B") : "#FF6B6B";
          const fontSize = d.critical ? 28 : 20;
          ctx.translate(d.x, d.y);
          ctx.scale(d.scale, d.scale);
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.fillStyle = d.critical ? "#FFEAA7" : elemCol;
          ctx.shadowColor = d.critical ? "#FFEAA7" : elemCol; ctx.shadowBlur = 12;
          ctx.fillText(`-${d.damage.toLocaleString()}`, 0, 0);
          if (d.critical) {
            // Star burst effect + "유리!" text
            ctx.font = "bold 11px sans-serif"; ctx.fillStyle = "#FFEAA7";
            ctx.fillText("\u2B50 \uC720\uB9AC!", 0, -24);
          }
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

  // Trigger sequential attack animation
  const triggerAtk = (damage: number, element: string, critical: boolean, slimeResults: SlimeResult[], comboMultiplier: number) => {
    atkRef.current = {
      phase: "charge", time: 0, damage, element, critical,
      currentSlimeIdx: 0,
      slimeResults: slimeResults.length > 0 ? slimeResults : [{ id: "", element, damage, exp_gain: 0, strong: critical }],
      comboMultiplier,
    };
  };

  const attack = async () => {
    const attackIds = partySlimes.length > 0 ? partySlimes : [];
    if (!token || attackIds.length === 0 || attacking) return;
    setAttacking(true);
    try {
      const res = await authApi<{
        damage: number; boss_hp_remaining: number; defeated: boolean;
        participation_gold: number; bonus_gold: number; bonus_gems: number;
        slime_exp: number; combo_multiplier: number;
        slime_results: SlimeResult[];
        remaining_attacks: number; next_stage: boolean;
      }>("/api/boss/attack", token, { method: "POST", body: { slime_ids: attackIds } });

      const playerElem = slimes.find((s) => s.id === attackIds[0])?.element || "water";
      const results = res.slime_results || [];
      triggerAtk(res.damage, playerElem, isStrong(playerElem, bossState!.boss.element), results, res.combo_multiplier);

      if (bossRef.current) {
        bossRef.current = { ...bossRef.current, current_hp: res.boss_hp_remaining, defeated: res.defeated };
      }

      // Save best damage for hub display
      const prevBest = parseInt(localStorage.getItem("boss_best_damage") || "0", 10);
      if (res.damage > prevBest) localStorage.setItem("boss_best_damage", String(res.damage));

      // Show result modal after sequential animation completes
      const partySize = results.length || 1;
      const modalDelay = Math.max(1200, partySize * 800 + 600);
      setTimeout(() => {
        setAttackResult({
          damage: res.damage,
          gold: res.participation_gold,
          bonusGold: res.bonus_gold,
          bonusGems: res.bonus_gems,
          defeated: res.defeated,
          nextStage: res.next_stage,
          comboMultiplier: res.combo_multiplier,
          slimeResults: results,
          bossElement: bossState!.boss.element,
        });
        useAuthStore.getState().fetchUser();
        fetchBoss();
      }, modalDelay);
    } catch (e) {
      let errMsg = "";
      if (e && typeof e === "object" && "data" in e) {
        const data = (e as { data?: { error?: string } }).data;
        errMsg = data?.error || "";
      }
      if (errMsg.includes("daily attack limit")) {
        toastError("\uC624\uB298\uC758 \uACF5\uACA9 \uD69F\uC218\uB97C \uBAA8\uB450 \uC0AC\uC6A9\uD588\uC2B5\uB2C8\uB2E4");
      } else {
        toastError("\uACF5\uACA9 \uC2E4\uD328");
      }
    }
    const attackResetDelay = Math.max(1400, (partySlimes.length || 1) * 800 + 800);
    setTimeout(() => setAttacking(false), attackResetDelay);
  };

  if (!bossState) {
    return (
      <div className="absolute inset-0 z-50 minigame-container flex items-center justify-center">
        <span className="animate-pulse font-serif-game" style={{ color: "rgba(245,230,200,0.35)" }}>로딩 중...</span>
      </div>
    );
  }

  const { boss, my_attacks, max_attacks, my_damage, my_rank, top_attackers } = bossState;
  const hpPct = Math.max(0, (boss.current_hp / boss.max_hp) * 100);

  const sorted = [...slimes].sort((a, b) => {
    const aScore = isStrong(a.element, boss.element) ? 2 : isWeak(a.element, boss.element) ? 0 : 1;
    const bScore = isStrong(b.element, boss.element) ? 2 : isWeak(b.element, boss.element) ? 0 : 1;
    return bScore - aScore || b.level - a.level;
  });

  const addToParty = (slimeId: string) => {
    if (selectingSlot !== null) {
      setPartySlimes((prev) => {
        const next = [...prev];
        next[selectingSlot] = slimeId;
        return next;
      });
    } else if (partySlimes.length < 5 && !partySlimes.includes(slimeId)) {
      setPartySlimes((prev) => [...prev, slimeId]);
    }
    setShowSelect(false);
    setSelectingSlot(null);
  };

  const removeFromParty = (idx: number) => {
    setPartySlimes((prev) => prev.filter((_, i) => i !== idx));
  };

  // Auto-fill party helper
  const autoFillParty = () => {
    const available = sorted.filter((s) => !partySlimes.includes(s.id));
    const needed = 5 - partySlimes.length;
    const toAdd = available.slice(0, needed).map((s) => s.id);
    setPartySlimes((prev) => [...prev, ...toAdd]);
    if (toAdd.length > 0) {
      toastInfo(`${toAdd.length}\uB9C8\uB9AC \uC790\uB3D9 \uD3B8\uC131!`);
    }
  };

  const stageLabel = `${boss.stage || 1} / 10 단계`;
  const hasParty = partySlimes.length > 0;

  return (
    <div className="absolute inset-0 z-50 flex flex-col minigame-container" style={{ bottom: 76 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0 overlay-header minigame-header">
        <div className="flex items-center gap-2.5">
          <button onClick={onClose} className="minigame-back-btn">{"\u2190"}</button>
          <div>
            <h2 className="text-gold font-bold text-sm font-serif-game" style={{ letterSpacing: "0.05em" }}>{"\u2694\uFE0F"} 월드 보스</h2>
            {countdown && <span className="text-[9px]" style={{ color: "rgba(245,230,200,0.4)" }}>{"\u23F0"} {countdown}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGuide(true)}
            className="minigame-guide-toggle"
            title="가이드">
            {"📖"} 가이드
          </button>
          <span className="text-[10px] font-serif-game" style={{ color: "rgba(201,168,76,0.5)" }}>{my_attacks}/{max_attacks}</span>
        </div>
      </div>

      {/* Battle Canvas */}
      <div ref={ctrRef} className="relative shrink-0" style={{ height: "38%" }}>
        <canvas ref={canvasRef} className="w-full h-full" />
        {/* HP overlay - enhanced with segments, gradient, shine, and glow */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-2">
          <div className="flex items-center justify-between text-[9px] mb-1">
            <span className="font-bold font-serif-game" style={{ color: "#F5E6C8" }}>{boss.name}</span>
            <span className="tabular-nums" style={{ color: "rgba(245,230,200,0.5)" }}>
              {boss.current_hp.toLocaleString()} / {boss.max_hp.toLocaleString()}
              <span className="ml-1" style={{ color: "rgba(245,230,200,0.3)" }}>({hpPct.toFixed(1)}%)</span>
            </span>
          </div>
          <div className="relative h-3 bg-black/60 backdrop-blur-sm rounded-full overflow-hidden" style={{
            border: "1px solid rgba(139,105,20,0.25)",
            boxShadow: `0 0 12px ${hpPct > 50 ? "#55EFC4" : hpPct > 20 ? "#FFEAA7" : "#FF6B6B"}20`,
          }}>
            {/* HP fill with gradient */}
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{
              width: `${hpPct}%`,
              background: hpPct > 50
                ? "linear-gradient(180deg, #6FFFB8, #55EFC4 40%, #00B894)"
                : hpPct > 20
                  ? "linear-gradient(180deg, #FFE78A, #FFEAA7 40%, #FDCB6E)"
                  : "linear-gradient(180deg, #FF8E8E, #FF6B6B 40%, #E17055)",
              boxShadow: `0 0 10px ${hpPct > 50 ? "#55EFC4" : hpPct > 20 ? "#FFEAA7" : "#FF6B6B"}50`,
            }} />
            {/* Shine effect on HP bar */}
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{
              width: `${hpPct}%`,
              background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
            }} />
            {/* Damage preview flash (red flash at edge of HP) */}
            {attacking && (
              <div className="absolute inset-y-0 rounded-full animate-pulse" style={{
                left: `${Math.max(0, hpPct - 5)}%`,
                width: "5%",
                background: "linear-gradient(90deg, transparent, rgba(255,80,80,0.4), rgba(255,80,80,0.6))",
              }} />
            )}
            {/* Segment markers at 25%, 50%, 75% */}
            {[25, 50, 75].map((pct) => (
              <div key={pct} className="absolute inset-y-0" style={{
                left: `${pct}%`, width: "1px",
                background: "rgba(255,255,255,0.12)",
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Stage indicator (10 stages) */}
        <div className="flex items-center gap-0.5 mb-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => {
            const stgBoss = BOSS_STAGES[s - 1];
            const stgCol = ELEM_COL[stgBoss.element] || "#A29BFE";
            return (
              <div key={s} className="flex-1 h-1.5 rounded-full transition-all" style={{
                background: s <= (boss.stage || 1)
                  ? `linear-gradient(90deg, ${stgCol}, ${stgCol}CC)`
                  : "rgba(255,255,255,0.06)",
                boxShadow: s === (boss.stage || 1) ? `0 0 6px ${stgCol}60` : "none",
              }} />
            );
          })}
          <span className="text-[9px] font-bold ml-1 shrink-0 font-serif-game" style={{ color: "rgba(201,168,76,0.5)" }}>{stageLabel}</span>
        </div>

        {!boss.defeated ? (
          <>
            {/* Element weakness hint banner */}
            <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{
              background: `linear-gradient(135deg, ${ELEM_COL[boss.element] || "#A29BFE"}10, transparent)`,
              border: `1px solid ${ELEM_COL[boss.element] || "#A29BFE"}20`,
            }}>
              <span className="text-base">{elementEmojis[boss.element] || "\u2753"}</span>
              <div className="flex-1">
                <p className="text-[10px] font-bold" style={{ color: ELEM_COL[boss.element] || "#A29BFE" }}>
                  {elementNames[boss.element] || boss.element} 속성 보스
                </p>
                <p className="text-[9px]" style={{ color: "rgba(245,230,200,0.4)" }}>
                  {BOSS_STAGES[(boss.stage || 1) - 1]?.desc || "유리한 속성 슬라임을 배치하세요!"}
                </p>
              </div>
              {(() => {
                const hpPct = boss.max_hp > 0 ? (boss.current_hp / boss.max_hp) * 100 : 100;
                const phase = getPhase(hpPct);
                if (phase === "normal") return null;
                return (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse" style={{
                    background: phase === "critical" ? "rgba(255,107,107,0.2)" : "rgba(255,165,0,0.15)",
                    color: phase === "critical" ? "#FF6B6B" : "#FFA500",
                    border: `1px solid ${phase === "critical" ? "rgba(255,107,107,0.3)" : "rgba(255,165,0,0.2)"}`,
                  }}>
                    {phase === "critical" ? "위험!" : "분노!"}
                  </span>
                );
              })()}
            </div>
            {/* Party slots (5 slots) */}
            <div className="minigame-section">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold font-serif-game" style={{ color: "rgba(245,230,200,0.5)" }}>{"\u2694\uFE0F"} 파티 ({partySlimes.length}/5)</span>
                <div className="flex items-center gap-2">
                  {slimes.length > 0 && partySlimes.length < 5 && (
                    <button onClick={autoFillParty} className="text-[9px] text-[#C9A84C] hover:text-[#D4AF37] font-bold transition">
                      \uC790\uB3D9\uD3B8\uC131
                    </button>
                  )}
                  {partySlimes.length > 0 && (
                    <button onClick={() => setPartySlimes([])} className="text-[9px] text-white/30 hover:text-white transition">
                      \uCD08\uAE30\uD654
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const sid = partySlimes[idx];
                  const sl = sid ? slimes.find((s) => s.id === sid) : null;
                  const slCol = sl ? ELEM_COL[sl.element] || "#A29BFE" : "#636E72";
                  const slStrong = sl ? isStrong(sl.element, boss.element) : false;
                  const slWeak = sl ? isWeak(sl.element, boss.element) : false;
                  return (
                    <button key={idx}
                      onClick={() => {
                        if (sl) {
                          removeFromParty(idx);
                        } else {
                          setSelectingSlot(idx);
                          setShowSelect(true);
                        }
                      }}
                      className="flex-1 aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 relative"
                      style={{
                        background: sl ? `linear-gradient(145deg, ${slCol}15, ${slCol}08)` : "rgba(255,255,255,0.02)",
                        border: sl
                          ? slStrong
                            ? `1.5px solid ${slCol}60`
                            : slWeak
                              ? `1.5px solid rgba(255,107,107,0.4)`
                              : `1px solid ${slCol}30`
                          : "1px dashed rgba(201,168,76,0.2)",
                      }}>
                      {sl ? (
                        <>
                          <img src={generateSlimeIconSvg(sl.element, 28)} alt="" className="w-7 h-7" draggable={false} />
                          <span className="text-[7px] text-white/50 font-bold">Lv.{sl.level}</span>
                          {slStrong && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#55EFC4] text-[7px] text-[#0a0a1a] font-bold flex items-center justify-center">{"\u2191"}</span>
                          )}
                          {slWeak && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#FF6B6B] text-[7px] text-white font-bold flex items-center justify-center">{"\u2193"}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-white/15 text-lg">+</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Combo indicator */}
              {partySlimes.length >= 2 && (
                <div className="mt-1.5 text-center">
                  <span className="text-[#FFEAA7] text-[9px] font-bold">
                    {"\u2728"} \uCF64\uBCF4 x{partySlimes.length >= 5 ? "1.5" : partySlimes.length >= 4 ? "1.35" : partySlimes.length >= 3 ? "1.2" : "1.1"} \uB370\uBBF8\uC9C0 \uBCF4\uB108\uC2A4
                  </span>
                </div>
              )}
            </div>

            {/* Slime picker dropdown */}
            {showSelect && (
              <div className="max-h-48 overflow-y-auto rounded-xl" style={{ background: "#2C1810", border: "1px solid rgba(201,168,76,0.15)" }}>
                {sorted.filter((s) => !partySlimes.includes(s.id)).length === 0 ? (
                  <div className="px-3 py-4 text-center text-[11px]" style={{ color: "rgba(245,230,200,0.25)" }}>선택 가능한 슬라임이 없습니다</div>
                ) : (
                  sorted.filter((s) => !partySlimes.includes(s.id)).map((s) => {
                    const sa = isStrong(s.element, boss.element);
                    const sw = isWeak(s.element, boss.element);
                    return (
                      <button key={s.id} onClick={() => addToParty(s.id)}
                        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition text-left border-b border-white/[0.03] last:border-0">
                        <img src={generateSlimeIconSvg(s.element, 24)} alt="" className="w-6 h-6" draggable={false} />
                        <span className="text-white/70 text-[11px] flex-1 truncate">{s.name || `#${s.species_id}`}</span>
                        <span className="text-white/30 text-[9px]">Lv.{s.level}</span>
                        {sa && <span className="text-[#55EFC4] text-[9px] font-bold">{"\u2191"}\uC720\uB9AC</span>}
                        {sw && <span className="text-[#FF6B6B] text-[9px]">{"\u2193"}\uBD88\uB9AC</span>}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Attack button */}
            <button onClick={attack} disabled={!hasParty || attacking || my_attacks >= max_attacks}
              className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-30 transition active:scale-[0.97] font-serif-game"
              style={{
                background: attacking ? "linear-gradient(135deg, #4A2515, #3D2017)" : "linear-gradient(135deg, rgba(201,168,76,0.25), rgba(212,175,55,0.2))",
                color: attacking ? "rgba(201,168,76,0.5)" : "#D4AF37",
                border: "1.5px solid rgba(201,168,76,0.4)",
                boxShadow: !attacking && hasParty ? "0 4px 20px rgba(201,168,76,0.15)" : "none",
              }}>
              {attacking
                ? "\u2694\uFE0F \uACF5\uACA9 \uC911..."
                : my_attacks >= max_attacks
                  ? "\uD83D\uDD12 \uC624\uB298\uC758 \uACF5\uACA9 \uD69F\uC218 \uC18C\uC9C4"
                  : `\u2694\uFE0F ${partySlimes.length > 0 ? `${partySlimes.length}\uB9C8\uB9AC\uB85C ` : ""}\uACF5\uACA9\uD558\uAE30 (${my_attacks}/${max_attacks})`
              }
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            <span className="text-[#D4AF37] font-bold text-lg" style={{ textShadow: "0 0 16px rgba(212,175,55,0.4)" }}>
              {"\uD83C\uDF89"} \uBCF4\uC2A4 \uACA9\uD30C \uC644\uB8CC! {"\uD83C\uDF89"}
            </span>
            {(boss.stage || 1) < 10 ? (
              <p className="text-white/40 text-xs mt-2">\uB2E4\uC74C \uC2A4\uD14C\uC774\uC9C0\uAC00 \uC900\uBE44\uB429\uB2C8\uB2E4...</p>
            ) : (
              <p className="text-[#FFEAA7] text-xs mt-2 font-bold">\uCD5C\uC885 \uBCF4\uC2A4 \uD074\uB9AC\uC5B4! \uCD95\uD558\uD569\uB2C8\uB2E4!</p>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-2">
          <div className="flex-1 minigame-stat-box text-center">
            <div className="text-[9px]" style={{ color: "rgba(245,230,200,0.3)" }}>내 총 데미지</div>
            <div className="text-parchment font-bold text-[13px] tabular-nums font-serif-game">{my_damage.toLocaleString()}</div>
          </div>
          <div className="flex-1 minigame-stat-box text-center">
            <div className="text-[9px]" style={{ color: "rgba(245,230,200,0.3)" }}>내 랭킹</div>
            <div className="text-parchment font-bold text-[13px] tabular-nums font-serif-game">
              {my_rank > 0 ? `#${my_rank}` : "-"}
            </div>
          </div>
          <div className="flex-1 minigame-stat-box text-center">
            <div className="text-[9px]" style={{ color: "rgba(245,230,200,0.3)" }}>격파 보상</div>
            <div className="text-gold font-bold text-[13px] font-serif-game">{boss.reward_gold}G +{boss.reward_gems}{"\uD83D\uDC8E"}</div>
          </div>
        </div>

        {/* Ranking */}
        <div className="minigame-section overflow-hidden">
          <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
            <span className="text-[11px] font-bold font-serif-game" style={{ color: "rgba(245,230,200,0.5)" }}>{"\u2694\uFE0F"} 데미지 랭킹</span>
            <span className="text-[9px]" style={{ color: "rgba(245,230,200,0.25)" }}>{top_attackers.length}명 참여</span>
          </div>
          {top_attackers.length === 0 ? (
            <div className="px-3 py-6 text-center text-[11px]" style={{ color: "rgba(245,230,200,0.2)" }}>아직 공격 기록이 없습니다</div>
          ) : (
            top_attackers.map((a, i) => (
              <div key={i} className="px-3 py-2 flex items-center gap-2 last:border-0"
                style={{
                  background: i < 3 ? `linear-gradient(135deg, ${["rgba(201,168,76,0.08)", "rgba(201,168,76,0.05)", "rgba(201,168,76,0.03)"][i]}, transparent)` : undefined,
                  borderBottom: "1px solid rgba(201,168,76,0.06)",
                }}>
                <span className="text-[10px] w-5 text-center font-bold" style={{ color: i < 3 ? ["#FFEAA7", "#D4AF37", "#C9A84C"][i] : "rgba(245,230,200,0.2)" }}>
                  {i < 3 ? ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"][i] : i + 1}
                </span>
                <span className="text-[11px] flex-1 truncate" style={{ color: "rgba(245,230,200,0.6)" }}>{a.nickname}</span>
                <span className="text-[#FF6B6B] text-[10px] font-bold tabular-nums">{a.damage.toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Guide Modal */}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} stage={boss.stage || 1} />}

      {/* Attack Result Modal */}
      {attackResult && (
        <AttackResultModal
          {...attackResult}
          onClose={() => setAttackResult(null)}
        />
      )}
    </div>
  );
}
