// SVG Slime Sprite Generator — Kawaii Jelly Redesign
// Generates high-quality vector slime illustrations as SVG data URLs
// Multi-layer jelly shading, colored iris eyes, soft highlights, element decorations

import { getAccessorySvg, getAccessoryDefs } from "@/lib/slimeAccessories";

// ─── Color Helpers ───────────────────────────────────────────────────────────

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color))).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function lightenColor(hex: string, percent: number): string {
  const { h, s, l } = hexToHSL(hex);
  return hslToHex(h, s, Math.min(100, l + percent));
}

function darkenColor(hex: string, percent: number): string {
  const { h, s, l } = hexToHSL(hex);
  return hslToHex(h, s, Math.max(0, l - percent));
}

// ─── Color System ────────────────────────────────────────────────────────────

interface SlimeColors {
  body: string;
  light: string;
  dark: string;
  accent: string;
  iris: string;
  glow: string;
  blush: string;
}

const ELEMENT_COLORS: Record<string, SlimeColors> = {
  water: {
    body: "#5BB8F5", light: "#B0DEFF", dark: "#3578D8", accent: "#D0EDFF",
    iris: "#2B7AE8", glow: "#89C4FF", blush: "#FFA4C4",
  },
  fire: {
    body: "#F56B4A", light: "#FFB89C", dark: "#C8382A", accent: "#FF9F43",
    iris: "#E83A1E", glow: "#FF8866", blush: "#FFB088",
  },
  grass: {
    body: "#48D48E", light: "#AEF5CE", dark: "#289A60", accent: "#80FFB8",
    iris: "#22AA58", glow: "#6AE8A0", blush: "#FFB8D0",
  },
  light: {
    body: "#F2D66A", light: "#FFF8C0", dark: "#D4A428", accent: "#FFFDE0",
    iris: "#E8B820", glow: "#FFE878", blush: "#FFD0A0",
  },
  dark: {
    body: "#9080D0", light: "#C8B8F5", dark: "#6050A0", accent: "#D8D0FF",
    iris: "#7858CC", glow: "#A898E0", blush: "#D8A0E0",
  },
  ice: {
    body: "#88F0F0", light: "#D0FAFA", dark: "#50B8C0", accent: "#E8FFFF",
    iris: "#38C8D8", glow: "#A0F0F8", blush: "#E0C0FF",
  },
  electric: {
    body: "#FFD060", light: "#FFF4C0", dark: "#D0A038", accent: "#FFFAD8",
    iris: "#E8A810", glow: "#FFE078", blush: "#FFE0A0",
  },
  poison: {
    body: "#7860E8", light: "#A898FF", dark: "#4830B8", accent: "#D0C8F8",
    iris: "#6838E0", glow: "#9878F0", blush: "#D8A0F0",
  },
  earth: {
    body: "#D06848", light: "#FFC0A0", dark: "#A04030", accent: "#FFD8C8",
    iris: "#C04828", glow: "#F09870", blush: "#FFB898",
  },
  wind: {
    body: "#B0D0DB", light: "#F0F5F8", dark: "#7FA8B8", accent: "#FFFFFF",
    iris: "#88A8B8", glow: "#C8D8E0", blush: "#F0C0D0",
  },
  celestial: {
    body: "#FF80B0", light: "#FFC0D8", dark: "#C84880", accent: "#FFE0F0",
    iris: "#E830A0", glow: "#FFA0C8", blush: "#FFA8D8",
  },
};

// ─── Species Hash (deterministic trait selection) ────────────────────────────

function speciesHash(speciesId: number, salt: number): number {
  let h = speciesId * 2654435761 + salt * 340573;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  return ((h >>> 16) ^ h) >>> 0;
}

function pickFromArray<T>(arr: T[], speciesId: number, salt: number): T {
  return arr[speciesHash(speciesId, salt) % arr.length];
}

// ─── Per-Species Color Variation ─────────────────────────────────────────────

function getSpeciesColors(element: string, speciesId: number): SlimeColors {
  const base = ELEMENT_COLORS[element] || ELEMENT_COLORS.water;
  if (speciesId === 0) return base;

  const h1 = speciesHash(speciesId, 100);
  const h2 = speciesHash(speciesId, 101);
  const hueShift = ((h1 % 29) - 14); // ±14 degrees
  const lightShift = ((h2 % 11) - 5); // ±5 lightness

  function shiftColor(hex: string): string {
    const hsl = hexToHSL(hex);
    return hslToHex(
      (hsl.h + hueShift + 360) % 360,
      Math.max(0, Math.min(100, hsl.s)),
      Math.max(5, Math.min(95, hsl.l + lightShift))
    );
  }

  return {
    body: shiftColor(base.body),
    light: shiftColor(base.light),
    dark: shiftColor(base.dark),
    accent: shiftColor(base.accent),
    iris: shiftColor(base.iris),
    glow: shiftColor(base.glow),
    blush: shiftColor(base.blush),
  };
}

// ─── Body Variants (15 shapes) ──────────────────────────────────────────────

type BodyVariant = "round" | "elongated" | "spiky" | "flat" | "teardrop"
  | "blob" | "mushroom" | "star" | "cube" | "tall"
  | "wide" | "diamond" | "bean" | "ghost" | "crescent";

const BODY_VARIANTS: BodyVariant[] = [
  "round", "elongated", "spiky", "flat", "teardrop",
  "blob", "mushroom", "star", "cube", "tall",
  "wide", "diamond", "bean", "ghost", "crescent",
];

interface ShapeLayout {
  eyeCenterY: number;
  mouthCenterY: number;
  eyeSpacing: number;
  faceScale: number;
}

function getShapeLayout(variant: BodyVariant): ShapeLayout {
  switch (variant) {
    case "round": return { eyeCenterY: 48, mouthCenterY: 61, eyeSpacing: 13, faceScale: 1.0 };
    case "elongated": return { eyeCenterY: 44, mouthCenterY: 58, eyeSpacing: 12, faceScale: 0.95 };
    case "spiky": return { eyeCenterY: 48, mouthCenterY: 61, eyeSpacing: 13, faceScale: 1.0 };
    case "flat": return { eyeCenterY: 50, mouthCenterY: 63, eyeSpacing: 14, faceScale: 1.05 };
    case "teardrop": return { eyeCenterY: 44, mouthCenterY: 57, eyeSpacing: 12, faceScale: 0.95 };
    case "blob": return { eyeCenterY: 50, mouthCenterY: 64, eyeSpacing: 14, faceScale: 1.05 };
    case "mushroom": return { eyeCenterY: 54, mouthCenterY: 66, eyeSpacing: 12, faceScale: 0.9 };
    case "star": return { eyeCenterY: 50, mouthCenterY: 63, eyeSpacing: 12, faceScale: 0.9 };
    case "cube": return { eyeCenterY: 50, mouthCenterY: 63, eyeSpacing: 14, faceScale: 1.0 };
    case "tall": return { eyeCenterY: 42, mouthCenterY: 56, eyeSpacing: 11, faceScale: 0.9 };
    case "wide": return { eyeCenterY: 52, mouthCenterY: 65, eyeSpacing: 16, faceScale: 1.1 };
    case "diamond": return { eyeCenterY: 48, mouthCenterY: 60, eyeSpacing: 11, faceScale: 0.9 };
    case "bean": return { eyeCenterY: 46, mouthCenterY: 60, eyeSpacing: 12, faceScale: 0.95 };
    case "ghost": return { eyeCenterY: 44, mouthCenterY: 57, eyeSpacing: 13, faceScale: 1.0 };
    case "crescent": return { eyeCenterY: 48, mouthCenterY: 62, eyeSpacing: 12, faceScale: 0.95 };
  }
}

function getBodyPath(variant: BodyVariant): string {
  switch (variant) {
    case "round":
      return "M20,58 C20,38 28,20 50,18 C72,20 80,38 80,58 C80,72 70,86 50,87 C30,86 20,72 20,58 Z";
    case "elongated":
      return "M27,56 C27,32 35,16 50,14 C65,16 73,32 73,56 C73,74 65,87 50,88 C35,87 27,74 27,56 Z";
    case "spiky":
      return "M22,58 C22,34 32,20 50,18 C68,20 78,34 78,58 C78,70 72,80 62,84 C56,86 44,86 38,84 C28,80 22,70 22,58 Z";
    case "flat":
      return "M16,60 C16,44 28,28 50,26 C72,28 84,44 84,60 C84,72 72,84 50,85 C28,84 16,72 16,60 Z";
    case "teardrop":
      return "M28,54 C28,32 36,14 50,12 C64,14 72,32 72,54 C72,72 64,88 50,89 C36,88 28,72 28,54 Z";
    case "blob":
      return "M18,60 C16,42 24,26 42,22 C54,20 72,28 80,44 C86,56 82,74 66,84 C52,90 30,88 20,76 C16,70 18,64 18,60 Z";
    case "mushroom":
      return "M14,48 C14,28 28,14 50,12 C72,14 86,28 86,48 C86,58 78,64 68,66 L68,84 C68,88 60,90 50,90 C40,90 32,88 32,84 L32,66 C22,64 14,58 14,48 Z";
    case "star":
      return "M50,10 L58,32 L82,32 L64,48 L72,72 L50,58 L28,72 L36,48 L18,32 L42,32 Z";
    case "cube":
      return "M20,28 L80,28 C82,28 84,30 84,32 L84,78 C84,80 82,82 80,82 L20,82 C18,82 16,80 16,78 L16,32 C16,30 18,28 20,28 Z";
    case "tall":
      return "M30,56 C30,26 36,10 50,8 C64,10 70,26 70,56 C70,76 64,92 50,93 C36,92 30,76 30,56 Z";
    case "wide":
      return "M12,58 C12,42 22,30 50,28 C78,30 88,42 88,58 C88,72 78,82 50,84 C22,82 12,72 12,58 Z";
    case "diamond":
      return "M50,10 C62,24 78,44 78,56 C78,72 66,88 50,90 C34,88 22,72 22,56 C22,44 38,24 50,10 Z";
    case "bean":
      return "M24,50 C20,30 30,14 46,12 C58,14 64,24 62,38 C66,32 76,30 80,42 C84,56 76,76 60,84 C44,88 28,82 22,68 C18,60 22,54 24,50 Z";
    case "ghost":
      return "M24,50 C24,26 34,10 50,8 C66,10 76,26 76,50 L76,76 L68,70 L60,78 L50,70 L40,78 L32,70 L24,76 Z";
    case "crescent":
      return "M26,54 C26,30 36,14 52,12 C68,14 78,30 78,54 C78,72 70,86 54,88 C44,88 36,82 34,72 C40,78 50,78 56,72 C64,64 64,44 56,34 C48,26 38,30 34,42 C30,50 28,54 26,54 Z";
  }
}

function getInnerPath(variant: BodyVariant): string {
  switch (variant) {
    case "round":
      return "M24,56 C24,40 32,24 50,22 C68,24 76,40 76,56 C76,68 68,80 50,81 C32,80 24,68 24,56 Z";
    case "elongated":
      return "M31,54 C31,36 38,20 50,18 C62,20 69,36 69,54 C69,70 63,82 50,83 C37,82 31,70 31,54 Z";
    case "spiky":
      return "M26,56 C26,38 34,24 50,22 C66,24 74,38 74,56 C74,66 68,76 50,78 C32,76 26,66 26,56 Z";
    case "flat":
      return "M20,58 C20,46 30,32 50,30 C70,32 80,46 80,58 C80,68 72,80 50,81 C28,80 20,68 20,58 Z";
    case "teardrop":
      return "M32,52 C32,34 38,18 50,16 C62,18 68,34 68,52 C68,68 62,84 50,85 C38,84 32,68 32,52 Z";
    case "blob":
      return "M22,58 C20,44 28,30 44,26 C54,24 70,32 76,46 C82,56 78,72 64,80 C52,86 34,84 24,74 C20,68 22,62 22,58 Z";
    case "mushroom":
      return "M18,48 C18,30 30,18 50,16 C70,18 82,30 82,48 C82,56 76,62 66,64 L66,82 C66,84 60,86 50,86 C40,86 34,84 34,82 L34,64 C24,62 18,56 18,48 Z";
    case "star":
      return "M50,16 L56,34 L76,34 L62,48 L68,68 L50,56 L32,68 L38,48 L24,34 L44,34 Z";
    case "cube":
      return "M24,32 L76,32 C78,32 80,34 80,36 L80,74 C80,76 78,78 76,78 L24,78 C22,78 20,76 20,74 L20,36 C20,34 22,32 24,32 Z";
    case "tall":
      return "M34,54 C34,28 38,14 50,12 C62,14 66,28 66,54 C66,74 62,88 50,89 C38,88 34,74 34,54 Z";
    case "wide":
      return "M16,56 C16,44 24,34 50,32 C76,34 84,44 84,56 C84,68 76,78 50,80 C24,78 16,68 16,56 Z";
    case "diamond":
      return "M50,16 C60,28 74,46 74,56 C74,70 64,84 50,86 C36,84 26,70 26,56 C26,46 40,28 50,16 Z";
    case "bean":
      return "M28,50 C24,32 32,18 46,16 C56,18 62,26 60,40 C64,34 74,34 78,44 C80,54 74,72 58,80 C46,84 32,80 26,66 C22,58 26,54 28,50 Z";
    case "ghost":
      return "M28,50 C28,28 36,14 50,12 C64,14 72,28 72,50 L72,72 L66,68 L60,74 L50,68 L40,74 L34,68 L28,72 Z";
    case "crescent":
      return "M30,54 C30,32 38,18 52,16 C66,18 74,32 74,54 C74,70 68,82 54,84 C46,84 40,80 38,72 C44,76 52,74 56,68 C62,62 62,46 56,38 C50,30 42,34 38,44 C34,50 32,54 30,54 Z";
  }
}

// ─── Pattern System (8 types) ───────────────────────────────────────────────

type PatternType = "none" | "stripes" | "spots" | "swirl" | "chevrons" | "gradient_band" | "diamond_tiles" | "half_tone";
const PATTERN_TYPES: PatternType[] = ["none", "stripes", "spots", "swirl", "chevrons", "gradient_band", "diamond_tiles", "half_tone"];

function getPatternSvg(pattern: PatternType, colors: SlimeColors, uid: string, bodyPath: string): { defs: string; overlay: string } {
  if (pattern === "none") return { defs: "", overlay: "" };
  const patColor = lightenColor(colors.body, 12);
  const patDark = darkenColor(colors.body, 8);

  const clipDef = `<clipPath id="patclip_${uid}"><path d="${bodyPath}"/></clipPath>`;

  let patternContent = "";
  switch (pattern) {
    case "stripes":
      patternContent = `
        <line x1="0" y1="30" x2="100" y2="30" stroke="${patColor}" stroke-width="4" opacity="0.18"/>
        <line x1="0" y1="50" x2="100" y2="50" stroke="${patColor}" stroke-width="3" opacity="0.15"/>
        <line x1="0" y1="70" x2="100" y2="70" stroke="${patColor}" stroke-width="4" opacity="0.18"/>`;
      break;
    case "spots":
      patternContent = `
        <circle cx="35" cy="35" r="6" fill="${patColor}" opacity="0.2"/>
        <circle cx="62" cy="42" r="5" fill="${patColor}" opacity="0.18"/>
        <circle cx="44" cy="65" r="7" fill="${patColor}" opacity="0.16"/>
        <circle cx="68" cy="68" r="4" fill="${patColor}" opacity="0.2"/>
        <circle cx="30" cy="55" r="3.5" fill="${patColor}" opacity="0.15"/>`;
      break;
    case "swirl":
      patternContent = `
        <path d="M50,30 Q60,40 50,55 Q40,65 50,75" fill="none" stroke="${patColor}" stroke-width="3" opacity="0.2"/>
        <path d="M38,35 Q48,45 38,58" fill="none" stroke="${patColor}" stroke-width="2" opacity="0.15"/>`;
      break;
    case "chevrons":
      patternContent = `
        <path d="M20,40 L50,30 L80,40" fill="none" stroke="${patColor}" stroke-width="3" opacity="0.18"/>
        <path d="M20,55 L50,45 L80,55" fill="none" stroke="${patColor}" stroke-width="2.5" opacity="0.15"/>
        <path d="M20,70 L50,60 L80,70" fill="none" stroke="${patColor}" stroke-width="2" opacity="0.12"/>`;
      break;
    case "gradient_band":
      patternContent = `
        <rect x="0" y="40" width="100" height="20" fill="${patDark}" opacity="0.12"/>
        <rect x="0" y="42" width="100" height="16" fill="${patColor}" opacity="0.08"/>`;
      break;
    case "diamond_tiles":
      patternContent = `
        <polygon points="50,25 60,35 50,45 40,35" fill="${patColor}" opacity="0.15"/>
        <polygon points="35,45 45,55 35,65 25,55" fill="${patColor}" opacity="0.12"/>
        <polygon points="65,45 75,55 65,65 55,55" fill="${patColor}" opacity="0.12"/>
        <polygon points="50,60 60,70 50,80 40,70" fill="${patColor}" opacity="0.1"/>`;
      break;
    case "half_tone":
      patternContent = `
        <circle cx="30" cy="30" r="2" fill="${patDark}" opacity="0.18"/>
        <circle cx="42" cy="30" r="2.5" fill="${patDark}" opacity="0.16"/>
        <circle cx="54" cy="30" r="3" fill="${patDark}" opacity="0.14"/>
        <circle cx="66" cy="30" r="2.5" fill="${patDark}" opacity="0.12"/>
        <circle cx="36" cy="45" r="3" fill="${patDark}" opacity="0.16"/>
        <circle cx="50" cy="45" r="3.5" fill="${patDark}" opacity="0.14"/>
        <circle cx="64" cy="45" r="3" fill="${patDark}" opacity="0.12"/>
        <circle cx="30" cy="60" r="2.5" fill="${patDark}" opacity="0.14"/>
        <circle cx="44" cy="60" r="2" fill="${patDark}" opacity="0.12"/>
        <circle cx="58" cy="60" r="2.5" fill="${patDark}" opacity="0.1"/>
        <circle cx="70" cy="60" r="2" fill="${patDark}" opacity="0.08"/>`;
      break;
  }

  return {
    defs: clipDef,
    overlay: `<g clip-path="url(#patclip_${uid})">${patternContent}</g>`,
  };
}

// ─── Appendage System (12 types) ────────────────────────────────────────────

type AppendageType = "none" | "small_horns" | "single_horn" | "cat_ears" | "bunny_ears" | "antenna" | "tiny_wings" | "tail_curl" | "tail_spike" | "tentacles" | "fins" | "spikes_top";
const APPENDAGE_TYPES: AppendageType[] = ["none", "small_horns", "single_horn", "cat_ears", "bunny_ears", "antenna", "tiny_wings", "tail_curl", "tail_spike", "tentacles", "fins", "spikes_top"];

function getAppendageSvg(appendage: AppendageType, colors: SlimeColors): string {
  if (appendage === "none") return "";
  const c = colors.dark;
  const cl = colors.body;
  switch (appendage) {
    case "small_horns":
      return `
        <path d="M36,20 L32,6 L40,16" fill="${c}" opacity="0.8"/>
        <path d="M64,20 L68,6 L60,16" fill="${c}" opacity="0.8"/>
        <path d="M34,14 L33,8" fill="none" stroke="${lightenColor(c,15)}" stroke-width="0.8" opacity="0.4"/>
        <path d="M66,14 L67,8" fill="none" stroke="${lightenColor(c,15)}" stroke-width="0.8" opacity="0.4"/>`;
    case "single_horn":
      return `
        <path d="M50,18 L48,2 L52,2 Z" fill="${cl}" opacity="0.85"/>
        <path d="M49,14 L49,4" fill="none" stroke="white" stroke-width="0.8" opacity="0.3"/>`;
    case "cat_ears":
      return `
        <path d="M26,30 L20,8 L38,22" fill="${cl}" opacity="0.85"/>
        <path d="M74,30 L80,8 L62,22" fill="${cl}" opacity="0.85"/>
        <path d="M26,28 L22,12 L36,22" fill="${lightenColor(cl,20)}" opacity="0.4"/>
        <path d="M74,28 L78,12 L64,22" fill="${lightenColor(cl,20)}" opacity="0.4"/>`;
    case "bunny_ears":
      return `
        <path d="M36,20 Q32,0 28,-10 Q34,0 40,16" fill="${cl}" opacity="0.8" stroke="${c}" stroke-width="0.5"/>
        <path d="M64,20 Q68,0 72,-10 Q66,0 60,16" fill="${cl}" opacity="0.8" stroke="${c}" stroke-width="0.5"/>
        <path d="M33,10 Q32,2 30,-4" fill="none" stroke="${lightenColor(cl,25)}" stroke-width="2" opacity="0.35"/>
        <path d="M67,10 Q68,2 70,-4" fill="none" stroke="${lightenColor(cl,25)}" stroke-width="2" opacity="0.35"/>`;
    case "antenna":
      return `
        <line x1="42" y1="18" x2="36" y2="2" stroke="${c}" stroke-width="1.5" opacity="0.7"/>
        <line x1="58" y1="18" x2="64" y2="2" stroke="${c}" stroke-width="1.5" opacity="0.7"/>
        <circle cx="36" cy="2" r="3" fill="${colors.accent}" opacity="0.85"/>
        <circle cx="64" cy="2" r="3" fill="${colors.accent}" opacity="0.85"/>
        <circle cx="35" cy="1" r="1.2" fill="white" opacity="0.5"/>
        <circle cx="63" cy="1" r="1.2" fill="white" opacity="0.5"/>`;
    case "tiny_wings":
      return `
        <path d="M18,48 Q4,36 8,24 Q12,34 18,40" fill="${colors.light}" opacity="0.5" stroke="${cl}" stroke-width="0.5"/>
        <path d="M82,48 Q96,36 92,24 Q88,34 82,40" fill="${colors.light}" opacity="0.5" stroke="${cl}" stroke-width="0.5"/>
        <path d="M16,44 Q6,32 10,22" fill="none" stroke="${colors.accent}" stroke-width="1" opacity="0.3"/>
        <path d="M84,44 Q94,32 90,22" fill="none" stroke="${colors.accent}" stroke-width="1" opacity="0.3"/>`;
    case "tail_curl":
      return `
        <path d="M78,68 Q92,62 94,50 Q96,40 88,36" fill="none" stroke="${cl}" stroke-width="3.5" stroke-linecap="round" opacity="0.7"/>
        <circle cx="88" cy="36" r="3" fill="${colors.accent}" opacity="0.6"/>`;
    case "tail_spike":
      return `
        <path d="M78,66 L94,58 L86,54 L96,44" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
        <polygon points="96,44 92,40 98,38" fill="${c}" opacity="0.6"/>`;
    case "tentacles":
      return `
        <path d="M28,82 Q22,92 18,96" fill="none" stroke="${cl}" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
        <path d="M40,84 Q38,94 34,98" fill="none" stroke="${cl}" stroke-width="2" stroke-linecap="round" opacity="0.45"/>
        <path d="M60,84 Q62,94 66,98" fill="none" stroke="${cl}" stroke-width="2" stroke-linecap="round" opacity="0.45"/>
        <path d="M72,82 Q78,92 82,96" fill="none" stroke="${cl}" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>`;
    case "fins":
      return `
        <path d="M18,50 Q8,46 6,38 Q10,44 16,44" fill="${cl}" opacity="0.6"/>
        <path d="M82,50 Q92,46 94,38 Q90,44 84,44" fill="${cl}" opacity="0.6"/>
        <path d="M46,16 Q50,8 54,16" fill="${cl}" opacity="0.55"/>`;
    case "spikes_top":
      return `
        <polygon points="34,20 32,8 38,18" fill="${c}" opacity="0.65"/>
        <polygon points="44,18 43,4 48,16" fill="${c}" opacity="0.7"/>
        <polygon points="56,18 57,4 52,16" fill="${c}" opacity="0.7"/>
        <polygon points="66,20 68,8 62,18" fill="${c}" opacity="0.65"/>`;
    default:
      return "";
  }
}

// ─── Marking System (7 types) ───────────────────────────────────────────────

type MarkingType = "none" | "star_mark" | "heart" | "scar" | "patch" | "diamond_mark" | "cross";
const MARKING_TYPES: MarkingType[] = ["none", "star_mark", "heart", "scar", "patch", "diamond_mark", "cross"];

function getMarkingSvg(marking: MarkingType, colors: SlimeColors): string {
  if (marking === "none") return "";
  const mc = darkenColor(colors.body, 15);
  switch (marking) {
    case "star_mark":
      return `<polygon points="72,58 73.5,62 77,63 74,65 75,69 72,67 69,69 70,65 67,63 70.5,62" fill="${mc}" opacity="0.35"/>`;
    case "heart":
      return `<path d="M70,56 Q72,52 75,54 Q78,56 75,60 L72,64 L69,60 Q66,56 69,54 Q72,52 70,56" fill="${mc}" opacity="0.3"/>`;
    case "scar":
      return `
        <line x1="66" y1="36" x2="74" y2="44" stroke="${mc}" stroke-width="1.5" opacity="0.4" stroke-linecap="round"/>
        <line x1="68" y1="44" x2="72" y2="36" stroke="${mc}" stroke-width="1" opacity="0.3" stroke-linecap="round"/>`;
    case "patch":
      return `<ellipse cx="70" cy="60" rx="8" ry="7" fill="${lightenColor(colors.body, 18)}" opacity="0.35"/>`;
    case "diamond_mark":
      return `<polygon points="72,54 76,60 72,66 68,60" fill="${mc}" opacity="0.3"/>`;
    case "cross":
      return `
        <line x1="68" y1="56" x2="76" y2="64" stroke="${mc}" stroke-width="1.8" opacity="0.3" stroke-linecap="round"/>
        <line x1="76" y1="56" x2="68" y2="64" stroke="${mc}" stroke-width="1.8" opacity="0.3" stroke-linecap="round"/>`;
    default:
      return "";
  }
}

// ─── Hidden Species Special Handling ─────────────────────────────────────────

function getHiddenSpeciesOverride(speciesId: number): {
  colors: SlimeColors; variant: BodyVariant; appendage: AppendageType;
  pattern: PatternType; marking: MarkingType; extraDefs: string; extraOverlay: string;
} | null {
  if (speciesId === 777) {
    // Joy Boy — rainbow gradient, star shape, angel wings
    return {
      colors: {
        body: "#FFD700", light: "#FFFACD", dark: "#FF8C00", accent: "#FFFDE0",
        iris: "#FF6347", glow: "#FFEC8B", blush: "#FFB6C1",
      },
      variant: "star", appendage: "tiny_wings", pattern: "none", marking: "star_mark",
      extraDefs: `
        <linearGradient id="rainbow_joy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FF6B6B"/>
          <stop offset="20%" stop-color="#FECA57"/>
          <stop offset="40%" stop-color="#55EFC4"/>
          <stop offset="60%" stop-color="#48DBFB"/>
          <stop offset="80%" stop-color="#A29BFE"/>
          <stop offset="100%" stop-color="#FF6B6B"/>
        </linearGradient>`,
      extraOverlay: `<path d="M50,10 L58,32 L82,32 L64,48 L72,72 L50,58 L28,72 L36,48 L18,32 L42,32 Z" fill="url(#rainbow_joy)" opacity="0.25"/>`,
    };
  }
  if (speciesId === 888) {
    // Im — near-black + purple glow, ghost shape, shadow tentacles
    return {
      colors: {
        body: "#2D1B4E", light: "#4A2D7A", dark: "#1A0E30", accent: "#7B48C8",
        iris: "#9B59B6", glow: "#6B3FA0", blush: "#4A2D6E",
      },
      variant: "ghost", appendage: "tentacles", pattern: "swirl", marking: "scar",
      extraDefs: `
        <filter id="shadow_im" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
          <feColorMatrix in="blur" type="matrix" values="0.3 0 0 0 0.1  0 0 0.3 0 0  0 0 0.5 0 0.2  0 0 0 0.6 0"/>
        </filter>`,
      extraOverlay: `<path d="M24,50 C24,26 34,10 50,8 C66,10 76,26 76,50 L76,76 L68,70 L60,78 L50,70 L40,78 L32,70 L24,76 Z" stroke="#9B59B6" stroke-width="1.5" fill="none" opacity="0.3" filter="url(#shadow_im)"/>`,
    };
  }
  if (speciesId === 999) {
    // One Piece — gold prism, diamond shape, crown
    return {
      colors: {
        body: "#FFD700", light: "#FFFDE0", dark: "#DAA520", accent: "#FFF8DC",
        iris: "#FF4500", glow: "#FFE878", blush: "#FFD0A0",
      },
      variant: "diamond", appendage: "single_horn", pattern: "diamond_tiles", marking: "diamond_mark",
      extraDefs: `
        <linearGradient id="prism_999" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFD700" stop-opacity="0.3"/>
          <stop offset="50%" stop-color="#FFF8DC" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#DAA520" stop-opacity="0.3"/>
        </linearGradient>`,
      extraOverlay: `
        <path d="M50,10 C62,24 78,44 78,56 C78,72 66,88 50,90 C34,88 22,72 22,56 C22,44 38,24 50,10 Z" fill="url(#prism_999)" opacity="0.3"/>
        <polygon points="40,14 42,4 46,12 50,2 54,12 58,4 60,14" fill="#FFD700" opacity="0.7"/>
        <circle cx="50" cy="6" r="2.5" fill="#FF4500" opacity="0.8"/>`,
    };
  }
  return null;
}

// ─── Eyes (7-layer with colored iris) ────────────────────────────────────────

function getEyes(personality: string, irisColor: string): string {
  const pupil = "#1A1A2E";

  switch (personality) {
    case "energetic":
      // Wide open sparkling eyes
      return `
        <!-- Sclera -->
        <ellipse cx="37" cy="48" rx="10.5" ry="11" fill="white"/>
        <ellipse cx="63" cy="48" rx="10.5" ry="11" fill="white"/>
        <!-- Iris outer -->
        <ellipse cx="38" cy="49" rx="7.5" ry="8" fill="${irisColor}"/>
        <ellipse cx="64" cy="49" rx="7.5" ry="8" fill="${irisColor}"/>
        <!-- Iris inner (lighter ring) -->
        <ellipse cx="38" cy="49" rx="5.5" ry="6" fill="${lightenColor(irisColor, 15)}"/>
        <ellipse cx="64" cy="49" rx="5.5" ry="6" fill="${lightenColor(irisColor, 15)}"/>
        <!-- Pupil -->
        <ellipse cx="38" cy="49" rx="3.5" ry="4" fill="${pupil}"/>
        <ellipse cx="64" cy="49" rx="3.5" ry="4" fill="${pupil}"/>
        <!-- Main highlight (big, upper-left) -->
        <circle cx="41" cy="45" r="3.8" fill="white" opacity="0.92"/>
        <circle cx="67" cy="45" r="3.8" fill="white" opacity="0.92"/>
        <!-- Sub highlight (lower-right) -->
        <circle cx="35" cy="52" r="2" fill="white" opacity="0.6"/>
        <circle cx="61" cy="52" r="2" fill="white" opacity="0.6"/>
        <!-- Sparkle dot -->
        <circle cx="43" cy="47" r="1" fill="white" opacity="0.95"/>
        <circle cx="69" cy="47" r="1" fill="white" opacity="0.95"/>
        <!-- Exclamation mark -->
        <text x="74" y="38" font-size="8" font-weight="bold" fill="#FF6B6B" opacity="0.75" font-family="sans-serif">!</text>
      `;
    case "chill":
      // Half-closed drowsy eyes
      return `
        <!-- Sclera (half-lidded) -->
        <ellipse cx="37" cy="50" rx="9.5" ry="5" fill="white"/>
        <ellipse cx="63" cy="50" rx="9.5" ry="5" fill="white"/>
        <!-- Iris -->
        <ellipse cx="37" cy="51" rx="7" ry="3.5" fill="${irisColor}"/>
        <ellipse cx="63" cy="51" rx="7" ry="3.5" fill="${irisColor}"/>
        <!-- Pupil -->
        <ellipse cx="37" cy="51" rx="4" ry="2.2" fill="${pupil}"/>
        <ellipse cx="63" cy="51" rx="4" ry="2.2" fill="${pupil}"/>
        <!-- Eyelid lines -->
        <path d="M29,48 Q37,45 45,48" fill="none" stroke="#2D3436" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M55,48 Q63,45 71,48" fill="none" stroke="#2D3436" stroke-width="1.8" stroke-linecap="round"/>
        <!-- Tiny highlight -->
        <circle cx="40" cy="49" r="1.5" fill="white" opacity="0.7"/>
        <circle cx="66" cy="49" r="1.5" fill="white" opacity="0.7"/>
      `;
    case "foodie":
      // Star-shaped sparkle eyes (eager)
      return `
        <!-- Sclera -->
        <ellipse cx="37" cy="48" rx="10" ry="10.5" fill="white"/>
        <ellipse cx="63" cy="48" rx="10" ry="10.5" fill="white"/>
        <!-- Iris -->
        <ellipse cx="37" cy="49" rx="7.5" ry="8" fill="${irisColor}"/>
        <ellipse cx="63" cy="49" rx="7.5" ry="8" fill="${irisColor}"/>
        <!-- Star pupil (dreamy food eyes, slightly larger) -->
        <path d="M37,43.5 L38.8,47.5 L42.5,48.2 L39.2,50.8 L39.8,54.5 L37,52 L34.2,54.5 L34.8,50.8 L31.5,48.2 L35.2,47.5 Z" fill="${pupil}"/>
        <path d="M63,43.5 L64.8,47.5 L68.5,48.2 L65.2,50.8 L65.8,54.5 L63,52 L60.2,54.5 L60.8,50.8 L57.5,48.2 L61.2,47.5 Z" fill="${pupil}"/>
        <!-- Highlight -->
        <circle cx="40" cy="45" r="3" fill="white" opacity="0.85"/>
        <circle cx="66" cy="45" r="3" fill="white" opacity="0.85"/>
        <!-- Sparkle -->
        <circle cx="34" cy="51" r="1.2" fill="white" opacity="0.5"/>
        <circle cx="60" cy="51" r="1.2" fill="white" opacity="0.5"/>
        <!-- Drool -->
        <ellipse cx="44" cy="56" rx="1" ry="2" fill="white" opacity="0.35"/>
      `;
    case "curious":
      // Asymmetric — one big, one smaller
      return `
        <!-- Sclera (left big, right normal) -->
        <ellipse cx="36" cy="48" rx="12.5" ry="13" fill="white"/>
        <ellipse cx="64" cy="48" rx="8.5" ry="9.5" fill="white"/>
        <!-- Iris -->
        <ellipse cx="37" cy="49" rx="8.5" ry="9" fill="${irisColor}"/>
        <ellipse cx="65" cy="49" rx="6.5" ry="7" fill="${irisColor}"/>
        <!-- Iris lighter ring -->
        <ellipse cx="37" cy="49" rx="6" ry="6.5" fill="${lightenColor(irisColor, 12)}"/>
        <ellipse cx="65" cy="49" rx="4.5" ry="5" fill="${lightenColor(irisColor, 12)}"/>
        <!-- Pupil -->
        <ellipse cx="37" cy="49" rx="4" ry="4.5" fill="${pupil}"/>
        <ellipse cx="65" cy="49" rx="3" ry="3.5" fill="${pupil}"/>
        <!-- Main highlight -->
        <circle cx="40" cy="45" r="4.2" fill="white" opacity="0.9"/>
        <circle cx="68" cy="45" r="3.2" fill="white" opacity="0.9"/>
        <!-- Sub highlight -->
        <circle cx="34" cy="53" r="1.8" fill="white" opacity="0.5"/>
        <circle cx="63" cy="52" r="1.3" fill="white" opacity="0.5"/>
        <!-- Sparkle dot -->
        <circle cx="42" cy="47" r="0.9" fill="white" opacity="0.7"/>
      `;
    case "tsundere":
      // Sharp angled brows over big eyes
      return `
        <!-- Angry brows -->
        <line x1="27" y1="38" x2="44" y2="41" stroke="#2D3436" stroke-width="3.2" stroke-linecap="round"/>
        <line x1="56" y1="41" x2="73" y2="38" stroke="#2D3436" stroke-width="3.2" stroke-linecap="round"/>
        <!-- Sclera -->
        <ellipse cx="37" cy="49" rx="10" ry="10" fill="white"/>
        <ellipse cx="63" cy="49" rx="10" ry="10" fill="white"/>
        <!-- Iris -->
        <ellipse cx="38" cy="50" rx="7" ry="7.5" fill="${irisColor}"/>
        <ellipse cx="64" cy="50" rx="7" ry="7.5" fill="${irisColor}"/>
        <!-- Pupil -->
        <ellipse cx="38" cy="50" rx="4" ry="4.2" fill="${pupil}"/>
        <ellipse cx="64" cy="50" rx="4" ry="4.2" fill="${pupil}"/>
        <!-- Highlight -->
        <circle cx="41" cy="46" r="3.2" fill="white" opacity="0.88"/>
        <circle cx="67" cy="46" r="3.2" fill="white" opacity="0.88"/>
        <!-- Sub -->
        <circle cx="35" cy="53" r="1.5" fill="white" opacity="0.5"/>
        <circle cx="61" cy="53" r="1.5" fill="white" opacity="0.5"/>
      `;
    case "gentle":
    default:
      // Soft round eyes — default kawaii
      return `
        <!-- Sclera -->
        <ellipse cx="37" cy="48" rx="10.5" ry="11" fill="white"/>
        <ellipse cx="63" cy="48" rx="10.5" ry="11" fill="white"/>
        <!-- Iris outer -->
        <ellipse cx="38" cy="49" rx="7.5" ry="8" fill="${irisColor}"/>
        <ellipse cx="64" cy="49" rx="7.5" ry="8" fill="${irisColor}"/>
        <!-- Iris inner lighter -->
        <ellipse cx="38" cy="49" rx="5.5" ry="6" fill="${lightenColor(irisColor, 12)}"/>
        <ellipse cx="64" cy="49" rx="5.5" ry="6" fill="${lightenColor(irisColor, 12)}"/>
        <!-- Pupil -->
        <ellipse cx="38" cy="49" rx="3.5" ry="4" fill="${pupil}"/>
        <ellipse cx="64" cy="49" rx="3.5" ry="4" fill="${pupil}"/>
        <!-- Main highlight -->
        <circle cx="41" cy="45" r="3.8" fill="white" opacity="0.9"/>
        <circle cx="67" cy="45" r="3.8" fill="white" opacity="0.9"/>
        <!-- Sub highlight -->
        <circle cx="35" cy="52" r="1.8" fill="white" opacity="0.45"/>
        <circle cx="61" cy="52" r="1.8" fill="white" opacity="0.45"/>
        <!-- Sparkle dot -->
        <circle cx="43" cy="48" r="0.8" fill="white" opacity="0.7"/>
        <circle cx="69" cy="48" r="0.8" fill="white" opacity="0.7"/>
        <!-- Extra eye sparkle dots -->
        <circle cx="40" cy="47" r="0.6" fill="white" opacity="0.8"/>
        <circle cx="66" cy="47" r="0.6" fill="white" opacity="0.8"/>
        <circle cx="36" cy="46" r="0.5" fill="white" opacity="0.6"/>
        <circle cx="62" cy="46" r="0.5" fill="white" opacity="0.6"/>
      `;
  }
}

// ─── Mouth ───────────────────────────────────────────────────────────────────

function getMouth(personality: string): string {
  switch (personality) {
    case "energetic":
      // Big happy D-shaped smile with tongue (widened)
      return `
        <path d="M36,60 Q50,73 64,60" fill="#C83C28" stroke="#2D3436" stroke-width="1.8"/>
        <path d="M36,60 Q50,65 64,60" fill="none" stroke="#2D3436" stroke-width="1.8" stroke-linecap="round"/>
        <ellipse cx="50" cy="67" rx="5" ry="3" fill="#FF8888" opacity="0.8"/>
      `;
    case "chill":
      // Relaxed wavy smile
      return `<path d="M41,61 Q45,64 50,62 Q55,64 59,61" fill="none" stroke="#2D3436" stroke-width="2" stroke-linecap="round"/>`;
    case "foodie":
      // Wide open drooling mouth
      return `
        <path d="M36,60 Q50,76 64,60" fill="#C83C28" stroke="#2D3436" stroke-width="1.8"/>
        <ellipse cx="50" cy="67" rx="7" ry="3.5" fill="#FF8888"/>
        <ellipse cx="58" cy="62" rx="1.5" ry="3.5" fill="white" opacity="0.25"/>
      `;
    case "curious":
      // Small round "o" mouth (enlarged)
      return `
        <ellipse cx="50" cy="62" rx="5.5" ry="6" fill="#C83C28" stroke="#2D3436" stroke-width="1.5"/>
        <ellipse cx="50" cy="61" rx="3" ry="2.5" fill="white" opacity="0.2"/>
      `;
    case "tsundere":
      // Pouty omega-shaped cat mouth (ω)
      return `<path d="M42,62 Q46,58 50,62 Q54,58 58,62" fill="none" stroke="#2D3436" stroke-width="2.2" stroke-linecap="round"/>`;
    case "gentle":
    default:
      // Soft sweet arc smile (widened)
      return `<path d="M40,60 Q50,67 60,60" fill="none" stroke="#2D3436" stroke-width="2.2" stroke-linecap="round"/>`;
  }
}

// ─── Blush ───────────────────────────────────────────────────────────────────

function getBlush(personality: string, blushColor: string, uid: string): string {
  if (personality === "tsundere") {
    return `
      <defs><filter id="blr_${uid}"><feGaussianBlur stdDeviation="1.5"/></filter></defs>
      <ellipse cx="24" cy="56" rx="8.5" ry="5" fill="${blushColor}" opacity="0.65" filter="url(#blr_${uid})"/>
      <ellipse cx="76" cy="56" rx="8.5" ry="5" fill="${blushColor}" opacity="0.65" filter="url(#blr_${uid})"/>
    `;
  }
  return `
    <defs><filter id="blr_${uid}"><feGaussianBlur stdDeviation="1.2"/></filter></defs>
    <ellipse cx="25" cy="56" rx="7" ry="4" fill="${blushColor}" opacity="0.35" filter="url(#blr_${uid})"/>
    <ellipse cx="75" cy="56" rx="7" ry="4" fill="${blushColor}" opacity="0.35" filter="url(#blr_${uid})"/>
  `;
}

// ─── Element Decorations ─────────────────────────────────────────────────────

function getElementDecor(element: string, colors: SlimeColors): string {
  switch (element) {
    case "fire":
      // 3-tongue flame crown with gradient fill
      return `
        <path d="M42,20 Q38,10 42,2 Q44,12 48,6 Q46,14 50,18" fill="${colors.accent}" opacity="0.9"/>
        <path d="M50,18 Q52,8 56,2 Q54,12 58,6 Q56,14 58,20" fill="${colors.accent}" opacity="0.85"/>
        <path d="M42,22 Q40,14 43,6 Q44,14 48,10 Q46,16 50,20" fill="${lightenColor(colors.accent, 15)}" opacity="0.6"/>
        <path d="M50,20 Q52,12 55,6 Q54,14 57,10 Q56,16 58,22" fill="${lightenColor(colors.accent, 15)}" opacity="0.55"/>
      `;
    case "water":
      // Droplets with internal highlights
      return `
        <ellipse cx="70" cy="30" rx="5" ry="6.5" fill="${colors.accent}" opacity="0.7"/>
        <ellipse cx="69" cy="28" rx="2.5" ry="3" fill="white" opacity="0.45"/>
        <circle cx="77" cy="42" r="3" fill="${colors.accent}" opacity="0.55"/>
        <circle cx="76" cy="41" r="1.2" fill="white" opacity="0.35"/>
        <circle cx="26" cy="36" r="2" fill="${colors.accent}" opacity="0.4"/>
        <circle cx="25.5" cy="35.5" r="0.8" fill="white" opacity="0.3"/>
      `;
    case "grass":
      // Leaf with vein + small sprout on opposite side
      return `
        <path d="M62,22 Q74,14 70,4 Q66,16 58,12 Q62,20 62,22" fill="#30D070" opacity="0.85"/>
        <path d="M65,20 Q68,14 68,8" fill="none" stroke="#22AA50" stroke-width="1" opacity="0.7"/>
        <path d="M65,16 Q67,14 66,12" fill="none" stroke="#22AA50" stroke-width="0.7" opacity="0.5"/>
        <path d="M34,76 Q28,72 30,66" fill="none" stroke="#30D070" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
        <circle cx="34" cy="76" r="2" fill="#30D070" opacity="0.6"/>
      `;
    case "light":
      // 4-point star with inner glow
      return `
        <polygon points="70,16 72,24 80,26 72,28 70,36 68,28 60,26 68,24" fill="${colors.accent}" opacity="0.85"/>
        <polygon points="70,20 71,24 75,26 71,28 70,32 69,28 65,26 69,24" fill="white" opacity="0.55"/>
        <circle cx="30" cy="28" r="2" fill="${colors.accent}" opacity="0.4"/>
        <circle cx="28" cy="32" r="1" fill="${colors.accent}" opacity="0.3"/>
      `;
    case "dark":
      // Crescent moon + shadow particles
      return `
        <circle cx="70" cy="22" r="7" fill="${colors.accent}" opacity="0.75"/>
        <circle cx="73" cy="19" r="6" fill="${colors.body}"/>
        <circle cx="30" cy="30" r="2" fill="${colors.accent}" opacity="0.3"/>
        <circle cx="27" cy="70" r="1.5" fill="${colors.accent}" opacity="0.25"/>
        <circle cx="74" cy="66" r="1.2" fill="${colors.accent}" opacity="0.2"/>
      `;
    case "ice":
      // Hexagonal crystal with face lines + shard
      return `
        <g opacity="0.85" transform="translate(72,20)">
          <polygon points="0,-8 7,-4 7,4 0,8 -7,4 -7,-4" fill="${colors.accent}" opacity="0.7" stroke="${darkenColor(colors.accent, 10)}" stroke-width="0.6"/>
          <line x1="-5" y1="-2" x2="5" y2="2" stroke="white" stroke-width="0.5" opacity="0.4"/>
          <line x1="-3" y1="3" x2="3" y2="-3" stroke="white" stroke-width="0.5" opacity="0.3"/>
          <circle cx="0" cy="0" r="2" fill="white" opacity="0.5"/>
        </g>
        <polygon points="28,30 31,24 34,32" fill="${colors.accent}" opacity="0.4"/>
      `;
    case "electric":
      // Stylish lightning bolt with bright core + glow dot
      return `
        <polygon points="70,12 64,24 70,24 62,38 74,22 68,22 74,12" fill="${colors.accent}" opacity="0.9"/>
        <polygon points="70,14 66,24 70,24 64,34 72,23 68,23 72,14" fill="white" opacity="0.45"/>
        <circle cx="68" cy="25" r="2" fill="white" opacity="0.3"/>
        <circle cx="28" cy="28" r="1.8" fill="${colors.accent}" opacity="0.3"/>
      `;
    case "poison":
      // Bubbles with shine + drip
      return `
        <circle cx="72" cy="24" r="6" fill="${colors.accent}" opacity="0.65"/>
        <circle cx="70" cy="22" r="2.5" fill="white" opacity="0.35"/>
        <circle cx="78" cy="36" r="3.5" fill="${colors.accent}" opacity="0.5"/>
        <circle cx="77" cy="35" r="1.5" fill="white" opacity="0.25"/>
        <circle cx="27" cy="32" r="3" fill="${colors.accent}" opacity="0.4"/>
        <circle cx="26" cy="31" r="1.2" fill="white" opacity="0.2"/>
        <ellipse cx="76" cy="44" rx="1" ry="2" fill="${colors.accent}" opacity="0.35"/>
      `;
    case "earth":
      // Rock chunks with faceted highlights
      return `
        <polygon points="68,16 76,20 74,28 66,26 64,20" fill="${colors.dark}" opacity="0.7"/>
        <polygon points="70,18 74,20 73,26 68,24 66,20" fill="${colors.accent}" opacity="0.4"/>
        <polygon points="70,17 72,19 71,20 69,19" fill="white" opacity="0.2"/>
        <polygon points="28,66 34,68 32,74 26,72" fill="${colors.dark}" opacity="0.35" transform="rotate(-10 30 70)"/>
        <circle cx="24" cy="34" r="2" fill="${colors.dark}" opacity="0.25"/>
      `;
    case "wind":
      // Flowing swirl lines (bigger, more dynamic)
      return `
        <path d="M62,18 Q74,14 78,22 Q80,30 72,28" fill="none" stroke="${colors.dark}" stroke-width="1.8" opacity="0.5" stroke-linecap="round"/>
        <path d="M26,28 Q18,26 20,34 Q22,38 26,36" fill="none" stroke="${colors.dark}" stroke-width="1.4" opacity="0.4" stroke-linecap="round"/>
        <path d="M74,38 Q82,34 80,42" fill="none" stroke="${colors.dark}" stroke-width="1.2" opacity="0.3" stroke-linecap="round"/>
        <circle cx="76" cy="18" r="1" fill="${colors.dark}" opacity="0.3"/>
      `;
    case "celestial":
      // Star cluster — main star + surrounding motes
      return `
        <polygon points="72,16 73.5,21 78,22 74,24.5 75,29 72,26.5 69,29 70,24.5 66,22 70.5,21" fill="${colors.accent}" opacity="0.85"/>
        <polygon points="72,19 73,21 75,22 73,23.5 73.5,26 72,25 70.5,26 71,23.5 69,22 71,21" fill="white" opacity="0.45"/>
        <circle cx="28" cy="24" r="2" fill="${colors.accent}" opacity="0.5"/>
        <circle cx="25" cy="30" r="1.2" fill="${colors.accent}" opacity="0.35"/>
        <circle cx="78" cy="44" r="1.5" fill="${colors.accent}" opacity="0.4"/>
        <circle cx="80" cy="50" r="0.8" fill="${colors.accent}" opacity="0.25"/>
      `;
    default:
      return "";
  }
}

// ─── Element Particles ──────────────────────────────────────────────────────

function getElementParticles(element: string, colors: SlimeColors, uid: string): { defs: string; overlay: string } {
  const puid = `ep_${uid}`;
  switch (element) {
    case "fire":
      // 5 floating embers with rising + fading animation
      return {
        defs: "",
        overlay: `
          <g>
            <circle cx="22" cy="30" r="1.8" fill="#FF6633" opacity="0.7">
              <animate attributeName="cy" values="30;22;30" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.7;0.15;0.7" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="78" cy="26" r="1.4" fill="#FF8844" opacity="0.6">
              <animate attributeName="cy" values="26;18;26" dur="2.4s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.4s" repeatCount="indefinite"/>
            </circle>
            <circle cx="30" cy="70" r="1.2" fill="#FFAA44" opacity="0.5">
              <animate attributeName="cy" values="70;62;70" dur="1.8s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="70" cy="74" r="1.5" fill="#FF7733" opacity="0.55">
              <animate attributeName="cy" values="74;66;74" dur="2.2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.55;0.1;0.55" dur="2.2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="50" cy="14" r="1" fill="#FFCC44" opacity="0.45">
              <animate attributeName="cy" values="14;8;14" dur="1.6s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.45;0.05;0.45" dur="1.6s" repeatCount="indefinite"/>
            </circle>
          </g>`,
      };
    case "water":
      // 4 water droplets with size oscillation
      return {
        defs: "",
        overlay: `
          <g>
            <ellipse cx="20" cy="34" rx="1.5" ry="2.2" fill="${colors.accent}" opacity="0.5">
              <animate attributeName="ry" values="2.2;3;2.2" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="rx" values="1.5;2;1.5" dur="2s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse cx="80" cy="42" rx="1.2" ry="1.8" fill="${colors.accent}" opacity="0.45">
              <animate attributeName="ry" values="1.8;2.6;1.8" dur="2.3s" repeatCount="indefinite"/>
              <animate attributeName="rx" values="1.2;1.7;1.2" dur="2.3s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse cx="28" cy="72" rx="1" ry="1.5" fill="${colors.accent}" opacity="0.4">
              <animate attributeName="ry" values="1.5;2.2;1.5" dur="1.8s" repeatCount="indefinite"/>
              <animate attributeName="rx" values="1;1.4;1" dur="1.8s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse cx="74" cy="68" rx="1.3" ry="2" fill="${colors.accent}" opacity="0.35">
              <animate attributeName="ry" values="2;2.8;2" dur="2.5s" repeatCount="indefinite"/>
              <animate attributeName="rx" values="1.3;1.8;1.3" dur="2.5s" repeatCount="indefinite"/>
            </ellipse>
          </g>`,
      };
    case "grass":
      // 3 spinning leaves
      return {
        defs: "",
        overlay: `
          <g>
            <g transform-origin="18 28">
              <path d="M16,28 Q18,24 20,28 Q18,32 16,28" fill="#44DD77" opacity="0.5"/>
              <animateTransform attributeName="transform" type="rotate" from="0 18 28" to="360 18 28" dur="5s" repeatCount="indefinite"/>
            </g>
            <g transform-origin="82 36">
              <path d="M80,36 Q82,32 84,36 Q82,40 80,36" fill="#33CC66" opacity="0.4"/>
              <animateTransform attributeName="transform" type="rotate" from="0 82 36" to="360 82 36" dur="6s" repeatCount="indefinite"/>
            </g>
            <g transform-origin="26 74">
              <path d="M24,74 Q26,70 28,74 Q26,78 24,74" fill="#55EE88" opacity="0.35"/>
              <animateTransform attributeName="transform" type="rotate" from="0 26 74" to="360 26 74" dur="4.5s" repeatCount="indefinite"/>
            </g>
          </g>`,
      };
    case "ice":
      // 4 spinning snowflakes
      return {
        defs: "",
        overlay: `
          <g>
            <g transform-origin="18 30">
              <text x="18" y="30" font-size="6" fill="${colors.accent}" text-anchor="middle" opacity="0.5" font-family="sans-serif">*</text>
              <animateTransform attributeName="transform" type="rotate" from="0 18 30" to="360 18 30" dur="6s" repeatCount="indefinite"/>
            </g>
            <g transform-origin="82 26">
              <text x="82" y="26" font-size="5" fill="white" text-anchor="middle" opacity="0.45" font-family="sans-serif">*</text>
              <animateTransform attributeName="transform" type="rotate" from="0 82 26" to="360 82 26" dur="5s" repeatCount="indefinite"/>
            </g>
            <g transform-origin="24 70">
              <text x="24" y="70" font-size="4" fill="${colors.accent}" text-anchor="middle" opacity="0.35" font-family="sans-serif">*</text>
              <animateTransform attributeName="transform" type="rotate" from="0 24 70" to="360 24 70" dur="7s" repeatCount="indefinite"/>
            </g>
            <g transform-origin="76 66">
              <text x="76" y="66" font-size="5" fill="white" text-anchor="middle" opacity="0.3" font-family="sans-serif">*</text>
              <animateTransform attributeName="transform" type="rotate" from="0 76 66" to="360 76 66" dur="5.5s" repeatCount="indefinite"/>
            </g>
          </g>`,
      };
    case "electric":
      // 3 lightning sparks that flash
      return {
        defs: "",
        overlay: `
          <g>
            <path d="M16,36 L18,32 L17,35 L20,30" fill="none" stroke="#FFE040" stroke-width="1.2" opacity="0.6" stroke-linecap="round">
              <animate attributeName="opacity" values="0.6;0;0.6;0;0.6" dur="0.8s" repeatCount="indefinite"/>
            </path>
            <path d="M82,44 L84,40 L83,43 L86,38" fill="none" stroke="#FFCC20" stroke-width="1" opacity="0.5" stroke-linecap="round">
              <animate attributeName="opacity" values="0;0.5;0;0.5;0" dur="1s" repeatCount="indefinite"/>
            </path>
            <path d="M24,72 L26,68 L25,71 L28,66" fill="none" stroke="#FFD830" stroke-width="1.1" opacity="0.45" stroke-linecap="round">
              <animate attributeName="opacity" values="0.45;0;0.45;0;0.45" dur="0.7s" repeatCount="indefinite"/>
            </path>
          </g>`,
      };
    case "dark":
      // 4 shadow wisps with blur+fade
      return {
        defs: `<filter id="${puid}_blur"><feGaussianBlur stdDeviation="1.5"/></filter>`,
        overlay: `
          <g>
            <ellipse cx="18" cy="40" rx="3" ry="1.5" fill="${colors.dark}" opacity="0.4" filter="url(#${puid}_blur)">
              <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2.5s" repeatCount="indefinite"/>
              <animate attributeName="cx" values="18;15;18" dur="2.5s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse cx="82" cy="50" rx="2.5" ry="1.2" fill="${colors.dark}" opacity="0.35" filter="url(#${puid}_blur)">
              <animate attributeName="opacity" values="0.35;0.05;0.35" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="cx" values="82;85;82" dur="2s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse cx="22" cy="70" rx="2" ry="1" fill="${colors.dark}" opacity="0.3" filter="url(#${puid}_blur)">
              <animate attributeName="opacity" values="0.3;0.05;0.3" dur="3s" repeatCount="indefinite"/>
              <animate attributeName="cx" values="22;19;22" dur="3s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse cx="78" cy="72" rx="2.5" ry="1.3" fill="${colors.dark}" opacity="0.25" filter="url(#${puid}_blur)">
              <animate attributeName="opacity" values="0.25;0;0.25" dur="2.2s" repeatCount="indefinite"/>
              <animate attributeName="cx" values="78;81;78" dur="2.2s" repeatCount="indefinite"/>
            </ellipse>
          </g>`,
      };
    case "poison":
      // 3 poison bubbles rising
      return {
        defs: "",
        overlay: `
          <g>
            <circle cx="20" cy="60" r="2" fill="${colors.accent}" opacity="0.4">
              <animate attributeName="cy" values="60;48;60" dur="3s" repeatCount="indefinite"/>
              <animate attributeName="r" values="2;1.2;2" dur="3s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="80" cy="56" r="1.5" fill="${colors.accent}" opacity="0.35">
              <animate attributeName="cy" values="56;44;56" dur="2.5s" repeatCount="indefinite"/>
              <animate attributeName="r" values="1.5;0.8;1.5" dur="2.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.35;0.05;0.35" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="30" cy="74" r="1.8" fill="${colors.accent}" opacity="0.3">
              <animate attributeName="cy" values="74;62;74" dur="3.5s" repeatCount="indefinite"/>
              <animate attributeName="r" values="1.8;1;1.8" dur="3.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.3;0.05;0.3" dur="3.5s" repeatCount="indefinite"/>
            </circle>
          </g>`,
      };
    case "earth":
      // 3 rock fragments
      return {
        defs: "",
        overlay: `
          <g>
            <polygon points="16,44 19,40 22,43 20,46" fill="${colors.dark}" opacity="0.35">
              <animate attributeName="opacity" values="0.35;0.15;0.35" dur="3s" repeatCount="indefinite"/>
            </polygon>
            <polygon points="80,50 83,47 85,51 82,53" fill="${colors.dark}" opacity="0.3">
              <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2.5s" repeatCount="indefinite"/>
            </polygon>
            <polygon points="24,76 27,73 29,77 26,79" fill="${colors.dark}" opacity="0.25">
              <animate attributeName="opacity" values="0.25;0.08;0.25" dur="3.5s" repeatCount="indefinite"/>
            </polygon>
          </g>`,
      };
    case "wind":
      // 4 wind swirl lines
      return {
        defs: "",
        overlay: `
          <g>
            <path d="M14,38 Q10,36 8,40 Q6,44 10,42" fill="none" stroke="${colors.dark}" stroke-width="1" opacity="0.35" stroke-linecap="round">
              <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2s" repeatCount="indefinite"/>
            </path>
            <path d="M86,32 Q90,30 92,34 Q94,38 90,36" fill="none" stroke="${colors.dark}" stroke-width="0.8" opacity="0.3" stroke-linecap="round">
              <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2.5s" repeatCount="indefinite"/>
            </path>
            <path d="M12,62 Q8,60 6,64 Q4,68 8,66" fill="none" stroke="${colors.dark}" stroke-width="0.9" opacity="0.25" stroke-linecap="round">
              <animate attributeName="opacity" values="0.25;0.05;0.25" dur="1.8s" repeatCount="indefinite"/>
            </path>
            <path d="M88,58 Q92,56 94,60 Q96,64 92,62" fill="none" stroke="${colors.dark}" stroke-width="1" opacity="0.3" stroke-linecap="round">
              <animate attributeName="opacity" values="0.1;0.35;0.1" dur="2.2s" repeatCount="indefinite"/>
            </path>
          </g>`,
      };
    case "light":
      // 4 golden dots that twinkle
      return {
        defs: "",
        overlay: `
          <g>
            <circle cx="18" cy="32" r="1.5" fill="#FFD700" opacity="0.6">
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite"/>
              <animate attributeName="r" values="1.5;2;1.5" dur="1.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="82" cy="28" r="1.2" fill="#FFEC8B" opacity="0.5">
              <animate attributeName="opacity" values="0.5;0.05;0.5" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="r" values="1.2;1.8;1.2" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="22" cy="70" r="1" fill="#FFD700" opacity="0.4">
              <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite"/>
              <animate attributeName="r" values="1;1.5;1" dur="1.8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="78" cy="66" r="1.3" fill="#FFEC8B" opacity="0.45">
              <animate attributeName="opacity" values="0.1;0.5;0.1" dur="2.2s" repeatCount="indefinite"/>
              <animate attributeName="r" values="1.3;1.8;1.3" dur="2.2s" repeatCount="indefinite"/>
            </circle>
          </g>`,
      };
    case "celestial":
      // 4 star dust with color-cycling
      return {
        defs: `
          <filter id="${puid}_hue">
            <feColorMatrix type="hueRotate" values="0">
              <animate attributeName="values" values="0;360" dur="6s" repeatCount="indefinite"/>
            </feColorMatrix>
          </filter>`,
        overlay: `
          <g filter="url(#${puid}_hue)">
            <polygon points="18,30 19,32.5 21.5,33 19,33.5 18,36 17,33.5 14.5,33 17,32.5" fill="#FF80B0" opacity="0.55">
              <animate attributeName="opacity" values="0.55;0.15;0.55" dur="2s" repeatCount="indefinite"/>
            </polygon>
            <polygon points="82,26 83,28 85,28.5 83,29 82,31 81,29 79,28.5 81,28" fill="#FFC0D8" opacity="0.45">
              <animate attributeName="opacity" values="0.2;0.55;0.2" dur="1.8s" repeatCount="indefinite"/>
            </polygon>
            <polygon points="22,72 23,74 25,74.5 23,75 22,77 21,75 19,74.5 21,74" fill="#FFE0F0" opacity="0.4">
              <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2.5s" repeatCount="indefinite"/>
            </polygon>
            <polygon points="78,68 79,70 81,70.5 79,71 78,73 77,71 75,70.5 77,70" fill="#FF80B0" opacity="0.35">
              <animate attributeName="opacity" values="0.1;0.4;0.1" dur="2.2s" repeatCount="indefinite"/>
            </polygon>
          </g>`,
      };
    default:
      return { defs: "", overlay: "" };
  }
}

// ─── Species Features ───────────────────────────────────────────────────────

function getSpeciesFeatures(speciesId: number, colors: SlimeColors): string {
  if (speciesId === 0) return "";
  const featureIndex = speciesHash(speciesId, 200) % 8;
  const dotColor = darkenColor(colors.body, 20);

  switch (featureIndex) {
    case 0:
      // Freckles (4 small dots on cheeks)
      return `
        <circle cx="28" cy="54" r="0.8" fill="${dotColor}" opacity="0.3"/>
        <circle cx="31" cy="56" r="0.7" fill="${dotColor}" opacity="0.25"/>
        <circle cx="26" cy="57" r="0.6" fill="${dotColor}" opacity="0.28"/>
        <circle cx="72" cy="54" r="0.8" fill="${dotColor}" opacity="0.3"/>
        <circle cx="69" cy="56" r="0.7" fill="${dotColor}" opacity="0.25"/>
        <circle cx="74" cy="57" r="0.6" fill="${dotColor}" opacity="0.28"/>
      `;
    case 1:
      // Beauty mark (single dot near eye)
      return `<circle cx="28" cy="52" r="1.2" fill="${dotColor}" opacity="0.45"/>`;
    case 2:
      // Rosy nose tip (small pink circle)
      return `<circle cx="50" cy="56" r="2" fill="#FFB0B0" opacity="0.4"/>`;
    case 3:
      // Sweat drop (teardrop shape)
      return `
        <path d="M74,38 Q75,34 76,38 Q75,42 74,38" fill="#88CCFF" opacity="0.5"/>
        <circle cx="74.8" cy="36.5" r="0.6" fill="white" opacity="0.4"/>
      `;
    case 4:
      // Eye sparkle (star near eye)
      return `
        <polygon points="30,42 30.8,44 33,44.5 31,45.5 31.5,47.5 30,46 28.5,47.5 29,45.5 27,44.5 29.2,44" fill="white" opacity="0.65">
          <animate attributeName="opacity" values="0.65;0.25;0.65" dur="2s" repeatCount="indefinite"/>
        </polygon>
      `;
    case 5:
      // Tear mark (small line under eye)
      return `
        <path d="M33,56 Q32,60 33,62" fill="none" stroke="#88CCFF" stroke-width="0.8" opacity="0.35" stroke-linecap="round"/>
      `;
    case 6:
      // Blush lines (3 diagonal lines on cheeks)
      return `
        <line x1="24" y1="54" x2="26" y2="58" stroke="${colors.blush}" stroke-width="0.7" opacity="0.35" stroke-linecap="round"/>
        <line x1="26" y1="53" x2="28" y2="57" stroke="${colors.blush}" stroke-width="0.7" opacity="0.3" stroke-linecap="round"/>
        <line x1="28" y1="54" x2="30" y2="58" stroke="${colors.blush}" stroke-width="0.7" opacity="0.25" stroke-linecap="round"/>
        <line x1="72" y1="54" x2="74" y2="58" stroke="${colors.blush}" stroke-width="0.7" opacity="0.35" stroke-linecap="round"/>
        <line x1="74" y1="53" x2="76" y2="57" stroke="${colors.blush}" stroke-width="0.7" opacity="0.3" stroke-linecap="round"/>
        <line x1="76" y1="54" x2="78" y2="58" stroke="${colors.blush}" stroke-width="0.7" opacity="0.25" stroke-linecap="round"/>
      `;
    case 7:
    default:
      // None
      return "";
  }
}

// ─── Grade Effects ───────────────────────────────────────────────────────────

function getGradeEffects(grade: string, colors: SlimeColors, uid: string, bodyPath: string = ""): { defs: string; overlay: string } {
  switch (grade) {
    case "uncommon":
      return {
        defs: `
          <filter id="aura_${uid}" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.33  0 0 0 0 0.94  0 0 0 0 0.77  0 0 0 0.35 0" result="glow"/>
            <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>`,
        overlay: `
          <!-- Rotating sparkle 1 -->
          <g transform="translate(76,32)">
            <polygon points="0,-3 1,-0.5 3,0 1,0.5 0,3 -1,0.5 -3,0 -1,-0.5" fill="white" opacity="0.75">
              <animate attributeName="opacity" values="0.75;0.3;0.75" dur="2.5s" repeatCount="indefinite"/>
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6s" repeatCount="indefinite"/>
            </polygon>
          </g>
          <!-- Rotating sparkle 2 -->
          <g transform="translate(22,68)">
            <polygon points="0,-2.5 0.8,-0.4 2.5,0 0.8,0.4 0,2.5 -0.8,0.4 -2.5,0 -0.8,-0.4" fill="white" opacity="0.6">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite"/>
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="5s" repeatCount="indefinite"/>
            </polygon>
          </g>`,
      };
    case "rare":
      // 6 four-pointed stars with staggered animation + color shimmer
      return {
        defs: `
          <clipPath id="rareclip_${uid}"><path d="${bodyPath}"/></clipPath>
          <linearGradient id="rareshimmer_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colors.accent}" stop-opacity="0">
              <animate attributeName="stop-opacity" values="0;0.12;0" dur="3s" repeatCount="indefinite"/>
            </stop>
            <stop offset="50%" stop-color="${colors.light}" stop-opacity="0.06">
              <animate attributeName="stop-opacity" values="0.06;0.18;0.06" dur="3s" repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stop-color="${colors.accent}" stop-opacity="0">
              <animate attributeName="stop-opacity" values="0;0.12;0" dur="3s" repeatCount="indefinite"/>
            </stop>
          </linearGradient>`,
        overlay: `
          <!-- Rare shimmer overlay -->
          <rect x="0" y="0" width="100" height="100" fill="url(#rareshimmer_${uid})" clip-path="url(#rareclip_${uid})"/>
          <g>
            <polygon points="24,28 25.2,31 28,32 25.2,33 24,36 22.8,33 20,32 22.8,31" fill="white" opacity="0.8">
              <animate attributeName="opacity" values="0.8;0.15;0.8" dur="2s" repeatCount="indefinite"/>
            </polygon>
            <polygon points="76,33 77,35.5 79.5,36.5 77,37.5 76,40 75,37.5 72.5,36.5 75,35.5" fill="white" opacity="0.7">
              <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1.8s" repeatCount="indefinite"/>
            </polygon>
            <polygon points="68,68 69,70 71,70.5 69,71 68,73 67,71 65,70.5 67,70" fill="white" opacity="0.65">
              <animate attributeName="opacity" values="0.65;0.1;0.65" dur="2.2s" repeatCount="indefinite"/>
            </polygon>
            <polygon points="30,65 31,67 33,67.5 31,68 30,70 29,68 27,67.5 29,67" fill="${colors.accent}" opacity="0.6">
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.6s" repeatCount="indefinite"/>
            </polygon>
            <polygon points="82,52 83,54 85,54.5 83,55 82,57 81,55 79,54.5 81,54" fill="white" opacity="0.55">
              <animate attributeName="opacity" values="0.55;0.1;0.55" dur="2.4s" repeatCount="indefinite"/>
            </polygon>
            <polygon points="18,48 19,50 21,50.5 19,51 18,53 17,51 15,50.5 17,50" fill="${colors.accent}" opacity="0.5">
              <animate attributeName="opacity" values="0.1;0.6;0.1" dur="1.9s" repeatCount="indefinite"/>
            </polygon>
          </g>`,
      };
    case "epic": {
      // Rainbow gradient halo + 5-point crown + 4 stars
      return {
        defs: `
          <linearGradient id="rainbow_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#FF6B6B"/>
            <stop offset="25%" stop-color="#FECA57"/>
            <stop offset="50%" stop-color="#48DBFB"/>
            <stop offset="75%" stop-color="#FF9FF3"/>
            <stop offset="100%" stop-color="#FF6B6B"/>
          </linearGradient>
          <filter id="halo_${uid}" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.64  0 0 0 0 0.6  0 0 0 0 1  0 0 0 0.35 0" result="glow"/>
            <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>`,
        overlay: `
          <!-- Rainbow halo ring (rotating) -->
          <g transform-origin="50 18">
            <ellipse cx="50" cy="18" rx="18" ry="4.5" fill="none" stroke="url(#rainbow_${uid})" stroke-width="1.5" opacity="0.45">
              <animate attributeName="opacity" values="0.45;0.2;0.45" dur="3s" repeatCount="indefinite"/>
            </ellipse>
            <animateTransform attributeName="transform" type="rotate" from="0 50 18" to="360 50 18" dur="12s" repeatCount="indefinite"/>
          </g>
          <!-- 5-point crown (enhanced with jewels) -->
          <polygon points="40,16 42,8 46,14 50,5 54,14 58,8 60,16" fill="${colors.accent}" opacity="0.7"/>
          <polygon points="42,16 43,10 46,14 50,7 54,14 57,10 58,16" fill="white" opacity="0.25"/>
          <circle cx="50" cy="8" r="1.5" fill="#FF6B6B" opacity="0.6"/>
          <circle cx="44" cy="12" r="1" fill="#48DBFB" opacity="0.5"/>
          <circle cx="56" cy="12" r="1" fill="#55EFC4" opacity="0.5"/>
          <!-- 4 sparkle stars -->
          <polygon points="24,30 25.5,33.5 29,34.5 25.5,35.5 24,39 22.5,35.5 19,34.5 22.5,33.5" fill="white" opacity="0.7">
            <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2s" repeatCount="indefinite"/>
          </polygon>
          <polygon points="77,36 78,38.5 80.5,39 78,39.5 77,42 76,39.5 73.5,39 76,38.5" fill="white" opacity="0.55">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.7s" repeatCount="indefinite"/>
          </polygon>
          <polygon points="20,60 21,62 23,62.5 21,63 20,65 19,63 17,62.5 19,62" fill="${colors.accent}" opacity="0.5">
            <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.3s" repeatCount="indefinite"/>
          </polygon>
          <polygon points="80,58 81,60 83,60.5 81,61 80,63 79,61 77,60.5 79,60" fill="${colors.accent}" opacity="0.45">
            <animate attributeName="opacity" values="0.15;0.55;0.15" dur="1.9s" repeatCount="indefinite"/>
          </polygon>`,
      };
    }
    case "legendary":
      // Gold aura glow + jeweled crown + 6 orbiting gold particles
      return {
        defs: `
          <linearGradient id="shimmer_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFEAA7" stop-opacity="0">
              <animate attributeName="stop-opacity" values="0;0.3;0" dur="3s" repeatCount="indefinite"/>
            </stop>
            <stop offset="50%" stop-color="#FFD700" stop-opacity="0.15">
              <animate attributeName="stop-opacity" values="0.15;0.4;0.15" dur="3s" repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stop-color="#FFEAA7" stop-opacity="0">
              <animate attributeName="stop-opacity" values="0;0.3;0" dur="3s" repeatCount="indefinite"/>
            </stop>
          </linearGradient>
          <filter id="lglow_${uid}" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 1  0 0 0 0 0.92  0 0 0 0 0.65  0 0 0 0.4 0" result="glow"/>
            <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="gem_${uid}" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stop-color="#FFF8DC"/>
            <stop offset="50%" stop-color="#FFD700"/>
            <stop offset="100%" stop-color="#DAA520"/>
          </radialGradient>`,
        overlay: `
          <!-- Gold aura ring -->
          <ellipse cx="50" cy="16" rx="20" ry="5" fill="none" stroke="#FFD700" stroke-width="1.8" opacity="0.4">
            <animate attributeName="opacity" values="0.4;0.15;0.4" dur="3s" repeatCount="indefinite"/>
          </ellipse>
          <!-- Jeweled crown -->
          <polygon points="40,14 42,4 46,12 50,2 54,12 58,4 60,14" fill="url(#gem_${uid})" opacity="0.7"/>
          <circle cx="50" cy="6" r="2" fill="#FF6B6B" opacity="0.7"/>
          <circle cx="43" cy="8" r="1.5" fill="#48DBFB" opacity="0.6"/>
          <circle cx="57" cy="8" r="1.5" fill="#55EFC4" opacity="0.6"/>
          <!-- 6 orbiting gold particles (enlarged) -->
          <circle cx="18" cy="40" r="2.5" fill="#FFD700" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="82" cy="35" r="2.7" fill="#FFEAA7" opacity="0.55">
            <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="74" cy="68" r="2" fill="#FFD700" opacity="0.45">
            <animate attributeName="opacity" values="0.45;0;0.45" dur="1.8s" repeatCount="indefinite"/>
          </circle>
          <circle cx="26" cy="72" r="1.8" fill="#FFEAA7" opacity="0.5">
            <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="14" cy="56" r="2.3" fill="#FFD700" opacity="0.4">
            <animate attributeName="opacity" values="0.1;0.5;0.1" dur="1.6s" repeatCount="indefinite"/>
          </circle>
          <circle cx="86" cy="55" r="2" fill="#FFEAA7" opacity="0.35">
            <animate attributeName="opacity" values="0.35;0;0.35" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          <!-- Body micro-pulse -->`,
      };
    case "mythic":
      // Rainbow hue-rotate + feather wings (3 segments) + cosmic particle ring + horns
      return {
        defs: `
          <filter id="mythic_${uid}" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
            <feColorMatrix in="blur" type="hueRotate" values="0" result="glow">
              <animate attributeName="values" values="0;360" dur="4s" repeatCount="indefinite"/>
            </feColorMatrix>
            <feColorMatrix in="glow" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0" result="finalGlow"/>
            <feMerge><feMergeNode in="finalGlow"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <linearGradient id="wing_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colors.light}" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="${colors.accent}" stop-opacity="0.2"/>
          </linearGradient>
          <linearGradient id="mythicOutline_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FF6B6B"/>
            <stop offset="20%" stop-color="#FECA57"/>
            <stop offset="40%" stop-color="#55EFC4"/>
            <stop offset="60%" stop-color="#48DBFB"/>
            <stop offset="80%" stop-color="#A29BFE"/>
            <stop offset="100%" stop-color="#FF6B6B"/>
          </linearGradient>
          <filter id="mythicOutlineHue_${uid}">
            <feColorMatrix type="hueRotate" values="0">
              <animate attributeName="values" values="0;360" dur="5s" repeatCount="indefinite"/>
            </feColorMatrix>
          </filter>`,
        overlay: `
          <!-- Feather wings (3 segments each) -->
          <g opacity="0.65">
            <path d="M18,48 Q6,38 10,22" fill="none" stroke="url(#wing_${uid})" stroke-width="3" stroke-linecap="round">
              <animate attributeName="opacity" values="0.65;0.3;0.65" dur="2s" repeatCount="indefinite"/>
            </path>
            <path d="M16,44 Q4,32 6,18" fill="none" stroke="${colors.accent}" stroke-width="2.2" opacity="0.45" stroke-linecap="round">
              <animate attributeName="opacity" values="0.45;0.2;0.45" dur="2.2s" repeatCount="indefinite"/>
            </path>
            <path d="M20,52 Q10,44 14,30" fill="none" stroke="${colors.light}" stroke-width="2" opacity="0.4" stroke-linecap="round">
              <animate attributeName="opacity" values="0.4;0.18;0.4" dur="1.8s" repeatCount="indefinite"/>
            </path>
          </g>
          <g opacity="0.65">
            <path d="M82,48 Q94,38 90,22" fill="none" stroke="url(#wing_${uid})" stroke-width="3" stroke-linecap="round">
              <animate attributeName="opacity" values="0.65;0.3;0.65" dur="2s" repeatCount="indefinite"/>
            </path>
            <path d="M84,44 Q96,32 94,18" fill="none" stroke="${colors.accent}" stroke-width="2.2" opacity="0.45" stroke-linecap="round">
              <animate attributeName="opacity" values="0.45;0.2;0.45" dur="2.2s" repeatCount="indefinite"/>
            </path>
            <path d="M80,52 Q90,44 86,30" fill="none" stroke="${colors.light}" stroke-width="2" opacity="0.4" stroke-linecap="round">
              <animate attributeName="opacity" values="0.4;0.18;0.4" dur="1.8s" repeatCount="indefinite"/>
            </path>
          </g>
          <!-- Horns -->
          <path d="M38,20 Q34,6 30,2 L36,14 Z" fill="${colors.dark}" opacity="0.7"/>
          <path d="M62,20 Q66,6 70,2 L64,14 Z" fill="${colors.dark}" opacity="0.7"/>
          <path d="M36,16 Q34,10 32,6" fill="none" stroke="${lightenColor(colors.dark, 20)}" stroke-width="0.8" opacity="0.4"/>
          <path d="M64,16 Q66,10 68,6" fill="none" stroke="${lightenColor(colors.dark, 20)}" stroke-width="0.8" opacity="0.4"/>
          <!-- Cosmic particle ring -->
          <circle cx="14" cy="50" r="1.8" fill="#FF6B6B" opacity="0.7">
            <animate attributeName="opacity" values="0.7;0;0.7" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="86" cy="44" r="2" fill="#74B9FF" opacity="0.6">
            <animate attributeName="opacity" values="0;0.8;0" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="20" cy="28" r="1.5" fill="#55EFC4" opacity="0.55">
            <animate attributeName="opacity" values="0.55;0;0.55" dur="1.8s" repeatCount="indefinite"/>
          </circle>
          <circle cx="80" cy="66" r="1.3" fill="#FFEAA7" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="28" cy="74" r="1.5" fill="#A29BFE" opacity="0.5">
            <animate attributeName="opacity" values="0;0.6;0" dur="2.2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="72" cy="18" r="1.2" fill="#FD79A8" opacity="0.45">
            <animate attributeName="opacity" values="0.45;0;0.45" dur="1.6s" repeatCount="indefinite"/>
          </circle>
          <circle cx="10" cy="64" r="1" fill="#FECA57" opacity="0.4">
            <animate attributeName="opacity" values="0.1;0.5;0.1" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="90" cy="58" r="1.2" fill="#FF6B6B" opacity="0.35">
            <animate attributeName="opacity" values="0.35;0;0.35" dur="1.9s" repeatCount="indefinite"/>
          </circle>
          <!-- Rainbow outline with hue-rotate animation -->
          <path d="${bodyPath}" fill="none" stroke="url(#mythicOutline_${uid})" stroke-width="2" opacity="0.4" filter="url(#mythicOutlineHue_${uid})"/>`,
      };
    default: // common — subtle single sparkle
      return {
        defs: "",
        overlay: `
          <g transform="translate(78,28)">
            <polygon points="0,-2.5 0.8,-0.4 2.5,0 0.8,0.4 0,2.5 -0.8,0.4 -2.5,0 -0.8,-0.4" fill="white" opacity="0.5">
              <animate attributeName="opacity" values="0.5;0.15;0.5" dur="3.5s" repeatCount="indefinite"/>
            </polygon>
          </g>`,
      };
  }
}

function getGradeFilter(grade: string, uid: string): string {
  switch (grade) {
    case "uncommon": return `filter="url(#aura_${uid})"`;
    case "epic": return `filter="url(#halo_${uid})"`;
    case "legendary": return `filter="url(#lglow_${uid})"`;
    case "mythic": return `filter="url(#mythic_${uid})"`;
    default: return "";
  }
}

// ─── Main SVG Generator ─────────────────────────────────────────────────────

export function generateSlimeSvg(
  element: string,
  personality: string,
  grade: string = "common",
  speciesId: number = 0,
  accessoryOverlays?: string[]
): string {
  // Hidden species override
  const hiddenOverride = getHiddenSpeciesOverride(speciesId);

  // Per-species color variation
  const colors = hiddenOverride ? hiddenOverride.colors : getSpeciesColors(element, speciesId);

  // Deterministic trait selection per species
  const variant = hiddenOverride ? hiddenOverride.variant : pickFromArray(BODY_VARIANTS, speciesId, 1);
  const pattern = hiddenOverride ? hiddenOverride.pattern : pickFromArray(PATTERN_TYPES, speciesId, 2);
  const appendage = hiddenOverride ? hiddenOverride.appendage : pickFromArray(APPENDAGE_TYPES, speciesId, 3);
  const marking = hiddenOverride ? hiddenOverride.marking : pickFromArray(MARKING_TYPES, speciesId, 4);

  const uid = `${element}_${grade}_${speciesId}`;
  const bodyPath = getBodyPath(variant);
  const innerPath = getInnerPath(variant);
  const gradeEffects = getGradeEffects(grade, colors, uid, bodyPath);
  const bodyFilter = getGradeFilter(grade, uid);

  // Pattern + appendage + marking SVG
  const patternResult = getPatternSvg(pattern, colors, uid, bodyPath);
  const appendageSvg = getAppendageSvg(appendage, colors);
  const markingSvg = getMarkingSvg(marking, colors);

  // Face positioning based on body shape
  const layout = getShapeLayout(variant);
  const eyeOffY = layout.eyeCenterY - 48; // default eye Y is 48
  const mouthOffY = layout.mouthCenterY - 61; // default mouth Y is ~61
  const eyeOffX = layout.eyeSpacing - 13; // default spacing is 13
  const fScale = layout.faceScale;

  // Hidden species extra layers
  const hiddenDefs = hiddenOverride?.extraDefs || "";
  const hiddenOverlay = hiddenOverride?.extraOverlay || "";
  const deeper = darkenColor(colors.dark, 10);

  const legendaryShimmer = grade === "legendary"
    ? `<g transform-origin="50 55">
        <path d="${bodyPath}" fill="url(#shimmer_${uid})" />
        <animateTransform attributeName="transform" type="scale" values="1.0;1.02;1.0" dur="2s" repeatCount="indefinite"/>
      </g>`
    : "";

  // Element particles
  const elementParticles = getElementParticles(element, colors, uid);

  // Species features
  const speciesFeaturesSvg = getSpeciesFeatures(speciesId, colors);

  // Accessory layers
  let accDefs = "";
  let accLayers = "";
  if (accessoryOverlays && accessoryOverlays.length > 0) {
    for (const overlayId of accessoryOverlays) {
      const defs = getAccessoryDefs(overlayId);
      if (defs) accDefs += defs;
      accLayers += getAccessorySvg(overlayId);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -15 120 120" width="240" height="240" overflow="visible">
  <defs>
    <!-- 4-stop radial gradient: light → body → dark → deeper -->
    <radialGradient id="bg_${uid}" cx="38%" cy="30%" r="62%" fx="35%" fy="28%">
      <stop offset="0%" stop-color="${colors.light}"/>
      <stop offset="35%" stop-color="${colors.body}"/>
      <stop offset="75%" stop-color="${colors.dark}"/>
      <stop offset="100%" stop-color="${deeper}"/>
    </radialGradient>
    <!-- Subsurface glow gradient -->
    <radialGradient id="glow_${uid}" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="${colors.glow}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${colors.body}" stop-opacity="0"/>
    </radialGradient>
    <!-- Dome highlight blur -->
    <filter id="dome_${uid}">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
    <!-- White outline glow -->
    <filter id="outline_${uid}" x="-15%" y="-15%" width="130%" height="130%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0"/>
    </filter>
    <!-- Translucent jelly overlay -->
    <radialGradient id="jelly_${uid}" cx="40%" cy="25%" r="55%">
      <stop offset="0%" stop-color="white" stop-opacity="0.12"/>
      <stop offset="40%" stop-color="white" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
    <!-- Drop shadow -->
    <filter id="shadow_${uid}">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-opacity="0.18"/>
    </filter>
    ${gradeEffects.defs}
    ${patternResult.defs}
    ${elementParticles.defs}
    ${hiddenDefs}
    ${accDefs}
  </defs>

  <!-- 1. Ground shadow (with bounce sync) -->
  <ellipse cx="50" cy="91" rx="28" ry="5" fill="rgba(0,0,0,0.13)">
    <animate attributeName="rx" values="28;30;28" dur="3s" repeatCount="indefinite"/>
    <animate attributeName="cy" values="91;92;91" dur="2.5s" repeatCount="indefinite"/>
  </ellipse>

  <!-- 2. Appendages (behind body) -->
  ${appendageSvg}

  <!-- 3. White outline glow -->
  <path d="${bodyPath}" fill="white" filter="url(#outline_${uid})"/>

  <!-- 4. Body (4-stop radial gradient) with breathing -->
  <g transform-origin="50 55">
    <path d="${bodyPath}" fill="url(#bg_${uid})" filter="url(#shadow_${uid})" ${bodyFilter}/>
    <animateTransform attributeName="transform" type="scale" values="1;1.01;1;0.99;1" dur="3s" repeatCount="indefinite"/>
  </g>

  <!-- 5. Pattern overlay -->
  ${patternResult.overlay}

  <!-- 6. Translucent jelly overlay -->
  <path d="${innerPath}" fill="url(#jelly_${uid})"/>

  <!-- 7. Subsurface glow layer -->
  <path d="${innerPath}" fill="url(#glow_${uid})"/>

  ${legendaryShimmer}

  <!-- 8. Internal bubbles -->
  <circle cx="34" cy="40" r="3" fill="white" opacity="0.12"/>
  <circle cx="62" cy="44" r="2.5" fill="white" opacity="0.10"/>
  <circle cx="42" cy="68" r="2" fill="white" opacity="0.08"/>
  <circle cx="58" cy="36" r="1.8" fill="white" opacity="0.14"/>
  <circle cx="50" cy="72" r="1.5" fill="white" opacity="0.06"/>
  <circle cx="38" cy="56" r="1.2" fill="white" opacity="0.09"/>

  <!-- 9. Dome highlight -->
  <ellipse cx="36" cy="30" rx="20" ry="16" fill="white" opacity="0.25" filter="url(#dome_${uid})"/>

  <!-- 10. Specular highlights -->
  <circle cx="32" cy="26" r="10" fill="white" opacity="0.55"/>
  <circle cx="44" cy="34" r="4.5" fill="white" opacity="0.38"/>
  <circle cx="27" cy="36" r="2" fill="white" opacity="0.50"/>
  <circle cx="56" cy="28" r="1.5" fill="white" opacity="0.35"/>
  <circle cx="66" cy="38" r="1" fill="white" opacity="0.25"/>

  <!-- 11. Rim light -->
  <path d="M26,78 Q50,88 74,78" fill="none" stroke="white" stroke-width="2.5" opacity="0.20"/>

  <!-- 12. Marking -->
  ${markingSvg}

  <!-- 13. Hidden species overlay -->
  ${hiddenOverlay}

  <!-- 14. Element decoration -->
  ${getElementDecor(element, colors)}

  <!-- 14b. Element particles -->
  ${elementParticles.overlay}

  <!-- 15. Face (positioned per body shape) -->
  <g transform="translate(${eyeOffX * 0.5},${eyeOffY}) scale(${fScale})">
    ${getEyes(personality, colors.iris)}
  </g>
  <!-- 15b. Eye blink animation -->
  <g transform="translate(${eyeOffX * 0.5},${eyeOffY}) scale(${fScale})">
    <rect x="27" y="42" width="22" height="14" fill="${colors.body}" opacity="0" rx="4">
      <animate attributeName="opacity" values="0;0;0;0.95;0;0;0" dur="4.5s" repeatCount="indefinite"/>
    </rect>
    <rect x="53" y="42" width="22" height="14" fill="${colors.body}" opacity="0" rx="4">
      <animate attributeName="opacity" values="0;0;0;0.95;0;0;0" dur="4.5s" repeatCount="indefinite"/>
    </rect>
  </g>
  <g transform="translate(${eyeOffX * 0.5},${mouthOffY}) scale(${fScale})">
    ${getMouth(personality)}
  </g>

  <!-- 16. Blush cheeks -->
  ${getBlush(personality, colors.blush, uid)}

  <!-- 16b. Species features -->
  ${speciesFeaturesSvg}

  <!-- 17. Grade overlay effects -->
  ${gradeEffects.overlay}

  <!-- 18. Accessory overlays -->
  ${accLayers}
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ─── Icon Helpers (variant-specific paths at 50×50 scale) ───────────────────

function getIconBodyPaths(variant: BodyVariant): { iconBody: string; iconInner: string } {
  // Default round icon path
  const defaultBody = "M10,30 C10,18 16,10 25,9 C34,10 40,18 40,30 C40,40 34,44 25,44 C16,44 10,40 10,30 Z";
  const defaultInner = "M12,30 C12,20 17,12 25,11 C33,12 38,20 38,30 C38,38 33,42 25,42 C17,42 12,38 12,30 Z";

  switch (variant) {
    case "round": return { iconBody: defaultBody, iconInner: defaultInner };
    case "elongated": return {
      iconBody: "M14,28 C14,16 18,8 25,7 C32,8 36,16 36,28 C36,38 32,44 25,44 C18,44 14,38 14,28 Z",
      iconInner: "M16,28 C16,18 19,10 25,9 C31,10 34,18 34,28 C34,36 31,42 25,42 C19,42 16,36 16,28 Z",
    };
    case "spiky": return {
      iconBody: "M11,29 C11,17 17,10 25,9 C33,10 39,17 39,29 C39,35 36,40 31,42 C28,43 22,43 19,42 C14,40 11,35 11,29 Z",
      iconInner: "M13,29 C13,19 18,12 25,11 C32,12 37,19 37,29 C37,34 34,38 25,40 C16,38 13,34 13,29 Z",
    };
    case "flat": return {
      iconBody: "M8,30 C8,22 14,14 25,13 C36,14 42,22 42,30 C42,38 36,42 25,43 C14,42 8,38 8,30 Z",
      iconInner: "M10,30 C10,24 15,16 25,15 C35,16 40,24 40,30 C40,36 35,40 25,41 C15,40 10,36 10,30 Z",
    };
    case "teardrop": return {
      iconBody: "M14,27 C14,16 18,7 25,6 C32,7 36,16 36,27 C36,36 32,44 25,45 C18,44 14,36 14,27 Z",
      iconInner: "M16,27 C16,18 19,9 25,8 C31,9 34,18 34,27 C34,34 31,42 25,43 C19,42 16,34 16,27 Z",
    };
    case "blob": return {
      iconBody: "M9,30 C8,20 12,13 21,11 C27,10 36,14 40,22 C43,28 41,38 33,42 C26,45 15,44 10,38 Z",
      iconInner: "M11,30 C10,22 14,15 22,13 C27,12 34,16 38,24 C40,28 39,36 32,40 C26,43 17,42 12,36 Z",
    };
    case "mushroom": return {
      iconBody: "M7,24 C7,14 14,7 25,6 C36,7 43,14 43,24 C43,28 39,32 34,33 L34,42 C34,44 30,45 25,45 C20,45 16,44 16,42 L16,33 C11,32 7,28 7,24 Z",
      iconInner: "M9,24 C9,16 15,9 25,8 C35,9 41,16 41,24 C41,27 38,30 33,31 L33,40 C33,42 30,43 25,43 C20,43 17,42 17,40 L17,31 C12,30 9,27 9,24 Z",
    };
    case "star": return {
      iconBody: "M25,5 L29,16 L41,16 L32,24 L36,36 L25,29 L14,36 L18,24 L9,16 L21,16 Z",
      iconInner: "M25,8 L28,17 L38,17 L31,24 L34,33 L25,27 L16,33 L19,24 L12,17 L22,17 Z",
    };
    case "cube": return {
      iconBody: "M10,14 L40,14 C41,14 42,15 42,16 L42,39 C42,40 41,41 40,41 L10,41 C9,41 8,40 8,39 L8,16 C8,15 9,14 10,14 Z",
      iconInner: "M12,16 L38,16 C39,16 40,17 40,18 L40,37 C40,38 39,39 38,39 L12,39 C11,39 10,38 10,37 L10,18 C10,17 11,16 12,16 Z",
    };
    case "tall": return {
      iconBody: "M15,28 C15,13 18,5 25,4 C32,5 35,13 35,28 C35,38 32,46 25,47 C18,46 15,38 15,28 Z",
      iconInner: "M17,28 C17,14 19,7 25,6 C31,7 33,14 33,28 C33,37 31,44 25,45 C19,44 17,37 17,28 Z",
    };
    case "wide": return {
      iconBody: "M6,29 C6,21 11,15 25,14 C39,15 44,21 44,29 C44,36 39,41 25,42 C11,41 6,36 6,29 Z",
      iconInner: "M8,29 C8,23 12,17 25,16 C38,17 42,23 42,29 C42,34 38,39 25,40 C12,39 8,34 8,29 Z",
    };
    case "diamond": return {
      iconBody: "M25,5 C31,12 39,22 39,28 C39,36 33,44 25,45 C17,44 11,36 11,28 C11,22 19,12 25,5 Z",
      iconInner: "M25,8 C30,14 37,23 37,28 C37,34 32,42 25,43 C18,42 13,34 13,28 C13,23 20,14 25,8 Z",
    };
    case "bean": return {
      iconBody: "M12,25 C10,15 15,7 23,6 C29,7 32,12 31,19 C33,16 38,15 40,21 C42,28 38,38 30,42 C22,44 14,41 11,34 Z",
      iconInner: "M14,25 C12,17 16,9 23,8 C28,9 31,13 30,20 C32,17 37,17 39,22 C40,27 37,36 29,40 C23,42 16,39 13,33 Z",
    };
    case "ghost": return {
      iconBody: "M12,25 C12,13 17,5 25,4 C33,5 38,13 38,25 L38,38 L34,35 L30,39 L25,35 L20,39 L16,35 L12,38 Z",
      iconInner: "M14,25 C14,14 18,7 25,6 C32,7 36,14 36,25 L36,36 L33,34 L30,37 L25,34 L20,37 L17,34 L14,36 Z",
    };
    case "crescent": return {
      iconBody: "M13,27 C13,15 18,7 26,6 C34,7 39,15 39,27 C39,36 35,43 27,44 C22,44 18,41 17,36 C20,39 25,39 28,36 C32,32 32,22 28,17 C24,13 19,15 17,21 Z",
      iconInner: "M15,27 C15,17 19,9 26,8 C33,9 37,17 37,27 C37,34 34,41 27,42 C23,42 20,40 19,36 C22,38 26,37 28,34 C31,30 31,23 28,19 C25,15 21,17 19,23 Z",
    };
  }
}

function getIconAppendage(appendage: AppendageType, colors: SlimeColors): string {
  if (appendage === "none") return "";
  const c = colors.dark;
  const cl = colors.body;
  switch (appendage) {
    case "small_horns":
      return `<path d="M18,10 L16,3 L20,8" fill="${c}" opacity="0.7"/><path d="M32,10 L34,3 L30,8" fill="${c}" opacity="0.7"/>`;
    case "single_horn":
      return `<path d="M25,9 L24,1 L26,1 Z" fill="${cl}" opacity="0.8"/>`;
    case "cat_ears":
      return `<path d="M13,15 L10,4 L19,11" fill="${cl}" opacity="0.8"/><path d="M37,15 L40,4 L31,11" fill="${cl}" opacity="0.8"/>`;
    case "bunny_ears":
      return `<path d="M18,10 Q16,0 14,-5 Q17,0 20,8" fill="${cl}" opacity="0.7"/><path d="M32,10 Q34,0 36,-5 Q33,0 30,8" fill="${cl}" opacity="0.7"/>`;
    case "antenna":
      return `<line x1="21" y1="9" x2="18" y2="1" stroke="${c}" stroke-width="1" opacity="0.6"/><line x1="29" y1="9" x2="32" y2="1" stroke="${c}" stroke-width="1" opacity="0.6"/><circle cx="18" cy="1" r="1.5" fill="${colors.accent}" opacity="0.8"/><circle cx="32" cy="1" r="1.5" fill="${colors.accent}" opacity="0.8"/>`;
    case "tiny_wings":
      return `<path d="M9,24 Q2,18 4,12 Q6,17 9,20" fill="${colors.light}" opacity="0.45"/><path d="M41,24 Q48,18 46,12 Q44,17 41,20" fill="${colors.light}" opacity="0.45"/>`;
    case "tail_curl":
      return `<path d="M39,34 Q46,31 47,25" fill="none" stroke="${cl}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`;
    case "tail_spike":
      return `<path d="M39,33 L47,29 L48,22" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>`;
    case "tentacles":
      return `<path d="M14,41 Q11,46 9,48" fill="none" stroke="${cl}" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/><path d="M20,42 Q19,47 17,49" fill="none" stroke="${cl}" stroke-width="1" opacity="0.35"/><path d="M30,42 Q31,47 33,49" fill="none" stroke="${cl}" stroke-width="1" opacity="0.35"/><path d="M36,41 Q39,46 41,48" fill="none" stroke="${cl}" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>`;
    case "fins":
      return `<path d="M9,25 Q4,23 3,19 Q5,22 8,22" fill="${cl}" opacity="0.5"/><path d="M41,25 Q46,23 47,19 Q45,22 42,22" fill="${cl}" opacity="0.5"/>`;
    case "spikes_top":
      return `<polygon points="17,10 16,4 19,9" fill="${c}" opacity="0.6"/><polygon points="22,9 21.5,2 24,8" fill="${c}" opacity="0.65"/><polygon points="28,9 28.5,2 26,8" fill="${c}" opacity="0.65"/><polygon points="33,10 34,4 31,9" fill="${c}" opacity="0.6"/>`;
    default: return "";
  }
}

function getIconMarking(marking: MarkingType, colors: SlimeColors): string {
  if (marking === "none") return "";
  const mc = darkenColor(colors.body, 15);
  switch (marking) {
    case "star_mark":
      return `<polygon points="36,29 36.7,31 39,31.5 37,32.5 37.5,35 36,33.5 34.5,35 35,32.5 33,31.5 35.3,31" fill="${mc}" opacity="0.3"/>`;
    case "heart":
      return `<path d="M35,28 Q36,26 37.5,27 Q39,28 37.5,30 L36,32 L34.5,30 Q33,28 34.5,27 Q36,26 35,28" fill="${mc}" opacity="0.25"/>`;
    case "scar":
      return `<line x1="33" y1="18" x2="37" y2="22" stroke="${mc}" stroke-width="0.8" opacity="0.35" stroke-linecap="round"/>`;
    case "patch":
      return `<ellipse cx="35" cy="30" rx="4" ry="3.5" fill="${lightenColor(colors.body, 18)}" opacity="0.3"/>`;
    case "diamond_mark":
      return `<polygon points="36,27 38,30 36,33 34,30" fill="${mc}" opacity="0.25"/>`;
    case "cross":
      return `<line x1="34" y1="28" x2="38" y2="32" stroke="${mc}" stroke-width="0.8" opacity="0.25" stroke-linecap="round"/><line x1="38" y1="28" x2="34" y2="32" stroke="${mc}" stroke-width="0.8" opacity="0.25" stroke-linecap="round"/>`;
    default: return "";
  }
}

// ─── Icon SVG (consistent with main sprite) ─────────────────────────────────

export function generateSlimeIconSvg(
  element: string,
  size: number = 40,
  grade: string = "common",
  accessoryOverlays?: string[],
  speciesId: number = 0
): string {
  const hiddenOverride = getHiddenSpeciesOverride(speciesId);
  const colors = hiddenOverride ? hiddenOverride.colors : getSpeciesColors(element, speciesId);
  const uid = `ic_${element}_${grade}_${speciesId}`;
  const deeper = darkenColor(colors.dark, 8);

  // Pick variant for icon shape
  const variant = hiddenOverride ? hiddenOverride.variant : pickFromArray(BODY_VARIANTS, speciesId, 1);
  const appendage = hiddenOverride ? hiddenOverride.appendage : pickFromArray(APPENDAGE_TYPES, speciesId, 3);
  const marking = hiddenOverride ? hiddenOverride.marking : pickFromArray(MARKING_TYPES, speciesId, 4);

  let glowDef = "";
  let glowFilter = "";
  if (grade === "legendary" || grade === "mythic") {
    glowDef = `<filter id="iglow_${uid}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.3 0" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
    glowFilter = `filter="url(#iglow_${uid})"`;
  }

  const sparkles = grade === "rare" || grade === "epic"
    ? `<polygon points="12,16 12.8,18 15,18.5 12.8,19 12,21 11.2,19 9,18.5 11.2,18" fill="white" opacity="0.7"><animate attributeName="opacity" values="0.7;0.2;0.7" dur="2s" repeatCount="indefinite"/></polygon>
       <polygon points="38,18 38.6,19.5 40,20 38.6,20.5 38,22 37.4,20.5 36,20 37.4,19.5" fill="white" opacity="0.5"><animate attributeName="opacity" values="0.2;0.7;0.2" dur="1.5s" repeatCount="indefinite"/></polygon>`
    : "";

  // Accessory layers (scaled from 100x100 to 50x50 viewBox)
  let accDefs = "";
  let accLayers = "";
  if (accessoryOverlays && accessoryOverlays.length > 0) {
    for (const overlayId of accessoryOverlays) {
      const defs = getAccessoryDefs(overlayId);
      if (defs) accDefs += defs;
      accLayers += getAccessorySvg(overlayId);
    }
    if (accLayers) {
      accLayers = `<g transform="scale(0.5)">${accLayers}</g>`;
    }
  }

  // Mini appendage for icon (scaled down)
  const miniAppendage = getIconAppendage(appendage, colors);
  // Mini marking for icon (scaled down)
  const miniMarking = getIconMarking(marking, colors);
  // Icon body shape varies per variant
  const { iconBody, iconInner } = getIconBodyPaths(variant);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -8 60 62" width="${size * 2}" height="${size * 2}" overflow="visible">
  <defs>
    <radialGradient id="${uid}" cx="38%" cy="30%" r="60%" fx="35%" fy="28%">
      <stop offset="0%" stop-color="${colors.light}"/>
      <stop offset="35%" stop-color="${colors.body}"/>
      <stop offset="75%" stop-color="${colors.dark}"/>
      <stop offset="100%" stop-color="${deeper}"/>
    </radialGradient>
    <radialGradient id="ijelly_${uid}" cx="40%" cy="25%" r="55%">
      <stop offset="0%" stop-color="white" stop-opacity="0.10"/>
      <stop offset="50%" stop-color="white" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
    <filter id="idome_${uid}"><feGaussianBlur stdDeviation="1.5"/></filter>
    <filter id="ioutline_${uid}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.8" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.45 0"/>
    </filter>
    ${glowDef}
    ${accDefs}
  </defs>
  ${miniAppendage}
  <!-- White outline glow -->
  <path d="${iconBody}" fill="white" filter="url(#ioutline_${uid})"/>
  <!-- Body -->
  <path d="${iconBody}" fill="url(#${uid})" ${glowFilter}/>
  <!-- Jelly overlay -->
  <path d="${iconInner}" fill="url(#ijelly_${uid})"/>
  <!-- Internal bubbles -->
  <circle cx="18" cy="24" r="1.5" fill="white" opacity="0.10"/>
  <circle cx="32" cy="26" r="1" fill="white" opacity="0.12"/>
  <circle cx="22" cy="36" r="0.8" fill="white" opacity="0.08"/>
  <!-- Dome highlight -->
  <ellipse cx="19" cy="19" rx="8" ry="6" fill="white" opacity="0.22" filter="url(#idome_${uid})"/>
  <!-- Specular -->
  <circle cx="17" cy="17" r="4" fill="white" opacity="0.52"/>
  <circle cx="22" cy="21" r="2" fill="white" opacity="0.32"/>
  <circle cx="14" cy="22" r="1" fill="white" opacity="0.40"/>
  ${miniMarking}
  <!-- Eyes: sclera + iris + pupil + highlight -->
  <ellipse cx="20" cy="28" rx="4.5" ry="5" fill="white"/>
  <ellipse cx="30" cy="28" rx="4.5" ry="5" fill="white"/>
  <ellipse cx="20.5" cy="29" rx="3.2" ry="3.5" fill="${colors.iris}"/>
  <ellipse cx="30.5" cy="29" rx="3.2" ry="3.5" fill="${colors.iris}"/>
  <ellipse cx="20.5" cy="29" rx="2" ry="2.2" fill="#1A1A2E"/>
  <ellipse cx="30.5" cy="29" rx="2" ry="2.2" fill="#1A1A2E"/>
  <circle cx="22" cy="27" r="1.5" fill="white" opacity="0.9"/>
  <circle cx="32" cy="27" r="1.5" fill="white" opacity="0.9"/>
  <!-- Mouth -->
  <path d="M22,35 Q25,38 28,35" fill="none" stroke="#2D3436" stroke-width="1" stroke-linecap="round"/>
  <!-- Blush -->
  <ellipse cx="15" cy="33" rx="3.5" ry="2" fill="${colors.blush}" opacity="0.3"/>
  <ellipse cx="35" cy="33" rx="3.5" ry="2" fill="${colors.blush}" opacity="0.3"/>
  ${sparkles}
  ${accLayers}
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
