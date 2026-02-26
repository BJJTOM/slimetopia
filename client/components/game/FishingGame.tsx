"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi } from "@/lib/api/client";
import { toastReward } from "@/components/ui/Toast";

interface Props {
  onClose: () => void;
}

type FishingPhase = "idle" | "casting" | "waiting" | "bite" | "reeling" | "result";

interface CatchResult {
  type: string;
  name: string;
  gold: number;
  gems: number;
  rarity: string;
}

// ===== Fish behavior types for reeling minigame =====
type FishBehavior = "calm" | "nervous" | "darter" | "sinker" | "erratic";

interface FishState {
  y: number;       // current position (0-100, in the bar)
  targetY: number;  // where it's moving toward
  speed: number;    // movement speed
  behavior: FishBehavior;
  nextDart: number; // timer until next dart (for darter behavior)
}

const BITE_WINDOW = 2500;
const BAR_HEIGHT = 220;
const BAR_WIDTH = 50;
const SCENE_W = 260;
const SCENE_H = 240;

// Rarity → difficulty config
const DIFFICULTY: Record<string, {
  zoneSize: number;   // catch zone size (% of bar)
  fishSpeed: number;
  drainRate: number;   // how fast progress drops when not catching
  fillRate: number;    // how fast progress fills when catching
  behaviors: FishBehavior[];
}> = {
  common: {
    zoneSize: 32,
    fishSpeed: 0.8,
    drainRate: 0.25,
    fillRate: 0.55,
    behaviors: ["calm", "calm", "nervous"],
  },
  rare: {
    zoneSize: 26,
    fishSpeed: 1.2,
    drainRate: 0.35,
    fillRate: 0.5,
    behaviors: ["nervous", "sinker", "darter"],
  },
  treasure: {
    zoneSize: 22,
    fishSpeed: 1.6,
    drainRate: 0.4,
    fillRate: 0.45,
    behaviors: ["darter", "nervous", "erratic"],
  },
  legendary: {
    zoneSize: 18,
    fishSpeed: 2.2,
    drainRate: 0.5,
    fillRate: 0.4,
    behaviors: ["erratic", "darter", "erratic"],
  },
};

const FISH_VARIETIES: Record<string, { emoji: string; names: string[] }> = {
  common: { emoji: "🐟", names: ["멸치", "붕어", "미꾸라지", "숭어", "고등어"] },
  rare: { emoji: "🐠", names: ["금붕어", "해마", "광어", "돌돔", "도미"] },
  treasure: { emoji: "📦", names: ["보물 상자", "황금 조개", "해적 동전 주머니"] },
  legendary: { emoji: "🐉", names: ["해룡", "전설의 산호", "크라켄의 눈물", "포세이돈의 삼지창"] },
};

const rarityColors: Record<string, string> = {
  common: "#B2BEC3",
  rare: "#74B9FF",
  treasure: "#FFEAA7",
  legendary: "#FF6B6B",
};

const rarityKorean: Record<string, string> = {
  common: "일반",
  rare: "희귀",
  treasure: "보물",
  legendary: "전설",
};

// ===== Fish Size System =====
type FishSize = "tiny" | "normal" | "large" | "jumbo";
const FISH_SIZES: { type: FishSize; label: string; chance: number; rewardMul: number; zoneMul: number; displayScale: number }[] = [
  { type: "tiny", label: "소형", chance: 0.15, rewardMul: 0.5, zoneMul: 1.2, displayScale: 0.7 },
  { type: "normal", label: "보통", chance: 0.50, rewardMul: 1.0, zoneMul: 1.0, displayScale: 1.0 },
  { type: "large", label: "대형", chance: 0.25, rewardMul: 1.5, zoneMul: 0.85, displayScale: 1.3 },
  { type: "jumbo", label: "초대형!", chance: 0.10, rewardMul: 2.0, zoneMul: 0.7, displayScale: 1.6 },
];

const sizeColors: Record<FishSize, string> = {
  tiny: "#B2BEC3",
  normal: "#DFE6E9",
  large: "#FFEAA7",
  jumbo: "#FF6B6B",
};

// ===== Treasure Event =====
interface TreasureEvent {
  active: boolean;
  timer: number;
  sparkles: { x: number; y: number; vx: number; vy: number; life: number; alpha: number }[];
}

// ===== Coral & Sea life for enhanced graphics =====
interface Coral {
  x: number;
  height: number;
  color: string;
  sway: number;
  type: "branch" | "fan" | "tube";
}

interface JellyFish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  pulsePhase: number;
}

export default function FishingGame({ onClose }: Props) {
  const token = useAuthStore((s) => s.accessToken);

  const [phase, setPhase] = useState<FishingPhase>("idle");
  const [castPower, setCastPower] = useState(0);
  const [biteTimer, setBiteTimer] = useState(0);
  const [result, setResult] = useState<CatchResult | null>(null);
  const [remaining, setRemaining] = useState(10);
  const [failed, setFailed] = useState(false);
  const [combo, setCombo] = useState(0);
  const [perfectCatch, setPerfectCatch] = useState(false);
  const [reelProgress, setReelProgress] = useState(40);
  const [currentRarity, setCurrentRarity] = useState("common");
  const [fishSize, setFishSize] = useState<FishSize>("normal");
  const [treasureActive, setTreasureActive] = useState(false);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const tokenRef = useRef(token);
  tokenRef.current = token;

  // Reeling game refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barCanvasRef = useRef<HTMLCanvasElement>(null);
  const reelingRef = useRef(false);
  const gameLoopRef = useRef<number | null>(null);
  const holdingRef = useRef(false);
  const zoneYRef = useRef(50);    // catch zone center (0-100)
  const zoneVyRef = useRef(0);    // catch zone velocity
  const fishRef = useRef<FishState>({ y: 50, targetY: 50, speed: 1, behavior: "calm", nextDart: 0 });
  const progressRef = useRef(40); // 0-100
  const zoneSizeRef = useRef(30);
  const diffRef = useRef(DIFFICULTY.common);
  const catchingRef = useRef(false); // is fish currently in zone
  const elapsedRef = useRef(0);
  const bubblesRef = useRef<{ x: number; y: number; r: number; vy: number; alpha: number }[]>([]);
  const splashRef = useRef(0); // splash animation timer
  const fishSizeRef = useRef<FishSize>("normal");
  const fishSizeScaleRef = useRef(1);
  const treasureRef = useRef<TreasureEvent>({ active: false, timer: 0, sparkles: [] });
  const treasureTriggeredRef = useRef(false);
  const coralsRef = useRef<Coral[]>([]);
  const jellyfishRef = useRef<JellyFish[]>([]);
  const planktonRef = useRef<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number }[]>([]);
  const causticPhaseRef = useRef(0);

  // Determine rarity from server response (set when catch is made)
  // For reeling difficulty, we pick a random rarity for the minigame difficulty
  const pickReelingDifficulty = useCallback(() => {
    const roll = Math.random() * 100;
    let rarity: string;
    if (roll < 50) rarity = "common";
    else if (roll < 80) rarity = "rare";
    else if (roll < 95) rarity = "treasure";
    else rarity = "legendary";
    setCurrentRarity(rarity);
    const diff = DIFFICULTY[rarity] || DIFFICULTY.common;
    diffRef.current = diff;

    // Roll fish size
    const sizeRoll = Math.random();
    let cumulative = 0;
    let selectedSize: FishSize = "normal";
    for (const s of FISH_SIZES) {
      cumulative += s.chance;
      if (sizeRoll < cumulative) { selectedSize = s.type; break; }
    }
    fishSizeRef.current = selectedSize;
    setFishSize(selectedSize);
    const sizeConfig = FISH_SIZES.find(s => s.type === selectedSize)!;
    fishSizeScaleRef.current = sizeConfig.displayScale;

    // Apply size to zone (jumbo = harder = smaller zone)
    zoneSizeRef.current = diff.zoneSize * sizeConfig.zoneMul;

    const behaviors = diff.behaviors;
    const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
    fishRef.current = {
      y: 50,
      targetY: 20 + Math.random() * 60,
      speed: diff.fishSpeed * (selectedSize === "jumbo" ? 1.3 : selectedSize === "large" ? 1.1 : 1),
      behavior,
      nextDart: 1000 + Math.random() * 1500,
    };

    // Reset treasure
    treasureRef.current = { active: false, timer: 0, sparkles: [] };
    treasureTriggeredRef.current = false;
    setTreasureActive(false);

    // Generate corals
    coralsRef.current = [];
    const coralColors = ["#ff7675", "#fd79a8", "#e17055", "#00b894", "#fdcb6e", "#6c5ce7"];
    for (let i = 0; i < 8; i++) {
      coralsRef.current.push({
        x: 10 + i * 35 + Math.random() * 10,
        height: 15 + Math.random() * 25,
        color: coralColors[Math.floor(Math.random() * coralColors.length)],
        sway: Math.random() * Math.PI * 2,
        type: ["branch", "fan", "tube"][Math.floor(Math.random() * 3)] as Coral["type"],
      });
    }

    // Generate jellyfish
    jellyfishRef.current = [];
    for (let i = 0; i < 2; i++) {
      jellyfishRef.current.push({
        x: 40 + Math.random() * (SCENE_W - 80),
        y: 40 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.1 - Math.random() * 0.2,
        size: 8 + Math.random() * 6,
        color: ["rgba(162,155,254,", "rgba(255,159,243,", "rgba(116,185,255,"][Math.floor(Math.random() * 3)],
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    // Generate plankton
    planktonRef.current = [];
    for (let i = 0; i < 15; i++) {
      planktonRef.current.push({
        x: Math.random() * SCENE_W,
        y: Math.random() * SCENE_H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        alpha: 0.1 + Math.random() * 0.15,
        size: 0.5 + Math.random() * 1,
      });
    }
  }, []);

  // Cast animation
  useEffect(() => {
    if (phase !== "casting") return;
    let power = 0;
    let dir = 1;
    const interval = setInterval(() => {
      power += dir * 2;
      if (power >= 100) dir = -1;
      if (power <= 0) dir = 1;
      setCastPower(power);
    }, 20);
    return () => clearInterval(interval);
  }, [phase]);

  // Wait for bite
  useEffect(() => {
    if (phase !== "waiting") return;
    const waitTime = 1500 + Math.random() * 3500;
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 100;
      if (elapsed >= waitTime) {
        setPhase("bite");
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [phase]);

  // Bite countdown
  useEffect(() => {
    if (phase !== "bite") return;
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 50;
      setBiteTimer(elapsed);
      if (elapsed >= BITE_WINDOW) {
        setFailed(true);
        setCombo(0);
        setPhase("result");
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [phase]);

  // ===== REELING GAME LOOP (the core minigame) =====
  useEffect(() => {
    if (phase !== "reeling") return;
    reelingRef.current = true;
    progressRef.current = 40;
    zoneYRef.current = 50;
    zoneVyRef.current = 0;
    elapsedRef.current = 0;
    holdingRef.current = false;
    setReelProgress(40);
    pickReelingDifficulty();

    const DT = 16;
    let lastTime = Date.now();

    const loop = () => {
      if (!reelingRef.current) return;
      const now = Date.now();
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      elapsedRef.current += dt;
      const dtNorm = dt / 16; // normalize to ~60fps

      // === CATCH ZONE PHYSICS ===
      const GRAVITY = 0.15;
      const HOLD_FORCE = -0.45;
      const MAX_VY = 3;
      const BOUNCE_DAMP = 0.4;

      if (holdingRef.current) {
        zoneVyRef.current += HOLD_FORCE * dtNorm;
      } else {
        zoneVyRef.current += GRAVITY * dtNorm;
      }
      zoneVyRef.current = Math.max(-MAX_VY, Math.min(MAX_VY, zoneVyRef.current));
      zoneYRef.current += zoneVyRef.current * dtNorm;

      // Bounce off edges
      if (zoneYRef.current < zoneSizeRef.current / 2) {
        zoneYRef.current = zoneSizeRef.current / 2;
        zoneVyRef.current = Math.abs(zoneVyRef.current) * BOUNCE_DAMP;
      }
      if (zoneYRef.current > 100 - zoneSizeRef.current / 2) {
        zoneYRef.current = 100 - zoneSizeRef.current / 2;
        zoneVyRef.current = -Math.abs(zoneVyRef.current) * BOUNCE_DAMP;
      }

      // === FISH AI ===
      const fish = fishRef.current;
      const diff = diffRef.current;

      // Move toward target
      const fishDelta = fish.targetY - fish.y;
      const moveAmount = fish.speed * dtNorm * (Math.abs(fishDelta) < 5 ? 0.5 : 1);
      fish.y += Math.sign(fishDelta) * Math.min(moveAmount, Math.abs(fishDelta));

      // Clamp fish position
      fish.y = Math.max(5, Math.min(95, fish.y));

      // Behavior-specific target selection
      fish.nextDart -= dt;
      if (fish.nextDart <= 0 || Math.abs(fish.y - fish.targetY) < 3) {
        switch (fish.behavior) {
          case "calm":
            fish.targetY = fish.y + (Math.random() - 0.5) * 30;
            fish.nextDart = 1500 + Math.random() * 2000;
            break;
          case "nervous":
            fish.targetY = fish.y + (Math.random() - 0.5) * 50;
            fish.nextDart = 800 + Math.random() * 1200;
            break;
          case "darter":
            // Stay still then suddenly dart
            if (Math.random() < 0.3) {
              fish.targetY = Math.random() * 80 + 10;
              fish.speed = diff.fishSpeed * 2.5;
            } else {
              fish.targetY = fish.y + (Math.random() - 0.5) * 15;
              fish.speed = diff.fishSpeed * 0.3;
            }
            fish.nextDart = 600 + Math.random() * 1500;
            break;
          case "sinker":
            // Tends to go deep
            fish.targetY = Math.min(95, fish.y + 20 + Math.random() * 30);
            if (Math.random() < 0.25) fish.targetY = Math.random() * 40 + 10; // occasionally surface
            fish.nextDart = 1000 + Math.random() * 1500;
            break;
          case "erratic":
            fish.targetY = Math.random() * 90 + 5;
            fish.speed = diff.fishSpeed * (0.5 + Math.random() * 2);
            fish.nextDart = 300 + Math.random() * 800;
            break;
        }
        fish.targetY = Math.max(5, Math.min(95, fish.targetY));
        // Reset speed to base (except darter which sets its own)
        if (fish.behavior !== "darter") {
          fish.speed = diff.fishSpeed * (0.8 + Math.random() * 0.4);
        }
      }

      // === CATCH CHECK ===
      const zoneTop = zoneYRef.current - zoneSizeRef.current / 2;
      const zoneBottom = zoneYRef.current + zoneSizeRef.current / 2;
      const isCatching = fish.y >= zoneTop && fish.y <= zoneBottom;
      catchingRef.current = isCatching;

      if (isCatching) {
        progressRef.current += diff.fillRate * dtNorm;
      } else {
        progressRef.current -= diff.drainRate * dtNorm;
      }
      progressRef.current = Math.max(0, Math.min(100, progressRef.current));
      setReelProgress(Math.round(progressRef.current));

      // === BUBBLES ===
      if (Math.random() < 0.08) {
        bubblesRef.current.push({
          x: 20 + Math.random() * (SCENE_W - 60),
          y: SCENE_H - 10,
          r: 1 + Math.random() * 3,
          vy: -(0.3 + Math.random() * 0.6),
          alpha: 0.15 + Math.random() * 0.2,
        });
      }
      bubblesRef.current = bubblesRef.current.filter(b => {
        b.y += b.vy * dtNorm;
        b.alpha -= 0.002 * dtNorm;
        return b.alpha > 0 && b.y > 0;
      });

      if (splashRef.current > 0) splashRef.current -= dt;

      // === TREASURE EVENT ===
      // Triggers once when progress crosses 65% and random chance
      if (!treasureTriggeredRef.current && progressRef.current >= 65 && Math.random() < 0.008) {
        treasureTriggeredRef.current = true;
        treasureRef.current.active = true;
        treasureRef.current.timer = 3000;
        setTreasureActive(true);
      }
      if (treasureRef.current.active) {
        treasureRef.current.timer -= dt;
        // Golden sparkles
        if (Math.random() < 0.3) {
          treasureRef.current.sparkles.push({
            x: Math.random() * SCENE_W,
            y: Math.random() * SCENE_H,
            vx: (Math.random() - 0.5) * 1,
            vy: -Math.random() * 0.5,
            life: 400 + Math.random() * 300,
            alpha: 0.4 + Math.random() * 0.3,
          });
        }
        treasureRef.current.sparkles = treasureRef.current.sparkles.filter(s => {
          s.x += s.vx;
          s.y += s.vy;
          s.life -= dt;
          s.alpha *= 0.98;
          return s.life > 0;
        });
        // Boost fill rate during treasure
        if (isCatching) {
          progressRef.current += diff.fillRate * 0.5 * dtNorm; // extra 50% fill
        }
        if (treasureRef.current.timer <= 0) {
          treasureRef.current.active = false;
          setTreasureActive(false);
        }
      }

      // === UPDATE JELLYFISH ===
      for (const jf of jellyfishRef.current) {
        jf.x += jf.vx;
        jf.y += jf.vy;
        jf.pulsePhase += 0.03;
        if (jf.y < 20) jf.vy = Math.abs(jf.vy);
        if (jf.y > SCENE_H - 40) jf.vy = -Math.abs(jf.vy);
        if (jf.x < 10) jf.vx = Math.abs(jf.vx);
        if (jf.x > SCENE_W - 10) jf.vx = -Math.abs(jf.vx);
      }

      // === UPDATE PLANKTON ===
      for (const p of planktonRef.current) {
        p.x += p.vx + Math.sin(Date.now() * 0.001 + p.y * 0.05) * 0.1;
        p.y += p.vy;
        if (p.x < 0) p.x = SCENE_W;
        if (p.x > SCENE_W) p.x = 0;
        if (p.y < 0) p.y = SCENE_H;
        if (p.y > SCENE_H) p.y = 0;
      }

      // Caustics phase
      causticPhaseRef.current += dt * 0.001;

      // === WIN / LOSE ===
      if (progressRef.current >= 100) {
        reelingRef.current = false;
        setPerfectCatch(elapsedRef.current < 8000);
        handleCatch(true);
        return;
      }
      if (progressRef.current <= 0) {
        reelingRef.current = false;
        setFailed(true);
        setCombo(0);
        setPhase("result");
        return;
      }

      // === RENDER ===
      renderScene();
      renderBar();

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      reelingRef.current = false;
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== RENDER UNDERWATER SCENE =====
  const renderScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, SCENE_W, SCENE_H);

    // Water gradient - deeper, more atmospheric
    const waterGrad = ctx.createLinearGradient(0, 0, 0, SCENE_H);
    waterGrad.addColorStop(0, "#0a2540");
    waterGrad.addColorStop(0.1, "#0d3055");
    waterGrad.addColorStop(0.4, "#0a2848");
    waterGrad.addColorStop(0.7, "#082240");
    waterGrad.addColorStop(1, "#051830");
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 0, SCENE_W, SCENE_H);

    // ===== CAUSTIC LIGHT PATTERNS =====
    const cp = causticPhaseRef.current;
    ctx.save();
    ctx.globalAlpha = 0.025;
    for (let i = 0; i < 8; i++) {
      const cx2 = (SCENE_W * 0.2) + (i % 4) * (SCENE_W * 0.2) + Math.sin(cp * 0.7 + i) * 20;
      const cy2 = 40 + Math.floor(i / 4) * 60 + Math.cos(cp * 0.5 + i * 0.8) * 15;
      const r = 15 + Math.sin(cp * 0.3 + i * 1.3) * 8;
      ctx.fillStyle = "rgba(120,200,255,0.5)";
      ctx.beginPath();
      ctx.arc(cx2, cy2, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Light rays from top — more rays, wider spread
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const rx = 15 + i * 40 + Math.sin(Date.now() * 0.0005 + i) * 12;
      const alpha = 0.025 + Math.sin(Date.now() * 0.001 + i * 0.8) * 0.012;
      ctx.fillStyle = `rgba(120,200,255,${alpha})`;
      ctx.beginPath();
      ctx.moveTo(rx - 6, 0);
      ctx.lineTo(rx + 6, 0);
      ctx.lineTo(rx + 20 + i * 4, SCENE_H);
      ctx.lineTo(rx - 20 - i * 4, SCENE_H);
      ctx.fill();
    }
    ctx.restore();

    // ===== PLANKTON (tiny floating dots) =====
    for (const p of planktonRef.current) {
      ctx.globalAlpha = p.alpha + Math.sin(Date.now() * 0.002 + p.x + p.y) * 0.05;
      ctx.fillStyle = "rgba(180,220,255,0.6)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ===== JELLYFISH =====
    for (const jf of jellyfishRef.current) {
      const pulse = Math.sin(jf.pulsePhase) * 0.2;
      const jfAlpha = 0.2 + pulse * 0.1;
      // Glow
      ctx.fillStyle = `${jf.color}${(jfAlpha * 0.3).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(jf.x, jf.y, jf.size + 4, 0, Math.PI * 2);
      ctx.fill();
      // Bell
      ctx.fillStyle = `${jf.color}${jfAlpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(jf.x, jf.y, jf.size * (0.9 + pulse * 0.15), Math.PI, 0);
      ctx.fill();
      // Tentacles
      ctx.strokeStyle = `${jf.color}${(jfAlpha * 0.5).toFixed(2)})`;
      ctx.lineWidth = 0.5;
      for (let t = 0; t < 4; t++) {
        const tx = jf.x - jf.size * 0.5 + t * (jf.size / 2.5);
        const sway = Math.sin(Date.now() * 0.003 + t * 1.5 + jf.pulsePhase) * 3;
        ctx.beginPath();
        ctx.moveTo(tx, jf.y);
        ctx.quadraticCurveTo(tx + sway, jf.y + jf.size * 0.6, tx + sway * 0.5, jf.y + jf.size * 1.2);
        ctx.stroke();
      }
    }

    // Seaweed — more detailed
    for (let i = 0; i < 6; i++) {
      const sx = 20 + i * 45;
      const sway = Math.sin(Date.now() * 0.002 + i * 1.5) * 8;
      const h = 30 + (i % 3) * 15;
      ctx.strokeStyle = `rgba(40,${120 + i * 10},60,0.4)`;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx, SCENE_H);
      ctx.quadraticCurveTo(sx + sway, SCENE_H - h / 2, sx + sway * 1.3, SCENE_H - h);
      ctx.stroke();
      // Seaweed leaf
      if (i % 2 === 0) {
        ctx.fillStyle = `rgba(50,${130 + i * 8},70,0.25)`;
        ctx.beginPath();
        ctx.ellipse(sx + sway * 0.7, SCENE_H - h * 0.6, 4, 2, sway * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Sand bottom — richer
    const sandGrad = ctx.createLinearGradient(0, SCENE_H - 25, 0, SCENE_H);
    sandGrad.addColorStop(0, "rgba(60,50,30,0.2)");
    sandGrad.addColorStop(0.3, "rgba(70,58,32,0.35)");
    sandGrad.addColorStop(1, "rgba(85,70,40,0.5)");
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, SCENE_H - 25, SCENE_W, 25);

    // ===== CORAL REEF =====
    for (const coral of coralsRef.current) {
      const sway = Math.sin(Date.now() * 0.002 + coral.sway) * 2;
      ctx.save();
      ctx.globalAlpha = 0.5;
      if (coral.type === "branch") {
        // Branching coral
        ctx.strokeStyle = coral.color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(coral.x, SCENE_H - 15);
        ctx.lineTo(coral.x + sway, SCENE_H - 15 - coral.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(coral.x + sway * 0.5, SCENE_H - 15 - coral.height * 0.5);
        ctx.lineTo(coral.x + sway + 6, SCENE_H - 15 - coral.height * 0.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(coral.x + sway * 0.3, SCENE_H - 15 - coral.height * 0.3);
        ctx.lineTo(coral.x + sway - 5, SCENE_H - 15 - coral.height * 0.55);
        ctx.stroke();
      } else if (coral.type === "fan") {
        // Fan coral
        ctx.fillStyle = coral.color;
        ctx.beginPath();
        ctx.ellipse(coral.x + sway, SCENE_H - 15 - coral.height * 0.5, coral.height * 0.4, coral.height * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `${coral.color}80`;
        ctx.lineWidth = 0.5;
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(coral.x + sway, SCENE_H - 15 - coral.height * 0.5);
          ctx.lineTo(
            coral.x + sway + Math.cos(ang) * coral.height * 0.35,
            SCENE_H - 15 - coral.height * 0.5 + Math.sin(ang) * coral.height * 0.45
          );
          ctx.stroke();
        }
      } else {
        // Tube coral
        ctx.fillStyle = coral.color;
        for (let t = 0; t < 3; t++) {
          const tx = coral.x + t * 4 - 4;
          const th = coral.height * (0.6 + t * 0.2);
          roundRectFill(ctx, tx + sway * 0.5, SCENE_H - 15 - th, 3, th, 1.5);
          // Tube tip
          ctx.fillStyle = `rgba(255,255,255,0.2)`;
          ctx.beginPath();
          ctx.arc(tx + sway * 0.5 + 1.5, SCENE_H - 15 - th, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = coral.color;
        }
      }
      ctx.restore();
    }

    // Small stones with more variety
    for (let i = 0; i < 10; i++) {
      const stoneShade = 60 + (i * 7) % 30;
      ctx.fillStyle = `rgba(${stoneShade + 20},${stoneShade + 10},${stoneShade - 10},0.3)`;
      ctx.beginPath();
      ctx.ellipse(12 + i * 27, SCENE_H - 6 + (i % 3) * 2, 2 + (i % 3) * 1.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bubbles
    for (const b of bubblesRef.current) {
      ctx.globalAlpha = b.alpha;
      ctx.strokeStyle = "rgba(180,220,255,0.5)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
      // Bubble highlight
      ctx.fillStyle = "rgba(200,240,255,0.3)";
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Fishing line (from top center, down to somewhere near the fish)
    const fish = fishRef.current;
    const fishScreenY = 30 + (fish.y / 100) * (SCENE_H - 60);
    const fishScreenX = SCENE_W / 2 + Math.sin(Date.now() * 0.002) * 20;
    ctx.strokeStyle = "rgba(200,200,200,0.2)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(SCENE_W / 2, 0);
    ctx.quadraticCurveTo(SCENE_W / 2 + 5, fishScreenY * 0.5, fishScreenX, fishScreenY - 15);
    ctx.stroke();

    // Float at top
    ctx.fillStyle = "#cc3030";
    ctx.beginPath();
    ctx.ellipse(SCENE_W / 2, 8, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff5050";
    ctx.beginPath();
    ctx.ellipse(SCENE_W / 2, 6, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Water surface shimmer
    ctx.strokeStyle = "rgba(116,185,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= SCENE_W; x += 2) {
      const sy = 16 + Math.sin((x + Date.now() * 0.002) * 0.04) * 2;
      if (x === 0) ctx.moveTo(x, sy);
      else ctx.lineTo(x, sy);
    }
    ctx.stroke();

    // === THE FISH (size-scaled) ===
    const baseFishSize = currentRarity === "legendary" ? 28 : currentRarity === "treasure" ? 24 : 20;
    const fishSize = Math.round(baseFishSize * fishSizeScaleRef.current);
    const isCatching = catchingRef.current;

    // Fish glow when being caught
    if (isCatching) {
      ctx.fillStyle = `rgba(85,239,196,0.15)`;
      ctx.beginPath();
      ctx.arc(fishScreenX, fishScreenY, fishSize + 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fish body (draw with canvas since emoji rendering can be inconsistent)
    const fishDir = fish.targetY > fish.y ? 1 : -1;
    const wiggle = Math.sin(Date.now() * 0.01) * 3;

    ctx.save();
    ctx.translate(fishScreenX + wiggle, fishScreenY);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(2, 3, fishSize * 0.5, fishSize * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fish body
    const fishColor = rarityColors[currentRarity] || "#B2BEC3";
    ctx.fillStyle = fishColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, fishSize * 0.5, fishSize * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fish tail
    ctx.beginPath();
    const tailX = fishSize * 0.45;
    ctx.moveTo(tailX, 0);
    ctx.lineTo(tailX + fishSize * 0.25, -fishSize * 0.25 + Math.sin(Date.now() * 0.012) * 3);
    ctx.lineTo(tailX + fishSize * 0.25, fishSize * 0.25 + Math.sin(Date.now() * 0.012) * 3);
    ctx.fill();

    // Fish eye
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(-fishSize * 0.25, -fishSize * 0.05, fishSize * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.arc(-fishSize * 0.25, -fishSize * 0.05, fishSize * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Fish fin
    ctx.fillStyle = `${fishColor}88`;
    ctx.beginPath();
    ctx.moveTo(0, -fishSize * 0.3);
    ctx.lineTo(fishSize * 0.1, -fishSize * 0.55 + Math.sin(Date.now() * 0.008) * 2);
    ctx.lineTo(fishSize * 0.2, -fishSize * 0.25);
    ctx.fill();

    // Rarity sparkles for rare+
    if (currentRarity !== "common") {
      const sparkleCount = currentRarity === "legendary" ? 4 : 2;
      for (let i = 0; i < sparkleCount; i++) {
        const sx = Math.sin(Date.now() * 0.005 + i * 2) * fishSize * 0.6;
        const sy = Math.cos(Date.now() * 0.004 + i * 1.5) * fishSize * 0.4;
        const sparkleAlpha = 0.3 + Math.sin(Date.now() * 0.01 + i) * 0.2;
        ctx.fillStyle = `rgba(255,255,255,${sparkleAlpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Fish bubbles
    if (Math.random() < 0.04) {
      bubblesRef.current.push({
        x: fishScreenX + (Math.random() - 0.5) * 10,
        y: fishScreenY - 10,
        r: 1 + Math.random() * 2,
        vy: -(0.5 + Math.random() * 0.5),
        alpha: 0.2 + Math.random() * 0.15,
      });
    }

    // Splash overlay when catching
    if (splashRef.current > 0) {
      const splashAlpha = splashRef.current / 500;
      ctx.fillStyle = `rgba(116,185,255,${splashAlpha * 0.2})`;
      ctx.fillRect(0, 0, SCENE_W, SCENE_H);
    }

    // === TREASURE EVENT OVERLAY ===
    if (treasureRef.current.active) {
      // Golden shimmer overlay
      const tAlpha = 0.03 + Math.sin(Date.now() * 0.005) * 0.02;
      ctx.fillStyle = `rgba(255,215,0,${tAlpha})`;
      ctx.fillRect(0, 0, SCENE_W, SCENE_H);

      // Sparkles
      for (const s of treasureRef.current.sparkles) {
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = "#FFD700";
        // Star shape
        const sx2 = s.x;
        const sy2 = s.y;
        ctx.beginPath();
        for (let p = 0; p < 5; p++) {
          const a = (p * 2 * Math.PI / 5) - Math.PI / 2;
          const ax = sx2 + Math.cos(a) * 3;
          const ay = sy2 + Math.sin(a) * 3;
          if (p === 0) ctx.moveTo(ax, ay);
          else ctx.lineTo(ax, ay);
          const b = a + Math.PI / 5;
          ctx.lineTo(sx2 + Math.cos(b) * 1.2, sy2 + Math.sin(b) * 1.2);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // "TREASURE!" text
      const tFlash = 0.5 + Math.sin(Date.now() * 0.008) * 0.3;
      ctx.fillStyle = `rgba(255,215,0,${tFlash})`;
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.fillText("TREASURE!", SCENE_W / 2, 35);
    }

    // Catching indicator text
    if (isCatching && !treasureRef.current.active) {
      ctx.fillStyle = "rgba(85,239,196,0.6)";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("CATCHING!", SCENE_W / 2, SCENE_H - 30);
    } else if (isCatching && treasureRef.current.active) {
      ctx.fillStyle = "rgba(255,215,0,0.7)";
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.fillText("GOLDEN CATCH!", SCENE_W / 2, SCENE_H - 30);
    }
  };

  // ===== RENDER FISHING BAR (the minigame control) =====
  const renderBar = () => {
    const canvas = barCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, BAR_WIDTH, BAR_HEIGHT);

    // Bar background
    const barGrad = ctx.createLinearGradient(0, 0, 0, BAR_HEIGHT);
    barGrad.addColorStop(0, "rgba(10,30,50,0.9)");
    barGrad.addColorStop(0.5, "rgba(8,24,40,0.95)");
    barGrad.addColorStop(1, "rgba(6,18,30,0.9)");
    ctx.fillStyle = barGrad;
    roundRectFill(ctx, 0, 0, BAR_WIDTH, BAR_HEIGHT, 12);

    // Bar border
    ctx.strokeStyle = "rgba(116,185,255,0.15)";
    ctx.lineWidth = 1.5;
    roundRectStroke(ctx, 0, 0, BAR_WIDTH, BAR_HEIGHT, 12);

    // Depth markers
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let y = 0; y < BAR_HEIGHT; y += BAR_HEIGHT / 10) {
      ctx.beginPath();
      ctx.moveTo(5, y);
      ctx.lineTo(BAR_WIDTH - 5, y);
      ctx.stroke();
    }

    const padding = 8;
    const innerH = BAR_HEIGHT - padding * 2;

    // === CATCH ZONE ===
    const zonePixelH = (zoneSizeRef.current / 100) * innerH;
    const zoneCenterPixel = padding + (zoneYRef.current / 100) * innerH;
    const zoneTopPixel = zoneCenterPixel - zonePixelH / 2;
    const isCatching = catchingRef.current;

    // Zone glow
    const glowColor = isCatching ? "rgba(85,239,196," : "rgba(116,185,255,";
    ctx.fillStyle = `${glowColor}0.08)`;
    roundRectFill(ctx, 4, zoneTopPixel - 3, BAR_WIDTH - 8, zonePixelH + 6, 8);

    // Zone body
    const isTreasure = treasureRef.current.active;
    const zoneGrad = ctx.createLinearGradient(0, zoneTopPixel, 0, zoneTopPixel + zonePixelH);
    if (isTreasure && isCatching) {
      zoneGrad.addColorStop(0, "rgba(255,215,0,0.45)");
      zoneGrad.addColorStop(0.5, "rgba(255,215,0,0.35)");
      zoneGrad.addColorStop(1, "rgba(255,215,0,0.45)");
    } else if (isCatching) {
      zoneGrad.addColorStop(0, "rgba(85,239,196,0.4)");
      zoneGrad.addColorStop(0.5, "rgba(85,239,196,0.3)");
      zoneGrad.addColorStop(1, "rgba(85,239,196,0.4)");
    } else {
      zoneGrad.addColorStop(0, "rgba(116,185,255,0.25)");
      zoneGrad.addColorStop(0.5, "rgba(116,185,255,0.18)");
      zoneGrad.addColorStop(1, "rgba(116,185,255,0.25)");
    }
    ctx.fillStyle = zoneGrad;
    roundRectFill(ctx, 6, zoneTopPixel, BAR_WIDTH - 12, zonePixelH, 6);

    // Zone border
    ctx.strokeStyle = isCatching ? "rgba(85,239,196,0.5)" : "rgba(116,185,255,0.3)";
    ctx.lineWidth = 1.5;
    roundRectStroke(ctx, 6, zoneTopPixel, BAR_WIDTH - 12, zonePixelH, 6);

    // Zone shine lines
    ctx.strokeStyle = isCatching ? "rgba(85,239,196,0.15)" : "rgba(116,185,255,0.08)";
    ctx.lineWidth = 0.5;
    for (let ly = zoneTopPixel + 4; ly < zoneTopPixel + zonePixelH - 2; ly += 5) {
      ctx.beginPath();
      ctx.moveTo(8, ly);
      ctx.lineTo(BAR_WIDTH - 8, ly);
      ctx.stroke();
    }

    // === FISH MARKER ===
    const fish = fishRef.current;
    const fishPixelY = padding + (fish.y / 100) * innerH;

    // Fish trail
    ctx.fillStyle = `${rarityColors[currentRarity]}18`;
    ctx.beginPath();
    ctx.ellipse(BAR_WIDTH / 2, fishPixelY, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fish icon (small)
    const fc = rarityColors[currentRarity] || "#B2BEC3";
    // Glow
    ctx.fillStyle = `${fc}30`;
    ctx.beginPath();
    ctx.arc(BAR_WIDTH / 2, fishPixelY, 9, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillStyle = fc;
    ctx.beginPath();
    ctx.ellipse(BAR_WIDTH / 2, fishPixelY, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(BAR_WIDTH / 2 + 5, fishPixelY);
    ctx.lineTo(BAR_WIDTH / 2 + 9, fishPixelY - 3);
    ctx.lineTo(BAR_WIDTH / 2 + 9, fishPixelY + 3);
    ctx.fill();
    // Eye
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(BAR_WIDTH / 2 - 3, fishPixelY - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(BAR_WIDTH / 2 - 3, fishPixelY - 1, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator (where the fish is going)
    if (Math.abs(fish.targetY - fish.y) > 5) {
      const arrDir = fish.targetY > fish.y ? 1 : -1;
      ctx.fillStyle = `${fc}40`;
      ctx.beginPath();
      ctx.moveTo(BAR_WIDTH / 2 - 4, fishPixelY + arrDir * 12);
      ctx.lineTo(BAR_WIDTH / 2, fishPixelY + arrDir * 16);
      ctx.lineTo(BAR_WIDTH / 2 + 4, fishPixelY + arrDir * 12);
      ctx.fill();
    }
  };

  const handleCatch = useCallback(async (success: boolean) => {
    if (!tokenRef.current) return;
    try {
      const res = await authApi<{
        success: boolean;
        catch_type: string;
        catch_name: string;
        gold_reward: number;
        gems_reward: number;
        rarity: string;
        remaining: number;
      }>("/api/fishing/catch", tokenRef.current, {
        method: "POST",
        body: { success },
      });
      setRemaining(res.remaining);
      if (res.success) {
        setCombo((prev) => prev + 1);
        setResult({
          type: res.catch_type,
          name: res.catch_name,
          gold: res.gold_reward,
          gems: res.gems_reward,
          rarity: res.rarity,
        });
        setFailed(false);
        const parts = [`${res.gold_reward}G`];
        if (res.gems_reward > 0) parts.push(`${res.gems_reward}\uD83D\uDC8E`);
        toastReward(`${res.catch_name} \uB0DA\uC2DC \uC131\uACF5! ${parts.join(" + ")}`, "\uD83D\uDC1F");
      } else {
        setFailed(true);
        setCombo(0);
      }
      useAuthStore.getState().fetchUser();
    } catch {
      setFailed(true);
      setCombo(0);
    }
    setPhase("result");
  }, []);

  const startFishing = async () => {
    if (!token) return;
    try {
      const res = await authApi<{ remaining: number }>("/api/fishing/start", token, {
        method: "POST",
      });
      setRemaining(res.remaining);
      setResult(null);
      setFailed(false);
      setBiteTimer(0);
      setCastPower(0);
      setPerfectCatch(false);
      setReelProgress(40);
      bubblesRef.current = [];
      setPhase("casting");
    } catch {
      // daily limit reached
    }
  };

  const handleCast = () => {
    if (phase === "casting") {
      setPhase("waiting");
    }
  };

  const handleBiteTap = () => {
    if (phase === "bite") {
      splashRef.current = 500;
      setPhase("reeling");
    }
  };

  // Hold/release for reeling
  const handleHoldStart = (e?: React.MouseEvent | React.TouchEvent) => {
    if (phase === "bite") {
      handleBiteTap();
      return;
    }
    if (phase === "casting") {
      handleCast();
      return;
    }
    if (phase === "reeling") {
      holdingRef.current = true;
    }
  };
  const handleHoldEnd = () => {
    holdingRef.current = false;
  };

  const getRarityStars = (rarity: string) => {
    switch (rarity) {
      case "legendary": return "\u2605\u2605\u2605\u2605\u2605";
      case "treasure": return "\u2605\u2605\u2605\u2605";
      case "rare": return "\u2605\u2605\u2605";
      default: return "\u2605\u2605";
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden" style={{
      background: "linear-gradient(180deg, #061428 0%, #0a2a4a 30%, #0d3a5c 60%, #1a4a6a 100%)",
    }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 relative z-20 overlay-header minigame-header">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="minigame-back-btn">{"\u2190"}</button>
          <h2 className="text-gold font-bold text-sm font-serif-game" style={{ letterSpacing: "0.05em" }}>{"\uD83C\uDFA3"} 낚시</h2>
          {combo > 1 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(201,168,76,0.15)", color: "#D4AF37", border: "1px solid rgba(201,168,76,0.25)" }}>
              {"\uD83D\uDD25"} {combo}연속!
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold tabular-nums font-serif-game" style={{ color: "rgba(201,168,76,0.5)" }}>
          {"\uD83D\uDC1F"} {remaining}/10
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative"
        onMouseDown={handleHoldStart}
        onMouseUp={handleHoldEnd}
        onMouseLeave={handleHoldEnd}
        onTouchStart={handleHoldStart}
        onTouchEnd={handleHoldEnd}
      >
        {/* ===== IDLE ===== */}
        {phase === "idle" && (
          <div className="text-center animate-fade-in">
            <div className="mb-5">
              <span className="text-5xl block mb-3">{"\uD83C\uDFA3"}</span>
              <h3 className="font-bold text-base mb-1 font-serif-game" style={{ color: "#F5E6C8" }}>연못 낚시</h3>
              <p className="text-xs" style={{ color: "rgba(245,230,200,0.45)" }}>낚싯대를 던져 물고기를 잡아보세요!</p>
            </div>

            {/* Collapsible guide */}
            <div className="max-w-[280px] mx-auto mb-3">
              <button onClick={() => {
                const el = document.getElementById("fish-guide");
                if (el) el.style.display = el.style.display === "none" ? "block" : "none";
              }} className="minigame-guide-toggle mx-auto">
                {"📖"} 가이드
              </button>
              <div id="fish-guide" className="minigame-guide-content mt-2 text-left" style={{ display: "none" }}>
                <p><strong>등급별 확률:</strong> 일반 50% / 희귀 30% / 보물 15% / 전설 5%</p>
                <p><strong>물고기 크기:</strong> 소형(x0.5보상) / 보통(x1) / 대형(x1.5) / 초대형(x2)</p>
                <p><strong>행동 패턴:</strong> 차분 / 겁쟁이 / 돌진형 / 잠수형 / 변덕형</p>
                <p><strong>보물 이벤트:</strong> 진행도 65%+ 시 랜덤 발생, 보상 2배!</p>
                <p><strong>콤보:</strong> 연속 성공 시 콤보 보너스 골드 획득</p>
              </div>
            </div>

            <div className="game-panel rounded-xl p-4 mb-5 max-w-[280px] mx-auto text-left">
              <div className="text-[10px] font-bold mb-2 font-serif-game" style={{ color: "rgba(201,168,76,0.5)" }}>조작법</div>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold shrink-0" style={{ color: "#C9A84C" }}>1.</span>
                  <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.5)" }}>탭하여 낚싯대를 던진다</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold shrink-0" style={{ color: "#C9A84C" }}>2.</span>
                  <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.5)" }}>!가 뜨면 빠르게 탭!</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold shrink-0" style={{ color: "#C9A84C" }}>3.</span>
                  <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.5)" }}>꾹 누르고 떼며 초록 존을 물고기에 맞춰요!</span>
                </div>
              </div>
            </div>
            <button onClick={startFishing} className="minigame-btn-gold px-10 py-3.5 text-sm active:scale-95 transition-transform">
              {"\uD83C\uDFA3"} 낚시 시작!
            </button>
          </div>
        )}

        {/* ===== CASTING ===== */}
        {phase === "casting" && (
          <div className="text-center w-full max-w-[300px]">
            <div className="mb-6">
              <span className="text-4xl block mb-2">{"\uD83C\uDFA3"}</span>
              <p className="text-white/50 text-xs">{"\uD0ED\uD558\uC5EC \uB358\uC9C0\uC138\uC694!"}</p>
            </div>
            {/* Power bar */}
            <div className="relative px-4">
              <div className="h-5 bg-black/40 rounded-full overflow-hidden border border-white/10 relative">
                <div className="absolute top-0 bottom-0 w-[20%] left-[60%] bg-[#55EFC4]/15 border-x border-[#55EFC4]/20" />
                <div className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${castPower}%`,
                    background: castPower > 60 && castPower < 80
                      ? "linear-gradient(90deg, #55EFC4, #74B9FF)"
                      : "linear-gradient(90deg, #74B9FF, #FFEAA7)",
                    boxShadow: castPower > 60 && castPower < 80 ? "0 0 12px rgba(85,239,196,0.5)" : undefined,
                  }} />
              </div>
              <p className="text-white/50 text-[10px] mt-2">
                {"\uD0ED\uD558\uC5EC \uB358\uC9C0\uAE30!"} <span className="text-[#55EFC4]">{"\uCD08\uB85D \uC601\uC5ED = \uBCF4\uB108\uC2A4!"}</span>
              </p>
            </div>
            <button onClick={handleCast} className="minigame-btn-gold px-10 py-3 text-sm mt-4 active:scale-95 transition-transform">
              {"\uD83C\uDFAF"} 던지기!
            </button>
          </div>
        )}

        {/* ===== WAITING ===== */}
        {phase === "waiting" && (
          <div className="text-center">
            <span className="text-3xl block mb-3 animate-float">{"\uD83C\uDFA3"}</span>
            <div className="text-[#74B9FF] text-sm animate-pulse font-medium">
              {"\uBB3C\uACE0\uAE30\uB97C \uAE30\uB2E4\uB9AC\uB294 \uC911..."}
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#74B9FF]"
                  style={{ animation: `wave 1s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* ===== BITE ===== */}
        {phase === "bite" && (
          <div className="text-center">
            <div className="relative mb-4">
              <span className="text-6xl font-black animate-bounce block"
                style={{ color: "#FF6B6B", textShadow: "0 0 30px rgba(255,107,107,0.8), 0 0 60px rgba(255,107,107,0.3)" }}>
                !
              </span>
            </div>
            <button onClick={handleBiteTap}
              className="px-12 py-4 text-base font-black rounded-2xl active:scale-95 transition-transform animate-pulse font-serif-game"
              style={{
                background: "linear-gradient(135deg, rgba(201,168,76,0.3), rgba(212,175,55,0.25))",
                color: "#D4AF37",
                border: "2px solid rgba(201,168,76,0.5)",
                boxShadow: "0 0 30px rgba(201,168,76,0.3), 0 4px 12px rgba(0,0,0,0.3)",
              }}>
              {"\uD83C\uDFA3"} 지금 낚아채기! ({Math.max(0, Math.ceil((BITE_WINDOW - biteTimer) / 1000))}s)
            </button>
          </div>
        )}

        {/* ===== REELING (the actual minigame) ===== */}
        {phase === "reeling" && (
          <div className="w-full max-w-[360px]">
            {/* Rarity + Size label */}
            <div className="text-center mb-2 flex items-center justify-center gap-2">
              <span className="text-[10px] font-bold px-3 py-1 rounded-full"
                style={{
                  background: `${rarityColors[currentRarity]}15`,
                  color: rarityColors[currentRarity],
                  border: `1px solid ${rarityColors[currentRarity]}30`,
                }}>
                {FISH_VARIETIES[currentRarity]?.emoji} {rarityKorean[currentRarity]} {"\uBB3C\uACE0\uAE30!"}
              </span>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                style={{
                  background: `${sizeColors[fishSize]}12`,
                  color: sizeColors[fishSize],
                  border: `1px solid ${sizeColors[fishSize]}25`,
                }}>
                {FISH_SIZES.find(s => s.type === fishSize)?.label}
              </span>
              {treasureActive && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full animate-pulse"
                  style={{
                    background: "rgba(255,215,0,0.15)",
                    color: "#FFD700",
                    border: "1px solid rgba(255,215,0,0.3)",
                  }}>
                  {"\uD83D\uDCB0 보물!"}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="mb-3 px-2">
              <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/10 relative">
                <div className="h-full rounded-full transition-all duration-100"
                  style={{
                    width: `${reelProgress}%`,
                    background: reelProgress > 70
                      ? "linear-gradient(90deg, #55EFC4, #74B9FF)"
                      : reelProgress > 35
                        ? "linear-gradient(90deg, #FFEAA7, #55EFC4)"
                        : "linear-gradient(90deg, #FF6B6B, #FFEAA7)",
                    boxShadow: reelProgress > 70 ? "0 0 8px rgba(85,239,196,0.4)" : undefined,
                  }} />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[8px] text-[#FF6B6B]">{"\uC2E4\uD328"}</span>
                <span className="text-[8px] text-white/30">{Math.round(reelProgress)}%</span>
                <span className="text-[8px] text-[#55EFC4]">{"\uC131\uACF5!"}</span>
              </div>
            </div>

            {/* Game area: scene + bar side by side */}
            <div className="flex items-center justify-center gap-3">
              {/* Underwater scene canvas */}
              <div className="rounded-xl overflow-hidden border border-white/10"
                style={{ boxShadow: "0 0 20px rgba(10,42,74,0.5), inset 0 -10px 20px rgba(0,0,0,0.2)" }}>
                <canvas
                  ref={canvasRef}
                  width={SCENE_W}
                  height={SCENE_H}
                  className="block"
                  style={{ width: SCENE_W * 0.85, height: SCENE_H * 0.85 }}
                />
              </div>

              {/* Fishing bar canvas (the control) */}
              <div className="rounded-xl overflow-hidden"
                style={{ boxShadow: `0 0 15px ${catchingRef.current ? "rgba(85,239,196,0.2)" : "rgba(10,30,50,0.5)"}` }}>
                <canvas
                  ref={barCanvasRef}
                  width={BAR_WIDTH}
                  height={BAR_HEIGHT}
                  className="block"
                  style={{ width: BAR_WIDTH, height: BAR_HEIGHT }}
                />
              </div>
            </div>

            {/* Control hint */}
            <div className="text-center mt-2.5">
              <span className="text-[10px] font-bold px-3 py-1 rounded-full"
                style={{
                  background: holdingRef.current ? "rgba(85,239,196,0.15)" : "rgba(116,185,255,0.1)",
                  color: holdingRef.current ? "#55EFC4" : "#74B9FF",
                  border: `1px solid ${holdingRef.current ? "rgba(85,239,196,0.2)" : "rgba(116,185,255,0.15)"}`,
                }}>
                {holdingRef.current ? "\u2B06\uFE0F \uC62C\uB77C\uAC00\uB294 \uC911..." : "\uAF2D \uB204\uB974\uACE0 \uC788\uC73C\uBA74 \u2191 | \uB5BC\uBA74 \u2193"}
              </span>
            </div>
          </div>
        )}

        {/* ===== RESULT ===== */}
        {phase === "result" && (
          <div className="text-center animate-scale-in w-full max-w-[300px]">
            {!failed && result ? (
              <div className="game-panel rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20"
                  style={{ background: `radial-gradient(circle at 50% 30%, ${rarityColors[result.rarity]}, transparent 70%)` }} />

                <div className="relative z-10">
                  <span className="text-5xl block mb-2">
                    {FISH_VARIETIES[result.rarity]?.emoji || "\uD83D\uDC1F"}
                  </span>
                  <h3 className="text-white font-bold text-lg">{result.name}</h3>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <p className="text-[11px] font-bold tracking-wider"
                      style={{ color: rarityColors[result.rarity] || "#B2BEC3" }}>
                      {getRarityStars(result.rarity)}
                      <span className="ml-1">{rarityKorean[result.rarity] || "\uC77C\uBC18"}</span>
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{
                        background: `${sizeColors[fishSize]}15`,
                        color: sizeColors[fishSize],
                        border: `1px solid ${sizeColors[fishSize]}30`,
                      }}>
                      {FISH_SIZES.find(s => s.type === fishSize)?.label || "\uBCF4\uD1B5"}
                      {fishSize === "jumbo" && " \uD83C\uDF1F"}
                      {fishSize === "large" && " \u2B50"}
                    </span>
                  </div>
                  {perfectCatch && (
                    <p className="text-[10px] text-[#55EFC4] mt-1 font-bold animate-celebrate-bounce">{"\u2728"} 완벽한 낚시!</p>
                  )}
                  {treasureActive && (
                    <p className="text-[10px] text-[#FFD700] mt-0.5 font-bold animate-celebrate-bounce">{"\uD83D\uDCB0"} 보물 보너스! x2</p>
                  )}
                  <div className="flex items-center justify-center gap-4 mt-3">
                    {result.gold > 0 && (
                      <span className="text-[#FFEAA7] text-sm font-bold flex items-center gap-1">
                        <img src="/assets/icons/gold.png" alt="" className="w-4 h-4 pixel-art" />
                        +{result.gold}
                      </span>
                    )}
                    {result.gems > 0 && (
                      <span className="text-[#A29BFE] text-sm font-bold flex items-center gap-1">
                        <img src="/assets/icons/gems.png" alt="" className="w-4 h-4 pixel-art" />
                        +{result.gems}
                      </span>
                    )}
                  </div>
                  {combo > 1 && (
                    <p className="text-[10px] text-[#FFEAA7] mt-2 font-bold animate-number-pop">
                      {"\uD83D\uDD25"} {combo}{"\uC5F0\uC18D \uC131\uACF5!"} {combo >= 5 ? "\uB300\uB2E8\uD574\uC694!" : combo >= 3 ? "\uC88B\uC544\uC694!" : ""}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="game-panel rounded-2xl p-6">
                <span className="text-4xl block mb-2">{"\uD83D\uDCA8"}</span>
                <h3 className="text-[#B2BEC3] font-bold mt-1">{"\uB193\uCCE4\uC5B4\uC694..."}</h3>
                <p className="text-[#636e72] text-[10px] mt-1">{"\uCD08\uB85D \uC874\uC744 \uBB3C\uACE0\uAE30\uC5D0 \uB9DE\uCDB0\uBCF4\uC138\uC694!"}</p>
                <p className="text-[9px] text-white/20 mt-2">{"\uB0A8\uC740 \uD69F\uC218: "}{remaining}/10</p>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-xs transition font-serif-game"
                style={{ background: "rgba(44,24,16,0.6)", border: "1px solid rgba(201,168,76,0.15)", color: "rgba(245,230,200,0.5)" }}>
                닫기
              </button>
              {remaining > 0 && (
                <button onClick={startFishing} className="flex-1 minigame-btn-gold py-2.5 text-xs">
                  다시 낚시 ({remaining})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Canvas helper: filled rounded rect
function roundRectFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function roundRectStroke(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.stroke();
}
