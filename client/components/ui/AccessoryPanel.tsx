"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore, Accessory, EquippedAccessory } from "@/lib/store/gameStore";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { getAccessorySvg, getAccessoryDefs } from "@/lib/slimeAccessories";
import { gradeColors } from "@/lib/constants";

const SLOT_LABELS: Record<string, { label: string; icon: string }> = {
  head: { label: "머리", icon: "🎩" },
  face: { label: "얼굴", icon: "👓" },
  body: { label: "몸통", icon: "👔" },
};

const SLOT_ORDER = ["head", "face", "body"] as const;

export default function AccessoryPanel() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const {
    slimes,
    species,
    selectedSlimeId,
    accessories,
    equippedAccessories,
    showAccessoryPanel,
    setShowAccessoryPanel,
    fetchAccessories,
    buyAccessory,
    equipAccessory,
    fetchEquippedAccessories,
  } = useGameStore();

  const [activeSlot, setActiveSlot] = useState<string>("head");
  const [buying, setBuying] = useState<number | null>(null);
  const [equipping, setEquipping] = useState<number | null>(null);
  const [justBought, setJustBought] = useState<number | null>(null);

  const slime = slimes.find((s) => s.id === selectedSlimeId);
  const sp = species.find((s) => s.id === slime?.species_id);
  const equipped = selectedSlimeId ? equippedAccessories[selectedSlimeId] || [] : [];
  const gradeColor = sp ? gradeColors[sp.grade] || "#B2BEC3" : "#B2BEC3";

  useEffect(() => {
    if (showAccessoryPanel && token) {
      fetchAccessories(token);
      if (selectedSlimeId) {
        fetchEquippedAccessories(token, selectedSlimeId);
      }
    }
  }, [showAccessoryPanel, token, selectedSlimeId, fetchAccessories, fetchEquippedAccessories]);

  // Slot stats
  const slotStats = useMemo(() => {
    const stats: Record<string, { total: number; owned: number }> = {};
    for (const slot of SLOT_ORDER) {
      const items = accessories.filter(a => a.slot === slot);
      stats[slot] = {
        total: items.length,
        owned: items.filter(a => a.owned).length,
      };
    }
    return stats;
  }, [accessories]);

  if (!showAccessoryPanel || !slime || !token) return null;

  const slotItems = accessories.filter((a) => a.slot === activeSlot);
  const equippedInSlot = equipped.find((e) => e.slot === activeSlot);

  const handleBuy = async (acc: Accessory) => {
    setBuying(acc.id);
    await buyAccessory(token, acc.id);
    setJustBought(acc.id);
    setBuying(null);
    setTimeout(() => setJustBought(null), 1500);
  };

  const handleEquip = async (acc: Accessory) => {
    if (!selectedSlimeId) return;
    setEquipping(acc.id);
    const isEquipped = equippedInSlot?.accessory_id === acc.id;
    await equipAccessory(token, selectedSlimeId, acc.id, isEquipped);
    setEquipping(null);
  };

  // Build preview SVG with equipped accessories rendered
  const equippedOverlays = equipped.map((e) => e.svg_overlay).filter(Boolean);
  const previewSvgBase = generateSlimeIconSvg(slime.element, 80, sp?.grade, equippedOverlays, slime.species_id);

  const totalOwned = accessories.filter(a => a.owned).length;
  const totalAccessories = accessories.length;

  return (
    <div className="modal-backdrop" onClick={() => setShowAccessoryPanel(false)}>
      <div
        className="modal-panel w-[380px] max-w-[calc(100%-24px)] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-white font-extrabold text-lg flex items-center gap-2">
              <span className="text-xl">🎀</span>
              악세서리
            </h2>
            {/* Slime name + ownership count */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-white/40">
                {slime.name || sp?.name || "???"} 꾸미기
              </span>
              <span
                className="text-[9px] font-bold px-1.5 py-px rounded-full"
                style={{
                  background: totalOwned === totalAccessories ? "rgba(85,239,196,0.12)" : "rgba(255,255,255,0.05)",
                  color: totalOwned === totalAccessories ? "#55EFC4" : "rgba(255,255,255,0.35)",
                }}
              >
                {totalOwned}/{totalAccessories}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowAccessoryPanel(false)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Preview slime with equipped accessories */}
        <div className="flex items-center justify-center mb-3">
          <div
            className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${gradeColor}18, ${gradeColor}08)`,
              border: `1px solid ${gradeColor}20`,
            }}
          >
            <img
              src={previewSvgBase}
              alt=""
              className="w-20 h-20 drop-shadow-lg"
              draggable={false}
            />
            {/* Equipped badge count */}
            {equipped.length > 0 && (
              <div
                className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center px-1"
                style={{
                  background: "linear-gradient(135deg, #C9A84C, #D4AF37)",
                  color: "#fff",
                }}
              >
                {equipped.length}
              </div>
            )}

            {/* Equipped slots indicator */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {equipped.map((eq) => (
                <div
                  key={eq.slot}
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(10,8,20,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  title={eq.name}
                >
                  <span className="text-[9px]">
                    {accessories.find((a) => a.id === eq.accessory_id)?.icon || SLOT_LABELS[eq.slot]?.icon || "?"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Slot tabs */}
        <div className="tab-bar mb-3">
          {SLOT_ORDER.map((slot) => {
            const slotEquipped = equipped.find((e) => e.slot === slot);
            const stats = slotStats[slot] || { total: 0, owned: 0 };
            return (
              <button
                key={slot}
                className={`tab-item ${activeSlot === slot ? "tab-item-active" : ""}`}
                onClick={() => setActiveSlot(slot)}
              >
                <span className="text-sm mr-1">{SLOT_LABELS[slot].icon}</span>
                {SLOT_LABELS[slot].label}
                {slotEquipped && (
                  <span className="ml-1 text-[10px] text-[#55EFC4]">●</span>
                )}
                {/* Owned count per slot */}
                <span className="ml-1 text-[8px] text-white/25">
                  {stats.owned}/{stats.total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Currency display */}
        <div className="flex items-center justify-end gap-3 mb-2 px-1">
          <span className="text-[10px] text-[#FFEAA7] font-bold">
            💰 {user?.gold?.toLocaleString() || 0}
          </span>
          <span className="text-[10px] text-[#D4AF37] font-bold">
            💎 {user?.gems?.toLocaleString() || 0}
          </span>
        </div>

        {/* Accessory grid */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1 min-h-0">
          {slotItems.length === 0 ? (
            <div className="empty-state py-8">
              <span className="text-3xl mb-2 block">🎀</span>
              <p>이 슬롯에 악세서리가 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 stagger-children pb-2">
              {slotItems.map((acc) => {
                const isOwned = acc.owned;
                const isEquippedHere = equippedInSlot?.accessory_id === acc.id;
                const isBuying = buying === acc.id;
                const isEquippingThis = equipping === acc.id;
                const wasJustBought = justBought === acc.id;

                // Price indicator
                const priceColor = acc.cost_gems > 0 ? "#D4AF37" : "#FFEAA7";

                return (
                  <div
                    key={acc.id}
                    className={`game-card p-3 flex flex-col items-center gap-2 relative transition-all ${
                      isEquippedHere ? "highlight-selected" : ""
                    } ${wasJustBought ? "ring-2 ring-[#55EFC4]/40" : ""}`}
                    style={{
                      opacity: !isOwned ? 0.7 : 1,
                    }}
                  >
                    {/* Equipped indicator */}
                    {isEquippedHere && (
                      <div
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full text-[10px] flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg, #C9A84C, #D4AF37)",
                        }}
                      >
                        ✓
                      </div>
                    )}

                    {/* Owned badge */}
                    {isOwned && !isEquippedHere && (
                      <div
                        className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1.5 py-px rounded-full"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}
                      >
                        보유
                      </div>
                    )}

                    {/* Icon preview */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform hover:scale-110"
                      style={{
                        background: isOwned
                          ? "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(139,105,20,0.15))"
                          : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <AccessoryPreview overlayId={acc.svg_overlay} fallbackIcon={acc.icon} />
                    </div>

                    {/* Name */}
                    <span className="text-[11px] font-bold text-white/90 text-center leading-tight">
                      {acc.name}
                    </span>

                    {/* Action button */}
                    {!isOwned ? (
                      <button
                        onClick={() => handleBuy(acc)}
                        disabled={isBuying}
                        className="btn-cute w-full py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1"
                        style={{
                          background: acc.cost_gems > 0
                            ? "linear-gradient(135deg, #C9A84C, #D4AF37)"
                            : "linear-gradient(135deg, #FFEAA7, #C9A84C)",
                          color: acc.cost_gems > 0 ? "#1A0E08" : "#3d1f00",
                        }}
                      >
                        {isBuying ? (
                          <span className="animate-spin text-[10px]">⏳</span>
                        ) : (
                          <>
                            <span>{acc.cost_gems > 0 ? "💎" : "💰"}</span>
                            <span style={{ color: priceColor, mixBlendMode: "multiply" }}>
                              {acc.cost_gems > 0 ? acc.cost_gems.toLocaleString() : acc.cost_gold.toLocaleString()}
                            </span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEquip(acc)}
                        disabled={isEquippingThis}
                        className={`w-full py-1.5 rounded-lg text-[10px] font-bold transition ${
                          isEquippedHere
                            ? "bg-white/10 text-white/60 hover:bg-white/15"
                            : "btn-primary text-white"
                        }`}
                      >
                        {isEquippingThis
                          ? "..."
                          : isEquippedHere
                          ? "해제"
                          : "장착"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AccessoryPreview({ overlayId, fallbackIcon }: { overlayId: string; fallbackIcon: string }) {
  const svgMarkup = getAccessorySvg(overlayId);
  const defs = getAccessoryDefs(overlayId);

  if (!svgMarkup) {
    return <span className="text-2xl">{fallbackIcon}</span>;
  }

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
    ${defs ? `<defs>${defs}</defs>` : ""}
    ${svgMarkup}
  </svg>`;

  const encoded = `data:image/svg+xml,${encodeURIComponent(svgString)}`;
  return <img src={encoded} alt="" className="w-10 h-10" draggable={false} />;
}
