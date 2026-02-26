"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useGameStore } from "@/lib/store/gameStore";
import { generateSlimeSvg } from "@/lib/slimeSvg";
import { getTimeOfDay, getWeather, getSkyColors, getSeason, type Weather, type TimeOfDay, type Season } from "@/lib/WeatherSystem";
import { SlimeBehaviorManager, type BehaviorEvent } from "@/lib/SlimeBehaviorManager";

export interface VisitSlime {
  id: string;
  species_id: number;
  name: string | null;
  level: number;
  exp: number;
  element: string;
  personality: string;
  affection: number;
  hunger: number;
  condition: number;
  is_sick?: boolean;
  mood?: string;
}

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

interface VisitCanvasProps {
  slimes: VisitSlime[];
}

export default function VisitCanvas({ slimes }: VisitCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiRef = useRef<{
    app: import("pixi.js").Application;
    sprites: Map<string, import("pixi.js").Container>;
    weatherContainer: import("pixi.js").Container | null;
    speechBubbles: Map<string, { container: import("pixi.js").Container; timer: ReturnType<typeof setTimeout> }>;
    worldContainer: import("pixi.js").Container | null;
    activeBehaviors: Map<string, BehaviorState>;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const behaviorRef = useRef<SlimeBehaviorManager | null>(null);

  const speciesList = useGameStore((s) => s.species);

  // Initialize PixiJS
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    const container = containerRef.current;

    (async () => {
      const PIXI = await import("pixi.js");
      if (destroyed) return;

      const app = new PIXI.Application();
      await app.init({
        background: "#080816",
        resizeTo: container,
        antialias: true,
      });
      if (destroyed) { app.destroy(true, { children: true }); return; }

      container.appendChild(app.canvas as HTMLCanvasElement);
      const W = container.clientWidth;
      const H = container.clientHeight;
      const timeOfDay = getTimeOfDay();

      // ===== SKY BACKGROUND =====
      const sky = new PIXI.Graphics();
      const timeColors = getSkyColors(timeOfDay);
      const bands = 4;
      for (let b = 0; b < bands; b++) {
        const y0 = (b / bands) * H * 0.65;
        const y1 = ((b + 1) / bands) * H * 0.65;
        sky.rect(0, y0, W, y1 - y0);
        const t = b / (bands - 1);
        const topC = timeColors.top;
        const botC = timeColors.bottom;
        const r = ((topC >> 16) & 0xff) * (1 - t) + ((botC >> 16) & 0xff) * t;
        const g = ((topC >> 8) & 0xff) * (1 - t) + ((botC >> 8) & 0xff) * t;
        const bl = (topC & 0xff) * (1 - t) + (botC & 0xff) * t;
        sky.fill((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl));
      }
      app.stage.addChild(sky);

      // Stars (night/dusk only)
      type StarInfo = { g: import("pixi.js").Graphics; speed: number; base: number };
      const stars: StarInfo[] = [];
      const isDay = timeOfDay === "morning" || timeOfDay === "afternoon";
      if (!isDay) {
        for (let i = 0; i < 80; i++) {
          const s = new PIXI.Graphics();
          const sz = 0.4 + Math.random() * 1.5;
          const brightness = 0.3 + Math.random() * 0.7;
          s.circle(0, 0, sz);
          s.fill({ color: 0xffffff, alpha: brightness });
          s.x = Math.random() * W;
          s.y = Math.random() * H * 0.5;
          app.stage.addChild(s);
          stars.push({ g: s, speed: 0.5 + Math.random() * 2, base: brightness });
        }
        for (let i = 0; i < 3; i++) {
          const s = new PIXI.Graphics();
          const sx = W * 0.15 + Math.random() * W * 0.7;
          const sy = H * 0.05 + Math.random() * H * 0.2;
          s.moveTo(sx - 5, sy); s.lineTo(sx + 5, sy);
          s.stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
          s.moveTo(sx, sy - 5); s.lineTo(sx, sy + 5);
          s.stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
          s.circle(sx, sy, 1.2);
          s.fill({ color: 0xffffff, alpha: 0.7 });
          app.stage.addChild(s);
        }
      }

      // ===== MOON =====
      if (timeOfDay === "night" || timeOfDay === "dusk") {
        const moonG = new PIXI.Graphics();
        const mx = W * 0.8;
        const my = H * 0.1;
        moonG.circle(mx, my, 32);
        moonG.fill({ color: 0xf5f5dc, alpha: 0.06 });
        moonG.circle(mx, my, 22);
        moonG.fill({ color: 0xf5f5dc, alpha: 0.9 });
        moonG.circle(mx - 5, my - 3, 3);
        moonG.fill({ color: 0xd4d4aa, alpha: 0.35 });
        moonG.circle(mx + 4, my + 4, 2.5);
        moonG.fill({ color: 0xd4d4aa, alpha: 0.25 });
        app.stage.addChild(moonG);
      }

      // Clouds
      type CloudInfo = { g: import("pixi.js").Graphics; speed: number };
      const clouds: CloudInfo[] = [];
      const cloudCount = isDay ? 5 : 2;
      for (let i = 0; i < cloudCount; i++) {
        const cg = new PIXI.Graphics();
        const cx = Math.random() * W;
        const cy = H * 0.06 + Math.random() * H * 0.18;
        const cAlpha = isDay ? 0.12 + Math.random() * 0.08 : 0.04;
        const cw = 35 + Math.random() * 30;
        const ch = 10 + Math.random() * 6;
        cg.ellipse(cx, cy, cw, ch);
        cg.fill({ color: 0xffffff, alpha: cAlpha });
        cg.ellipse(cx - cw * 0.4, cy + 2, cw * 0.6, ch * 0.8);
        cg.fill({ color: 0xffffff, alpha: cAlpha * 0.7 });
        cg.ellipse(cx + cw * 0.45, cy + 1, cw * 0.55, ch * 0.75);
        cg.fill({ color: 0xffffff, alpha: cAlpha * 0.7 });
        cg.ellipse(cx + cw * 0.15, cy - ch * 0.4, cw * 0.45, ch * 0.65);
        cg.fill({ color: 0xffffff, alpha: cAlpha * 0.5 });
        app.stage.addChild(cg);
        clouds.push({ g: cg, speed: 0.03 + Math.random() * 0.07 });
      }

      // ===== SUN RAYS =====
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

      // ===== AURORA =====
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

      // ===== HILLS =====
      const groundY = H * 0.65;
      const hillFar = new PIXI.Graphics();
      hillFar.moveTo(0, groundY - 40);
      for (let x = 0; x <= W; x += 2) {
        const y = groundY - 40 + Math.sin(x * 0.006) * 18 + Math.sin(x * 0.013 + 2) * 10;
        hillFar.lineTo(x, y);
      }
      hillFar.lineTo(W, H);
      hillFar.lineTo(0, H);
      hillFar.closePath();
      hillFar.fill({ color: isDay ? 0x1a3a25 : 0x0d2018, alpha: isDay ? 0.4 : 0.5 });
      app.stage.addChild(hillFar);

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

      // ===== MAIN GROUND =====
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

      // Subtle path
      const pathG = new PIXI.Graphics();
      pathG.moveTo(W * 0.25, groundY + 8);
      pathG.quadraticCurveTo(W * 0.5, groundY + 28, W * 0.75, groundY + 12);
      pathG.lineTo(W * 0.76, groundY + 16);
      pathG.quadraticCurveTo(W * 0.5, groundY + 33, W * 0.24, groundY + 12);
      pathG.closePath();
      pathG.fill({ color: isDay ? 0x1e3a28 : 0x152a1a, alpha: 0.25 });
      app.stage.addChild(pathG);

      // Lower ground
      const groundLayer2 = new PIXI.Graphics();
      groundLayer2.rect(0, groundY + 20, W, H - groundY - 20);
      groundLayer2.fill({ color: isDay ? 0x0e2412 : 0x081608, alpha: 0.35 });
      app.stage.addChild(groundLayer2);

      // Ground edge highlight
      const groundLine = new PIXI.Graphics();
      groundLine.moveTo(0, groundY);
      for (let x = 0; x <= W; x += 2) {
        const y = groundY + Math.sin(x * 0.012 + 0.5) * 4;
        groundLine.lineTo(x, y);
      }
      groundLine.stroke({ width: 1.5, color: isDay ? 0x2a6a3a : 0x1a4a2a, alpha: 0.35 });
      app.stage.addChild(groundLine);

      // ===== GRASS CLUSTERS =====
      const grassClusterCount = 10;
      for (let c = 0; c < grassClusterCount; c++) {
        const clusterX = (W / (grassClusterCount + 1)) * (c + 1) + (Math.random() - 0.5) * 25;
        const clusterY = groundY + 1 + Math.random() * 4;
        const leafCount = 3 + Math.floor(Math.random() * 4);
        for (let l = 0; l < leafCount; l++) {
          const g = new PIXI.Graphics();
          const h = 5 + Math.random() * 12;
          const lx = clusterX + (Math.random() - 0.5) * 10;
          const lean = (Math.random() - 0.5) * 5;
          g.moveTo(lx, clusterY);
          g.lineTo(lx + lean - 1, clusterY - h);
          g.lineTo(lx + lean + 1, clusterY - h);
          g.lineTo(lx, clusterY);
          const grassColors = isDay
            ? [0x2a7a3a, 0x258a45, 0x3a8a4a, 0x2a9a4a, 0x35a050]
            : [0x1a5a2a, 0x1a6a3a, 0x2a5a2a, 0x1a7a3a, 0x2a7a4a];
          g.fill({ color: grassColors[l % 5], alpha: 0.25 + Math.random() * 0.25 });
          app.stage.addChild(g);
        }
      }

      // ===== DECORATIONS =====
      // Trees (2) — sway only, no item drop
      const treePositions = [W * 0.13, W * 0.85];
      type TreeInfo = { g: import("pixi.js").Graphics; pivotX: number; pivotY: number };
      const treeRefs: TreeInfo[] = [];
      for (const tx of treePositions) {
        const ty = groundY - 3;
        const tree = new PIXI.Graphics();
        tree.rect(tx - 4, ty - 35, 8, 38);
        tree.fill({ color: isDay ? 0x5a4030 : 0x3a2820, alpha: 0.55 });
        const canopyColor1 = isDay ? 0x2a7a3a : 0x1a5a2a;
        const canopyColor2 = isDay ? 0x2a8a45 : 0x1a6a3a;
        const canopyColor3 = isDay ? 0x358a4a : 0x2a5a2a;
        tree.circle(tx, ty - 44, 20);
        tree.fill({ color: canopyColor1, alpha: 0.5 });
        tree.circle(tx - 12, ty - 36, 14);
        tree.fill({ color: canopyColor2, alpha: 0.45 });
        tree.circle(tx + 12, ty - 38, 15);
        tree.fill({ color: canopyColor3, alpha: 0.45 });
        tree.circle(tx + 2, ty - 52, 12);
        tree.fill({ color: canopyColor2, alpha: 0.35 });
        tree.pivot.set(tx, ty);
        tree.position.set(tx, ty);
        // Read-only: click only shakes, no item drop
        tree.eventMode = "static";
        tree.cursor = "pointer";
        tree.on("pointerdown", () => {
          const td = tree as unknown as Record<string, number>;
          td._shakeTime = 0.5;
        });
        app.stage.addChild(tree);
        treeRefs.push({ g: tree, pivotX: tx, pivotY: ty });
      }

      // Pond (read-only, no fishing)
      const pondX = W * 0.6;
      const pondY = groundY + 40;
      const pond = new PIXI.Graphics();
      pond.ellipse(pondX, pondY, 22, 10);
      pond.fill({ color: 0x2a5a8a, alpha: 0.35 });
      pond.ellipse(pondX - 4, pondY - 2, 10, 5);
      pond.fill({ color: 0x3a7aaa, alpha: 0.2 });
      app.stage.addChild(pond);

      // Bench
      const benchX = W * 0.42;
      const benchY = groundY + 22;
      const bench = new PIXI.Graphics();
      bench.rect(benchX - 10, benchY, 2, 6);
      bench.fill({ color: 0x5a4030, alpha: 0.4 });
      bench.rect(benchX + 8, benchY, 2, 6);
      bench.fill({ color: 0x5a4030, alpha: 0.4 });
      bench.rect(benchX - 12, benchY - 1, 24, 3);
      bench.fill({ color: 0x6a5040, alpha: 0.5 });
      bench.rect(benchX - 11, benchY - 7, 22, 2);
      bench.fill({ color: 0x6a5040, alpha: 0.4 });
      app.stage.addChild(bench);

      // Lamp posts (2)
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

      // Bushes
      for (let i = 0; i < 5; i++) {
        const bx = W * (0.08 + Math.random() * 0.84);
        const by = groundY + 8 + Math.random() * 35;
        const bush = new PIXI.Graphics();
        const bushColors = isDay
          ? [0x2a6a3a, 0x3a7a4a, 0x2a8a3a, 0x3a6a4a, 0x2a7a38]
          : [0x1a4a2a, 0x2a5a3a, 0x1a6a2a, 0x2a4a3a, 0x1a5a30];
        bush.ellipse(bx, by, 12 + Math.random() * 6, 7 + Math.random() * 3);
        bush.fill({ color: bushColors[i % 5], alpha: 0.3 });
        bush.ellipse(bx + 5, by - 2, 8 + Math.random() * 4, 5 + Math.random() * 2);
        bush.fill({ color: bushColors[(i + 1) % 5], alpha: 0.25 });
        app.stage.addChild(bush);
      }

      // Flowers
      for (let i = 0; i < 10; i++) {
        const fx = Math.random() * W;
        const fy = groundY + 6 + Math.random() * 35;
        const f = new PIXI.Graphics();
        const fc = [0xff9ff3, 0x74b9ff, 0xffeaa7, 0xff6b6b, 0xa29bfe, 0x55efc4, 0xfd79a8, 0x81ecec, 0xfdcb6e, 0x6c5ce7][i];
        const ps = 2.5;
        f.ellipse(fx, fy - ps, ps * 0.6, ps);
        f.fill({ color: fc, alpha: 0.4 });
        f.ellipse(fx, fy + ps, ps * 0.6, ps);
        f.fill({ color: fc, alpha: 0.4 });
        f.ellipse(fx - ps, fy, ps, ps * 0.6);
        f.fill({ color: fc, alpha: 0.4 });
        f.ellipse(fx + ps, fy, ps, ps * 0.6);
        f.fill({ color: fc, alpha: 0.4 });
        f.circle(fx, fy, 1);
        f.fill({ color: 0xffffff, alpha: 0.4 });
        f.moveTo(fx, fy + ps);
        f.lineTo(fx + (Math.random() - 0.5), fy + ps + 4);
        f.stroke({ width: 0.5, color: 0x2a5a2a, alpha: 0.3 });
        app.stage.addChild(f);
      }

      // Mushrooms
      for (let i = 0; i < 4; i++) {
        const mx = W * 0.08 + Math.random() * W * 0.84;
        const my = groundY + 12 + Math.random() * 35;
        const m = new PIXI.Graphics();
        m.rect(mx - 1.5, my - 4, 3, 5);
        m.fill({ color: 0xd4c5a0, alpha: 0.3 });
        m.ellipse(mx, my - 5, 5, 3);
        m.fill({ color: [0xff6b6b, 0xa29bfe, 0x55efc4, 0xffeaa7][i], alpha: 0.25 });
        m.circle(mx - 2, my - 6, 1);
        m.fill({ color: 0xffffff, alpha: 0.15 });
        app.stage.addChild(m);
      }

      // ===== WORLD CONTAINER =====
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

        // Rotate sun rays
        if (isDay) {
          sunRayContainer.rotation += 0.0002 * dt;
        }

        // Animate aurora
        if (timeOfDay === "night" || timeOfDay === "dusk") {
          for (let i = 0; i < auroraContainer.children.length; i++) {
            const ag = auroraContainer.children[i] as import("pixi.js").Graphics;
            ag.alpha = 0.03 + Math.sin(t * 0.3 + i * 1.2) * 0.02;
          }
        }

        // ===== METEOR =====
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

        // ===== POND RIPPLES =====
        rippleTimer += dt;
        if (rippleTimer > 60 + Math.random() * 40) {
          rippleTimer = 0;
          const rg = new PIXI.Graphics();
          const rx = pondX + (Math.random() - 0.5) * 16;
          const ry = pondY + (Math.random() - 0.5) * 6;
          app.stage.addChild(rg);
          ripples.push({ g: rg, life: 0, maxLife: 80, cx: rx, cy: ry });
        }
        for (let i = ripples.length - 1; i >= 0; i--) {
          const rp = ripples[i];
          rp.life += dt;
          const prog = rp.life / rp.maxLife;
          rp.g.clear();
          const radius = 3 + prog * 14;
          rp.g.ellipse(rp.cx, rp.cy, radius, radius * 0.45);
          rp.g.stroke({ width: 0.5, color: 0x74b9ff, alpha: 0.25 * (1 - prog) });
          if (rp.life >= rp.maxLife) {
            app.stage.removeChild(rp.g);
            rp.g.destroy();
            ripples.splice(i, 1);
          }
        }

        // ===== TREE SWAY =====
        for (const tr of treeRefs) {
          const td = tr.g as unknown as Record<string, number>;
          const swayAmount = currentWeather === "storm" ? 0.06 : currentWeather === "fog" ? 0.03 : 0.015;
          tr.g.rotation = Math.sin(t * 0.8 + tr.pivotX * 0.01) * swayAmount;
          if (td._shakeTime && td._shakeTime > 0) {
            td._shakeTime -= dt / 60;
            tr.g.rotation += Math.sin(td._shakeTime * 40) * 0.08;
          }
        }

        // ===== SEASONAL PARTICLES =====
        if (currentSeason === "spring" && Math.random() < 0.02) {
          const pg = new PIXI.Graphics();
          pg.ellipse(0, 0, 2.5, 1.5);
          pg.fill({ color: [0xffb8d0, 0xff9ff3, 0xffc0cb][Math.floor(Math.random() * 3)], alpha: 0.5 });
          pg.x = Math.random() * W;
          pg.y = -5;
          ambientContainer.addChild(pg);
          ambientParticles.push({ g: pg, vx: 0.2 + Math.random() * 0.3, vy: 0.3 + Math.random() * 0.4, life: 0, maxLife: 250 + Math.random() * 100, type: "cherry_blossom" });
        }
        if (currentSeason === "winter" && Math.random() < 0.03) {
          const sg = new PIXI.Graphics();
          sg.circle(0, 0, 1 + Math.random() * 1.5);
          sg.fill({ color: 0xffffff, alpha: 0.35 + Math.random() * 0.2 });
          sg.x = Math.random() * W;
          sg.y = -3;
          ambientContainer.addChild(sg);
          ambientParticles.push({ g: sg, vx: (Math.random() - 0.5) * 0.4, vy: 0.3 + Math.random() * 0.5, life: 0, maxLife: 200 + Math.random() * 100, type: "seasonal_snow" });
        }
        if (currentSeason === "autumn" && Math.random() < 0.015) {
          const lg = new PIXI.Graphics();
          lg.ellipse(0, 0, 3, 1.5);
          lg.fill({ color: [0xcc4422, 0xdd6633, 0xbb3311, 0xe08040][Math.floor(Math.random() * 4)], alpha: 0.45 });
          lg.x = Math.random() * W;
          lg.y = -5;
          ambientContainer.addChild(lg);
          ambientParticles.push({ g: lg, vx: 0.2 + Math.random() * 0.4, vy: 0.4 + Math.random() * 0.4, life: 0, maxLife: 220, type: "leaf" });
        }

        // === Collision avoidance ===
        const spriteEntries = Array.from(pixiRef.current.sprites.entries());
        const separationDist = 65;
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
              const dA = sprA as unknown as Record<string, number>;
              const dB = sprB as unknown as Record<string, number>;
              if (dA._baseY !== undefined) dA._baseY = sprA.y;
              if (dB._baseY !== undefined) dB._baseY = sprB.y;
            }
          }
        }

        for (const [, spr] of spriteEntries) {
          const sd = spr as unknown as Record<string, number>;
          spr.x = Math.max(boundsLeft, Math.min(boundsRight, spr.x));
          if (sd._baseY !== undefined) {
            sd._baseY = Math.max(boundsTop, Math.min(boundsBottom, sd._baseY));
          }
        }

        // Slime idle animation + behavior
        pixiRef.current.sprites.forEach((sprite, slimeId) => {
          const d = sprite as unknown as Record<string, number>;
          if (d._animTime === undefined) return;
          d._animTime += dt * 0.025;

          const behavior = activeBehaviors.get(slimeId);
          if (behavior) {
            const elapsed = Date.now() - behavior.startTime;
            const progress = Math.min(elapsed / behavior.duration, 1);

            switch (behavior.type) {
              case "sleep": {
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
                const bounce = Math.sin(d._animTime * 2.5) * 5;
                const sway = Math.sin(d._animTime * 1.5) * 0.08;
                const sideStep = Math.sin(d._animTime * 1.2) * 3;
                sprite.y = d._baseY + bounce;
                sprite.rotation = sway;
                sprite.x += sideStep * 0.02 * dt;
                const danceSquash = Math.sin(d._animTime * 2.5) * 0.04;
                sprite.scale.set(1 + danceSquash, 1 - danceSquash);
                break;
              }
              case "backflip": {
                const jumpArc = Math.sin(progress * Math.PI) * 30;
                sprite.y = d._baseY - jumpArc;
                sprite.rotation = -progress * Math.PI * 2;
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
            weatherParticles.push({ g: wg, vy: 4 + Math.random() * 3, vx: currentWeather === "storm" ? -1 - Math.random() : -0.3 });
          }
        } else if (currentWeather === "snow") {
          if (Math.random() < 0.05) {
            const wg = new PIXI.Graphics();
            wg.circle(0, 0, 1 + Math.random() * 2);
            wg.fill({ color: 0xffffff, alpha: 0.4 + Math.random() * 0.3 });
            wg.x = Math.random() * W;
            wg.y = -5;
            weatherContainer.addChild(wg);
            weatherParticles.push({ g: wg, vy: 0.5 + Math.random() * 1, vx: (Math.random() - 0.5) * 0.5 });
          }
        }

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

        // Ambient particles
        if ((currentTimeOfDay === "morning" || currentTimeOfDay === "afternoon") && Math.random() < 0.005) {
          const bg = new PIXI.Graphics();
          const bx = Math.random() * W;
          const by = groundY + Math.random() * 30;
          const bColor = [0xff9ff3, 0xffeaa7, 0x74b9ff, 0x55efc4][Math.floor(Math.random() * 4)];
          bg.ellipse(-3, 0, 3, 2);
          bg.fill({ color: bColor, alpha: 0.5 });
          bg.ellipse(3, 0, 3, 2);
          bg.fill({ color: bColor, alpha: 0.5 });
          bg.circle(0, 0, 0.8);
          bg.fill({ color: 0x333333, alpha: 0.5 });
          bg.x = bx;
          bg.y = by;
          ambientContainer.addChild(bg);
          ambientParticles.push({ g: bg, vx: (Math.random() - 0.5) * 0.3, vy: -0.1 - Math.random() * 0.2, life: 0, maxLife: 200 + Math.random() * 100, type: "butterfly" });
        }

        if ((currentTimeOfDay === "night" || currentTimeOfDay === "dusk") && Math.random() < 0.015) {
          const fg = new PIXI.Graphics();
          const fx = Math.random() * W;
          const fy = groundY - 10 + Math.random() * 40;
          fg.circle(0, 0, 1.5);
          fg.fill({ color: 0xaaff00, alpha: 0.6 });
          fg.x = fx;
          fg.y = fy;
          ambientContainer.addChild(fg);
          ambientParticles.push({ g: fg, vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.15, life: 0, maxLife: 150 + Math.random() * 100, type: "firefly" });
        }

        if (currentWeather === "fog" && Math.random() < 0.01) {
          const lg = new PIXI.Graphics();
          lg.ellipse(0, 0, 3, 1.5);
          lg.fill({ color: [0x8a6a3a, 0x6a8a3a, 0xaa6a2a][Math.floor(Math.random() * 3)], alpha: 0.4 });
          lg.x = Math.random() * W;
          lg.y = -5;
          ambientContainer.addChild(lg);
          ambientParticles.push({ g: lg, vx: 0.3 + Math.random() * 0.3, vy: 0.5 + Math.random() * 0.5, life: 0, maxLife: 200, type: "leaf" });
        }

        for (let i = ambientParticles.length - 1; i >= 0; i--) {
          const ap = ambientParticles[i];
          ap.life += dt;
          const ratio = ap.life / ap.maxLife;

          if (ap.type === "butterfly") {
            ap.g.x += (ap.vx + Math.sin(ap.life * 0.05) * 0.3) * dt;
            ap.g.y += (ap.vy + Math.sin(ap.life * 0.08) * 0.2) * dt;
            const wingScale = 0.7 + Math.sin(ap.life * 0.3) * 0.3;
            ap.g.scale.set(wingScale, 1);
          } else if (ap.type === "firefly") {
            ap.g.x += (ap.vx + Math.sin(ap.life * 0.03) * 0.2) * dt;
            ap.g.y += (ap.vy + Math.cos(ap.life * 0.04) * 0.15) * dt;
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

          if (ratio > 0.8) {
            ap.g.alpha *= 0.97;
          }

          if (ap.life >= ap.maxLife || ap.g.y > H + 10 || ap.g.x > W + 20 || ap.g.x < -20) {
            ambientContainer.removeChild(ap.g);
            ap.g.destroy();
            ambientParticles.splice(i, 1);
          }
        }

        // Floating particles
        if (Math.random() < 0.03) {
          const pg = new PIXI.Graphics();
          const px = Math.random() * W;
          const py = H * 0.5 + Math.random() * H * 0.35;
          const pcolors = [0x55efc4, 0x74b9ff, 0xa29bfe, 0xffeaa7];
          pg.circle(0, 0, 0.8 + Math.random() * 1.5);
          pg.fill({ color: pcolors[Math.floor(Math.random() * pcolors.length)], alpha: 0.5 });
          pg.x = px; pg.y = py;
          particleContainer.addChild(pg);
          particles.push({ g: pg, vy: -0.2 - Math.random() * 0.4, vx: (Math.random() - 0.5) * 0.3, life: 0, maxLife: 100 + Math.random() * 80 });
        }

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
      });

      pixiRef.current = {
        app,
        sprites: new Map(),
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
        pixiRef.current.app.destroy(true, { children: true });
        pixiRef.current = null;
        setReady(false);
      }
    };
  }, []);

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

        if (pixiRef.current) {
          const W = containerRef.current?.clientWidth || 400;
          const H = containerRef.current?.clientHeight || 700;
          const groundY = H * 0.65;
          const allSlimeIds = Array.from(pixiRef.current.sprites.keys());

          const behaviorState: BehaviorState = {
            type: event.actionId,
            slimeId: event.slimeId,
            startTime: Date.now(),
            duration: 3000 + Math.random() * 3000,
            phase: 0,
          };

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
      hunger: s.hunger ?? 100, condition: s.condition ?? 100, affection: s.affection ?? 50, is_sick: s.is_sick ?? false,
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
    const { sprites, worldContainer } = pixiRef.current;
    if (!worldContainer) return;

    const W = containerRef.current?.clientWidth || 400;
    const H = containerRef.current?.clientHeight || 700;

    // Clear old sprites
    sprites.forEach((s) => { worldContainer.removeChild(s); s.destroy({ children: true }); });
    sprites.clear();

    if (slimes.length === 0) return;

    const groundY = H * 0.65;
    const textureCache = new Map<string, import("pixi.js").Texture>();

    const slimePositions: { x: number; y: number }[] = [];
    const paddingLeft = 70;
    const paddingRight = 30;
    const areaTop = Math.max(groundY - 15, 110);
    const areaBottom = H - 140;
    const areaW = W - paddingLeft - paddingRight;
    const areaH = areaBottom - areaTop;
    const maxSlimes = Math.min(slimes.length, 30);

    for (let idx = 0; idx < maxSlimes; idx++) {
      const angle = idx * 2.4;
      const radius = Math.sqrt(idx / maxSlimes) * Math.min(areaW, areaH) * 0.48;
      const centerX = paddingLeft + areaW / 2;
      let x = centerX + Math.cos(angle) * radius * (areaW / areaH);
      let y = areaTop + areaH * 0.4 + Math.sin(angle) * radius * 0.5;
      x = Math.max(paddingLeft, Math.min(W - paddingRight, x));
      y = Math.max(areaTop, Math.min(areaBottom, y));
      x += (Math.random() - 0.5) * 20;
      y += (Math.random() - 0.5) * 12;
      x = Math.max(paddingLeft, Math.min(W - paddingRight, x));
      y = Math.max(areaTop, Math.min(areaBottom, y));
      slimePositions.push({ x, y });
    }

    for (let idx = 0; idx < maxSlimes; idx++) {
      const slime = slimes[idx];
      const sp = speciesList.find((s) => s.id === slime.species_id);
      const container = new PIXI.Container();
      container.sortableChildren = true;

      const grade = sp?.grade || "common";
      const sizeScale = maxSlimes > 12 ? 0.75 : maxSlimes > 6 ? 0.85 : 1;
      const baseSize = Math.min(80 + (slime.level - 1) * 2.5, 120) * sizeScale;

      const texKey = `${slime.element}_${slime.personality}_${grade}_${slime.species_id || 0}`;
      let texture = textureCache.get(texKey);
      if (!texture) {
        try {
          const svgUrl = generateSlimeSvg(slime.element, slime.personality, grade, slime.species_id || 0);
          const loaded: import("pixi.js").Texture = await PIXI.Assets.load(svgUrl);
          texture = loaded;
          textureCache.set(texKey, loaded);
        } catch {
          try {
            const fallbackUrl = generateSlimeSvg("water", "gentle", "common", 0);
            const fallback: import("pixi.js").Texture = await PIXI.Assets.load(fallbackUrl);
            texture = fallback;
          } catch {
            continue;
          }
        }
      }

      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5, 0.85);
      sprite.width = baseSize;
      sprite.height = baseSize;
      container.addChild(sprite);

      const shadow = new PIXI.Graphics();
      shadow.ellipse(0, 5, baseSize * 0.3, 4);
      shadow.fill({ color: 0x000000, alpha: 0.2 });
      container.addChildAt(shadow, 0);

      const nameStr = slime.name || sp?.name || "???";
      const nameBg = new PIXI.Graphics();
      const nameW = nameStr.length * 7 + 16;
      nameBg.roundRect(-nameW / 2, 8, nameW, 16, 8);
      nameBg.fill({ color: 0x000000, alpha: 0.45 });
      container.addChild(nameBg);

      const nameText = new PIXI.Text({
        text: nameStr,
        style: new PIXI.TextStyle({ fontSize: 10, fill: "#ffffff", fontWeight: "600" }),
      });
      nameText.anchor.set(0.5);
      nameText.y = 16;
      container.addChild(nameText);

      const lvlBg = new PIXI.Graphics();
      lvlBg.roundRect(-12, 24, 24, 13, 6);
      lvlBg.fill({ color: 0x000000, alpha: 0.35 });
      container.addChild(lvlBg);

      const lvlText = new PIXI.Text({
        text: `Lv.${slime.level}`,
        style: new PIXI.TextStyle({ fontSize: 8, fill: "#B2BEC3" }),
      });
      lvlText.anchor.set(0.5);
      lvlText.y = 30.5;
      container.addChild(lvlText);

      const pos = slimePositions[idx];
      container.x = pos.x;
      container.y = pos.y;
      container.zIndex = Math.floor(pos.y);

      const d = container as unknown as Record<string, number>;
      d._animTime = Math.random() * Math.PI * 2;
      d._baseY = container.y;
      d._jumpSeed = Math.random() * Math.PI * 2;

      // Read-only: click shows speech bubble only, no selectSlime
      container.eventMode = "static";
      container.cursor = "pointer";
      container.on("pointerdown", () => {
        if (behaviorRef.current) {
          const reaction = behaviorRef.current.getClickReaction(slime.personality);
          showSpeechBubble(slime.id, reaction);
        }
      });

      worldContainer.addChild(container);
      sprites.set(slime.id, container);
    }
  }, [slimes, speciesList, showSpeechBubble]);

  useEffect(() => {
    if (ready) syncSlimes();
  }, [ready, syncSlimes]);

  return <div ref={containerRef} className="w-full h-full" />;
}
