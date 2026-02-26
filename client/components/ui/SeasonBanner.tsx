"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi } from "@/lib/api/client";

interface SeasonData {
  id: number;
  name: string;
  name_en: string;
  description: string;
  banner_color: string;
  days_left: number;
}

export default function SeasonBanner() {
  const token = useAuthStore((s) => s.accessToken);
  const [season, setSeason] = useState<SeasonData | null>(null);

  useEffect(() => {
    if (!token) return;
    authApi<{ active: boolean; season: SeasonData | null }>("/api/seasons/active", token)
      .then((res) => {
        if (res.active && res.season) {
          setSeason(res.season);
        }
      })
      .catch(() => {});
  }, [token]);

  if (!season) return null;

  return (
    <div
      className="rounded-xl p-3 mb-2"
      style={{
        background: `linear-gradient(135deg, ${season.banner_color}20, ${season.banner_color}08)`,
        border: `1px solid ${season.banner_color}30`,
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-white text-xs font-bold">{season.name}</h4>
          <p className="text-[#B2BEC3] text-[9px] mt-0.5">{season.description}</p>
        </div>
        <div className="text-right">
          <span
            className={`text-[10px] font-bold ${season.days_left <= 3 ? "animate-pulse" : ""}`}
            style={{ color: season.banner_color }}
          >
            {season.days_left <= 3 ? "🔥 " : ""}D-{season.days_left}
          </span>
        </div>
      </div>
    </div>
  );
}
