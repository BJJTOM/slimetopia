"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore, type Slime, type SlimeSpecies, type CraftingRecipe } from "@/lib/store/gameStore";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { elementColors, elementNames, gradeColors, gradeNames } from "@/lib/constants";
import { authApi } from "@/lib/api/client";
import { toastSuccess } from "@/components/ui/Toast";

const rarityColors: Record<string, string> = {
  common: "#B2BEC3",
  uncommon: "#55EFC4",
  rare: "#74B9FF",
  epic: "#A29BFE",
  legendary: "#FFEAA7",
};

type MergeTab = "manual" | "batch" | "craft";

function getEffectDescription(effects?: {
  element_boost?: { element: string; chance: number };
  grade_boost?: number;
  mutation_boost?: number;
  mutation_target?: number;
  great_success?: number;
}): string | null {
  if (!effects || Object.keys(effects).length === 0) return null;
  const parts: string[] = [];
  if (effects.element_boost) {
    const elName = elementNames[effects.element_boost.element] || effects.element_boost.element;
    parts.push(`${elName} 원소 확률 UP`);
  }
  if (effects.grade_boost) parts.push("등급 업그레이드 확률 UP");
  if (effects.mutation_boost) parts.push("돌연변이 확률 UP");
  if (effects.great_success) parts.push("대성공 확률 UP");
  return parts.length > 0 ? parts.join(" · ") : null;
}

interface BatchMergeResult {
  inputA: string;
  inputB: string;
  resultName: string;
  resultGrade: string;
  success: boolean;
  error?: string;
}

export default function MergePage() {
  const token = useAuthStore((s) => s.accessToken);
  const {
    slimes,
    species,
    mergeSlotA,
    mergeSlotB,
    setMergeSlot,
    mergeSlimes,
    recipes,
    fetchRecipes,
    materialDefs,
    materialInventory,
    synthesisMaterialId,
    setSynthesisMaterial,
    fetchMaterialDefs,
    fetchMaterialInventory,
    fetchSlimes,
    craftingRecipes,
    fetchCraftingRecipes,
    craftItem,
    equippedAccessories,
  } = useGameStore();

  const [tab, setTab] = useState<MergeTab>("manual");
  const [mergeError, setMergeError] = useState<string | null>(null);

  useEffect(() => {
    if (token && recipes.length === 0) {
      fetchRecipes(token);
    }
  }, [token, recipes.length, fetchRecipes]);

  useEffect(() => {
    if (token && materialDefs.length === 0) fetchMaterialDefs(token);
    if (token && materialInventory.length === 0) fetchMaterialInventory(token);
  }, [token, materialDefs.length, materialInventory.length, fetchMaterialDefs, fetchMaterialInventory]);

  useEffect(() => {
    if (token && tab === "craft" && craftingRecipes.length === 0) {
      fetchCraftingRecipes(token);
    }
  }, [token, tab, craftingRecipes.length, fetchCraftingRecipes]);

  const slimeA = slimes.find((s) => s.id === mergeSlotA);
  const slimeB = slimes.find((s) => s.id === mergeSlotB);
  const canMerge = mergeSlotA && mergeSlotB && mergeSlotA !== mergeSlotB;

  const getSpeciesName = (speciesId: number) =>
    species.find((s) => s.id === speciesId)?.name || "???";

  const koreanErrorMap: Record<string, string> = {
    // 입력 검증
    "slime_id_a and slime_id_b required": "합성할 슬라임 2마리를 선택해 주세요 🧪",
    "two different slime IDs required": "서로 다른 슬라임 2마리를 선택해야 합니다 ⚠️",
    // 슬라임 조회
    "slime A not found": "첫 번째 슬라임을 찾을 수 없습니다 (삭제되었거나 탐험 중일 수 있어요)",
    "slime B not found": "두 번째 슬라임을 찾을 수 없습니다 (삭제되었거나 탐험 중일 수 있어요)",
    // 소유권
    "not your slimes": "본인 소유의 슬라임만 합성할 수 있어요 🔒",
    // 재료
    "material not found": "선택한 합성 재료가 존재하지 않아요",
    "insufficient material": "합성 재료가 부족해요! 탐험에서 재료를 더 모아보세요 ⛏️",
    // 합성 실패
    "merge failed": "서버 오류로 합성에 실패했어요. 잠시 후 다시 시도해 주세요 😢",
    "failed to create result slime": "결과 슬라임 생성 중 오류가 발생했어요. 다시 시도해 주세요",
    // 합성 엔진 오류
    "already at maximum grade": "이미 최고 등급(신화)이라 더 이상 등급 합성을 할 수 없어요 ✨",
    "no valid merge: same species for upgrade or valid recipe for combination required":
      "이 조합으로는 합성할 수 없어요!\n💡 같은 종 합성 = 등급 업그레이드\n💡 다른 종 합성 = 레시피 필요",
    // 구버전 호환
    "no valid recipe": "이 조합에 맞는 레시피가 없어요. 레시피북을 확인해 보세요 📖",
    "same species required for grade merge": "같은 종의 슬라임끼리만 등급 합성이 가능해요",
    "already max grade": "이미 최고 등급이에요 ✨",
  };

  const handleMerge = async () => {
    if (!token || !canMerge) return;
    setMergeError(null);
    try {
      await mergeSlimes(token);
    } catch (e: unknown) {
      const apiMsg = (e as { data?: { error?: string; message?: string } })?.data?.error
        || (e as { data?: { error?: string; message?: string } })?.data?.message;
      const rawMsg = apiMsg || (e instanceof Error ? e.message : "");
      // Try exact match first, then partial match for long error messages
      const translated = koreanErrorMap[rawMsg]
        || Object.entries(koreanErrorMap).find(([key]) => rawMsg.includes(key))?.[1]
        || (rawMsg ? `합성 실패: ${rawMsg}` : "알 수 없는 오류가 발생했어요. 다시 시도해 주세요 😢");
      setMergeError(translated);
    }
  };

  return (
    <div className="h-full flex flex-col animate-page-enter" style={{ background: "#1A0E08" }}>
      {/* Book spine header — leather with gold lettering */}
      <div className="shrink-0 relative"
        style={{
          background: "linear-gradient(180deg, #4A2515 0%, #3D2017 50%, #2C1810 100%)",
          borderBottom: "3px solid #8B6914",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}>
        {/* Leather texture overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
        }} />

        <div className="flex items-center gap-2.5 px-4 py-3 relative z-10">
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
          }}>합성</h1>

          {/* Chapter tabs — leather tab switcher */}
          <div className="flex gap-1 ml-auto">
            {([
              { key: "manual" as MergeTab, label: "수동" },
              { key: "batch" as MergeTab, label: "일괄 합성" },
              { key: "craft" as MergeTab, label: "제작" },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all active:scale-95"
                style={{
                  background: tab === t.key
                    ? "linear-gradient(135deg, #C9A84C, #8B6914)"
                    : "linear-gradient(135deg, rgba(90,53,34,0.6), rgba(61,32,23,0.6))",
                  color: tab === t.key ? "#3D2017" : "#C9A84C",
                  border: tab === t.key
                    ? "1px solid #D4AF37"
                    : "1px solid rgba(139,105,20,0.3)",
                  boxShadow: tab === t.key
                    ? "0 2px 6px rgba(201,168,76,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
                    : "none",
                  fontFamily: "Georgia, serif",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gold trim line */}
        <div className="h-px" style={{ background: "linear-gradient(90deg, transparent 5%, #8B6914 30%, #D4AF37 50%, #8B6914 70%, transparent 95%)" }} />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto game-scroll" style={{ background: "linear-gradient(180deg, #1A0E08 0%, #241510 100%)" }}>
        {tab === "craft" ? (
          <CraftingTab
            token={token}
            craftingRecipes={craftingRecipes}
            materialDefs={materialDefs}
            materialInventory={materialInventory}
            craftItem={craftItem}
          />
        ) : tab === "manual" ? (
          <ManualMergeTab
            slimeA={slimeA}
            slimeB={slimeB}
            canMerge={!!canMerge}
            getSpeciesName={getSpeciesName}
            setMergeSlot={setMergeSlot}
            handleMerge={handleMerge}
            mergeError={mergeError}
            setMergeError={setMergeError}
            slimes={slimes}
            species={species}
            mergeSlotA={mergeSlotA}
            mergeSlotB={mergeSlotB}
            materialDefs={materialDefs}
            materialInventory={materialInventory}
            synthesisMaterialId={synthesisMaterialId}
            setSynthesisMaterial={setSynthesisMaterial}
            recipes={recipes}
          />
        ) : (
          <BatchMergeTab
            token={token}
            slimes={slimes}
            species={species}
            fetchSlimes={fetchSlimes}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes book-shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
        }
        @keyframes merge-glow-pulse {
          0%, 100% { box-shadow: 0 0 12px rgba(201,168,76,0.2); }
          50% { box-shadow: 0 0 24px rgba(201,168,76,0.4); }
        }
        @keyframes merge-heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes stagger-slide-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes batch-result-fade-in {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sparkle-shine {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
      `}</style>
    </div>
  );
}

// ─── Manual Merge Tab ────────────────────────────────────────────────────────

function ManualMergeTab({
  slimeA,
  slimeB,
  canMerge,
  getSpeciesName,
  setMergeSlot,
  handleMerge,
  mergeError,
  setMergeError,
  slimes,
  species,
  mergeSlotA,
  mergeSlotB,
  materialDefs,
  materialInventory,
  synthesisMaterialId,
  setSynthesisMaterial,
  recipes,
}: {
  slimeA: Slime | undefined;
  slimeB: Slime | undefined;
  canMerge: boolean;
  getSpeciesName: (id: number) => string;
  setMergeSlot: (slot: "A" | "B", id: string | null) => void;
  handleMerge: () => void;
  mergeError: string | null;
  setMergeError: (error: string | null) => void;
  slimes: Slime[];
  species: SlimeSpecies[];
  mergeSlotA: string | null;
  mergeSlotB: string | null;
  materialDefs: ReturnType<typeof useGameStore.getState>["materialDefs"];
  materialInventory: ReturnType<typeof useGameStore.getState>["materialInventory"];
  synthesisMaterialId: number | null;
  setSynthesisMaterial: (id: number | null) => void;
  recipes: ReturnType<typeof useGameStore.getState>["recipes"];
}) {
  const [recipePage, setRecipePage] = useState(0);

  return (
    <>
      {/* Parchment merge area */}
      <div className="mx-3 mt-3 rounded-lg relative"
        style={{
          background: "linear-gradient(170deg, #F5E6C8 0%, #E8D5B0 40%, #DCC9A3 100%)",
          boxShadow: "4px 4px 12px rgba(0,0,0,0.4), -1px -1px 4px rgba(0,0,0,0.1), inset 0 0 40px rgba(139,105,20,0.08)",
          border: "1px solid #C9A84C",
        }}>
        {/* Page corner fold decoration */}
        <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden rounded-bl-lg" style={{ zIndex: 2 }}>
          <div className="absolute -top-4 -right-4 w-8 h-8 rotate-45"
            style={{ background: "linear-gradient(135deg, #D4C4A8, #C9B896)", boxShadow: "-1px 1px 2px rgba(0,0,0,0.15)" }} />
        </div>

        {/* Ornamental top border */}
        <div className="flex items-center justify-center py-3 px-6" style={{ borderBottom: "1px solid rgba(139,105,20,0.2)" }}>
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914, transparent)" }} />
            <span className="text-[9px] tracking-[0.2em] font-bold" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>
              SYNTHESIS CHAMBER
            </span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914, transparent)" }} />
          </div>
        </div>

        {/* Guide text */}
        <div className="text-center pt-3 pb-2 px-5">
          <p className="text-[11px] font-medium italic" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>
            {!slimeA ? "아래에서 첫 번째 슬라임을 선택하세요" :
             !slimeB ? "두 번째 슬라임을 선택하세요" :
             "준비 완료! 합성 버튼을 눌러주세요"}
          </p>
        </div>

        {/* Merge Slots — Specimen placement areas on parchment */}
        <div className="relative px-5 pb-4">
          <div className="rounded-lg p-4" style={{
            background: "linear-gradient(135deg, rgba(139,105,20,0.06), rgba(107,58,42,0.04))",
            border: canMerge ? "2px solid #C9A84C" : "1px dashed rgba(139,105,20,0.3)",
            boxShadow: canMerge ? "0 0 16px rgba(201,168,76,0.15), inset 0 0 12px rgba(201,168,76,0.05)" : "none",
          }}>
            <div className="flex items-center justify-center gap-3">
              <MergeSlot
                slime={slimeA}
                label="A"
                getSpeciesName={getSpeciesName}
                onClear={() => setMergeSlot("A", null)}
              />

              {/* Center merge icon — alchemical symbol */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-6 h-[2px] rounded-full" style={{
                  background: slimeA ? "linear-gradient(90deg, transparent, #C9A84C)" : "rgba(139,105,20,0.15)",
                }} />
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all`} style={{
                  background: canMerge
                    ? "radial-gradient(circle at 40% 35%, #4A2515, #2C1810)"
                    : "rgba(107,58,42,0.06)",
                  border: canMerge ? "2px solid #C9A84C" : "2px dashed rgba(139,105,20,0.2)",
                  boxShadow: canMerge ? "0 0 20px rgba(201,168,76,0.2), inset 0 0 10px rgba(0,0,0,0.2)" : "none",
                  animation: canMerge ? "merge-glow-pulse 2s ease-in-out infinite" : "none",
                }}>
                  <span className="text-xl font-black" style={{
                    color: canMerge ? "#D4AF37" : "rgba(139,105,20,0.3)",
                    fontFamily: "Georgia, serif",
                    textShadow: canMerge ? "0 0 8px rgba(212,175,55,0.4)" : "none",
                  }}>{canMerge ? "\u2697" : "+"}</span>
                </div>
                <div className="w-6 h-[2px] rounded-full" style={{
                  background: slimeB ? "linear-gradient(90deg, #C9A84C, transparent)" : "rgba(139,105,20,0.15)",
                }} />
              </div>

              <MergeSlot
                slime={slimeB}
                label="B"
                getSpeciesName={getSpeciesName}
                onClear={() => setMergeSlot("B", null)}
              />
            </div>

            {/* Result preview area */}
            {slimeA && slimeB && (
              <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(139,105,20,0.2)" }}>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3))" }} />
                  <span className="text-[10px]" style={{ color: "#8B6914" }}>{"\u25BC"}</span>
                  <div className="w-5 h-px" style={{ background: "linear-gradient(90deg, rgba(139,105,20,0.3), transparent)" }} />
                </div>
                <div className="mt-2 flex items-center justify-center">
                  <div className="px-4 py-2.5 rounded-lg text-center" style={{
                    background: "rgba(139,105,20,0.06)",
                    border: "1px dashed rgba(139,105,20,0.25)",
                  }}>
                    <span className="text-lg" style={{ color: "#8B6914" }}>?</span>
                    <p className="text-[10px] font-medium mt-1" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>
                      {slimeA.species_id === slimeB.species_id
                        ? "같은 종 합성 \u2192 등급 UP"
                        : "이종 합성 \u2192 새 슬라임!"}
                      {synthesisMaterialId && " \u2726 재료 보너스"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Material Slot — on parchment */}
        <div className="mx-5 mb-4 p-3 rounded-lg" style={{
          background: "rgba(139,105,20,0.06)",
          border: "1px solid rgba(139,105,20,0.2)",
        }}>
          <p className="text-[10px] font-bold mb-2" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>
            {"\uD83E\uDDEA"} 첨가 재료 (선택)
          </p>
          {synthesisMaterialId ? (() => {
            const mat = materialDefs.find(m => m.id === synthesisMaterialId);
            const inv = materialInventory.find(m => m.material_id === synthesisMaterialId);
            if (!mat) return null;
            const color = rarityColors[mat.rarity] || "#B2BEC3";
            const effectDesc = getEffectDescription(mat.effects);
            return (
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{
                    background: "rgba(139,105,20,0.08)",
                    border: "1px solid rgba(139,105,20,0.2)",
                  }}>
                    {mat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium truncate block" style={{ color: "#2C1810", fontFamily: "Georgia, serif" }}>{mat.name}</span>
                    <span className="text-[9px]" style={{ color }}>{inv ? `x${inv.quantity}` : "x0"}</span>
                  </div>
                  <button onClick={() => setSynthesisMaterial(null)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, #5A3522, #3D2017)",
                      color: "#C9A84C",
                      border: "1px solid rgba(139,105,20,0.3)",
                    }}>
                    {"\u2715"}
                  </button>
                </div>
                {effectDesc && (
                  <div className="mt-2 px-2 py-1.5 rounded-md" style={{
                    background: "rgba(139,105,20,0.06)",
                    border: "1px solid rgba(139,105,20,0.15)",
                  }}>
                    <p className="text-[9px]" style={{ color: "#6B3A2A" }}>{effectDesc}</p>
                  </div>
                )}
              </div>
            );
          })() : (
            <p className="text-[10px] italic" style={{ color: "rgba(107,58,42,0.5)", fontFamily: "Georgia, serif" }}>
              재료를 첨가하면 합성 효과가 강화됩니다
            </p>
          )}
        </div>

        {/* Error message — warm brown/gold */}
        {mergeError && (
          <div className="mx-5 mb-4 p-3 rounded-lg flex items-center gap-2.5" style={{
            background: "linear-gradient(135deg, rgba(139,69,19,0.15), rgba(139,69,19,0.08))",
            border: "1px solid rgba(139,105,20,0.4)",
            boxShadow: "0 2px 8px rgba(139,69,19,0.15)",
          }}>
            <span className="text-lg shrink-0" style={{ color: "#C9A84C" }}>{"\u26A0"}</span>
            <p className="text-[11px] font-bold flex-1" style={{ color: "#8B6914", fontFamily: "Georgia, serif" }}>{mergeError}</p>
            <button onClick={() => setMergeError(null)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] shrink-0 transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #5A3522, #3D2017)",
                color: "#C9A84C",
                border: "1px solid rgba(139,105,20,0.3)",
              }}>
              {"\u2715"}
            </button>
          </div>
        )}

        {/* Merge button — wax seal style */}
        <div className="px-5 pb-4">
          <button
            onClick={handleMerge}
            disabled={!canMerge}
            className="w-full py-3.5 text-sm font-bold rounded-lg transition-all active:scale-95"
            style={{
              background: canMerge
                ? synthesisMaterialId
                  ? "radial-gradient(circle at 50% 40%, #8B3A3A, #6B2020)"
                  : "radial-gradient(circle at 50% 40%, #7A3015, #5A2010)"
                : "rgba(107,58,42,0.15)",
              color: canMerge ? "#F5E6C8" : "rgba(107,58,42,0.4)",
              border: canMerge
                ? "2px solid #C9A84C"
                : "1px solid rgba(139,105,20,0.15)",
              boxShadow: canMerge
                ? "0 4px 16px rgba(139,69,19,0.4), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 20px rgba(201,168,76,0.15)"
                : "none",
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: canMerge ? "0 1px 2px rgba(0,0,0,0.5)" : "none",
              letterSpacing: "0.05em",
              animation: canMerge ? "merge-heartbeat 2s ease-in-out infinite" : "none",
            }}
          >
            {!slimeA || !slimeB
              ? "슬라임 2마리를 선택하세요"
              : synthesisMaterialId ? "\uD83E\uDDEA 전략 합성하기!" : "\u2728 합성하기!"}
          </button>
        </div>

        {/* Bottom page decoration */}
        <div className="flex items-center justify-center py-2 px-6" style={{ borderTop: "1px solid rgba(139,105,20,0.15)" }}>
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3), transparent)" }} />
            <span className="text-[8px]" style={{ color: "#8B6914", fontFamily: "Georgia, serif" }}>&#9830;</span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3), transparent)" }} />
          </div>
        </div>
      </div>

      {/* Material Inventory — dark leather cards */}
      {materialInventory.length > 0 && (
        <div className="mx-3 mt-3">
          {/* Section divider */}
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #8B6914, transparent)" }} />
            <span className="text-[9px] tracking-[0.15em] font-bold" style={{ color: "#8B6914", fontFamily: "Georgia, serif" }}>
              REAGENTS
            </span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914)" }} />
          </div>

          <p className="text-[11px] px-1 mb-2 font-medium" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>
            {"\uD83E\uDDEA"} 재료 인벤토리
            <span className="text-[9px] ml-1.5" style={{ color: "#8B6914" }}>
              {materialInventory.length}종
            </span>
          </p>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {materialInventory.map((inv) => {
              const mat = materialDefs.find(m => m.id === inv.material_id);
              if (!mat) return null;
              const isSelected = synthesisMaterialId === mat.id;
              const color = rarityColors[mat.rarity] || "#B2BEC3";
              const effectDesc = getEffectDescription(mat.effects);
              return (
                <button
                  key={mat.id}
                  onClick={() => setSynthesisMaterial(isSelected ? null : mat.id)}
                  className="flex flex-col gap-1 p-2.5 rounded-lg transition-all text-left active:scale-[0.98]"
                  style={{
                    background: isSelected
                      ? "linear-gradient(160deg, #3D2D1A, #2A1F14)"
                      : "linear-gradient(160deg, #2C1F15, #1E140D)",
                    border: isSelected
                      ? "1.5px solid #C9A84C"
                      : "1.5px solid rgba(139,105,20,0.15)",
                    boxShadow: isSelected
                      ? "0 2px 12px rgba(201,168,76,0.15), inset 0 1px 0 rgba(139,105,20,0.1)"
                      : "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.05)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{mat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-medium truncate block" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>{mat.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold" style={{ color }}>x{inv.quantity}</span>
                        <span className="text-[7px] px-1 py-0.5 rounded" style={{
                          background: "rgba(139,105,20,0.1)",
                          color: "#C9A84C",
                          border: "1px solid rgba(139,105,20,0.2)",
                        }}>{mat.rarity}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{
                        background: "rgba(201,168,76,0.15)",
                        color: "#C9A84C",
                        border: "1px solid rgba(201,168,76,0.3)",
                      }}>선택</span>
                    )}
                  </div>
                  {effectDesc && (
                    <p className="text-[8px] leading-tight pl-7" style={{ color: "rgba(201,168,76,0.5)" }}>{effectDesc}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section divider — gold ornament */}
      <div className="flex items-center gap-2 mx-4 my-3">
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3))" }} />
        <span className="text-[8px]" style={{ color: "rgba(139,105,20,0.4)" }}>&#9830;</span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(139,105,20,0.3), transparent)" }} />
      </div>

      {/* Slime picker — Field journal catalog */}
      <div className="mx-3 mb-3">
        <div className="flex items-center justify-between px-1 mb-2">
          <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>
            {"\uD83D\uDC3E"} 슬라임 선택
            <span className="text-[9px] font-normal ml-1" style={{ color: "rgba(201,168,76,0.4)" }}>{slimes.length}마리</span>
          </p>
          <p className="text-[9px]" style={{ color: "rgba(201,168,76,0.4)", fontFamily: "Georgia, serif" }}>
            {!mergeSlotA ? "첫 번째 선택" : !mergeSlotB ? "두 번째 선택" : "선택 완료"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {slimes.map((slime, idx) => {
            const isSelected = slime.id === mergeSlotA || slime.id === mergeSlotB;
            const color = elementColors[slime.element] || "#B2BEC3";
            const sp = species.find((s) => s.id === slime.species_id);
            const gColor = gradeColors[sp?.grade || "common"] || "#B2BEC3";
            return (
              <button
                key={slime.id}
                disabled={isSelected}
                onClick={() => {
                  if (!mergeSlotA) setMergeSlot("A", slime.id);
                  else if (!mergeSlotB) setMergeSlot("B", slime.id);
                }}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg transition-all text-center ${
                  isSelected ? "" : "active:scale-[0.96]"
                }`}
                style={{
                  background: isSelected
                    ? "linear-gradient(160deg, #3D2D1A, #2A1F14)"
                    : "linear-gradient(160deg, #2C1F15, #1E140D)",
                  border: isSelected
                    ? "2px solid #C9A84C"
                    : "1.5px solid rgba(139,105,20,0.15)",
                  boxShadow: isSelected
                    ? "0 0 12px rgba(201,168,76,0.15), inset 0 1px 0 rgba(139,105,20,0.1)"
                    : "0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.05)",
                  opacity: isSelected ? 0.6 : 1,
                  animation: `stagger-slide-in 0.3s ease-out ${idx * 30}ms both`,
                }}
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center"
                  style={{
                    background: `radial-gradient(circle, ${color}15, transparent 70%)`,
                    border: "1px solid rgba(139,105,20,0.1)",
                  }}
                >
                  <img
                    src={generateSlimeIconSvg(slime.element, 32, sp?.grade, (useGameStore.getState().equippedAccessories[slime.id] || []).map(e => e.svg_overlay).filter(Boolean), slime.species_id)}
                    alt=""
                    className="w-8 h-8"
                    style={{ filter: `drop-shadow(0 1px 3px ${color}30)` }}
                    draggable={false}
                  />
                </div>
                <span className="text-[9px] font-bold truncate w-full" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>
                  {slime.name || getSpeciesName(slime.species_id)}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[8px]" style={{ color: "#C9A84C" }}>Lv.{slime.level}</span>
                  <span className="text-[7px] px-1 py-0.5 rounded-md font-bold" style={{
                    background: `${gColor}12`, color: gColor,
                  }}>
                    {gradeNames[sp?.grade || "common"] || sp?.grade}
                  </span>
                </div>
                {isSelected && (
                  <span className="text-[8px] font-bold" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>{"\u2713"} 선택</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommended Recipes — undiscovered recipes the player can make */}
      {recipes.length > 0 && (() => {
        // Find undiscovered, non-hidden recipes where the player owns the required species
        const ownedSpeciesIds = new Set(slimes.map(s => s.species_id));
        const recommendations = recipes
          .filter(r => !r.discovered && !r.hidden)
          .filter(r => ownedSpeciesIds.has(r.input_a) && ownedSpeciesIds.has(r.input_b))
          .slice(0, 3);

        if (recommendations.length === 0) return null;

        return (
          <>
            {/* Section divider */}
            <div className="flex items-center gap-2 mx-4 mt-4 mb-3">
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.4))" }} />
              <span className="text-[8px]" style={{ color: "rgba(201,168,76,0.5)" }}>&#9734;</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(201,168,76,0.4), transparent)" }} />
            </div>

            <div className="mx-3 mb-3 rounded-lg relative"
              style={{
                background: "linear-gradient(170deg, #2D2518 0%, #1E1A0D 100%)",
                border: "1.5px solid rgba(201,168,76,0.3)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3), inset 0 0 20px rgba(201,168,76,0.04)",
              }}>
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid rgba(139,105,20,0.2)" }}>
                <span className="text-[9px] tracking-[0.15em] font-bold" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>
                  RECOMMENDED RECIPES
                </span>
                <span className="text-[8px] ml-auto px-1.5 py-0.5 rounded" style={{
                  background: "rgba(201,168,76,0.12)",
                  color: "rgba(201,168,76,0.6)",
                  border: "1px solid rgba(201,168,76,0.2)",
                }}>
                  보유 슬라임 기반
                </span>
              </div>
              <div className="p-3 space-y-1.5">
                {recommendations.map((recipe, idx) => {
                  const inputAName = getSpeciesName(recipe.input_a);
                  const inputBName = getSpeciesName(recipe.input_b);
                  // Find matching slimes for auto-fill
                  const slimeForA = slimes.find(s => s.species_id === recipe.input_a);
                  const slimeForB = slimes.find(s => s.species_id === recipe.input_b && s.id !== slimeForA?.id);
                  const canAutoFill = !!slimeForA && !!slimeForB;

                  return (
                    <button
                      key={recipe.id}
                      disabled={!canAutoFill}
                      onClick={() => {
                        if (canAutoFill) {
                          setMergeSlot("A", slimeForA.id);
                          setMergeSlot("B", slimeForB.id);
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all active:scale-[0.98] text-left"
                      style={{
                        background: "linear-gradient(160deg, rgba(139,105,20,0.08), rgba(139,105,20,0.03))",
                        border: "1px solid rgba(139,105,20,0.18)",
                        animation: `stagger-slide-in 0.3s ease-out ${idx * 60}ms both`,
                      }}
                    >
                      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{
                        background: "rgba(201,168,76,0.1)",
                        border: "1px solid rgba(201,168,76,0.2)",
                      }}>
                        <span className="text-[10px]" style={{ color: "#C9A84C" }}>?</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-medium truncate block" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>
                          {inputAName} + {inputBName}
                        </span>
                        {recipe.hint && (
                          <span className="text-[8px] italic truncate block mt-0.5" style={{ color: "rgba(201,168,76,0.4)", fontFamily: "Georgia, serif" }}>
                            {recipe.hint}
                          </span>
                        )}
                      </div>
                      <span className="text-[8px] px-1.5 py-1 rounded font-bold shrink-0" style={{
                        background: canAutoFill ? "rgba(201,168,76,0.15)" : "rgba(107,58,42,0.1)",
                        color: canAutoFill ? "#C9A84C" : "rgba(107,58,42,0.4)",
                        border: canAutoFill ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(107,58,42,0.15)",
                      }}>
                        {canAutoFill ? "자동 선택" : "재료 부족"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        );
      })()}

      {/* Recipe Book — Ancient recipe book pages */}
      {recipes.length > 0 && (() => {
        const RECIPES_PER_PAGE = 10;
        const sortedRecipes = [...recipes].sort((a, b) => {
          if (a.discovered && !b.discovered) return -1;
          if (!a.discovered && b.discovered) return 1;
          if (!a.hidden && b.hidden) return -1;
          if (a.hidden && !b.hidden) return 1;
          return 0;
        });
        const totalPages = Math.ceil(sortedRecipes.length / RECIPES_PER_PAGE);
        const pageRecipes = sortedRecipes.slice(recipePage * RECIPES_PER_PAGE, (recipePage + 1) * RECIPES_PER_PAGE);

        return (
          <>
            {/* Section divider */}
            <div className="flex items-center gap-2 mx-4 mt-4 mb-3">
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3))" }} />
              <span className="text-[8px]" style={{ color: "rgba(139,105,20,0.4)" }}>&#9830;</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(139,105,20,0.3), transparent)" }} />
            </div>

            {/* Recipe book parchment */}
            <div className="mx-3 mb-4 rounded-lg relative"
              style={{
                background: "linear-gradient(170deg, #F5E6C8 0%, #E8D5B0 40%, #DCC9A3 100%)",
                boxShadow: "4px 4px 12px rgba(0,0,0,0.4), inset 0 0 40px rgba(139,105,20,0.08)",
                border: "1px solid #C9A84C",
              }}>
              {/* Page corner fold */}
              <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden rounded-bl-lg" style={{ zIndex: 2 }}>
                <div className="absolute -top-4 -right-4 w-8 h-8 rotate-45"
                  style={{ background: "linear-gradient(135deg, #D4C4A8, #C9B896)", boxShadow: "-1px 1px 2px rgba(0,0,0,0.15)" }} />
              </div>

              {/* Recipe book header */}
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(139,105,20,0.2)" }}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914, transparent)" }} />
                  <span className="text-[9px] tracking-[0.15em] font-bold" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>
                    RECIPE BOOK
                  </span>
                  <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914, transparent)" }} />
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className="text-[13px] font-bold" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>{recipes.filter((r) => r.discovered).length}</span>
                  <span className="text-[12px] font-bold" style={{ color: "rgba(107,58,42,0.4)" }}>/</span>
                  <span className="text-[12px] font-medium" style={{ color: "rgba(107,58,42,0.6)" }}>{recipes.length}</span>
                  <div className="w-16 h-1.5 rounded-full overflow-hidden ml-1" style={{
                    background: "rgba(139,105,20,0.12)",
                    border: "1px solid rgba(139,105,20,0.15)",
                  }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{
                      width: `${recipes.length > 0 ? (recipes.filter(r => r.discovered).length / recipes.length) * 100 : 0}%`,
                      background: "linear-gradient(90deg, #8B6914, #C9A84C)",
                      boxShadow: "0 0 4px rgba(201,168,76,0.4)",
                    }} />
                  </div>
                </div>
              </div>

              {/* Recipe entries */}
              <div className="space-y-1.5 px-4 py-3">
                {pageRecipes.map((recipe) => {
                  const inputAName = getSpeciesName(recipe.input_a);
                  const inputBName = getSpeciesName(recipe.input_b);
                  return (
                    <div key={recipe.id}
                      className="p-2.5 rounded-md transition-all"
                      style={{
                        background: recipe.discovered
                          ? "rgba(139,105,20,0.08)"
                          : recipe.hidden
                          ? "rgba(107,58,42,0.06)"
                          : "rgba(107,58,42,0.03)",
                        border: recipe.discovered
                          ? "1px solid rgba(139,105,20,0.25)"
                          : recipe.hidden
                          ? "1px solid rgba(107,58,42,0.15)"
                          : "1px solid rgba(107,58,42,0.08)",
                      }}>
                      {recipe.discovered ? (
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                            style={{
                              background: "rgba(139,105,20,0.12)",
                              color: "#8B6914",
                              border: "1px solid rgba(139,105,20,0.2)",
                            }}>{"\u2713"}</span>
                          <span className="text-[11px] font-medium flex-1 truncate" style={{ color: "#2C1810", fontFamily: "Georgia, serif" }}>
                            {inputAName} + {inputBName}
                          </span>
                          <span className="text-xs" style={{ color: "rgba(107,58,42,0.3)" }}>{"\u2192"}</span>
                          <span className="text-[11px] font-bold" style={{ color: "#8B6914", fontFamily: "Georgia, serif" }}>{recipe.output_name}</span>
                        </div>
                      ) : recipe.hidden ? (
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                            style={{
                              background: "rgba(107,58,42,0.08)",
                              color: "rgba(107,58,42,0.35)",
                              border: "1px solid rgba(107,58,42,0.1)",
                            }}>?</span>
                          <span className="text-[11px] italic flex-1" style={{ color: "rgba(107,58,42,0.35)", fontFamily: "Georgia, serif" }}>??? + ??? {"\u2192"} ???</span>
                          <span className="text-[7px] px-1.5 py-0.5 rounded-md font-bold" style={{
                            background: "rgba(107,58,42,0.08)",
                            color: "rgba(107,58,42,0.4)",
                            border: "1px solid rgba(107,58,42,0.12)",
                            fontFamily: "Georgia, serif",
                          }}>히든</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                            style={{
                              background: "rgba(107,58,42,0.05)",
                              color: "rgba(107,58,42,0.3)",
                              border: "1px solid rgba(107,58,42,0.08)",
                            }}>?</span>
                          <span className="text-[11px] flex-1 truncate" style={{ color: "rgba(107,58,42,0.5)", fontFamily: "Georgia, serif" }}>
                            {inputAName} + {inputBName} {"\u2192"} ???
                          </span>
                          {recipe.hint && (
                            <span className="text-[8px] italic truncate max-w-[100px]" style={{ color: "rgba(139,105,20,0.5)", fontFamily: "Georgia, serif" }}>
                              {"\uD83D\uDCA1"} {recipe.hint}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination — book page numbers */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 px-4 pb-3">
                  <button
                    onClick={() => setRecipePage(Math.max(0, recipePage - 1))}
                    disabled={recipePage === 0}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] transition disabled:opacity-20 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, #5A3522, #3D2017)",
                      color: "#C9A84C",
                      border: "1px solid rgba(139,105,20,0.3)",
                    }}
                  >
                    {"\u2190"}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setRecipePage(i)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold transition active:scale-95"
                      style={{
                        background: i === recipePage
                          ? "linear-gradient(135deg, #C9A84C, #8B6914)"
                          : "rgba(107,58,42,0.08)",
                        color: i === recipePage ? "#3D2017" : "rgba(107,58,42,0.4)",
                        border: i === recipePage
                          ? "1px solid #D4AF37"
                          : "1px solid rgba(139,105,20,0.15)",
                        fontFamily: "Georgia, serif",
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setRecipePage(Math.min(totalPages - 1, recipePage + 1))}
                    disabled={recipePage === totalPages - 1}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] transition disabled:opacity-20 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, #5A3522, #3D2017)",
                      color: "#C9A84C",
                      border: "1px solid rgba(139,105,20,0.3)",
                    }}
                  >
                    {"\u2192"}
                  </button>
                </div>
              )}

              {/* Bottom page decoration */}
              <div className="flex items-center justify-center py-2 px-6" style={{ borderTop: "1px solid rgba(139,105,20,0.15)" }}>
                <div className="flex items-center gap-2 w-full">
                  <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3), transparent)" }} />
                  <span className="text-[11px] font-medium" style={{ color: "#8B6914", fontFamily: "Georgia, serif" }}>
                    -- {recipes.filter(r => r.discovered).length} / {recipes.length} discovered --
                  </span>
                  <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3), transparent)" }} />
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Bottom decoration */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3))" }} />
          <span className="text-[10px]" style={{ color: "rgba(139,105,20,0.25)" }}>&#9830;</span>
          <div className="w-12 h-px" style={{ background: "linear-gradient(90deg, rgba(139,105,20,0.3), transparent)" }} />
        </div>
      </div>
    </>
  );
}

// ─── Batch Merge Tab ─────────────────────────────────────────────────────────

interface MergeGroup {
  speciesId: number;
  speciesName: string;
  element: string;
  grade: string;
  slimes: Slime[];
  pairCount: number;
}

function BatchMergeTab({
  token,
  slimes,
  species,
  fetchSlimes,
}: {
  token: string | null;
  slimes: Slime[];
  species: SlimeSpecies[];
  fetchSlimes: (token: string) => Promise<void>;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BatchMergeResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showResults, setShowResults] = useState(false);

  // Group slimes by species_id, count mergeable pairs (same species = grade upgrade)
  const mergeGroups: MergeGroup[] = [];
  const grouped = new Map<number, Slime[]>();
  for (const sl of slimes) {
    const arr = grouped.get(sl.species_id) || [];
    arr.push(sl);
    grouped.set(sl.species_id, arr);
  }
  for (const [speciesId, group] of grouped) {
    if (group.length < 2) continue;
    const sp = species.find((s) => s.id === speciesId);
    if (!sp) continue;
    mergeGroups.push({
      speciesId,
      speciesName: sp.name,
      element: sp.element,
      grade: sp.grade,
      slimes: group,
      pairCount: Math.floor(group.length / 2),
    });
  }

  mergeGroups.sort((a, b) => b.pairCount - a.pairCount);

  const totalPairs = mergeGroups.reduce((sum, g) => sum + g.pairCount, 0);

  const executeBatchMerge = useCallback(async () => {
    if (!token || totalPairs === 0 || isRunning) return;

    setIsRunning(true);
    setResults([]);
    setShowResults(false);
    setProgress({ current: 0, total: totalPairs });

    let completed = 0;
    const batchResults: BatchMergeResult[] = [];

    for (const group of mergeGroups) {
      await fetchSlimes(token);
      const currentSlimes = useGameStore.getState().slimes;
      const available = currentSlimes.filter((s) => s.species_id === group.speciesId);

      const pairs = Math.floor(available.length / 2);
      for (let i = 0; i < pairs; i++) {
        const a = available[i * 2];
        const b = available[i * 2 + 1];
        if (!a || !b) break;

        try {
          const res = await authApi<{
            merge_type: string;
            result: { slime: Slime; species: SlimeSpecies };
          }>("/api/slimes/merge", token, {
            method: "POST",
            body: { slime_id_a: a.id, slime_id_b: b.id },
          });
          batchResults.push({
            inputA: a.name || group.speciesName,
            inputB: b.name || group.speciesName,
            resultName: res.result.species.name,
            resultGrade: res.result.species.grade,
            success: true,
          });
        } catch (e) {
          batchResults.push({
            inputA: a.name || group.speciesName,
            inputB: b.name || group.speciesName,
            resultName: "",
            resultGrade: "",
            success: false,
            error: e instanceof Error ? e.message : "합성 실패",
          });
        }

        completed++;
        setProgress({ current: completed, total: totalPairs });
        setResults([...batchResults]);
      }
    }

    await fetchSlimes(token);
    setIsRunning(false);
    setShowResults(true);
  }, [token, totalPairs, isRunning, mergeGroups, fetchSlimes]);

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <div className="px-3 py-4">
      {/* Header description — parchment card */}
      <div className="rounded-lg p-4 mb-4"
        style={{
          background: "linear-gradient(170deg, #F5E6C8 0%, #E8D5B0 40%, #DCC9A3 100%)",
          border: "1px solid #C9A84C",
          boxShadow: "4px 4px 12px rgba(0,0,0,0.3), inset 0 0 30px rgba(139,105,20,0.06)",
        }}>
        {/* Ornamental top */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914, transparent)" }} />
          <span className="text-[9px] tracking-[0.15em] font-bold" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>
            BATCH SYNTHESIS
          </span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914, transparent)" }} />
        </div>
        <p className="text-[10px] leading-relaxed text-center" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>
          같은 종족 슬라임 2마리를 자동으로 합성합니다.
          버튼 하나로 모든 동종 쌍을 한 번에 합성!
        </p>
      </div>

      {/* Progress bar (when running) */}
      {isRunning && (
        <div className="mb-4 rounded-lg p-3" style={{
          background: "linear-gradient(160deg, #2C1F15, #1E140D)",
          border: "1.5px solid rgba(139,105,20,0.3)",
        }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>합성 중...</span>
            <span className="text-[10px] tabular-nums" style={{ color: "rgba(201,168,76,0.5)" }}>
              {progress.current}/{progress.total}
            </span>
          </div>
          <div className="w-full h-[6px] rounded-full overflow-hidden" style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(139,105,20,0.2)",
          }}>
            <div
              className="h-full rounded-full transition-all duration-300 relative overflow-hidden"
              style={{
                width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                background: "linear-gradient(90deg, #8B6914, #C9A84C, #D4AF37)",
                boxShadow: "0 0 6px rgba(212,175,55,0.3)",
              }}
            >
              <div className="absolute inset-0" style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                animation: "book-shimmer 3s ease-in-out infinite",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Summary before merge */}
      {!isRunning && !showResults && mergeGroups.length > 0 && (
        <div className="mb-4 space-y-1.5">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{
            background: "linear-gradient(160deg, #2C1F15, #1E140D)",
            border: "1.5px solid rgba(139,105,20,0.15)",
          }}>
            <span className="text-[11px]" style={{ color: "rgba(201,168,76,0.5)", fontFamily: "Georgia, serif" }}>합성 가능 종족</span>
            <span className="font-bold text-[13px]" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>{mergeGroups.length}종</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{
            background: "linear-gradient(160deg, #3D2D1A, #2A1F14)",
            border: "1.5px solid rgba(139,105,20,0.3)",
          }}>
            <span className="text-[11px]" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>총 합성 쌍</span>
            <span className="font-bold text-[13px]" style={{ color: "#D4AF37", fontFamily: "Georgia, serif" }}>{totalPairs}쌍</span>
          </div>

          {/* Preview groups — dark leather cards */}
          <div className="space-y-1 mt-2 max-h-[200px] overflow-y-auto game-scroll">
            {mergeGroups.map((group, idx) => {
              const color = elementColors[group.element] || "#B2BEC3";
              const gColor = gradeColors[group.grade] || "#B2BEC3";
              return (
                <div key={group.speciesId}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                  style={{
                    background: "linear-gradient(160deg, #2C1F15, #1E140D)",
                    border: "1.5px solid rgba(139,105,20,0.12)",
                    animation: `stagger-slide-in 0.3s ease-out ${idx * 40}ms both`,
                  }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: `radial-gradient(circle, ${color}15, transparent 70%)`,
                      border: "1px solid rgba(139,105,20,0.1)",
                    }}>
                    <img src={generateSlimeIconSvg(group.element, 24, group.grade, undefined, group.speciesId)}
                      alt="" className="w-6 h-6" draggable={false} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold truncate block" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>{group.speciesName}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: gColor + "15", color: gColor }}>
                        {gradeNames[group.grade] || group.grade}
                      </span>
                      <span className="text-[8px]" style={{ color: "rgba(201,168,76,0.4)" }}>{group.slimes.length}마리</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>{group.pairCount}쌍</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Result modal */}
      {showResults && results.length > 0 && (() => {
        // Grade-based grouping for summary cards
        const gradeOrder = ["mythic", "legendary", "epic", "rare", "uncommon", "common"];
        const gradeCounts: Record<string, number> = {};
        for (const r of results) {
          if (r.success && r.resultGrade) {
            gradeCounts[r.resultGrade] = (gradeCounts[r.resultGrade] || 0) + 1;
          }
        }
        const isRarePlus = (grade: string) => {
          const rareIdx = gradeOrder.indexOf("rare");
          return gradeOrder.indexOf(grade) <= rareIdx && gradeOrder.indexOf(grade) >= 0;
        };

        return (
        <div className="mb-4">
          {/* Summary — parchment style */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 text-center py-2.5 rounded-lg" style={{
              background: "linear-gradient(160deg, #3D2D1A, #2A1F14)",
              border: "1.5px solid rgba(139,105,20,0.3)",
            }}>
              <div className="font-bold text-lg" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>{successCount}</div>
              <div className="text-[9px]" style={{ color: "rgba(201,168,76,0.5)", fontFamily: "Georgia, serif" }}>성공</div>
            </div>
            {failCount > 0 && (
              <div className="flex-1 text-center py-2.5 rounded-lg" style={{
                background: "linear-gradient(160deg, #3D2117, #2A1810)",
                border: "1.5px solid rgba(139,69,19,0.3)",
              }}>
                <div className="font-bold text-lg" style={{ color: "#8B6914", fontFamily: "Georgia, serif" }}>{failCount}</div>
                <div className="text-[9px]" style={{ color: "rgba(139,105,20,0.5)", fontFamily: "Georgia, serif" }}>실패</div>
              </div>
            )}
          </div>

          {/* Grade grouping summary cards */}
          {Object.keys(gradeCounts).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {gradeOrder.filter(g => gradeCounts[g]).map((grade, idx) => {
                const gColor = gradeColors[grade] || "#B2BEC3";
                return (
                  <div key={grade}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${gColor}18, ${gColor}08)`,
                      border: `1.5px solid ${gColor}40`,
                      animation: `batch-result-fade-in 0.4s ease-out ${idx * 80}ms both`,
                    }}>
                    {isRarePlus(grade) && (
                      <span className="absolute -top-0.5 -right-0.5 text-[8px]" style={{
                        animation: `sparkle-shine 1.5s ease-in-out ${idx * 200}ms infinite`,
                        color: gColor,
                      }}>&#10022;</span>
                    )}
                    <span className="text-[10px] font-bold" style={{ color: gColor }}>
                      {gradeNames[grade] || grade}
                    </span>
                    <span className="text-[12px] font-black" style={{
                      color: gColor,
                      textShadow: isRarePlus(grade) ? `0 0 6px ${gColor}60` : "none",
                    }}>
                      x{gradeCounts[grade]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detail list — dark leather cards with stagger animation */}
          <div className="space-y-1 max-h-[250px] overflow-y-auto game-scroll">
            {results.map((r, i) => {
              const isRareResult = r.success && isRarePlus(r.resultGrade);
              return (
              <div key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] relative overflow-hidden"
                style={{
                  background: r.success
                    ? "linear-gradient(160deg, #2D2518, #1E1A0D)"
                    : "linear-gradient(160deg, #3D2117, #2A1810)",
                  border: r.success
                    ? isRareResult
                      ? `1px solid ${(gradeColors[r.resultGrade] || "#B2BEC3")}40`
                      : "1px solid rgba(139,105,20,0.25)"
                    : "1px solid rgba(139,69,19,0.25)",
                  animation: `batch-result-fade-in 0.35s ease-out ${i * 60}ms both`,
                }}>
                {/* Sparkle effect for rare+ results */}
                {isRareResult && (
                  <>
                    <span className="absolute top-0.5 right-1 text-[7px]" style={{
                      animation: `sparkle-shine 2s ease-in-out ${i * 150}ms infinite`,
                      color: gradeColors[r.resultGrade] || "#B2BEC3",
                    }}>&#10022;</span>
                    <span className="absolute bottom-0.5 right-4 text-[5px]" style={{
                      animation: `sparkle-shine 2s ease-in-out ${i * 150 + 600}ms infinite`,
                      color: gradeColors[r.resultGrade] || "#B2BEC3",
                    }}>&#10022;</span>
                  </>
                )}
                <span style={{ color: r.success ? "#C9A84C" : "#8B6914", fontFamily: "Georgia, serif" }}>
                  {r.success ? "\u2713" : "\u2717"}
                </span>
                <span className="truncate" style={{ color: "rgba(245,230,200,0.6)", fontFamily: "Georgia, serif" }}>{r.inputA} + {r.inputB}</span>
                {r.success ? (
                  <>
                    <span style={{ color: "rgba(201,168,76,0.3)" }}>{"\u2192"}</span>
                    <span className="font-bold" style={{ color: gradeColors[r.resultGrade] || "#B2BEC3", fontFamily: "Georgia, serif" }}>
                      {r.resultName}
                    </span>
                    <span className="text-[8px] px-1 py-0.5 rounded" style={{
                      background: (gradeColors[r.resultGrade] || "#B2BEC3") + "15",
                      color: gradeColors[r.resultGrade] || "#B2BEC3",
                    }}>
                      {gradeNames[r.resultGrade] || r.resultGrade}
                    </span>
                  </>
                ) : (
                  <span className="ml-auto" style={{ color: "#8B6914", fontFamily: "Georgia, serif" }}>{r.error}</span>
                )}
              </div>
              );
            })}
          </div>

          <button onClick={() => { setShowResults(false); setResults([]); }}
            className="w-full mt-3 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #5A3522, #3D2017)",
              color: "#C9A84C",
              border: "1px solid rgba(139,105,20,0.3)",
              fontFamily: "Georgia, serif",
            }}>
            확인
          </button>
        </div>
        );
      })()}

      {/* Merge groups */}
      {mergeGroups.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #3D2017, #2C1810)",
              border: "2px solid rgba(139,105,20,0.2)",
            }}>
            <span className="text-2xl" style={{ color: "rgba(139,105,20,0.3)" }}>&#9830;</span>
          </div>
          <p className="text-xs" style={{ color: "rgba(201,168,76,0.4)", fontFamily: "Georgia, serif" }}>같은 종족 슬라임이 2마리 이상 없어요</p>
          <p className="text-[10px] mt-1 italic" style={{ color: "rgba(139,105,20,0.3)", fontFamily: "Georgia, serif" }}>슬라임을 더 모아보세요!</p>
        </div>
      ) : (
        /* One-click execute button — wax seal style */
        <button
          onClick={executeBatchMerge}
          disabled={totalPairs === 0 || isRunning || showResults}
          className="w-full py-3.5 text-sm font-bold rounded-lg transition-all active:scale-95 disabled:opacity-40"
          style={{
            background: totalPairs > 0 && !isRunning && !showResults
              ? "radial-gradient(circle at 50% 40%, #7A3015, #5A2010)"
              : "rgba(107,58,42,0.15)",
            color: totalPairs > 0 && !isRunning && !showResults ? "#F5E6C8" : "rgba(107,58,42,0.4)",
            border: totalPairs > 0 && !isRunning && !showResults
              ? "2px solid #C9A84C"
              : "1px solid rgba(139,105,20,0.15)",
            boxShadow: totalPairs > 0 && !isRunning && !showResults
              ? "0 4px 16px rgba(139,69,19,0.4), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 20px rgba(201,168,76,0.15)"
              : "none",
            fontFamily: "Georgia, 'Times New Roman', serif",
            textShadow: totalPairs > 0 && !isRunning && !showResults ? "0 1px 2px rgba(0,0,0,0.5)" : "none",
            letterSpacing: "0.05em",
          }}
        >
          {isRunning
            ? `\u2697\uFE0F 합성 중... (${progress.current}/${progress.total})`
            : `\u2697\uFE0F ${totalPairs}쌍 일괄 합성하기`
          }
        </button>
      )}

      {/* Bottom decoration */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3))" }} />
          <span className="text-[10px]" style={{ color: "rgba(139,105,20,0.25)" }}>&#9830;</span>
          <div className="w-12 h-px" style={{ background: "linear-gradient(90deg, rgba(139,105,20,0.3), transparent)" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Crafting Tab ─────────────────────────────────────────────────────────────

function CraftingTab({
  token,
  craftingRecipes,
  materialDefs,
  materialInventory,
  craftItem,
}: {
  token: string | null;
  craftingRecipes: CraftingRecipe[];
  materialDefs: ReturnType<typeof useGameStore.getState>["materialDefs"];
  materialInventory: ReturnType<typeof useGameStore.getState>["materialInventory"];
  craftItem: (token: string, recipeId: number) => Promise<boolean>;
}) {
  const [crafting, setCrafting] = useState<number | null>(null);

  const handleCraft = async (recipeId: number) => {
    if (!token || crafting) return;
    setCrafting(recipeId);
    await craftItem(token, recipeId);
    setCrafting(null);
  };

  const getMaterialName = (matId: number) => {
    const mat = materialDefs.find((m) => m.id === matId);
    return mat ? mat.name : `재료 #${matId}`;
  };

  const getMaterialIcon = (matId: number) => {
    const mat = materialDefs.find((m) => m.id === matId);
    return mat?.icon || "?";
  };

  const getUserQty = (matId: number) => {
    const inv = materialInventory.find((m) => m.material_id === matId);
    return inv?.quantity || 0;
  };

  // Sort: craftable first
  const sorted = [...craftingRecipes].sort((a, b) => {
    if (a.can_craft && !b.can_craft) return -1;
    if (!a.can_craft && b.can_craft) return 1;
    return a.id - b.id;
  });

  return (
    <div className="px-3 py-4">
      {/* Header description — parchment card */}
      <div className="rounded-lg p-4 mb-4"
        style={{
          background: "linear-gradient(170deg, #F5E6C8 0%, #E8D5B0 40%, #DCC9A3 100%)",
          border: "1px solid #C9A84C",
          boxShadow: "4px 4px 12px rgba(0,0,0,0.3), inset 0 0 30px rgba(139,105,20,0.06)",
        }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914, transparent)" }} />
          <span className="text-[9px] tracking-[0.15em] font-bold" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>
            CRAFTING WORKSHOP
          </span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914, transparent)" }} />
        </div>
        <p className="text-[10px] leading-relaxed text-center" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>
          탐험에서 모은 재료로 아이템을 제작할 수 있습니다.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #3D2017, #2C1810)",
              border: "2px solid rgba(139,105,20,0.2)",
            }}>
            <span className="text-2xl" style={{ color: "rgba(139,105,20,0.3)" }}>&#9830;</span>
          </div>
          <p className="text-xs" style={{ color: "rgba(201,168,76,0.4)", fontFamily: "Georgia, serif" }}>제작 레시피가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((recipe, idx) => (
            <div
              key={recipe.id}
              className={`rounded-lg p-3 transition-all ${recipe.can_craft ? "" : "opacity-50"}`}
              style={{
                background: recipe.can_craft
                  ? "linear-gradient(160deg, #3D2D1A, #2A1F14)"
                  : "linear-gradient(160deg, #2C1F15, #1E140D)",
                border: recipe.can_craft
                  ? "1.5px solid rgba(139,105,20,0.35)"
                  : "1.5px solid rgba(139,105,20,0.12)",
                boxShadow: recipe.can_craft
                  ? "0 2px 12px rgba(201,168,76,0.1), inset 0 1px 0 rgba(139,105,20,0.1)"
                  : "0 2px 8px rgba(0,0,0,0.2)",
                animation: `stagger-slide-in 0.3s ease-out ${idx * 40}ms both`,
              }}
            >
              {/* Recipe header */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>{recipe.name}</span>
                  <span className="text-[9px] ml-2" style={{ color: "#C9A84C" }}>
                    {recipe.result_type === "egg" ? "알" : recipe.result_type === "booster" ? "부스터" : recipe.result_type === "accessory" ? "악세서리" : "재료"}
                  </span>
                </div>
                {recipe.result_qty > 1 && (
                  <span className="text-[9px]" style={{ color: "#D4AF37", fontFamily: "Georgia, serif" }}>x{recipe.result_qty}</span>
                )}
              </div>

              {/* Ingredients */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {recipe.ingredients.map((ing, i) => {
                  const hasEnough = getUserQty(ing.material_id) >= ing.quantity;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px]"
                      style={{
                        background: hasEnough
                          ? "rgba(139,105,20,0.1)"
                          : "rgba(139,69,19,0.12)",
                        border: hasEnough
                          ? "1px solid rgba(139,105,20,0.25)"
                          : "1px solid rgba(139,69,19,0.2)",
                      }}
                    >
                      <span>{getMaterialIcon(ing.material_id)}</span>
                      <span style={{ color: "rgba(245,230,200,0.8)", fontFamily: "Georgia, serif" }}>{getMaterialName(ing.material_id)}</span>
                      <span style={{ color: hasEnough ? "#C9A84C" : "#8B6914" }}>
                        {getUserQty(ing.material_id)}/{ing.quantity}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Craft button — wax seal style */}
              <button
                onClick={() => handleCraft(recipe.id)}
                disabled={!recipe.can_craft || crafting !== null}
                className="w-full py-2 rounded-md text-[10px] font-bold transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: recipe.can_craft && crafting === null
                    ? "radial-gradient(circle at 50% 40%, #7A3015, #5A2010)"
                    : "rgba(107,58,42,0.15)",
                  color: recipe.can_craft && crafting === null ? "#F5E6C8" : "rgba(107,58,42,0.4)",
                  border: recipe.can_craft && crafting === null
                    ? "1.5px solid #C9A84C"
                    : "1px solid rgba(139,105,20,0.15)",
                  boxShadow: recipe.can_craft && crafting === null
                    ? "0 2px 8px rgba(139,69,19,0.3), inset 0 1px 0 rgba(255,255,255,0.08)"
                    : "none",
                  fontFamily: "Georgia, serif",
                  textShadow: recipe.can_craft && crafting === null ? "0 1px 2px rgba(0,0,0,0.4)" : "none",
                }}
              >
                {crafting === recipe.id ? "\u2692\uFE0F 제작 중..." : recipe.can_craft ? "\u2692\uFE0F 제작하기" : "재료 부족"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom decoration */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3))" }} />
          <span className="text-[10px]" style={{ color: "rgba(139,105,20,0.25)" }}>&#9830;</span>
          <div className="w-12 h-px" style={{ background: "linear-gradient(90deg, rgba(139,105,20,0.3), transparent)" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Merge Slot Component ────────────────────────────────────────────────────

function MergeSlot({
  slime,
  label,
  getSpeciesName,
  onClear,
}: {
  slime: Slime | undefined;
  label: string;
  getSpeciesName: (id: number) => string;
  onClear: () => void;
}) {
  if (!slime) {
    return (
      <div className="w-[120px] h-[120px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all"
        style={{
          borderColor: "rgba(139,105,20,0.25)",
          background: "radial-gradient(circle at 50% 50%, rgba(139,105,20,0.04), transparent)",
        }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{
          background: "rgba(107,58,42,0.06)",
          border: "2px dashed rgba(139,105,20,0.2)",
        }}>
          <span className="text-xl font-bold" style={{ color: "rgba(139,105,20,0.25)", fontFamily: "Georgia, serif" }}>?</span>
        </div>
        <span className="text-[10px] font-medium" style={{ color: "rgba(107,58,42,0.4)", fontFamily: "Georgia, serif" }}>슬롯 {label}</span>
      </div>
    );
  }

  const color = elementColors[slime.element] || "#B2BEC3";
  const sp = useGameStore.getState().species.find((s) => s.id === slime.species_id);
  const grade = sp?.grade || "common";
  const gColor = gradeColors[grade] || "#B2BEC3";

  return (
    <div
      className="relative w-[120px] h-[120px] rounded-lg flex flex-col items-center justify-center transition-all"
      style={{
        background: `linear-gradient(160deg, rgba(245,230,200,0.12), rgba(232,213,176,0.06))`,
        border: "2px solid #C9A84C",
        boxShadow: "0 0 12px rgba(201,168,76,0.15), inset 0 0 20px rgba(139,105,20,0.05)",
      }}
    >
      {/* Decorative corner marks */}
      <div className="absolute top-1 left-1 w-3 h-3 pointer-events-none" style={{ opacity: 0.3 }}>
        <div className="absolute top-0 left-0 w-full h-px" style={{ background: "#8B6914" }} />
        <div className="absolute top-0 left-0 w-px h-full" style={{ background: "#8B6914" }} />
      </div>
      <div className="absolute top-1 right-1 w-3 h-3 pointer-events-none" style={{ opacity: 0.3 }}>
        <div className="absolute top-0 right-0 w-full h-px" style={{ background: "#8B6914" }} />
        <div className="absolute top-0 right-0 w-px h-full" style={{ background: "#8B6914" }} />
      </div>
      <div className="absolute bottom-1 left-1 w-3 h-3 pointer-events-none" style={{ opacity: 0.3 }}>
        <div className="absolute bottom-0 left-0 w-full h-px" style={{ background: "#8B6914" }} />
        <div className="absolute bottom-0 left-0 w-px h-full" style={{ background: "#8B6914" }} />
      </div>
      <div className="absolute bottom-1 right-1 w-3 h-3 pointer-events-none" style={{ opacity: 0.3 }}>
        <div className="absolute bottom-0 right-0 w-full h-px" style={{ background: "#8B6914" }} />
        <div className="absolute bottom-0 right-0 w-px h-full" style={{ background: "#8B6914" }} />
      </div>

      <img
        src={generateSlimeIconSvg(slime.element, 56, grade, (useGameStore.getState().equippedAccessories[slime.id] || []).map(e => e.svg_overlay).filter(Boolean), slime.species_id)}
        alt=""
        className="w-14 h-14 mb-1"
        style={{ filter: `drop-shadow(0 2px 6px ${color}40)` }}
        draggable={false}
      />
      <span className="text-[10px] truncate max-w-[100px] font-bold" style={{ color: "#2C1810", fontFamily: "Georgia, serif" }}>
        {slime.name || getSpeciesName(slime.species_id)}
      </span>
      <span className="text-[8px] font-bold mt-0.5" style={{ color: gColor }}>
        Lv.{slime.level} · {gradeNames[grade] || grade}
      </span>
      <button
        onClick={onClear}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-[10px] flex items-center justify-center transition active:scale-90"
        style={{
          background: "linear-gradient(135deg, #6B3A2A, #4A2515)",
          color: "#C9A84C",
          border: "1.5px solid #8B6914",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        }}
      >
        {"\u2715"}
      </button>
    </div>
  );
}
