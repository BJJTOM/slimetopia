export const elementColors: Record<string, string> = {
  water: "#74B9FF",
  fire: "#FF6B6B",
  grass: "#55EFC4",
  light: "#FFEAA7",
  dark: "#A29BFE",
  ice: "#81ECEC",
  electric: "#FDCB6E",
  poison: "#6C5CE7",
  earth: "#E17055",
  wind: "#DFE6E9",
  celestial: "#FD79A8",
};

export const elementNames: Record<string, string> = {
  water: "물",
  fire: "불",
  grass: "풀",
  light: "빛",
  dark: "어둠",
  ice: "얼음",
  electric: "전기",
  poison: "독",
  earth: "대지",
  wind: "바람",
  celestial: "천체",
};

export const personalityNames: Record<string, string> = {
  energetic: "활발한",
  chill: "느긋한",
  foodie: "먹보",
  curious: "호기심쟁이",
  tsundere: "새침한",
  gentle: "다정한",
};

export const personalityEmoji: Record<string, string> = {
  energetic: "⚡",
  chill: "💤",
  foodie: "🍔",
  curious: "🔍",
  tsundere: "💢",
  gentle: "🌸",
};

export const gradeColors: Record<string, string> = {
  common: "#B2BEC3",
  uncommon: "#55EFC4",
  rare: "#74B9FF",
  epic: "#A29BFE",
  legendary: "#FFEAA7",
  mythic: "#FF6B6B",
};

export const gradeNames: Record<string, string> = {
  common: "커먼",
  uncommon: "언커먼",
  rare: "레어",
  epic: "에픽",
  legendary: "레전더리",
  mythic: "미시크",
};

export const gradeRank: Record<string, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5,
};

// ===== Mood System =====
export function deriveMood(hunger: number, condition: number, affection: number, isSick: boolean): string {
  if (isSick) return "sick";
  const avg = (hunger + condition + affection) / 3;
  if (avg >= 80) return "ecstatic";
  if (avg >= 60) return "happy";
  if (avg >= 40) return "neutral";
  if (avg >= 20) return "sad";
  return "miserable";
}

export const moodEmojis: Record<string, string> = {
  ecstatic: "\uD83E\uDD29", happy: "\uD83D\uDE0A", neutral: "\uD83D\uDE10",
  sad: "\uD83D\uDE22", miserable: "\uD83D\uDE2B", sick: "\uD83E\uDD12",
};

export const moodColors: Record<string, string> = {
  ecstatic: "#FF6B6B", happy: "#55EFC4", neutral: "#FFEAA7",
  sad: "#74B9FF", miserable: "#A29BFE", sick: "#6C5CE7",
};

export const moodNames: Record<string, string> = {
  ecstatic: "극상", happy: "행복", neutral: "보통",
  sad: "우울", miserable: "불행", sick: "아픔",
};
