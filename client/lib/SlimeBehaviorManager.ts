import behaviorData from "../../shared/slime-behaviors.json";

export type BehaviorEvent =
  | { type: "thought"; slimeId: string; text: string }
  | { type: "idle_action"; slimeId: string; actionId: string; emoji: string };

type SlimeInfo = {
  id: string;
  personality: string;
  hunger: number;
  condition: number;
  affection: number;
  is_sick: boolean;
};

// Personality-based action weights
const PERSONALITY_WEIGHTS: Record<string, Record<string, number>> = {
  energetic: { chase: 15, play_jump: 15, dance: 20, backflip: 15, move: 8, explore_wander: 8, sleep: 10, eat: 5, group_huddle: 4 },
  chill:     { sleep: 35, group_huddle: 20, explore_wander: 10, move: 8, dance: 10, backflip: 5, eat: 8, play_jump: 4 },
  foodie:    { eat: 30, group_huddle: 15, sleep: 15, move: 8, play_jump: 8, dance: 10, backflip: 8, explore_wander: 6 },
  curious:   { explore_wander: 25, chase: 12, play_jump: 12, move: 8, dance: 12, backflip: 12, eat: 5, group_huddle: 10, sleep: 4 },
  tsundere:  { explore_wander: 15, move: 12, sleep: 20, chase: 10, dance: 12, backflip: 12, eat: 8, group_huddle: 6, play_jump: 5 },
  gentle:    { group_huddle: 25, dance: 18, sleep: 18, move: 8, eat: 10, explore_wander: 5, backflip: 8, play_jump: 8 },
};

// Mood-based weight modifiers
function applyMoodWeights(weights: Record<string, number>, mood: string): Record<string, number> {
  const modified = { ...weights };
  switch (mood) {
    case "sick":
      // Sick: only sleep and eat
      for (const key of Object.keys(modified)) {
        if (key !== "sleep" && key !== "eat") modified[key] = 0;
      }
      modified.sleep = 60;
      modified.eat = 40;
      break;
    case "miserable":
    case "sad":
      // Sad: more sleep, less active behaviors
      modified.sleep = (modified.sleep || 0) * 2.5;
      modified.dance = (modified.dance || 0) * 0.2;
      modified.play_jump = (modified.play_jump || 0) * 0.2;
      modified.chase = (modified.chase || 0) * 0.3;
      modified.backflip = (modified.backflip || 0) * 0.2;
      break;
    case "ecstatic":
      // Ecstatic: more dancing & chasing
      modified.dance = (modified.dance || 0) * 2;
      modified.chase = (modified.chase || 0) * 1.8;
      modified.play_jump = (modified.play_jump || 0) * 1.5;
      modified.sleep = (modified.sleep || 0) * 0.3;
      break;
  }
  return modified;
}

// Action emojis
const ACTION_EMOJIS: Record<string, string> = {
  move: "\uD83D\uDEB6",
  chase: "\uD83C\uDFC3",
  sleep: "\uD83D\uDCA4",
  eat: "\uD83C\uDF56",
  group_huddle: "\uD83E\uDD17",
  dance: "\uD83D\uDC83",
  backflip: "\uD83E\uDD38",
  explore_wander: "\uD83D\uDD0D",
  play_jump: "\u2B50",
};

function deriveMood(hunger: number, condition: number, affection: number, isSick: boolean): string {
  if (isSick) return "sick";
  const avg = (hunger + condition + affection) / 3;
  if (avg >= 80) return "ecstatic";
  if (avg >= 60) return "happy";
  if (avg >= 40) return "neutral";
  if (avg >= 20) return "sad";
  return "miserable";
}

export class SlimeBehaviorManager {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private listener: ((event: BehaviorEvent) => void) | null = null;

  setListener(fn: (event: BehaviorEvent) => void) {
    this.listener = fn;
  }

  start(slimes: SlimeInfo[]) {
    this.stop();
    for (const slime of slimes) {
      this.scheduleThought(slime);
      this.scheduleIdleAction(slime);
    }
  }

  stop() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
  }

  private scheduleThought(slime: SlimeInfo) {
    const delay = 15000 + Math.random() * 30000; // 15-45s
    const timer = setTimeout(() => {
      const mood = deriveMood(slime.hunger, slime.condition, slime.affection, slime.is_sick);
      // Use mood-specific thoughts if available, else personality thoughts
      const moodThoughts = (behaviorData as Record<string, unknown>).mood_thoughts as Record<string, string[]> | undefined;
      let thoughts: string[] | undefined;
      if (moodThoughts && moodThoughts[mood]) {
        thoughts = moodThoughts[mood];
      }
      if (!thoughts || thoughts.length === 0) {
        thoughts = (behaviorData.idle_thoughts as Record<string, string[]>)[slime.personality];
      }
      if (thoughts && thoughts.length > 0) {
        const text = thoughts[Math.floor(Math.random() * thoughts.length)];
        this.listener?.({ type: "thought", slimeId: slime.id, text });
      }
      this.scheduleThought(slime);
    }, delay);
    this.timers.set(`thought_${slime.id}`, timer);
  }

  private scheduleIdleAction(slime: SlimeInfo) {
    const delay = 45000 + Math.random() * 75000; // 45-120s (less frequent)
    const timer = setTimeout(() => {
      const mood = deriveMood(slime.hunger, slime.condition, slime.affection, slime.is_sick);
      const actionId = this.pickWeightedAction(slime.personality, mood);
      const emoji = ACTION_EMOJIS[actionId] || "\u2728";

      this.listener?.({
        type: "idle_action",
        slimeId: slime.id,
        actionId,
        emoji,
      });
      this.scheduleIdleAction(slime);
    }, delay);
    this.timers.set(`idle_${slime.id}`, timer);
  }

  private pickWeightedAction(personality: string, mood: string): string {
    const baseWeights = PERSONALITY_WEIGHTS[personality] || PERSONALITY_WEIGHTS.gentle;
    const weights = applyMoodWeights(baseWeights, mood);
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (total <= 0) return "sleep";
    let roll = Math.random() * total;

    for (const [action, weight] of Object.entries(weights)) {
      roll -= weight;
      if (roll <= 0) return action;
    }

    return "move";
  }

  getClickReaction(personality: string): string {
    const reactions = (behaviorData.click_reactions as Record<string, string[]>)[personality];
    if (!reactions || reactions.length === 0) return "...";
    return reactions[Math.floor(Math.random() * reactions.length)];
  }

  destroy() {
    this.stop();
    this.listener = null;
  }
}
