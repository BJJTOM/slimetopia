"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi } from "@/lib/api/client";

interface EvolutionNode {
  id: number;
  name: string;
  type: string;
  buff: Record<string, number>;
  cost: number;
  requires: number[];
  unlocked: boolean;
  can_unlock: boolean;
}

interface Props {
  speciesId: number;
  onClose: () => void;
}

export default function EvolutionTree({ speciesId, onClose }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [speciesName, setSpeciesName] = useState("");
  const [nodes, setNodes] = useState<EvolutionNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTree = async () => {
    if (!token) return;
    try {
      const res = await authApi<{ species_name: string; nodes: EvolutionNode[] }>(
        `/api/evolution/${speciesId}`,
        token,
      );
      setSpeciesName(res.species_name);
      setNodes(res.nodes || []);
    } catch {
      // no tree for this species
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTree();
  }, [speciesId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnlock = async (nodeId: number) => {
    if (!token) return;
    try {
      await authApi(`/api/evolution/${speciesId}/unlock`, token, {
        method: "POST",
        body: { node_id: nodeId },
      });
      useAuthStore.getState().fetchUser();
      fetchTree();
    } catch {
      // insufficient stardust or other error
    }
  };

  if (loading) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="text-[#B2BEC3] animate-pulse">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="game-panel rounded-2xl w-[320px] max-w-[90%] max-h-[80vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="game-panel-header px-4 py-3 rounded-t-2xl flex items-center justify-between shrink-0">
          <h2 className="text-white font-bold text-sm">{speciesName} 진화 트리</h2>
          <button onClick={onClose} className="text-[#B2BEC3] hover:text-white text-sm">✕</button>
        </div>

        <div className="p-4 overflow-y-auto game-scroll flex-1">
          {/* Stardust display */}
          <div className="flex items-center justify-end gap-1 mb-3">
            <img src="/assets/icons/stardust.png" alt="" className="w-4 h-4 pixel-art" />
            <span className="text-[#A29BFE] text-xs font-bold">{user?.stardust || 0}</span>
          </div>

          {/* Node list with connections */}
          <div className="space-y-2">
            {nodes.map((node, idx) => {
              const bgColor = node.unlocked
                ? "bg-[#55EFC4]/15 border-[#55EFC4]/30"
                : node.can_unlock
                ? "bg-[#A29BFE]/10 border-[#A29BFE]/30"
                : "bg-white/[0.02] border-white/[0.06]";

              const typeIcon = typeIcons[node.type] || "🔮";

              return (
                <div key={node.id}>
                  {/* Connection line */}
                  {idx > 0 && (
                    <div className="flex justify-center -my-1">
                      <div className={`w-0.5 h-3 ${node.unlocked ? "bg-[#55EFC4]/40" : "bg-white/10"}`} />
                    </div>
                  )}
                  <div className={`border rounded-xl p-3 ${bgColor}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm shrink-0">{typeIcon}</span>
                        <div className="min-w-0">
                          <h4 className="text-white text-xs font-bold truncate">
                            {node.unlocked ? "✓ " : ""}{node.name}
                          </h4>
                          <p className="text-[#B2BEC3] text-[9px] mt-0.5">
                            {typeLabels[node.type] || node.type}
                          </p>
                          {/* Show buff details */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(node.buff).map(([k, v]) => (
                              <span key={k} className="text-[8px] text-[#55EFC4]/70 bg-[#55EFC4]/5 px-1 rounded">
                                {buffLabel(k, v)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {!node.unlocked && node.can_unlock && (
                        <button
                          onClick={() => handleUnlock(node.id)}
                          className="btn-primary px-3 py-1 text-[10px] flex items-center gap-1 shrink-0"
                        >
                          <img src="/assets/icons/stardust.png" alt="" className="w-3 h-3 pixel-art" />
                          {node.cost}
                        </button>
                      )}
                      {!node.unlocked && !node.can_unlock && (
                        <span className="text-[9px] text-[#636e72] flex items-center gap-1 shrink-0">
                          <img src="/assets/icons/stardust.png" alt="" className="w-3 h-3 pixel-art opacity-40" />
                          {node.cost}
                        </span>
                      )}
                      {node.unlocked && (
                        <span className="text-[9px] text-[#55EFC4] font-bold shrink-0">해금됨</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {nodes.length === 0 && (
            <p className="text-center text-[#B2BEC3] text-xs py-4">이 종족의 진화 트리가 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}

const typeLabels: Record<string, string> = {
  stat_buff: "스탯 강화",
  nurture_buff: "육성 강화",
  explore_buff: "탐험 강화",
  evolution: "진화",
};

const typeIcons: Record<string, string> = {
  stat_buff: "💪",
  nurture_buff: "🌱",
  explore_buff: "🧭",
  evolution: "⭐",
};

function buffLabel(key: string, value: number): string {
  const labels: Record<string, string> = {
    affection: `호감 +${value}`,
    condition: `컨디션 +${value}`,
    exp: `경험치 +${value}`,
    exp_bonus: `EXP보너스 +${value}`,
    hunger_decay_reduce: `배고픔감소 -${value}`,
    condition_decay_reduce: `컨디션감소 -${value}`,
    play_bonus: `놀기보너스 +${value}`,
    pet_bonus: `쓰다듬기보너스 +${value}`,
    feed_bonus: `먹이보너스 +${value}`,
    all_explore_bonus: `전체탐험 +${Math.round(value * 100)}%`,
  };
  if (labels[key]) return labels[key];
  if (key.endsWith("_explore_bonus")) {
    const elem = key.replace("_explore_bonus", "");
    return `${elem}탐험 +${Math.round(value * 100)}%`;
  }
  return `${key}: ${value}`;
}
