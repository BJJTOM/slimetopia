import { create } from "zustand";
import { authApi, api, ApiError } from "@/lib/api/client";
import { useAuthStore } from "./authStore";
import { toastReward, toastSuccess, toastLevelUp, toastError } from "@/components/ui/Toast";

export interface Slime {
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
  is_sick: boolean;
  mood: string;
  position_x?: number;
  position_y?: number;
}

export interface SlimeSpecies {
  id: number;
  name: string;
  name_en: string;
  element: string;
  grade: string;
  description: string;
}

export interface CodexEntry {
  species_id: number;
  discovered: boolean;
  name?: string;
  name_en?: string;
  element?: string;
  grade?: string;
  description?: string;
}

interface CodexData {
  total: number;
  discovered: number;
  entries: CodexEntry[];
}

interface MergeResult {
  merge_type: string;
  new_discovery: boolean;
  is_mutation: boolean;
  is_great_success: boolean;
  is_first_discovery: boolean;
  material_used: boolean;
  result: {
    slime: Slime;
    species: SlimeSpecies;
  };
}

interface NurtureResponse {
  affection: number;
  hunger: number;
  condition: number;
  exp_gained: number;
  new_exp: number;
  new_level: number;
  level_up: boolean;
  reaction: string;
  is_sick: boolean;
  mood: string;
}

interface LevelUpInfo {
  slimeId: string;
  newLevel: number;
}

// ===== Exploration Types =====
export interface Exploration {
  id: string;
  destination_id: number;
  slime_ids: string[];
  started_at: string;
  ends_at: string;
  claimed: boolean;
}

export interface MaterialDropInfo {
  material_id: number;
  chance: number;
  min_qty: number;
  max_qty: number;
}

export interface ExplorationDestination {
  id: number;
  name: string;
  duration_minutes: number;
  recommended_element: string;
  rewards: {
    gold?: { min: number; max: number };
    gems?: { min: number; max: number };
    items?: string[];
  };
  unlock: { type: string; value?: number };
  material_drops?: MaterialDropInfo[];
}

// ===== Shop Types =====
export interface ShopItem {
  id: number;
  name: string;
  name_en: string;
  type: string;
  category?: string;
  cost: { gold: number; gems: number };
  icon: string;
  description: string;
}

interface ShopBuyResult {
  type: string;
  result: Record<string, unknown>;
  user: { gold: number; gems: number };
}

// ===== Mission Types =====
export interface DailyMission {
  id: string;
  mission_id: number;
  name: string;
  description: string;
  action: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  reward_gold: number;
  reward_gems: number;
}

export interface AttendanceReward {
  day: number;
  gold: number;
  gems: number;
}

export interface AttendanceData {
  day_number: number;
  reward_claimed: boolean;
  today_checked: boolean;
  rewards: AttendanceReward[];
}

// ===== Recipe Types =====
export interface RecipeInfo {
  id: number;
  input_a: number;
  input_b: number;
  output: number;
  output_name: string;
  hint: string;
  hidden: boolean;
  discovered: boolean;
}

// ===== Achievement Types =====
export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  reward_gold: number;
  reward_gems: number;
  unlocked: boolean;
  unlocked_at?: string;
}

// ===== Accessory Types =====
export interface Accessory {
  id: number;
  name: string;
  name_en: string;
  slot: "head" | "face" | "body";
  icon: string;
  cost_gold: number;
  cost_gems: number;
  svg_overlay: string;
  owned: boolean;
}

export interface EquippedAccessory {
  slot: string;
  accessory_id: number;
  name: string;
  icon: string;
  svg_overlay: string;
}

// ===== Material Types =====
export interface MaterialDef {
  id: number;
  name: string;
  name_en: string;
  type: string;
  rarity: string;
  icon: string;
  description: string;
  effects: {
    element_boost?: { element: string; chance: number };
    grade_boost?: number;
    mutation_boost?: number;
    mutation_target?: number;
    great_success?: number;
  };
}

export interface MaterialInventoryItem {
  material_id: number;
  quantity: number;
}

export interface CollectionScoreData {
  species_points: number;
  set_bonus: number;
  first_discovery_bonus: number;
  total: number;
}

export interface SlimeSetProgress {
  id: number;
  name: string;
  name_en: string;
  description: string;
  species_ids: number[];
  completed: number;
  total: number;
  bonus_score: number;
  is_complete: boolean;
  buff: { type: string; value: number; label: string };
}

// ===== Mailbox Types =====
export interface MailItem {
  id: string;
  title: string;
  body: string;
  mail_type: string;
  reward_gold: number;
  reward_gems: number;
  read: boolean;
  claimed: boolean;
  created_at: string;
  expires_at?: string;
}

// ===== Idle Types =====
export interface IdleStatus {
  elapsed_minutes: number;
  gold_rate: number;
  total_gold: number;
  slime_count: number;
  last_collected: string;
}

// ===== Crafting Types =====
export interface CraftingIngredient {
  material_id: number;
  quantity: number;
}

export interface CraftingRecipe {
  id: number;
  name: string;
  result_type: string;
  result_id: number;
  result_qty: number;
  ingredients: CraftingIngredient[];
  can_craft: boolean;
}

// ===== Gift Types =====
export interface GiftLogEntry {
  id: string;
  sender_nickname: string;
  receiver_nickname: string;
  gift_type: string;
  amount: number;
  message: string;
  created_at: string;
  direction: "sent" | "received";
}

// cooldown key: `${slimeId}:${action}`
type CooldownMap = Record<string, number>; // value = expiry timestamp (ms)

// ===== Nurture action effect callback =====
export type NurtureEffectCallback = (slimeId: string, action: string) => void;

interface GameState {
  slimes: Slime[];
  species: SlimeSpecies[];
  selectedSlimeId: string | null;
  mergeSlotA: string | null;
  mergeSlotB: string | null;
  showMergeResult: MergeResult | null;
  activePanel: "home" | "inventory" | "codex" | "merge" | "explore" | "discovery" | "shop" | "achievements" | "leaderboard";
  cooldowns: CooldownMap;
  reactionMessage: { slimeId: string; text: string } | null;
  levelUpInfo: LevelUpInfo | null;
  codex: CodexData | null;

  // Exploration state
  explorations: Exploration[];
  destinations: ExplorationDestination[];

  // Shop state
  shopItems: ShopItem[];
  slimeCapacity: number;
  slimeCapacityNextTier: { from: number; to: number; gold_cost: number; gems_cost: number } | null;

  // Mission & attendance state
  dailyMissions: DailyMission[];
  attendance: AttendanceData | null;
  showMissionModal: boolean;
  showAttendanceModal: boolean;

  // Recipe state
  recipes: RecipeInfo[];

  // Evolution, wheel modal state
  showEvolutionTree: number | null; // species_id or null
  showVillage: boolean;
  showWheel: boolean;

  // Achievements
  achievements: Achievement[];

  // Accessories
  accessories: Accessory[];
  equippedAccessories: Record<string, EquippedAccessory[]>; // slimeId -> equipped[]
  showAccessoryPanel: boolean;

  // Mailbox
  mails: MailItem[];
  unreadMailCount: number;
  showMailbox: boolean;

  // Collection
  collectionCount: number;
  collectionEntries: { species_id: number; personality: string }[];
  collectionRequirements: Record<string, number>;
  collectionScore: CollectionScoreData | null;
  slimeSets: SlimeSetProgress[];

  // Materials
  materialDefs: MaterialDef[];
  materialInventory: MaterialInventoryItem[];
  synthesisMaterialId: number | null; // selected material for merge

  // Idle/Offline
  idleStatus: IdleStatus | null;

  // Crafting
  craftingRecipes: CraftingRecipe[];

  // Gifting
  giftHistory: GiftLogEntry[];

  // Food Inventory
  foodInventory: { item_id: number; quantity: number }[];

  // Community
  showCommunity: boolean;

  // Profile
  showProfile: boolean;

  // Shorts
  showShorts: boolean;

  // Mini Contents (Race, Fishing, Boss, Training)
  showMiniContents: boolean;

  // Collection (main feature)
  showCollection: boolean;

  // Legacy overlays (used by MiniContentsPage internally)
  showPlaza: boolean;
  showWorldBoss: boolean;
  showTraining: boolean;
  showRace: boolean;
  showFishing: boolean;

  // Effect callback
  nurtureEffectCallback: NurtureEffectCallback | null;

  fetchSlimes: (token: string) => Promise<void>;
  fetchSpecies: (token: string) => Promise<void>;
  fetchCodex: (token: string) => Promise<void>;
  selectSlime: (id: string | null) => void;
  setMergeSlot: (slot: "A" | "B", id: string | null) => void;
  mergeSlimes: (token: string) => Promise<void>;
  feedSlime: (token: string, id: string) => Promise<void>;
  petSlime: (token: string, id: string) => Promise<void>;
  playSlime: (token: string, id: string) => Promise<void>;
  bathSlime: (token: string, id: string) => Promise<void>;
  medicineSlime: (token: string, id: string) => Promise<void>;
  setActivePanel: (panel: GameState["activePanel"]) => void;
  clearMergeResult: () => void;
  clearLevelUp: () => void;
  getCooldownRemaining: (slimeId: string, action: string) => number;

  // Exploration actions
  fetchDestinations: (token: string) => Promise<void>;
  fetchExplorations: (token: string) => Promise<void>;
  startExploration: (token: string, destId: number, slimeIds: string[]) => Promise<void>;
  claimExploration: (token: string, explorationId: string) => Promise<{ gold_reward: number; gems_reward: number; exp_gain: number; element_bonus: boolean; material_drops?: { material_id: number; quantity: number; name: string; icon: string }[] } | null>;

  // Shop actions
  fetchShopItems: (token: string) => Promise<void>;
  buyItem: (token: string, itemId: number, slimeId?: string, quantity?: number) => Promise<ShopBuyResult | null>;
  fetchCapacityInfo: (token: string) => Promise<void>;
  expandCapacity: (token: string) => Promise<boolean>;

  // Rename
  renameSlime: (token: string, id: string, name: string) => Promise<void>;

  // Mission & attendance actions
  fetchDailyMissions: (token: string) => Promise<void>;
  claimMission: (token: string, missionId: string) => Promise<void>;
  fetchAttendance: (token: string) => Promise<void>;
  claimAttendance: (token: string) => Promise<void>;
  setShowMissionModal: (show: boolean) => void;
  setShowAttendanceModal: (show: boolean) => void;

  // Recipe actions
  fetchRecipes: (token: string) => Promise<void>;

  // Evolution, wheel actions
  setShowEvolutionTree: (speciesId: number | null) => void;
  setShowVillage: (show: boolean) => void;
  setShowWheel: (show: boolean) => void;

  // Achievement actions
  fetchAchievements: (token: string) => Promise<void>;

  // Accessory actions
  fetchAccessories: (token: string) => Promise<void>;
  fetchAllEquippedAccessories: (token: string) => Promise<void>;
  buyAccessory: (token: string, accessoryId: number) => Promise<boolean>;
  equipAccessory: (token: string, slimeId: string, accessoryId: number, unequip?: boolean) => Promise<boolean>;
  fetchEquippedAccessories: (token: string, slimeId: string) => Promise<void>;
  setShowAccessoryPanel: (show: boolean) => void;

  // Mailbox actions
  fetchMailbox: (token: string) => Promise<void>;
  readMail: (token: string, mailId: string) => Promise<void>;
  claimMail: (token: string, mailId: string) => Promise<void>;
  setShowMailbox: (show: boolean) => void;

  // Collection actions
  fetchCollectionCount: (token: string) => Promise<void>;
  fetchCollectionEntries: (token: string) => Promise<void>;
  fetchCollectionRequirements: (token: string) => Promise<void>;
  submitToCollection: (token: string, slimeId: string) => Promise<boolean>;
  fetchCollectionScore: (token: string) => Promise<void>;
  fetchSlimeSets: (token: string) => Promise<void>;

  // Material actions
  fetchMaterialDefs: (token: string) => Promise<void>;
  fetchMaterialInventory: (token: string) => Promise<void>;
  setSynthesisMaterial: (id: number | null) => void;

  // Idle actions
  fetchIdleStatus: (token: string) => Promise<void>;
  collectIdleReward: (token: string) => Promise<void>;

  // Crafting actions
  fetchCraftingRecipes: (token: string) => Promise<void>;
  craftItem: (token: string, recipeId: number) => Promise<boolean>;

  // Gift actions
  sendGift: (token: string, receiverNickname: string, giftType: string, amount: number, message?: string) => Promise<boolean>;
  fetchGiftHistory: (token: string) => Promise<void>;

  // Food inventory actions
  fetchFoodInventory: (token: string) => Promise<void>;
  applyFood: (token: string, itemId: number, slimeId: string) => Promise<boolean>;

  // Community actions
  setShowCommunity: (show: boolean) => void;

  // Profile actions
  setShowProfile: (show: boolean) => void;

  // Shorts actions
  setShowShorts: (show: boolean) => void;

  // Mini Contents actions
  setShowMiniContents: (show: boolean) => void;

  // Collection actions (main feature)
  setShowCollection: (show: boolean) => void;

  // Legacy overlay actions (used internally by MiniContentsPage)
  setShowPlaza: (show: boolean) => void;
  setShowWorldBoss: (show: boolean) => void;
  setShowTraining: (show: boolean) => void;
  setShowRace: (show: boolean) => void;
  setShowFishing: (show: boolean) => void;

  // Effect callback setter
  setNurtureEffectCallback: (cb: NurtureEffectCallback | null) => void;
}

function handleNurtureResponse(
  set: (fn: (s: GameState) => Partial<GameState>) => void,
  get: () => GameState,
  slimeId: string,
  action: string,
  res: NurtureResponse,
  cooldownSeconds: number
) {
  // Trigger effect callback
  const cb = get().nurtureEffectCallback;
  if (cb) cb(slimeId, action);

  // Update slime in list
  set((s) => ({
    slimes: s.slimes.map((sl) =>
      sl.id === slimeId
        ? {
            ...sl,
            affection: res.affection,
            hunger: res.hunger,
            condition: res.condition,
            exp: res.new_exp,
            level: res.new_level,
            is_sick: res.is_sick,
            mood: res.mood,
          }
        : sl
    ),
    cooldowns: {
      ...s.cooldowns,
      [`${slimeId}:${action}`]: Date.now() + cooldownSeconds * 1000,
    },
    reactionMessage: { slimeId, text: res.reaction },
    levelUpInfo: res.level_up ? { slimeId, newLevel: res.new_level } : s.levelUpInfo,
  }));

  // Toast for level up
  if (res.level_up) {
    toastLevelUp(`Lv.${res.new_level} 달성!`);
  }

  // Clear reaction after 3 seconds
  setTimeout(() => {
    const current = get().reactionMessage;
    if (current?.slimeId === slimeId) {
      set(() => ({ reactionMessage: null }));
    }
  }, 3000);
}

async function doNurtureAction(
  set: (fn: (s: GameState) => Partial<GameState>) => void,
  get: () => GameState,
  token: string,
  slimeId: string,
  action: string
) {
  try {
    const res = await authApi<NurtureResponse>(
      `/api/slimes/${slimeId}/${action}`,
      token,
      { method: "POST" }
    );
    const cooldownMap: Record<string, number> = { feed: 30, pet: 10, play: 60, bath: 45, medicine: 120 };
    handleNurtureResponse(set, get, slimeId, action, res, cooldownMap[action]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      const remaining = (err.data.remaining_seconds as number) || 1;
      set((s) => ({
        cooldowns: {
          ...s.cooldowns,
          [`${slimeId}:${action}`]: Date.now() + remaining * 1000,
        },
      }));
    }
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  slimes: [],
  species: [],
  selectedSlimeId: null,
  mergeSlotA: null,
  mergeSlotB: null,
  showMergeResult: null,
  activePanel: "home",
  cooldowns: {},
  reactionMessage: null,
  levelUpInfo: null,
  codex: null,
  explorations: [],
  destinations: [],
  shopItems: [],
  slimeCapacity: 30,
  slimeCapacityNextTier: null,
  dailyMissions: [],
  attendance: null,
  showMissionModal: false,
  showAttendanceModal: false,
  recipes: [],
  showRace: false,
  showEvolutionTree: null,
  showVillage: false,
  showFishing: false,
  showWheel: false,
  achievements: [],
  accessories: [],
  equippedAccessories: {},
  showAccessoryPanel: false,
  mails: [],
  unreadMailCount: 0,
  showMailbox: false,
  collectionCount: 0,
  collectionEntries: [],
  collectionRequirements: {},
  collectionScore: null,
  slimeSets: [],
  materialDefs: [],
  materialInventory: [],
  synthesisMaterialId: null,
  idleStatus: null,
  craftingRecipes: [],
  giftHistory: [],
  foodInventory: [],
  showCommunity: false,
  showProfile: false,
  showShorts: false,
  showMiniContents: false,
  showCollection: false,
  showPlaza: false,
  showWorldBoss: false,
  showTraining: false,
  nurtureEffectCallback: null,

  fetchSlimes: async (token) => {
    const res = await authApi<{ slimes: Slime[] }>("/api/slimes", token);
    set({ slimes: res.slimes || [] });
  },

  fetchSpecies: async (token) => {
    const res = await authApi<{ species: SlimeSpecies[] }>(
      "/api/codex/species",
      token
    );
    set({ species: res.species || [] });
  },

  fetchCodex: async (token) => {
    const res = await authApi<CodexData>("/api/codex", token);
    set({ codex: res });
  },

  selectSlime: (id) => set({ selectedSlimeId: id }),

  setMergeSlot: (slot, id) => {
    if (slot === "A") set({ mergeSlotA: id });
    else set({ mergeSlotB: id });
  },

  mergeSlimes: async (token) => {
    const { mergeSlotA, mergeSlotB, synthesisMaterialId } = get();
    if (!mergeSlotA || !mergeSlotB) return;

    const body: Record<string, unknown> = {
      slime_id_a: mergeSlotA,
      slime_id_b: mergeSlotB,
    };
    if (synthesisMaterialId) {
      body.material_id = synthesisMaterialId;
    }

    const result = await authApi<MergeResult>("/api/slimes/merge", token, {
      method: "POST",
      body,
    });

    set({
      mergeSlotA: null,
      mergeSlotB: null,
      synthesisMaterialId: null,
      showMergeResult: result,
    });

    await get().fetchSlimes(token);
    // Refresh material inventory if material was used
    if (synthesisMaterialId) {
      await get().fetchMaterialInventory(token);
    }
  },

  feedSlime: async (token, id) => {
    await doNurtureAction(set, get, token, id, "feed");
  },

  petSlime: async (token, id) => {
    await doNurtureAction(set, get, token, id, "pet");
  },

  playSlime: async (token, id) => {
    await doNurtureAction(set, get, token, id, "play");
  },

  bathSlime: async (token, id) => {
    await doNurtureAction(set, get, token, id, "bath");
  },

  medicineSlime: async (token, id) => {
    await doNurtureAction(set, get, token, id, "medicine");
  },

  setActivePanel: (panel) =>
    set({ activePanel: panel }),

  clearMergeResult: () => set({ showMergeResult: null }),

  clearLevelUp: () => set({ levelUpInfo: null }),

  getCooldownRemaining: (slimeId, action) => {
    const expiry = get().cooldowns[`${slimeId}:${action}`];
    if (!expiry) return 0;
    const remaining = Math.ceil((expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  },

  // ===== Exploration Actions =====
  fetchDestinations: async (token) => {
    try {
      const res = await authApi<{ destinations: ExplorationDestination[] }>("/api/explorations/destinations", token);
      set({ destinations: res.destinations || [] });
    } catch {
      // ignore
    }
  },

  fetchExplorations: async (token) => {
    const res = await authApi<{ explorations: Exploration[] }>("/api/explorations", token);
    set({ explorations: res.explorations || [] });
  },

  startExploration: async (token, destId, slimeIds) => {
    await authApi("/api/explorations/start", token, {
      method: "POST",
      body: { destination_id: destId, slime_ids: slimeIds },
    });
    await get().fetchExplorations(token);
  },

  claimExploration: async (token, explorationId) => {
    try {
      const res = await authApi<{ gold_reward: number; gems_reward: number; exp_gain: number; element_bonus: boolean; material_drops?: { material_id: number; quantity: number; name: string; icon: string }[] }>(
        `/api/explorations/${explorationId}/claim`,
        token,
        { method: "POST" }
      );
      await get().fetchExplorations(token);
      await get().fetchSlimes(token);
      const parts = [`${res.gold_reward}G`];
      if (res.gems_reward > 0) parts.push(`${res.gems_reward}💎`);
      if (res.element_bonus) parts.push("원소 보너스!");
      toastReward(`탐험 완료! ${parts.join(" + ")}`, "🧭");
      useAuthStore.getState().fetchUser();
      await get().fetchMaterialInventory(token);
      return res;
    } catch {
      return null;
    }
  },

  // ===== Shop Actions =====
  fetchShopItems: async (token) => {
    try {
      const res = await authApi<{ items: ShopItem[] }>("/api/shop/items", token);
      set({ shopItems: res.items || [] });
    } catch {
      // ignore
    }
  },

  buyItem: async (token, itemId, slimeId, quantity) => {
    const res = await authApi<ShopBuyResult>("/api/shop/buy", token, {
      method: "POST",
      body: { item_id: itemId, slime_id: slimeId, quantity: quantity || 0 },
    });
    // Refresh slimes after purchase
    await get().fetchSlimes(token);
    return res;
  },

  fetchCapacityInfo: async (token) => {
    try {
      const res = await authApi<{ current_capacity: number; slime_count: number; max_reached: boolean; next_tier?: { from: number; to: number; gold_cost: number; gems_cost: number } }>("/api/shop/capacity", token);
      set({ slimeCapacity: res.current_capacity, slimeCapacityNextTier: res.next_tier || null });
    } catch {
      // ignore
    }
  },

  expandCapacity: async (token) => {
    try {
      const res = await authApi<{ new_capacity: number; user: { gold: number; gems: number } }>("/api/shop/expand-capacity", token, { method: "POST" });
      set({ slimeCapacity: res.new_capacity });
      // Refresh capacity info to get next tier
      await get().fetchCapacityInfo(token);
      return true;
    } catch {
      return false;
    }
  },

  // ===== Rename =====
  renameSlime: async (token, id, name) => {
    await authApi<{ name: string }>(`/api/slimes/${id}/name`, token, {
      method: "PATCH",
      body: { name },
    });
    set((s) => ({
      slimes: s.slimes.map((sl) =>
        sl.id === id ? { ...sl, name } : sl
      ),
    }));
  },

  // ===== Mission & Attendance =====
  fetchDailyMissions: async (token) => {
    try {
      const res = await authApi<{ missions: DailyMission[] }>("/api/missions/daily", token);
      set({ dailyMissions: res.missions || [] });
    } catch {
      // ignore
    }
  },

  claimMission: async (token, missionId) => {
    try {
      await authApi("/api/missions/" + missionId + "/claim", token, { method: "POST" });
      const mission = get().dailyMissions.find((m) => m.id === missionId);
      await get().fetchDailyMissions(token);
      useAuthStore.getState().fetchUser();
      if (mission) {
        const parts = [];
        if (mission.reward_gold > 0) parts.push(`${mission.reward_gold}G`);
        if (mission.reward_gems > 0) parts.push(`${mission.reward_gems}💎`);
        toastReward(`미션 보상: ${parts.join(" + ")}`, "📋");
      }
    } catch {
      // ignore
    }
  },

  fetchAttendance: async (token) => {
    try {
      const res = await authApi<AttendanceData>("/api/attendance", token);
      set({ attendance: res });
    } catch {
      // ignore
    }
  },

  claimAttendance: async (token) => {
    try {
      await authApi("/api/attendance/claim", token, { method: "POST" });
      await get().fetchAttendance(token);
      useAuthStore.getState().fetchUser();
      toastSuccess("출석 체크 완료!", "📅");
    } catch {
      // ignore
    }
  },

  setShowMissionModal: (show) => set({ showMissionModal: show }),
  setShowAttendanceModal: (show) => set({ showAttendanceModal: show }),

  // ===== Recipes =====
  fetchRecipes: async (token) => {
    try {
      const res = await authApi<{ recipes: RecipeInfo[] }>("/api/recipes", token);
      set({ recipes: res.recipes || [] });
    } catch {
      // ignore
    }
  },

  // ===== Evolution, Wheel =====
  setShowEvolutionTree: (speciesId) => set({ showEvolutionTree: speciesId }),
  setShowVillage: (show) => set({ showVillage: show }),
  setShowWheel: (show) => set({ showWheel: show }),

  // ===== Achievements =====
  fetchAchievements: async (token) => {
    try {
      const res = await authApi<{ achievements: Achievement[] }>("/api/achievements", token);
      set({ achievements: res.achievements || [] });
    } catch {
      // ignore
    }
  },

  // ===== Accessories =====
  fetchAccessories: async (token) => {
    try {
      const res = await authApi<{ accessories: Accessory[] }>("/api/accessories", token);
      set({ accessories: res.accessories || [] });
    } catch {
      // ignore
    }
  },

  fetchAllEquippedAccessories: async (token) => {
    try {
      const res = await authApi<{ equipped_map: Record<string, EquippedAccessory[]> }>(
        "/api/accessories/all-equipped", token
      );
      set({ equippedAccessories: res.equipped_map || {} });
    } catch {
      // ignore
    }
  },

  buyAccessory: async (token, accessoryId) => {
    try {
      await authApi("/api/accessories/buy", token, {
        method: "POST",
        body: { accessory_id: accessoryId },
      });
      await get().fetchAccessories(token);
      useAuthStore.getState().fetchUser();
      toastReward("악세서리 구매 완료!", "🎀");
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        toastError(err.data.error as string || "구매 실패");
      }
      return false;
    }
  },

  equipAccessory: async (token, slimeId, accessoryId, unequip = false) => {
    try {
      await authApi("/api/accessories/equip", token, {
        method: "POST",
        body: { slime_id: slimeId, accessory_id: accessoryId, unequip },
      });
      await get().fetchEquippedAccessories(token, slimeId);
      return true;
    } catch {
      toastError("장착 실패");
      return false;
    }
  },

  fetchEquippedAccessories: async (token, slimeId) => {
    try {
      const res = await authApi<{ equipped: EquippedAccessory[] }>(
        `/api/slimes/${slimeId}/accessories`, token
      );
      set((s) => ({
        equippedAccessories: {
          ...s.equippedAccessories,
          [slimeId]: res.equipped || [],
        },
      }));
    } catch {
      // ignore
    }
  },

  setShowAccessoryPanel: (show) => set({ showAccessoryPanel: show }),

  // ===== Mailbox =====
  fetchMailbox: async (token) => {
    try {
      const res = await authApi<{ mails: MailItem[]; unread_count: number }>("/api/mailbox", token);
      set({ mails: res.mails || [], unreadMailCount: res.unread_count || 0 });
    } catch {
      // ignore
    }
  },

  readMail: async (token, mailId) => {
    try {
      await authApi("/api/mailbox/" + mailId + "/read", token, { method: "POST" });
      set((s) => ({
        mails: s.mails.map((m) => m.id === mailId ? { ...m, read: true } : m),
        unreadMailCount: Math.max(0, s.unreadMailCount - 1),
      }));
    } catch {
      // ignore
    }
  },

  claimMail: async (token, mailId) => {
    try {
      const res = await authApi<{ reward_gold: number; reward_gems: number }>("/api/mailbox/" + mailId + "/claim", token, { method: "POST" });
      set((s) => ({
        mails: s.mails.map((m) => m.id === mailId ? { ...m, claimed: true, read: true } : m),
      }));
      const parts = [];
      if (res.reward_gold > 0) parts.push(`${res.reward_gold}G`);
      if (res.reward_gems > 0) parts.push(`${res.reward_gems}\uD83D\uDC8E`);
      toastReward(`\uC6B0\uD3B8 \uBCF4\uC0C1: ${parts.join(" + ")}`, "\uD83D\uDCEC");
      useAuthStore.getState().fetchUser();
    } catch {
      // ignore
    }
  },

  setShowMailbox: (show) => set({ showMailbox: show }),

  // ===== Collection =====
  fetchCollectionCount: async (token) => {
    try {
      const res = await authApi<{ count: number }>("/api/collection/count", token);
      set({ collectionCount: res.count || 0 });
    } catch {
      // ignore
    }
  },

  fetchCollectionEntries: async (token) => {
    try {
      const res = await authApi<{ entries: { species_id: number; personality: string }[] }>("/api/collection/entries", token);
      set({ collectionEntries: res.entries || [] });
    } catch {
      // ignore
    }
  },

  fetchCollectionRequirements: async (token) => {
    try {
      const res = await authApi<{ requirements: Record<string, number> }>("/api/collection/requirements", token);
      set({ collectionRequirements: res.requirements || {} });
    } catch {
      // ignore
    }
  },

  submitToCollection: async (token, slimeId) => {
    try {
      const res = await authApi<{ success: boolean; collection_count: number; species_id: number; personality: string }>(
        "/api/collection/submit", token, { method: "POST", body: { slime_id: slimeId } }
      );
      set((s) => ({
        selectedSlimeId: null,
        collectionCount: res.collection_count,
        collectionEntries: [...s.collectionEntries, { species_id: res.species_id, personality: res.personality }],
      }));
      await get().fetchSlimes(token);
      toastReward("컬렉션 제출 완료!", "📖");
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        const errCode = err.data.error as string;
        if (errCode === "level_too_low") {
          toastError(`레벨이 부족합니다 (Lv.${err.data.required_level} 필요)`);
        } else if (errCode === "already_submitted") {
          toastError("이미 등록된 조합입니다");
        } else if (errCode === "slime_on_exploration") {
          toastError("탐험 중인 슬라임은 제출할 수 없습니다");
        } else {
          toastError(errCode || "제출 실패");
        }
      }
      return false;
    }
  },

  // ===== Collection Score & Sets =====
  fetchCollectionScore: async (token) => {
    try {
      const res = await authApi<CollectionScoreData>("/api/codex/score", token);
      set({ collectionScore: res });
    } catch {
      // ignore
    }
  },

  fetchSlimeSets: async (token) => {
    try {
      const res = await authApi<{ sets: SlimeSetProgress[] }>("/api/codex/sets", token);
      set({ slimeSets: res.sets || [] });
    } catch {
      // ignore
    }
  },

  // ===== Materials =====
  fetchMaterialDefs: async (token) => {
    try {
      const res = await authApi<{ materials: MaterialDef[] }>("/api/materials", token);
      set({ materialDefs: res.materials || [] });
    } catch {
      // ignore
    }
  },

  fetchMaterialInventory: async (token) => {
    try {
      const res = await authApi<{ inventory: MaterialInventoryItem[] }>("/api/materials/inventory", token);
      set({ materialInventory: res.inventory || [] });
    } catch {
      // ignore
    }
  },

  setSynthesisMaterial: (id) => set({ synthesisMaterialId: id }),

  // ===== Idle/Offline =====
  fetchIdleStatus: async (token) => {
    try {
      const res = await authApi<IdleStatus>("/api/idle/status", token);
      set({ idleStatus: res });
    } catch {
      // ignore
    }
  },

  collectIdleReward: async (token) => {
    try {
      const res = await authApi<{ collected: boolean; total_gold: number }>("/api/idle/collect", token, { method: "POST" });
      if (res.collected) {
        toastReward(`${res.total_gold.toLocaleString()}G 수령!`, "\uD83C\uDF19");
        useAuthStore.getState().fetchUser();
      }
      set({ idleStatus: null });
    } catch {
      // ignore
    }
  },

  // ===== Crafting =====
  fetchCraftingRecipes: async (token) => {
    try {
      const res = await authApi<{ recipes: CraftingRecipe[] }>("/api/crafting/recipes", token);
      set({ craftingRecipes: res.recipes || [] });
    } catch {
      // ignore
    }
  },

  craftItem: async (token, recipeId) => {
    try {
      const res = await authApi<{ success: boolean; message: string }>("/api/crafting/craft", token, {
        method: "POST",
        body: { recipe_id: recipeId },
      });
      if (res.success) {
        toastReward(res.message || "제작 완료!", "\u2692\uFE0F");
        await get().fetchMaterialInventory(token);
        await get().fetchCraftingRecipes(token);
        useAuthStore.getState().fetchUser();
      }
      return res.success;
    } catch (err) {
      if (err instanceof ApiError) {
        toastError((err.data.error as string) || "제작 실패");
      }
      return false;
    }
  },

  // ===== Gifting =====
  sendGift: async (token, receiverNickname, giftType, amount, message) => {
    try {
      await authApi("/api/gift/send", token, {
        method: "POST",
        body: { receiver_nickname: receiverNickname, type: giftType, amount, message },
      });
      toastSuccess("선물을 보냈습니다!", "\uD83C\uDF81");
      useAuthStore.getState().fetchUser();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        toastError((err.data.error as string) || "선물 실패");
      }
      return false;
    }
  },

  fetchGiftHistory: async (token) => {
    try {
      const res = await authApi<{ history: GiftLogEntry[] }>("/api/gift/history", token);
      set({ giftHistory: res.history || [] });
    } catch {
      // ignore
    }
  },

  // ===== Food Inventory =====
  fetchFoodInventory: async (token) => {
    try {
      const res = await authApi<{ items: { item_id: number; quantity: number }[] }>("/api/food/inventory", token);
      set({ foodInventory: res.items || [] });
    } catch {
      // ignore
    }
  },

  applyFood: async (token, itemId, slimeId) => {
    try {
      const res = await authApi<{ slime_id: string; affection: number; hunger: number; condition: number; remaining: number }>(
        "/api/food/apply", token, { method: "POST", body: { item_id: itemId, slime_id: slimeId } }
      );
      // Update slime stats in state
      set((s) => ({
        slimes: s.slimes.map((sl) =>
          sl.id === res.slime_id ? { ...sl, affection: res.affection, hunger: res.hunger, condition: res.condition } : sl
        ),
        foodInventory: s.foodInventory.map((f) =>
          f.item_id === itemId ? { ...f, quantity: res.remaining } : f
        ).filter((f) => f.quantity > 0),
      }));
      return true;
    } catch {
      return false;
    }
  },

  // ===== Community =====
  setShowCommunity: (show) => set({ showCommunity: show }),

  // ===== Profile =====
  setShowProfile: (show) => set({ showProfile: show }),

  // ===== Shorts =====
  setShowShorts: (show) => set({ showShorts: show }),

  // ===== Mini Contents =====
  setShowMiniContents: (show) => set({ showMiniContents: show }),

  // ===== Collection =====
  setShowCollection: (show) => set({ showCollection: show }),

  // ===== Legacy overlays =====
  setShowPlaza: (show) => set({ showPlaza: show }),
  setShowWorldBoss: (show) => set({ showWorldBoss: show }),
  setShowTraining: (show) => set({ showTraining: show }),
  setShowRace: (show) => set({ showRace: show }),
  setShowFishing: (show) => set({ showFishing: show }),

  // ===== Effect Callback =====
  setNurtureEffectCallback: (cb) => set({ nurtureEffectCallback: cb }),
}));
