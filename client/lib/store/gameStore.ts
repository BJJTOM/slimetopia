import { create } from "zustand";

interface Slime {
  id: string;
  species_id: number;
  name: string | null;
  level: number;
  element: string;
  personality: string;
  affection: number;
  hunger: number;
  condition: number;
}

interface GameState {
  // User
  gold: number;
  gems: number;
  stardust: number;
  userLevel: number;

  // Slimes
  slimes: Slime[];

  // Actions
  setGold: (gold: number) => void;
  setGems: (gems: number) => void;
  setStardust: (stardust: number) => void;
  setSlimes: (slimes: Slime[]) => void;
  addSlime: (slime: Slime) => void;
  removeSlime: (id: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  gold: 0,
  gems: 0,
  stardust: 0,
  userLevel: 1,
  slimes: [],

  setGold: (gold) => set({ gold }),
  setGems: (gems) => set({ gems }),
  setStardust: (stardust) => set({ stardust }),
  setSlimes: (slimes) => set({ slimes }),
  addSlime: (slime) => set((state) => ({ slimes: [...state.slimes, slime] })),
  removeSlime: (id) =>
    set((state) => ({ slimes: state.slimes.filter((s) => s.id !== id) })),
}));
