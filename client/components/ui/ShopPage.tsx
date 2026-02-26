"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore, type ShopItem, type SlimeSpecies, type Slime } from "@/lib/store/gameStore";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { elementColors, elementNames, gradeColors, gradeNames } from "@/lib/constants";
import { authApi } from "@/lib/api/client";
import SeasonBanner from "./SeasonBanner";
import GachaRevealModal from "./GachaRevealModal";
import { toastReward, toastSuccess, toastError } from "./Toast";

type ShopTab = "all" | "egg" | "food" | "special" | "gems";

const TABS: { id: ShopTab; label: string; icon: string }[] = [
  { id: "all", label: "전체", icon: "🏪" },
  { id: "egg", label: "뽑기", icon: "🥚" },
  { id: "food", label: "먹이", icon: "🍖" },
  { id: "special", label: "특별", icon: "✨" },
  { id: "gems", label: "보석", icon: "💎" },
];

interface GemPackage {
  id: number;
  name: string;
  gems: number;
  price: number;
}

interface PityEntry {
  count: number;
  next_rare: number;
  next_epic: number;
  next_legendary: number;
}

interface EggBanner {
  itemId: number;
  name: string;
  subtitle: string;
  icon: string;
  gradient: string;
  borderColor: string;
  glowColor: string;
  accentColor: string;
  element?: string;
  rates: { grade: string; pct: number }[];
  tag?: string;
}

const FEATURED_BANNERS: EggBanner[] = [
  {
    itemId: 1, name: "슬라임 알", subtitle: "모든 원소 · 전 등급", icon: "egg.png",
    gradient: "linear-gradient(135deg, rgba(85,239,196,0.12) 0%, rgba(116,185,255,0.08) 100%)",
    borderColor: "rgba(85,239,196,0.2)", glowColor: "rgba(85,239,196,0.06)", accentColor: "#55EFC4",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
  },
  {
    itemId: 2, name: "프리미엄 알", subtitle: "레어 이상 확정!", icon: "slime_egg.png",
    gradient: "linear-gradient(135deg, rgba(162,155,254,0.15) 0%, rgba(255,159,243,0.08) 100%)",
    borderColor: "rgba(162,155,254,0.25)", glowColor: "rgba(162,155,254,0.08)", accentColor: "#A29BFE",
    tag: "PREMIUM",
    rates: [{ grade: "rare", pct: 60 }, { grade: "epic", pct: 30 }, { grade: "legendary", pct: 8 }, { grade: "mythic", pct: 2 }],
  },
  {
    itemId: 6, name: "전설의 알", subtitle: "에픽 이상 확정!", icon: "slime_egg.png",
    gradient: "linear-gradient(135deg, rgba(255,234,167,0.15) 0%, rgba(253,203,110,0.08) 100%)",
    borderColor: "rgba(255,234,167,0.25)", glowColor: "rgba(255,234,167,0.08)", accentColor: "#FFEAA7",
    tag: "LEGENDARY",
    rates: [{ grade: "epic", pct: 50 }, { grade: "legendary", pct: 35 }, { grade: "mythic", pct: 15 }],
  },
];

const ELEMENT_BANNERS: EggBanner[] = [
  {
    itemId: 5, name: "불꽃 알", subtitle: "불 원소 전용", icon: "egg.png", element: "fire",
    gradient: "linear-gradient(135deg, rgba(255,107,107,0.12) 0%, rgba(253,203,110,0.06) 100%)",
    borderColor: "rgba(255,107,107,0.2)", glowColor: "rgba(255,107,107,0.06)", accentColor: "#FF6B6B",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
  },
  {
    itemId: 9, name: "물방울 알", subtitle: "물 원소 전용", icon: "egg.png", element: "water",
    gradient: "linear-gradient(135deg, rgba(116,185,255,0.12) 0%, rgba(129,236,236,0.06) 100%)",
    borderColor: "rgba(116,185,255,0.2)", glowColor: "rgba(116,185,255,0.06)", accentColor: "#74B9FF",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
  },
  {
    itemId: 10, name: "풀잎 알", subtitle: "풀 원소 전용", icon: "egg.png", element: "grass",
    gradient: "linear-gradient(135deg, rgba(85,239,196,0.12) 0%, rgba(0,206,201,0.06) 100%)",
    borderColor: "rgba(85,239,196,0.2)", glowColor: "rgba(85,239,196,0.06)", accentColor: "#55EFC4",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
  },
  {
    itemId: 20, name: "어둠 알", subtitle: "어둠 원소 전용", icon: "egg.png", element: "dark",
    gradient: "linear-gradient(135deg, rgba(162,155,254,0.12) 0%, rgba(108,92,231,0.06) 100%)",
    borderColor: "rgba(162,155,254,0.2)", glowColor: "rgba(162,155,254,0.06)", accentColor: "#A29BFE",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
  },
  {
    itemId: 21, name: "얼음 알", subtitle: "얼음 원소 전용", icon: "egg.png", element: "ice",
    gradient: "linear-gradient(135deg, rgba(129,236,236,0.12) 0%, rgba(116,185,255,0.06) 100%)",
    borderColor: "rgba(129,236,236,0.2)", glowColor: "rgba(129,236,236,0.06)", accentColor: "#81ECEC",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
  },
  {
    itemId: 22, name: "번개 알", subtitle: "전기 원소 전용", icon: "egg.png", element: "electric",
    gradient: "linear-gradient(135deg, rgba(253,203,110,0.12) 0%, rgba(255,234,167,0.06) 100%)",
    borderColor: "rgba(253,203,110,0.2)", glowColor: "rgba(253,203,110,0.06)", accentColor: "#FDCB6E",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
  },
  {
    itemId: 23, name: "대지 알", subtitle: "대지 원소 전용", icon: "egg.png", element: "earth",
    gradient: "linear-gradient(135deg, rgba(225,112,85,0.12) 0%, rgba(214,162,132,0.06) 100%)",
    borderColor: "rgba(225,112,85,0.2)", glowColor: "rgba(225,112,85,0.06)", accentColor: "#E17055",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
  },
];

const ELEMENT_EMOJI: Record<string, string> = {
  fire: "\uD83D\uDD25", water: "\uD83D\uDCA7", grass: "\uD83C\uDF3F", dark: "\uD83C\uDF11", ice: "\u2744\uFE0F", electric: "\u26A1", earth: "\uD83E\uDEA8",
};

export default function ShopPage() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const { shopItems, slimes, species, fetchShopItems, buyItem, slimeCapacity, slimeCapacityNextTier, fetchCapacityInfo, expandCapacity } = useGameStore();

  const [activeTab, setActiveTab] = useState<ShopTab>("all");
  const [buyResult, setBuyResult] = useState<{
    type: string;
    slime?: Slime;
    species?: SlimeSpecies;
    foodResult?: { affection: number; hunger: number };
    message?: string;
  } | null>(null);
  const [gachaResults, setGachaResults] = useState<{ slime: Slime; species: SlimeSpecies }[] | null>(null);
  const [selectingFood, setSelectingFood] = useState<ShopItem | null>(null);
  const [pity, setPity] = useState<Record<string, PityEntry>>({});
  const [expandedBanner, setExpandedBanner] = useState<number | null>(null);
  const [pulling, setPulling] = useState(false);
  const bannerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) {
      fetchShopItems(token);
      fetchCapacityInfo(token);
    }
  }, [token, fetchShopItems, fetchCapacityInfo]);

  const fetchPity = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authApi<{ pity: Record<string, PityEntry> }>("/api/shop/pity", token);
      setPity(res.pity || {});
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { fetchPity(); }, [fetchPity]);

  const filteredItems = activeTab === "all"
    ? shopItems
    : shopItems.filter((item) => item.category === activeTab);

  const nonEggItems = filteredItems.filter((item) => item.type !== "egg" && item.type !== "multi_egg");
  const foodItems = nonEggItems.filter((item) => item.type === "food");
  const boosterItems = nonEggItems.filter((item) => item.type === "booster");
  const decoItems = nonEggItems.filter((item) => item.type === "decoration");
  const otherItems = nonEggItems.filter((item) => !["food", "booster", "decoration"].includes(item.type));

  const showEggBanners = activeTab === "all" || activeTab === "egg";

  const handleBuy = async (item: ShopItem, slimeId?: string, quantity?: number) => {
    if (!token || pulling) return;

    if (item.type === "food" && !slimeId && !quantity) {
      setSelectingFood(item);
      return;
    }

    setPulling(true);
    let res: Awaited<ReturnType<typeof buyItem>> = null;
    try {
      res = await buyItem(token, item.id, slimeId, quantity);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "구매에 실패했습니다";
      toastError(msg);
    }
    setPulling(false);

    if (res) {
      useAuthStore.getState().fetchUser();
      fetchPity();

      if (res.type === "egg") {
        const result = res.result as { slime: Slime; species: SlimeSpecies };
        setGachaResults([{ slime: result.slime, species: result.species }]);
      } else if (res.type === "multi_egg") {
        const result = res.result as { results: { slime: Slime; species: SlimeSpecies }[] };
        setGachaResults(result.results);
      } else if (res.type === "food") {
        const result = res.result as { affection: number; hunger: number };
        setBuyResult({ type: "food", foodResult: result });
        setSelectingFood(null);
      } else if (res.type === "decoration" || res.type === "booster") {
        const result = res.result as { message: string };
        setBuyResult({ type: res.type, message: result.message });
        if (res.type === "booster") {
          toastSuccess(result.message || "부스터 활성화!", "\u26A1");
        }
      }
    }
  };

  const handleEggPull = async (itemId: number, quantity: number) => {
    const item = shopItems.find((i) => i.id === itemId);
    if (!item) return;
    await handleBuy(item, undefined, quantity);
  };

  const canAfford = (item: ShopItem) => {
    if (!user) return false;
    if (item.cost.gold > 0 && user.gold < item.cost.gold) return false;
    if (item.cost.gems > 0 && user.gems < item.cost.gems) return false;
    return true;
  };

  const canAffordMulti = (item: ShopItem, qty: number) => {
    if (!user) return false;
    if (item.cost.gold * qty > user.gold) return false;
    if (item.cost.gems * qty > user.gems) return false;
    return true;
  };

  // Hungry slimes count for food recommendation
  const hungrySlimes = slimes.filter((s) => s.hunger < 50);

  return (
    <div className="h-full flex flex-col" style={{ background: "#1A0E08" }}>
      {/* Leather book header */}
      <div className="shrink-0 relative"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 0px)",
          background: "linear-gradient(180deg, #4A2515 0%, #3D2017 50%, #2C1810 100%)",
          borderBottom: "3px solid #8B6914",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}>
        {/* Leather texture overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
        }} />

        <div className="flex items-center gap-3 px-4 py-3 relative z-10">
          <div className="flex items-center gap-2">
            {/* Book icon */}
            <div className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #C9A84C, #8B6914)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 3px rgba(0,0,0,0.3)",
              }}>
              <span className="text-[12px] font-black" style={{ color: "#3D2017" }}>&#9830;</span>
            </div>
            <h1 className="font-bold text-lg" style={{
              color: "#F5E6C8",
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              letterSpacing: "0.05em",
            }}>상점</h1>
          </div>

          {/* Currency badges */}
          {user && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md"
                style={{
                  background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(139,105,20,0.1))",
                  color: "#D4AF37",
                  border: "1px solid rgba(139,105,20,0.4)",
                  fontFamily: "Georgia, serif",
                }}>
                🪙 {user.gold.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md"
                style={{
                  background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(139,105,20,0.1))",
                  color: "#C9A84C",
                  border: "1px solid rgba(139,105,20,0.4)",
                  fontFamily: "Georgia, serif",
                }}>
                💎 {user.gems.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Gold trim line */}
        <div className="h-px" style={{ background: "linear-gradient(90deg, transparent 5%, #8B6914 30%, #D4AF37 50%, #8B6914 70%, transparent 95%)" }} />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-3 py-3" style={{ background: "linear-gradient(180deg, #1A0E08 0%, #241510 100%)" }}>
        <SeasonBanner />

        {/* Capacity Expansion Banner */}
        <div className="rounded-lg p-3 mb-3 relative overflow-hidden" style={{
          background: "linear-gradient(160deg, #2C1F15, #1E140D)",
          border: "1.5px solid rgba(139,105,20,0.3)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.05)",
        }}>
          {/* Corner ornaments */}
          <div className="absolute top-0.5 left-0.5 w-3 h-3 pointer-events-none" style={{ opacity: 0.4 }}>
            <div className="absolute top-0 left-0 w-full h-px" style={{ background: "#8B6914" }} />
            <div className="absolute top-0 left-0 w-px h-full" style={{ background: "#8B6914" }} />
          </div>
          <div className="absolute top-0.5 right-0.5 w-3 h-3 pointer-events-none" style={{ opacity: 0.4 }}>
            <div className="absolute top-0 right-0 w-full h-px" style={{ background: "#8B6914" }} />
            <div className="absolute top-0 right-0 w-px h-full" style={{ background: "#8B6914" }} />
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📦</span>
              <div>
                <p className="text-xs font-bold" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>슬라임 보관함</p>
                <p className="text-[10px]" style={{ color: "#C9A84C" }}>{slimes.length} / {slimeCapacity}마리</p>
              </div>
            </div>
            {slimeCapacityNextTier && (
              <button
                onClick={async () => {
                  if (!token) return;
                  if (confirm(`보관함을 ${slimeCapacityNextTier.to}칸으로 확장하시겠습니까?\n비용: ${slimeCapacityNextTier.gold_cost.toLocaleString()}G${slimeCapacityNextTier.gems_cost > 0 ? ` + ${slimeCapacityNextTier.gems_cost}💎` : ""}`)) {
                    const ok = await expandCapacity(token);
                    if (ok) toastSuccess(`보관함이 ${slimeCapacityNextTier.to}칸으로 확장되었습니다!`, "📦");
                    else toastError("확장에 실패했습니다. 재화를 확인해주세요.");
                  }
                }}
                className="px-3 py-1.5 rounded-md text-[10px] font-bold transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #6B3A2A, #3D2017)",
                  color: "#F5E6C8",
                  border: "1px solid #8B6914",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.3)",
                  fontFamily: "Georgia, serif",
                }}
              >
                {slimeCapacityNextTier.to}칸 확장
                <span className="ml-1 opacity-70" style={{ color: "#C9A84C" }}>
                  {slimeCapacityNextTier.gold_cost > 0 ? `${(slimeCapacityNextTier.gold_cost / 1000).toFixed(0)}K` : ""}
                  {slimeCapacityNextTier.gems_cost > 0 ? ` +${slimeCapacityNextTier.gems_cost}💎` : ""}
                </span>
              </button>
            )}
            {!slimeCapacityNextTier && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{
                background: "rgba(139,105,20,0.1)",
                color: "#D4AF37",
                border: "1px solid rgba(139,105,20,0.3)",
                fontFamily: "Georgia, serif",
              }}>MAX</span>
            )}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(139,105,20,0.15)",
          }}>
            <div className="h-full rounded-full transition-all relative overflow-hidden" style={{
              width: `${Math.min(100, (slimes.length / slimeCapacity) * 100)}%`,
              background: slimes.length >= slimeCapacity
                ? "linear-gradient(90deg, #C0392B, #E74C3C)"
                : "linear-gradient(90deg, #8B6914, #C9A84C, #D4AF37)",
              boxShadow: "0 0 6px rgba(201,168,76,0.3)",
            }}>
              <div className="absolute inset-0" style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                animation: "book-shimmer 4s ease-in-out infinite",
              }} />
            </div>
          </div>
        </div>

        {/* Daily Roulette banner */}
        <button
          onClick={() => useGameStore.getState().setShowWheel(true)}
          className="w-full rounded-lg p-3 mb-3 flex items-center gap-3 transition-all active:scale-[0.98] relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #3D2D1A, #2A1F14)",
            border: "1.5px solid rgba(139,105,20,0.3)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.1)",
          }}>
          {/* Corner ornaments */}
          <div className="absolute top-0.5 left-0.5 w-3 h-3 pointer-events-none" style={{ opacity: 0.3 }}>
            <div className="absolute top-0 left-0 w-full h-px" style={{ background: "#C9A84C" }} />
            <div className="absolute top-0 left-0 w-px h-full" style={{ background: "#C9A84C" }} />
          </div>
          <div className="absolute bottom-0.5 right-0.5 w-3 h-3 pointer-events-none" style={{ opacity: 0.3 }}>
            <div className="absolute bottom-0 right-0 w-full h-px" style={{ background: "#C9A84C" }} />
            <div className="absolute bottom-0 right-0 w-px h-full" style={{ background: "#C9A84C" }} />
          </div>

          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{
              background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(139,105,20,0.1))",
              border: "1px solid rgba(139,105,20,0.3)",
            }}>
            🎰
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-[13px]" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>일일 룰렛</p>
            <p className="text-[10px]" style={{ color: "rgba(201,168,76,0.5)" }}>매일 무료로 보상을 획득하세요!</p>
          </div>
          <span className="text-[10px] font-bold px-3 py-1.5 rounded-md"
            style={{
              background: "linear-gradient(135deg, #6B3A2A, #3D2017)",
              color: "#F5E6C8",
              border: "1px solid #8B6914",
              fontFamily: "Georgia, serif",
              boxShadow: "inset 0 1px 0 rgba(139,105,20,0.3)",
            }}>
            도전
          </span>
        </button>

        {/* Tab bar — book chapter tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{
          background: "linear-gradient(160deg, #2C1F15, #1E140D)",
          border: "1px solid rgba(139,105,20,0.15)",
        }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tab.id === "all" ? shopItems.length : shopItems.filter((i) => i.category === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-bold transition-all"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(139,105,20,0.15))"
                    : "transparent",
                  color: isActive ? "#D4AF37" : "rgba(201,168,76,0.35)",
                  border: isActive ? "1px solid rgba(139,105,20,0.4)" : "1px solid transparent",
                  boxShadow: isActive ? "0 2px 8px rgba(139,105,20,0.1)" : "none",
                  fontFamily: "Georgia, serif",
                }}>
                <span className="text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className="text-[8px] opacity-50 tabular-nums">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Hungry slimes alert */}
        {hungrySlimes.length > 0 && (activeTab === "all" || activeTab === "food") && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2.5 rounded-lg animate-pulse-slow"
            style={{
              background: "linear-gradient(135deg, rgba(192,57,43,0.1), rgba(231,76,60,0.06))",
              border: "1px solid rgba(192,57,43,0.25)",
            }}>
            <span className="text-lg">😿</span>
            <div className="flex-1">
              <p className="text-[11px] font-bold" style={{ color: "#E74C3C", fontFamily: "Georgia, serif" }}>배고픈 슬라임 {hungrySlimes.length}마리!</p>
              <p className="text-[9px]" style={{ color: "rgba(201,168,76,0.4)" }}>먹이를 구매해서 먹여주세요</p>
            </div>
            <button
              onClick={() => setActiveTab("food")}
              className="text-[9px] font-bold px-2.5 py-1 rounded-md"
              style={{
                background: "linear-gradient(135deg, #6B3A2A, #3D2017)",
                color: "#F5E6C8",
                border: "1px solid rgba(192,57,43,0.4)",
                fontFamily: "Georgia, serif",
              }}>
              먹이 보기 →
            </button>
          </div>
        )}

        <div className="space-y-5">
          {/* Buy result modal */}
          {buyResult && (
            <BuyResultCard buyResult={buyResult} onClose={() => setBuyResult(null)} />
          )}

          {/* Food slime selector */}
          {selectingFood && (
            <FoodSlimeSelector
              slimes={slimes}
              species={species}
              selectingFood={selectingFood}
              onSelect={(slimeId) => handleBuy(selectingFood, slimeId)}
              onCancel={() => setSelectingFood(null)}
            />
          )}

          {/* Main content */}
          {!selectingFood && (
            <>
              {/* ===== FEATURED BANNERS (horizontal scroll) ===== */}
              {showEggBanners && (
                <section>
                  <SectionHeader icon="🎰" title="뽑기" subtitle="슬라임을 뽑아보세요!" />

                  {/* Horizontal scrollable featured banners */}
                  <div
                    ref={bannerScrollRef}
                    className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {FEATURED_BANNERS.map((banner, idx) => {
                      const item = shopItems.find((i) => i.id === banner.itemId);
                      return (
                        <FeaturedBannerCard
                          key={banner.itemId}
                          banner={banner}
                          item={item}
                          idx={idx}
                          expanded={expandedBanner === banner.itemId}
                          onToggle={() => setExpandedBanner(expandedBanner === banner.itemId ? null : banner.itemId)}
                          onPull={handleEggPull}
                          canAffordMulti={item ? (qty: number) => canAffordMulti(item, qty) : () => true}
                          pulling={pulling}
                        />
                      );
                    })}
                  </div>

                  {/* Pity counter */}
                  {Object.keys(pity).length > 0 && (
                    <PityCounter pity={pity} />
                  )}

                  {/* Element eggs */}
                  <div className="mt-4">
                    <SectionHeader icon="🌈" title="원소 알" subtitle="원하는 원소를 노려보세요" />
                    <div className="grid grid-cols-2 gap-2.5">
                      {ELEMENT_BANNERS.map((banner, idx) => {
                        const item = shopItems.find((i) => i.id === banner.itemId);
                        return (
                          <ElementEggCard
                            key={banner.itemId}
                            banner={banner}
                            item={item}
                            idx={idx}
                            onPull={handleEggPull}
                            canAffordMulti={item ? (qty: number) => canAffordMulti(item, qty) : () => true}
                            pulling={pulling}
                          />
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* ===== FOOD ITEMS ===== */}
              {(activeTab === "all" || activeTab === "food") && foodItems.length > 0 && (
                <section>
                  <SectionHeader icon="🍖" title="먹이" subtitle="슬라임에게 먹여주세요" />
                  <div className="grid grid-cols-2 gap-2.5">
                    {foodItems.map((item, idx) => (
                      <FoodItemCard
                        key={item.id}
                        item={item}
                        idx={idx}
                        canAfford={canAfford(item)}
                        onBuy={() => handleBuy(item)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ===== BOOSTERS ===== */}
              {(activeTab === "all" || activeTab === "special") && boosterItems.length > 0 && (
                <section>
                  <SectionHeader icon="⚡" title="부스터" subtitle="일정 시간 동안 효과 적용" />
                  <div className="grid grid-cols-2 gap-2.5">
                    {boosterItems.map((item, idx) => (
                      <ShopItemCard key={item.id} item={item} idx={idx} variant="booster" canAfford={canAfford(item)} onBuy={() => handleBuy(item)} />
                    ))}
                  </div>
                </section>
              )}

              {/* ===== DECORATIONS ===== */}
              {(activeTab === "all" || activeTab === "special") && decoItems.length > 0 && (
                <section>
                  <SectionHeader icon="🎀" title="장식" subtitle="마을과 슬라임을 꾸며보세요" />
                  <div className="grid grid-cols-2 gap-2.5">
                    {decoItems.map((item, idx) => (
                      <ShopItemCard key={item.id} item={item} idx={idx} variant="deco" canAfford={canAfford(item)} onBuy={() => handleBuy(item)} />
                    ))}
                  </div>
                </section>
              )}

              {/* ===== OTHER ===== */}
              {otherItems.length > 0 && (
                <section>
                  <SectionHeader icon="📦" title="기타" subtitle="" />
                  <div className="grid grid-cols-2 gap-2.5">
                    {otherItems.map((item, idx) => (
                      <ShopItemCard key={item.id} item={item} idx={idx} variant="default" canAfford={canAfford(item)} onBuy={() => handleBuy(item)} />
                    ))}
                  </div>
                </section>
              )}

              {/* ===== GEM SHOP ===== */}
              {activeTab === "gems" && (
                <GemShopSection token={token} />
              )}

              {/* Empty state */}
              {filteredItems.length === 0 && activeTab !== "gems" && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{
                      background: "linear-gradient(135deg, #3D2017, #2C1810)",
                      border: "2px solid rgba(139,105,20,0.2)",
                    }}>
                    <span className="text-2xl" style={{ opacity: 0.3 }}>{shopItems.length === 0 ? "🏪" : "📦"}</span>
                  </div>
                  <p className="text-sm italic" style={{ color: "rgba(201,168,76,0.3)", fontFamily: "Georgia, serif" }}>
                    {shopItems.length === 0 ? "상점 데이터를 불러오는 중..." : "이 카테고리에 아이템이 없습니다"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom decoration */}
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3))" }} />
            <span className="text-[10px]" style={{ color: "rgba(139,105,20,0.25)" }}>&#9830;</span>
            <div className="w-12 h-px" style={{ background: "linear-gradient(90deg, rgba(139,105,20,0.3), transparent)" }} />
          </div>
        </div>
      </div>

      {gachaResults && (
        <GachaRevealModal results={gachaResults} onClose={() => setGachaResults(null)} />
      )}

      <style jsx>{`
        @keyframes stagger-slide-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes book-shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
        }
        @keyframes shop-result-pop {
          0% { opacity: 0; transform: scale(0.85) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ===== Section Header =====
function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #8B6914, transparent)" }} />
      <span className="text-sm">{icon}</span>
      <span className="text-[10px] tracking-[0.15em] font-bold" style={{
        color: "#C9A84C",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}>{title}</span>
      {subtitle && <span className="text-[8px]" style={{ color: "rgba(201,168,76,0.35)", fontFamily: "Georgia, serif" }}>{subtitle}</span>}
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914)" }} />
    </div>
  );
}

// ===== Featured Banner Card (scrollable) =====
function FeaturedBannerCard({ banner, item, idx, expanded, onToggle, onPull, canAffordMulti, pulling }: {
  banner: EggBanner;
  item?: ShopItem;
  idx: number;
  expanded: boolean;
  onToggle: () => void;
  onPull: (itemId: number, qty: number) => void;
  canAffordMulti: (qty: number) => boolean;
  pulling: boolean;
}) {
  const cost = item?.cost || { gold: 0, gems: 0 };
  const isFree = cost.gold === 0 && cost.gems === 0;

  return (
    <div
      className={`rounded-lg overflow-hidden transition-all snap-center relative ${expanded ? "min-w-full" : "min-w-[280px]"}`}
      style={{
        background: "linear-gradient(160deg, #2C1F15, #1E140D)",
        border: "1.5px solid rgba(139,105,20,0.3)",
        boxShadow: "0 3px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(139,105,20,0.05)",
        animation: `stagger-slide-in 0.3s ease-out ${idx * 80}ms both`,
      }}
    >
      {/* Corner ornaments */}
      <div className="absolute top-0.5 left-0.5 w-3 h-3 pointer-events-none z-10" style={{ opacity: 0.4 }}>
        <div className="absolute top-0 left-0 w-full h-px" style={{ background: "#C9A84C" }} />
        <div className="absolute top-0 left-0 w-px h-full" style={{ background: "#C9A84C" }} />
      </div>
      <div className="absolute top-0.5 right-0.5 w-3 h-3 pointer-events-none z-10" style={{ opacity: 0.4 }}>
        <div className="absolute top-0 right-0 w-full h-px" style={{ background: "#C9A84C" }} />
        <div className="absolute top-0 right-0 w-px h-full" style={{ background: "#C9A84C" }} />
      </div>
      <div className="absolute bottom-0.5 left-0.5 w-3 h-3 pointer-events-none z-10" style={{ opacity: 0.4 }}>
        <div className="absolute bottom-0 left-0 w-full h-px" style={{ background: "#C9A84C" }} />
        <div className="absolute bottom-0 left-0 w-px h-full" style={{ background: "#C9A84C" }} />
      </div>
      <div className="absolute bottom-0.5 right-0.5 w-3 h-3 pointer-events-none z-10" style={{ opacity: 0.4 }}>
        <div className="absolute bottom-0 right-0 w-full h-px" style={{ background: "#C9A84C" }} />
        <div className="absolute bottom-0 right-0 w-px h-full" style={{ background: "#C9A84C" }} />
      </div>

      <button onClick={onToggle} className="w-full text-left px-4 py-3.5 relative">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0 relative"
            style={{
              background: `radial-gradient(circle, ${banner.accentColor}15 0%, transparent 70%)`,
              border: `1px solid rgba(139,105,20,0.2)`,
            }}>
            <img src={`/assets/icons/${banner.icon}`} alt={banner.name}
              className="w-10 h-10 pixel-art drop-shadow-lg" draggable={false} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-bold" style={{
                color: "#F5E6C8",
                fontFamily: "Georgia, 'Times New Roman', serif",
                textShadow: "0 1px 2px rgba(0,0,0,0.4)",
              }}>{banner.name}</h3>
              {banner.tag && (
                <span className="text-[7px] font-black px-1.5 py-0.5 rounded-sm tracking-wider"
                  style={{
                    background: banner.tag === "LEGENDARY"
                      ? "linear-gradient(135deg, #D4AF37, #C9A84C)"
                      : "linear-gradient(135deg, #C9A84C, #8B6914)",
                    color: "#3D2017",
                    border: "1px solid #8B6914",
                  }}>
                  {banner.tag}
                </span>
              )}
            </div>
            <p className="text-[10px]" style={{ color: "rgba(201,168,76,0.5)" }}>{banner.subtitle}</p>
            <div className="flex items-center gap-1 mt-1.5">
              {banner.rates.slice(-3).map((r) => (
                <span key={r.grade} className="text-[8px] font-bold px-1.5 py-0.5 rounded-sm"
                  style={{
                    background: `${gradeColors[r.grade]}15`,
                    color: gradeColors[r.grade],
                    border: `1px solid ${gradeColors[r.grade]}20`,
                  }}>
                  {gradeNames[r.grade]} {r.pct}%
                </span>
              ))}
            </div>
          </div>
          <div className={`w-6 h-6 flex items-center justify-center transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 5L6 8L9 5" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 animate-fade-in-up">
          {/* Full rate table */}
          <div className="rounded-lg p-3 mb-3" style={{
            background: "linear-gradient(135deg, rgba(139,105,20,0.06), rgba(0,0,0,0.15))",
            border: "1px solid rgba(139,105,20,0.15)",
          }}>
            <div className="text-[9px] font-bold mb-2" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>등급별 확률</div>
            <div className="space-y-1.5">
              {banner.rates.map((r) => (
                <div key={r.grade} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold w-14" style={{ color: gradeColors[r.grade] }}>
                    {gradeNames[r.grade]}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(139,105,20,0.1)",
                  }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(2, r.pct)}%`,
                        background: `linear-gradient(90deg, ${gradeColors[r.grade]}, ${gradeColors[r.grade]}88)`,
                        boxShadow: `0 0 6px ${gradeColors[r.grade]}40`,
                      }} />
                  </div>
                  <span className="text-[10px] font-bold w-10 text-right" style={{ color: gradeColors[r.grade] }}>
                    {r.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pull buttons */}
          <div className="flex gap-2">
            {[1, 6, 18].map((qty) => {
              const totalGold = cost.gold * qty;
              const totalGems = cost.gems * qty;
              const affordable = canAffordMulti(qty);
              const isHighlight = qty === 6;
              return (
                <button
                  key={qty}
                  onClick={() => onPull(banner.itemId, qty)}
                  disabled={!affordable || pulling}
                  className="flex-1 rounded-md py-2.5 text-center transition-all active:scale-[0.97] relative overflow-hidden"
                  style={{
                    background: !affordable
                      ? "rgba(44,24,16,0.5)"
                      : isHighlight
                        ? "linear-gradient(135deg, #6B3A2A, #3D2017)"
                        : "linear-gradient(135deg, #3D2017, #2C1810)",
                    border: !affordable
                      ? "1px solid rgba(139,105,20,0.1)"
                      : isHighlight
                        ? "1px solid #C9A84C"
                        : "1px solid rgba(139,105,20,0.3)",
                    boxShadow: isHighlight && affordable
                      ? "0 2px 8px rgba(201,168,76,0.15), inset 0 1px 0 rgba(139,105,20,0.3)"
                      : "none",
                  }}
                >
                  {isHighlight && affordable && (
                    <div className="absolute top-0 right-0 text-[6px] font-black px-1 py-0.5 rounded-bl-md"
                      style={{
                        background: "linear-gradient(135deg, #D4AF37, #C9A84C)",
                        color: "#3D2017",
                      }}>
                      HOT
                    </div>
                  )}
                  <div className="text-[11px] font-bold" style={{
                    color: affordable ? "#F5E6C8" : "rgba(139,105,20,0.3)",
                    fontFamily: "Georgia, serif",
                  }}>
                    {pulling ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="animate-spin text-[10px]">🥚</span>
                      </span>
                    ) : (
                      `${qty}회 뽑기`
                    )}
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: affordable ? "#C9A84C" : "rgba(139,105,20,0.25)" }}>
                    {isFree ? "무료" : totalGold > 0 ? `🪙 ${totalGold.toLocaleString()}` : `💎 ${totalGems.toLocaleString()}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Pity Counter =====
function PityCounter({ pity }: { pity: Record<string, PityEntry> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition"
        style={{
          background: "linear-gradient(160deg, #2C1F15, #1E140D)",
          border: "1px solid rgba(139,105,20,0.2)",
        }}>
        <span className="text-[10px] font-bold flex items-center gap-1.5" style={{
          color: "#C9A84C",
          fontFamily: "Georgia, serif",
        }}>
          🎰 천장 카운터
          <span className="text-[8px] font-normal" style={{ color: "rgba(201,168,76,0.35)" }}>탭하여 보기</span>
        </span>
        <span className={`text-[9px] transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "rgba(201,168,76,0.4)" }}>▼</span>
      </button>
      {open && (
        <div className="mt-1 rounded-lg p-3 space-y-2 animate-fade-in-up"
          style={{
            background: "linear-gradient(160deg, #2C1F15, #1E140D)",
            border: "1px solid rgba(139,105,20,0.15)",
          }}>
          <p className="text-[9px] mb-1 italic" style={{ color: "rgba(201,168,76,0.35)", fontFamily: "Georgia, serif" }}>
            뽑기 횟수에 따라 희귀 슬라임이 보장됩니다
          </p>
          {Object.entries(pity).map(([eggType, p]) => {
            const rareLeft = Math.max(0, p.next_rare - p.count);
            const epicLeft = Math.max(0, p.next_epic - p.count);
            const legendaryLeft = Math.max(0, p.next_legendary - p.count);
            const hasGuarantee = rareLeft === 0 || epicLeft === 0 || legendaryLeft === 0;
            return (
              <div key={eggType} className="rounded-md p-2" style={{
                background: hasGuarantee
                  ? "linear-gradient(135deg, rgba(201,168,76,0.06), rgba(139,105,20,0.04))"
                  : "rgba(26,14,8,0.4)",
                border: hasGuarantee
                  ? "1px solid rgba(201,168,76,0.2)"
                  : "1px solid rgba(139,105,20,0.1)",
              }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold flex items-center gap-1" style={{
                    color: "#F5E6C8",
                    fontFamily: "Georgia, serif",
                  }}>
                    🥚 {eggType.replace(/_/g, " ")}
                    {hasGuarantee && (
                      <span className="text-[7px] font-black px-1 py-px rounded-sm"
                        style={{
                          background: "linear-gradient(135deg, #D4AF37, #C9A84C)",
                          color: "#3D2017",
                        }}>보장</span>
                    )}
                  </span>
                  <span className="text-[10px] font-bold tabular-nums" style={{ color: "#C9A84C" }}>{p.count}회</span>
                </div>
                <div className="flex gap-2">
                  <PityBar label="레어" color="#74B9FF" current={p.count} target={p.next_rare} left={rareLeft} />
                  <PityBar label="에픽" color="#A29BFE" current={p.count} target={p.next_epic} left={epicLeft} />
                  <PityBar label="전설" color="#D4AF37" current={p.count} target={p.next_legendary} left={legendaryLeft} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== Element Egg Card =====
function ElementEggCard({ banner, item, idx, onPull, canAffordMulti, pulling }: {
  banner: EggBanner;
  item?: ShopItem;
  idx: number;
  onPull: (itemId: number, qty: number) => void;
  canAffordMulti: (qty: number) => boolean;
  pulling: boolean;
}) {
  const [showPulls, setShowPulls] = useState(false);
  const cost = item?.cost || { gold: 0, gems: 0 };
  const isFree = cost.gold === 0 && cost.gems === 0;
  const emoji = banner.element ? ELEMENT_EMOJI[banner.element] || "🥚" : "🥚";
  const elColor = banner.element ? elementColors[banner.element] || "#B2BEC3" : "#B2BEC3";
  const elName = banner.element ? elementNames[banner.element] || banner.element : "";

  return (
    <div className="rounded-lg overflow-hidden transition-all relative"
      style={{
        background: "linear-gradient(160deg, #2C1F15, #1E140D)",
        border: "1.5px solid rgba(139,105,20,0.25)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.05)",
        animation: `stagger-slide-in 0.3s ease-out ${idx * 50}ms both`,
      }}>
      {/* Corner ornaments */}
      <div className="absolute top-0.5 left-0.5 w-2.5 h-2.5 pointer-events-none" style={{ opacity: 0.3 }}>
        <div className="absolute top-0 left-0 w-full h-px" style={{ background: "#C9A84C" }} />
        <div className="absolute top-0 left-0 w-px h-full" style={{ background: "#C9A84C" }} />
      </div>
      <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 pointer-events-none" style={{ opacity: 0.3 }}>
        <div className="absolute top-0 right-0 w-full h-px" style={{ background: "#C9A84C" }} />
        <div className="absolute top-0 right-0 w-px h-full" style={{ background: "#C9A84C" }} />
      </div>

      <button onClick={() => setShowPulls(!showPulls)} className="w-full text-left p-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: `radial-gradient(circle, ${elColor}12, transparent 70%)`,
              border: "1px solid rgba(139,105,20,0.2)",
            }}>
            <span className="text-lg">{emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[11px] font-bold truncate" style={{
              color: "#F5E6C8",
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}>{banner.name}</h4>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-sm"
              style={{
                background: `${elColor}12`,
                color: elColor,
                border: `1px solid ${elColor}20`,
              }}>
              {elName} 원소
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {banner.rates.filter(r => r.grade !== "common" && r.grade !== "uncommon").map((r) => (
            <span key={r.grade} className="text-[7px] font-bold px-1 py-0.5 rounded-sm"
              style={{ background: `${gradeColors[r.grade]}12`, color: gradeColors[r.grade] }}>
              {gradeNames[r.grade]} {r.pct}%
            </span>
          ))}
        </div>
      </button>

      {showPulls && (
        <div className="px-3 pb-3 space-y-1.5 animate-fade-in-up">
          {[1, 6, 18].map((qty) => {
            const totalGold = cost.gold * qty;
            const totalGems = cost.gems * qty;
            const affordable = canAffordMulti(qty);
            return (
              <button
                key={qty}
                onClick={() => onPull(banner.itemId, qty)}
                disabled={!affordable || pulling}
                className="w-full flex items-center justify-between rounded-md px-3 py-2 transition-all active:scale-[0.98]"
                style={{
                  background: affordable
                    ? "linear-gradient(135deg, #3D2017, #2C1810)"
                    : "rgba(26,14,8,0.4)",
                  border: `1px solid ${affordable ? "rgba(139,105,20,0.3)" : "rgba(139,105,20,0.1)"}`,
                }}>
                <span className="text-[10px] font-bold" style={{
                  color: affordable ? "#F5E6C8" : "rgba(139,105,20,0.3)",
                  fontFamily: "Georgia, serif",
                }}>
                  {qty}회 뽑기
                </span>
                <span className="text-[9px] font-bold" style={{
                  color: affordable ? "#C9A84C" : "rgba(139,105,20,0.25)",
                }}>
                  {isFree ? "무료" : totalGold > 0 ? `🪙 ${totalGold.toLocaleString()}` : `💎 ${totalGems.toLocaleString()}`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== Food Item Card =====
function FoodItemCard({ item, idx, canAfford, onBuy }: {
  item: ShopItem;
  idx: number;
  canAfford: boolean;
  onBuy: () => void;
}) {
  const isFree = item.cost.gold === 0 && item.cost.gems === 0;

  return (
    <div className="rounded-lg flex flex-col items-center gap-2 p-3.5 relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #2C1F15, #1E140D)",
        border: "1.5px solid rgba(139,105,20,0.25)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.05)",
        animation: `stagger-slide-in 0.3s ease-out ${idx * 50}ms both`,
      }}>
      {/* Corner ornaments */}
      <div className="absolute top-0.5 left-0.5 w-2.5 h-2.5 pointer-events-none" style={{ opacity: 0.3 }}>
        <div className="absolute top-0 left-0 w-full h-px" style={{ background: "#C9A84C" }} />
        <div className="absolute top-0 left-0 w-px h-full" style={{ background: "#C9A84C" }} />
      </div>
      <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 pointer-events-none" style={{ opacity: 0.3 }}>
        <div className="absolute top-0 right-0 w-full h-px" style={{ background: "#C9A84C" }} />
        <div className="absolute top-0 right-0 w-px h-full" style={{ background: "#C9A84C" }} />
      </div>

      <div className="w-14 h-14 rounded-lg flex items-center justify-center"
        style={{
          background: "radial-gradient(circle, rgba(201,168,76,0.08), transparent 70%)",
          border: "1px solid rgba(139,105,20,0.15)",
        }}>
        <img src={`/assets/icons/${item.icon}`} alt={item.name} className="w-10 h-10 pixel-art drop-shadow-md" draggable={false} />
      </div>

      <div className="text-center w-full min-w-0">
        <h4 className="text-[12px] font-bold truncate" style={{
          color: "#F5E6C8",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}>{item.name}</h4>
        <p className="text-[9px] mt-0.5 line-clamp-2 leading-relaxed italic" style={{ color: "rgba(201,168,76,0.4)", fontFamily: "Georgia, serif" }}>{item.description}</p>
      </div>

      <PriceTag item={item} />

      <button onClick={onBuy} disabled={!canAfford}
        className="w-full py-2 rounded-md text-[11px] font-bold transition-all active:scale-[0.97]"
        style={{
          background: canAfford
            ? "linear-gradient(135deg, #6B3A2A, #3D2017)"
            : "rgba(44,24,16,0.5)",
          color: canAfford ? "#F5E6C8" : "rgba(139,105,20,0.3)",
          border: canAfford ? "1px solid #8B6914" : "1px solid rgba(139,105,20,0.1)",
          boxShadow: canAfford ? "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.3)" : "none",
          fontFamily: "Georgia, serif",
        }}>
        {canAfford ? "🍖 먹이 주기" : "재화 부족"}
      </button>
    </div>
  );
}

// ===== Generic Shop Item Card =====
function ShopItemCard({ item, idx, variant, canAfford, onBuy }: {
  item: ShopItem;
  idx: number;
  variant: "booster" | "deco" | "default";
  canAfford: boolean;
  onBuy: () => void;
}) {
  const variantConfig = {
    booster: { icon: "\u26A1", label: "활성화" },
    deco: { icon: "🎀", label: "구매하기" },
    default: { icon: "📦", label: "구매하기" },
  };

  const cfg = variantConfig[variant];

  return (
    <div className="rounded-lg flex flex-col items-center gap-2 p-3.5 relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #2C1F15, #1E140D)",
        border: "1.5px solid rgba(139,105,20,0.25)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.05)",
        animation: `stagger-slide-in 0.3s ease-out ${idx * 50}ms both`,
      }}>
      {/* Corner ornaments */}
      <div className="absolute top-0.5 left-0.5 w-2.5 h-2.5 pointer-events-none" style={{ opacity: 0.3 }}>
        <div className="absolute top-0 left-0 w-full h-px" style={{ background: "#C9A84C" }} />
        <div className="absolute top-0 left-0 w-px h-full" style={{ background: "#C9A84C" }} />
      </div>
      <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 pointer-events-none" style={{ opacity: 0.3 }}>
        <div className="absolute top-0 right-0 w-full h-px" style={{ background: "#C9A84C" }} />
        <div className="absolute top-0 right-0 w-px h-full" style={{ background: "#C9A84C" }} />
      </div>

      <div className="w-14 h-14 rounded-lg flex items-center justify-center"
        style={{
          background: "radial-gradient(circle, rgba(201,168,76,0.08), transparent 70%)",
          border: "1px solid rgba(139,105,20,0.15)",
        }}>
        <img src={`/assets/icons/${item.icon}`} alt={item.name} className="w-10 h-10 pixel-art drop-shadow-md" draggable={false} />
      </div>

      <div className="text-center w-full min-w-0">
        <h4 className="text-[12px] font-bold truncate" style={{
          color: "#F5E6C8",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}>{item.name}</h4>
        <p className="text-[9px] mt-0.5 line-clamp-2 leading-relaxed italic" style={{ color: "rgba(201,168,76,0.4)", fontFamily: "Georgia, serif" }}>{item.description}</p>
      </div>

      <PriceTag item={item} />

      <button onClick={onBuy} disabled={!canAfford}
        className="w-full py-2 rounded-md text-[11px] font-bold transition-all active:scale-[0.97]"
        style={{
          background: canAfford
            ? "linear-gradient(135deg, #6B3A2A, #3D2017)"
            : "rgba(44,24,16,0.5)",
          color: canAfford ? "#F5E6C8" : "rgba(139,105,20,0.3)",
          border: canAfford ? "1px solid #8B6914" : "1px solid rgba(139,105,20,0.1)",
          boxShadow: canAfford ? "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.3)" : "none",
          fontFamily: "Georgia, serif",
        }}>
        {canAfford ? `${cfg.icon} ${cfg.label}` : "재화 부족"}
      </button>
    </div>
  );
}

// ===== Price Tag =====
function PriceTag({ item }: { item: ShopItem }) {
  const isFree = item.cost.gold === 0 && item.cost.gems === 0;

  return (
    <div className="flex items-center gap-1.5">
      {item.cost.gold > 0 && (
        <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-md"
          style={{
            background: "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(139,105,20,0.08))",
            color: "#D4AF37",
            border: "1px solid rgba(139,105,20,0.3)",
            fontFamily: "Georgia, serif",
          }}>
          🪙 {item.cost.gold > 0 ? item.cost.gold.toLocaleString() : "무료"}
        </span>
      )}
      {item.cost.gems > 0 && (
        <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-md"
          style={{
            background: "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(139,105,20,0.08))",
            color: "#C9A84C",
            border: "1px solid rgba(139,105,20,0.3)",
            fontFamily: "Georgia, serif",
          }}>
          💎 {item.cost.gems.toLocaleString()}
        </span>
      )}
      {isFree && (
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-md"
          style={{
            background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(139,105,20,0.1))",
            color: "#D4AF37",
            border: "1px solid rgba(139,105,20,0.35)",
            fontFamily: "Georgia, serif",
          }}>
          무료
        </span>
      )}
    </div>
  );
}

// ===== Pity Bar =====
function PityBar({ label, color, current, target, left }: { label: string; color: string; current: number; target: number; left: number }) {
  const pct = Math.min(100, (current / target) * 100);
  const isClose = left > 0 && left <= 3;
  const isGuaranteed = left === 0;
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[8px] font-bold" style={{ color, fontFamily: "Georgia, serif" }}>{label}</span>
        <span className={`text-[8px] font-bold ${isGuaranteed ? "" : isClose ? "animate-pulse" : ""}`}
          style={{
            color: isGuaranteed ? color : isClose ? "#E74C3C" : "rgba(201,168,76,0.4)",
            fontFamily: "Georgia, serif",
          }}>
          {isGuaranteed ? "보장!" : `${left}회`}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(139,105,20,0.1)",
      }}>
        <div className="h-full rounded-full transition-all duration-500" style={{
          width: `${pct}%`,
          background: isGuaranteed
            ? `linear-gradient(90deg, ${color}, ${color}cc)`
            : isClose
              ? `linear-gradient(90deg, ${color}, #E74C3C)`
              : color,
          boxShadow: isGuaranteed ? `0 0 10px ${color}60` : isClose ? `0 0 6px ${color}40` : "none",
        }} />
      </div>
    </div>
  );
}

// ===== Buy Result Card =====
function BuyResultCard({ buyResult, onClose }: {
  buyResult: {
    type: string;
    slime?: Slime;
    species?: SlimeSpecies;
    foodResult?: { affection: number; hunger: number };
    message?: string;
  };
  onClose: () => void;
}) {
  const isBooster = buyResult.type === "booster";
  return (
    <div className="rounded-lg p-5 relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #3D2D1A, #2A1F14)",
        border: "2px solid #8B6914",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(201,168,76,0.1)",
        animation: "shop-result-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
      }}>
      {/* Corner ornaments */}
      <div className="absolute top-1 left-1 w-4 h-4 pointer-events-none">
        <div className="absolute top-0 left-1 w-3 h-px" style={{ background: "#C9A84C" }} />
        <div className="absolute top-1 left-0 w-px h-3" style={{ background: "#C9A84C" }} />
      </div>
      <div className="absolute top-1 right-1 w-4 h-4 pointer-events-none">
        <div className="absolute top-0 right-1 w-3 h-px" style={{ background: "#C9A84C" }} />
        <div className="absolute top-1 right-0 w-px h-3" style={{ background: "#C9A84C" }} />
      </div>
      <div className="absolute bottom-1 left-1 w-4 h-4 pointer-events-none">
        <div className="absolute bottom-0 left-1 w-3 h-px" style={{ background: "#C9A84C" }} />
        <div className="absolute bottom-1 left-0 w-px h-3" style={{ background: "#C9A84C" }} />
      </div>
      <div className="absolute bottom-1 right-1 w-4 h-4 pointer-events-none">
        <div className="absolute bottom-0 right-1 w-3 h-px" style={{ background: "#C9A84C" }} />
        <div className="absolute bottom-1 right-0 w-px h-3" style={{ background: "#C9A84C" }} />
      </div>

      {buyResult.type === "food" && buyResult.foodResult && (
        <div className="text-center relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg mb-2"
            style={{
              background: "radial-gradient(circle, rgba(201,168,76,0.15), transparent 70%)",
              border: "1px solid rgba(139,105,20,0.2)",
            }}>
            <span className="text-3xl">🍖</span>
          </div>
          <h3 className="font-bold text-sm" style={{
            color: "#F5E6C8",
            fontFamily: "Georgia, 'Times New Roman', serif",
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}>먹이 사용!</h3>
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-md"
              style={{
                background: "linear-gradient(135deg, rgba(201,168,76,0.1), rgba(139,105,20,0.06))",
                color: "#D4AF37",
                border: "1px solid rgba(139,105,20,0.3)",
                fontFamily: "Georgia, serif",
              }}>
              친밀도 +{buyResult.foodResult.affection}
            </span>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-md"
              style={{
                background: "linear-gradient(135deg, rgba(201,168,76,0.1), rgba(139,105,20,0.06))",
                color: "#C9A84C",
                border: "1px solid rgba(139,105,20,0.3)",
                fontFamily: "Georgia, serif",
              }}>
              만복도 +{buyResult.foodResult.hunger}
            </span>
          </div>
        </div>
      )}
      {(buyResult.type === "decoration" || isBooster) && (
        <div className="text-center relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg mb-2"
            style={{
              background: "radial-gradient(circle, rgba(201,168,76,0.15), transparent 70%)",
              border: "1px solid rgba(139,105,20,0.2)",
            }}>
            <span className="text-3xl">{isBooster ? "\u26A1" : "🎀"}</span>
          </div>
          <h3 className="font-bold text-sm" style={{
            color: "#F5E6C8",
            fontFamily: "Georgia, 'Times New Roman', serif",
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}>{buyResult.message || "구매 완료!"}</h3>
        </div>
      )}
      <button onClick={onClose}
        className="w-full py-2.5 text-xs mt-4 active:scale-95 transition-transform relative z-10 rounded-md font-bold"
        style={{
          background: "linear-gradient(135deg, #6B3A2A, #3D2017)",
          color: "#F5E6C8",
          border: "1px solid #8B6914",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.3)",
          fontFamily: "Georgia, serif",
        }}>확인</button>

      <style jsx>{`
        @keyframes shop-result-pop {
          0% { opacity: 0; transform: scale(0.85) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ===== Food Slime Selector =====
function FoodSlimeSelector({ slimes, species, selectingFood, onSelect, onCancel }: {
  slimes: Slime[];
  species: SlimeSpecies[];
  selectingFood: ShopItem;
  onSelect: (slimeId: string) => void;
  onCancel: () => void;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const [buyQty, setBuyQty] = useState(1);
  const [buyingToInv, setBuyingToInv] = useState(false);
  const QTY_OPTIONS = [1, 5, 10, 50, 100];

  const buyToInventory = async () => {
    if (!token || buyingToInv) return;
    setBuyingToInv(true);
    try {
      await authApi<{ item_id: number; quantity: number }>("/api/shop/buy-food", token, {
        method: "POST",
        body: { item_id: selectingFood.id, quantity: buyQty },
      });
      toastSuccess(`${selectingFood.name} ${buyQty}개를 보관함에 저장했습니다!`, "📦");
      useAuthStore.getState().fetchUser();
      useGameStore.getState().fetchFoodInventory(token);
      onCancel();
    } catch {
      toastError("구매에 실패했습니다");
    }
    setBuyingToInv(false);
  };

  // Sort: hungriest first
  const sorted = [...slimes].sort((a, b) => a.hunger - b.hunger);

  return (
    <div className="space-y-3 animate-fade-in-up">
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg"
        style={{
          background: "linear-gradient(160deg, #3D2D1A, #2A1F14)",
          border: "1px solid rgba(139,105,20,0.3)",
        }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{
            background: "radial-gradient(circle, rgba(201,168,76,0.15), transparent 70%)",
          }}>
            <span className="text-sm">🍖</span>
          </div>
          <div>
            <h3 className="text-[11px] font-bold" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>{selectingFood.name}</h3>
            <p className="text-[9px] italic" style={{ color: "rgba(201,168,76,0.4)", fontFamily: "Georgia, serif" }}>먹일 슬라임을 선택하거나 보관함에 저장</p>
          </div>
        </div>
        <button onClick={onCancel}
          className="text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all"
          style={{
            background: "linear-gradient(135deg, rgba(192,57,43,0.15), rgba(192,57,43,0.1))",
            color: "#E74C3C",
            border: "1px solid rgba(192,57,43,0.3)",
            fontFamily: "Georgia, serif",
          }}>
          취소
        </button>
      </div>

      {/* Buy to inventory */}
      <div className="rounded-lg p-3" style={{
        background: "linear-gradient(160deg, #2C1F15, #1E140D)",
        border: "1px solid rgba(139,105,20,0.2)",
      }}>
        <p className="text-[10px] font-bold mb-2" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>보관함에 저장 (나중에 사용)</p>
        <div className="flex items-center gap-2 mb-2">
          {QTY_OPTIONS.map((q) => (
            <button key={q} onClick={() => setBuyQty(q)}
              className="flex-1 py-1.5 rounded-md text-[10px] font-bold transition"
              style={{
                background: buyQty === q
                  ? "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(139,105,20,0.15))"
                  : "rgba(26,14,8,0.4)",
                color: buyQty === q ? "#D4AF37" : "rgba(201,168,76,0.35)",
                border: buyQty === q ? "1px solid rgba(139,105,20,0.4)" : "1px solid rgba(139,105,20,0.1)",
                fontFamily: "Georgia, serif",
              }}>
              {q}개
            </button>
          ))}
        </div>
        <button onClick={buyToInventory} disabled={buyingToInv}
          className="w-full py-2 rounded-md text-[11px] font-bold transition active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #6B3A2A, #3D2017)",
            color: "#F5E6C8",
            border: "1px solid #8B6914",
            boxShadow: "inset 0 1px 0 rgba(139,105,20,0.3)",
            opacity: buyingToInv ? 0.6 : 1,
            fontFamily: "Georgia, serif",
          }}>
          {buyingToInv ? "구매 중..." : `📦 ${buyQty}개 보관함에 저장 (${selectingFood.cost.gold > 0 ? `${(selectingFood.cost.gold * buyQty).toLocaleString()}G` : `${selectingFood.cost.gems * buyQty}💎`})`}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.2))" }} />
        <span className="text-[10px] font-bold" style={{ color: "rgba(201,168,76,0.4)", fontFamily: "Georgia, serif" }}>또는 지금 바로 먹이기</span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(139,105,20,0.2), transparent)" }} />
      </div>

      <div className="space-y-1.5">
        {sorted.map((sl) => {
          const sp = species.find((s) => s.id === sl.species_id);
          const elColor = elementColors[sl.element] || "#B2BEC3";
          const isHungry = sl.hunger < 30;
          return (
            <button key={sl.id} onClick={() => onSelect(sl.id)}
              className="w-full flex items-center gap-3 px-3.5 py-3 text-left rounded-lg transition-all active:scale-[0.98]"
              style={{
                background: isHungry
                  ? "linear-gradient(160deg, rgba(192,57,43,0.08), rgba(44,24,16,0.6))"
                  : "linear-gradient(160deg, #2C1F15, #1E140D)",
                border: isHungry
                  ? "1px solid rgba(192,57,43,0.25)"
                  : "1px solid rgba(139,105,20,0.15)",
              }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: `radial-gradient(circle, ${elColor}12, transparent 70%)`,
                  border: "1px solid rgba(139,105,20,0.15)",
                }}>
                <img src={generateSlimeIconSvg(sl.element, 32, sp?.grade, undefined, sl.species_id)} alt="" className="w-8 h-8" draggable={false} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate" style={{
                  color: "#F5E6C8",
                  fontFamily: "Georgia, serif",
                }}>{sl.name || sp?.name || "???"}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-sm" style={{
                    background: `${elColor}12`,
                    color: elColor,
                    border: `1px solid ${elColor}20`,
                  }}>
                    Lv.{sl.level}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{
                      width: "48px",
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(139,105,20,0.1)",
                    }}>
                      <div className={`h-full rounded-full ${isHungry ? "animate-pulse" : ""}`}
                        style={{
                          width: `${sl.hunger}%`,
                          background: isHungry
                            ? "linear-gradient(90deg, #C0392B, #E74C3C)"
                            : "linear-gradient(90deg, #8B6914, #C9A84C)",
                          boxShadow: isHungry ? "0 0 4px rgba(192,57,43,0.5)" : undefined,
                        }} />
                    </div>
                    <span className={`text-[8px] font-medium`} style={{
                      color: isHungry ? "#E74C3C" : "#C9A84C",
                      fontFamily: "Georgia, serif",
                    }}>
                      {sl.hunger}%
                    </span>
                  </div>
                  {isHungry && (
                    <span className="text-[7px] font-bold animate-pulse" style={{ color: "#E74C3C", fontFamily: "Georgia, serif" }}>배고파!</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-bold" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>선택 →</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== Gem Shop Section =====
// GEM_ICONS removed — using pkg.icon from server

interface CurrencyPkg {
  id: number;
  name: string;
  type: string;
  amount: number;
  price: number;
  bonus: string;
  icon: string;
}

const CURRENCY_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  gem: { label: "보석", color: "#D4AF37", bgColor: "rgba(201,168,76,", borderColor: "rgba(201,168,76," },
  gold: { label: "골드", color: "#FFEAA7", bgColor: "rgba(255,234,167,", borderColor: "rgba(255,234,167," },
  stardust: { label: "별가루", color: "#81ECEC", bgColor: "rgba(129,236,236,", borderColor: "rgba(129,236,236," },
};

function GemShopSection({ token }: { token: string | null }) {
  const [packages, setPackages] = useState<CurrencyPkg[]>([]);
  const [buying, setBuying] = useState<number | null>(null);
  const [currencyTab, setCurrencyTab] = useState<string>("gem");

  useEffect(() => {
    if (!token) return;
    authApi<{ packages: CurrencyPkg[] }>("/api/shop/gems", token)
      .then((res) => setPackages(res.packages || []))
      .catch(() => {});
  }, [token]);

  const buyCurrency = async (pkg: CurrencyPkg) => {
    if (!token || buying) return;
    setBuying(pkg.id);
    try {
      const res = await authApi<{ amount_added: number; type: string; user: { gold: number; gems: number; stardust: number } }>(
        "/api/shop/buy-gems", token, { method: "POST", body: { package_id: pkg.id } }
      );
      const typeLabel = CURRENCY_TYPE_CONFIG[res.type]?.label || "재화";
      toastReward(`${res.amount_added.toLocaleString()} ${typeLabel} 획득!`, pkg.icon || "💎");
      useAuthStore.getState().fetchUser();
    } catch {
      toastError("구매에 실패했습니다");
    }
    setBuying(null);
  };

  const filteredPkgs = packages.filter(p => p.type === currencyTab);

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #8B6914, transparent)" }} />
        <span className="text-sm">💰</span>
        <span className="text-[10px] tracking-[0.15em] font-bold" style={{
          color: "#C9A84C",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}>재화 상점</span>
        <span className="text-[8px]" style={{ color: "rgba(201,168,76,0.35)", fontFamily: "Georgia, serif" }}>테스트 기간 무료 충전!</span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914)" }} />
      </div>

      {/* Currency sub-tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "gem", label: "💎 보석" },
          { id: "gold", label: "🪙 골드" },
          { id: "stardust", label: "✨ 별가루" },
        ].map(t => (
          <button key={t.id} onClick={() => setCurrencyTab(t.id)}
            className="flex-1 py-2 rounded-md text-[11px] font-bold transition-all active:scale-[0.97]"
            style={{
              background: currencyTab === t.id
                ? "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(139,105,20,0.15))"
                : "linear-gradient(160deg, #2C1F15, #1E140D)",
              border: currencyTab === t.id
                ? "1px solid rgba(139,105,20,0.4)"
                : "1px solid rgba(139,105,20,0.15)",
              color: currencyTab === t.id ? "#D4AF37" : "rgba(201,168,76,0.35)",
              fontFamily: "Georgia, serif",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredPkgs.map((pkg, idx) => (
          <button
            key={pkg.id}
            onClick={() => buyCurrency(pkg)}
            disabled={buying !== null}
            className="w-full flex items-center gap-3 p-3.5 rounded-lg transition-all active:scale-[0.98] relative overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #2C1F15, #1E140D)",
              border: "1.5px solid rgba(139,105,20,0.25)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.05)",
              opacity: buying === pkg.id ? 0.6 : 1,
              animation: `stagger-slide-in 0.3s ease-out ${idx * 50}ms both`,
            }}
          >
            {/* Corner ornaments */}
            <div className="absolute top-0.5 left-0.5 w-2.5 h-2.5 pointer-events-none" style={{ opacity: 0.3 }}>
              <div className="absolute top-0 left-0 w-full h-px" style={{ background: "#C9A84C" }} />
              <div className="absolute top-0 left-0 w-px h-full" style={{ background: "#C9A84C" }} />
            </div>
            <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 pointer-events-none" style={{ opacity: 0.3 }}>
              <div className="absolute top-0 right-0 w-full h-px" style={{ background: "#C9A84C" }} />
              <div className="absolute top-0 right-0 w-px h-full" style={{ background: "#C9A84C" }} />
            </div>

            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{
                background: "radial-gradient(circle, rgba(201,168,76,0.12), transparent 70%)",
                border: "1px solid rgba(139,105,20,0.2)",
              }}>
              {pkg.icon}
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-[13px]" style={{
                color: "#F5E6C8",
                fontFamily: "Georgia, 'Times New Roman', serif",
              }}>{pkg.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold" style={{ color: "#C9A84C" }}>
                  {pkg.icon} {pkg.amount.toLocaleString()}개
                </span>
                {pkg.bonus && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-sm font-bold"
                    style={{
                      background: "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(139,105,20,0.08))",
                      color: "#D4AF37",
                      border: "1px solid rgba(139,105,20,0.25)",
                      fontFamily: "Georgia, serif",
                    }}>
                    {pkg.bonus}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1.5 rounded-md text-[11px] font-bold"
                style={{
                  background: "linear-gradient(135deg, #6B3A2A, #3D2017)",
                  color: "#F5E6C8",
                  border: "1px solid #8B6914",
                  boxShadow: "inset 0 1px 0 rgba(139,105,20,0.3)",
                  fontFamily: "Georgia, serif",
                }}>
                {buying === pkg.id ? "구매 중..." : "무료"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
