"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore } from "@/lib/store/gameStore";
import { authApi } from "@/lib/api/client";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { elementColors } from "@/lib/constants";
import { toastReward } from "@/components/ui/Toast";

interface Props {
  onClose: () => void;
}

type RaceState = "select" | "countdown" | "playing" | "result";

// Obstacle types with clear visual identities
// Ground obstacles → JUMP | Aerial obstacles → DUCK
interface Obstacle {
  x: number;
  y: number;
  type: "rock" | "cactus" | "fire" | "spike" | "saw" | "laser";
  width: number;
  height: number;
  hit: boolean;
  osc?: number;
  /** true = aerial (duck to avoid), false = ground (jump to avoid) */
  aerial: boolean;
}

interface PowerUp {
  x: number;
  y: number;
  type: "boost" | "shield" | "heart" | "double";
  collected: boolean;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
  value: number;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  size?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

type WeatherType = "clear" | "rain" | "wind" | "snow";

interface WeatherDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  trail: { x: number; y: number }[];
}

const TRACK_W = 440;
const TRACK_H = 340;
const SLIME_X = 80;
const GROUND_Y = TRACK_H - 40;
const MAX_HP = 3;
const GRAVITY = 0.65;
const JUMP_FORCE = -11.5;
const DOUBLE_JUMP_FORCE = -10;
const INVINCIBLE_MS = 1500;

export default function SlimeRace({ onClose }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const { slimes, species } = useGameStore();

  const [raceState, setRaceState] = useState<RaceState>("select");
  const [selectedSlimeId, setSelectedSlimeId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(MAX_HP);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [jumping, setJumping] = useState(false);
  const [result, setResult] = useState<{ score: number; gold: number; exp: number; maxCombo: number; distance: number } | null>(null);
  const [remaining, setRemaining] = useState(3);
  const [screenShake, setScreenShake] = useState(0);
  const [activePowerUp, setActivePowerUp] = useState<{ type: string; timer: number } | null>(null);
  const [hasShield, setHasShield] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [distance, setDistance] = useState(0);
  const [fever, setFever] = useState(false);
  const [weather, setWeather] = useState<WeatherType>("clear");

  // Game state refs
  const obstaclesRef = useRef<Obstacle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const popupsRef = useRef<ScorePopup[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const hpRef = useRef(MAX_HP);
  const jumpVyRef = useRef(0); // velocity-based jump
  const jumpYRef = useRef(0);
  const jumpCountRef = useRef(0);
  const duckingRef = useRef(false);
  const duckTimerRef = useRef(0);
  const speedRef = useRef(3.5);
  const elapsedRef = useRef(0);
  const shieldRef = useRef(false);
  const boostRef = useRef(false);
  const magnetRef = useRef(false);
  const doubleRef = useRef(false);
  const bgOffsetRef = useRef(0);
  const distanceRef = useRef(0);
  const raceStateRef = useRef<RaceState>("select");
  const nearMissRef = useRef(0);
  const invincibleRef = useRef(0);
  const hitFlashRef = useRef(0);
  const milestoneRef = useRef(0); // next distance milestone
  const feverRef = useRef(false);
  const feverTimerRef = useRef(0);
  const feverFlashRef = useRef(0);
  const weatherRef = useRef<WeatherType>("clear");
  const weatherTimerRef = useRef(0);
  const weatherDropsRef = useRef<WeatherDrop[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const dustTrailRef = useRef<{ x: number; y: number; life: number; alpha: number }[]>([]);
  const auroraPhaseRef = useRef(0);
  raceStateRef.current = raceState;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishCalledRef = useRef(false);

  const tokenRef = useRef(token);
  tokenRef.current = token;
  const selectedSlimeIdRef = useRef(selectedSlimeId);
  selectedSlimeIdRef.current = selectedSlimeId;

  const selectedSlime = slimes.find((s) => s.id === selectedSlimeId);

  const finishRace = useCallback(async () => {
    if (finishCalledRef.current) return;
    finishCalledRef.current = true;

    if (gameRef.current) clearInterval(gameRef.current);

    const finalScore = scoreRef.current;
    const finalMaxCombo = maxComboRef.current;
    const finalDistance = Math.floor(distanceRef.current);
    const tk = tokenRef.current;
    const slimeId = selectedSlimeIdRef.current;
    if (!tk || !slimeId) return;

    try {
      const res = await authApi<{ score: number; gold_reward: number; exp_reward: number }>(
        "/api/race/finish",
        tk,
        { method: "POST", body: { slime_id: slimeId, score: finalScore } },
      );
      setResult({ score: res.score, gold: res.gold_reward, exp: res.exp_reward, maxCombo: finalMaxCombo, distance: finalDistance });
      if (res.gold_reward > 0) {
        toastReward(`\uB808\uC774\uC2A4 \uC644\uB8CC! ${res.gold_reward}G \uD68D\uB4DD`, "\uD83C\uDFC3");
      }
      useAuthStore.getState().fetchUser();
    } catch {
      setResult({ score: finalScore, gold: 0, exp: 0, maxCombo: finalMaxCombo, distance: finalDistance });
    }
    setRaceState("result");
  }, []);

  const startRace = async () => {
    if (!token || !selectedSlimeId) return;
    try {
      const res = await authApi<{ remaining: number }>("/api/race/start", token, {
        method: "POST",
        body: { slime_id: selectedSlimeId },
      });
      setRemaining(res.remaining);
      finishCalledRef.current = false;

      setRaceState("countdown");
      setCountdown(3);
      setScore(0);
      setHp(MAX_HP);
      setCombo(0);
      setMaxCombo(0);
      setJumping(false);
      setScreenShake(0);
      setActivePowerUp(null);
      setHasShield(false);
      setDistance(0);
      setResult(null);
      scoreRef.current = 0;
      comboRef.current = 0;
      maxComboRef.current = 0;
      hpRef.current = MAX_HP;
      jumpVyRef.current = 0;
      jumpYRef.current = 0;
      jumpCountRef.current = 0;
      duckingRef.current = false;
      duckTimerRef.current = 0;
      speedRef.current = 3.5;
      elapsedRef.current = 0;
      shieldRef.current = false;
      boostRef.current = false;
      magnetRef.current = false;
      doubleRef.current = false;
      bgOffsetRef.current = 0;
      distanceRef.current = 0;
      nearMissRef.current = 0;
      invincibleRef.current = 0;
      hitFlashRef.current = 0;
      milestoneRef.current = 100;
      feverRef.current = false;
      feverTimerRef.current = 0;
      feverFlashRef.current = 0;
      weatherRef.current = "clear";
      weatherTimerRef.current = 0;
      weatherDropsRef.current = [];
      shootingStarsRef.current = [];
      dustTrailRef.current = [];
      auroraPhaseRef.current = 0;
      setFever(false);
      setWeather("clear");
      obstaclesRef.current = [];
      powerUpsRef.current = [];
      coinsRef.current = [];
      popupsRef.current = [];
      particlesRef.current = [];

      let c = 3;
      const cdInterval = setInterval(() => {
        c--;
        if (c <= 0) {
          clearInterval(cdInterval);
          setRaceState("playing");
        } else {
          setCountdown(c);
        }
      }, 800);
    } catch {
      // daily limit reached
    }
  };

  // Game loop
  useEffect(() => {
    if (raceState !== "playing") return;

    let lastObSpawn = 0;
    let lastPowerUpSpawn = 0;
    let lastCoinSpawn = 0;
    let patternCooldown = 0;
    const DT = 16; // ~60fps

    gameRef.current = setInterval(() => {
      if (raceStateRef.current !== "playing") return;
      elapsedRef.current += DT;

      // Difficulty: speed ramps gradually, never stops
      const elapsed_s = elapsedRef.current / 1000;
      speedRef.current = 3.5 + elapsed_s * 0.06; // slowly accelerates forever
      const spd = boostRef.current ? speedRef.current * 1.8 : speedRef.current;

      // Background scroll
      bgOffsetRef.current = (bgOffsetRef.current + spd * 0.6) % 80;
      distanceRef.current += spd * 0.05;
      setDistance(Math.floor(distanceRef.current));

      // Distance milestones
      if (distanceRef.current >= milestoneRef.current) {
        const bonus = milestoneRef.current * 2;
        scoreRef.current += bonus;
        setScore(scoreRef.current);
        popupsRef.current.push({
          x: TRACK_W / 2, y: TRACK_H / 2 - 30,
          text: `${milestoneRef.current}m! +${bonus}`,
          life: 1200, color: "#FFEAA7", size: 16,
        });
        milestoneRef.current += 100 + Math.floor(milestoneRef.current * 0.5);
      }

      // ===== FEVER MODE =====
      if (feverRef.current) {
        feverTimerRef.current -= DT;
        feverFlashRef.current += DT;
        if (feverTimerRef.current <= 0) {
          feverRef.current = false;
          setFever(false);
          invincibleRef.current = 0;
        }
      }
      // Trigger fever at combo 15 (only once per fever cycle)
      if (!feverRef.current && comboRef.current >= 15 && comboRef.current % 15 === 0) {
        feverRef.current = true;
        feverTimerRef.current = 5000;
        feverFlashRef.current = 0;
        invincibleRef.current = 5500;
        setFever(true);
        popupsRef.current.push({
          x: TRACK_W / 2, y: TRACK_H / 2 - 50,
          text: "FEVER MODE!", life: 1500, color: "#FF6B6B", size: 22,
        });
      }

      // ===== WEATHER SYSTEM =====
      weatherTimerRef.current -= DT;
      if (weatherTimerRef.current <= 0) {
        const weathers: WeatherType[] = ["clear", "rain", "wind", "snow"];
        let next: WeatherType;
        do {
          next = weathers[Math.floor(Math.random() * weathers.length)];
        } while (next === weatherRef.current && elapsed_s > 10);
        weatherRef.current = next;
        setWeather(next);
        weatherTimerRef.current = 20000 + Math.random() * 20000;
        if (next !== "clear") {
          popupsRef.current.push({
            x: TRACK_W / 2, y: 30,
            text: next === "rain" ? "Rain..." : next === "wind" ? "Strong Wind!" : "Snow!",
            life: 1000, color: next === "rain" ? "#74B9FF" : next === "wind" ? "#DFE6E9" : "#FFFFFF",
          });
        }
      }
      // Spawn weather drops
      const w = weatherRef.current;
      if (w === "rain") {
        for (let i = 0; i < 3; i++) {
          weatherDropsRef.current.push({
            x: Math.random() * TRACK_W, y: -5,
            vx: -1 - Math.random(), vy: 6 + Math.random() * 3,
            size: 1 + Math.random() * 1.5, alpha: 0.15 + Math.random() * 0.1,
          });
        }
      } else if (w === "wind") {
        if (Math.random() < 0.15) {
          weatherDropsRef.current.push({
            x: TRACK_W + 5, y: Math.random() * TRACK_H * 0.7,
            vx: -(8 + Math.random() * 6), vy: 0.5 + Math.random(),
            size: 1 + Math.random() * 2, alpha: 0.1 + Math.random() * 0.08,
          });
        }
      } else if (w === "snow") {
        if (Math.random() < 0.25) {
          weatherDropsRef.current.push({
            x: Math.random() * TRACK_W, y: -5,
            vx: (Math.random() - 0.5) * 1.5, vy: 0.8 + Math.random() * 1.2,
            size: 1.5 + Math.random() * 2, alpha: 0.25 + Math.random() * 0.15,
          });
        }
      }
      weatherDropsRef.current = weatherDropsRef.current.filter(d => {
        d.x += d.vx;
        d.y += d.vy;
        return d.y < TRACK_H + 10 && d.x > -20 && d.x < TRACK_W + 20;
      });

      // ===== SHOOTING STARS =====
      if (Math.random() < 0.003) {
        const star: ShootingStar = {
          x: TRACK_W * 0.3 + Math.random() * TRACK_W * 0.7,
          y: Math.random() * 60,
          vx: -(3 + Math.random() * 3),
          vy: 1 + Math.random() * 2,
          life: 600 + Math.random() * 400,
          trail: [],
        };
        shootingStarsRef.current.push(star);
      }
      shootingStarsRef.current = shootingStarsRef.current.filter(s => {
        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > 12) s.trail.shift();
        s.x += s.vx;
        s.y += s.vy;
        s.life -= DT;
        return s.life > 0;
      });

      // ===== DUST TRAIL =====
      if (jumpYRef.current === 0 && !duckingRef.current) {
        dustTrailRef.current.push({
          x: SLIME_X - 8 + Math.random() * 4,
          y: GROUND_Y + 2 + Math.random() * 3,
          life: 300 + Math.random() * 200,
          alpha: 0.15 + Math.random() * 0.1,
        });
      }
      dustTrailRef.current = dustTrailRef.current.filter(d => {
        d.x -= spd * 0.6;
        d.life -= DT;
        d.alpha *= 0.97;
        return d.life > 0 && d.alpha > 0.01;
      });

      // Aurora phase
      auroraPhaseRef.current += DT * 0.001;

      // Score — base + combo
      const feverMul = feverRef.current ? 15 : 1;
      const comboMul = comboRef.current >= 20 ? 10 : comboRef.current >= 15 ? 8 : comboRef.current >= 10 ? 5 : comboRef.current >= 5 ? 3 : comboRef.current >= 3 ? 2 : 1;
      const doubleBonus = doubleRef.current ? 2 : 1;
      scoreRef.current += comboMul * doubleBonus * feverMul;
      setScore(scoreRef.current);

      // Duck timer
      if (duckingRef.current) {
        duckTimerRef.current -= DT;
        if (duckTimerRef.current <= 0) {
          duckingRef.current = false;
        }
      }

      // Invincibility timer
      if (invincibleRef.current > 0) invincibleRef.current -= DT;
      if (hitFlashRef.current > 0) hitFlashRef.current -= DT;
      if (nearMissRef.current > 0) nearMissRef.current -= DT;

      // ===== PHYSICS-BASED JUMP =====
      if (jumpYRef.current > 0 || jumpVyRef.current < 0) {
        jumpVyRef.current += GRAVITY;
        jumpYRef.current -= jumpVyRef.current;
        if (jumpYRef.current <= 0) {
          jumpYRef.current = 0;
          jumpVyRef.current = 0;
          jumpCountRef.current = 0;
          setJumping(false);
        }
      }

      // Spawn obstacles
      lastObSpawn += DT;
      patternCooldown -= DT;
      const spawnInterval = Math.max(350, 1200 - elapsed_s * 8);
      if (lastObSpawn > spawnInterval) {
        lastObSpawn = 0;

        // Patterns get more frequent as time progresses
        const patternChance = Math.min(0.4, 0.1 + elapsed_s * 0.005);
        if (patternCooldown <= 0 && elapsed_s > 6 && Math.random() < patternChance) {
          patternCooldown = Math.max(1500, 3000 - elapsed_s * 20);
          const pattern = Math.floor(Math.random() * 4);
          if (pattern === 0) {
            // Ground + aerial
            obstaclesRef.current.push(makeObstacle("rock", TRACK_W + 20));
            obstaclesRef.current.push(makeObstacle("saw", TRACK_W + 100));
          } else if (pattern === 1) {
            // Triple ground rush
            obstaclesRef.current.push(makeObstacle("spike", TRACK_W + 20));
            obstaclesRef.current.push(makeObstacle("cactus", TRACK_W + 80));
            obstaclesRef.current.push(makeObstacle("rock", TRACK_W + 150));
          } else if (pattern === 2) {
            // Aerial then ground
            obstaclesRef.current.push(makeObstacle("saw", TRACK_W + 20));
            obstaclesRef.current.push(makeObstacle("fire", TRACK_W + 100));
          } else {
            // Double aerial
            obstaclesRef.current.push(makeObstacle("laser", TRACK_W + 20));
            obstaclesRef.current.push(makeObstacle("spike", TRACK_W + 100));
          }
        } else {
          // Single obstacle
          const groundTypes: Obstacle["type"][] = ["rock", "cactus", "fire", "spike"];
          const aerialTypes: Obstacle["type"][] = elapsed_s > 5 ? ["saw", "laser"] : [];
          const allTypes = [...groundTypes, ...aerialTypes];
          // After 15s, add more aerial
          if (elapsed_s > 15) allTypes.push("saw", "laser");
          const t = allTypes[Math.floor(Math.random() * allTypes.length)];
          obstaclesRef.current.push(makeObstacle(t, TRACK_W + 20));
        }
      }

      // Spawn power-ups
      lastPowerUpSpawn += DT;
      if (lastPowerUpSpawn > 5000 + Math.random() * 4000) {
        lastPowerUpSpawn = 0;
        const types: PowerUp["type"][] = hpRef.current < MAX_HP ? ["boost", "shield", "heart", "double"] : ["boost", "shield", "double"];
        const t = types[Math.floor(Math.random() * types.length)];
        powerUpsRef.current.push({ x: TRACK_W + 20, y: GROUND_Y - 50 - Math.random() * 20, type: t, collected: false });
      }

      // Spawn coins
      lastCoinSpawn += DT;
      if (lastCoinSpawn > 350) {
        lastCoinSpawn = 0;
        if (Math.random() < 0.4) {
          const isBig = Math.random() < 0.1;
          coinsRef.current.push({
            x: TRACK_W + 20,
            y: GROUND_Y - 15 - Math.random() * 55,
            collected: false,
            value: isBig ? 30 : 10,
          });
        }
      }

      // Move obstacles
      obstaclesRef.current = obstaclesRef.current.filter((ob) => {
        ob.x -= spd;
        if (ob.type === "fire" && ob.osc !== undefined) {
          // fire pillar slight wobble
          ob.y = GROUND_Y - ob.height + Math.sin(Date.now() * 0.005 + ob.osc) * 3;
        }
        return ob.x > -50;
      });

      // Move power-ups
      powerUpsRef.current = powerUpsRef.current.filter((pu) => {
        pu.x -= spd;
        return pu.x > -20 && !pu.collected;
      });

      // Move coins
      coinsRef.current = coinsRef.current.filter((c) => {
        c.x -= spd;
        if (magnetRef.current && !c.collected) {
          const dx = SLIME_X - c.x;
          const dy = (GROUND_Y - jumpYRef.current - 14) - c.y;
          c.x += dx * 0.1;
          c.y += dy * 0.1;
        }
        return c.x > -10 && !c.collected;
      });

      // Update popups
      popupsRef.current = popupsRef.current.filter((p) => {
        p.y -= 0.6;
        p.life -= DT;
        return p.life > 0;
      });

      // Update particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life -= DT;
        return p.life > 0;
      });

      // Collision detection
      const isDucking = duckingRef.current && jumpYRef.current === 0;
      const slimeTop = isDucking ? GROUND_Y - 10 : GROUND_Y - 28 - jumpYRef.current;
      const slimeBox = isDucking
        ? { x: SLIME_X - 12, y: GROUND_Y - 10, w: 24, h: 10 }
        : { x: SLIME_X - 12, y: GROUND_Y - 28 - jumpYRef.current, w: 24, h: 28 };

      for (const ob of obstaclesRef.current) {
        if (ob.hit) continue;
        const obBox = { x: ob.x, y: ob.y, w: ob.width, h: ob.height };
        if (checkAABB(slimeBox, obBox)) {
          // HIT!
          if (invincibleRef.current > 0) continue; // still invincible
          if (shieldRef.current) {
            shieldRef.current = false;
            setHasShield(false);
            ob.hit = true;
            popupsRef.current.push({ x: SLIME_X, y: slimeTop - 10, text: "\uD83D\uDEE1\uFE0F", life: 800, color: "#74B9FF" });
            spawnParticles(particlesRef.current, SLIME_X, GROUND_Y - jumpYRef.current - 14, "#74B9FF", 8);
          } else {
            ob.hit = true;
            hpRef.current -= 1;
            setHp(hpRef.current);
            comboRef.current = 0;
            setCombo(0);
            invincibleRef.current = INVINCIBLE_MS;
            hitFlashRef.current = 400;
            setScreenShake(350);
            setTimeout(() => setScreenShake(0), 350);

            const penalty = Math.min(scoreRef.current, 80);
            scoreRef.current = Math.max(0, scoreRef.current - penalty);
            setScore(scoreRef.current);
            popupsRef.current.push({ x: SLIME_X, y: slimeTop - 10, text: `-${penalty} HP!`, life: 900, color: "#FF6B6B", size: 14 });
            spawnParticles(particlesRef.current, SLIME_X, GROUND_Y - jumpYRef.current - 14, "#FF6B6B", 15);

            if (hpRef.current <= 0) {
              finishRace();
              return;
            }
          }
        } else if (!ob.hit && ob.x + ob.width < SLIME_X - 10) {
          // Dodged!
          ob.hit = true;
          comboRef.current += 1;
          if (comboRef.current > maxComboRef.current) {
            maxComboRef.current = comboRef.current;
            setMaxCombo(maxComboRef.current);
          }
          setCombo(comboRef.current);

          // Near-miss detection
          const closeY = Math.abs((GROUND_Y - jumpYRef.current - 14) - (ob.y + ob.height / 2));
          const closeX = Math.abs(SLIME_X - (ob.x + ob.width));
          if ((closeY < 22 || closeX < 18) && nearMissRef.current <= 0) {
            nearMissRef.current = 500;
            const nearBonus = 30 * comboMul;
            scoreRef.current += nearBonus;
            setScore(scoreRef.current);
            popupsRef.current.push({ x: SLIME_X + 30, y: slimeTop - 5, text: `CLOSE! +${nearBonus}`, life: 900, color: "#FF9FF3" });
            spawnParticles(particlesRef.current, SLIME_X, GROUND_Y - jumpYRef.current - 14, "#FF9FF3", 5);
          }

          // Combo milestone bonus
          if (comboRef.current >= 5 && comboRef.current % 5 === 0) {
            const bonus = comboRef.current * 10;
            scoreRef.current += bonus;
            setScore(scoreRef.current);
            popupsRef.current.push({ x: SLIME_X + 35, y: slimeTop, text: `x${comboRef.current} +${bonus}!`, life: 1000, color: "#FFEAA7", size: 14 });
          }
        }
      }

      // Power-up collision
      for (const pu of powerUpsRef.current) {
        if (pu.collected) continue;
        if (Math.abs(pu.x - SLIME_X) < 20 && Math.abs(pu.y - (GROUND_Y - jumpYRef.current - 14)) < 24) {
          pu.collected = true;
          spawnParticles(particlesRef.current, pu.x, pu.y, "#FFEAA7", 6);

          if (pu.type === "boost") {
            boostRef.current = true;
            setActivePowerUp({ type: "boost", timer: 3000 });
            popupsRef.current.push({ x: pu.x, y: pu.y - 10, text: "\uD83D\uDE80 BOOST!", life: 800, color: "#FFEAA7" });
            setTimeout(() => { boostRef.current = false; setActivePowerUp(null); }, 3000);
          } else if (pu.type === "shield") {
            shieldRef.current = true;
            setHasShield(true);
            popupsRef.current.push({ x: pu.x, y: pu.y - 10, text: "\uD83D\uDEE1\uFE0F SHIELD!", life: 800, color: "#74B9FF" });
          } else if (pu.type === "heart") {
            if (hpRef.current < MAX_HP) {
              hpRef.current += 1;
              setHp(hpRef.current);
              popupsRef.current.push({ x: pu.x, y: pu.y - 10, text: "\u2764\uFE0F +1 HP!", life: 800, color: "#FF6B6B" });
            }
          } else if (pu.type === "double") {
            doubleRef.current = true;
            setActivePowerUp({ type: "double", timer: 4000 });
            popupsRef.current.push({ x: pu.x, y: pu.y - 10, text: "\u2728 DOUBLE!", life: 800, color: "#55EFC4" });
            setTimeout(() => { doubleRef.current = false; setActivePowerUp(null); }, 4000);
          }
        }
      }

      // Coin collision
      for (const c of coinsRef.current) {
        if (c.collected) continue;
        if (Math.abs(c.x - SLIME_X) < 16 && Math.abs(c.y - (GROUND_Y - jumpYRef.current - 14)) < 20) {
          c.collected = true;
          const gain = c.value * comboMul * doubleBonus;
          scoreRef.current += gain;
          setScore(scoreRef.current);
          popupsRef.current.push({ x: c.x, y: c.y - 10, text: `+${gain}`, life: 500, color: "#FFEAA7" });
        }
      }

      renderCanvas();
    }, DT);

    return () => {
      if (gameRef.current) clearInterval(gameRef.current);
    };
  }, [raceState, finishRace]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, TRACK_W, TRACK_H);

    // === Sky gradient ===
    const skyGrad = ctx.createLinearGradient(0, 0, 0, TRACK_H * 0.55);
    skyGrad.addColorStop(0, "#060614");
    skyGrad.addColorStop(0.5, "#0a0e24");
    skyGrad.addColorStop(1, "#0f1830");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, TRACK_W, TRACK_H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 35; i++) {
      const sx = ((i * 47 + bgOffsetRef.current * 0.03) % TRACK_W);
      const sy = 4 + (i * 13) % 80;
      const twinkle = 0.2 + Math.sin(Date.now() * 0.002 + i * 0.7) * 0.15;
      ctx.globalAlpha = twinkle;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.4 + (i % 4) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Moon with better glow
    ctx.fillStyle = "rgba(255,234,167,0.04)";
    ctx.beginPath();
    ctx.arc(TRACK_W - 60, 35, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,234,167,0.07)";
    ctx.beginPath();
    ctx.arc(TRACK_W - 60, 35, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,234,167,0.15)";
    ctx.beginPath();
    ctx.arc(TRACK_W - 60, 35, 12, 0, Math.PI * 2);
    ctx.fill();
    // Moon craters
    ctx.fillStyle = "rgba(200,180,120,0.08)";
    ctx.beginPath();
    ctx.arc(TRACK_W - 55, 32, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(TRACK_W - 64, 38, 2, 0, Math.PI * 2);
    ctx.fill();

    // ===== AURORA BOREALIS =====
    const ap = auroraPhaseRef.current;
    const auroraColors = ["rgba(85,239,196,", "rgba(116,185,255,", "rgba(162,155,254,", "rgba(255,159,243,"];
    for (let i = 0; i < 3; i++) {
      const aColor = auroraColors[i % auroraColors.length];
      const aAlpha = 0.02 + Math.sin(ap * 0.8 + i * 1.5) * 0.015;
      ctx.fillStyle = `${aColor}${aAlpha})`;
      ctx.beginPath();
      ctx.moveTo(0, 30 + i * 12);
      for (let x = 0; x <= TRACK_W; x += 8) {
        const y = 30 + i * 12 + Math.sin((x * 0.015) + ap * 0.6 + i * 2) * 15 + Math.sin((x * 0.008) + ap * 0.3) * 8;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(TRACK_W, 0);
      ctx.lineTo(0, 0);
      ctx.fill();
    }

    // ===== SHOOTING STARS =====
    for (const star of shootingStarsRef.current) {
      const starAlpha = Math.min(1, star.life / 200);
      for (let ti = 0; ti < star.trail.length; ti++) {
        const t = star.trail[ti];
        const ta = (ti / star.trail.length) * starAlpha * 0.5;
        ctx.fillStyle = `rgba(255,255,255,${ta})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 1 + (ti / star.trail.length), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(255,255,255,${starAlpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Far mountains (parallax)
    ctx.fillStyle = "#0c1525";
    ctx.beginPath();
    ctx.moveTo(0, 120);
    for (let x = 0; x <= TRACK_W; x += 2) {
      const y = 105 + Math.sin((x + bgOffsetRef.current * 0.08) * 0.011) * 22 + Math.sin((x + bgOffsetRef.current * 0.04) * 0.028) * 10;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(TRACK_W, TRACK_H);
    ctx.lineTo(0, TRACK_H);
    ctx.fill();

    // Near hills
    ctx.fillStyle = "#101e2c";
    ctx.beginPath();
    ctx.moveTo(0, 155);
    for (let x = 0; x <= TRACK_W; x += 2) {
      const y = 145 + Math.sin((x + bgOffsetRef.current * 0.2) * 0.018) * 12;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(TRACK_W, TRACK_H);
    ctx.lineTo(0, TRACK_H);
    ctx.fill();

    // === Ground ===
    // Grass edge
    const grassGrad = ctx.createLinearGradient(0, GROUND_Y - 6, 0, GROUND_Y + 12);
    grassGrad.addColorStop(0, "#1a4020");
    grassGrad.addColorStop(0.3, "#163018");
    grassGrad.addColorStop(1, "#0d1a10");
    ctx.fillStyle = grassGrad;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= TRACK_W; x += 4) {
      const y = GROUND_Y + Math.sin((x + bgOffsetRef.current * 0.4) * 0.06) * 2.5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(TRACK_W, TRACK_H);
    ctx.lineTo(0, TRACK_H);
    ctx.fill();

    // Underground
    ctx.fillStyle = "#0a1208";
    ctx.fillRect(0, GROUND_Y + 10, TRACK_W, TRACK_H - GROUND_Y);

    // Track line
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    ctx.setLineDash([16, 12]);
    const offset = bgOffsetRef.current % 28;
    ctx.beginPath();
    ctx.moveTo(-offset, GROUND_Y + 10);
    ctx.lineTo(TRACK_W, GROUND_Y + 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Grass blades
    const grassColor = "rgba(60,140,60,0.3)";
    for (let gx = 0; gx < TRACK_W; gx += 18) {
      const gxOff = (gx + bgOffsetRef.current * 0.4) % (TRACK_W + 20) - 10;
      const sway = Math.sin(Date.now() * 0.003 + gx * 0.1) * 2;
      ctx.strokeStyle = grassColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gxOff, GROUND_Y + 1);
      ctx.lineTo(gxOff + sway, GROUND_Y - 4 - (gx % 7));
      ctx.stroke();
    }

    // ===== DUST TRAIL =====
    for (const d of dustTrailRef.current) {
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = "rgba(160,140,100,0.5)";
      ctx.beginPath();
      ctx.arc(d.x, d.y, 1.5 + (1 - d.life / 500) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ===== WEATHER RENDERING =====
    const curWeather = weatherRef.current;
    if (curWeather === "rain") {
      ctx.strokeStyle = "rgba(116,185,255,0.25)";
      ctx.lineWidth = 0.8;
      for (const d of weatherDropsRef.current) {
        ctx.globalAlpha = d.alpha;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.vx * 2, d.y + d.vy * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Rain puddle shimmer on ground
      ctx.fillStyle = "rgba(116,185,255,0.03)";
      for (let px = 0; px < TRACK_W; px += 40) {
        const shimmer = Math.sin(Date.now() * 0.003 + px * 0.05) * 0.02;
        ctx.globalAlpha = 0.04 + shimmer;
        ctx.beginPath();
        ctx.ellipse(px + (bgOffsetRef.current * 0.3) % 40, GROUND_Y + 3, 12, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (curWeather === "wind") {
      ctx.strokeStyle = "rgba(220,220,230,0.08)";
      ctx.lineWidth = 1;
      for (const d of weatherDropsRef.current) {
        ctx.globalAlpha = d.alpha;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.vx * 3, d.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (curWeather === "snow") {
      for (const d of weatherDropsRef.current) {
        ctx.globalAlpha = d.alpha;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Snow accumulation on ground
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(0, GROUND_Y - 1, TRACK_W, 3);
    }

    // Speed lines
    if (speedRef.current > 5 || boostRef.current) {
      const lineCount = boostRef.current ? 14 : Math.floor((speedRef.current - 5) * 4);
      const alpha = boostRef.current ? 0.15 : Math.min(0.1, (speedRef.current - 5) * 0.02);
      ctx.strokeStyle = `rgba(255,234,167,${alpha})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < lineCount; i++) {
        const ly = 20 + (i * 29 + bgOffsetRef.current * 1.5) % (TRACK_H - 50);
        const lx = (i * 61 + bgOffsetRef.current * 2) % TRACK_W;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - 25 - Math.random() * 25, ly);
        ctx.stroke();
      }
    }

    // === OBSTACLES with clear visual identities ===
    for (const ob of obstaclesRef.current) {
      if (ob.hit) {
        ctx.globalAlpha = 0.1;
      }
      drawObstacle(ctx, ob);
      ctx.globalAlpha = 1;
    }

    // Coins
    for (const c of coinsRef.current) {
      if (c.collected) continue;
      const shimmer = Math.sin(Date.now() * 0.008 + c.x * 0.1) * 0.2;
      const r = c.value >= 30 ? 6 : 4;
      // Glow
      ctx.fillStyle = `rgba(255,200,100,${0.08 + shimmer * 0.05})`;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r + 4, 0, Math.PI * 2);
      ctx.fill();
      // Outer
      ctx.fillStyle = c.value >= 30 ? `rgba(255,200,80,${0.9 + shimmer})` : `rgba(255,234,167,${0.85 + shimmer})`;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fill();
      // Inner
      ctx.fillStyle = c.value >= 30 ? "#B8860B" : "#D4A700";
      ctx.beginPath();
      ctx.arc(c.x, c.y, r - 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Power-ups
    for (const pu of powerUpsRef.current) {
      if (pu.collected) continue;
      const puColors: Record<string, string> = { boost: "#FFEAA7", shield: "#74B9FF", heart: "#FF6B6B", double: "#55EFC4" };
      const puIcons: Record<string, string> = { boost: "\u26A1", shield: "\uD83D\uDEE1", heart: "\u2764", double: "\u00D72" };
      const puFloat = Math.sin(Date.now() * 0.004 + pu.x * 0.05) * 3;
      const py = pu.y + puFloat;
      // Glow
      ctx.fillStyle = `${puColors[pu.type]}18`;
      ctx.beginPath();
      ctx.arc(pu.x, py, 16, 0, Math.PI * 2);
      ctx.fill();
      // Circle
      ctx.fillStyle = `${puColors[pu.type]}40`;
      ctx.beginPath();
      ctx.arc(pu.x, py, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = puColors[pu.type];
      ctx.beginPath();
      ctx.arc(pu.x, py, 8, 0, Math.PI * 2);
      ctx.fill();
      // Icon
      ctx.fillStyle = "#0a0a1a";
      ctx.font = "bold 9px Arial";
      ctx.textAlign = "center";
      ctx.fillText(puIcons[pu.type], pu.x, py + 3);
    }

    // Particles
    for (const p of particlesRef.current) {
      ctx.globalAlpha = Math.max(0, p.life / 400);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // === SLIME ===
    const slimeY = GROUND_Y - jumpYRef.current;
    const color = selectedSlime ? (elementColors[selectedSlime.element] || "#55EFC4") : "#55EFC4";
    const isDucking = duckingRef.current && jumpYRef.current === 0;
    const isInvincible = invincibleRef.current > 0;

    // Shadow
    const shadowScale = 1 - jumpYRef.current / 200;
    ctx.fillStyle = `rgba(0,0,0,${0.25 * shadowScale})`;
    ctx.beginPath();
    ctx.ellipse(SLIME_X, GROUND_Y + 6, 14 * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Invincibility flash
    if (isInvincible && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    ctx.save();
    if (isDucking) {
      ctx.translate(SLIME_X, slimeY - 5);
      ctx.scale(1.4, 0.4);
    } else {
      // Squash/stretch based on velocity
      const stretchY = jumpVyRef.current < -5 ? 0.85 : jumpVyRef.current > 5 ? 1.2 : 1;
      const stretchX = jumpVyRef.current < -5 ? 1.15 : jumpVyRef.current > 5 ? 0.85 : 1;
      ctx.translate(SLIME_X, slimeY - 15);
      ctx.scale(stretchX, stretchY);
    }

    // Body glow (rainbow during fever)
    if (feverRef.current) {
      const fhue = (feverFlashRef.current * 0.4) % 360;
      ctx.fillStyle = `hsla(${fhue},100%,70%,0.15)`;
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsla(${fhue},100%,70%,0.08)`;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `${color}20`;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = feverRef.current ? `hsl(${(feverFlashRef.current * 0.4) % 360}, 80%, 65%)` : color;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(-4, -7, 5, 3.5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-5, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = "#1a1a2e";
    const pupilShift = isDucking ? 1.5 : jumpVyRef.current < -3 ? -1.5 : 0;
    ctx.beginPath();
    ctx.arc(-4.5, -1.5 + pupilShift, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5.5, -1.5 + pupilShift, 2, 0, Math.PI * 2);
    ctx.fill();
    // Eye shine
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(-5.5, -3, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4.5, -3, 1, 0, Math.PI * 2);
    ctx.fill();

    // Mouth expression
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 1.3;
    if (isDucking) {
      // Worried "O" mouth
      ctx.beginPath();
      ctx.arc(0, 4, 3, 0, Math.PI * 2);
      ctx.stroke();
    } else if (jumpYRef.current > 30) {
      // Excited "D" smile
      ctx.beginPath();
      ctx.arc(0, 3, 4, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = "#1a1a2e";
      ctx.beginPath();
      ctx.arc(0, 3, 3.5, 0, Math.PI);
      ctx.fill();
    } else if (hitFlashRef.current > 0) {
      // Hurt "X" mouth
      ctx.beginPath();
      ctx.moveTo(-3, 2); ctx.lineTo(3, 6);
      ctx.moveTo(3, 2); ctx.lineTo(-3, 6);
      ctx.stroke();
    } else {
      // Running grin
      ctx.beginPath();
      ctx.arc(0, 3, 3.5, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }

    // Blush when high combo
    if (comboRef.current >= 10) {
      ctx.fillStyle = "rgba(255,150,150,0.2)";
      ctx.beginPath();
      ctx.ellipse(-8, 3, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(8, 3, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.globalAlpha = 1;

    // Double jump indicator (show when 1 jump used and in air)
    if (jumpYRef.current > 5 && jumpCountRef.current === 1) {
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.2;
      ctx.fillStyle = "#FFEAA7";
      ctx.font = "bold 9px Arial";
      ctx.textAlign = "center";
      ctx.fillText("\u2191\u2191", SLIME_X, slimeY - 32);
      ctx.globalAlpha = 1;
    }

    // Shield bubble
    if (shieldRef.current) {
      const shieldPulse = Math.sin(Date.now() * 0.005) * 0.15;
      ctx.strokeStyle = `rgba(116,185,255,${0.4 + shieldPulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(SLIME_X, slimeY - 15, 23, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(116,185,255,0.04)`;
      ctx.fill();
    }

    // Boost trail
    if (boostRef.current) {
      for (let i = 1; i <= 5; i++) {
        ctx.globalAlpha = 0.1 / i;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(SLIME_X - 10 * i, slimeY - 15, 15 - i * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Score popups
    for (const p of popupsRef.current) {
      ctx.globalAlpha = Math.max(0, p.life / 800);
      ctx.fillStyle = p.color;
      ctx.font = `bold ${p.size || 12}px Arial`;
      ctx.textAlign = "center";
      // Text shadow
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillText(p.text, p.x + 1, p.y + 1);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // Hit flash overlay
    if (hitFlashRef.current > 0) {
      const flashAlpha = Math.min(0.25, hitFlashRef.current / 1000);
      ctx.fillStyle = `rgba(255,50,50,${flashAlpha})`;
      ctx.fillRect(0, 0, TRACK_W, TRACK_H);
    }

    // Danger vignette when speed is high
    if (speedRef.current > 6 && !feverRef.current) {
      const vigAlpha = Math.min((speedRef.current - 6) * 0.015, 0.1);
      const gradient = ctx.createRadialGradient(TRACK_W / 2, TRACK_H / 2, TRACK_H * 0.35, TRACK_W / 2, TRACK_H / 2, TRACK_H * 0.75);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(255,40,40,${vigAlpha})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, TRACK_W, TRACK_H);
    }

    // ===== FEVER MODE OVERLAY =====
    if (feverRef.current) {
      const ft = feverFlashRef.current;
      // Rainbow border pulse
      const hue = (ft * 0.3) % 360;
      const feverAlpha = 0.06 + Math.sin(ft * 0.008) * 0.03;
      // Edge glow
      const edgeGrad = ctx.createRadialGradient(TRACK_W / 2, TRACK_H / 2, TRACK_H * 0.3, TRACK_W / 2, TRACK_H / 2, TRACK_H * 0.7);
      edgeGrad.addColorStop(0, "rgba(0,0,0,0)");
      edgeGrad.addColorStop(1, `hsla(${hue},100%,70%,${feverAlpha})`);
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(0, 0, TRACK_W, TRACK_H);

      // Rainbow particles
      if (Math.random() < 0.5) {
        const rainbowColors = ["#FF6B6B", "#FFEAA7", "#55EFC4", "#74B9FF", "#A29BFE", "#FF9FF3"];
        const rc = rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
        particlesRef.current.push({
          x: Math.random() * TRACK_W,
          y: Math.random() * TRACK_H * 0.6,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 1.5,
          life: 300 + Math.random() * 300,
          color: rc,
          size: 1 + Math.random() * 2,
        });
      }

      // "FEVER" watermark
      ctx.save();
      ctx.globalAlpha = 0.06 + Math.sin(ft * 0.005) * 0.03;
      ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
      ctx.font = "bold 40px Arial";
      ctx.textAlign = "center";
      ctx.fillText("FEVER", TRACK_W / 2, TRACK_H / 2 + 15);
      ctx.restore();

      // Fever timer bar at top
      const feverPct = feverTimerRef.current / 5000;
      const barW = TRACK_W * 0.6;
      const barX = (TRACK_W - barW) / 2;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      roundRect(ctx, barX, 4, barW, 5, 2.5);
      ctx.fill();
      const feverGrad = ctx.createLinearGradient(barX, 0, barX + barW * feverPct, 0);
      feverGrad.addColorStop(0, `hsl(${hue}, 100%, 60%)`);
      feverGrad.addColorStop(1, `hsl(${(hue + 60) % 360}, 100%, 60%)`);
      ctx.fillStyle = feverGrad;
      roundRect(ctx, barX, 4, barW * feverPct, 5, 2.5);
      ctx.fill();
    }

    // Weather icon overlay
    if (curWeather !== "clear") {
      ctx.globalAlpha = 0.4;
      ctx.font = "14px Arial";
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.fillText(curWeather === "rain" ? "\uD83C\uDF27" : curWeather === "wind" ? "\uD83C\uDF2C" : "\u2744\uFE0F", TRACK_W - 8, 18);
      ctx.globalAlpha = 1;
    }
  };

  const handleJump = () => {
    if (raceState !== "playing") return;
    // Cancel duck if ducking
    if (duckingRef.current) {
      duckingRef.current = false;
      duckTimerRef.current = 0;
    }
    // First jump — from ground
    if (jumpYRef.current === 0 && jumpCountRef.current === 0) {
      jumpVyRef.current = JUMP_FORCE;
      jumpCountRef.current = 1;
      setJumping(true);
      // Dust particles
      spawnParticles(particlesRef.current, SLIME_X, GROUND_Y, "rgba(180,180,150,0.4)", 4);
    }
    // Double jump — from air, must have used first jump
    else if (jumpCountRef.current === 1 && jumpYRef.current > 3) {
      jumpVyRef.current = DOUBLE_JUMP_FORCE;
      jumpCountRef.current = 2;
      // Air puff particles
      spawnParticles(particlesRef.current, SLIME_X, GROUND_Y - jumpYRef.current, "rgba(255,255,255,0.3)", 5);
    }
  };

  const handleDuck = () => {
    if (raceState !== "playing") return;
    if (jumpYRef.current === 0) {
      duckingRef.current = true;
      duckTimerRef.current = 450;
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        handleJump();
      }
      if (e.code === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleDuck();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [raceState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Touch: swipe detection
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) {
      handleJump();
      return;
    }
    const t = e.changedTouches[0];
    const dy = t.clientY - touchStartRef.current.y;
    const dx = Math.abs(t.clientX - touchStartRef.current.x);
    const dt = Date.now() - touchStartRef.current.t;
    if (dy > 25 && dy > dx && dt < 400) {
      handleDuck();
    } else {
      handleJump();
    }
    touchStartRef.current = null;
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#060614] flex flex-col">
      {/* Floating close button */}
      <button
        onClick={onClose}
        className="absolute right-3 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/50 hover:text-white text-sm transition"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        {"\u2715"}
      </button>

      {raceState === "select" && (
        <div className="flex-1 overflow-y-auto game-scroll p-4" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 48px)" }}>
          <h2 className="text-white font-bold text-base text-center mb-1">{"\uD83C\uDFC3 \uC2AC\uB77C\uC784 \uB808\uC774\uC2A4"}</h2>
          <p className="text-[#B2BEC3] text-xs text-center mb-1">
            {"\uC7A5\uC560\uBB3C\uC744 \uD53C\uD558\uBA70 \uB2EC\uB824\uC694! HP\uAC00 0\uC774 \uB418\uBA74 \uACBD\uAE30 \uC885\uB8CC"}
          </p>
          <p className="text-[#636e72] text-[10px] text-center mb-1">
            {"\uD0ED/\u2191 \uC810\uD504 | \u2191\u2191 \uB354\uBE14\uC810\uD504 | \u2193/\uC2A4\uC640\uC774\uD504 \uC5CE\uB4DC\uB9AC\uAE30"}
          </p>
          <p className="text-[#A29BFE] text-[10px] text-center mb-4">
            {"\uCF64\uBCF4 15+ \u2192 FEVER MODE (x15 \uC810\uC218, \uBB34\uC801) | \uB0A0\uC528\uAC00 \uBC14\uB00C\uC5B4\uC694!"}
          </p>
          <div className="space-y-2 max-w-[360px] mx-auto">
            {slimes.map((slime) => {
              const sp = species.find((s) => s.id === slime.species_id);
              const isSelected = slime.id === selectedSlimeId;
              const c = elementColors[slime.element] || "#55EFC4";
              return (
                <button
                  key={slime.id}
                  onClick={() => setSelectedSlimeId(slime.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                  style={{
                    background: isSelected ? `${c}15` : "rgba(255,255,255,0.02)",
                    border: isSelected ? `1px solid ${c}40` : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <img src={generateSlimeIconSvg(slime.element, 40)} alt="" className="w-10 h-10 drop-shadow-md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-medium truncate">
                      {slime.name || sp?.name || "???"}
                    </div>
                    <div className="text-[9px] text-[#B2BEC3]">Lv.{slime.level}</div>
                  </div>
                  {isSelected && <span className="text-xs font-bold" style={{ color: c }}>{"\u2713"}</span>}
                </button>
              );
            })}
          </div>
          <button
            onClick={startRace}
            disabled={!selectedSlimeId}
            className="btn-primary w-full max-w-[360px] mx-auto block py-3 text-sm mt-4 font-bold active:scale-95 transition-transform"
          >
            {"\uD83C\uDFC3 \uB808\uC774\uC2A4 \uC2DC\uC791!"}
          </button>
        </div>
      )}

      {raceState === "countdown" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <span className="text-8xl font-black text-[#FFEAA7] animate-bounce" key={countdown}
              style={{ textShadow: "0 0 60px rgba(255,234,167,0.5)" }}>
              {countdown}
            </span>
            <p className="text-[#B2BEC3] text-sm mt-4">{"\uC900\uBE44\uD558\uC138\uC694!"}</p>
          </div>
        </div>
      )}

      {raceState === "playing" && (
        <div
          className="flex-1 flex flex-col items-center justify-center select-none"
          onClick={handleJump}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative w-full" style={{ maxWidth: TRACK_W + 2 }}>
            {/* HUD row */}
            <div className="flex items-center justify-between px-2 mb-1.5">
              <div className="flex items-center gap-3">
                {/* HP Hearts */}
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: MAX_HP }, (_, i) => (
                    <span key={i} className="text-base" style={{
                      filter: i < hp ? "none" : "grayscale(1) opacity(0.3)",
                      transform: i < hp && hitFlashRef.current > 0 && i === hp ? "scale(1.3)" : "scale(1)",
                      transition: "transform 0.15s",
                    }}>
                      {i < hp ? "\u2764\uFE0F" : "\uD83D\uDDA4"}
                    </span>
                  ))}
                </div>
                <span className="text-[#FFEAA7] text-lg font-black tabular-nums">{score}</span>
              </div>
              <div className="flex items-center gap-3">
                {/* Combo */}
                <span className="text-sm font-black tabular-nums" style={{
                  color: combo >= 20 ? "#FF6B6B" : combo >= 15 ? "#FF9FF3" : combo >= 10 ? "#FFEAA7" : combo >= 5 ? "#55EFC4" : combo >= 3 ? "#74B9FF" : "#636e72",
                }}>
                  {combo >= 3 && (
                    <>
                      x{combo >= 20 ? 10 : combo >= 15 ? 8 : combo >= 10 ? 5 : combo >= 5 ? 3 : 2}
                      <span className="text-[9px] text-[#B2BEC3] ml-0.5">{combo}</span>
                    </>
                  )}
                </span>
                <span className="text-[#A29BFE] text-sm font-bold tabular-nums">{distance}m</span>
              </div>
            </div>

            {/* Active power-up badge */}
            <div className="h-5 flex justify-center gap-2 mb-1">
              {fever && (
                <div className="px-3 py-0.5 rounded-full text-[10px] font-black animate-pulse"
                  style={{
                    background: "linear-gradient(90deg, rgba(255,107,107,0.2), rgba(255,234,167,0.2), rgba(85,239,196,0.2), rgba(116,185,255,0.2), rgba(162,155,254,0.2))",
                    color: "#FFEAA7",
                    border: "1px solid rgba(255,234,167,0.3)",
                    boxShadow: "0 0 10px rgba(255,234,167,0.2)",
                  }}>
                  {"FEVER x15!"}
                </div>
              )}
              {activePowerUp && !fever && (
                <div className="px-3 py-0.5 rounded-full text-[10px] font-bold animate-pulse" style={{
                  background: activePowerUp.type === "boost" ? "rgba(255,234,167,0.15)"
                    : activePowerUp.type === "double" ? "rgba(85,239,196,0.15)"
                      : "rgba(162,155,254,0.15)",
                  color: activePowerUp.type === "boost" ? "#FFEAA7"
                    : activePowerUp.type === "double" ? "#55EFC4"
                      : "#A29BFE",
                }}>
                  {activePowerUp.type === "boost" ? "\uD83D\uDE80 \uBD80\uC2A4\uD2B8!" : activePowerUp.type === "double" ? "\u2728 \uB354\uBE14!" : "\uD83E\uDDF2 \uC790\uC11D!"}
                </div>
              )}
              {hasShield && !activePowerUp && !fever && (
                <div className="px-3 py-0.5 rounded-full bg-[#74B9FF]/10 border border-[#74B9FF]/20">
                  <span className="text-[10px] text-[#74B9FF] font-bold">{"\uD83D\uDEE1\uFE0F \uC270\uB4DC"}</span>
                </div>
              )}
            </div>

            {/* Race canvas */}
            <div className="rounded-2xl overflow-hidden border mx-auto"
              style={{
                borderColor: fever ? `hsla(${(Date.now() * 0.3) % 360},100%,70%,0.3)` : "rgba(255,255,255,0.08)",
                transform: screenShake > 0 ? `translate(${(Math.random() - 0.5) * 10}px, ${(Math.random() - 0.5) * 10}px)` : undefined,
                boxShadow: fever
                  ? `0 0 30px hsla(${(Date.now() * 0.3) % 360},100%,70%,0.15), 0 0 60px hsla(${(Date.now() * 0.3 + 120) % 360},100%,70%,0.08)`
                  : `0 0 40px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,0,0,0.15)${speedRef.current > 6 ? `, 0 0 ${(speedRef.current - 6) * 8}px rgba(255,100,50,0.1)` : ""}`,
              }}>
              <canvas
                ref={canvasRef}
                width={TRACK_W}
                height={TRACK_H}
                className="block w-full"
                style={{ imageRendering: "auto" }}
              />
            </div>
          </div>

          {/* Controls legend */}
          <div className="flex items-center justify-center gap-2 mt-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(85,239,196,0.08)", border: "1px solid rgba(85,239,196,0.12)" }}>
              <span className="text-[10px] text-[#55EFC4] font-bold">{"\u2191 / TAP"}</span>
              <span className="text-[9px] text-white/30">{"\uC810\uD504"}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,234,167,0.08)", border: "1px solid rgba(255,234,167,0.12)" }}>
              <span className="text-[10px] text-[#FFEAA7] font-bold">{"\u2191\u2191"}</span>
              <span className="text-[9px] text-white/30">{"\uB354\uBE14"}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(162,155,254,0.08)", border: "1px solid rgba(162,155,254,0.12)" }}>
              <span className="text-[10px] text-[#A29BFE] font-bold">{"\u2193 / SWIPE"}</span>
              <span className="text-[9px] text-white/30">{"\uC5CE\uB4DC\uB9AC\uAE30"}</span>
            </div>
            {weather !== "clear" && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{
                background: weather === "rain" ? "rgba(116,185,255,0.08)" : weather === "wind" ? "rgba(220,220,230,0.08)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${weather === "rain" ? "rgba(116,185,255,0.15)" : weather === "wind" ? "rgba(220,220,230,0.12)" : "rgba(255,255,255,0.1)"}`,
              }}>
                <span className="text-[10px]">{weather === "rain" ? "\uD83C\uDF27" : weather === "wind" ? "\uD83C\uDF2C" : "\u2744\uFE0F"}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {raceState === "result" && result && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="animate-scale-in text-center game-panel rounded-2xl p-6 w-full max-w-[340px]">
            <span className="text-5xl block animate-celebrate-bounce">{"\uD83C\uDFC6"}</span>
            <h3 className="text-white font-bold text-lg mt-3">{"\uB808\uC774\uC2A4 \uC644\uB8CC!"}</h3>

            <div className="text-4xl font-black mt-2 animate-number-pop" style={{
              background: "linear-gradient(135deg, #FFEAA7, #55EFC4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>{result.score}{"\uC810"}</div>

            <div className="flex items-center justify-center gap-5 mt-3">
              <div className="text-center">
                <div className="text-[#A29BFE] text-sm font-bold">{result.distance}m</div>
                <div className="text-[9px] text-[#B2BEC3]">{"\uAC70\uB9AC"}</div>
              </div>
              <div className="text-center">
                <div className="text-[#55EFC4] text-sm font-bold">x{result.maxCombo}</div>
                <div className="text-[9px] text-[#B2BEC3]">{"\uCD5C\uB300 \uCF64\uBCF4"}</div>
              </div>
              <div className="text-center">
                <div className="text-[#FFEAA7] text-sm font-bold flex items-center gap-1 justify-center">
                  <img src="/assets/icons/gold.png" alt="" className="w-4 h-4 pixel-art" />
                  +{result.gold}
                </div>
                <div className="text-[9px] text-[#B2BEC3]">{"\uACE8\uB4DC"}</div>
              </div>
              <div className="text-center">
                <div className="text-[#FF9FF3] text-sm font-bold">+{result.exp}</div>
                <div className="text-[9px] text-[#B2BEC3]">{"\uACBD\uD5D8\uCE58"}</div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#B2BEC3] text-xs">
                {"\uB2EB\uAE30"}
              </button>
              {remaining > 0 && (
                <button onClick={() => setRaceState("select")} className="flex-1 btn-primary py-2.5 text-xs font-bold">
                  {"\uB2E4\uC2DC"} ({remaining})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Obstacle Drawing — Each type has distinct colors, shapes, and warning indicators =====
function drawObstacle(ctx: CanvasRenderingContext2D, ob: Obstacle) {
  const cx = ob.x + ob.width / 2;
  const cy = ob.y + ob.height / 2;

  switch (ob.type) {
    case "rock": {
      // 🪨 Brown boulder — round, earthy, with cracks
      // Ground warning: small triangle below
      if (!ob.hit) {
        ctx.fillStyle = "rgba(180,130,80,0.06)";
        ctx.beginPath();
        ctx.arc(cx, cy, ob.width * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      // Main body
      ctx.fillStyle = "#7a6040";
      ctx.beginPath();
      ctx.arc(cx, cy, ob.width / 2, 0, Math.PI * 2);
      ctx.fill();
      // Darker bottom half
      ctx.fillStyle = "#5a4530";
      ctx.beginPath();
      ctx.arc(cx, cy + 2, ob.width / 2 - 2, 0, Math.PI);
      ctx.fill();
      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.arc(cx - 3, cy - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      // Crack lines
      ctx.strokeStyle = "rgba(40,30,20,0.4)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - 2); ctx.lineTo(cx + 1, cy + 3);
      ctx.moveTo(cx + 2, cy - 3); ctx.lineTo(cx + 4, cy);
      ctx.stroke();
      break;
    }

    case "cactus": {
      // 🌵 Green cactus — tall, spiny, unmistakable
      if (!ob.hit) {
        ctx.fillStyle = "rgba(80,180,80,0.05)";
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      // Main stem
      ctx.fillStyle = "#3a8a3a";
      roundRect(ctx, ob.x + 4, ob.y, ob.width - 8, ob.height, 4);
      ctx.fill();
      // Left arm
      ctx.fillStyle = "#3a8a3a";
      roundRect(ctx, ob.x - 1, ob.y + 6, 6, 12, 3);
      ctx.fill();
      // Right arm
      roundRect(ctx, ob.x + ob.width - 5, ob.y + 10, 6, 10, 3);
      ctx.fill();
      // Highlight stripe
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(ob.x + 6, ob.y + 2, 2, ob.height - 4);
      // Spines
      ctx.strokeStyle = "rgba(100,200,100,0.5)";
      ctx.lineWidth = 0.7;
      for (let sy = ob.y + 3; sy < ob.y + ob.height - 2; sy += 5) {
        ctx.beginPath();
        ctx.moveTo(ob.x + 3, sy); ctx.lineTo(ob.x, sy - 2);
        ctx.moveTo(ob.x + ob.width - 3, sy); ctx.lineTo(ob.x + ob.width, sy - 2);
        ctx.stroke();
      }
      break;
    }

    case "fire": {
      // 🔥 Red-orange fire pillar — tall column with animated flames
      // Warm glow
      if (!ob.hit) {
        const fireGlow = ctx.createRadialGradient(cx, cy - 5, 0, cx, cy - 5, 22);
        fireGlow.addColorStop(0, "rgba(255,100,30,0.15)");
        fireGlow.addColorStop(1, "rgba(255,100,30,0)");
        ctx.fillStyle = fireGlow;
        ctx.beginPath();
        ctx.arc(cx, cy - 5, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      // Column
      ctx.fillStyle = "#cc3820";
      roundRect(ctx, ob.x + 1, ob.y + 6, ob.width - 2, ob.height - 6, 3);
      ctx.fill();
      // Column dark stripe
      ctx.fillStyle = "#992810";
      ctx.fillRect(ob.x + 3, ob.y + 8, 3, ob.height - 10);
      // Flame top — animated
      const ft = Date.now() * 0.008;
      const flames = [
        { dx: 0, s: 8 + Math.sin(ft) * 2 },
        { dx: -4, s: 5 + Math.sin(ft + 1) * 1.5 },
        { dx: 4, s: 5 + Math.cos(ft + 2) * 1.5 },
      ];
      for (const f of flames) {
        ctx.fillStyle = "#ff6020";
        ctx.beginPath();
        ctx.arc(cx + f.dx, ob.y + 3, f.s, 0, Math.PI * 2);
        ctx.fill();
      }
      // Inner bright flame
      ctx.fillStyle = "#ffcc44";
      ctx.beginPath();
      ctx.arc(cx, ob.y + 2, 4 + Math.sin(ft * 1.3) * 1, 0, Math.PI * 2);
      ctx.fill();
      // White hot core
      ctx.fillStyle = "rgba(255,255,200,0.6)";
      ctx.beginPath();
      ctx.arc(cx, ob.y + 3, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "spike": {
      // 🔺 Silver metallic spikes — triangular, shiny, dangerous
      if (!ob.hit) {
        ctx.fillStyle = "rgba(200,200,220,0.06)";
        ctx.beginPath();
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        ctx.fill();
      }
      // Triple spike formation
      const spikeW = ob.width / 3;
      for (let i = 0; i < 3; i++) {
        const sx = ob.x + i * spikeW;
        // Main spike
        ctx.fillStyle = "#b0b0c0";
        ctx.beginPath();
        ctx.moveTo(sx, ob.y + ob.height);
        ctx.lineTo(sx + spikeW / 2, ob.y + (i === 1 ? 0 : 4));
        ctx.lineTo(sx + spikeW, ob.y + ob.height);
        ctx.fill();
        // Light side
        ctx.fillStyle = "rgba(220,220,240,0.4)";
        ctx.beginPath();
        ctx.moveTo(sx, ob.y + ob.height);
        ctx.lineTo(sx + spikeW / 2, ob.y + (i === 1 ? 0 : 4));
        ctx.lineTo(sx + spikeW / 2, ob.y + ob.height);
        ctx.fill();
      }
      // Glint at tip
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(cx, ob.y + 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "saw": {
      // 🔴 Red spinning saw blade — AERIAL, must duck
      // Warning line
      if (!ob.hit) {
        ctx.strokeStyle = "rgba(255,80,80,0.12)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(TRACK_W, cy);
        ctx.stroke();
        ctx.setLineDash([]);
        // "!" warning
        ctx.fillStyle = "rgba(255,80,80,0.3)";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.fillText("!", ob.x + ob.width + 15, cy + 4);
      }
      // Glow
      if (!ob.hit) {
        ctx.fillStyle = "rgba(255,50,50,0.1)";
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      // Spinning blade
      const sawT = Date.now() * 0.008;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sawT);
      // Blade teeth
      ctx.fillStyle = "#dd3030";
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
        ctx.lineTo(Math.cos(angle + 0.25) * 7, Math.sin(angle + 0.25) * 7);
        ctx.fill();
      }
      // Center
      ctx.fillStyle = "#ff5050";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      // Core
      ctx.fillStyle = "#880000";
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // "DUCK" label for aerial
      if (!ob.hit) {
        ctx.fillStyle = "rgba(255,100,100,0.5)";
        ctx.font = "bold 7px Arial";
        ctx.textAlign = "center";
        ctx.fillText("\u25BC", cx, cy + 16);
      }
      break;
    }

    case "laser": {
      // 🟢 Green horizontal laser beam — AERIAL, must duck
      // Warning
      if (!ob.hit) {
        ctx.strokeStyle = "rgba(100,255,100,0.08)";
        ctx.lineWidth = ob.height;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(TRACK_W, cy);
        ctx.stroke();
      }
      // Beam glow
      const laserPulse = 0.6 + Math.sin(Date.now() * 0.01) * 0.2;
      ctx.fillStyle = `rgba(50,255,50,${0.08 * laserPulse})`;
      ctx.fillRect(ob.x - 5, ob.y - 3, ob.width + 10, ob.height + 6);
      // Main beam
      ctx.fillStyle = `rgba(80,255,80,${0.7 * laserPulse})`;
      ctx.fillRect(ob.x, ob.y, ob.width, ob.height);
      // Bright center
      ctx.fillStyle = `rgba(180,255,180,${0.5 * laserPulse})`;
      ctx.fillRect(ob.x, ob.y + ob.height / 2 - 1, ob.width, 2);
      // Emitter on left
      ctx.fillStyle = "#30aa30";
      ctx.beginPath();
      ctx.arc(ob.x, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(150,255,150,${0.8 * laserPulse})`;
      ctx.beginPath();
      ctx.arc(ob.x, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // "DUCK" label
      if (!ob.hit) {
        ctx.fillStyle = "rgba(100,255,100,0.4)";
        ctx.font = "bold 7px Arial";
        ctx.textAlign = "center";
        ctx.fillText("\u25BC", cx, cy + 14);
      }
      break;
    }
  }
}

function makeObstacle(type: Obstacle["type"], x: number): Obstacle {
  switch (type) {
    case "rock":
      return { x, y: GROUND_Y - 18, type, width: 20, height: 18, hit: false, aerial: false };
    case "cactus":
      return { x, y: GROUND_Y - 30, type, width: 18, height: 30, hit: false, aerial: false };
    case "fire":
      return { x, y: GROUND_Y - 35, type, width: 14, height: 35, hit: false, osc: Math.random() * Math.PI * 2, aerial: false };
    case "spike":
      return { x, y: GROUND_Y - 20, type, width: 24, height: 20, hit: false, aerial: false };
    case "saw":
      return { x, y: GROUND_Y - 58, type, width: 22, height: 22, hit: false, aerial: true };
    case "laser":
      return { x, y: GROUND_Y - 50, type, width: 40, height: 8, hit: false, aerial: true };
  }
}

function checkAABB(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
}

function spawnParticles(particles: Particle[], x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 4,
      life: 350 + Math.random() * 200,
      color,
      size: 1.5 + Math.random() * 2.5,
    });
  }
}
