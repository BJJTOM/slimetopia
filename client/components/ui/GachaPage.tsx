"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore, type ShopItem } from "@/lib/store/gameStore";
import { gradeColors, gradeNames } from "@/lib/constants";
import { elementColors, elementNames } from "@/lib/constants";
import { authApi } from "@/lib/api/client";
import GachaRevealModal from "./GachaRevealModal";
import { toastError } from "./Toast";

type GachaTab = "all" | "normal" | "premium" | "legendary" | "element";

const TABS: { id: GachaTab; label: string; icon: string }[] = [
  { id: "all", label: "전체", icon: "🥚" },
  { id: "normal", label: "일반", icon: "🟢" },
  { id: "premium", label: "프리미엄", icon: "🟣" },
  { id: "legendary", label: "전설", icon: "🟡" },
  { id: "element", label: "원소", icon: "🌈" },
];

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
  tabGroup: GachaTab;
}

const ALL_BANNERS: EggBanner[] = [
  // Normal
  {
    itemId: 1, name: "슬라임 알", subtitle: "모든 원소 · 전 등급", icon: "egg.png",
    gradient: "linear-gradient(135deg, rgba(85,239,196,0.12) 0%, rgba(116,185,255,0.08) 100%)",
    borderColor: "rgba(85,239,196,0.2)", glowColor: "rgba(85,239,196,0.06)", accentColor: "#55EFC4",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
    tabGroup: "normal",
  },
  // Premium
  {
    itemId: 2, name: "프리미엄 알", subtitle: "레어 이상 확정!", icon: "slime_egg.png",
    gradient: "linear-gradient(135deg, rgba(162,155,254,0.15) 0%, rgba(255,159,243,0.08) 100%)",
    borderColor: "rgba(162,155,254,0.25)", glowColor: "rgba(162,155,254,0.08)", accentColor: "#A29BFE",
    tag: "PREMIUM",
    rates: [{ grade: "rare", pct: 60 }, { grade: "epic", pct: 30 }, { grade: "legendary", pct: 8 }, { grade: "mythic", pct: 2 }],
    tabGroup: "premium",
  },
  // Legendary
  {
    itemId: 6, name: "전설의 알", subtitle: "에픽 이상 확정!", icon: "slime_egg.png",
    gradient: "linear-gradient(135deg, rgba(255,234,167,0.15) 0%, rgba(253,203,110,0.08) 100%)",
    borderColor: "rgba(255,234,167,0.25)", glowColor: "rgba(255,234,167,0.08)", accentColor: "#FFEAA7",
    tag: "LEGENDARY",
    rates: [{ grade: "epic", pct: 50 }, { grade: "legendary", pct: 35 }, { grade: "mythic", pct: 15 }],
    tabGroup: "legendary",
  },
  // Element eggs
  {
    itemId: 5, name: "불꽃 알", subtitle: "불 원소 전용", icon: "egg.png", element: "fire",
    gradient: "linear-gradient(135deg, rgba(255,107,107,0.12) 0%, rgba(253,203,110,0.06) 100%)",
    borderColor: "rgba(255,107,107,0.2)", glowColor: "rgba(255,107,107,0.06)", accentColor: "#FF6B6B",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
    tabGroup: "element",
  },
  {
    itemId: 9, name: "물방울 알", subtitle: "물 원소 전용", icon: "egg.png", element: "water",
    gradient: "linear-gradient(135deg, rgba(116,185,255,0.12) 0%, rgba(129,236,236,0.06) 100%)",
    borderColor: "rgba(116,185,255,0.2)", glowColor: "rgba(116,185,255,0.06)", accentColor: "#74B9FF",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
    tabGroup: "element",
  },
  {
    itemId: 10, name: "풀잎 알", subtitle: "풀 원소 전용", icon: "egg.png", element: "grass",
    gradient: "linear-gradient(135deg, rgba(85,239,196,0.12) 0%, rgba(0,206,201,0.06) 100%)",
    borderColor: "rgba(85,239,196,0.2)", glowColor: "rgba(85,239,196,0.06)", accentColor: "#55EFC4",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
    tabGroup: "element",
  },
  {
    itemId: 20, name: "어둠 알", subtitle: "어둠 원소 전용", icon: "egg.png", element: "dark",
    gradient: "linear-gradient(135deg, rgba(162,155,254,0.12) 0%, rgba(108,92,231,0.06) 100%)",
    borderColor: "rgba(162,155,254,0.2)", glowColor: "rgba(162,155,254,0.06)", accentColor: "#A29BFE",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
    tabGroup: "element",
  },
  {
    itemId: 21, name: "얼음 알", subtitle: "얼음 원소 전용", icon: "egg.png", element: "ice",
    gradient: "linear-gradient(135deg, rgba(129,236,236,0.12) 0%, rgba(116,185,255,0.06) 100%)",
    borderColor: "rgba(129,236,236,0.2)", glowColor: "rgba(129,236,236,0.06)", accentColor: "#81ECEC",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
    tabGroup: "element",
  },
  {
    itemId: 22, name: "번개 알", subtitle: "전기 원소 전용", icon: "egg.png", element: "electric",
    gradient: "linear-gradient(135deg, rgba(253,203,110,0.12) 0%, rgba(255,234,167,0.06) 100%)",
    borderColor: "rgba(253,203,110,0.2)", glowColor: "rgba(253,203,110,0.06)", accentColor: "#FDCB6E",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
    tabGroup: "element",
  },
  {
    itemId: 23, name: "대지 알", subtitle: "대지 원소 전용", icon: "egg.png", element: "earth",
    gradient: "linear-gradient(135deg, rgba(225,112,85,0.12) 0%, rgba(214,162,132,0.06) 100%)",
    borderColor: "rgba(225,112,85,0.2)", glowColor: "rgba(225,112,85,0.06)", accentColor: "#E17055",
    rates: [{ grade: "common", pct: 45 }, { grade: "uncommon", pct: 30 }, { grade: "rare", pct: 15 }, { grade: "epic", pct: 7 }, { grade: "legendary", pct: 2.5 }, { grade: "mythic", pct: 0.5 }],
    tabGroup: "element",
  },
];

const ELEMENT_EMOJI: Record<string, string> = {
  fire: "\uD83D\uDD25", water: "\uD83D\uDCA7", grass: "\uD83C\uDF3F", dark: "\uD83C\uDF11",
  ice: "\u2744\uFE0F", electric: "\u26A1", earth: "\uD83E\uDEA8",
};

interface SlimeResult {
  slime: { id: string; species_id: number; name: string | null; level: number; exp: number; element: string; personality: string; affection: number; hunger: number; condition: number; is_sick: boolean; mood: string };
  species: { id: number; name: string; name_en: string; element: string; grade: string; description: string };
}

const MULTI_PULL_MAP: Record<number, number> = { 1: 17, 2: 18, 6: 19 };

export default function GachaPage() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const { shopItems, fetchShopItems, buyItem } = useGameStore();

  const [activeTab, setActiveTab] = useState<GachaTab>("all");
  const [gachaResults, setGachaResults] = useState<SlimeResult[] | null>(null);
  const [pity, setPity] = useState<Record<string, PityEntry>>({});
  const [expandedBanner, setExpandedBanner] = useState<number | null>(null);
  const [pulling, setPulling] = useState(false);
  const bannerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) fetchShopItems(token);
  }, [token, fetchShopItems]);

  const fetchPity = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authApi<{ pity: Record<string, PityEntry> }>("/api/shop/pity", token);
      setPity(res.pity || {});
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { fetchPity(); }, [fetchPity]);

  const filteredBanners = activeTab === "all"
    ? ALL_BANNERS
    : ALL_BANNERS.filter(b => b.tabGroup === activeTab);

  const handleEggPull = async (itemId: number, quantity: number) => {
    const item = shopItems.find((i) => i.id === itemId);
    if (!item || !token || pulling) return;

    setPulling(true);
    try {
      const res = await buyItem(token, item.id, undefined, quantity);
      if (res) {
        useAuthStore.getState().fetchUser();
        fetchPity();

        if (res.type === "egg") {
          const result = res.result as { slime: SlimeResult["slime"]; species: SlimeResult["species"] };
          setGachaResults([{ slime: result.slime, species: result.species }]);
          useGameStore.getState().setLastPulledSlimeIds([result.slime.id]);
        } else if (res.type === "multi_egg") {
          const result = res.result as { results: SlimeResult[] };
          setGachaResults(result.results);
          useGameStore.getState().setLastPulledSlimeIds(result.results.map(r => r.slime.id));
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "뽑기에 실패했습니다";
      toastError(msg);
    }
    setPulling(false);
  };

  const canAffordMulti = (item: ShopItem, qty: number) => {
    if (!user) return false;
    if (item.cost.gold * qty > user.gold) return false;
    if (item.cost.gems * qty > user.gems) return false;
    return true;
  };

  // Separate featured and element banners
  const featuredBanners = filteredBanners.filter(b => !b.element);
  const elementBanners = filteredBanners.filter(b => !!b.element);

  return (
    <div className="h-full flex flex-col" style={{ background: "#1A0E08" }}>
      {/* Header */}
      <div className="shrink-0 relative"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 0px)",
          background: "linear-gradient(180deg, #4A2515 0%, #3D2017 50%, #2C1810 100%)",
          borderBottom: "3px solid #8B6914",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
        }} />

        <div className="flex items-center gap-3 px-4 py-3 relative z-10">
          <div className="flex items-center gap-2">
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
            }}>뽑기</h1>
          </div>

          {user && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md"
                style={{
                  background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(139,105,20,0.1))",
                  color: "#D4AF37",
                  border: "1px solid rgba(139,105,20,0.4)",
                  fontFamily: "Georgia, serif",
                }}>
                {"\uD83E\uDE99"} {user.gold.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md"
                style={{
                  background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(139,105,20,0.1))",
                  color: "#C9A84C",
                  border: "1px solid rgba(139,105,20,0.4)",
                  fontFamily: "Georgia, serif",
                }}>
                {"\uD83D\uDC8E"} {user.gems.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="h-px" style={{ background: "linear-gradient(90deg, transparent 5%, #8B6914 30%, #D4AF37 50%, #8B6914 70%, transparent 95%)" }} />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-3 py-3" style={{ background: "linear-gradient(180deg, #1A0E08 0%, #241510 100%)" }}>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{
          background: "linear-gradient(160deg, #2C1F15, #1E140D)",
          border: "1px solid rgba(139,105,20,0.15)",
        }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tab.id === "all" ? ALL_BANNERS.length : ALL_BANNERS.filter(b => b.tabGroup === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-[11px] font-bold transition-all"
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
                {count > 0 && <span className="text-[8px] opacity-50 tabular-nums">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Pity counter */}
        {Object.keys(pity).length > 0 && <PityCounter pity={pity} />}

        <div className="space-y-5 mt-3">
          {/* Featured banners */}
          {featuredBanners.length > 0 && (
            <section>
              <SectionHeader icon="🎰" title="뽑기" subtitle="슬라임을 뽑아보세요!" />

              <div
                ref={bannerScrollRef}
                className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none" }}
              >
                {featuredBanners.map((banner, idx) => {
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
                      shopItems={shopItems}
                      canAffordItem={(itemId: number, qty: number) => {
                        const si = shopItems.find(i => i.id === itemId);
                        return si ? canAffordMulti(si, qty) : false;
                      }}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Element banners */}
          {elementBanners.length > 0 && (
            <section>
              <SectionHeader icon="🌈" title="원소 알" subtitle="원하는 원소를 노려보세요" />
              <div className="grid grid-cols-2 gap-2.5">
                {elementBanners.map((banner, idx) => {
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
            </section>
          )}
        </div>

        {/* Bottom deco */}
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

// ===== Featured Banner Card =====
function FeaturedBannerCard({ banner, item, idx, expanded, onToggle, onPull, canAffordMulti, pulling, shopItems, canAffordItem }: {
  banner: EggBanner;
  item?: ShopItem;
  idx: number;
  expanded: boolean;
  onToggle: () => void;
  onPull: (itemId: number, qty: number) => void;
  canAffordMulti: (qty: number) => boolean;
  pulling: boolean;
  shopItems: ShopItem[];
  canAffordItem: (itemId: number, qty: number) => boolean;
}) {
  const cost = item?.cost || { gold: 0, gems: 0 };
  const isFree = cost.gold === 0 && cost.gems === 0;
  const priceLabel = isFree ? "무료" : cost.gold > 0 ? `\uD83E\uDE99 ${cost.gold.toLocaleString()}` : `\uD83D\uDC8E ${cost.gems.toLocaleString()}`;
  const multiItemId = MULTI_PULL_MAP[banner.itemId];

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
      {[["top-0.5 left-0.5", "top-0 left-0"], ["top-0.5 right-0.5", "top-0 right-0"], ["bottom-0.5 left-0.5", "bottom-0 left-0"], ["bottom-0.5 right-0.5", "bottom-0 right-0"]].map(([pos, inner], i) => (
        <div key={i} className={`absolute ${pos} w-3 h-3 pointer-events-none z-10`} style={{ opacity: 0.4 }}>
          <div className={`absolute ${inner.split(" ")[0]} ${inner.split(" ")[1]} w-full h-px`} style={{ background: "#C9A84C" }} />
          <div className={`absolute ${inner.split(" ")[0]} ${inner.split(" ")[1]} w-px h-full`} style={{ background: "#C9A84C" }} />
        </div>
      ))}

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
            {/* Probability badges */}
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {banner.rates.map((r) => (
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
          <div className="flex items-center gap-1.5 shrink-0">
            {!expanded && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{
                background: "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(139,105,20,0.08))",
                color: "#D4AF37",
                border: "1px solid rgba(139,105,20,0.3)",
                fontFamily: "Georgia, serif",
              }}>{priceLabel}</span>
            )}
            <div className={`w-6 h-6 flex items-center justify-center transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 5L6 8L9 5" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
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
                        <span className="animate-spin text-[10px]">{"\uD83E\uDD5A"}</span>
                      </span>
                    ) : !affordable && !pulling ? (
                      <span>{qty}회 <span style={{ color: "#E74C3C", fontSize: "9px" }}>부족</span></span>
                    ) : (
                      `${qty}회 뽑기`
                    )}
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: affordable ? "#C9A84C" : "rgba(139,105,20,0.25)" }}>
                    {isFree ? "무료" : totalGold > 0 ? `\uD83E\uDE99 ${totalGold.toLocaleString()}` : `\uD83D\uDC8E ${totalGems.toLocaleString()}`}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 10x Multi-pull button */}
          {multiItemId && (() => {
            const multiItem = shopItems.find(i => i.id === multiItemId);
            if (!multiItem) return null;
            const multiCost = multiItem.cost;
            const multiAffordable = canAffordItem(multiItemId, 1);
            const multiIsFree = multiCost.gold === 0 && multiCost.gems === 0;
            return (
              <button
                onClick={() => onPull(multiItemId, 1)}
                disabled={!multiAffordable || pulling}
                className="w-full mt-2 rounded-md py-2.5 text-center transition-all active:scale-[0.97] relative overflow-hidden"
                style={{
                  background: multiAffordable
                    ? "linear-gradient(135deg, #4A2515, #3D2017)"
                    : "rgba(44,24,16,0.5)",
                  border: multiAffordable
                    ? "1.5px solid #C9A84C"
                    : "1px solid rgba(139,105,20,0.1)",
                  boxShadow: multiAffordable
                    ? "0 2px 12px rgba(201,168,76,0.15), inset 0 1px 0 rgba(139,105,20,0.2)"
                    : "none",
                }}
              >
                <div className="absolute top-0 right-0 text-[7px] font-black px-1.5 py-0.5 rounded-bl-md"
                  style={{
                    background: "linear-gradient(135deg, #55EFC4, #00B894)",
                    color: "#1A0E08",
                  }}>
                  -10%
                </div>
                <div className="text-[11px] font-bold" style={{
                  color: multiAffordable ? "#F5E6C8" : "rgba(139,105,20,0.3)",
                  fontFamily: "Georgia, serif",
                }}>
                  {pulling ? (
                    <span className="animate-spin text-[10px]">{"\uD83E\uDD5A"}</span>
                  ) : !multiAffordable && !pulling ? (
                    <span>10회 뽑기 <span style={{ color: "#E74C3C", fontSize: "9px" }}>부족</span></span>
                  ) : (
                    "10회 뽑기"
                  )}
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: multiAffordable ? "#C9A84C" : "rgba(139,105,20,0.25)" }}>
                  {multiIsFree ? "무료" : multiCost.gold > 0 ? `\uD83E\uDE99 ${multiCost.gold.toLocaleString()}` : `\uD83D\uDC8E ${multiCost.gems.toLocaleString()}`}
                </div>
              </button>
            );
          })()}
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
  const emoji = banner.element ? ELEMENT_EMOJI[banner.element] || "\uD83E\uDD5A" : "\uD83E\uDD5A";
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
          {!canAffordMulti(1) && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-sm shrink-0" style={{ color: "#E74C3C", background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.2)" }}>부족</span>
          )}
        </div>
        {/* Probability badges */}
        <div className="flex items-center gap-1 flex-wrap">
          {banner.rates.map((r) => (
            <span key={r.grade} className="text-[7px] font-bold px-1 py-0.5 rounded-sm"
              style={{ background: `${gradeColors[r.grade]}12`, color: gradeColors[r.grade] }}>
              {gradeNames[r.grade]} {r.pct}%
            </span>
          ))}
        </div>
        {/* Price badge */}
        <div className="mt-1.5">
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-sm" style={{
            background: "linear-gradient(135deg, rgba(201,168,76,0.1), rgba(139,105,20,0.06))",
            color: "#D4AF37",
            border: "1px solid rgba(139,105,20,0.2)",
            fontFamily: "Georgia, serif",
          }}>
            {isFree ? "무료" : cost.gold > 0 ? `\uD83E\uDE99 ${cost.gold.toLocaleString()}` : `\uD83D\uDC8E ${cost.gems.toLocaleString()}`}
          </span>
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
                  {!affordable && !pulling ? (
                    <span>{qty}회 <span style={{ color: "#E74C3C", fontSize: "9px" }}>부족</span></span>
                  ) : (
                    `${qty}회 뽑기`
                  )}
                </span>
                <span className="text-[9px] font-bold" style={{
                  color: affordable ? "#C9A84C" : "rgba(139,105,20,0.25)",
                }}>
                  {isFree ? "무료" : totalGold > 0 ? `\uD83E\uDE99 ${totalGold.toLocaleString()}` : `\uD83D\uDC8E ${totalGems.toLocaleString()}`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== Pity Counter =====
function PityCounter({ pity }: { pity: Record<string, PityEntry> }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
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
          {"\uD83C\uDFB0"} 천장 카운터
          <span className="text-[8px] font-normal" style={{ color: "rgba(201,168,76,0.35)" }}>탭하여 보기</span>
        </span>
        <span className={`text-[9px] transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "rgba(201,168,76,0.4)" }}>{"\u25BC"}</span>
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
                    {"\uD83E\uDD5A"} {eggType.replace(/_/g, " ")}
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
