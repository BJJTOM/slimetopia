import type { Application, Container, Graphics } from "pixi.js";

type EffectType = "feed" | "pet" | "play" | "levelup" | "merge";

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  rotSpeed: number;
}

interface EffectConfig {
  count: number;
  duration: number; // in frames (~60fps)
  color: number;
  colors?: number[];
  size: number;
  spread: number;
  gravity: number;
  shape: "circle" | "star" | "heart";
}

const effectConfigs: Record<EffectType, EffectConfig> = {
  feed: {
    count: 10,
    duration: 60,
    color: 0xff6b6b,
    colors: [0xff6b6b, 0xffeaa7, 0xff9ff3],
    size: 4,
    spread: 3,
    gravity: -0.03,
    shape: "heart",
  },
  pet: {
    count: 8,
    duration: 48,
    color: 0xff9ff3,
    colors: [0xff9ff3, 0xffeaa7, 0xa29bfe],
    size: 5,
    spread: 2.5,
    gravity: -0.04,
    shape: "star",
  },
  play: {
    count: 12,
    duration: 72,
    color: 0x55efc4,
    colors: [0x55efc4, 0x74b9ff, 0xffeaa7],
    size: 3.5,
    spread: 3.5,
    gravity: -0.02,
    shape: "circle",
  },
  levelup: {
    count: 20,
    duration: 120,
    color: 0xffeaa7,
    colors: [0xffeaa7, 0xff6b6b, 0xa29bfe, 0x55efc4, 0x74b9ff],
    size: 6,
    spread: 5,
    gravity: -0.05,
    shape: "star",
  },
  merge: {
    count: 16,
    duration: 90,
    color: 0xa29bfe,
    colors: [0xa29bfe, 0x74b9ff, 0x55efc4],
    size: 5,
    spread: 4,
    gravity: -0.04,
    shape: "star",
  },
};

export class EffectsManager {
  private container: Container;
  private particles: Particle[] = [];
  private PIXI: typeof import("pixi.js") | null = null;

  constructor(container: Container) {
    this.container = container;
  }

  async init() {
    this.PIXI = await import("pixi.js");
  }

  private drawShape(g: Graphics, shape: string, size: number, color: number) {
    switch (shape) {
      case "heart": {
        // Simple heart using circles and triangle
        g.circle(-size * 0.3, -size * 0.2, size * 0.45);
        g.circle(size * 0.3, -size * 0.2, size * 0.45);
        g.fill({ color, alpha: 0.9 });
        g.moveTo(0, size * 0.5);
        g.lineTo(-size * 0.65, -size * 0.15);
        g.lineTo(size * 0.65, -size * 0.15);
        g.closePath();
        g.fill({ color, alpha: 0.9 });
        break;
      }
      case "star": {
        const points = 5;
        const outerR = size;
        const innerR = size * 0.4;
        for (let i = 0; i < points * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (i * Math.PI) / points - Math.PI / 2;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.closePath();
        g.fill({ color, alpha: 0.9 });
        break;
      }
      default: {
        g.circle(0, 0, size);
        g.fill({ color, alpha: 0.9 });
        break;
      }
    }
  }

  spawnParticles(x: number, y: number, type: EffectType) {
    if (!this.PIXI) return;
    const config = effectConfigs[type];
    const PIXI = this.PIXI;

    for (let i = 0; i < config.count; i++) {
      const g = new PIXI.Graphics();
      const colors = config.colors || [config.color];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.drawShape(g, config.shape, config.size * (0.6 + Math.random() * 0.8), color);

      g.x = x + (Math.random() - 0.5) * 20;
      g.y = y + (Math.random() - 0.5) * 10;

      const angle = Math.random() * Math.PI * 2;
      const speed = config.spread * (0.5 + Math.random() * 0.5);

      this.container.addChild(g);
      this.particles.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + config.gravity * 30,
        life: 0,
        maxLife: config.duration * (0.7 + Math.random() * 0.6),
        rotSpeed: (Math.random() - 0.5) * 0.1,
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.vy -= 0.03 * dt; // float upward
      p.g.rotation += p.rotSpeed * dt;

      const progress = p.life / p.maxLife;
      // Fade in quickly, then fade out
      if (progress < 0.1) {
        p.g.alpha = progress / 0.1;
      } else {
        p.g.alpha = Math.max(0, 1 - (progress - 0.1) / 0.9);
      }
      // Scale down near end
      const scale = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
      p.g.scale.set(scale);

      if (p.life >= p.maxLife) {
        this.container.removeChild(p.g);
        p.g.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  destroy() {
    for (const p of this.particles) {
      this.container.removeChild(p.g);
      p.g.destroy();
    }
    this.particles = [];
  }
}
