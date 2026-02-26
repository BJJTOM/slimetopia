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

// Boss stage names and descriptions for the guide
const BOSS_STAGES = [
  { name: "1단계: 불꽃 드래곤", element: "fire", desc: "불꽃을 휘두르는 거대한 드래곤. 물 속성 슬라임이 유리!" },
  { name: "2단계: 심해 크라켄", element: "water", desc: "심해에서 올라온 거대한 크라켄. 풀 속성이 유리!" },
  { name: "3단계: 얼음 골렘", element: "ice", desc: "빙하 깊은 곳의 얼음 골렘. 불 속성이 유리!" },
  { name: "4단계: 독안개 히드라", element: "poison", desc: "독안개를 뿜는 다두 달린 히드라. 대지 속성이 유리!" },
  { name: "5단계: 혼돈의 슬라임킹", element: "dark", desc: "혼돈의 힘을 가진 최종 보스. 빛 속성이 유리!" },
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
          <div className="px-4 py-2 border-t border-white/5">
            <div className="text-white/40 text-[9px] font-bold mb-1.5">\uD30C\uD2F0 \uACB0\uACFC</div>
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
                  {sr.strong && <span className="text-[#55EFC4] text-[8px]">{"\u2191"}\uC720\uB9AC</span>}
                  <span className="text-white/30 text-[8px]">+{sr.exp_gain}EXP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rewards */}
        <div className="px-4 py-3 space-y-1.5 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-[10px]">\uCC38\uC5EC \uBCF4\uC0C1</span>
            <span className="text-[#FFEAA7] text-[11px] font-bold">+{gold.toLocaleString()} G</span>
          </div>
          {defeated && bonusGold > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-[10px]">\uACA9\uD30C \uBCF4\uB108\uC2A4</span>
              <span className="text-[#55EFC4] text-[11px] font-bold">+{bonusGold.toLocaleString()} G</span>
            </div>
          )}
          {defeated && bonusGems > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-[10px]">{"\uD83D\uDC8E"} \uBCF4\uC11D \uBCF4\uB108\uC2A4</span>
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
            className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white/70 bg-white/5 hover:bg-white/10 transition">
            \uD655\uC778
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

      // Damage floats
      floatsRef.current = floatsRef.current.filter((d) => {
        d.y += d.vy * dt * 60; d.vy -= 0.02 * dt * 60; d.alpha -= 0.012 * dt * 60;
        if (d.alpha <= 0) return false;
        ctx.save();
        ctx.font = `bold ${d.critical ? 24 : 18}px sans-serif`;
        ctx.textAlign = "center"; ctx.globalAlpha = d.alpha;
        ctx.fillStyle = d.critical ? "#FFEAA7" : "#FF6B6B";
        ctx.shadowColor = d.critical ? "#FFEAA7" : "#FF6B6B"; ctx.shadowBlur = 12;
        ctx.fillText(`-${d.damage.toLocaleString()}`, d.x, d.y);
        if (d.critical) {
          ctx.font = "bold 10px sans-serif"; ctx.fillStyle = "#FFEAA7";
          ctx.fillText("\uC720\uB9AC!", d.x, d.y - 22);
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

  // Trigger attack animation
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
      triggerAtk(res.damage, playerElem, isStrong(playerElem, bossState!.boss.element));

      if (bossRef.current) {
        bossRef.current = { ...bossRef.current, current_hp: res.boss_hp_remaining, defeated: res.defeated };
      }

      // Show result modal after animation
      setTimeout(() => {
        setAttackResult({
          damage: res.damage,
          gold: res.participation_gold,
          bonusGold: res.bonus_gold,
          bonusGems: res.bonus_gems,
          defeated: res.defeated,
          nextStage: res.next_stage,
          comboMultiplier: res.combo_multiplier,
          slimeResults: res.slime_results || [],
          bossElement: bossState!.boss.element,
        });
        useAuthStore.getState().fetchUser();
        fetchBoss();
      }, 1200);
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
    setTimeout(() => setAttacking(false), 1400);
  };

  if (!bossState) {
    return (
      <div className="absolute inset-0 z-50 bg-[#0a0a1a] flex items-center justify-center">
        <span className="text-white/30 animate-pulse">\uB85C\uB529 \uC911...</span>
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

  const stageLabel = `${boss.stage || 1} / 5 단계`;
  const hasParty = partySlimes.length > 0;

  return (
    <div className="absolute inset-0 z-50 bg-[#0a0a1a] flex flex-col" style={{ bottom: 76 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/30 shrink-0 overlay-header">
        <div className="flex items-center gap-2.5">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white text-sm transition">{"\u2190"}</button>
          <div>
            <h2 className="text-white font-bold text-sm">{"\u2694\uFE0F"} \uC6D4\uB4DC \uBCF4\uC2A4</h2>
            {countdown && <span className="text-white/30 text-[9px]">{"\u23F0"} {countdown}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGuide(true)}
            className="w-7 h-7 rounded-full bg-white/8 hover:bg-white/12 flex items-center justify-center text-white/50 hover:text-white text-[11px] font-bold transition"
            title="\uAC00\uC774\uB4DC">
            ?
          </button>
          <span className="text-white/30 text-[10px]">{my_attacks}/{max_attacks}</span>
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
        {/* Stage indicator */}
        <div className="flex items-center gap-1.5 mb-1">
          {[1, 2, 3, 4, 5].map((s) => {
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
          <span className="text-white/30 text-[9px] font-bold ml-1 shrink-0">{stageLabel}</span>
        </div>

        {!boss.defeated ? (
          <>
            {/* Party slots (5 slots) */}
            <div className="rounded-xl p-2.5" style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/50 text-[10px] font-bold">{"\u2694\uFE0F"} \uD30C\uD2F0 ({partySlimes.length}/5)</span>
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
                            : `1px solid ${slCol}30`
                          : "1px dashed rgba(255,255,255,0.1)",
                      }}>
                      {sl ? (
                        <>
                          <img src={generateSlimeIconSvg(sl.element, 28)} alt="" className="w-7 h-7" draggable={false} />
                          <span className="text-[7px] text-white/50 font-bold">Lv.{sl.level}</span>
                          {slStrong && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#55EFC4] text-[7px] text-[#0a0a1a] font-bold flex items-center justify-center">{"\u2191"}</span>
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
              <div className="max-h-48 overflow-y-auto rounded-xl bg-[#121220] border border-white/[0.08]">
                {sorted.filter((s) => !partySlimes.includes(s.id)).length === 0 ? (
                  <div className="px-3 py-4 text-center text-white/20 text-[11px]">\uC120\uD0DD \uAC00\uB2A5\uD55C \uC2AC\uB77C\uC784\uC774 \uC5C6\uC2B5\uB2C8\uB2E4</div>
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
              className="w-full py-3 rounded-xl font-bold text-sm text-[#0a0a1a] disabled:opacity-30 transition active:scale-[0.97]"
              style={{
                background: attacking ? "linear-gradient(135deg, #636E72, #2D3436)" : "linear-gradient(135deg, #FF6B6B, #E17055)",
                boxShadow: !attacking && hasParty ? "0 4px 20px rgba(255,107,107,0.3)" : "none",
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
            {(boss.stage || 1) < 5 ? (
              <p className="text-white/40 text-xs mt-2">\uB2E4\uC74C \uC2A4\uD14C\uC774\uC9C0\uAC00 \uC900\uBE44\uB429\uB2C8\uB2E4...</p>
            ) : (
              <p className="text-[#FFEAA7] text-xs mt-2 font-bold">\uCD5C\uC885 \uBCF4\uC2A4 \uD074\uB9AC\uC5B4! \uCD95\uD558\uD569\uB2C8\uB2E4!</p>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-2">
          <div className="flex-1 bg-white/[0.04] rounded-xl p-2.5 text-center border border-white/[0.04]">
            <div className="text-white/25 text-[9px]">\uB0B4 \uCD1D \uB370\uBBF8\uC9C0</div>
            <div className="text-white font-bold text-[13px] tabular-nums">{my_damage.toLocaleString()}</div>
          </div>
          <div className="flex-1 bg-white/[0.04] rounded-xl p-2.5 text-center border border-white/[0.04]">
            <div className="text-white/25 text-[9px]">\uB0B4 \uB7AD\uD0B9</div>
            <div className="text-white font-bold text-[13px] tabular-nums">
              {my_rank > 0 ? `#${my_rank}` : "-"}
            </div>
          </div>
          <div className="flex-1 bg-white/[0.04] rounded-xl p-2.5 text-center border border-white/[0.04]">
            <div className="text-white/25 text-[9px]">\uACA9\uD30C \uBCF4\uC0C1</div>
            <div className="text-[#FFEAA7] font-bold text-[13px]">{boss.reward_gold}G +{boss.reward_gems}{"\uD83D\uDC8E"}</div>
          </div>
        </div>

        {/* Ranking */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-white/50 text-[11px] font-bold">{"\u2694\uFE0F"} \uB370\uBBF8\uC9C0 \uB7AD\uD0B9</span>
            <span className="text-white/20 text-[9px]">{top_attackers.length}\uBA85 \uCC38\uC5EC</span>
          </div>
          {top_attackers.length === 0 ? (
            <div className="px-3 py-6 text-center text-white/15 text-[11px]">\uC544\uC9C1 \uACF5\uACA9 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4</div>
          ) : (
            top_attackers.map((a, i) => (
              <div key={i} className="px-3 py-2 flex items-center gap-2 border-b border-white/[0.03] last:border-0"
                style={{ background: i < 3 ? `linear-gradient(135deg, ${["rgba(255,234,167,0.04)", "rgba(212,175,55,0.03)", "rgba(255,159,243,0.03)"][i]}, transparent)` : undefined }}>
                <span className="text-[10px] w-5 text-center font-bold" style={{ color: i < 3 ? ["#FFEAA7", "#D4AF37", "#FF9FF3"][i] : "rgba(255,255,255,0.2)" }}>
                  {i < 3 ? ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"][i] : i + 1}
                </span>
                <span className="text-white/60 text-[11px] flex-1 truncate">{a.nickname}</span>
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
