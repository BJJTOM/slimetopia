"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore, type SlimeSetProgress } from "@/lib/store/gameStore";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { elementColors, gradeColors, gradeNames } from "@/lib/constants";
import { authApi } from "@/lib/api/client";
import { toastSuccess, toastError } from "@/components/ui/Toast";

interface DonateCandidate {
  slimeId: string;
  name: string;
  element: string;
  grade: string;
  level: number;
  speciesId: number;
}

export default function CollectionPage({ onClose }: { onClose: () => void }) {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const {
    slimeSets, fetchSlimeSets, collectionEntries, fetchCollectionEntries,
    species, slimes, equippedAccessories,
    collectionMilestones, fetchCollectionMilestones, claimCollectionMilestone,
  } = useGameStore();

  const [selectedSet, setSelectedSet] = useState<SlimeSetProgress | null>(null);
  const [donateTarget, setDonateTarget] = useState<{ speciesId: number; setId: number } | null>(null);
  const [donating, setDonating] = useState(false);
  const [showDonateEffect, setShowDonateEffect] = useState<number | null>(null);

  const [claimingMilestone, setClaimingMilestone] = useState<number | null>(null);

  useEffect(() => {
    if (token) {
      if (slimeSets.length === 0) fetchSlimeSets(token);
      fetchCollectionEntries(token);
      fetchCollectionMilestones(token);
    }
  }, [token, slimeSets.length, fetchSlimeSets, fetchCollectionEntries, fetchCollectionMilestones]);

  const handleClaimMilestone = async (milestone: number) => {
    if (!token || claimingMilestone) return;
    setClaimingMilestone(milestone);
    await claimCollectionMilestone(token, milestone);
    setClaimingMilestone(null);
  };

  // Map: speciesId -> submitted?
  const submittedMap = useMemo(() => {
    const map = new Set<number>();
    for (const e of collectionEntries) {
      map.add(e.species_id);
    }
    return map;
  }, [collectionEntries]);

  // Get donate candidates for a species
  const getDonationCandidates = useCallback((speciesId: number): DonateCandidate[] => {
    return slimes
      .filter((s) => s.species_id === speciesId)
      .map((s) => {
        const sp = species.find((sp) => sp.id === s.species_id);
        return {
          slimeId: s.id,
          name: s.name || sp?.name || "???",
          element: s.element,
          grade: sp?.grade || "common",
          level: s.level,
          speciesId: s.species_id,
        };
      });
  }, [slimes, species]);

  const handleDonate = async (slimeId: string) => {
    if (!token || donating) return;
    setDonating(true);
    try {
      const success = await useGameStore.getState().submitToCollection(token, slimeId);
      if (success) {
        const sp = slimes.find((s) => s.id === slimeId);
        setShowDonateEffect(sp?.species_id ?? null);
        setTimeout(() => setShowDonateEffect(null), 1500);
        toastSuccess("Collection entry recorded!");
        await fetchCollectionEntries(token);
        await useGameStore.getState().fetchSlimes(token);
        await fetchSlimeSets(token);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Donation failed";
      toastError(msg);
    } finally {
      setDonating(false);
      setDonateTarget(null);
    }
  };

  // Total stats
  const totalSets = slimeSets.length;
  const completedSets = slimeSets.filter((s) => s.is_complete).length;
  const totalProgress = slimeSets.reduce((a, s) => a + s.completed, 0);
  const totalRequired = slimeSets.reduce((a, s) => a + s.total, 0);
  const overallPct = totalRequired > 0 ? Math.round((totalProgress / totalRequired) * 100) : 0;

  // ===================== DETAIL VIEW (BOOK PAGES) =====================
  if (selectedSet) {
    const pctSet = selectedSet.total > 0 ? Math.round((selectedSet.completed / selectedSet.total) * 100) : 0;
    return (
      <div className="h-full flex flex-col" style={{ background: "#1A0E08" }}>
        {/* Book page header — looks like a journal header strip */}
        <div className="shrink-0 relative"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 0px)",
            background: "linear-gradient(180deg, #3D2017 0%, #2C1810 100%)",
            borderBottom: "3px double #8B6914",
          }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => { setSelectedSet(null); setDonateTarget(null); }}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #5A3522, #3D2017)",
                border: "1px solid #8B6914",
                boxShadow: "inset 0 1px 0 rgba(139,105,20,0.3)",
              }}>
              <span style={{ color: "#C9A84C", fontSize: "14px", fontWeight: "bold" }}>&#x2190;</span>
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-sm truncate" style={{
                color: "#F5E6C8",
                fontFamily: "Georgia, 'Times New Roman', serif",
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              }}>{selectedSet.name}</h2>
              <p className="text-[10px] mt-0.5" style={{ color: "#C9A84C" }}>
                {selectedSet.completed}/{selectedSet.total} collected
              </p>
            </div>
            {selectedSet.is_complete && (
              <div className="relative px-3 py-1.5 rounded-sm"
                style={{
                  background: "rgba(46,204,113,0.12)",
                  border: "2px solid #2ECC71",
                  boxShadow: "0 0 8px rgba(46,204,113,0.2), inset 0 0 6px rgba(46,204,113,0.1)",
                  transform: "rotate(-3deg)",
                }}>
                <span className="text-[10px] font-black tracking-widest" style={{ color: "#2ECC71" }}>COMPLETE</span>
              </div>
            )}
          </div>
        </div>

        {/* Book pages area */}
        <div className="flex-1 overflow-y-auto" style={{ background: "#1A0E08" }}>
          {/* Parchment page */}
          <div className="mx-3 mt-3 mb-3 rounded-lg relative"
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

            {/* Ornamental top border on page */}
            <div className="flex items-center justify-center py-3 px-6" style={{ borderBottom: "1px solid rgba(139,105,20,0.2)" }}>
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914, transparent)" }} />
                <span className="text-[9px] tracking-[0.2em] font-bold" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>
                  FIELD JOURNAL
                </span>
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914, transparent)" }} />
              </div>
            </div>

            {/* Progress section on page */}
            <div className="px-5 py-4">
              <div className="rounded-lg p-3 mb-1" style={{
                background: "linear-gradient(135deg, rgba(139,105,20,0.08), rgba(107,58,42,0.06))",
                border: "1px dashed rgba(139,105,20,0.3)",
              }}>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-bold" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>Progress</span>
                  <span className="text-[11px] font-black" style={{ color: "#3D2017" }}>{pctSet}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{
                  background: "rgba(61,32,23,0.12)",
                  border: "1px solid rgba(139,105,20,0.2)",
                }}>
                  <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                    style={{
                      width: `${pctSet}%`,
                      background: selectedSet.is_complete
                        ? "linear-gradient(90deg, #2ECC71, #27AE60)"
                        : "linear-gradient(90deg, #C9A84C, #D4AF37)",
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3)`,
                    }}>
                    {/* Shine effect on progress bar */}
                    <div className="absolute inset-0" style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                      animation: "book-shimmer 3s ease-in-out infinite",
                    }} />
                  </div>
                </div>
                <p className="text-[9px] mt-2 italic" style={{ color: "#8B6914" }}>{selectedSet.description}</p>
                {selectedSet.buff && Object.keys(selectedSet.buff).length > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-sm"
                    style={{ background: "rgba(139,105,20,0.1)", border: "1px solid rgba(139,105,20,0.25)" }}>
                    <span className="text-[8px] font-bold" style={{ color: "#6B3A2A" }}>
                      Set Bonus: +{selectedSet.bonus_score}pt
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Species grid — bestiary entries */}
            <div className="px-4 pb-5">
              <div className="grid grid-cols-3 gap-2.5">
                {selectedSet.species_ids.map((spId, idx) => {
                  const sp = species.find((s) => s.id === spId);
                  const isSubmitted = submittedMap.has(spId);
                  const hasCandidate = slimes.some((s) => s.species_id === spId);
                  const isEffecting = showDonateEffect === spId;
                  const color = sp ? (elementColors[sp.element] || "#B2BEC3") : "#636e72";
                  const gColor = sp ? (gradeColors[sp.grade] || "#B2BEC3") : "#636e72";

                  return (
                    <div
                      key={spId}
                      className="relative rounded-md overflow-hidden transition-all"
                      style={{
                        animation: `codex-stagger 0.3s ease-out ${idx * 40}ms both`,
                        background: isSubmitted
                          ? "linear-gradient(160deg, #FFF8EC, #F5E6C8)"
                          : "linear-gradient(160deg, #E8D5B0, #D8C49E)",
                        border: isSubmitted
                          ? "2px solid #C9A84C"
                          : "2px solid rgba(139,105,20,0.2)",
                        boxShadow: isEffecting
                          ? "0 0 16px rgba(212,175,55,0.6), inset 0 0 12px rgba(212,175,55,0.2)"
                          : isSubmitted
                            ? "0 2px 6px rgba(0,0,0,0.12), inset 0 0 10px rgba(139,105,20,0.05)"
                            : "0 1px 3px rgba(0,0,0,0.08)",
                      }}
                    >
                      {/* Decorative corner flourishes for submitted entries */}
                      {isSubmitted && (
                        <>
                          <div className="absolute top-0.5 left-0.5 w-3 h-3 pointer-events-none" style={{ opacity: 0.4 }}>
                            <div className="absolute top-0 left-0 w-full h-px" style={{ background: "#8B6914" }} />
                            <div className="absolute top-0 left-0 w-px h-full" style={{ background: "#8B6914" }} />
                          </div>
                          <div className="absolute top-0.5 right-0.5 w-3 h-3 pointer-events-none" style={{ opacity: 0.4 }}>
                            <div className="absolute top-0 right-0 w-full h-px" style={{ background: "#8B6914" }} />
                            <div className="absolute top-0 right-0 w-px h-full" style={{ background: "#8B6914" }} />
                          </div>
                          <div className="absolute bottom-0.5 left-0.5 w-3 h-3 pointer-events-none" style={{ opacity: 0.4 }}>
                            <div className="absolute bottom-0 left-0 w-full h-px" style={{ background: "#8B6914" }} />
                            <div className="absolute bottom-0 left-0 w-px h-full" style={{ background: "#8B6914" }} />
                          </div>
                          <div className="absolute bottom-0.5 right-0.5 w-3 h-3 pointer-events-none" style={{ opacity: 0.4 }}>
                            <div className="absolute bottom-0 right-0 w-full h-px" style={{ background: "#8B6914" }} />
                            <div className="absolute bottom-0 right-0 w-px h-full" style={{ background: "#8B6914" }} />
                          </div>
                        </>
                      )}

                      {/* Donate effect overlay */}
                      {isEffecting && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-md pointer-events-none"
                          style={{ background: "rgba(212,175,55,0.2)", animation: "donate-flash 1.5s ease-out forwards" }}>
                          <span className="text-2xl" style={{ animation: "donate-star 1.5s ease-out forwards" }}>&#9733;</span>
                        </div>
                      )}

                      <div className="p-2.5 flex flex-col items-center gap-1.5 relative z-10">
                        {/* Slime illustration area */}
                        {sp ? (
                          <div className="relative w-14 h-14 flex items-center justify-center rounded-full"
                            style={{
                              background: isSubmitted
                                ? `radial-gradient(circle, ${color}15, transparent 70%)`
                                : "radial-gradient(circle, rgba(0,0,0,0.06), transparent 70%)",
                            }}>
                            {isSubmitted ? (
                              <img
                                src={generateSlimeIconSvg(sp.element, 48, sp.grade, undefined, sp.id)}
                                alt={sp.name}
                                className="w-12 h-12"
                                style={{
                                  filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.2))`,
                                }}
                                draggable={false}
                              />
                            ) : (
                              /* Mysterious silhouette */
                              <div className="relative w-12 h-12 flex items-center justify-center">
                                <img
                                  src={generateSlimeIconSvg(sp.element, 48, sp.grade, undefined, sp.id)}
                                  alt="???"
                                  className="w-12 h-12"
                                  style={{
                                    filter: "brightness(0) opacity(0.15)",
                                  }}
                                  draggable={false}
                                />
                                <span className="absolute text-lg font-black" style={{
                                  color: "rgba(107,58,42,0.3)",
                                  fontFamily: "Georgia, serif",
                                  textShadow: "0 1px 0 rgba(255,255,255,0.3)",
                                }}>?</span>
                              </div>
                            )}
                            {/* Collected seal stamp */}
                            {isSubmitted && (
                              <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                                style={{
                                  background: "linear-gradient(135deg, #D4AF37, #C9A84C)",
                                  border: "1.5px solid #8B6914",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                }}>
                                <span className="text-[8px] font-black" style={{ color: "#3D2017" }}>&#10003;</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-full flex items-center justify-center"
                            style={{
                              background: "rgba(107,58,42,0.06)",
                              border: "2px dashed rgba(139,105,20,0.15)",
                            }}>
                            <span className="text-lg font-bold" style={{ color: "rgba(139,105,20,0.2)", fontFamily: "Georgia, serif" }}>?</span>
                          </div>
                        )}

                        {/* Species name — ink-style text */}
                        <div className="text-center w-full">
                          <p className="text-[12px] font-bold truncate" style={{
                            color: isSubmitted ? "#2C1810" : "rgba(107,58,42,0.35)",
                            fontFamily: "Georgia, 'Times New Roman', serif",
                          }}>
                            {isSubmitted ? (sp?.name || "???") : (sp ? "???" : "Unknown")}
                          </p>
                          {sp && isSubmitted && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-sm font-bold inline-block mt-0.5"
                              style={{
                                background: `${gColor}20`,
                                color: gColor,
                                border: `1px solid ${gColor}40`,
                              }}>
                              {gradeNames[sp.grade] || sp.grade}
                            </span>
                          )}
                          {sp && !isSubmitted && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-sm font-bold inline-block mt-0.5"
                              style={{
                                background: "rgba(107,58,42,0.06)",
                                color: "rgba(107,58,42,0.3)",
                                border: "1px solid rgba(107,58,42,0.1)",
                              }}>
                              {gradeNames[sp.grade] || sp.grade}
                            </span>
                          )}
                        </div>

                        {/* Donate button — wax seal style */}
                        {!isSubmitted && hasCandidate && (
                          <button
                            onClick={() => setDonateTarget({ speciesId: spId, setId: selectedSet.id })}
                            className="w-full py-1.5 rounded-md text-[10px] font-bold tracking-wide transition-all active:scale-95"
                            style={{
                              background: "linear-gradient(135deg, #6B3A2A, #3D2017)",
                              color: "#F5E6C8",
                              border: "1px solid #8B6914",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.3)",
                              fontFamily: "Georgia, serif",
                              letterSpacing: "0.05em",
                            }}
                          >
                            제출하기
                          </button>
                        )}
                        {!isSubmitted && !hasCandidate && sp && (
                          <span className="text-[9px] italic" style={{ color: "rgba(107,58,42,0.3)", fontFamily: "Georgia, serif" }}>
                            미보유
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Set buff display — special journal note */}
            {selectedSet.is_complete && selectedSet.buff && Object.keys(selectedSet.buff).length > 0 && (
              <div className="mx-5 mb-5 rounded-md p-4 relative"
                style={{
                  background: "linear-gradient(135deg, rgba(46,204,113,0.08), rgba(39,174,96,0.04))",
                  border: "2px solid rgba(46,204,113,0.3)",
                  borderStyle: "double",
                }}>
                {/* Wax seal decoration */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle at 35% 35%, #E74C3C, #C0392B)",
                    border: "2px solid #A93226",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  }}>
                  <span className="text-[8px] font-black" style={{ color: "#F5E6C8" }}>&#9733;</span>
                </div>
                <p className="text-[11px] font-bold text-center mt-1 mb-1" style={{
                  color: "#2C1810",
                  fontFamily: "Georgia, serif",
                }}>Set Bonus Activated</p>
                <p className="text-[9px] text-center" style={{ color: "#6B3A2A" }}>
                  {Object.entries(selectedSet.buff).map(([k, v]) => `${k}: +${v}`).join(", ")}
                </p>
              </div>
            )}

            {/* Bottom page number decoration */}
            <div className="flex items-center justify-center py-3 px-6" style={{ borderTop: "1px solid rgba(139,105,20,0.15)" }}>
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3), transparent)" }} />
                <span className="text-[8px]" style={{ color: "#8B6914", fontFamily: "Georgia, serif" }}>
                  -- {selectedSet.completed} / {selectedSet.total} --
                </span>
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3), transparent)" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Donate modal — styled as a parchment overlay */}
        {donateTarget && (() => {
          const candidates = getDonationCandidates(donateTarget.speciesId);
          const sp = species.find((s) => s.id === donateTarget.speciesId);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" onClick={() => setDonateTarget(null)}
              style={{ background: "rgba(26,14,8,0.7)" }}>
              <div className="w-[90%] max-w-sm rounded-2xl max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}
                style={{
                  background: "linear-gradient(180deg, #F5E6C8 0%, #E8D5B0 100%)",
                  border: "1px solid #C9A84C",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                }}>
                <div className="flex flex-col items-center pt-3 pb-2 px-5" style={{ borderBottom: "1px solid rgba(139,105,20,0.2)" }}>
                  <div className="w-10 h-1 rounded-full mb-2" style={{ background: "#C9A84C" }} />
                  <h3 className="font-bold text-sm" style={{
                    color: "#2C1810",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                  }}>
                    {sp?.name || "슬라임"} 제출
                  </h3>
                  <p className="text-[10px] mt-0.5 italic" style={{ color: "#6B3A2A" }}>
                    제출한 슬라임은 인벤토리에서 삭제됩니다
                  </p>
                </div>
                <div className="px-5 py-4 space-y-2 max-h-[50vh] overflow-y-auto">
                  {candidates.map((c) => (
                    <button
                      key={c.slimeId}
                      onClick={() => handleDonate(c.slimeId)}
                      disabled={donating}
                      className="w-full flex items-center gap-3 p-3 rounded-lg transition-all active:scale-[0.98] disabled:opacity-40"
                      style={{
                        background: "rgba(255,255,255,0.5)",
                        border: "1px solid rgba(139,105,20,0.2)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      }}
                    >
                      <img src={generateSlimeIconSvg(c.element, 36, c.grade, undefined, c.speciesId)} alt="" className="w-9 h-9"
                        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }} />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: "#2C1810", fontFamily: "Georgia, serif" }}>{c.name}</p>
                        <p className="text-[10px]" style={{ color: "#6B3A2A" }}>Lv.{c.level}</p>
                      </div>
                      <span className="text-[10px] px-3 py-1 rounded-md font-bold"
                        style={{
                          background: "linear-gradient(135deg, #C0392B, #E74C3C)",
                          color: "#F5E6C8",
                          border: "1px solid #A93226",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          fontFamily: "Georgia, serif",
                        }}>
                        {donating ? "..." : "제출하기"}
                      </span>
                    </button>
                  ))}
                  {candidates.length === 0 && (
                    <p className="text-xs text-center py-4 italic" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>
                      제출 가능한 슬라임이 없습니다
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <style jsx>{`
          @keyframes donate-flash {
            0% { opacity: 1; }
            100% { opacity: 0; }
          }
          @keyframes donate-star {
            0% { transform: scale(0.5) rotate(0deg); opacity: 1; }
            50% { transform: scale(1.5) rotate(180deg); opacity: 1; }
            100% { transform: scale(2) rotate(360deg); opacity: 0; }
          }
          @keyframes book-shimmer {
            0%, 100% { transform: translateX(-100%); }
            50% { transform: translateX(200%); }
          }
          @keyframes codex-stagger {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ===================== MAIN VIEW (BOOK COVER) =====================
  return (
    <div className="h-full flex flex-col" style={{ background: "#1A0E08" }}>
      {/* Book cover top — leather header */}
      <div className="shrink-0 relative"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 0px)",
          background: "linear-gradient(180deg, #4A2515 0%, #3D2017 50%, #2C1810 100%)",
          borderBottom: "3px solid #8B6914",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}>
        {/* Leather texture overlay via gradient noise */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
        }} />

        <div className="flex items-center gap-3 px-4 py-3 relative z-10">
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #5A3522, #3D2017)",
              border: "1px solid #8B6914",
              boxShadow: "inset 0 1px 0 rgba(139,105,20,0.3), 0 2px 4px rgba(0,0,0,0.3)",
            }}>
            <span style={{ color: "#C9A84C", fontSize: "14px", fontWeight: "bold" }}>&#x2190;</span>
          </button>
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
            }}>Collection</h1>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-md font-bold ml-auto"
            style={{
              background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(139,105,20,0.1))",
              color: "#D4AF37",
              border: "1px solid rgba(139,105,20,0.4)",
              fontFamily: "Georgia, serif",
            }}>
            {completedSets}/{totalSets} Sets
          </span>
        </div>

        {/* Gold trim line */}
        <div className="h-px" style={{ background: "linear-gradient(90deg, transparent 5%, #8B6914 30%, #D4AF37 50%, #8B6914 70%, transparent 95%)" }} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4" style={{ background: "linear-gradient(180deg, #1A0E08 0%, #241510 100%)" }}>
        {/* Cover ornamental badge — overall progress */}
        <div className="relative rounded-xl p-5 mb-5 overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #3D2017 0%, #2C1810 50%, #1A0E08 100%)",
            border: "2px solid #8B6914",
            boxShadow: "0 6px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(139,105,20,0.2)",
          }}>
          {/* Decorative border inner frame */}
          <div className="absolute inset-2 rounded-lg pointer-events-none"
            style={{ border: "1px solid rgba(139,105,20,0.15)" }} />

          {/* Corner ornaments */}
          <div className="absolute top-1 left-1 w-5 h-5 pointer-events-none">
            <div className="absolute top-0 left-1 w-3 h-px" style={{ background: "#C9A84C" }} />
            <div className="absolute top-1 left-0 w-px h-3" style={{ background: "#C9A84C" }} />
          </div>
          <div className="absolute top-1 right-1 w-5 h-5 pointer-events-none">
            <div className="absolute top-0 right-1 w-3 h-px" style={{ background: "#C9A84C" }} />
            <div className="absolute top-1 right-0 w-px h-3" style={{ background: "#C9A84C" }} />
          </div>
          <div className="absolute bottom-1 left-1 w-5 h-5 pointer-events-none">
            <div className="absolute bottom-0 left-1 w-3 h-px" style={{ background: "#C9A84C" }} />
            <div className="absolute bottom-1 left-0 w-px h-3" style={{ background: "#C9A84C" }} />
          </div>
          <div className="absolute bottom-1 right-1 w-5 h-5 pointer-events-none">
            <div className="absolute bottom-0 right-1 w-3 h-px" style={{ background: "#C9A84C" }} />
            <div className="absolute bottom-1 right-0 w-px h-3" style={{ background: "#C9A84C" }} />
          </div>

          {/* Central ornamental badge */}
          <div className="flex flex-col items-center relative z-10">
            {/* Diamond ornament */}
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3 relative"
              style={{
                background: "radial-gradient(circle at 40% 35%, #4A2515, #2C1810)",
                border: "2px solid #C9A84C",
                boxShadow: "0 0 20px rgba(201,168,76,0.15), inset 0 0 15px rgba(0,0,0,0.3)",
              }}>
              {/* Inner ring */}
              <div className="absolute inset-1.5 rounded-full" style={{ border: "1px solid rgba(201,168,76,0.3)" }} />
              <div className="text-center">
                <span className="text-[28px] font-black leading-none block" style={{
                  color: "#D4AF37",
                  textShadow: "0 2px 8px rgba(212,175,55,0.4), 0 0 20px rgba(212,175,55,0.15)",
                  fontFamily: "Georgia, serif",
                }}>
                  {overallPct}
                </span>
                <span className="text-[10px] font-bold block -mt-0.5" style={{ color: "#C9A84C" }}>%</span>
              </div>
            </div>

            {/* Title under badge */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914)" }} />
              <span className="text-[9px] tracking-[0.25em] font-bold" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>
                OVERALL PROGRESS
              </span>
              <div className="w-8 h-px" style={{ background: "linear-gradient(90deg, #8B6914, transparent)" }} />
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-[260px]">
              <div className="h-3 rounded-full overflow-hidden relative" style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(139,105,20,0.3)",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
              }}>
                <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
                  style={{
                    width: `${overallPct}%`,
                    background: "linear-gradient(90deg, #8B6914, #C9A84C, #D4AF37)",
                    boxShadow: "0 0 8px rgba(212,175,55,0.4)",
                  }}>
                  <div className="absolute inset-0" style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                    animation: "book-shimmer 4s ease-in-out infinite",
                  }} />
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] font-bold" style={{ color: "#C9A84C" }}>{totalProgress}/{totalRequired} collected</span>
                <span className="text-[10px]" style={{ color: "rgba(201,168,76,0.5)" }}>{completedSets} sets completed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Rewards */}
        {collectionMilestones.length > 0 && (
          <div className="rounded-xl p-4 mb-5 overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #2C1F15, #1E140D)",
              border: "1.5px solid rgba(139,105,20,0.25)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)" }}>
                <span className="text-[10px]" style={{ color: "#3D2017" }}>&#9733;</span>
              </div>
              <span className="text-[10px] tracking-[0.15em] font-bold" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>
                MILESTONES
              </span>
            </div>

            {/* Milestone progress bar */}
            {(() => {
              const nextMilestone = collectionMilestones.find((m) => !m.reached);
              const prevCount = collectionMilestones.filter((m) => m.reached).length > 0
                ? collectionMilestones.filter((m) => m.reached).slice(-1)[0]?.count || 0
                : 0;
              const nextCount = nextMilestone?.count || collectionMilestones[collectionMilestones.length - 1].count;
              const currentCount = collectionEntries.length;
              const pct = nextMilestone
                ? Math.min(100, Math.round(((currentCount - prevCount) / (nextCount - prevCount)) * 100))
                : 100;
              return (
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px]" style={{ color: "rgba(201,168,76,0.6)" }}>
                      {nextMilestone ? `Next: ${nextCount}` : "All milestones reached!"}
                    </span>
                    <span className="text-[9px] font-bold" style={{ color: "#C9A84C" }}>
                      {currentCount}/{nextCount}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(139,105,20,0.2)",
                  }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{
                      width: `${pct}%`,
                      background: "linear-gradient(90deg, #8B6914, #D4AF37)",
                    }} />
                  </div>
                </div>
              );
            })()}

            {/* Milestone items */}
            <div className="space-y-1.5">
              {collectionMilestones.map((m) => (
                <div key={m.count} className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{
                    background: m.claimed
                      ? "rgba(46,204,113,0.08)"
                      : m.reached
                        ? "rgba(212,175,55,0.1)"
                        : "rgba(0,0,0,0.15)",
                    border: m.claimed
                      ? "1px solid rgba(46,204,113,0.2)"
                      : m.reached
                        ? "1px solid rgba(212,175,55,0.25)"
                        : "1px solid rgba(139,105,20,0.1)",
                  }}>
                  {/* Count badge */}
                  <div className="w-10 h-8 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      background: m.reached
                        ? "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(139,105,20,0.15))"
                        : "rgba(0,0,0,0.2)",
                      border: `1px solid ${m.reached ? "rgba(201,168,76,0.3)" : "rgba(139,105,20,0.1)"}`,
                    }}>
                    <span className="text-[10px] font-black" style={{
                      color: m.reached ? "#D4AF37" : "rgba(139,105,20,0.3)",
                    }}>{m.count}</span>
                  </div>

                  {/* Rewards info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold" style={{ color: m.reached ? "#F5E6C8" : "rgba(245,230,200,0.3)" }}>
                        {m.gold.toLocaleString()} Gold
                      </span>
                      <span className="text-[9px] font-bold" style={{ color: m.reached ? "#74B9FF" : "rgba(116,185,255,0.3)" }}>
                        {m.gems} Gems
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  {m.claimed ? (
                    <span className="text-[9px] font-bold px-2 py-1 rounded" style={{ color: "#2ecc71" }}>
                      &#10003;
                    </span>
                  ) : m.reached ? (
                    <button
                      onClick={() => handleClaimMilestone(m.count)}
                      disabled={claimingMilestone !== null}
                      className="text-[9px] font-bold px-3 py-1.5 rounded-md active:scale-95 transition-transform"
                      style={{
                        background: "linear-gradient(135deg, #D4AF37, #8B6914)",
                        color: "#3D2017",
                        boxShadow: "0 2px 8px rgba(212,175,55,0.3)",
                        opacity: claimingMilestone === m.count ? 0.6 : 1,
                      }}>
                      {claimingMilestone === m.count ? "..." : "Claim"}
                    </button>
                  ) : (
                    <span className="text-[9px]" style={{ color: "rgba(139,105,20,0.25)" }}>
                      &#128274;
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chapter label */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #8B6914, transparent)" }} />
          <span className="text-[9px] tracking-[0.2em] font-bold" style={{ color: "#8B6914", fontFamily: "Georgia, serif" }}>
            CHAPTERS
          </span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914)" }} />
        </div>

        {/* Set cards — book chapter tabs */}
        <div className="space-y-2.5">
          {slimeSets.map((s, idx) => {
            const pctSet = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
            const previewSpecies = s.species_ids.slice(0, 4).map((spId) => species.find((sp) => sp.id === spId));

            return (
              <button
                key={s.id}
                onClick={() => setSelectedSet(s)}
                className="w-full rounded-lg p-3.5 text-left transition-all active:scale-[0.98]"
                style={{
                  background: s.is_complete
                    ? "linear-gradient(160deg, #3D2D1A, #2A1F14)"
                    : "linear-gradient(160deg, #2C1F15, #1E140D)",
                  border: s.is_complete
                    ? "1.5px solid rgba(46,204,113,0.35)"
                    : "1.5px solid rgba(139,105,20,0.2)",
                  boxShadow: s.is_complete
                    ? "0 2px 12px rgba(46,204,113,0.08), inset 0 1px 0 rgba(139,105,20,0.1)"
                    : "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.05)",
                  animation: `stagger-slide-in 0.3s ease-out ${idx * 50}ms both`,
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Preview slime icons — like journal sketches */}
                  <div className="grid grid-cols-2 gap-1 w-[52px] shrink-0">
                    {previewSpecies.map((sp, i) => (
                      <div key={i} className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{
                          background: "rgba(139,105,20,0.06)",
                          border: "1px solid rgba(139,105,20,0.1)",
                        }}>
                        {sp ? (
                          <img src={generateSlimeIconSvg(sp.element, 20, sp.grade, undefined, sp.id)} alt="" className="w-5 h-5"
                            style={{ filter: submittedMap.has(sp.id) ? "drop-shadow(0 0 2px rgba(201,168,76,0.3))" : "brightness(0.3) opacity(0.3)" }} />
                        ) : (
                          <span className="text-[8px]" style={{ color: "rgba(139,105,20,0.2)", fontFamily: "Georgia, serif" }}>?</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {s.is_complete && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: "linear-gradient(135deg, #2ECC71, #27AE60)",
                            boxShadow: "0 0 6px rgba(46,204,113,0.3)",
                          }}>
                          <span className="text-[7px] font-black" style={{ color: "#F5E6C8" }}>&#10003;</span>
                        </div>
                      )}
                      <span className="font-bold text-[13px] truncate" style={{
                        color: "#F5E6C8",
                        fontFamily: "Georgia, 'Times New Roman', serif",
                      }}>{s.name}</span>
                      <span className="text-[8px] font-bold ml-auto shrink-0 px-1.5 py-0.5 rounded-sm"
                        style={{
                          background: "rgba(139,105,20,0.1)",
                          color: "#C9A84C",
                          border: "1px solid rgba(139,105,20,0.2)",
                        }}>+{s.bonus_score}pt</span>
                    </div>
                    <p className="text-[10px] line-clamp-1 mb-2 italic" style={{
                      color: "rgba(201,168,76,0.4)",
                      fontFamily: "Georgia, serif",
                    }}>{s.description}</p>

                    {/* Progress bar — ink fill style */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{
                        background: "rgba(139,105,20,0.08)",
                        border: "1px solid rgba(139,105,20,0.1)",
                      }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pctSet}%`,
                            background: s.is_complete
                              ? "linear-gradient(90deg, #2ECC71, #27AE60)"
                              : "linear-gradient(90deg, #8B6914, #C9A84C)",
                          }} />
                      </div>
                      <span className="text-[9px] font-bold tabular-nums" style={{
                        color: s.is_complete ? "#2ECC71" : "#C9A84C",
                        fontFamily: "Georgia, serif",
                      }}>
                        {s.completed}/{s.total}
                      </span>
                    </div>
                  </div>

                  {/* Arrow — quill-like */}
                  <span className="mt-2 text-xs" style={{ color: "#8B6914" }}>&#9656;</span>
                </div>
              </button>
            );
          })}
        </div>

        {slimeSets.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background: "linear-gradient(135deg, #3D2017, #2C1810)",
                border: "2px solid rgba(139,105,20,0.2)",
              }}>
              <span className="text-2xl" style={{ color: "rgba(139,105,20,0.3)" }}>&#9830;</span>
            </div>
            <p className="text-sm italic" style={{ color: "rgba(201,168,76,0.3)", fontFamily: "Georgia, serif" }}>
              Loading collection data...
            </p>
          </div>
        )}

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
      `}</style>
    </div>
  );
}
