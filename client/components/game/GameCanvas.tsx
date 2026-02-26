"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useGameStore, type Slime } from "@/lib/store/gameStore";
import { generateSlimeSvg } from "@/lib/slimeSvg";
import { EffectsManager } from "@/lib/EffectsManager";
import { getTimeOfDay, getWeather, getSkyColors, getSeason, type Weather, type TimeOfDay, type Season } from "@/lib/WeatherSystem";
import { SlimeBehaviorManager, type BehaviorEvent } from "@/lib/SlimeBehaviorManager";
import { deriveMood, moodEmojis } from "@/lib/constants";

// Behavior state for active slime behaviors
interface BehaviorState {
  type: string;
  slimeId: string;
  targetId?: string;
  startTime: number;
  duration: number;
  targetX?: number;
  targetY?: number;
  phase: number;
}

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiRef = useRef<{
    app: import("pixi.js").Application;
    sprites: Map<string, import("pixi.js").Container>;
    effectsManager: EffectsManager | null;
    effectsContainer: import("pixi.js").Container | null;
    skyGraphics: import("pixi.js").Graphics | null;
    weatherContainer: import("pixi.js").Container | null;
    speechBubbles: Map<string, { container: import("pixi.js").Container; timer: ReturnType<typeof setTimeout> }>;
    worldContainer: import("pixi.js").Container | null;
    activeBehaviors: Map<string, BehaviorState>;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const behaviorRef = useRef<SlimeBehaviorManager | null>(null);

  const slimes = useGameStore((s) => s.slimes);
  const species = useGameStore((s) => s.species);
  const equippedAccessories = useGameStore((s) => s.equippedAccessories);
  const selectSlime = useGameStore((s) => s.selectSlime);
  const levelUpInfo = useGameStore((s) => s.levelUpInfo);
  const setNurtureEffectCallback = useGameStore((s) => s.setNurtureEffectCallback);
  const setShowFishing = useGameStore((s) => s.setShowFishing);

  // Initialize PixiJS
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    const container = containerRef.current;
    const gameFrame = container.closest(".game-frame") as HTMLElement | null;
    const resizeTarget = gameFrame || container;

    (async () => {
      const PIXI = await import("pixi.js");
      if (destroyed) return;

      const app = new PIXI.Application();
      await app.init({
        background: "#080816",
        resizeTo: resizeTarget,
        antialias: true,
      });
      if (destroyed) { app.destroy(true, { children: true }); return; }

      container.appendChild(app.canvas as HTMLCanvasElement);
      const W = resizeTarget.clientWidth;
      const H = resizeTarget.clientHeight;
      const timeOfDay = getTimeOfDay();

      // ===== SKY BACKGROUND (smooth 8-band gradient) =====
      const sky = new PIXI.Graphics();
      const timeColors = getSkyColors(timeOfDay);
      const bands = 8;
      for (let b = 0; b < bands; b++) {
        const y0 = (b / bands) * H * 0.65;
        const y1 = ((b + 1) / bands) * H * 0.65;
        sky.rect(0, y0, W, y1 - y0 + 1);
        const t = b / (bands - 1);
        const topC = timeColors.top;
        const botC = timeColors.bottom;
        // Ease-in-out curve for more natural sky transition
        const ease = t * t * (3 - 2 * t);
        const r = ((topC >> 16) & 0xff) * (1 - ease) + ((botC >> 16) & 0xff) * ease;
        const g = ((topC >> 8) & 0xff) * (1 - ease) + ((botC >> 8) & 0xff) * ease;
        const bl = (topC & 0xff) * (1 - ease) + (botC & 0xff) * ease;
        sky.fill((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl));
      }
      app.stage.addChild(sky);

      // Stars (night/dusk only)
      type StarInfo = { g: import("pixi.js").Graphics; speed: number; base: number };
      const stars: StarInfo[] = [];
      const isDay = timeOfDay === "morning" || timeOfDay === "afternoon";

      // Horizon glow band
      const horizonGlow = new PIXI.Graphics();
      const hgColor = isDay ? 0xffeaa7 : timeOfDay === "dusk" ? 0xff7675 : 0x2d3436;
      const hgAlpha = isDay ? 0.12 : timeOfDay === "dusk" ? 0.15 : 0.06;
      horizonGlow.rect(0, H * 0.55, W, H * 0.12);
      horizonGlow.fill({ color: hgColor, alpha: hgAlpha });
      app.stage.addChild(horizonGlow);
      if (!isDay) {
        const starColors = [0xffffff, 0xfff5e0, 0xe8e0ff, 0xffe8e0, 0xe0f0ff];
        for (let i = 0; i < 120; i++) {
          const s = new PIXI.Graphics();
          const sz = 0.3 + Math.random() * 1.8;
          const brightness = 0.2 + Math.random() * 0.8;
          const sc = starColors[Math.floor(Math.random() * starColors.length)];
          s.circle(0, 0, sz);
          s.fill({ color: sc, alpha: brightness });
          // Soft glow for brighter stars
          if (brightness > 0.6 && sz > 1) {
            s.circle(0, 0, sz * 2.5);
            s.fill({ color: sc, alpha: 0.06 });
          }
          s.x = Math.random() * W;
          s.y = Math.random() * H * 0.55;
          app.stage.addChild(s);
          stars.push({ g: s, speed: 0.5 + Math.random() * 2, base: brightness });
        }
        // Feature cross-stars (bright, with rays)
        for (let i = 0; i < 5; i++) {
          const s = new PIXI.Graphics();
          const sx = W * 0.1 + Math.random() * W * 0.8;
          const sy = H * 0.03 + Math.random() * H * 0.25;
          const rayLen = 4 + Math.random() * 4;
          s.moveTo(sx - rayLen, sy); s.lineTo(sx + rayLen, sy);
          s.stroke({ width: 0.8, color: 0xffffff, alpha: 0.4 });
          s.moveTo(sx, sy - rayLen); s.lineTo(sx, sy + rayLen);
          s.stroke({ width: 0.8, color: 0xffffff, alpha: 0.4 });
          // Diagonal rays (smaller)
          const dr = rayLen * 0.5;
          s.moveTo(sx - dr, sy - dr); s.lineTo(sx + dr, sy + dr);
          s.stroke({ width: 0.5, color: 0xffffff, alpha: 0.2 });
          s.moveTo(sx + dr, sy - dr); s.lineTo(sx - dr, sy + dr);
          s.stroke({ width: 0.5, color: 0xffffff, alpha: 0.2 });
          s.circle(sx, sy, 1.5);
          s.fill({ color: 0xffffff, alpha: 0.8 });
          // Glow
          s.circle(sx, sy, 6);
          s.fill({ color: 0xffffff, alpha: 0.04 });
          app.stage.addChild(s);
        }
      }

      // ===== MOON (night) =====
      if (timeOfDay === "night" || timeOfDay === "dusk") {
        const moonG = new PIXI.Graphics();
        const mx = W * 0.8;
        const my = H * 0.1;
        // Outer halo glow (3 layers)
        moonG.circle(mx, my, 55);
        moonG.fill({ color: 0xf5f5dc, alpha: 0.02 });
        moonG.circle(mx, my, 40);
        moonG.fill({ color: 0xf5f5dc, alpha: 0.04 });
        moonG.circle(mx, my, 30);
        moonG.fill({ color: 0xf5f5dc, alpha: 0.06 });
        // Moon body
        moonG.circle(mx, my, 22);
        moonG.fill({ color: 0xf5f0d0, alpha: 0.95 });
        // Light rim
        moonG.circle(mx + 2, my - 1, 20);
        moonG.fill({ color: 0xfffff5, alpha: 0.3 });
        // Craters
        moonG.circle(mx - 6, my - 4, 4);
        moonG.fill({ color: 0xd8d4aa, alpha: 0.3 });
        moonG.circle(mx + 5, my + 5, 3);
        moonG.fill({ color: 0xd8d4aa, alpha: 0.25 });
        moonG.circle(mx - 2, my + 6, 2.5);
        moonG.fill({ color: 0xd8d4aa, alpha: 0.2 });
        moonG.circle(mx + 8, my - 2, 2);
        moonG.fill({ color: 0xd8d4aa, alpha: 0.18 });
        app.stage.addChild(moonG);
      }

      // Soft clouds (rich multi-blob with shadow)
      type CloudInfo = { g: import("pixi.js").Graphics; speed: number };
      const clouds: CloudInfo[] = [];
      const cloudCount = isDay ? 7 : 3;
      for (let i = 0; i < cloudCount; i++) {
        const cg = new PIXI.Graphics();
        const cx = Math.random() * W;
        const cy = H * 0.05 + Math.random() * H * 0.2;
        const cAlpha = isDay ? 0.14 + Math.random() * 0.1 : 0.05 + Math.random() * 0.02;
        const cw = 40 + Math.random() * 35;
        const ch = 12 + Math.random() * 8;
        // Shadow (slightly offset below)
        const shadowAlpha = cAlpha * 0.3;
        cg.ellipse(cx, cy + ch * 0.3, cw * 0.9, ch * 0.5);
        cg.fill({ color: isDay ? 0xb0b0c0 : 0x4a4a6a, alpha: shadowAlpha });
        // Main body — 5 overlapping blobs
        cg.ellipse(cx, cy, cw, ch);
        cg.fill({ color: 0xffffff, alpha: cAlpha });
        cg.ellipse(cx - cw * 0.45, cy + 2, cw * 0.55, ch * 0.75);
        cg.fill({ color: 0xffffff, alpha: cAlpha * 0.7 });
        cg.ellipse(cx + cw * 0.5, cy + 1, cw * 0.5, ch * 0.7);
        cg.fill({ color: 0xffffff, alpha: cAlpha * 0.7 });
        cg.ellipse(cx + cw * 0.15, cy - ch * 0.45, cw * 0.4, ch * 0.6);
        cg.fill({ color: 0xffffff, alpha: cAlpha * 0.5 });
        cg.ellipse(cx - cw * 0.2, cy - ch * 0.3, cw * 0.35, ch * 0.5);
        cg.fill({ color: 0xffffff, alpha: cAlpha * 0.45 });
        // Highlight on top
        cg.ellipse(cx - cw * 0.1, cy - ch * 0.35, cw * 0.3, ch * 0.3);
        cg.fill({ color: 0xffffff, alpha: cAlpha * 0.3 });
        app.stage.addChild(cg);
        clouds.push({ g: cg, speed: 0.02 + Math.random() * 0.06 });
      }

      // ===== SUN RAYS (daytime) =====
      const sunRayContainer = new PIXI.Container();
      if (isDay) {
        const rayCount = 7;
        for (let i = 0; i < rayCount; i++) {
          const ray = new PIXI.Graphics();
          const angle = (i / rayCount) * Math.PI * 0.6 - Math.PI * 0.15;
          const len = H * 0.5;
          ray.moveTo(0, 0);
          ray.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
          ray.stroke({ width: 2 + Math.random(), color: 0xffeaa7, alpha: 0.06 + Math.random() * 0.04 });
          ray.x = W * 0.85;
          ray.y = H * 0.05;
          sunRayContainer.addChild(ray);
        }
        app.stage.addChild(sunRayContainer);
      }

      // ===== AURORA (night) =====
      const auroraContainer = new PIXI.Container();
      if (timeOfDay === "night" || timeOfDay === "dusk") {
        const auroraColors = [0x55efc4, 0x00cec9, 0xa29bfe];
        for (let layer = 0; layer < 3; layer++) {
          const ag = new PIXI.Graphics();
          ag.moveTo(0, H * 0.05);
          for (let x = 0; x <= W; x += 4) {
            const y = H * 0.08 + Math.sin(x * 0.008 + layer * 1.5) * (H * 0.04) + Math.sin(x * 0.015 + layer) * (H * 0.02);
            ag.lineTo(x, y);
          }
          ag.lineTo(W, H * 0.2);
          ag.lineTo(0, H * 0.2);
          ag.closePath();
          ag.fill({ color: auroraColors[layer], alpha: 0.04 });
          auroraContainer.addChild(ag);
        }
        app.stage.addChild(auroraContainer);
      }

      // ===== SEASON + METEOR STATE =====
      const currentSeason: Season = getSeason();
      let meteorTimer = 15 + Math.random() * 25;
      type MeteorInfo = { g: import("pixi.js").Graphics; x: number; y: number; vx: number; vy: number; life: number; maxLife: number };
      const meteors: MeteorInfo[] = [];

      // ===== POND RIPPLE STATE =====
      type RippleInfo = { g: import("pixi.js").Graphics; life: number; maxLife: number; cx: number; cy: number };
      const ripples: RippleInfo[] = [];
      let rippleTimer = 0;

      // ===== DISTANT MOUNTAINS (layer 0 — far misty peaks) =====
      const groundY = H * 0.65;
      const mountainsFar = new PIXI.Graphics();
      mountainsFar.moveTo(0, groundY - 65);
      for (let x = 0; x <= W; x += 2) {
        const y = groundY - 65 + Math.sin(x * 0.003) * 25 + Math.sin(x * 0.008 + 1.2) * 15 + Math.sin(x * 0.018 + 3) * 8;
        mountainsFar.lineTo(x, y);
      }
      mountainsFar.lineTo(W, H);
      mountainsFar.lineTo(0, H);
      mountainsFar.closePath();
      mountainsFar.fill({ color: isDay ? 0x1a2a30 : 0x0a1418, alpha: isDay ? 0.25 : 0.35 });
      app.stage.addChild(mountainsFar);
      // Snow caps on peaks (day only)
      if (isDay) {
        const snowCaps = new PIXI.Graphics();
        for (let x = 0; x <= W; x += 2) {
          const y = groundY - 65 + Math.sin(x * 0.003) * 25 + Math.sin(x * 0.008 + 1.2) * 15 + Math.sin(x * 0.018 + 3) * 8;
          const peakThreshold = groundY - 65 - 5;
          if (y < peakThreshold) {
            snowCaps.rect(x, y, 2, (peakThreshold - y) * 0.6);
            snowCaps.fill({ color: 0xffffff, alpha: 0.1 });
          }
        }
        app.stage.addChild(snowCaps);
      }

      // ===== FAR BACKGROUND HILLS (layer 1 — mid-distant) =====
      const hillFar = new PIXI.Graphics();
      hillFar.moveTo(0, groundY - 40);
      for (let x = 0; x <= W; x += 2) {
        const y = groundY - 40 + Math.sin(x * 0.006) * 18 + Math.sin(x * 0.013 + 2) * 10 + Math.sin(x * 0.025 + 4) * 5;
        hillFar.lineTo(x, y);
      }
      hillFar.lineTo(W, H);
      hillFar.lineTo(0, H);
      hillFar.closePath();
      hillFar.fill({ color: isDay ? 0x1a3a25 : 0x0d2018, alpha: isDay ? 0.4 : 0.5 });
      app.stage.addChild(hillFar);
      // Vegetation texture on far hills
      const hillFarTex = new PIXI.Graphics();
      for (let x = 0; x <= W; x += 6) {
        const baseY = groundY - 40 + Math.sin(x * 0.006) * 18 + Math.sin(x * 0.013 + 2) * 10 + Math.sin(x * 0.025 + 4) * 5;
        const treeH = 3 + Math.random() * 5;
        hillFarTex.circle(x + Math.random() * 4, baseY - treeH * 0.5, treeH * 0.4);
        hillFarTex.fill({ color: isDay ? 0x1e4a2e : 0x102a18, alpha: 0.2 });
      }
      app.stage.addChild(hillFarTex);

      // Middle rolling hills
      const hillMid = new PIXI.Graphics();
      hillMid.moveTo(0, groundY - 15);
      for (let x = 0; x <= W; x += 2) {
        const y = groundY - 15 + Math.sin(x * 0.01 + 0.7) * 12 + Math.sin(x * 0.02 + 1.5) * 6;
        hillMid.lineTo(x, y);
      }
      hillMid.lineTo(W, H);
      hillMid.lineTo(0, H);
      hillMid.closePath();
      hillMid.fill({ color: isDay ? 0x163520 : 0x0c1c12, alpha: isDay ? 0.55 : 0.65 });
      app.stage.addChild(hillMid);

      // ===== MAIN GROUND (layer 2 — rich multi-tone grass) =====
      const ground = new PIXI.Graphics();
      ground.moveTo(0, groundY);
      for (let x = 0; x <= W; x += 2) {
        const y = groundY + Math.sin(x * 0.012 + 0.5) * 4;
        ground.lineTo(x, y);
      }
      ground.lineTo(W, H);
      ground.lineTo(0, H);
      ground.closePath();
      ground.fill({ color: isDay ? 0x122e18 : 0x0a1a0e, alpha: 0.95 });
      app.stage.addChild(ground);

      // Ground color variation (patchy grass tones)
      const groundPatches = new PIXI.Graphics();
      const patchColors = isDay
        ? [0x1a3a20, 0x163520, 0x1e4025, 0x143018, 0x1a3822]
        : [0x0c1e10, 0x0a1a0c, 0x0e220e, 0x091808, 0x0c1e0e];
      for (let i = 0; i < 12; i++) {
        const px = Math.random() * W;
        const py = groundY + 5 + Math.random() * (H - groundY - 30);
        const pw = 30 + Math.random() * 50;
        const ph = 15 + Math.random() * 25;
        groundPatches.ellipse(px, py, pw, ph);
        groundPatches.fill({ color: patchColors[i % 5], alpha: 0.2 + Math.random() * 0.15 });
      }
      app.stage.addChild(groundPatches);

      // Subtle winding path
      const pathG = new PIXI.Graphics();
      pathG.moveTo(W * 0.2, groundY + 6);
      pathG.bezierCurveTo(W * 0.35, groundY + 22, W * 0.45, groundY + 30, W * 0.55, groundY + 18);
      pathG.bezierCurveTo(W * 0.65, groundY + 8, W * 0.72, groundY + 15, W * 0.8, groundY + 10);
      pathG.lineTo(W * 0.81, groundY + 14);
      pathG.bezierCurveTo(W * 0.72, groundY + 20, W * 0.65, groundY + 13, W * 0.55, groundY + 23);
      pathG.bezierCurveTo(W * 0.45, groundY + 35, W * 0.35, groundY + 27, W * 0.19, groundY + 10);
      pathG.closePath();
      pathG.fill({ color: isDay ? 0x1e3a28 : 0x152a1a, alpha: 0.22 });
      // Path edge stones
      const pathStones = new PIXI.Graphics();
      for (let i = 0; i < 8; i++) {
        const sx = W * 0.22 + (W * 0.58 / 8) * i + Math.random() * 15;
        const sy = groundY + 8 + Math.sin(i * 1.2) * 12 + Math.random() * 5;
        pathStones.ellipse(sx, sy, 2 + Math.random() * 2, 1.5 + Math.random());
        pathStones.fill({ color: isDay ? 0x8a8a7a : 0x5a5a4a, alpha: 0.15 });
      }
      app.stage.addChild(pathG);
      app.stage.addChild(pathStones);

      // Lower ground layer (darker gradient)
      const groundLayer2 = new PIXI.Graphics();
      groundLayer2.rect(0, groundY + 20, W, H - groundY - 20);
      groundLayer2.fill({ color: isDay ? 0x0e2412 : 0x081608, alpha: 0.35 });
      app.stage.addChild(groundLayer2);
      // Even darker at bottom
      const groundLayer3 = new PIXI.Graphics();
      groundLayer3.rect(0, H - 50, W, 50);
      groundLayer3.fill({ color: isDay ? 0x0a1e0e : 0x061206, alpha: 0.25 });
      app.stage.addChild(groundLayer3);

      // Ground edge highlight (bright grass line)
      const groundLine = new PIXI.Graphics();
      groundLine.moveTo(0, groundY);
      for (let x = 0; x <= W; x += 2) {
        const y = groundY + Math.sin(x * 0.012 + 0.5) * 4;
        groundLine.lineTo(x, y);
      }
      groundLine.stroke({ width: 2, color: isDay ? 0x3a8a4a : 0x1a5a2a, alpha: 0.3 });
      app.stage.addChild(groundLine);

      // ===== GRASS CLUSTERS (layer 3 — dense, organic, varied) =====
      // Edge grass (along ground line)
      const grassClusterCount = 18;
      for (let c = 0; c < grassClusterCount; c++) {
        const clusterX = (W / (grassClusterCount + 1)) * (c + 1) + (Math.random() - 0.5) * 20;
        const clusterY = groundY + 1 + Math.random() * 3;
        const leafCount = 4 + Math.floor(Math.random() * 5);
        for (let l = 0; l < leafCount; l++) {
          const g = new PIXI.Graphics();
          const h = 6 + Math.random() * 14;
          const lx = clusterX + (Math.random() - 0.5) * 12;
          const lean = (Math.random() - 0.5) * 6;
          // Curved grass blade (quadratic bezier)
          g.moveTo(lx, clusterY);
          g.quadraticCurveTo(lx + lean * 0.5, clusterY - h * 0.6, lx + lean, clusterY - h);
          g.lineTo(lx + lean + 1.2, clusterY - h + 0.5);
          g.quadraticCurveTo(lx + lean * 0.5 + 0.8, clusterY - h * 0.6, lx + 0.8, clusterY);
          g.closePath();
          const grassColors = isDay
            ? [0x2a7a3a, 0x258a45, 0x3a8a4a, 0x2a9a4a, 0x35a050, 0x30a555, 0x288a40]
            : [0x1a5a2a, 0x1a6a3a, 0x2a5a2a, 0x1a7a3a, 0x2a7a4a, 0x206a35, 0x1a6040];
          g.fill({ color: grassColors[l % 7], alpha: 0.28 + Math.random() * 0.22 });
          app.stage.addChild(g);
        }
      }
      // Scattered grass in ground area
      for (let i = 0; i < 25; i++) {
        const gx = Math.random() * W;
        const gy = groundY + 8 + Math.random() * (H - groundY - 80);
        const g = new PIXI.Graphics();
        const h = 4 + Math.random() * 8;
        const lean = (Math.random() - 0.5) * 4;
        g.moveTo(gx, gy);
        g.lineTo(gx + lean - 0.8, gy - h);
        g.lineTo(gx + lean + 0.8, gy - h);
        g.lineTo(gx, gy);
        g.fill({ color: isDay ? 0x2a7a3a : 0x1a5a2a, alpha: 0.15 + Math.random() * 0.15 });
        app.stage.addChild(g);
      }

      // ===== DECORATION OBJECTS (layer 4) =====
      // Trees (2) — rich canopy with light dappling
      const treePositions = [W * 0.13, W * 0.85];
      type TreeInfo = { g: import("pixi.js").Graphics; pivotX: number; pivotY: number };
      const treeRefs: TreeInfo[] = [];
      for (const tx of treePositions) {
        const ty = groundY - 3;
        const tree = new PIXI.Graphics();
        // Root tendrils
        for (let r = 0; r < 3; r++) {
          const rx = tx + (r - 1) * 6;
          const rLen = 6 + Math.random() * 5;
          tree.moveTo(rx, ty + 2);
          tree.lineTo(rx + (r - 1) * 3, ty + rLen);
          tree.stroke({ width: 2, color: isDay ? 0x4a3520 : 0x2a1810, alpha: 0.3 });
        }
        // Trunk (tapered)
        tree.moveTo(tx - 5, ty + 2);
        tree.lineTo(tx - 3, ty - 38);
        tree.lineTo(tx + 3, ty - 38);
        tree.lineTo(tx + 5, ty + 2);
        tree.closePath();
        tree.fill({ color: isDay ? 0x5a4030 : 0x3a2820, alpha: 0.6 });
        // Trunk bark texture
        for (let b = 0; b < 4; b++) {
          const by = ty - 5 - b * 8;
          tree.moveTo(tx - 3, by);
          tree.lineTo(tx + 2, by - 2);
          tree.stroke({ width: 0.5, color: isDay ? 0x3a2a18 : 0x1a1208, alpha: 0.2 });
        }
        // Branch stubs
        tree.moveTo(tx - 3, ty - 28);
        tree.lineTo(tx - 14, ty - 32);
        tree.stroke({ width: 2, color: isDay ? 0x4a3525 : 0x2a1815, alpha: 0.35 });
        tree.moveTo(tx + 3, ty - 30);
        tree.lineTo(tx + 12, ty - 34);
        tree.stroke({ width: 2, color: isDay ? 0x4a3525 : 0x2a1815, alpha: 0.35 });
        // Shadow under canopy
        tree.ellipse(tx, ty + 2, 25, 5);
        tree.fill({ color: 0x000000, alpha: 0.08 });
        // Canopy — rich layered circles (7 blobs)
        const canopyColors = isDay
          ? [0x1a6a30, 0x2a7a3a, 0x2a8a45, 0x358a4a, 0x3a9a50]
          : [0x0e4a1e, 0x1a5a2a, 0x1a6a3a, 0x2a5a2a, 0x2a6a30];
        tree.circle(tx, ty - 46, 22);
        tree.fill({ color: canopyColors[0], alpha: 0.55 });
        tree.circle(tx - 14, ty - 38, 16);
        tree.fill({ color: canopyColors[1], alpha: 0.5 });
        tree.circle(tx + 14, ty - 40, 17);
        tree.fill({ color: canopyColors[2], alpha: 0.5 });
        tree.circle(tx + 2, ty - 55, 14);
        tree.fill({ color: canopyColors[3], alpha: 0.4 });
        tree.circle(tx - 8, ty - 50, 12);
        tree.fill({ color: canopyColors[1], alpha: 0.35 });
        tree.circle(tx + 10, ty - 52, 11);
        tree.fill({ color: canopyColors[4], alpha: 0.35 });
        tree.circle(tx - 18, ty - 44, 10);
        tree.fill({ color: canopyColors[2], alpha: 0.3 });
        // Light dappling (bright spots in canopy)
        if (isDay) {
          for (let d = 0; d < 5; d++) {
            const dx = tx + (Math.random() - 0.5) * 28;
            const dy = ty - 38 - Math.random() * 18;
            tree.circle(dx, dy, 2 + Math.random() * 3);
            tree.fill({ color: 0x5aaa5a, alpha: 0.12 + Math.random() * 0.08 });
          }
        }
        // Set pivot at trunk base for sway rotation
        tree.pivot.set(tx, ty);
        tree.position.set(tx, ty);
        tree.eventMode = "static";
        tree.cursor = "pointer";
        tree.on("pointerdown", () => {
          const td = tree as unknown as Record<string, number>;
          td._shakeTime = 0.5;
        });
        app.stage.addChild(tree);
        treeRefs.push({ g: tree, pivotX: tx, pivotY: ty });
      }

      // Pond (interactive → fishing) — enhanced with reflections + lily pads
      const pondX = W * 0.6;
      const pondY = groundY + 40;
      const pond = new PIXI.Graphics();
      // Muddy edge
      pond.ellipse(pondX, pondY, 28, 13);
      pond.fill({ color: isDay ? 0x2a4a30 : 0x1a2a1e, alpha: 0.25 });
      // Main water body
      pond.ellipse(pondX, pondY, 24, 11);
      pond.fill({ color: isDay ? 0x1a4a7a : 0x102a4a, alpha: 0.4 });
      // Lighter center
      pond.ellipse(pondX - 2, pondY - 1, 14, 6);
      pond.fill({ color: isDay ? 0x3a7aaa : 0x2a5a7a, alpha: 0.25 });
      // Surface highlight (reflection)
      pond.ellipse(pondX + 4, pondY - 3, 8, 3);
      pond.fill({ color: 0xffffff, alpha: isDay ? 0.1 : 0.05 });
      // Lily pads
      for (let lp = 0; lp < 3; lp++) {
        const lpx = pondX + [-10, 8, -2][lp];
        const lpy = pondY + [-2, 3, -5][lp];
        pond.ellipse(lpx, lpy, 4, 2.5);
        pond.fill({ color: isDay ? 0x2a7a3a : 0x1a5a2a, alpha: 0.3 });
        // Tiny flower on one lily pad
        if (lp === 0) {
          pond.circle(lpx + 1, lpy - 1.5, 1.5);
          pond.fill({ color: 0xff9ff3, alpha: 0.35 });
        }
      }
      // Hit area for click
      const pondHit = new PIXI.Graphics();
      pondHit.ellipse(pondX, pondY, 30, 16);
      pondHit.fill({ color: 0x000000, alpha: 0.001 });
      pond.addChild(pondHit);
      pond.eventMode = "static";
      pond.cursor = "pointer";
      pond.on("pointerdown", () => { setShowFishing(true); });
      app.stage.addChild(pond);

      // Bench (interactive)
      const benchX = W * 0.42;
      const benchY = groundY + 22;
      const bench = new PIXI.Graphics();
      // Legs
      bench.rect(benchX - 10, benchY, 2, 6);
      bench.fill({ color: 0x5a4030, alpha: 0.4 });
      bench.rect(benchX + 8, benchY, 2, 6);
      bench.fill({ color: 0x5a4030, alpha: 0.4 });
      // Seat
      bench.rect(benchX - 12, benchY - 1, 24, 3);
      bench.fill({ color: 0x6a5040, alpha: 0.5 });
      // Back
      bench.rect(benchX - 11, benchY - 7, 22, 2);
      bench.fill({ color: 0x6a5040, alpha: 0.4 });
      bench.eventMode = "static";
      bench.cursor = "pointer";
      app.stage.addChild(bench);

      // Lamp posts (2) — interactive toggle
      const lampPositions = [W * 0.28, W * 0.72];
      const lampStates: { g: import("pixi.js").Graphics; on: boolean; lx: number; ly: number }[] = [];
      for (const lx of lampPositions) {
        const ly = groundY + 2;
        const isNight = timeOfDay === "night" || timeOfDay === "dusk";
        const lamp = new PIXI.Graphics();
        const drawLamp = (on: boolean) => {
          lamp.clear();
          lamp.rect(lx - 1.5, ly - 32, 3, 34);
          lamp.fill({ color: 0x4a4a4a, alpha: 0.4 });
          lamp.circle(lx, ly - 34, 5);
          lamp.fill({ color: on ? 0xffeaa7 : 0x888888, alpha: on ? 0.6 : 0.2 });
          if (on) {
            lamp.circle(lx, ly - 34, 12);
            lamp.fill({ color: 0xffeaa7, alpha: 0.08 });
          }
        };
        drawLamp(isNight);
        lamp.eventMode = "static";
        lamp.cursor = "pointer";
        const ls = { g: lamp, on: isNight, lx, ly };
        lamp.on("pointerdown", () => {
          ls.on = !ls.on;
          drawLamp(ls.on);
        });
        lampStates.push(ls);
        app.stage.addChild(lamp);
      }

      // Bushes (7) — multi-blob with depth
      for (let i = 0; i < 7; i++) {
        const bx = W * (0.06 + Math.random() * 0.88);
        const by = groundY + 6 + Math.random() * 38;
        const bush = new PIXI.Graphics();
        const bushColors = isDay
          ? [0x2a6a3a, 0x3a7a4a, 0x2a8a3a, 0x3a6a4a, 0x2a7a38, 0x228a40, 0x307a35]
          : [0x1a4a2a, 0x2a5a3a, 0x1a6a2a, 0x2a4a3a, 0x1a5a30, 0x185a28, 0x1e5a30];
        // Shadow
        bush.ellipse(bx, by + 3, 14 + Math.random() * 5, 3);
        bush.fill({ color: 0x000000, alpha: 0.05 });
        // Main bush body (3-4 overlapping blobs)
        const blobCount = 3 + Math.floor(Math.random() * 2);
        for (let b = 0; b < blobCount; b++) {
          const ox = (b - blobCount / 2) * 6;
          const oy = Math.random() * -3;
          bush.ellipse(bx + ox, by + oy, 10 + Math.random() * 5, 6 + Math.random() * 3);
          bush.fill({ color: bushColors[(i + b) % bushColors.length], alpha: 0.25 + Math.random() * 0.1 });
        }
        // Highlight blob on top
        bush.ellipse(bx - 2, by - 4, 6, 3);
        bush.fill({ color: isDay ? 0x3a9a4a : 0x2a6a3a, alpha: 0.15 });
        // Optional berry dots
        if (Math.random() < 0.4) {
          for (let d = 0; d < 3; d++) {
            bush.circle(bx + (Math.random() - 0.5) * 14, by - 2 + Math.random() * 4, 1);
            bush.fill({ color: [0xff6b6b, 0xa29bfe, 0xffeaa7][d], alpha: 0.25 });
          }
        }
        app.stage.addChild(bush);
      }

      // ===== FLOWERS (layer 5) — rich variety: 4-petal, 5-petal, tulips, daisies =====
      const flowerColors = [0xff9ff3, 0x74b9ff, 0xffeaa7, 0xff6b6b, 0xa29bfe, 0x55efc4, 0xfd79a8, 0x81ecec, 0xfdcb6e, 0x6c5ce7, 0xffb8d0, 0xb8e986, 0xf0a5ff, 0xffa07a, 0x87ceeb];
      for (let i = 0; i < 18; i++) {
        const fx = Math.random() * W;
        const fy = groundY + 5 + Math.random() * 40;
        const f = new PIXI.Graphics();
        const fc = flowerColors[i % flowerColors.length];
        const flowerType = i % 4;
        // Stem (all types)
        const stemH = 3 + Math.random() * 5;
        f.moveTo(fx, fy + 2);
        f.lineTo(fx + (Math.random() - 0.5), fy + 2 + stemH);
        f.stroke({ width: 0.6, color: isDay ? 0x2a6a2a : 0x1a4a1a, alpha: 0.3 });

        if (flowerType === 0) {
          // 4-petal flower
          const ps = 2.2 + Math.random();
          f.ellipse(fx, fy - ps, ps * 0.55, ps);
          f.fill({ color: fc, alpha: 0.45 });
          f.ellipse(fx, fy + ps, ps * 0.55, ps);
          f.fill({ color: fc, alpha: 0.45 });
          f.ellipse(fx - ps, fy, ps, ps * 0.55);
          f.fill({ color: fc, alpha: 0.45 });
          f.ellipse(fx + ps, fy, ps, ps * 0.55);
          f.fill({ color: fc, alpha: 0.45 });
          f.circle(fx, fy, 1.2);
          f.fill({ color: 0xffeaa7, alpha: 0.5 });
        } else if (flowerType === 1) {
          // 5-petal flower
          const ps = 2 + Math.random();
          for (let p = 0; p < 5; p++) {
            const angle = (p / 5) * Math.PI * 2 - Math.PI / 2;
            f.ellipse(fx + Math.cos(angle) * ps, fy + Math.sin(angle) * ps, ps * 0.5, ps * 0.9);
            f.fill({ color: fc, alpha: 0.4 });
          }
          f.circle(fx, fy, 1.5);
          f.fill({ color: 0xffffff, alpha: 0.4 });
        } else if (flowerType === 2) {
          // Tulip (cup shape)
          f.moveTo(fx - 2.5, fy);
          f.quadraticCurveTo(fx - 3, fy - 4, fx, fy - 5);
          f.quadraticCurveTo(fx + 3, fy - 4, fx + 2.5, fy);
          f.closePath();
          f.fill({ color: fc, alpha: 0.45 });
        } else {
          // Daisy (small with many petals)
          const ps = 1.5;
          for (let p = 0; p < 7; p++) {
            const angle = (p / 7) * Math.PI * 2;
            f.ellipse(fx + Math.cos(angle) * ps * 1.2, fy + Math.sin(angle) * ps * 1.2, ps * 0.4, ps * 0.8);
            f.fill({ color: 0xffffff, alpha: 0.35 });
          }
          f.circle(fx, fy, 1.2);
          f.fill({ color: 0xffd700, alpha: 0.5 });
        }
        app.stage.addChild(f);
      }

      // Mushrooms (detailed with spots and glow)
      for (let i = 0; i < 6; i++) {
        const mx = W * 0.06 + Math.random() * W * 0.88;
        const my = groundY + 10 + Math.random() * 40;
        const m = new PIXI.Graphics();
        const capColors = [0xff6b6b, 0xa29bfe, 0x55efc4, 0xffeaa7, 0xfd79a8, 0x74b9ff];
        // Stem
        m.moveTo(mx - 2, my);
        m.lineTo(mx - 1.5, my - 5);
        m.lineTo(mx + 1.5, my - 5);
        m.lineTo(mx + 2, my);
        m.closePath();
        m.fill({ color: 0xd4c5a0, alpha: 0.3 });
        // Cap
        m.ellipse(mx, my - 5.5, 5.5 + Math.random() * 2, 3.5);
        m.fill({ color: capColors[i], alpha: 0.28 });
        // Spots on cap
        m.circle(mx - 2, my - 6.5, 1);
        m.fill({ color: 0xffffff, alpha: 0.18 });
        m.circle(mx + 2.5, my - 5.5, 0.8);
        m.fill({ color: 0xffffff, alpha: 0.15 });
        // Subtle glow (night only)
        if (!isDay) {
          m.circle(mx, my - 5, 8);
          m.fill({ color: capColors[i], alpha: 0.03 });
        }
        app.stage.addChild(m);
      }

      // Rocks and pebbles
      for (let i = 0; i < 6; i++) {
        const rx = Math.random() * W;
        const ry = groundY + 12 + Math.random() * 40;
        const rock = new PIXI.Graphics();
        const rw = 3 + Math.random() * 5;
        const rh = 2 + Math.random() * 3;
        rock.ellipse(rx, ry, rw, rh);
        rock.fill({ color: isDay ? 0x7a7a6a : 0x4a4a3a, alpha: 0.2 });
        // Highlight
        rock.ellipse(rx - rw * 0.2, ry - rh * 0.3, rw * 0.5, rh * 0.4);
        rock.fill({ color: isDay ? 0x9a9a8a : 0x6a6a5a, alpha: 0.1 });
        app.stage.addChild(rock);
      }

      // ===== WORLD CONTAINER for slimes (depth sorting) =====
      const worldContainer = new PIXI.Container();
      worldContainer.sortableChildren = true;
      app.stage.addChild(worldContainer);

      // ===== WEATHER PARTICLES CONTAINER =====
      const weatherContainer = new PIXI.Container();
      app.stage.addChild(weatherContainer);

      // ===== FLOATING PARTICLES =====
      type ParticleInfo = { g: import("pixi.js").Graphics; vy: number; vx: number; life: number; maxLife: number };
      const particles: ParticleInfo[] = [];
      const particleContainer = new PIXI.Container();
      app.stage.addChild(particleContainer);

      // ===== AMBIENT PARTICLES =====
      type AmbientParticle = { g: import("pixi.js").Graphics; vx: number; vy: number; life: number; maxLife: number; type: string };
      const ambientParticles: AmbientParticle[] = [];
      const ambientContainer = new PIXI.Container();
      app.stage.addChild(ambientContainer);

      // ===== EFFECTS LAYER =====
      const effectsContainer = new PIXI.Container();
      app.stage.addChild(effectsContainer);
      const effectsManager = new EffectsManager(effectsContainer);
      await effectsManager.init();

      // ===== WEATHER PARTICLES STATE =====
      type WeatherParticle = { g: import("pixi.js").Graphics; vy: number; vx: number };
      const weatherParticles: WeatherParticle[] = [];
      let currentWeather: Weather = getWeather();
      let currentTimeOfDay: TimeOfDay = timeOfDay;

      // ===== ACTIVE BEHAVIORS =====
      const activeBehaviors = new Map<string, BehaviorState>();

      // ===== TICKER =====
      let skyUpdateTimer = 0;
      app.ticker.add((ticker) => {
        if (!pixiRef.current) return;
        const dt = ticker.deltaTime;
        const t = Date.now() * 0.001;

        // Update sky color every 60 seconds
        skyUpdateTimer += dt;
        if (skyUpdateTimer > 3600) {
          skyUpdateTimer = 0;
          currentTimeOfDay = getTimeOfDay();
          const newColors = getSkyColors(currentTimeOfDay);
          sky.clear();
          sky.rect(0, 0, W, H * 0.5);
          sky.fill(newColors.top);
          sky.rect(0, H * 0.5, W, H * 0.5);
          sky.fill(newColors.bottom);
          currentWeather = getWeather();
        }

        // Twinkle stars
        for (const s of stars) {
          s.g.alpha = s.base * (0.5 + Math.sin(t * s.speed + s.g.x * 0.01) * 0.5);
        }

        // Drift clouds
        for (const c of clouds) {
          c.g.x += c.speed * dt;
          if (c.g.x > W + 60) c.g.x = -60;
        }

        // Rotate sun rays slowly
        if (isDay) {
          sunRayContainer.rotation += 0.0002 * dt;
        }

        // Animate aurora wave
        if (timeOfDay === "night" || timeOfDay === "dusk") {
          for (let i = 0; i < auroraContainer.children.length; i++) {
            const ag = auroraContainer.children[i] as import("pixi.js").Graphics;
            ag.alpha = 0.03 + Math.sin(t * 0.3 + i * 1.2) * 0.02;
          }
        }

        // ===== METEOR (night, every 15-40s) =====
        if (currentTimeOfDay === "night" || currentTimeOfDay === "dusk") {
          meteorTimer -= dt / 60;
          if (meteorTimer <= 0) {
            meteorTimer = 15 + Math.random() * 25;
            const mg = new PIXI.Graphics();
            const mx = Math.random() * W * 0.7 + W * 0.1;
            const my = Math.random() * H * 0.15;
            mg.moveTo(0, 0);
            mg.lineTo(-30, -12);
            mg.stroke({ width: 1.5, color: 0xffffff, alpha: 0.8 });
            mg.moveTo(-30, -12);
            mg.lineTo(-60, -24);
            mg.stroke({ width: 0.5, color: 0xffffff, alpha: 0.3 });
            mg.x = mx;
            mg.y = my;
            app.stage.addChild(mg);
            meteors.push({ g: mg, x: mx, y: my, vx: 4, vy: 1.6, life: 0, maxLife: 40 });
          }
        }
        // Update meteors
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          m.life += dt;
          m.g.x += m.vx * dt;
          m.g.y += m.vy * dt;
          m.g.alpha = Math.max(0, 1 - m.life / m.maxLife);
          if (m.life >= m.maxLife) {
            app.stage.removeChild(m.g);
            m.g.destroy();
            meteors.splice(i, 1);
          }
        }

        // ===== POND RIPPLES (enhanced with double rings) =====
        rippleTimer += dt;
        if (rippleTimer > 50 + Math.random() * 35) {
          rippleTimer = 0;
          const rg = new PIXI.Graphics();
          const rx = pondX + (Math.random() - 0.5) * 18;
          const ry = pondY + (Math.random() - 0.5) * 7;
          app.stage.addChild(rg);
          ripples.push({ g: rg, life: 0, maxLife: 90, cx: rx, cy: ry });
        }
        for (let i = ripples.length - 1; i >= 0; i--) {
          const rp = ripples[i];
          rp.life += dt;
          const prog = rp.life / rp.maxLife;
          rp.g.clear();
          // Outer ring
          const radius1 = 3 + prog * 16;
          rp.g.ellipse(rp.cx, rp.cy, radius1, radius1 * 0.42);
          rp.g.stroke({ width: 0.6, color: 0x74b9ff, alpha: 0.2 * (1 - prog) });
          // Inner ring (delayed)
          if (prog > 0.15) {
            const innerProg = (prog - 0.15) / 0.85;
            const radius2 = 2 + innerProg * 10;
            rp.g.ellipse(rp.cx, rp.cy, radius2, radius2 * 0.42);
            rp.g.stroke({ width: 0.4, color: 0x81ecec, alpha: 0.15 * (1 - innerProg) });
          }
          if (rp.life >= rp.maxLife) {
            app.stage.removeChild(rp.g);
            rp.g.destroy();
            ripples.splice(i, 1);
          }
        }

        // ===== TREE SWAY (wind weather or gentle) =====
        for (const tr of treeRefs) {
          const td = tr.g as unknown as Record<string, number>;
          const swayAmount = currentWeather === "storm" ? 0.06 : currentWeather === "fog" ? 0.03 : 0.015;
          tr.g.rotation = Math.sin(t * 0.8 + tr.pivotX * 0.01) * swayAmount;
          // Tree click shake
          if (td._shakeTime && td._shakeTime > 0) {
            td._shakeTime -= dt / 60;
            tr.g.rotation += Math.sin(td._shakeTime * 40) * 0.08;
          }
        }

        // ===== SEASONAL PARTICLES =====
        // Spring: cherry blossom petals
        if (currentSeason === "spring" && Math.random() < 0.02) {
          const pg = new PIXI.Graphics();
          pg.ellipse(0, 0, 2.5, 1.5);
          pg.fill({ color: [0xffb8d0, 0xff9ff3, 0xffc0cb][Math.floor(Math.random() * 3)], alpha: 0.5 });
          pg.x = Math.random() * W;
          pg.y = -5;
          ambientContainer.addChild(pg);
          ambientParticles.push({
            g: pg,
            vx: 0.2 + Math.random() * 0.3,
            vy: 0.3 + Math.random() * 0.4,
            life: 0,
            maxLife: 250 + Math.random() * 100,
            type: "cherry_blossom",
          });
        }
        // Winter: snow flurry (extra, on top of weather snow)
        if (currentSeason === "winter" && Math.random() < 0.03) {
          const sg = new PIXI.Graphics();
          sg.circle(0, 0, 1 + Math.random() * 1.5);
          sg.fill({ color: 0xffffff, alpha: 0.35 + Math.random() * 0.2 });
          sg.x = Math.random() * W;
          sg.y = -3;
          ambientContainer.addChild(sg);
          ambientParticles.push({
            g: sg,
            vx: (Math.random() - 0.5) * 0.4,
            vy: 0.3 + Math.random() * 0.5,
            life: 0,
            maxLife: 200 + Math.random() * 100,
            type: "seasonal_snow",
          });
        }
        // Autumn: red/orange leaves
        if (currentSeason === "autumn" && Math.random() < 0.015) {
          const lg = new PIXI.Graphics();
          lg.ellipse(0, 0, 3, 1.5);
          lg.fill({ color: [0xcc4422, 0xdd6633, 0xbb3311, 0xe08040][Math.floor(Math.random() * 4)], alpha: 0.45 });
          lg.x = Math.random() * W;
          lg.y = -5;
          ambientContainer.addChild(lg);
          ambientParticles.push({
            g: lg,
            vx: 0.2 + Math.random() * 0.4,
            vy: 0.4 + Math.random() * 0.4,
            life: 0,
            maxLife: 220,
            type: "leaf",
          });
        }

        // ===== FIREFLIES (night/dusk) =====
        if ((currentTimeOfDay === "night" || currentTimeOfDay === "dusk") && Math.random() < 0.025) {
          const fg = new PIXI.Graphics();
          fg.circle(0, 0, 1.5);
          fg.fill({ color: 0xffeaa7, alpha: 0.6 });
          fg.circle(0, 0, 4);
          fg.fill({ color: 0xffeaa7, alpha: 0.08 });
          fg.x = Math.random() * W;
          fg.y = groundY + Math.random() * (H - groundY - 60);
          ambientContainer.addChild(fg);
          ambientParticles.push({
            g: fg,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.2,
            life: 0,
            maxLife: 180 + Math.random() * 120,
            type: "firefly",
          });
        }

        // ===== BUTTERFLIES (day) =====
        if ((currentTimeOfDay === "morning" || currentTimeOfDay === "afternoon") && Math.random() < 0.008) {
          const bg = new PIXI.Graphics();
          const bColor = [0xff9ff3, 0x74b9ff, 0xffeaa7, 0xa29bfe, 0x55efc4][Math.floor(Math.random() * 5)];
          // Wings
          bg.ellipse(-2.5, 0, 2.5, 3.5);
          bg.fill({ color: bColor, alpha: 0.45 });
          bg.ellipse(2.5, 0, 2.5, 3.5);
          bg.fill({ color: bColor, alpha: 0.45 });
          // Body
          bg.ellipse(0, 0, 0.8, 2);
          bg.fill({ color: 0x333333, alpha: 0.3 });
          bg.x = Math.random() * W;
          bg.y = groundY - 10 + Math.random() * 40;
          ambientContainer.addChild(bg);
          ambientParticles.push({
            g: bg,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.3,
            life: 0,
            maxLife: 250 + Math.random() * 100,
            type: "butterfly",
          });
        }

        // ===== FLOATING DUST MOTES (all times) =====
        if (Math.random() < 0.012) {
          const dg = new PIXI.Graphics();
          const dSize = 0.5 + Math.random() * 1;
          dg.circle(0, 0, dSize);
          dg.fill({ color: isDay ? 0xffffff : 0xffeaa7, alpha: 0.15 + Math.random() * 0.1 });
          dg.x = Math.random() * W;
          dg.y = groundY - 20 + Math.random() * 60;
          ambientContainer.addChild(dg);
          ambientParticles.push({
            g: dg,
            vx: (Math.random() - 0.5) * 0.15,
            vy: -0.05 - Math.random() * 0.1,
            life: 0,
            maxLife: 200 + Math.random() * 100,
            type: "dust",
          });
        }

        // ===== ANIMATE AMBIENT PARTICLES (firefly pulse, butterfly flutter) =====
        for (const ap of ambientParticles) {
          if (ap.type === "firefly") {
            const pulse = 0.3 + Math.sin(t * 3 + ap.g.x * 0.1) * 0.7;
            ap.g.alpha = pulse;
            // Gentle wander
            ap.vx += (Math.random() - 0.5) * 0.02;
            ap.vy += (Math.random() - 0.5) * 0.02;
            ap.vx = Math.max(-0.4, Math.min(0.4, ap.vx));
            ap.vy = Math.max(-0.3, Math.min(0.3, ap.vy));
          } else if (ap.type === "butterfly") {
            // Fluttering motion
            ap.g.scale.y = 0.4 + Math.abs(Math.sin(t * 5 + ap.g.x)) * 0.6;
            ap.vx += (Math.random() - 0.5) * 0.03;
            ap.vy += (Math.random() - 0.5) * 0.02;
            ap.vx = Math.max(-0.6, Math.min(0.6, ap.vx));
            ap.vy = Math.max(-0.4, Math.min(0.4, ap.vy));
          }
        }

        // === Collision avoidance: push slimes apart ===
        const spriteEntries = Array.from(pixiRef.current.sprites.entries());
        const separationDist = 65; // min distance between slime centers
        // Safe bounds for slimes (match placement zones)
        const boundsLeft = 70;
        const boundsRight = W - 120;
        const boundsTop = Math.max(H * 0.65 - 15, 110);
        const boundsBottom = H - 140;

        for (let i = 0; i < spriteEntries.length; i++) {
          const [, sprA] = spriteEntries[i];
          for (let j = i + 1; j < spriteEntries.length; j++) {
            const [, sprB] = spriteEntries[j];
            const dx = sprA.x - sprB.x;
            const dy = sprA.y - sprB.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < separationDist && dist > 0.1) {
              const overlap = (separationDist - dist) * 0.5;
              const nx = dx / dist;
              const ny = dy / dist;
              const push = overlap * 0.15 * dt;
              sprA.x += nx * push;
              sprA.y += ny * push * 0.4;
              sprB.x -= nx * push;
              sprB.y -= ny * push * 0.4;
              // Update base Y for both
              const dA = sprA as unknown as Record<string, number>;
              const dB = sprB as unknown as Record<string, number>;
              if (dA._baseY !== undefined) dA._baseY = sprA.y;
              if (dB._baseY !== undefined) dB._baseY = sprB.y;
            }
          }
        }

        // === Clamp all slimes to safe bounds (prevent UI overlap & canvas escape) ===
        for (const [, spr] of spriteEntries) {
          const sd = spr as unknown as Record<string, number>;
          spr.x = Math.max(boundsLeft, Math.min(boundsRight, spr.x));
          if (sd._baseY !== undefined) {
            sd._baseY = Math.max(boundsTop, Math.min(boundsBottom, sd._baseY));
          }
        }

        // Slime idle animation + behavior execution
        pixiRef.current.sprites.forEach((sprite, slimeId) => {
          const d = sprite as unknown as Record<string, number>;
          if (d._animTime === undefined) return;
          d._animTime += dt * 0.025;

          // Check active behavior
          const behavior = activeBehaviors.get(slimeId);
          if (behavior) {
            const elapsed = Date.now() - behavior.startTime;
            const progress = Math.min(elapsed / behavior.duration, 1);

            switch (behavior.type) {
              case "sleep": {
                // Squish down + Z particles handled by speech bubble
                const squishY = Math.sin(d._animTime * 0.4) * 1.5;
                sprite.scale.set(1.06, 0.92 + squishY * 0.01);
                sprite.y = d._baseY + 2;
                break;
              }
              case "move":
              case "explore_wander": {
                if (behavior.targetX !== undefined && behavior.targetY !== undefined) {
                  const dx = behavior.targetX - sprite.x;
                  const dy = behavior.targetY - sprite.y;
                  sprite.x += dx * 0.012 * dt;
                  sprite.y += dy * 0.012 * dt;
                  d._baseY = sprite.y;
                  sprite.scale.x = dx < 0 ? -Math.abs(sprite.scale.x) : Math.abs(sprite.scale.x);
                }
                break;
              }
              case "chase": {
                const target = behavior.targetId ? pixiRef.current?.sprites.get(behavior.targetId) : null;
                if (target) {
                  const dx = target.x - sprite.x;
                  const dy = target.y - sprite.y;
                  sprite.x += dx * 0.018 * dt;
                  sprite.y += dy * 0.01 * dt;
                  d._baseY = sprite.y;
                  sprite.scale.x = dx < 0 ? -Math.abs(sprite.scale.x) : Math.abs(sprite.scale.x);
                }
                break;
              }
              case "dance": {
                // Side-to-side sway + rhythmic bouncing
                const bounce = Math.sin(d._animTime * 2.5) * 5;
                const sway = Math.sin(d._animTime * 1.5) * 0.08;
                const sideStep = Math.sin(d._animTime * 1.2) * 3;
                sprite.y = d._baseY + bounce;
                sprite.rotation = sway;
                sprite.x += sideStep * 0.02 * dt;
                // Squish effect
                const danceSquash = Math.sin(d._animTime * 2.5) * 0.04;
                sprite.scale.set(1 + danceSquash, 1 - danceSquash);
                break;
              }
              case "backflip": {
                // Full rotation backward with jump arc
                const jumpArc = Math.sin(progress * Math.PI) * 30;
                sprite.y = d._baseY - jumpArc;
                sprite.rotation = -progress * Math.PI * 2; // full 360 rotation
                // Stretch during peak
                const stretch = Math.sin(progress * Math.PI) * 0.15;
                sprite.scale.set(1 - stretch * 0.5, 1 + stretch);
                break;
              }
              case "eat": {
                const chomp = Math.sin(d._animTime * 4) * 0.03;
                sprite.scale.set(1 + chomp, 1 - chomp);
                break;
              }
              case "play_jump": {
                const jumpH = Math.sin(progress * Math.PI) * 25;
                sprite.y = d._baseY - jumpH;
                break;
              }
              case "group_huddle": {
                if (behavior.targetX !== undefined && behavior.targetY !== undefined) {
                  const dx = behavior.targetX - sprite.x;
                  const dy = behavior.targetY - sprite.y;
                  sprite.x += dx * 0.015 * dt;
                  sprite.y += dy * 0.015 * dt;
                  d._baseY = sprite.y;
                }
                break;
              }
            }

            if (progress >= 1) {
              activeBehaviors.delete(slimeId);
              sprite.rotation = 0;
              sprite.scale.set(1, 1);
            }
          } else {
            // Normal idle animation — gentle breathing
            const breathOffset = Math.sin(d._animTime) * 2.5;
            let jumpOffset = 0;
            const jumpPhase = (d._animTime * 0.2 + d._jumpSeed) % (Math.PI * 2);
            if (jumpPhase < 0.2) {
              jumpOffset = -Math.sin(jumpPhase / 0.2 * Math.PI) * 7;
            }

            sprite.y = d._baseY + breathOffset + jumpOffset;

            const breathScale = Math.sin(d._animTime * 0.6) * 0.015;
            const squash = Math.sin(d._animTime * 0.9) * 0.01;
            sprite.scale.set(1 + breathScale + squash, 1 + breathScale - squash);
          }

          // Depth sorting by Y
          sprite.zIndex = Math.floor(sprite.y);
        });

        // Spawn weather particles
        if (currentWeather === "rain" || currentWeather === "storm") {
          const spawnRate = currentWeather === "storm" ? 0.2 : 0.1;
          if (Math.random() < spawnRate) {
            const wg = new PIXI.Graphics();
            wg.rect(0, 0, 1, 6 + Math.random() * 4);
            wg.fill({ color: 0x74b9ff, alpha: 0.3 + Math.random() * 0.2 });
            wg.x = Math.random() * W;
            wg.y = -10;
            weatherContainer.addChild(wg);
            weatherParticles.push({
              g: wg,
              vy: 4 + Math.random() * 3,
              vx: currentWeather === "storm" ? -1 - Math.random() : -0.3,
            });
          }
        } else if (currentWeather === "snow") {
          if (Math.random() < 0.05) {
            const wg = new PIXI.Graphics();
            wg.circle(0, 0, 1 + Math.random() * 2);
            wg.fill({ color: 0xffffff, alpha: 0.4 + Math.random() * 0.3 });
            wg.x = Math.random() * W;
            wg.y = -5;
            weatherContainer.addChild(wg);
            weatherParticles.push({
              g: wg,
              vy: 0.5 + Math.random() * 1,
              vx: (Math.random() - 0.5) * 0.5,
            });
          }
        }

        // Update weather particles
        for (let i = weatherParticles.length - 1; i >= 0; i--) {
          const wp = weatherParticles[i];
          wp.g.y += wp.vy * dt;
          wp.g.x += wp.vx * dt;
          if (wp.g.y > H || wp.g.x < -10 || wp.g.x > W + 10) {
            weatherContainer.removeChild(wp.g);
            wp.g.destroy();
            weatherParticles.splice(i, 1);
          }
        }

        // ===== AMBIENT PARTICLES =====
        // Butterflies (daytime, near flowers)
        if ((currentTimeOfDay === "morning" || currentTimeOfDay === "afternoon") && Math.random() < 0.005) {
          const bg = new PIXI.Graphics();
          const bx = Math.random() * W;
          const by = groundY + Math.random() * 30;
          const bColor = [0xff9ff3, 0xffeaa7, 0x74b9ff, 0x55efc4][Math.floor(Math.random() * 4)];
          // Butterfly wings
          bg.ellipse(-3, 0, 3, 2);
          bg.fill({ color: bColor, alpha: 0.5 });
          bg.ellipse(3, 0, 3, 2);
          bg.fill({ color: bColor, alpha: 0.5 });
          bg.circle(0, 0, 0.8);
          bg.fill({ color: 0x333333, alpha: 0.5 });
          bg.x = bx;
          bg.y = by;
          ambientContainer.addChild(bg);
          ambientParticles.push({
            g: bg,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.1 - Math.random() * 0.2,
            life: 0,
            maxLife: 200 + Math.random() * 100,
            type: "butterfly",
          });
        }

        // Fireflies (nighttime)
        if ((currentTimeOfDay === "night" || currentTimeOfDay === "dusk") && Math.random() < 0.015) {
          const fg = new PIXI.Graphics();
          const fx = Math.random() * W;
          const fy = groundY - 10 + Math.random() * 40;
          fg.circle(0, 0, 1.5);
          fg.fill({ color: 0xaaff00, alpha: 0.6 });
          fg.x = fx;
          fg.y = fy;
          ambientContainer.addChild(fg);
          ambientParticles.push({
            g: fg,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.15,
            life: 0,
            maxLife: 150 + Math.random() * 100,
            type: "firefly",
          });
        }

        // Falling leaves (wind weather)
        if (currentWeather === "fog" && Math.random() < 0.01) {
          const lg = new PIXI.Graphics();
          lg.ellipse(0, 0, 3, 1.5);
          lg.fill({ color: [0x8a6a3a, 0x6a8a3a, 0xaa6a2a][Math.floor(Math.random() * 3)], alpha: 0.4 });
          lg.x = Math.random() * W;
          lg.y = -5;
          ambientContainer.addChild(lg);
          ambientParticles.push({
            g: lg,
            vx: 0.3 + Math.random() * 0.3,
            vy: 0.5 + Math.random() * 0.5,
            life: 0,
            maxLife: 200,
            type: "leaf",
          });
        }

        // Update ambient particles
        for (let i = ambientParticles.length - 1; i >= 0; i--) {
          const ap = ambientParticles[i];
          ap.life += dt;
          const ratio = ap.life / ap.maxLife;

          if (ap.type === "butterfly") {
            ap.g.x += (ap.vx + Math.sin(ap.life * 0.05) * 0.3) * dt;
            ap.g.y += (ap.vy + Math.sin(ap.life * 0.08) * 0.2) * dt;
            // Wing flap
            const wingScale = 0.7 + Math.sin(ap.life * 0.3) * 0.3;
            ap.g.scale.set(wingScale, 1);
          } else if (ap.type === "firefly") {
            ap.g.x += (ap.vx + Math.sin(ap.life * 0.03) * 0.2) * dt;
            ap.g.y += (ap.vy + Math.cos(ap.life * 0.04) * 0.15) * dt;
            // Pulsing
            ap.g.alpha = 0.3 + Math.sin(ap.life * 0.1) * 0.4;
          } else if (ap.type === "leaf") {
            ap.g.x += (ap.vx + Math.sin(ap.life * 0.04) * 0.5) * dt;
            ap.g.y += ap.vy * dt;
            ap.g.rotation += 0.02 * dt;
          } else if (ap.type === "cherry_blossom") {
            ap.g.x += (ap.vx + Math.sin(ap.life * 0.06) * 0.4) * dt;
            ap.g.y += ap.vy * dt;
            ap.g.rotation += 0.03 * dt;
          } else if (ap.type === "seasonal_snow") {
            ap.g.x += (ap.vx + Math.sin(ap.life * 0.03) * 0.2) * dt;
            ap.g.y += ap.vy * dt;
          }

          // Fade out
          if (ratio > 0.8) {
            ap.g.alpha *= 0.97;
          }

          if (ap.life >= ap.maxLife || ap.g.y > H + 10 || ap.g.x > W + 20 || ap.g.x < -20) {
            ambientContainer.removeChild(ap.g);
            ap.g.destroy();
            ambientParticles.splice(i, 1);
          }
        }

        // Spawn floating ambient particles (original behavior)
        if (Math.random() < 0.03) {
          const pg = new PIXI.Graphics();
          const px = Math.random() * W;
          const py = H * 0.5 + Math.random() * H * 0.35;
          const pcolors = [0x55efc4, 0x74b9ff, 0xa29bfe, 0xffeaa7];
          pg.circle(0, 0, 0.8 + Math.random() * 1.5);
          pg.fill({ color: pcolors[Math.floor(Math.random() * pcolors.length)], alpha: 0.5 });
          pg.x = px; pg.y = py;
          particleContainer.addChild(pg);
          particles.push({
            g: pg,
            vy: -0.2 - Math.random() * 0.4,
            vx: (Math.random() - 0.5) * 0.3,
            life: 0,
            maxLife: 100 + Math.random() * 80,
          });
        }

        // Update ambient particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life += dt;
          p.g.y += p.vy * dt;
          p.g.x += p.vx * dt + Math.sin(p.life * 0.04) * 0.2;
          const r = p.life / p.maxLife;
          p.g.alpha = r < 0.15 ? r / 0.15 * 0.5 : Math.max(0, (1 - (r - 0.15) / 0.85)) * 0.5;
          if (p.life >= p.maxLife) {
            particleContainer.removeChild(p.g);
            p.g.destroy();
            particles.splice(i, 1);
          }
        }

        // Update effects
        effectsManager.update(dt);
      });

      pixiRef.current = {
        app,
        sprites: new Map(),
        effectsManager,
        effectsContainer,
        skyGraphics: sky,
        weatherContainer,
        speechBubbles: new Map(),
        worldContainer,
        activeBehaviors,
      };
      setReady(true);
    })();

    return () => {
      destroyed = true;
      if (pixiRef.current) {
        pixiRef.current.speechBubbles.forEach((b) => {
          clearTimeout(b.timer);
          b.container.destroy({ children: true });
        });
        pixiRef.current.effectsManager?.destroy();
        pixiRef.current.app.destroy(true, { children: true });
        pixiRef.current = null;
        setReady(false);
      }
    };
  }, []);

  // Register nurture effect callback
  useEffect(() => {
    const callback = (slimeId: string, action: string) => {
      if (!pixiRef.current?.effectsManager || !pixiRef.current?.sprites) return;
      const sprite = pixiRef.current.sprites.get(slimeId);
      if (!sprite) return;
      const type = action as "feed" | "pet" | "play";
      pixiRef.current.effectsManager.spawnParticles(sprite.x, sprite.y - 20, type);
    };
    setNurtureEffectCallback(callback);
    return () => setNurtureEffectCallback(null);
  }, [setNurtureEffectCallback]);

  // Speech bubble helper
  const showSpeechBubble = useCallback(async (slimeId: string, text: string) => {
    if (!pixiRef.current) return;
    const sprite = pixiRef.current.sprites.get(slimeId);
    if (!sprite) return;

    const existing = pixiRef.current.speechBubbles.get(slimeId);
    if (existing) {
      clearTimeout(existing.timer);
      pixiRef.current.app.stage.removeChild(existing.container);
      existing.container.destroy({ children: true });
      pixiRef.current.speechBubbles.delete(slimeId);
    }

    const PIXI = await import("pixi.js");
    const bubbleContainer = new PIXI.Container();

    const bubbleText = new PIXI.Text({
      text,
      style: new PIXI.TextStyle({
        fontSize: 11,
        fill: "#1a1a2e",
        fontWeight: "600",
        wordWrap: true,
        wordWrapWidth: 120,
      }),
    });
    bubbleText.anchor.set(0.5);

    const padX = 10;
    const padY = 6;
    const bw = bubbleText.width + padX * 2;
    const bh = bubbleText.height + padY * 2;

    const bg = new PIXI.Graphics();
    bg.roundRect(-bw / 2, -bh / 2, bw, bh, 8);
    bg.fill({ color: 0xffffff, alpha: 0.92 });

    bg.moveTo(-4, bh / 2);
    bg.lineTo(0, bh / 2 + 6);
    bg.lineTo(4, bh / 2);
    bg.fill({ color: 0xffffff, alpha: 0.92 });

    bubbleContainer.addChild(bg);
    bubbleContainer.addChild(bubbleText);
    bubbleContainer.x = sprite.x;
    bubbleContainer.y = sprite.y - 55;
    bubbleContainer.alpha = 0;

    pixiRef.current.app.stage.addChild(bubbleContainer);

    let fadeInProgress = 0;
    const fadeInFn = (ticker: { deltaTime: number }) => {
      fadeInProgress += ticker.deltaTime * 0.1;
      bubbleContainer.alpha = Math.min(fadeInProgress, 1);
      if (fadeInProgress >= 1) pixiRef.current?.app.ticker.remove(fadeInFn);
    };
    pixiRef.current.app.ticker.add(fadeInFn);

    const timer = setTimeout(() => {
      if (!pixiRef.current) return;
      let fadeOut = 1;
      const fadeOutFn = (ticker: { deltaTime: number }) => {
        fadeOut -= ticker.deltaTime * 0.05;
        bubbleContainer.alpha = Math.max(fadeOut, 0);
        if (fadeOut <= 0) {
          pixiRef.current?.app.ticker.remove(fadeOutFn);
          pixiRef.current?.app.stage.removeChild(bubbleContainer);
          bubbleContainer.destroy({ children: true });
          pixiRef.current?.speechBubbles.delete(slimeId);
        }
      };
      pixiRef.current.app.ticker.add(fadeOutFn);
    }, 4000);

    pixiRef.current.speechBubbles.set(slimeId, { container: bubbleContainer, timer });
  }, []);

  // Behavior manager
  useEffect(() => {
    if (!ready) return;

    const manager = new SlimeBehaviorManager();
    behaviorRef.current = manager;

    manager.setListener((event: BehaviorEvent) => {
      if (event.type === "thought") {
        showSpeechBubble(event.slimeId, event.text);
      } else if (event.type === "idle_action") {
        showSpeechBubble(event.slimeId, event.emoji);

        // Trigger behavior state for canvas animations
        if (pixiRef.current) {
          const W = containerRef.current?.closest(".game-frame")?.clientWidth || 400;
          const H = containerRef.current?.closest(".game-frame")?.clientHeight || 700;
          const groundY = H * 0.65;
          const allSlimeIds = Array.from(pixiRef.current.sprites.keys());

          const behaviorState: BehaviorState = {
            type: event.actionId,
            slimeId: event.slimeId,
            startTime: Date.now(),
            duration: 3000 + Math.random() * 3000,
            phase: 0,
          };

          // Safe bounds for behavior targets
          const bLeft = 70;
          const bRight = W - 30;
          const bTop = Math.max(groundY - 15, 110);
          const bBottom = H - 140;
          const clampX = (v: number) => Math.max(bLeft, Math.min(bRight, v));
          const clampY = (v: number) => Math.max(bTop, Math.min(bBottom, v));

          switch (event.actionId) {
            case "move":
            case "explore_wander":
              behaviorState.targetX = clampX(70 + Math.random() * (W - 100));
              behaviorState.targetY = clampY(groundY - 20 + Math.random() * 80);
              behaviorState.duration = 5000 + Math.random() * 4000;
              break;
            case "chase":
              if (allSlimeIds.length > 1) {
                const otherIds = allSlimeIds.filter((id) => id !== event.slimeId);
                behaviorState.targetId = otherIds[Math.floor(Math.random() * otherIds.length)];
                behaviorState.duration = 3000 + Math.random() * 2000;
              }
              break;
            case "group_huddle":
              if (allSlimeIds.length > 1) {
                // Move toward center of nearby slimes
                let cx = 0, cy = 0, count = 0;
                pixiRef.current.sprites.forEach((sp) => {
                  cx += sp.x;
                  cy += sp.y;
                  count++;
                });
                behaviorState.targetX = clampX(cx / count + (Math.random() - 0.5) * 20);
                behaviorState.targetY = clampY(cy / count + (Math.random() - 0.5) * 10);
                behaviorState.duration = 4000;
              }
              break;
            case "dance":
              behaviorState.duration = 4000;
              break;
            case "backflip":
              behaviorState.duration = 1200;
              break;
            case "eat":
              behaviorState.duration = 2500;
              break;
            case "play_jump":
              behaviorState.duration = 1500;
              break;
            case "sleep":
              behaviorState.duration = 5000;
              break;
          }

          pixiRef.current.activeBehaviors.set(event.slimeId, behaviorState);
        }
      }
    });

    const slimeInfos = slimes.map((s) => ({
      id: s.id, personality: s.personality,
      hunger: s.hunger, condition: s.condition, affection: s.affection, is_sick: s.is_sick,
    }));
    manager.start(slimeInfos);

    return () => {
      manager.destroy();
      behaviorRef.current = null;
    };
  }, [ready, slimes, showSpeechBubble]);

  // Sync slimes to stage
  const syncSlimes = useCallback(async () => {
    if (!pixiRef.current) return;
    const PIXI = await import("pixi.js");
    const { app, sprites, worldContainer } = pixiRef.current;
    if (!worldContainer) return;

    const gameFrame = containerRef.current?.closest(".game-frame") as HTMLElement | null;
    const W = gameFrame?.clientWidth || containerRef.current?.clientWidth || 400;
    const H = gameFrame?.clientHeight || containerRef.current?.clientHeight || 700;

    // Clear old sprites
    sprites.forEach((s) => { worldContainer.removeChild(s); s.destroy({ children: true }); });
    sprites.clear();

    const emptyChild = app.stage.children.find((c) => (c as { name?: string }).name === "__empty");
    if (emptyChild) app.stage.removeChild(emptyChild);

    if (slimes.length === 0) {
      const ec = new PIXI.Container();
      ec.name = "__empty";
      const icon = new PIXI.Text({
        text: "\uD83E\uDD5A",
        style: new PIXI.TextStyle({ fontSize: 48 }),
      });
      icon.anchor.set(0.5);
      icon.x = W / 2; icon.y = H / 2 - 20;
      ec.addChild(icon);

      const txt = new PIXI.Text({
        text: "\uC544\uC9C1 \uC2AC\uB77C\uC784\uC774 \uC5C6\uC5B4\uC694\n\uB85C\uADF8\uC778 \uD6C4 \uCCAB \uC2AC\uB77C\uC784\uC744 \uBC1B\uC544\uBCF4\uC138\uC694!",
        style: new PIXI.TextStyle({ fontSize: 13, fill: "#B2BEC3", align: "center", lineHeight: 22 }),
      });
      txt.anchor.set(0.5);
      txt.x = W / 2; txt.y = H / 2 + 30;
      ec.addChild(txt);
      app.stage.addChild(ec);
      return;
    }

    const groundY = H * 0.65;
    const textureCache = new Map<string, import("pixi.js").Texture>();

    // Organic placement: scatter slimes across the village ground area
    // Safe zones: top 110px (HUD), bottom 130px (nav+action cards), left 70px (side menu)
    const slimePositions: { x: number; y: number }[] = [];
    const paddingLeft = 70;
    const paddingRight = 30;
    const areaTop = Math.max(groundY - 15, 110);
    const areaBottom = H - 140;
    const areaW = W - paddingLeft - paddingRight;
    const areaH = areaBottom - areaTop;
    const maxSlimes = Math.min(slimes.length, 30);

    for (let idx = 0; idx < maxSlimes; idx++) {
      // Use golden ratio-based distribution for organic feel
      const angle = idx * 2.4; // golden angle
      const radius = Math.sqrt(idx / maxSlimes) * Math.min(areaW, areaH) * 0.48;
      const centerX = paddingLeft + areaW / 2;
      let x = centerX + Math.cos(angle) * radius * (areaW / areaH);
      let y = areaTop + areaH * 0.4 + Math.sin(angle) * radius * 0.5;

      // Clamp to safe bounds
      x = Math.max(paddingLeft, Math.min(W - paddingRight, x));
      y = Math.max(areaTop, Math.min(areaBottom, y));

      // Add jitter
      x += (Math.random() - 0.5) * 20;
      y += (Math.random() - 0.5) * 12;

      // Re-clamp after jitter
      x = Math.max(paddingLeft, Math.min(W - paddingRight, x));
      y = Math.max(areaTop, Math.min(areaBottom, y));

      slimePositions.push({ x, y });
    }

    for (let idx = 0; idx < maxSlimes; idx++) {
      const slime = slimes[idx];
      const sp = species.find((s) => s.id === slime.species_id);
      const container = new PIXI.Container();
      container.sortableChildren = true;

      const grade = sp?.grade || "common";
      const sizeScale = maxSlimes > 12 ? 0.8 : maxSlimes > 6 ? 0.9 : 1;
      const baseSize = Math.min(100 + (slime.level - 1) * 3, 150) * sizeScale;

      const slimeAccs = equippedAccessories[slime.id] || [];
      const accOverlays = slimeAccs.map((e) => e.svg_overlay).filter(Boolean);
      const accKey = accOverlays.length > 0 ? `_acc${accOverlays.sort().join(",")}` : "";
      const texKey = `${slime.element}_${slime.personality}_${grade}_${slime.species_id || 0}${accKey}`;
      let texture = textureCache.get(texKey);
      if (!texture) {
        try {
          const svgUrl = generateSlimeSvg(slime.element, slime.personality, grade, slime.species_id || 0, accOverlays);
          const loaded: import("pixi.js").Texture = await PIXI.Assets.load(svgUrl);
          texture = loaded;
          textureCache.set(texKey, loaded);
        } catch {
          // Fallback: try loading with default params
          try {
            const fallbackUrl = generateSlimeSvg("water", "gentle", "common", 0);
            const fallback: import("pixi.js").Texture = await PIXI.Assets.load(fallbackUrl);
            texture = fallback;
          } catch {
            continue; // Skip this slime if all loading fails
          }
        }
      }

      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5, 0.85);
      sprite.width = baseSize;
      sprite.height = baseSize;
      container.addChild(sprite);

      // Mood visual effects
      const mood = slime.mood || deriveMood(slime.hunger, slime.condition, slime.affection, slime.is_sick);
      if (slime.is_sick) {
        sprite.tint = 0xAADDCC; // greenish sick tint
      }
      // Show mood emoji above slime for non-happy states
      if (mood !== "happy" && mood !== "ecstatic") {
        const moodText = new PIXI.Text({
          text: moodEmojis[mood] || "",
          style: new PIXI.TextStyle({ fontSize: 14 }),
        });
        moodText.anchor.set(0.5);
        moodText.y = -(baseSize * 0.5);
        container.addChild(moodText);
      }

      const shadow = new PIXI.Graphics();
      shadow.ellipse(0, 5, baseSize * 0.3, 4);
      shadow.fill({ color: 0x000000, alpha: 0.2 });
      container.addChildAt(shadow, 0);

      const nameStr = slime.name || sp?.name || "???";
      const displayLabel = `${nameStr}  Lv.${slime.level}`;
      const nameW = displayLabel.length * 7 + 20;

      const nameBg = new PIXI.Graphics();
      nameBg.roundRect(-nameW / 2, 10, nameW, 20, 10);
      nameBg.fill({ color: 0x1A0E08, alpha: 0.85 });
      nameBg.stroke({ color: 0x8B6914, width: 1, alpha: 0.5 });
      container.addChild(nameBg);

      const nameText = new PIXI.Text({
        text: nameStr,
        style: new PIXI.TextStyle({
          fontSize: 13,
          fill: "#F5E6C8",
          fontWeight: "700",
          fontFamily: "Georgia, serif",
          dropShadow: {
            color: "#000000",
            blur: 2,
            distance: 1,
          },
        }),
        resolution: 2,
      });
      nameText.anchor.set(0.5);
      nameText.y = 20;
      container.addChild(nameText);

      const lvlText = new PIXI.Text({
        text: `Lv.${slime.level}`,
        style: new PIXI.TextStyle({
          fontSize: 10,
          fill: "#C9A84C",
          fontWeight: "700",
          fontFamily: "Georgia, serif",
          dropShadow: {
            color: "#000000",
            blur: 2,
            distance: 1,
          },
        }),
        resolution: 2,
      });
      lvlText.anchor.set(0.5);
      lvlText.y = 36;
      container.addChild(lvlText);

      const pos = slimePositions[idx];
      container.x = pos.x;
      container.y = pos.y;
      container.zIndex = Math.floor(pos.y);

      const d = container as unknown as Record<string, number>;
      d._animTime = Math.random() * Math.PI * 2;
      d._baseY = container.y;
      d._jumpSeed = Math.random() * Math.PI * 2;

      // Interactive
      container.eventMode = "static";
      container.cursor = "pointer";
      container.on("pointerdown", () => {
        if (behaviorRef.current) {
          const reaction = behaviorRef.current.getClickReaction(slime.personality);
          showSpeechBubble(slime.id, reaction);
        }
        setTimeout(() => selectSlime(slime.id), 500);
      });

      worldContainer.addChild(container);
      sprites.set(slime.id, container);
    }

    // Move effects layer to top
    if (pixiRef.current?.effectsContainer) {
      app.stage.removeChild(pixiRef.current.effectsContainer);
      app.stage.addChild(pixiRef.current.effectsContainer);
    }
  }, [slimes, species, selectSlime, showSpeechBubble]);

  useEffect(() => {
    if (ready) syncSlimes();
  }, [ready, syncSlimes]);

  // Level-up blink + effect
  useEffect(() => {
    if (!levelUpInfo || !pixiRef.current) return;
    const sprite = pixiRef.current.sprites.get(levelUpInfo.slimeId);
    if (!sprite) return;

    pixiRef.current.effectsManager?.spawnParticles(sprite.x, sprite.y - 20, "levelup");

    let count = 0;
    const interval = setInterval(() => {
      sprite.alpha = count % 2 === 0 ? 0.3 : 1;
      count++;
      if (count >= 8) { clearInterval(interval); sprite.alpha = 1; }
    }, 150);
    return () => { clearInterval(interval); if (sprite) sprite.alpha = 1; };
  }, [levelUpInfo]);

  return <div ref={containerRef} id="game-canvas" />;
}
