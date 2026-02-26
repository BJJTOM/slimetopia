"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore, type CodexEntry } from "@/lib/store/gameStore";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { elementColors, elementNames, gradeColors, gradeNames, personalityEmoji } from "@/lib/constants";
import PageLayout from "./PageLayout";

/* ── Faction definitions ── */
const FACTIONS = [
  { id: "all", name: "전체", range: [1, 999], icon: "📖" },
  { id: "east_blue", name: "이스트 블루", range: [1, 11], icon: "🌊" },
  { id: "grand_line", name: "그랜드 라인", range: [12, 29], icon: "🧭" },
  { id: "straw_hats", name: "밀짚모자", range: [30, 40], icon: "🏴‍☠️" },
  { id: "baroque", name: "바로크 웍스", range: [41, 50], icon: "🎭" },
  { id: "sky_island", name: "스카이 아일랜드", range: [51, 62], icon: "☁️" },
  { id: "cipher_pol", name: "사이퍼 폴", range: [63, 72], icon: "🕵️" },
  { id: "warlords", name: "칠무해", range: [73, 84], icon: "⚔️" },
  { id: "worst_gen", name: "최악의 세대", range: [85, 98], icon: "💀" },
  { id: "marines", name: "해군", range: [99, 118], icon: "⚓" },
  { id: "yonko", name: "사황", range: [119, 143], icon: "👑" },
  { id: "logia", name: "로기아", range: [144, 158], icon: "🌪️" },
  { id: "paramecia", name: "파라미시아", range: [159, 172], icon: "🔮" },
  { id: "zoan", name: "조안", range: [173, 187], icon: "🐾" },
  { id: "revolutionary", name: "혁명군", range: [188, 195], icon: "🔥" },
  { id: "celestial", name: "천룡인", range: [196, 200], icon: "✨" },
  { id: "hidden", name: "히든", range: [777, 999], icon: "❓" },
];

/* ── Grade gradient pairs (book-themed) ── */
const gradeGradients: Record<string, [string, string]> = {
  common: ["#B2BEC3", "#95A5A6"],
  uncommon: ["#55EFC4", "#00B894"],
  rare: ["#74B9FF", "#0984E3"],
  epic: ["#A29BFE", "#6C5CE7"],
  legendary: ["#FFEAA7", "#FDCB6E"],
  mythic: ["#FF6B6B", "#E17055"],
};

const ALL_PERSONALITIES = ["energetic", "chill", "foodie", "curious", "tsundere", "gentle"];

type FilterGrade = "all" | "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
type FilterElement = "all" | string;

/* ── Animated number ── */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 600;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + diff * eased));
      if (t < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display}</>;
}

export default function CodexPage() {
  const token = useAuthStore((s) => s.accessToken);
  const {
    codex, fetchCodex, setShowEvolutionTree,
    collectionScore, fetchCollectionScore,
    slimeSets, fetchSlimeSets,
    collectionEntries,
    species,
  } = useGameStore();

  const [activeFaction, setActiveFaction] = useState("all");
  const [filterGrade, setFilterGrade] = useState<FilterGrade>("all");
  const [filterElement, setFilterElement] = useState<FilterElement>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showOnlyDiscovered, setShowOnlyDiscovered] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [codexPage, setCodexPage] = useState(1);
  const ITEMS_PER_PAGE = 30;
  const factionScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token && !codex) fetchCodex(token);
    if (token && !collectionScore) fetchCollectionScore(token);
    if (token && slimeSets.length === 0) fetchSlimeSets(token);
  }, [token, codex, collectionScore, slimeSets.length, fetchCodex, fetchCollectionScore, fetchSlimeSets]);

  const total = codex?.total ?? 0;
  const discovered = codex?.discovered ?? 0;
  const pct = total > 0 ? Math.round((discovered / total) * 100) : 0;

  // Get current faction info
  const currentFaction = FACTIONS.find((f) => f.id === activeFaction) || FACTIONS[0];

  // Collection personality map: species_id -> Set of submitted personalities
  const personalityMap = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const entry of collectionEntries) {
      if (!map.has(entry.species_id)) map.set(entry.species_id, new Set());
      map.get(entry.species_id)!.add(entry.personality);
    }
    return map;
  }, [collectionEntries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (!codex) return [];
    return codex.entries.filter((entry) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = entry.name?.toLowerCase().includes(q);
        const matchEn = entry.name_en?.toLowerCase().includes(q);
        const matchId = String(entry.species_id).includes(q);
        if (!matchName && !matchEn && !matchId) return false;
      }
      // Faction filter
      if (activeFaction !== "all") {
        const faction = FACTIONS.find((f) => f.id === activeFaction);
        if (faction) {
          if (activeFaction === "hidden") {
            if (entry.species_id < 777) return false;
          } else {
            if (entry.species_id < faction.range[0] || entry.species_id > faction.range[1]) return false;
          }
        }
      }
      // Grade filter
      if (filterGrade !== "all" && entry.discovered && entry.grade !== filterGrade) return false;
      if (filterGrade !== "all" && !entry.discovered) return false;
      // Element filter
      if (filterElement !== "all" && entry.discovered && entry.element !== filterElement) return false;
      if (filterElement !== "all" && !entry.discovered) return false;
      // Discovered filter
      if (showOnlyDiscovered && !entry.discovered) return false;
      return true;
    });
  }, [codex, searchQuery, activeFaction, filterGrade, filterElement, showOnlyDiscovered]);

  // Faction discovery stats
  const factionStats = useMemo(() => {
    if (!codex) return {};
    const stats: Record<string, { total: number; discovered: number }> = {};
    for (const f of FACTIONS) {
      if (f.id === "all") continue;
      const entries = codex.entries.filter((e) => {
        if (f.id === "hidden") return e.species_id >= 777;
        return e.species_id >= f.range[0] && e.species_id <= f.range[1];
      });
      stats[f.id] = {
        total: entries.length,
        discovered: entries.filter((e) => e.discovered).length,
      };
    }
    return stats;
  }, [codex]);

  // Grade distribution stats
  const gradeStats = useMemo(() => {
    if (!codex) return {};
    const stats: Record<string, number> = {};
    for (const e of codex.entries) {
      if (e.discovered && e.grade) {
        stats[e.grade] = (stats[e.grade] || 0) + 1;
      }
    }
    return stats;
  }, [codex]);

  // Reset page when filters change
  useEffect(() => { setCodexPage(1); }, [activeFaction, filterGrade, filterElement, showOnlyDiscovered, searchQuery]);

  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = filteredEntries.slice(0, codexPage * ITEMS_PER_PAGE);
  const hasMoreEntries = codexPage * ITEMS_PER_PAGE < filteredEntries.length;

  const hasActiveFilters = filterGrade !== "all" || filterElement !== "all" || showOnlyDiscovered || searchQuery.trim().length > 0;

  return (
    <PageLayout
      title="도감"
      icon="/assets/icons/collect.png"
      badge={
        <span className="text-[11px] px-2.5 py-1 rounded-md font-bold tracking-wide"
          style={{
            background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(139,105,20,0.1))",
            color: "#D4AF37",
            border: "1px solid rgba(139,105,20,0.4)",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}>
          {discovered}/{total}
        </span>
      }
    >
      {/* ── Hero stats — leather badge ── */}
      <div className="rounded-xl p-5 mb-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #3D2017 0%, #2C1810 50%, #1A0E08 100%)",
          border: "2px solid #8B6914",
          boxShadow: "0 6px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(139,105,20,0.2)",
        }}>
        {/* Decorative inner frame */}
        <div className="absolute inset-2 rounded-lg pointer-events-none"
          style={{ border: "1px solid rgba(139,105,20,0.12)" }} />

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

        <div className="relative z-10">
          {/* Title ornament */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914)" }} />
            <span className="text-[9px] tracking-[0.25em] font-bold"
              style={{ color: "#C9A84C", fontFamily: "Georgia, 'Times New Roman', serif" }}>
              BESTIARY
            </span>
            <div className="w-8 h-px" style={{ background: "linear-gradient(90deg, #8B6914, transparent)" }} />
          </div>

          {/* Percentage display */}
          <div className="flex items-end justify-center gap-1 mb-2">
            <span className="text-[38px] font-black leading-none"
              style={{
                color: "#D4AF37",
                textShadow: "0 2px 8px rgba(212,175,55,0.4), 0 0 20px rgba(212,175,55,0.15)",
                fontFamily: "Georgia, 'Times New Roman', serif",
              }}>
              <AnimatedNumber value={pct} />
            </span>
            <span className="text-[16px] font-bold mb-1"
              style={{ color: "#C9A84C" }}>%</span>
          </div>

          {/* Progress bar */}
          <div className="h-3 rounded-full overflow-hidden relative mb-1.5"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(139,105,20,0.3)",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
            }}>
            <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #8B6914, #C9A84C, #D4AF37)",
                boxShadow: "0 0 8px rgba(212,175,55,0.4)",
              }}>
              <div className="absolute inset-0" style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                animation: "bestiary-shimmer 4s ease-in-out infinite",
              }} />
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold" style={{ color: "#C9A84C" }}>{discovered}마리 발견</span>
            <span className="text-[10px]" style={{ color: "rgba(201,168,76,0.4)" }}>{total - discovered}마리 남음</span>
          </div>

          {/* Grade distribution mini-bar */}
          {Object.keys(gradeStats).length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {(["mythic", "legendary", "epic", "rare", "uncommon", "common"] as const).map((g) => {
                const count = gradeStats[g] || 0;
                if (count === 0) return null;
                return (
                  <span key={g} className="text-[7px] font-bold px-1.5 py-0.5 rounded-sm"
                    style={{
                      background: `${gradeColors[g]}15`,
                      color: gradeColors[g],
                      border: `1px solid ${gradeColors[g]}25`,
                      fontFamily: "Georgia, serif",
                    }}>
                    {gradeNames[g]} {count}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Collection Score — parchment note ── */}
      {collectionScore && (
        <div className="rounded-lg p-3 mb-3"
          style={{
            background: "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(139,105,20,0.04))",
            border: "1px solid rgba(139,105,20,0.25)",
          }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>수집 점수</span>
            <span className="text-sm font-black" style={{ color: "#D4AF37", fontFamily: "Georgia, serif" }}>{collectionScore.total}</span>
          </div>
          <div className="flex gap-3 text-[8px] mt-1" style={{ color: "rgba(201,168,76,0.5)" }}>
            <span>종 {collectionScore.species_points}</span>
            <span>세트 +{collectionScore.set_bonus}</span>
            <span>최초발견 +{collectionScore.first_discovery_bonus}</span>
          </div>
        </div>
      )}

      {/* ── Search bar — ink & quill style ── */}
      <div className="relative mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이름, 영문명, 번호로 검색..."
          className="w-full text-[12px] rounded-lg pl-9 pr-8 py-2.5 focus:outline-none transition"
          style={{
            background: "linear-gradient(135deg, rgba(44,24,16,0.6), rgba(26,14,8,0.8))",
            color: "#F5E6C8",
            border: "1px solid rgba(139,105,20,0.25)",
            fontFamily: "Georgia, 'Times New Roman', serif",
            caretColor: "#C9A84C",
          }}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(201,168,76,0.4)" }}>&#9906;</span>
        {searchQuery && (
          <button onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] transition"
            style={{ color: "rgba(201,168,76,0.3)" }}>
            &#10005;
          </button>
        )}
      </div>

      {/* ── Faction Tabs — chapter tabs ── */}
      <div className="mb-3 -mx-1">
        <div ref={factionScrollRef} className="flex gap-1.5 overflow-x-auto game-scroll pb-2 px-1">
          {FACTIONS.map((f) => {
            const isActive = f.id === activeFaction;
            const stat = factionStats[f.id];
            const isComplete = stat && stat.total > 0 && stat.discovered === stat.total;
            return (
              <button key={f.id} onClick={() => setActiveFaction(f.id)}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, #4A2515, #3D2017)"
                    : "linear-gradient(135deg, rgba(44,24,16,0.4), rgba(26,14,8,0.5))",
                  border: isActive
                    ? "1px solid #C9A84C"
                    : "1px solid rgba(139,105,20,0.15)",
                  color: isActive ? "#D4AF37" : isComplete ? "#C9A84C" : "rgba(245,230,200,0.5)",
                  boxShadow: isActive ? "0 0 8px rgba(201,168,76,0.15), inset 0 1px 0 rgba(139,105,20,0.2)" : "none",
                  fontFamily: "Georgia, serif",
                }}>
                <span className="text-xs">{f.icon}</span>
                <span className="whitespace-nowrap">{f.name}</span>
                {stat && f.id !== "all" && (
                  <span className="text-[8px]" style={{ opacity: 0.6 }}>{stat.discovered}/{stat.total}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 text-[10px] transition px-2 py-1 rounded-md"
          style={{
            background: showFilters ? "rgba(139,105,20,0.12)" : "transparent",
            color: showFilters ? "#C9A84C" : "rgba(245,230,200,0.5)",
            border: showFilters ? "1px solid rgba(139,105,20,0.25)" : "1px solid transparent",
            fontFamily: "Georgia, serif",
          }}>
          &#9998; 필터 {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#D4AF37" }} />
          )}
        </button>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button onClick={() => {
              setFilterGrade("all");
              setFilterElement("all");
              setShowOnlyDiscovered(false);
              setSearchQuery("");
            }} className="text-[9px] transition"
              style={{ color: "rgba(231,76,60,0.5)", fontFamily: "Georgia, serif" }}>
              초기화
            </button>
          )}
          <span className="text-[9px]" style={{ color: "rgba(201,168,76,0.4)", fontFamily: "Georgia, serif" }}>{filteredEntries.length}마리</span>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-lg p-3 mb-3 space-y-2"
          style={{
            background: "linear-gradient(135deg, rgba(44,24,16,0.5), rgba(26,14,8,0.6))",
            border: "1px solid rgba(139,105,20,0.2)",
          }}>
          {/* Grade filter */}
          <div>
            <span className="text-[9px] block mb-1" style={{ color: "rgba(201,168,76,0.5)", fontFamily: "Georgia, serif" }}>등급</span>
            <div className="flex flex-wrap gap-1">
              {(["all", "common", "uncommon", "rare", "epic", "legendary", "mythic"] as FilterGrade[]).map((g) => (
                <button key={g} onClick={() => setFilterGrade(g)}
                  className="text-[9px] px-2 py-0.5 rounded-md transition-all"
                  style={{
                    background: filterGrade === g
                      ? `linear-gradient(135deg, ${gradeColors[g] || "#C9A84C"}20, ${gradeColors[g] || "#C9A84C"}10)`
                      : "rgba(44,24,16,0.4)",
                    color: filterGrade === g ? (gradeColors[g] || "#C9A84C") : "rgba(245,230,200,0.4)",
                    border: filterGrade === g
                      ? `1px solid ${gradeColors[g] || "#C9A84C"}40`
                      : "1px solid rgba(139,105,20,0.1)",
                    fontFamily: "Georgia, serif",
                  }}>
                  {g === "all" ? "전체" : gradeNames[g] || g}
                  {g !== "all" && gradeStats[g] ? ` (${gradeStats[g]})` : ""}
                </button>
              ))}
            </div>
          </div>
          {/* Element filter */}
          <div>
            <span className="text-[9px] block mb-1" style={{ color: "rgba(201,168,76,0.5)", fontFamily: "Georgia, serif" }}>원소</span>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setFilterElement("all")}
                className="text-[9px] px-2 py-0.5 rounded-md"
                style={{
                  background: filterElement === "all" ? "rgba(201,168,76,0.12)" : "rgba(44,24,16,0.4)",
                  color: filterElement === "all" ? "#C9A84C" : "rgba(245,230,200,0.4)",
                  border: filterElement === "all" ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(139,105,20,0.1)",
                  fontFamily: "Georgia, serif",
                }}>전체</button>
              {Object.entries(elementNames).map(([key, name]) => (
                <button key={key} onClick={() => setFilterElement(key)}
                  className="text-[9px] px-2 py-0.5 rounded-md"
                  style={{
                    background: filterElement === key ? `${elementColors[key]}18` : "rgba(44,24,16,0.4)",
                    color: filterElement === key ? elementColors[key] : "rgba(245,230,200,0.4)",
                    border: filterElement === key ? `1px solid ${elementColors[key]}35` : "1px solid rgba(139,105,20,0.1)",
                    fontFamily: "Georgia, serif",
                  }}>{name}</button>
              ))}
            </div>
          </div>
          {/* Discovered only toggle */}
          <button onClick={() => setShowOnlyDiscovered(!showOnlyDiscovered)}
            className="flex items-center gap-1.5 text-[9px]"
            style={{ color: showOnlyDiscovered ? "#D4AF37" : "rgba(245,230,200,0.4)", fontFamily: "Georgia, serif" }}>
            <span className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[8px]"
              style={{
                borderColor: showOnlyDiscovered ? "#C9A84C" : "rgba(139,105,20,0.3)",
                background: showOnlyDiscovered ? "rgba(201,168,76,0.15)" : "transparent",
                color: "#D4AF37",
              }}>
              {showOnlyDiscovered && "\u2713"}
            </span>
            발견한 것만 보기
          </button>
        </div>
      )}

      {/* ── Theme Set Progress — field journal chapters ── */}
      {slimeSets.length > 0 && activeFaction === "all" && !searchQuery && (
        <div className="mb-4">
          {/* Section divider */}
          <div className="flex items-center gap-2 px-1 mb-2">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #8B6914, transparent)" }} />
            <span className="text-[9px] tracking-[0.15em] font-bold flex items-center gap-1.5"
              style={{ color: "#8B6914", fontFamily: "Georgia, serif" }}>
              &#9830; 테마 세트 &#9830;
            </span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914)" }} />
          </div>
          <div className="flex items-center justify-end px-1 mb-2">
            <span className="text-[9px] font-bold" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>
              {slimeSets.filter((s) => s.is_complete).length}/{slimeSets.length} 완성
            </span>
          </div>
          <div className="space-y-1.5">
            {slimeSets.map((s) => {
              const pctSet = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
              const isExpanded = selectedSetId === s.id;
              return (
                <div key={s.id}>
                  <button
                    onClick={() => setSelectedSetId(isExpanded ? null : s.id)}
                    className="w-full rounded-lg p-3 text-left transition-all active:scale-[0.99]"
                    style={{
                      background: s.is_complete
                        ? "linear-gradient(160deg, #3D2D1A, #2A1F14)"
                        : isExpanded
                        ? "linear-gradient(160deg, #3D2017, #2C1810)"
                        : "linear-gradient(160deg, #2C1F15, #1E140D)",
                      border: s.is_complete
                        ? "1.5px solid rgba(46,204,113,0.35)"
                        : isExpanded
                        ? "1.5px solid rgba(201,168,76,0.35)"
                        : "1.5px solid rgba(139,105,20,0.15)",
                      boxShadow: s.is_complete
                        ? "0 2px 8px rgba(46,204,113,0.08), inset 0 1px 0 rgba(139,105,20,0.1)"
                        : "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.05)",
                    }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold"
                          style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>
                          {s.is_complete && <span style={{ color: "#2ECC71" }} className="mr-1">{"\u2713"}</span>}
                          {s.name}
                        </span>
                        {s.buff && Object.keys(s.buff).length > 0 && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-sm font-bold"
                            style={{
                              background: "rgba(201,168,76,0.1)",
                              color: "#C9A84C",
                              border: "1px solid rgba(139,105,20,0.2)",
                              fontFamily: "Georgia, serif",
                            }}>
                            버프
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold" style={{ color: "rgba(201,168,76,0.6)", fontFamily: "Georgia, serif" }}>+{s.bonus_score}pt</span>
                        <span className="text-[9px] font-bold" style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}>{s.completed}/{s.total}</span>
                        <span className={`text-[9px] transition-transform ${isExpanded ? "rotate-90" : ""}`} style={{ color: "#8B6914" }}>&#9656;</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{
                      background: "rgba(139,105,20,0.08)",
                      border: "1px solid rgba(139,105,20,0.1)",
                    }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{
                        width: `${pctSet}%`,
                        background: s.is_complete
                          ? "linear-gradient(90deg, #2ECC71, #27AE60)"
                          : "linear-gradient(90deg, #8B6914, #C9A84C)",
                      }} />
                    </div>
                    <p className="text-[9px] italic" style={{ color: "rgba(201,168,76,0.35)", fontFamily: "Georgia, serif" }}>{s.description}</p>
                  </button>

                  {/* Expanded: Required slimes grid — bestiary entries on parchment */}
                  {isExpanded && (
                    <div className="mt-1 rounded-lg p-3 animate-fade-in-up relative overflow-hidden"
                      style={{
                        background: "linear-gradient(170deg, #F5E6C8 0%, #E8D5B0 40%, #DCC9A3 100%)",
                        border: "1px solid #C9A84C",
                        boxShadow: "inset 0 0 30px rgba(139,105,20,0.08)",
                      }}>
                      {/* Paper edge decoration */}
                      <div className="flex items-center justify-center mb-2">
                        <div className="flex items-center gap-2 w-full">
                          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3), transparent)" }} />
                          <span className="text-[8px] tracking-[0.15em] font-bold" style={{ color: "#6B3A2A", fontFamily: "Georgia, serif" }}>
                            FIELD NOTES
                          </span>
                          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3), transparent)" }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {s.species_ids.map((spId) => {
                          const sp = species.find((sp2) => sp2.id === spId);
                          const codexEntry = codex?.entries.find((e) => e.species_id === spId);
                          const isDiscovered = codexEntry?.discovered ?? false;
                          const isSubmitted = collectionEntries.some((e) => e.species_id === spId);
                          const color = sp ? (elementColors[sp.element] || "#B2BEC3") : "#636e72";
                          const gColor = sp ? (gradeColors[sp.grade] || "#B2BEC3") : "#636e72";
                          return (
                            <div key={spId}
                              className="flex flex-col items-center gap-1 p-2 rounded-md transition-all"
                              style={{
                                background: isSubmitted
                                  ? "rgba(255,255,255,0.5)"
                                  : isDiscovered
                                  ? "rgba(255,255,255,0.25)"
                                  : "rgba(107,58,42,0.04)",
                                border: isSubmitted
                                  ? "1.5px solid #C9A84C"
                                  : isDiscovered
                                  ? "1px solid rgba(139,105,20,0.2)"
                                  : "1px dashed rgba(139,105,20,0.15)",
                              }}>
                              {isDiscovered && sp ? (
                                <>
                                  <div className="relative">
                                    <img src={generateSlimeIconSvg(sp.element, 36, sp.grade, undefined, sp.id)}
                                      alt={sp.name} className="w-9 h-9"
                                      style={{ filter: `drop-shadow(0 1px 3px rgba(0,0,0,0.15))` }} />
                                    {isSubmitted && (
                                      <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                                        style={{
                                          background: "linear-gradient(135deg, #D4AF37, #C9A84C)",
                                          border: "1px solid #8B6914",
                                        }}>
                                        <span className="text-[7px] font-bold" style={{ color: "#3D2017" }}>{"\u2713"}</span>
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-bold text-center leading-tight truncate w-full"
                                    style={{ color: "#2C1810", fontFamily: "Georgia, serif" }}>{sp.name}</span>
                                  <span className="text-[7px] px-1 py-0.5 rounded-sm font-bold"
                                    style={{ background: gColor + "15", color: gColor }}>
                                    {gradeNames[sp.grade] || sp.grade}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div className="w-9 h-9 rounded-full flex items-center justify-center"
                                    style={{ background: "rgba(107,58,42,0.06)", border: "1px dashed rgba(139,105,20,0.2)" }}>
                                    <span className="text-sm font-bold" style={{ color: "rgba(107,58,42,0.2)", fontFamily: "Georgia, serif" }}>?</span>
                                  </div>
                                  <span className="text-[9px] font-medium" style={{ color: "rgba(107,58,42,0.3)", fontFamily: "Georgia, serif" }}>미발견</span>
                                  <span className="text-[7px]" style={{ color: "rgba(107,58,42,0.2)" }}>No.{String(spId).padStart(3, "0")}</span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {s.is_complete && s.buff && Object.keys(s.buff).length > 0 && (
                        <div className="mt-2 p-2 rounded-md" style={{
                          background: "rgba(46,204,113,0.08)",
                          border: "1px solid rgba(46,204,113,0.25)",
                        }}>
                          <p className="text-[9px] font-bold" style={{ color: "#2C1810", fontFamily: "Georgia, serif" }}>세트 버프</p>
                          <p className="text-[8px] mt-0.5" style={{ color: "#6B3A2A" }}>
                            {Object.entries(s.buff).map(([k, v]) => `${k}: +${v}`).join(", ")}
                          </p>
                        </div>
                      )}
                      {/* Bottom page ornament */}
                      <div className="flex items-center justify-center mt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3))" }} />
                          <span className="text-[8px]" style={{ color: "rgba(139,105,20,0.3)" }}>&#9830;</span>
                          <div className="w-6 h-px" style={{ background: "linear-gradient(90deg, rgba(139,105,20,0.3), transparent)" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section divider before entries ── */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #8B6914, transparent)" }} />
        <span className="text-[9px] tracking-[0.15em] font-bold"
          style={{ color: "#8B6914", fontFamily: "Georgia, serif" }}>
          &#9830; SPECIES &#9830;
        </span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #8B6914)" }} />
      </div>

      {/* ── Entries grid ── */}
      {!codex ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #3D2017, #2C1810)",
              border: "2px solid rgba(139,105,20,0.3)",
              animation: "spin 2s linear infinite",
            }}>
            <span style={{ color: "rgba(201,168,76,0.4)", fontSize: "16px" }}>&#9830;</span>
          </div>
          <span className="text-xs italic" style={{ color: "rgba(201,168,76,0.4)", fontFamily: "Georgia, serif" }}>도감을 불러오는 중...</span>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{
              background: "linear-gradient(135deg, #3D2017, #2C1810)",
              border: "2px solid rgba(139,105,20,0.15)",
            }}>
            <span style={{ color: "rgba(201,168,76,0.3)", fontSize: "20px" }}>&#9906;</span>
          </div>
          <p className="text-xs italic" style={{ color: "rgba(201,168,76,0.4)", fontFamily: "Georgia, serif" }}>
            {searchQuery ? `"${searchQuery}" 검색 결과 없음` : "조건에 맞는 슬라임이 없습니다"}
          </p>
          {hasActiveFilters && (
            <button onClick={() => {
              setFilterGrade("all"); setFilterElement("all");
              setShowOnlyDiscovered(false); setSearchQuery("");
            }} className="text-[10px] transition mt-2"
              style={{ color: "rgba(201,168,76,0.5)", fontFamily: "Georgia, serif" }}>
              필터 초기화 &#8594;
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {paginatedEntries.map((entry, i) => {
              const submitted = personalityMap.get(entry.species_id);
              const submittedCount = submitted?.size ?? 0;
              return (
                <CodexCard
                  key={entry.species_id}
                  entry={entry}
                  index={i % ITEMS_PER_PAGE}
                  submittedCount={submittedCount}
                  submittedPersonalities={submitted}
                  onViewEvolution={() => setShowEvolutionTree(entry.species_id)}
                />
              );
            })}
          </div>

          {/* Pagination */}
          {filteredEntries.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-center gap-3 mt-4 pb-2">
              {hasMoreEntries ? (
                <button
                  onClick={() => setCodexPage(codexPage + 1)}
                  className="px-6 py-2.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #4A2515, #3D2017)",
                    border: "1.5px solid #C9A84C",
                    color: "#D4AF37",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(139,105,20,0.2)",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                  }}
                >
                  더 보기 ({paginatedEntries.length}/{filteredEntries.length})
                </button>
              ) : (
                <span className="text-[10px] italic" style={{ color: "rgba(201,168,76,0.3)", fontFamily: "Georgia, serif" }}>
                  전체 {filteredEntries.length}마리 표시 중
                </span>
              )}
            </div>
          )}

          {/* Bottom decoration */}
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.25))" }} />
              <span className="text-[10px]" style={{ color: "rgba(139,105,20,0.2)" }}>&#9830;</span>
              <div className="w-10 h-px" style={{ background: "linear-gradient(90deg, rgba(139,105,20,0.25), transparent)" }} />
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes bestiary-shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
        }
      `}</style>
    </PageLayout>
  );
}

function CodexCard({
  entry,
  index,
  submittedCount,
  submittedPersonalities,
  onViewEvolution,
}: {
  entry: CodexEntry;
  index: number;
  submittedCount: number;
  submittedPersonalities?: Set<string>;
  onViewEvolution: () => void;
}) {
  const totalPersonalities = 6;
  const delay = Math.min(index * 20, 300);

  if (!entry.discovered) {
    return (
      <div className="rounded-lg p-2.5 flex flex-col items-center gap-1.5 relative overflow-hidden"
        style={{
          animation: `codex-stagger 0.3s ease-out ${delay}ms both`,
          background: "linear-gradient(160deg, #2C1F15, #1E140D)",
          border: "1px solid rgba(139,105,20,0.1)",
        }}>
        {/* Subtle parchment texture hint */}
        <div className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 40%, rgba(139,105,20,0.03) 0%, transparent 70%)",
          }} />
        <div className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(139,105,20,0.04)",
            border: "1px dashed rgba(139,105,20,0.12)",
          }}>
          <span className="text-lg font-black" style={{ color: "rgba(139,105,20,0.15)", fontFamily: "Georgia, serif" }}>?</span>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-medium italic" style={{ color: "rgba(201,168,76,0.25)", fontFamily: "Georgia, serif" }}>미발견</p>
          <p className="text-[8px] font-mono" style={{ color: "rgba(139,105,20,0.2)" }}>
            No.{String(entry.species_id).padStart(3, "0")}
          </p>
        </div>
      </div>
    );
  }

  const color = elementColors[entry.element!] || "#B2BEC3";
  const gradeColor = gradeColors[entry.grade!] || "#B2BEC3";
  const [gStart, gEnd] = gradeGradients[entry.grade!] || ["#B2BEC3", "#95A5A6"];
  const isFullyCollected = submittedCount >= totalPersonalities;

  return (
    <button onClick={onViewEvolution}
      className="rounded-lg p-2.5 flex flex-col items-center gap-1 relative overflow-hidden text-center active:scale-95 transition-transform"
      style={{
        animation: `codex-stagger 0.3s ease-out ${delay}ms both`,
        border: isFullyCollected
          ? "1.5px solid rgba(46,204,113,0.4)"
          : `1.5px solid rgba(139,105,20,0.2)`,
        background: isFullyCollected
          ? "linear-gradient(160deg, #3D2D1A, #2A1F14)"
          : "linear-gradient(160deg, #2C1F15 0%, #1E140D 100%)",
        boxShadow: isFullyCollected
          ? "0 2px 12px rgba(46,204,113,0.08), inset 0 1px 0 rgba(139,105,20,0.1)"
          : "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(139,105,20,0.05)",
      }}>
      {/* Subtle element glow */}
      <div className="absolute inset-0 rounded-lg pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 30%, ${color}08 0%, transparent 70%)` }} />

      {/* Icon with parchment-style halo */}
      <div className="relative z-10">
        <div className="absolute inset-[-6px] rounded-full"
          style={{ background: `radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)`, filter: "blur(4px)" }} />
        <img src={generateSlimeIconSvg(entry.element!, 48, entry.grade, undefined, entry.species_id)}
          alt={entry.name!} className="w-12 h-12 relative z-10"
          style={{ filter: `drop-shadow(0 0 4px ${color}25) drop-shadow(0 2px 4px rgba(0,0,0,0.3))` }}
          draggable={false} />
        {/* Full collection seal */}
        {isFullyCollected && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center z-20"
            style={{
              background: "linear-gradient(135deg, #2ECC71, #27AE60)",
              border: "1px solid rgba(46,204,113,0.5)",
              boxShadow: "0 0 6px rgba(46,204,113,0.3)",
            }}>
            <span className="text-[7px] font-bold" style={{ color: "#F5E6C8" }}>{"\u2713"}</span>
          </div>
        )}
      </div>

      {/* Name — ink on parchment style */}
      <div className="w-full min-w-0 relative z-10">
        <p className="text-[11px] font-bold leading-tight truncate"
          style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>{entry.name}</p>
        <p className="text-[8px] truncate" style={{ color: "rgba(201,168,76,0.3)" }}>{entry.name_en}</p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-0.5 relative z-10 flex-wrap justify-center">
        <span className="text-[7px] px-1.5 py-0.5 rounded-sm font-black tracking-wider leading-none"
          style={{
            background: `linear-gradient(135deg, ${gStart}20, ${gEnd}30)`,
            color: gradeColor,
            border: `1px solid ${gradeColor}30`,
            fontFamily: "Georgia, serif",
          }}>
          {(gradeNames[entry.grade!] || entry.grade!).toUpperCase()}
        </span>
        <span className="text-[7px] px-1 py-0.5 rounded-sm font-semibold leading-none"
          style={{ background: `${color}12`, color, border: `1px solid ${color}18` }}>
          {elementNames[entry.element!] || entry.element}
        </span>
      </div>

      {/* Personality collection dots — wax seal style */}
      {submittedCount > 0 && (
        <div className="relative z-10 flex items-center gap-0.5">
          {ALL_PERSONALITIES.map((p) => {
            const has = submittedPersonalities?.has(p);
            return (
              <div key={p} className="relative group"
                title={`${personalityEmoji[p] || ""} ${p}`}>
                <div className="w-2.5 h-2.5 rounded-full transition-all"
                  style={{
                    background: has
                      ? "linear-gradient(135deg, #D4AF37, #C9A84C)"
                      : "rgba(139,105,20,0.08)",
                    border: has
                      ? "1px solid rgba(212,175,55,0.6)"
                      : "1px solid rgba(139,105,20,0.15)",
                    boxShadow: has ? "0 0 4px rgba(212,175,55,0.3)" : "none",
                  }} />
              </div>
            );
          })}
          <span className="text-[7px] font-bold ml-0.5" style={{
            color: isFullyCollected ? "#2ECC71" : "#C9A84C",
            fontFamily: "Georgia, serif",
          }}>
            {submittedCount}/{totalPersonalities}
          </span>
        </div>
      )}
    </button>
  );
}
