"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import {
  useGameStore,
  type CollectionSubmitResult,
  type Slime,
  type SlimeSpecies,
} from "@/lib/store/gameStore";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import {
  elementColors,
  gradeColors,
  gradeNames,
  personalityNames,
  elementNames,
} from "@/lib/constants";
import CollectionRewardModal from "./CollectionRewardModal";
import recipesData from "../../../shared/recipes.json";

const elementEggMap: Record<string, string> = {
  fire: "\uBD88\uAF43 \uC54C",
  water: "\uBB3C\uBC29\uC6B8 \uC54C",
  grass: "\uD480\uC78E \uC54C",
  dark: "\uC5B4\uB461 \uC54C",
  ice: "\uC5BC\uC74C \uC54C",
  electric: "\uBC88\uAC1C \uC54C",
  earth: "\uB300\uC9C0 \uC54C",
};

interface RegisterableSlime {
  slime: Slime;
  species: SlimeSpecies;
  personalities: string[];
}

export default function CollectionPage({ onClose }: { onClose: () => void }) {
  const token = useAuthStore((s) => s.accessToken);
  const {
    slimeSets, fetchSlimeSets, collectionEntries, fetchCollectionEntries,
    collectionRequirements, fetchCollectionRequirements,
    species, slimes,
    collectionMilestones, fetchCollectionMilestones, claimCollectionMilestone,
    submitToCollection,
  } = useGameStore();

  const [expandedFaction, setExpandedFaction] = useState<number | null>(null);
  const [claimingMilestone, setClaimingMilestone] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSlime, setConfirmSlime] = useState<{ slime: Slime; species: SlimeSpecies } | null>(null);
  const [rewardData, setRewardData] = useState<{
    result: CollectionSubmitResult;
    species: SlimeSpecies;
    personality: string;
    factionName?: string;
    factionProgress?: { completed: number; total: number };
  } | null>(null);
  const [acquisitionTarget, setAcquisitionTarget] = useState<{ speciesId: number; fromFactionId: number } | null>(null);

  useEffect(() => {
    if (token) {
      if (slimeSets.length === 0) fetchSlimeSets(token);
      fetchCollectionEntries(token);
      fetchCollectionMilestones(token);
      fetchCollectionRequirements(token);
    }
  }, [token, slimeSets.length, fetchSlimeSets, fetchCollectionEntries, fetchCollectionMilestones, fetchCollectionRequirements]);

  const submittedKeySet = useMemo(() => {
    const s = new Set<string>();
    for (const e of collectionEntries) s.add(`${e.species_id}:${e.personality}`);
    return s;
  }, [collectionEntries]);

  const submittedSpeciesSet = useMemo(() => {
    const s = new Set<number>();
    for (const e of collectionEntries) s.add(e.species_id);
    return s;
  }, [collectionEntries]);

  const totalCollected = collectionEntries.length;
  const totalMax = 1200;
  const overallPct = Math.round((totalCollected / totalMax) * 100);

  const registerableSlimes = useMemo(() => {
    const result: RegisterableSlime[] = [];
    for (const sl of slimes) {
      const sp = species.find((s) => s.id === sl.species_id);
      if (!sp) continue;
      const key = `${sl.species_id}:${sl.personality}`;
      if (submittedKeySet.has(key)) continue;
      const reqLevel = collectionRequirements[sp.grade] || 1;
      if (sl.level < reqLevel) continue;
      const registeredPersonalities = collectionEntries
        .filter((e) => e.species_id === sl.species_id)
        .map((e) => e.personality);
      result.push({ slime: sl, species: sp, personalities: registeredPersonalities });
    }
    const seen = new Map<string, RegisterableSlime>();
    for (const r of result) {
      const key = `${r.slime.species_id}:${r.slime.personality}`;
      const existing = seen.get(key);
      if (!existing || r.slime.level > existing.slime.level) seen.set(key, r);
    }
    return Array.from(seen.values());
  }, [slimes, species, submittedKeySet, collectionRequirements, collectionEntries]);

  const handleClaimMilestone = async (milestone: number) => {
    if (!token || claimingMilestone) return;
    setClaimingMilestone(milestone);
    await claimCollectionMilestone(token, milestone);
    setClaimingMilestone(null);
  };

  const handleSubmit = async (sl: Slime, sp: SlimeSpecies) => {
    if (!token || submitting) return;
    setSubmitting(true);
    setConfirmSlime(null);
    const result = await submitToCollection(token, sl.id);
    if (result) {
      const faction = slimeSets.find((s) => s.species_ids.includes(sp.id));
      setRewardData({
        result, species: sp, personality: sl.personality,
        factionName: faction?.name,
        factionProgress: faction ? { completed: faction.completed + 1, total: faction.total } : undefined,
      });
      await fetchCollectionEntries(token);
      await useGameStore.getState().fetchSlimeSets(token);
      await fetchCollectionMilestones(token);
    }
    setSubmitting(false);
  };

  const getAcquisitionInfo = useCallback((speciesId: number) => {
    const sp = species.find((s) => s.id === speciesId);
    if (!sp) return null;
    const sources: { type: string; label: string }[] = [];
    const eggName = elementEggMap[sp.element];
    if (eggName) {
      sources.push({ type: "gacha", label: eggName });
    } else {
      sources.push({ type: "gacha", label: "\uC2AC\uB77C\uC784 \uC54C / \uD504\uB9AC\uBBF8\uC5C4 \uC54C" });
    }
    const matchingRecipes = recipesData.recipes.filter((r: { output: number }) => r.output === speciesId);
    for (const recipe of matchingRecipes) {
      if (recipe.hidden) {
        sources.push({ type: "synthesis", label: "??? + ???" });
      } else {
        const inputA = species.find((s) => s.id === recipe.input_a);
        const inputB = species.find((s) => s.id === recipe.input_b);
        sources.push({ type: "synthesis", label: `${inputA?.name || "???"} + ${inputB?.name || "???"}` });
      }
    }
    return { species: sp, sources };
  }, [species]);

  return (
    <div className="h-full flex flex-col" style={{ background: "#1A0E08" }}>
      {/* Header */}
      <div className="shrink-0 relative" style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 0px)",
        background: "linear-gradient(180deg, #4A2515 0%, #3D2017 50%, #2C1810 100%)",
        borderBottom: "3px solid #8B6914",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
        }} />
        <div className="flex items-center gap-3 px-4 py-3 relative z-10">
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95" style={{
            background: "linear-gradient(135deg, #5A3522, #3D2017)",
            border: "1px solid #8B6914",
            boxShadow: "inset 0 1px 0 rgba(139,105,20,0.3), 0 2px 4px rgba(0,0,0,0.3)",
          }}>
            <span style={{ color: "#C9A84C", fontSize: "14px", fontWeight: "bold" }}>&#x2190;</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{
              background: "linear-gradient(135deg, #C9A84C, #8B6914)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 3px rgba(0,0,0,0.3)",
            }}>
              <span className="text-[12px] font-black" style={{ color: "#3D2017" }}>&#9830;</span>
            </div>
            <h1 className="font-bold text-lg" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif", textShadow: "0 2px 4px rgba(0,0,0,0.5)", letterSpacing: "0.05em" }}>Collection</h1>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-md font-bold ml-auto" style={{
            background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(139,105,20,0.1))",
            color: "#D4AF37", border: "1px solid rgba(139,105,20,0.4)", fontFamily: "Georgia, serif",
          }}>{totalCollected}/{totalMax}</span>
        </div>
        <div className="h-px" style={{ background: "linear-gradient(90deg, transparent 5%, #8B6914 30%, #D4AF37 50%, #8B6914 70%, transparent 95%)" }} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4" style={{ background: "linear-gradient(180deg, #1A0E08 0%, #241510 100%)" }}>
        {/* A) Progress Bar */}
        <div className="relative rounded-xl p-4 mb-4 overflow-hidden" style={{
          background: "linear-gradient(160deg, #3D2017 0%, #2C1810 50%, #1A0E08 100%)",
          border: "2px solid #8B6914", boxShadow: "0 6px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(139,105,20,0.2)",
        }}>
          <div className="absolute inset-2 rounded-lg pointer-events-none" style={{ border: "1px solid rgba(139,105,20,0.15)" }} />
          <div className="flex flex-col items-center relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914)" }} />
              <span className="text-[9px] tracking-[0.25em] font-bold" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>OVERALL PROGRESS</span>
              <div className="w-8 h-px" style={{ background: "linear-gradient(90deg, #8B6914, transparent)" }} />
            </div>
            <div className="w-full">
              <div className="h-3 rounded-full overflow-hidden relative" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(139,105,20,0.3)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)" }}>
                <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${overallPct}%`, background: "linear-gradient(90deg, #8B6914, #C9A84C, #D4AF37)", boxShadow: "0 0 8px rgba(212,175,55,0.4)" }}>
                  <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)", animation: "book-shimmer 4s ease-in-out infinite" }} />
                </div>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] font-bold" style={{ color: "#C9A84C" }}>{totalCollected}/{totalMax}</span>
                <span className="text-[10px]" style={{ color: "rgba(201,168,76,0.5)" }}>{overallPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* B) Registerable Section */}
        {registerableSlimes.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2ECC71, #27AE60)" }}>
                <span className="text-[10px] font-black" style={{ color: "#fff" }}>!</span>
              </div>
              <span className="text-[11px] font-bold" style={{ color: "#2ECC71" }}>{"\uB4F1\uB85D \uAC00\uB2A5"} ({registerableSlimes.length})</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" as const, WebkitOverflowScrolling: "touch" as const }}>
              {registerableSlimes.map((r) => {
                const gc = gradeColors[r.species.grade] || "#B2BEC3";
                const eColor = elementColors[r.species.element] || "#B2BEC3";
                return (
                  <button key={r.slime.id} onClick={() => setConfirmSlime({ slime: r.slime, species: r.species })} disabled={submitting}
                    className="shrink-0 w-[100px] rounded-xl p-2.5 flex flex-col items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: "linear-gradient(160deg, #2C1F15, #1E140D)", border: `1.5px solid ${eColor}40`, boxShadow: `0 0 12px ${eColor}15, 0 2px 8px rgba(0,0,0,0.3)` }}>
                    <img src={generateSlimeIconSvg(r.species.element, 40, r.species.grade, undefined, r.species.id)} alt={r.species.name} className="w-10 h-10" style={{ filter: `drop-shadow(0 2px 4px ${eColor}40)` }} draggable={false} />
                    <p className="text-[10px] font-bold truncate w-full text-center" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>{r.slime.name || r.species.name}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-bold" style={{ color: gc }}>{gradeNames[r.species.grade]}</span>
                      <span className="text-[8px]" style={{ color: "rgba(245,230,200,0.4)" }}>Lv.{r.slime.level}</span>
                    </div>
                    <span className="text-[8px] px-2 py-0.5 rounded font-bold" style={{ background: "linear-gradient(135deg, #2ECC71, #27AE60)", color: "#fff" }}>{"\uB4F1\uB85D"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* D) Milestones */}
        {collectionMilestones.length > 0 && (
          <div className="rounded-xl p-4 mb-4 overflow-hidden" style={{ background: "linear-gradient(160deg, #2C1F15, #1E140D)", border: "1.5px solid rgba(139,105,20,0.25)", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)" }}>
                <span className="text-[10px]" style={{ color: "#3D2017" }}>&#9733;</span>
              </div>
              <span className="text-[10px] tracking-[0.15em] font-bold" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>MILESTONES</span>
            </div>
            {(() => {
              const nextMs = collectionMilestones.find((m) => !m.reached);
              const prevCount = collectionMilestones.filter((m) => m.reached).slice(-1)[0]?.count || 0;
              const nextCount = nextMs?.count || collectionMilestones[collectionMilestones.length - 1].count;
              const pct = nextMs ? Math.min(100, Math.round(((totalCollected - prevCount) / (nextCount - prevCount)) * 100)) : 100;
              return (
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px]" style={{ color: "rgba(201,168,76,0.6)" }}>{nextMs ? `Next: ${nextCount}` : "All milestones reached!"}</span>
                    <span className="text-[9px] font-bold" style={{ color: "#C9A84C" }}>{totalCollected}/{nextCount}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(139,105,20,0.2)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #8B6914, #D4AF37)" }} />
                  </div>
                </div>
              );
            })()}
            <div className="space-y-1.5">
              {collectionMilestones.map((m) => {
                const canClaim = m.reached && !m.claimed;
                return (
                  <div key={m.count} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{
                    background: m.claimed ? "rgba(46,204,113,0.08)" : canClaim ? "rgba(212,175,55,0.1)" : "rgba(0,0,0,0.15)",
                    border: m.claimed ? "1px solid rgba(46,204,113,0.2)" : canClaim ? "1px solid rgba(212,175,55,0.25)" : "1px solid rgba(139,105,20,0.1)",
                    animation: canClaim ? "milestone-glow 2s ease-in-out infinite" : undefined,
                  }}>
                    <div className="w-10 h-8 rounded-md flex items-center justify-center shrink-0" style={{
                      background: m.reached ? "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(139,105,20,0.15))" : "rgba(0,0,0,0.2)",
                      border: `1px solid ${m.reached ? "rgba(201,168,76,0.3)" : "rgba(139,105,20,0.1)"}`,
                    }}>
                      <span className="text-[10px] font-black" style={{ color: m.reached ? "#D4AF37" : "rgba(139,105,20,0.3)" }}>{m.count}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold" style={{ color: m.reached ? "#F5E6C8" : "rgba(245,230,200,0.3)" }}>{m.gold.toLocaleString()} Gold</span>
                        <span className="text-[9px] font-bold" style={{ color: m.reached ? "#74B9FF" : "rgba(116,185,255,0.3)" }}>{m.gems} Gems</span>
                      </div>
                    </div>
                    {m.claimed ? (
                      <span className="text-[9px] font-bold px-2 py-1 rounded" style={{ color: "#2ecc71" }}>&#10003;</span>
                    ) : canClaim ? (
                      <button onClick={() => handleClaimMilestone(m.count)} disabled={claimingMilestone !== null}
                        className="text-[9px] font-bold px-3 py-1.5 rounded-md active:scale-95 transition-transform"
                        style={{ background: "linear-gradient(135deg, #D4AF37, #8B6914)", color: "#3D2017", boxShadow: "0 2px 8px rgba(212,175,55,0.3)", opacity: claimingMilestone === m.count ? 0.6 : 1 }}>
                        {claimingMilestone === m.count ? "..." : "Claim"}
                      </button>
                    ) : (
                      <span className="text-[9px]" style={{ color: "rgba(139,105,20,0.25)" }}>&#128274;</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* C) Faction Accordion */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #8B6914, transparent)" }} />
          <span className="text-[9px] tracking-[0.2em] font-bold" style={{ color: "#8B6914", fontFamily: "Georgia, serif" }}>FACTIONS</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914)" }} />
        </div>

        <div className="space-y-2">
          {slimeSets.map((s, idx) => {
            const pctSet = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
            const isOpen = expandedFaction === s.id;
            return (
              <div key={s.id} style={{ animation: `stagger-slide-in 0.3s ease-out ${idx * 50}ms both` }}>
                <button onClick={() => setExpandedFaction(isOpen ? null : s.id)}
                  className="w-full rounded-lg p-3 text-left transition-all active:scale-[0.98]"
                  style={{
                    background: s.is_complete ? "linear-gradient(160deg, #3D2D1A, #2A1F14)" : "linear-gradient(160deg, #2C1F15, #1E140D)",
                    border: s.is_complete ? "1.5px solid rgba(46,204,113,0.35)" : "1.5px solid rgba(139,105,20,0.2)",
                    boxShadow: s.is_complete ? "0 2px 12px rgba(46,204,113,0.08)" : "0 2px 8px rgba(0,0,0,0.2)",
                    borderRadius: isOpen ? "0.5rem 0.5rem 0 0" : "0.5rem",
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {s.is_complete && (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #2ECC71, #27AE60)", boxShadow: "0 0 6px rgba(46,204,113,0.3)" }}>
                            <span className="text-[7px] font-black" style={{ color: "#F5E6C8" }}>&#10003;</span>
                          </div>
                        )}
                        <span className="font-bold text-[13px] truncate" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>{s.name}</span>
                        <span className="text-[8px] font-bold ml-auto shrink-0 px-1.5 py-0.5 rounded-sm" style={{ background: "rgba(139,105,20,0.1)", color: "#C9A84C", border: "1px solid rgba(139,105,20,0.2)" }}>+{s.bonus_score}pt</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(139,105,20,0.08)", border: "1px solid rgba(139,105,20,0.1)" }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pctSet}%`, background: s.is_complete ? "linear-gradient(90deg, #2ECC71, #27AE60)" : "linear-gradient(90deg, #8B6914, #C9A84C)" }} />
                        </div>
                        <span className="text-[9px] font-bold tabular-nums" style={{ color: s.is_complete ? "#2ECC71" : "#C9A84C", fontFamily: "Georgia, serif" }}>{s.completed}/{s.total}</span>
                        <span className="text-xs transition-transform" style={{ color: "#8B6914", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>&#9656;</span>
                      </div>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="rounded-b-lg px-3 py-3" style={{ background: "linear-gradient(170deg, #F5E6C8 0%, #E8D5B0 40%, #DCC9A3 100%)", border: "1.5px solid rgba(139,105,20,0.3)", borderTop: "none" }}>
                    <p className="text-[9px] italic mb-3 px-1" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>{s.description}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {s.species_ids.map((spId) => {
                        const sp = species.find((ss) => ss.id === spId);
                        const isSubmitted = submittedSpeciesSet.has(spId);
                        const hasSlime = slimes.some((sl) => sl.species_id === spId);
                        const color = sp ? elementColors[sp.element] || "#B2BEC3" : "#636e72";
                        const gc = sp ? gradeColors[sp.grade] || "#B2BEC3" : "#636e72";
                        const regCount = collectionEntries.filter((e) => e.species_id === spId).length;
                        return (
                          <button key={spId} onClick={() => { if (!isSubmitted && !hasSlime && sp) setAcquisitionTarget({ speciesId: spId, fromFactionId: s.id }); }}
                            className="relative rounded-md overflow-hidden transition-all active:scale-95"
                            style={{
                              background: isSubmitted ? "linear-gradient(160deg, #FFF8EC, #F5E6C8)" : hasSlime ? "linear-gradient(160deg, #E8F0FE, #D4E4F8)" : "linear-gradient(160deg, #E8D5B0, #D8C49E)",
                              border: isSubmitted ? "2px solid #C9A84C" : hasSlime ? `2px solid ${color}60` : "2px solid rgba(139,105,20,0.15)",
                            }}>
                            <div className="p-1.5 flex flex-col items-center gap-1">
                              {sp ? (
                                <div className="relative w-10 h-10 flex items-center justify-center">
                                  {isSubmitted || hasSlime ? (
                                    <img src={generateSlimeIconSvg(sp.element, 36, sp.grade, undefined, sp.id)} alt={sp.name} className="w-9 h-9"
                                      style={{ filter: isSubmitted ? "drop-shadow(0 1px 3px rgba(0,0,0,0.2))" : "drop-shadow(0 1px 3px rgba(0,0,0,0.15)) saturate(0.7)" }} draggable={false} />
                                  ) : (
                                    <>
                                      <img src={generateSlimeIconSvg(sp.element, 36, sp.grade, undefined, sp.id)} alt="???" className="w-9 h-9" style={{ filter: "brightness(0) opacity(0.12)" }} draggable={false} />
                                      <span className="absolute text-sm font-black" style={{ color: "rgba(107,58,42,0.25)", fontFamily: "Georgia, serif" }}>?</span>
                                    </>
                                  )}
                                  {isSubmitted && (
                                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #D4AF37, #C9A84C)", border: "1px solid #8B6914" }}>
                                      <span className="text-[7px] font-black" style={{ color: "#3D2017" }}>&#10003;</span>
                                    </div>
                                  )}
                                  {isSubmitted && regCount > 1 && (
                                    <div className="absolute -bottom-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5" style={{ background: "linear-gradient(135deg, #8B6914, #6B5210)", border: "1px solid #C9A84C" }}>
                                      <span className="text-[7px] font-black" style={{ color: "#F5E6C8" }}>x{regCount}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(107,58,42,0.06)", border: "2px dashed rgba(139,105,20,0.15)" }}>
                                  <span className="text-sm" style={{ color: "rgba(139,105,20,0.2)", fontFamily: "Georgia, serif" }}>?</span>
                                </div>
                              )}
                              <p className="text-[9px] font-bold truncate w-full text-center" style={{ color: isSubmitted ? "#2C1810" : hasSlime ? "#2C4A6E" : "rgba(107,58,42,0.3)", fontFamily: "Georgia, serif" }}>
                                {isSubmitted ? (sp?.name || "???") : hasSlime ? (sp?.name || "???") : "???"}
                              </p>
                              {sp && (
                                <span className="text-[7px] px-1 py-px rounded font-bold" style={{ background: `${gc}15`, color: isSubmitted ? gc : `${gc}80`, border: `1px solid ${gc}25` }}>
                                  {gradeNames[sp.grade]}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {s.is_complete && s.buff && Object.keys(s.buff).length > 0 && (
                      <div className="mt-3 rounded-md p-2.5 text-center" style={{ background: "rgba(46,204,113,0.08)", border: "1px solid rgba(46,204,113,0.2)" }}>
                        <span className="text-[9px] font-bold" style={{ color: "#2ECC71" }}>Set Bonus: +{s.bonus_score}pt</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {slimeSets.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #3D2017, #2C1810)", border: "2px solid rgba(139,105,20,0.2)" }}>
              <span className="text-2xl" style={{ color: "rgba(139,105,20,0.3)" }}>&#9830;</span>
            </div>
            <p className="text-sm italic" style={{ color: "rgba(201,168,76,0.3)", fontFamily: "Georgia, serif" }}>Loading collection data...</p>
          </div>
        )}
        <div className="h-8" />
      </div>

      {/* Confirm submit modal */}
      {confirmSlime && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(26,14,8,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setConfirmSlime(null)}>
          <div className="w-full max-w-md rounded-t-2xl overflow-hidden" style={{ background: "linear-gradient(180deg, #F5E6C8 0%, #E8D5B0 100%)", border: "1px solid #C9A84C", borderBottom: "none", boxShadow: "0 -4px 24px rgba(0,0,0,0.4)", animation: "slide-up 0.3s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center pt-3 pb-2 px-5" style={{ borderBottom: "1px solid rgba(139,105,20,0.2)" }}>
              <div className="w-10 h-1 rounded-full mb-2" style={{ background: "#C9A84C" }} />
              <h3 className="font-bold text-sm" style={{ color: "#2C1810", fontFamily: "Georgia, serif" }}>{"\uCEEC\uB809\uC158 \uB4F1\uB85D"}</h3>
            </div>
            <div className="flex flex-col items-center py-5 px-5 gap-3">
              <img src={generateSlimeIconSvg(confirmSlime.species.element, 64, confirmSlime.species.grade, undefined, confirmSlime.species.id)} alt={confirmSlime.species.name} className="w-16 h-16" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }} draggable={false} />
              <div className="text-center">
                <p className="text-sm font-bold" style={{ color: "#2C1810", fontFamily: "Georgia, serif" }}>{confirmSlime.slime.name || confirmSlime.species.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#6B3A2A" }}>Lv.{confirmSlime.slime.level} | {gradeNames[confirmSlime.species.grade]} | {personalityNames[confirmSlime.slime.personality] || confirmSlime.slime.personality}</p>
              </div>
              <p className="text-[10px] text-center italic px-4" style={{ color: "#C0392B" }}>{"\uB4F1\uB85D \uC2DC \uC2AC\uB77C\uC784\uC774 \uC0AD\uC81C\uB429\uB2C8\uB2E4. \uB4F1\uAE09\uBCC4 \uBCF4\uC0C1\uC774 \uC9C0\uAE09\uB429\uB2C8\uB2E4."}</p>
              <div className="flex gap-2 w-full">
                <button onClick={() => setConfirmSlime(null)} className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95" style={{ background: "rgba(107,58,42,0.1)", color: "#6B3A2A", border: "1px solid rgba(107,58,42,0.2)" }}>{"\uCDE8\uC18C"}</button>
                <button onClick={() => handleSubmit(confirmSlime.slime, confirmSlime.species)} disabled={submitting} className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #C0392B, #E74C3C)", color: "#F5E6C8", border: "1px solid #A93226", boxShadow: "0 2px 8px rgba(192,57,43,0.3)" }}>{submitting ? "..." : "\uB4F1\uB85D\uD558\uAE30"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rewardData && (
        <CollectionRewardModal speciesName={rewardData.species.name} speciesId={rewardData.species.id} element={rewardData.species.element} grade={rewardData.species.grade} personality={rewardData.personality} goldReward={rewardData.result.gold_reward} gemReward={rewardData.result.gem_reward} isFirstOfSpecies={rewardData.result.is_first_of_species} factionName={rewardData.factionName} factionProgress={rewardData.factionProgress} hasMoreRegisterable={registerableSlimes.length > 1} onClose={() => setRewardData(null)} onNextRegister={() => setRewardData(null)} />
      )}

      {/* Acquisition guide bottom sheet */}
      {acquisitionTarget && (() => {
        const info = getAcquisitionInfo(acquisitionTarget.speciesId);
        if (!info) return null;
        const sp = info.species;
        const gc = gradeColors[sp.grade] || "#B2BEC3";
        const isKnown = submittedSpeciesSet.has(sp.id);
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(26,14,8,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setAcquisitionTarget(null)}>
            <div className="w-full max-w-md rounded-t-2xl overflow-hidden" style={{ background: "linear-gradient(180deg, #2C1810 0%, #1A0E08 100%)", border: "1px solid rgba(139,105,20,0.3)", borderBottom: "none", boxShadow: "0 -4px 24px rgba(0,0,0,0.5)", animation: "slide-up 0.3s ease-out" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col items-center pt-3 pb-2 px-5" style={{ borderBottom: "1px solid rgba(139,105,20,0.15)" }}>
                <div className="w-10 h-1 rounded-full mb-2" style={{ background: "rgba(139,105,20,0.3)" }} />
                <span className="text-[9px] tracking-wider font-bold" style={{ color: "#8B6914" }}>{"\uD68D\uB4DD \uBC29\uBC95"}</span>
              </div>
              <div className="flex flex-col items-center py-5 px-5 gap-3">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <img src={generateSlimeIconSvg(sp.element, 56, sp.grade, undefined, sp.id)} alt={isKnown ? sp.name : "???"} className="w-14 h-14" style={{ filter: isKnown ? "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" : "brightness(0) opacity(0.2)" }} draggable={false} />
                  {!isKnown && <span className="absolute text-2xl font-black" style={{ color: "rgba(139,105,20,0.3)", fontFamily: "Georgia, serif" }}>?</span>}
                </div>
                <div className="text-center">
                  <p className="text-base font-bold" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>{isKnown ? sp.name : "???"}</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${gc}20`, color: gc, border: `1px solid ${gc}40` }}>{gradeNames[sp.grade]}</span>
                    <span className="text-[10px]" style={{ color: "rgba(245,230,200,0.5)" }}>{elementNames[sp.element] || sp.element}</span>
                  </div>
                </div>
                <div className="w-full space-y-2 mt-2">
                  {info.sources.map((src, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: "rgba(139,105,20,0.08)", border: "1px solid rgba(139,105,20,0.15)" }}>
                      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: src.type === "gacha" ? "linear-gradient(135deg, #FFEAA7, #FDCB6E)" : "linear-gradient(135deg, #A29BFE, #6C5CE7)" }}>
                        <span className="text-[11px]">{src.type === "gacha" ? "\uD83E\uDD5A" : "\u2697\uFE0F"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold" style={{ color: "#F5E6C8" }}>{src.type === "gacha" ? "\uAC00\uCC28" : "\uD569\uC131"}</p>
                        <p className="text-[9px] truncate" style={{ color: "rgba(201,168,76,0.6)" }}>{src.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-5 pb-5">
                <button onClick={() => setAcquisitionTarget(null)} className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95" style={{ background: "linear-gradient(135deg, #3D2017, #2C1810)", color: "#C9A84C", border: "1px solid rgba(139,105,20,0.3)" }}>{"\uB2EB\uAE30"}</button>
              </div>
            </div>
          </div>
        );
      })()}

      <style jsx>{`
        @keyframes stagger-slide-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes book-shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes milestone-glow {
          0%, 100% { box-shadow: 0 0 4px rgba(212,175,55,0.2); }
          50% { box-shadow: 0 0 12px rgba(212,175,55,0.4); }
        }
      `}</style>
    </div>
  );
}
