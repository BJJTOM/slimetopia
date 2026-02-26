"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore, type ShopItem, type SlimeSpecies, type Slime } from "@/lib/store/gameStore";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { elementColors } from "@/lib/constants";
import { authApi } from "@/lib/api/client";
import SeasonBanner from "./SeasonBanner";
import { toastReward, toastSuccess, toastError } from "./Toast";

type ShopTab = "all" | "food" | "special" | "gems";

const TABS: { id: ShopTab; label: string; icon: string }[] = [
  { id: "all", label: "전체", icon: "🏪" },
  { id: "food", label: "먹이", icon: "🍖" },
  { id: "special", label: "특별", icon: "✨" },
  { id: "gems", label: "보석", icon: "💎" },
];

// Booster / decoration color themes
const ITEM_THEMES: Record<string, { gradient: string; glow: string; accent: string }> = {
  "booster_exp": { gradient: "linear-gradient(135deg, rgba(85,239,196,0.08), rgba(0,206,201,0.04))", glow: "rgba(85,239,196,0.2)", accent: "#55EFC4" },
  "booster_gold": { gradient: "linear-gradient(135deg, rgba(255,234,167,0.08), rgba(253,203,110,0.04))", glow: "rgba(255,234,167,0.2)", accent: "#FFEAA7" },
  "booster_luck": { gradient: "linear-gradient(135deg, rgba(162,155,254,0.08), rgba(129,236,236,0.04))", glow: "rgba(162,155,254,0.2)", accent: "#A29BFE" },
  "deco_default": { gradient: "linear-gradient(135deg, rgba(255,159,243,0.08), rgba(162,155,254,0.04))", glow: "rgba(255,159,243,0.2)", accent: "#FF9FF3" },
};

function getItemTheme(item: ShopItem) {
  if (item.type === "booster") {
    const nameKey = item.name_en?.toLowerCase() || "";
    if (nameKey.includes("exp")) return ITEM_THEMES["booster_exp"];
    if (nameKey.includes("gold")) return ITEM_THEMES["booster_gold"];
    return ITEM_THEMES["booster_luck"];
  }
  return ITEM_THEMES["deco_default"];
}

export default function ShopPage() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const { shopItems, slimes, species, fetchShopItems, buyItem } = useGameStore();

  const [activeTab, setActiveTab] = useState<ShopTab>("all");
  const [buyResult, setBuyResult] = useState<{
    type: string;
    slime?: Slime;
    species?: SlimeSpecies;
    foodResult?: { affection: number; hunger: number };
    message?: string;
  } | null>(null);
  const [selectingFood, setSelectingFood] = useState<ShopItem | null>(null);
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    if (token) {
      fetchShopItems(token);
    }
  }, [token, fetchShopItems]);

  const filteredItems = activeTab === "all"
    ? shopItems
    : shopItems.filter((item) => item.category === activeTab);

  const nonEggItems = filteredItems.filter((item) => item.type !== "egg" && item.type !== "multi_egg");
  const foodItems = nonEggItems.filter((item) => item.type === "food");
  const boosterItems = nonEggItems.filter((item) => item.type === "booster");
  const decoItems = nonEggItems.filter((item) => item.type === "decoration");
  const otherItems = nonEggItems.filter((item) => !["food", "booster", "decoration"].includes(item.type));

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

      if (res.type === "food") {
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

  const canAfford = (item: ShopItem) => {
    if (!user) return false;
    if (item.cost.gold > 0 && user.gold < item.cost.gold) return false;
    if (item.cost.gems > 0 && user.gems < item.cost.gems) return false;
    return true;
  };

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
            }}>상점</h1>
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

        <div className="h-px" style={{ background: "linear-gradient(90deg, transparent 5%, #8B6914 30%, #D4AF37 50%, #8B6914 70%, transparent 95%)" }} />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-3 py-3" style={{ background: "linear-gradient(180deg, #1A0E08 0%, #241510 100%)" }}>
        <SeasonBanner />

        {/* Daily Roulette banner */}
        <button
          onClick={() => useGameStore.getState().setShowWheel(true)}
          className="w-full rounded-lg p-3 mb-3 flex items-center gap-3 transition-all active:scale-[0.98] relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #3D2D1A, #2A1F14)",
            border: "1.5px solid rgba(139,105,20,0.3)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.1)",
          }}>
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

        {/* Tab bar */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{
          background: "linear-gradient(160deg, #2C1F15, #1E140D)",
          border: "1px solid rgba(139,105,20,0.15)",
        }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
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
                      <SpecialItemCard key={item.id} item={item} idx={idx} variant="booster" canAfford={canAfford(item)} onBuy={() => handleBuy(item)} />
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
                      <SpecialItemCard key={item.id} item={item} idx={idx} variant="deco" canAfford={canAfford(item)} onBuy={() => handleBuy(item)} />
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
                      <SpecialItemCard key={item.id} item={item} idx={idx} variant="default" canAfford={canAfford(item)} onBuy={() => handleBuy(item)} />
                    ))}
                  </div>
                </section>
              )}

              {/* ===== GEM SHOP ===== */}
              {activeTab === "gems" && (
                <GemShopSection token={token} />
              )}

              {/* Empty state */}
              {nonEggItems.length === 0 && activeTab !== "gems" && (
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

// ===== Food Item Card =====
function FoodItemCard({ item, idx, canAfford, onBuy }: {
  item: ShopItem;
  idx: number;
  canAfford: boolean;
  onBuy: () => void;
}) {
  return (
    <div className="rounded-lg flex flex-col items-center gap-2 p-3.5 relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #2C1F15, #1E140D)",
        border: "1.5px solid rgba(139,105,20,0.25)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.05)",
        animation: `stagger-slide-in 0.3s ease-out ${idx * 50}ms both`,
      }}>
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

// ===== Special Item Card (Boosters / Decorations / Other) — upgraded design =====
function SpecialItemCard({ item, idx, variant, canAfford, onBuy }: {
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
  const theme = getItemTheme(item);

  return (
    <div className="rounded-lg flex flex-col items-center gap-2 p-3.5 relative overflow-hidden"
      style={{
        background: theme.gradient,
        border: `1.5px solid ${theme.glow}`,
        boxShadow: `0 2px 12px rgba(0,0,0,0.25), 0 0 20px ${theme.glow}, inset 0 1px 0 rgba(139,105,20,0.05)`,
        animation: `stagger-slide-in 0.3s ease-out ${idx * 50}ms both`,
      }}>
      {/* Corner ornaments */}
      <div className="absolute top-0.5 left-0.5 w-2.5 h-2.5 pointer-events-none" style={{ opacity: 0.4 }}>
        <div className="absolute top-0 left-0 w-full h-px" style={{ background: theme.accent }} />
        <div className="absolute top-0 left-0 w-px h-full" style={{ background: theme.accent }} />
      </div>
      <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 pointer-events-none" style={{ opacity: 0.4 }}>
        <div className="absolute top-0 right-0 w-full h-px" style={{ background: theme.accent }} />
        <div className="absolute top-0 right-0 w-px h-full" style={{ background: theme.accent }} />
      </div>

      {/* Glow icon bg */}
      <div className="w-14 h-14 rounded-lg flex items-center justify-center relative"
        style={{
          background: `radial-gradient(circle, ${theme.accent}15, transparent 70%)`,
          border: `1px solid ${theme.accent}20`,
        }}>
        <div className="absolute inset-0 rounded-lg" style={{
          boxShadow: `inset 0 0 12px ${theme.accent}10`,
        }} />
        <img src={`/assets/icons/${item.icon}`} alt={item.name} className="w-10 h-10 pixel-art drop-shadow-md relative z-10" draggable={false} />
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
            ? `linear-gradient(135deg, ${theme.accent}30, ${theme.accent}15)`
            : "rgba(44,24,16,0.5)",
          color: canAfford ? "#F5E6C8" : "rgba(139,105,20,0.3)",
          border: canAfford ? `1px solid ${theme.accent}40` : "1px solid rgba(139,105,20,0.1)",
          boxShadow: canAfford ? `0 2px 8px ${theme.accent}15, inset 0 1px 0 ${theme.accent}20` : "none",
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
      {[["top-1 left-1", "top-0 left-1", "top-1 left-0"], ["top-1 right-1", "top-0 right-1", "top-1 right-0"], ["bottom-1 left-1", "bottom-0 left-1", "bottom-1 left-0"], ["bottom-1 right-1", "bottom-0 right-1", "bottom-1 right-0"]].map(([pos, h, v], i) => (
        <div key={i} className={`absolute ${pos} w-4 h-4 pointer-events-none`}>
          <div className={`absolute ${h} w-3 h-px`} style={{ background: "#C9A84C" }} />
          <div className={`absolute ${v} w-px h-3`} style={{ background: "#C9A84C" }} />
        </div>
      ))}

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
      toastSuccess(`${selectingFood.name} ${buyQty}개를 인벤토리에 저장했습니다!`, "📦");
      useAuthStore.getState().fetchUser();
      useGameStore.getState().fetchFoodInventory(token);
      onCancel();
    } catch {
      toastError("구매에 실패했습니다");
    }
    setBuyingToInv(false);
  };

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
            <p className="text-[9px] italic" style={{ color: "rgba(201,168,76,0.4)", fontFamily: "Georgia, serif" }}>먹일 슬라임을 선택하거나 인벤토리에 저장</p>
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
        <p className="text-[10px] font-bold mb-2" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>인벤토리에 저장 (나중에 사용)</p>
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
          {buyingToInv ? "구매 중..." : `📦 ${buyQty}개 인벤토리에 저장 (${selectingFood.cost.gold > 0 ? `${(selectingFood.cost.gold * buyQty).toLocaleString()}G` : `${selectingFood.cost.gems * buyQty}💎`})`}
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
                    <span className="text-[8px] font-medium" style={{
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
interface CurrencyPkg {
  id: number;
  name: string;
  type: string;
  amount: number;
  price: number;
  bonus: string;
  icon: string;
}

const CURRENCY_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  gem: { label: "보석", color: "#D4AF37" },
  gold: { label: "골드", color: "#FFEAA7" },
  stardust: { label: "별가루", color: "#81ECEC" },
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
