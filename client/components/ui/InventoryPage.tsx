"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore } from "@/lib/store/gameStore";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { elementColors, elementNames, gradeColors, gradeNames, personalityNames, personalityEmoji } from "@/lib/constants";
import { toastReward, toastError, toastSuccess } from "@/components/ui/Toast";
import PageLayout from "./PageLayout";

type SortKey = "level" | "grade" | "element" | "newest";
type ViewMode = "grid" | "compact";

const GRADE_ORDER: Record<string, number> = {
  mythic: 6, legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1,
};

const GRADES = ["all", "mythic", "legendary", "epic", "rare", "uncommon", "common"] as const;

const FOOD_ITEMS: Record<number, { name: string; icon: string; desc: string }> = {
  3: { name: "맛있는 먹이", icon: "🍖", desc: "만복도 +50, 친밀도 +5" },
  4: { name: "고급 먹이", icon: "🥩", desc: "만복도 MAX, 친밀도 +10" },
  7: { name: "슈퍼 먹이", icon: "🍗", desc: "만복도 MAX, 친밀도 +20" },
  8: { name: "원소강화 먹이", icon: "✨", desc: "만복도 +80, 친밀도 +15" },
};

export default function InventoryPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { slimes, species, selectSlime, equippedAccessories, feedSlime, fetchSlimes, getCooldownRemaining, foodInventory, fetchFoodInventory, applyFood, applyFoodBatch, slimeCapacity, slimeCapacityNextTier, fetchCapacityInfo, expandCapacity } = useGameStore();
  const [sortBy, setSortBy] = useState<SortKey>("level");
  const [filterElement, setFilterElement] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [multiSelect, setMultiSelect] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchFeeding, setBatchFeeding] = useState(false);
  const [showFoodPanel, setShowFoodPanel] = useState(false);
  const [feedingSlimeId, setFeedingSlimeId] = useState<string | null>(null);
  const [applyingFood, setApplyingFood] = useState(false);

  const [feedQty, setFeedQty] = useState(1);

  useEffect(() => {
    if (token) {
      fetchFoodInventory(token);
      fetchCapacityInfo(token);
    }
  }, [token, fetchFoodInventory, fetchCapacityInfo]);

  const totalFoodCount = foodInventory.reduce((sum, f) => sum + f.quantity, 0);

  const getSpecies = useCallback(
    (speciesId: number) => species.find((s) => s.id === speciesId),
    [species],
  );

  const sortedSlimes = useMemo(() => {
    let filtered = [...slimes];

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((s) => {
        const sp = getSpecies(s.species_id);
        const name = (s.name || sp?.name || "").toLowerCase();
        return name.includes(q);
      });
    }

    // Element filter
    if (filterElement !== "all") {
      filtered = filtered.filter((s) => s.element === filterElement);
    }

    // Grade filter
    if (filterGrade !== "all") {
      filtered = filtered.filter((s) => {
        const sp = getSpecies(s.species_id);
        return sp?.grade === filterGrade;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "level": return b.level - a.level;
        case "grade": {
          const ga = GRADE_ORDER[getSpecies(a.species_id)?.grade || "common"] || 0;
          const gb = GRADE_ORDER[getSpecies(b.species_id)?.grade || "common"] || 0;
          return gb - ga || b.level - a.level;
        }
        case "element": return a.element.localeCompare(b.element) || b.level - a.level;
        case "newest":
        default: return 0;
      }
    });

    return filtered;
  }, [slimes, sortBy, filterElement, filterGrade, search, getSpecies]);

  const ownedElements = useMemo(() => {
    const elems = new Set(slimes.map((s) => s.element));
    return Array.from(elems).sort();
  }, [slimes]);

  const ownedGrades = useMemo(() => {
    const grades = new Set(slimes.map((s) => getSpecies(s.species_id)?.grade).filter(Boolean));
    return GRADES.filter((g) => g === "all" || grades.has(g));
  }, [slimes, getSpecies]);

  // Multi-select handlers
  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    setSelected(new Set(sortedSlimes.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const exitMultiSelect = () => {
    setMultiSelect(false);
    setSelected(new Set());
  };

  const batchFeed = async () => {
    if (!token || selected.size === 0 || batchFeeding) return;
    setBatchFeeding(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selected) {
      const cd = getCooldownRemaining(id, "feed");
      if (cd > 0) { failCount++; continue; }
      try {
        await feedSlime(token, id);
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toastReward(`${successCount}마리에게 먹이를 줬습니다!`, "🍖");
      if (token) fetchSlimes(token);
    }
    if (failCount > 0 && successCount === 0) {
      toastError("쿨타임 중인 슬라임입니다");
    }
    setBatchFeeding(false);
    exitMultiSelect();
  };

  // Hungry slimes count
  const hungryCount = slimes.filter((s) => s.hunger < 30).length;

  const handleSlimeClick = (id: string) => {
    if (multiSelect) {
      toggleSelect(id);
    } else {
      selectSlime(id);
    }
  };

  return (
    <div className="page-content animate-page-enter" style={{ background: "#1A0E08" }}>
      {/* Leather header */}
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

        <div className="px-4 py-3 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            {/* Book icon */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #C9A84C, #8B6914)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 3px rgba(0,0,0,0.3)",
              }}>
              <span className="text-[12px] font-black" style={{ color: "#3D2017" }}>{"&#9830;"}</span>
            </div>
            <h2 className="font-bold text-[15px]" style={{
              color: "#F5E6C8",
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              letterSpacing: "0.05em",
            }}>인벤토리</h2>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-md font-bold tracking-wide" style={{
            background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(139,105,20,0.1))",
            color: "#D4AF37",
            border: "1px solid rgba(139,105,20,0.4)",
            fontFamily: "Georgia, serif",
          }}>
            {slimes.length}<span style={{ opacity: 0.5 }}>/30</span>
          </span>
        </div>

        {/* Gold trim line */}
        <div className="h-px" style={{ background: "linear-gradient(90deg, transparent 5%, #8B6914 30%, #D4AF37 50%, #8B6914 70%, transparent 95%)" }} />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto game-scroll p-3" style={{
        background: "linear-gradient(180deg, #1A0E08 0%, #241510 100%)",
      }}>
        {/* Capacity Expansion Banner */}
        <div className="rounded-lg p-3 mb-3 relative overflow-hidden" style={{
          background: "linear-gradient(160deg, #2C1F15, #1E140D)",
          border: "1.5px solid rgba(139,105,20,0.3)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.05)",
        }}>
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
              <span className="text-lg">{"\uD83D\uDCE6"}</span>
              <div>
                <p className="text-xs font-bold" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>슬라임 인벤토리</p>
                <p className="text-[10px]" style={{ color: "#C9A84C" }}>{slimes.length} / {slimeCapacity}마리</p>
              </div>
            </div>
            {slimeCapacityNextTier && (
              <button
                onClick={async () => {
                  if (!token) return;
                  if (confirm(`인벤토리를 ${slimeCapacityNextTier.to}칸으로 확장하시겠습니까?\n비용: ${slimeCapacityNextTier.gold_cost.toLocaleString()}G${slimeCapacityNextTier.gems_cost > 0 ? ` + ${slimeCapacityNextTier.gems_cost}\uD83D\uDC8E` : ""}`)) {
                    const ok = await expandCapacity(token);
                    if (ok) toastSuccess(`인벤토리가 ${slimeCapacityNextTier.to}칸으로 확장되었습니다!`, "\uD83D\uDCE6");
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
                  {slimeCapacityNextTier.gems_cost > 0 ? ` +${slimeCapacityNextTier.gems_cost}\uD83D\uDC8E` : ""}
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
            }} />
          </div>
        </div>

        {slimes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background: "linear-gradient(135deg, #3D2017, #2C1810)",
                border: "2px solid rgba(139,105,20,0.2)",
              }}>
              <span className="text-2xl">{"🥚"}</span>
            </div>
            <p className="text-sm font-bold mb-1" style={{
              color: "#F5E6C8",
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}>아직 슬라임이 없어요</p>
            <p className="text-[11px] italic" style={{
              color: "rgba(201,168,76,0.4)",
              fontFamily: "Georgia, serif",
            }}>상점에서 알을 구매해보세요!</p>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="relative mb-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름으로 검색..."
                className="w-full px-3 py-2 pl-8 rounded-lg text-[11px] outline-none transition"
                style={{
                  background: "linear-gradient(135deg, rgba(61,32,23,0.6), rgba(44,24,16,0.8))",
                  border: search ? "1px solid rgba(201,168,76,0.4)" : "1px solid rgba(139,105,20,0.15)",
                  color: "#F5E6C8",
                  fontFamily: "Georgia, serif",
                }}
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: "#8B6914" }}>{"🔍"}</span>
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] transition"
                  style={{ color: "rgba(201,168,76,0.4)" }}>
                  {"✕"}
                </button>
              )}
            </div>

            {/* Controls bar */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                {(["level", "grade", "element", "newest"] as SortKey[]).map((key) => (
                  <button key={key} onClick={() => setSortBy(key)}
                    className="text-[9px] px-2 py-1 rounded-md transition-all"
                    style={{
                      background: sortBy === key ? "rgba(201,168,76,0.12)" : "transparent",
                      color: sortBy === key ? "#D4AF37" : "#8B6914",
                      border: sortBy === key ? "1px solid rgba(201,168,76,0.3)" : "1px solid transparent",
                      fontFamily: "Georgia, serif",
                    }}>
                    {key === "level" ? "레벨" : key === "grade" ? "등급" : key === "element" ? "원소" : "최근"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {/* Multi-select toggle */}
                <button onClick={() => multiSelect ? exitMultiSelect() : setMultiSelect(true)}
                  className="text-[9px] px-2 py-1 rounded-md transition-all"
                  style={{
                    background: multiSelect ? "rgba(192,57,43,0.15)" : "transparent",
                    color: multiSelect ? "#E74C3C" : "#8B6914",
                    border: multiSelect ? "1px solid rgba(192,57,43,0.3)" : "1px solid transparent",
                    fontFamily: "Georgia, serif",
                  }}>
                  {multiSelect ? "취소" : "선택"}
                </button>
                <button onClick={() => setViewMode("grid")}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-[10px] transition"
                  style={{
                    background: viewMode === "grid" ? "rgba(201,168,76,0.12)" : "transparent",
                    color: viewMode === "grid" ? "#D4AF37" : "#8B6914",
                    border: viewMode === "grid" ? "1px solid rgba(201,168,76,0.2)" : "1px solid transparent",
                  }}>{"▦"}</button>
                <button onClick={() => setViewMode("compact")}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-[10px] transition"
                  style={{
                    background: viewMode === "compact" ? "rgba(201,168,76,0.12)" : "transparent",
                    color: viewMode === "compact" ? "#D4AF37" : "#8B6914",
                    border: viewMode === "compact" ? "1px solid rgba(201,168,76,0.2)" : "1px solid transparent",
                  }}>{"☰"}</button>
              </div>
            </div>

            {/* Section divider */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #8B6914, transparent)" }} />
              <span className="text-[8px]" style={{ color: "#8B6914" }}>{"◆"}</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914)" }} />
            </div>

            {/* Grade filter — book chapter tabs */}
            {ownedGrades.length > 2 && (
              <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1.5 mb-1 -mx-1 px-1">
                {ownedGrades.map((g) => {
                  const isActive = filterGrade === g;
                  const col = g === "all" ? "#D4AF37" : gradeColors[g] || "#8B6914";
                  const count = g === "all" ? slimes.length : slimes.filter((s) => getSpecies(s.species_id)?.grade === g).length;
                  return (
                    <button key={g} onClick={() => setFilterGrade(g)}
                      className="flex-shrink-0 text-[9px] px-2 py-1 rounded-md transition-all flex items-center gap-1"
                      style={{
                        background: isActive
                          ? "linear-gradient(135deg, rgba(61,32,23,0.8), rgba(44,24,16,0.9))"
                          : "rgba(61,32,23,0.3)",
                        color: isActive ? col : "rgba(201,168,76,0.4)",
                        border: isActive ? `1px solid ${col}60` : "1px solid rgba(139,105,20,0.1)",
                        fontFamily: "Georgia, serif",
                      }}>
                      {g === "all" ? "전체" : gradeNames[g] || g}
                      <span style={{ opacity: 0.5 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Element filter — book tabs */}
            {ownedElements.length > 1 && (
              <div className="flex gap-1 overflow-x-auto no-scrollbar pb-2 mb-2 -mx-1 px-1">
                <button onClick={() => setFilterElement("all")}
                  className="flex-shrink-0 text-[9px] px-2 py-1 rounded-md transition-all"
                  style={{
                    background: filterElement === "all"
                      ? "linear-gradient(135deg, rgba(61,32,23,0.8), rgba(44,24,16,0.9))"
                      : "rgba(61,32,23,0.3)",
                    color: filterElement === "all" ? "#D4AF37" : "rgba(201,168,76,0.4)",
                    border: filterElement === "all" ? "1px solid rgba(201,168,76,0.4)" : "1px solid rgba(139,105,20,0.1)",
                    fontFamily: "Georgia, serif",
                  }}>전체</button>
                {ownedElements.map((elem) => {
                  const count = slimes.filter((s) => s.element === elem).length;
                  return (
                    <button key={elem} onClick={() => setFilterElement(elem)}
                      className="flex-shrink-0 text-[9px] px-2 py-1 rounded-md transition-all flex items-center gap-1"
                      style={{
                        background: filterElement === elem
                          ? "linear-gradient(135deg, rgba(61,32,23,0.8), rgba(44,24,16,0.9))"
                          : "rgba(61,32,23,0.3)",
                        color: filterElement === elem ? elementColors[elem] : "rgba(201,168,76,0.4)",
                        border: filterElement === elem ? `1px solid ${elementColors[elem]}60` : "1px solid rgba(139,105,20,0.1)",
                        fontFamily: "Georgia, serif",
                      }}>
                      {elementNames[elem] || elem} <span style={{ opacity: 0.5 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Multi-select bar */}
            {multiSelect && (
              <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg" style={{
                background: "linear-gradient(135deg, rgba(192,57,43,0.08), rgba(61,32,23,0.6))",
                border: "1px solid rgba(192,57,43,0.25)",
              }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.5)", fontFamily: "Georgia, serif" }}>{selected.size}마리 선택</span>
                  <button onClick={selectAll} className="text-[9px] transition" style={{ color: "#D4AF37", fontFamily: "Georgia, serif" }}>전체선택</button>
                  <button onClick={deselectAll} className="text-[9px] transition" style={{ color: "rgba(245,230,200,0.3)", fontFamily: "Georgia, serif" }}>해제</button>
                </div>
                <button onClick={batchFeed} disabled={selected.size === 0 || batchFeeding}
                  className="px-3 py-1 rounded-md text-[10px] font-bold transition disabled:opacity-30"
                  style={{
                    background: "linear-gradient(135deg, #6B3A2A, #3D2017)",
                    color: "#F5E6C8",
                    border: "1px solid #8B6914",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.3)",
                    fontFamily: "Georgia, serif",
                  }}>
                  {batchFeeding ? "급식 중..." : `일괄 급식 (${selected.size})`}
                </button>
              </div>
            )}

            {/* Hungry alert */}
            {!multiSelect && hungryCount > 0 && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{
                background: "linear-gradient(135deg, rgba(139,105,20,0.08), rgba(61,32,23,0.4))",
                border: "1px solid rgba(139,105,20,0.25)",
              }}>
                <span className="text-sm">{"😋"}</span>
                <span className="text-[10px]" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>배고픈 슬라임 {hungryCount}마리</span>
                <button onClick={() => { setMultiSelect(true); setSelected(new Set(slimes.filter((s) => s.hunger < 30).map((s) => s.id))); }}
                  className="ml-auto text-[9px] font-bold transition"
                  style={{ color: "#D4AF37", fontFamily: "Georgia, serif" }}>
                  선택하기
                </button>
              </div>
            )}

            {/* Grid view */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-3 gap-2 stagger-children">
                {sortedSlimes.map((slime) => {
                  const sp = getSpecies(slime.species_id);
                  const color = elementColors[slime.element] || "#B2BEC3";
                  const gradeColor = sp ? gradeColors[sp.grade] || "#B2BEC3" : "#B2BEC3";
                  const isSelected = selected.has(slime.id);
                  const personality = personalityEmoji[slime.personality] || "";

                  return (
                    <button key={slime.id} onClick={() => handleSlimeClick(slime.id)}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-lg text-center active:scale-95 transition-all relative"
                      style={{
                        background: isSelected
                          ? "linear-gradient(160deg, #3D2D1A 0%, #2A1F14 100%)"
                          : "linear-gradient(160deg, #2C1F15 0%, #1E140D 100%)",
                        border: isSelected
                          ? "2px solid rgba(46,204,113,0.4)"
                          : `1.5px solid rgba(139,105,20,0.15)`,
                        boxShadow: isSelected
                          ? "0 0 12px rgba(46,204,113,0.15), inset 0 1px 0 rgba(139,105,20,0.1)"
                          : "0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(139,105,20,0.05)",
                      }}>
                      {/* Decorative corner accents */}
                      <div className="absolute top-0.5 left-0.5 w-2 h-2 pointer-events-none" style={{ opacity: 0.3 }}>
                        <div className="absolute top-0 left-0 w-full h-px" style={{ background: "#8B6914" }} />
                        <div className="absolute top-0 left-0 w-px h-full" style={{ background: "#8B6914" }} />
                      </div>
                      <div className="absolute top-0.5 right-0.5 w-2 h-2 pointer-events-none" style={{ opacity: 0.3 }}>
                        <div className="absolute top-0 right-0 w-full h-px" style={{ background: "#8B6914" }} />
                        <div className="absolute top-0 right-0 w-px h-full" style={{ background: "#8B6914" }} />
                      </div>

                      {/* Select checkbox */}
                      {multiSelect && (
                        <div className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full flex items-center justify-center z-10" style={{
                          background: isSelected ? "linear-gradient(135deg, #2ECC71, #27AE60)" : "rgba(139,105,20,0.15)",
                          border: isSelected ? "1.5px solid #27AE60" : "1px solid rgba(139,105,20,0.3)",
                        }}>
                          {isSelected && <span className="text-[8px] font-bold" style={{ color: "#F5E6C8" }}>{"✓"}</span>}
                        </div>
                      )}

                      {/* Icon */}
                      <div className="relative">
                        <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{
                          background: `radial-gradient(circle, ${color}15, rgba(61,32,23,0.3) 70%)`,
                          border: `1px solid rgba(139,105,20,0.12)`,
                        }}>
                          <img src={generateSlimeIconSvg(slime.element, 48, sp?.grade, (equippedAccessories[slime.id] || []).map(e => e.svg_overlay).filter(Boolean), slime.species_id)}
                            alt="" className="w-12 h-12" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} draggable={false} />
                        </div>
                        {sp && (
                          <span className="absolute -top-1 -right-1 text-[6px] px-1.5 py-0.5 rounded-sm font-extrabold tracking-wider uppercase" style={{
                            background: `linear-gradient(135deg, ${gradeColor}CC, ${gradeColor}88)`,
                            color: "#fff",
                            boxShadow: `0 1px 4px ${gradeColor}40`,
                            textShadow: "0 1px 1px rgba(0,0,0,0.3)",
                            border: "0.5px solid rgba(139,105,20,0.3)",
                          }}>
                            {(gradeNames[sp.grade] || sp.grade).slice(0, 2)}
                          </span>
                        )}
                        {/* Personality emoji */}
                        {personality && (
                          <span className="absolute -bottom-0.5 -left-0.5 text-[10px]">{personality}</span>
                        )}
                      </div>

                      {/* Name + Level */}
                      <div className="w-full min-w-0">
                        <div className="text-[11px] font-bold truncate leading-tight" style={{
                          color: "#F5E6C8",
                          fontFamily: "Georgia, 'Times New Roman', serif",
                        }}>
                          {slime.name || sp?.name || "???"}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <span className="text-[10px] font-semibold" style={{
                            color: "#D4AF37",
                            fontFamily: "Georgia, serif",
                          }}>Lv.{slime.level}</span>
                          <span className="text-[9px] font-medium" style={{ color: `${color}AA` }}>
                            {elementNames[slime.element]}
                          </span>
                        </div>
                      </div>

                      {/* Stat bars */}
                      <div className="flex gap-0.5 w-full">
                        <MiniDot value={slime.affection} color="#C0392B" />
                        <MiniDot value={slime.hunger} color="#D4AF37" />
                        <MiniDot value={slime.condition} color="#2ECC71" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Compact list view — journal entries */
              <div className="space-y-1.5 stagger-children">
                {sortedSlimes.map((slime) => {
                  const sp = getSpecies(slime.species_id);
                  const color = elementColors[slime.element] || "#B2BEC3";
                  const gradeColor = sp ? gradeColors[sp.grade] || "#B2BEC3" : "#B2BEC3";
                  const isSelected = selected.has(slime.id);
                  const pName = personalityNames[slime.personality] || "";

                  return (
                    <button key={slime.id} onClick={() => handleSlimeClick(slime.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left active:scale-[0.98] transition-all"
                      style={{
                        background: isSelected
                          ? "linear-gradient(90deg, rgba(46,204,113,0.06) 0%, rgba(61,32,23,0.6) 100%)"
                          : "linear-gradient(90deg, rgba(44,31,21,0.9) 0%, rgba(30,20,13,0.9) 100%)",
                        border: isSelected
                          ? "1.5px solid rgba(46,204,113,0.3)"
                          : "1px solid rgba(139,105,20,0.12)",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                      }}>
                      {/* Select checkbox (compact) */}
                      {multiSelect && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{
                          background: isSelected ? "linear-gradient(135deg, #2ECC71, #27AE60)" : "rgba(139,105,20,0.1)",
                          border: isSelected ? "1.5px solid #27AE60" : "1px solid rgba(139,105,20,0.2)",
                        }}>
                          {isSelected && <span className="text-[8px] font-bold" style={{ color: "#F5E6C8" }}>{"✓"}</span>}
                        </div>
                      )}

                      {/* Icon */}
                      <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0" style={{
                        background: `radial-gradient(circle, ${color}12, rgba(61,32,23,0.3))`,
                        border: "1px solid rgba(139,105,20,0.1)",
                      }}>
                        <img src={generateSlimeIconSvg(slime.element, 32, sp?.grade, (equippedAccessories[slime.id] || []).map(e => e.svg_overlay).filter(Boolean), slime.species_id)}
                          alt="" className="w-8 h-8" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }} draggable={false} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold truncate" style={{
                            color: "#F5E6C8",
                            fontFamily: "Georgia, 'Times New Roman', serif",
                          }}>{slime.name || sp?.name || "???"}</span>
                          {sp && (
                            <span className="text-[7px] px-1 py-0.5 rounded-sm font-bold flex-shrink-0" style={{
                              background: `${gradeColor}20`,
                              color: gradeColor,
                              border: `1px solid ${gradeColor}30`,
                            }}>{(gradeNames[sp.grade] || sp.grade).slice(0, 2)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-medium" style={{ color: "#D4AF37", fontFamily: "Georgia, serif" }}>Lv.{slime.level}</span>
                          <span className="text-[9px]" style={{ color }}>{elementNames[slime.element]}</span>
                          {pName && <span className="text-[8px]" style={{ color: "rgba(201,168,76,0.3)" }}>{pName}</span>}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <StatPill value={slime.affection} emoji="❤" color="#C0392B" />
                        <StatPill value={slime.hunger} emoji="💛" color="#D4AF37" warn={slime.hunger < 30} />
                        <StatPill value={slime.condition} emoji="💚" color="#2ECC71" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {sortedSlimes.length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs italic" style={{
                  color: "rgba(201,168,76,0.4)",
                  fontFamily: "Georgia, serif",
                }}>
                  {search ? "검색 결과가 없습니다" : "해당 조건의 슬라임이 없습니다"}
                </p>
              </div>
            )}

            {/* Food Inventory Button */}
            {totalFoodCount > 0 && (
              <button
                onClick={() => setShowFoodPanel(true)}
                className="w-full mt-3 flex items-center gap-3 p-3 rounded-lg transition-all active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, rgba(61,32,23,0.6), rgba(44,24,16,0.8))",
                  border: "1.5px solid rgba(139,105,20,0.25)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.08)",
                }}
              >
                <span className="text-lg">{"\uD83C\uDF56"}</span>
                <div className="flex-1 text-left">
                  <p className="text-xs font-bold" style={{
                    color: "#F5E6C8",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                  }}>먹이 인벤토리</p>
                  <p className="text-[10px]" style={{ color: "rgba(201,168,76,0.4)" }}>{totalFoodCount}개 보유 중</p>
                </div>
                <span className="text-xs" style={{ color: "#8B6914" }}>{"\u2192"}</span>
              </button>
            )}

            {/* Summary footer */}
            <div className="mt-4 pt-3 flex items-center justify-between" style={{
              borderTop: "1px solid rgba(139,105,20,0.1)",
            }}>
              <span className="text-[9px]" style={{ color: "rgba(201,168,76,0.25)", fontFamily: "Georgia, serif" }}>총 {slimes.length}마리 보유</span>
              {sortedSlimes.length !== slimes.length && (
                <span className="text-[9px]" style={{ color: "rgba(201,168,76,0.25)", fontFamily: "Georgia, serif" }}>{sortedSlimes.length}마리 표시 중</span>
              )}
            </div>

            {/* Bottom decoration */}
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3))" }} />
                <span className="text-[10px]" style={{ color: "rgba(139,105,20,0.25)" }}>{"◆"}</span>
                <div className="w-12 h-px" style={{ background: "linear-gradient(90deg, rgba(139,105,20,0.3), transparent)" }} />
              </div>
            </div>
          </>
        )}

        {/* Food Panel Overlay — parchment style */}
        {showFoodPanel && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center backdrop-blur-sm"
            style={{ background: "rgba(26,14,8,0.7)" }}
            onClick={() => { setShowFoodPanel(false); setFeedingSlimeId(null); }}>
            <div className="w-full max-w-md rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto"
              style={{
                background: "linear-gradient(180deg, #F5E6C8 0%, #E8D5B0 100%)",
                border: "1px solid #C9A84C",
                borderBottom: "none",
                boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
              }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4" style={{ borderBottom: "1px solid rgba(139,105,20,0.2)", paddingBottom: "12px" }}>
                <h3 className="font-bold text-sm" style={{
                  color: "#2C1810",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}>{"\uD83C\uDF56"} 먹이 인벤토리</h3>
                <button onClick={() => { setShowFoodPanel(false); setFeedingSlimeId(null); }}
                  className="w-7 h-7 rounded-md flex items-center justify-center transition"
                  style={{
                    background: "rgba(107,58,42,0.1)",
                    border: "1px solid rgba(139,105,20,0.2)",
                    color: "#6B3A2A",
                    fontSize: "12px",
                  }}>{"\u2715"}</button>
              </div>

              {!feedingSlimeId ? (
                <>
                  {/* Food list */}
                  <div className="space-y-2 mb-4">
                    {foodInventory.map((f) => {
                      const info = FOOD_ITEMS[f.item_id];
                      if (!info) return null;
                      return (
                        <div key={f.item_id} className="flex items-center gap-3 p-3 rounded-lg"
                          style={{
                            background: "rgba(255,255,255,0.5)",
                            border: "1px solid rgba(139,105,20,0.2)",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                          }}>
                          <span className="text-xl">{info.icon}</span>
                          <div className="flex-1">
                            <p className="text-xs font-bold" style={{
                              color: "#2C1810",
                              fontFamily: "Georgia, serif",
                            }}>{info.name}</p>
                            <p className="text-[10px]" style={{ color: "#6B3A2A" }}>{info.desc}</p>
                          </div>
                          <span className="font-bold text-sm px-2 py-0.5 rounded-sm" style={{
                            color: "#3D2017",
                            background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(139,105,20,0.1))",
                            border: "1px solid rgba(139,105,20,0.3)",
                            fontFamily: "Georgia, serif",
                          }}>{f.quantity}개</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Select slime to feed */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3))" }} />
                    <p className="text-[11px] font-bold" style={{
                      color: "#6B3A2A",
                      fontFamily: "Georgia, serif",
                    }}>먹이를 줄 슬라임 선택</p>
                    <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(139,105,20,0.3), transparent)" }} />
                  </div>
                  <div className="space-y-1 max-h-[250px] overflow-y-auto game-scroll">
                    {slimes.map((sl) => {
                      const sp = species.find((s) => s.id === sl.species_id);
                      const color = elementColors[sl.element] || "#B2BEC3";
                      const isHungry = sl.hunger < 50;
                      return (
                        <button key={sl.id}
                          onClick={() => setFeedingSlimeId(sl.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition"
                          style={{
                            background: "rgba(255,255,255,0.3)",
                            border: "1px solid rgba(139,105,20,0.12)",
                          }}>
                          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{
                            background: `radial-gradient(circle, ${color}15, rgba(107,58,42,0.06))`,
                            border: "1px solid rgba(139,105,20,0.1)",
                          }}>
                            <img src={generateSlimeIconSvg(sl.element, 24, sp?.grade, undefined, sl.species_id)}
                              alt="" className="w-6 h-6" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }} draggable={false} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold truncate block" style={{
                              color: "#2C1810",
                              fontFamily: "Georgia, serif",
                            }}>{sl.name || sp?.name || "???"}</span>
                            <span className="text-[9px]" style={{ color: "#6B3A2A" }}>Lv.{sl.level}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-10 rounded-full overflow-hidden" style={{
                              background: "rgba(107,58,42,0.1)",
                              border: "1px solid rgba(139,105,20,0.15)",
                            }}>
                              <div className="h-full rounded-full" style={{
                                width: `${sl.hunger}%`,
                                background: isHungry
                                  ? "linear-gradient(90deg, #C0392B, #E74C3C)"
                                  : "linear-gradient(90deg, #8B6914, #D4AF37)",
                              }} />
                            </div>
                            <span className="text-[9px] font-bold" style={{
                              color: isHungry ? "#C0392B" : "#6B3A2A",
                              fontFamily: "Georgia, serif",
                            }}>{sl.hunger}%</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  {/* Apply food to selected slime */}
                  <button onClick={() => setFeedingSlimeId(null)}
                    className="text-[10px] mb-3 transition font-bold" style={{
                      color: "#6B3A2A",
                      fontFamily: "Georgia, serif",
                    }}>{"\u2190"} 돌아가기</button>
                  {(() => {
                    const sl = slimes.find((s) => s.id === feedingSlimeId);
                    const sp = sl ? species.find((s) => s.id === sl.species_id) : null;
                    if (!sl) return null;
                    return (
                      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg"
                        style={{
                          background: "rgba(255,255,255,0.5)",
                          border: "1px solid rgba(139,105,20,0.2)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        }}>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            background: `radial-gradient(circle, ${(elementColors[sl.element] || "#B2BEC3")}15, rgba(107,58,42,0.06))`,
                            border: "1px solid rgba(139,105,20,0.15)",
                          }}>
                          <img src={generateSlimeIconSvg(sl.element, 32, sp?.grade, undefined, sl.species_id)}
                            alt="" className="w-8 h-8" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }} draggable={false} />
                        </div>
                        <div>
                          <p className="text-xs font-bold" style={{
                            color: "#2C1810",
                            fontFamily: "Georgia, serif",
                          }}>{sl.name || sp?.name || "???"}</p>
                          <p className="text-[10px]" style={{ color: "#6B3A2A" }}>만복도: {sl.hunger}% | 친밀도: {sl.affection}%</p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-2">
                    {foodInventory.map((f) => {
                      const info = FOOD_ITEMS[f.item_id];
                      if (!info) return null;
                      const maxQty = f.quantity;
                      const QTY_OPTIONS = [1, 3, 5, 10].filter(q => q <= maxQty);
                      if (maxQty > 10 && !QTY_OPTIONS.includes(maxQty)) QTY_OPTIONS.push(maxQty);
                      return (
                        <div key={f.item_id} className="rounded-lg overflow-hidden"
                          style={{
                            background: "linear-gradient(135deg, rgba(255,255,255,0.5), rgba(232,213,176,0.6))",
                            border: "1px solid rgba(139,105,20,0.25)",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                          }}>
                          <div className="flex items-center gap-3 p-3">
                            <span className="text-xl">{info.icon}</span>
                            <div className="flex-1 text-left">
                              <p className="text-xs font-bold" style={{ color: "#2C1810", fontFamily: "Georgia, serif" }}>{info.name}</p>
                              <p className="text-[10px]" style={{ color: "#6B3A2A" }}>{info.desc}</p>
                            </div>
                            <span className="font-bold text-xs px-2 py-0.5 rounded-sm" style={{
                              color: "#3D2017",
                              background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(139,105,20,0.1))",
                              border: "1px solid rgba(139,105,20,0.3)",
                              fontFamily: "Georgia, serif",
                            }}>{f.quantity}개</span>
                          </div>
                          {/* Quantity selector */}
                          <div className="px-3 pb-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              {QTY_OPTIONS.map((q) => (
                                <button key={q} onClick={() => setFeedQty(q)}
                                  className="flex-1 py-1 rounded-md text-[9px] font-bold transition"
                                  style={{
                                    background: feedQty === q
                                      ? "linear-gradient(135deg, rgba(107,58,42,0.3), rgba(61,32,23,0.2))"
                                      : "rgba(107,58,42,0.08)",
                                    color: feedQty === q ? "#3D2017" : "#6B3A2A",
                                    border: feedQty === q ? "1px solid rgba(139,105,20,0.4)" : "1px solid rgba(139,105,20,0.12)",
                                    fontFamily: "Georgia, serif",
                                  }}>
                                  {q === maxQty ? "전체" : `${q}개`}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={async () => {
                                if (!token || applyingFood) return;
                                setApplyingFood(true);
                                const useQty = Math.min(feedQty, maxQty);
                                let ok: boolean;
                                if (useQty === 1) {
                                  ok = await applyFood(token, f.item_id, feedingSlimeId);
                                } else {
                                  ok = await applyFoodBatch(token, f.item_id, feedingSlimeId, useQty);
                                }
                                if (ok) toastSuccess(`${info.name}을(를) ${useQty}개 먹였습니다!`, info.icon);
                                else toastError("먹이 적용에 실패했습니다");
                                setApplyingFood(false);
                                setFeedQty(1);
                              }}
                              disabled={applyingFood}
                              className="w-full py-2 rounded-md text-[11px] font-bold transition-all active:scale-[0.98]"
                              style={{
                                background: "linear-gradient(135deg, #6B3A2A, #3D2017)",
                                color: "#F5E6C8",
                                border: "1px solid rgba(139,105,20,0.4)",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(139,105,20,0.2)",
                                opacity: applyingFood ? 0.6 : 1,
                                fontFamily: "Georgia, serif",
                              }}>
                              {applyingFood ? "적용 중..." : `${info.icon} ${Math.min(feedQty, maxQty)}개 먹이기`}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniDot({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{
      background: "rgba(139,105,20,0.08)",
      border: "0.5px solid rgba(139,105,20,0.06)",
    }}>
      <div className="h-full rounded-full transition-all duration-300" style={{
        width: `${value}%`,
        background: `linear-gradient(90deg, ${color}80, ${color}CC)`,
      }} />
    </div>
  );
}

function StatPill({ value, emoji, color, warn }: { value: number; emoji: string; color: string; warn?: boolean }) {
  return (
    <span className={`text-[8px] font-medium tabular-nums ${warn ? "animate-pulse" : ""}`}
      style={{
        color: warn ? "#C0392B" : `${color}AA`,
        fontFamily: "Georgia, serif",
      }}>
      {emoji}{value}
    </span>
  );
}
