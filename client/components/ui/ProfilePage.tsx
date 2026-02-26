"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore } from "@/lib/store/gameStore";
import { useLocaleStore } from "@/lib/store/localeStore";
import { type Locale } from "@/lib/i18n/translations";
import { authApi, uploadApi, resolveMediaUrl } from "@/lib/api/client";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import { useShortsStore } from "@/lib/store/shortsStore";
import ShortsUploadModal from "./ShortsUploadModal";

const NICKNAME_COST = 500;

// Homepage URL: derive host from API URL for LAN/Android compatibility
const HOMEPAGE_URL = (() => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  if (apiUrl) {
    try {
      const u = new URL(apiUrl);
      return `${u.protocol}//${u.hostname}:3003`;
    } catch { /* fallback */ }
  }
  return "http://localhost:3003";
})();

// ─── Profile background presets ──────────────────────────────────────────────

const BG_PRESETS = [
  { id: "purple", gradient: "linear-gradient(135deg, #6C5CE7 0%, #A29BFE 50%, #DFE6E9 100%)", label: "보라" },
  { id: "teal", gradient: "linear-gradient(135deg, #00B894 0%, #55EFC4 50%, #81ECEC 100%)", label: "청록" },
  { id: "sunset", gradient: "linear-gradient(135deg, #E17055 0%, #FDCB6E 50%, #FFEAA7 100%)", label: "일몰" },
  { id: "forest", gradient: "linear-gradient(135deg, #00B894 0%, #2D3436 50%, #55EFC4 100%)", label: "숲" },
  { id: "ocean", gradient: "linear-gradient(135deg, #0984E3 0%, #74B9FF 50%, #DFE6E9 100%)", label: "바다" },
  { id: "night", gradient: "linear-gradient(135deg, #2D3436 0%, #6C5CE7 50%, #0984E3 100%)", label: "밤하늘" },
];

const LANGUAGE_OPTIONS: { value: Locale; labelKey: string }[] = [
  { value: "auto", labelKey: "lang_auto" },
  { value: "ko", labelKey: "lang_ko" },
  { value: "en", labelKey: "lang_en" },
  { value: "ja", labelKey: "lang_ja" },
  { value: "zh-TW", labelKey: "lang_zh" },
];

const CONTACT_CATEGORIES = [
  "contact_category_bug",
  "contact_category_suggestion",
  "contact_category_account",
  "contact_category_other",
];

// ─── Sub-views ───────────────────────────────────────────────────────────────

type SubView = "main" | "language" | "contact" | "terms" | "privacy" | "account" | "notifications" | "creator";

interface Props {
  onClose: () => void;
}

export default function ProfilePage({ onClose }: Props) {
  const router = useRouter();
  const { user, accessToken, fetchUser, logout } = useAuthStore();
  const { slimes, species, equippedAccessories } = useGameStore();
  const { locale, setLocale, t } = useLocaleStore();

  const [subView, setSubView] = useState<SubView>("main");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNicknameCostModal, setShowNicknameCostModal] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showSlimePicker, setShowSlimePicker] = useState(false);

  // Profile background
  const [bgId, setBgId] = useState(() => {
    if (typeof window === "undefined") return "purple";
    return localStorage.getItem("profile_bg") || "purple";
  });

  // Avatar slime selection
  const [avatarSlimeId, setAvatarSlimeId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("profile_slime_id");
  });

  // Nickname editing
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameValue, setNicknameValue] = useState(user?.nickname || "");
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  // Community stats
  const [communityStats, setCommunityStats] = useState({ post_count: 0, comment_count: 0 });

  // Contact form
  const [contactCategory, setContactCategory] = useState(CONTACT_CATEGORIES[0]);
  const [contactEmail, setContactEmail] = useState("");
  const [contactContent, setContactContent] = useState("");

  useEffect(() => {
    if (editingNickname && nicknameInputRef.current) {
      nicknameInputRef.current.focus();
      nicknameInputRef.current.select();
    }
  }, [editingNickname]);

  useEffect(() => {
    if (user) setNicknameValue(user.nickname);
  }, [user]);

  // Fetch community stats
  useEffect(() => {
    if (!accessToken) return;
    authApi<{ post_count: number; comment_count: number }>("/api/user/me/community-stats", accessToken)
      .then(setCommunityStats)
      .catch(() => {});
  }, [accessToken]);

  const bgPreset = BG_PRESETS.find((b) => b.id === bgId) || BG_PRESETS[0];

  // Get avatar slime info — prefer saved selection, fallback to first slime
  const avatarSlime = (avatarSlimeId ? slimes.find((s) => s.id === avatarSlimeId) : null) || slimes[0];
  const avatarSpecies = avatarSlime ? species.find((sp) => sp.id === avatarSlime.species_id) : null;
  const avatarElement = avatarSlime?.element || "water";
  const avatarGrade = avatarSpecies?.grade || "common";
  const avatarAccessoryOverlays = avatarSlime
    ? (equippedAccessories[avatarSlime.id] || []).map(e => e.svg_overlay).filter(Boolean)
    : undefined;

  const handleBgChange = (id: string) => {
    setBgId(id);
    localStorage.setItem("profile_bg", id);
    setShowBgPicker(false);
  };

  const handleSelectAvatarSlime = (slimeId: string) => {
    setAvatarSlimeId(slimeId);
    localStorage.setItem("profile_slime_id", slimeId);
    setShowSlimePicker(false);
  };

  const handleNicknameEditDone = useCallback(() => {
    setEditingNickname(false);
    if (!nicknameValue.trim() || nicknameValue === user?.nickname) {
      if (user) setNicknameValue(user.nickname);
      return;
    }
    setShowNicknameCostModal(true);
  }, [nicknameValue, user]);

  const handleNicknameConfirm = useCallback(async () => {
    setShowNicknameCostModal(false);
    if (!accessToken || !nicknameValue.trim()) return;
    try {
      await authApi("/api/user/me/nickname", accessToken, {
        method: "PATCH",
        body: { nickname: nicknameValue.trim() },
      });
      await fetchUser();
      toastSuccess(t("nickname_updated"));
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } };
      if (e?.data?.error === "insufficient gold") {
        toastError(t("not_enough_gold"));
      } else {
        toastError(t("nickname_failed"));
      }
      if (user) setNicknameValue(user.nickname);
    }
  }, [accessToken, nicknameValue, user, fetchUser, t]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleContactSubmit = () => {
    // Fake submit
    toastSuccess(t("contact_success"), "📩");
    setContactContent("");
    setContactEmail("");
    setSubView("main");
  };

  const handleBack = () => {
    if (subView !== "main") {
      setSubView("main");
    } else {
      onClose();
    }
  };

  const getTitle = () => {
    switch (subView) {
      case "contact": return t("contact_title");
      case "terms": return t("terms_title");
      case "privacy": return t("privacy_title");
      case "language": return t("select_language");
      case "account": return "계정 관리";
      case "notifications": return "알림 설정";
      case "creator": return "크리에이터 스튜디오";
      default: return t("profile");
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-[#0a0a1a]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 overlay-header">
        <button onClick={handleBack} className="text-white/60 hover:text-white transition text-lg">
          ←
        </button>
        <h1 className="text-white font-bold text-lg flex-1">{getTitle()}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {subView === "main" && (
          <MainView
            bgPreset={bgPreset}
            avatarElement={avatarElement}
            avatarGrade={avatarGrade}
            avatarAccessoryOverlays={avatarAccessoryOverlays}
            user={user}
            editingNickname={editingNickname}
            nicknameValue={nicknameValue}
            nicknameInputRef={nicknameInputRef}
            communityStats={communityStats}
            locale={locale}
            showBgPicker={showBgPicker}
            showSlimePicker={showSlimePicker}
            slimes={slimes}
            species={species}
            avatarSlimeId={avatarSlime?.id || null}
            accessToken={accessToken}
            fetchUser={fetchUser}
            t={t}
            setEditingNickname={setEditingNickname}
            setNicknameValue={setNicknameValue}
            handleNicknameSubmit={handleNicknameEditDone}
            setShowBgPicker={setShowBgPicker}
            setShowSlimePicker={setShowSlimePicker}
            handleBgChange={handleBgChange}
            handleSelectAvatarSlime={handleSelectAvatarSlime}
            setSubView={setSubView}
            setShowLogoutModal={setShowLogoutModal}
          />
        )}

        {subView === "language" && (
          <LanguageView locale={locale} setLocale={setLocale} t={t} setSubView={setSubView} />
        )}

        {subView === "contact" && (
          <ContactView
            t={t}
            contactCategory={contactCategory}
            setContactCategory={setContactCategory}
            contactEmail={contactEmail}
            setContactEmail={setContactEmail}
            contactContent={contactContent}
            setContactContent={setContactContent}
            handleContactSubmit={handleContactSubmit}
          />
        )}

        {subView === "terms" && <TextView content={t("terms_content")} />}
        {subView === "privacy" && <TextView content={t("privacy_content")} />}

        {subView === "account" && (
          <AccountView user={user} accessToken={accessToken} fetchUser={fetchUser} t={t} />
        )}

        {subView === "notifications" && <NotificationSettingsView t={t} />}

        {subView === "creator" && <CreatorStudioView />}
      </div>

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 mx-6 max-w-[320px] w-full border border-white/10"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
            <p className="text-white text-center font-medium mb-6">{t("logout_confirm")}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 font-bold text-sm border border-white/10 active:scale-95 transition">
                {t("cancel")}
              </button>
              <button onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white active:scale-95 transition"
                style={{ background: "linear-gradient(135deg, #FF6B6B, #E17055)" }}>
                {t("logout")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nickname cost confirmation modal */}
      {showNicknameCostModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 mx-6 max-w-[320px] w-full border border-white/10"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
            <p className="text-white text-center font-medium mb-2">닉네임 변경</p>
            <p className="text-white/60 text-center text-sm mb-6">
              🪙 {NICKNAME_COST} 골드를 사용하여 닉네임을 변경하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setShowNicknameCostModal(false); if (user) setNicknameValue(user.nickname); }}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 font-bold text-sm border border-white/10 active:scale-95 transition">
                {t("cancel")}
              </button>
              <button onClick={handleNicknameConfirm}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white active:scale-95 transition"
                style={{ background: "linear-gradient(135deg, #FFEAA7, #FDCB6E)" }}>
                <span className="text-[#0a0a1a]">변경하기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────────────────────────

interface MainViewProps {
  bgPreset: typeof BG_PRESETS[0];
  avatarElement: string;
  avatarGrade: string;
  avatarAccessoryOverlays?: string[];
  user: { id?: string; nickname: string; level: number; gold: number; gems: number; stardust: number; profile_image_url?: string } | null;
  editingNickname: boolean;
  nicknameValue: string;
  nicknameInputRef: React.RefObject<HTMLInputElement | null>;
  communityStats: { post_count: number; comment_count: number };
  locale: Locale;
  showBgPicker: boolean;
  showSlimePicker: boolean;
  slimes: { id: string; species_id: number; element: string; name: string | null }[];
  species: { id: number; name: string; grade: string; element: string }[];
  avatarSlimeId: string | null;
  accessToken: string | null;
  fetchUser: () => Promise<void>;
  t: (key: string) => string;
  setEditingNickname: (v: boolean) => void;
  setNicknameValue: (v: string) => void;
  handleNicknameSubmit: () => void;
  setShowBgPicker: (v: boolean) => void;
  setShowSlimePicker: (v: boolean) => void;
  handleBgChange: (id: string) => void;
  handleSelectAvatarSlime: (id: string) => void;
  setSubView: (v: SubView) => void;
  setShowLogoutModal: (v: boolean) => void;
}

function MainView({
  bgPreset, avatarElement, avatarGrade, avatarAccessoryOverlays, user, editingNickname, nicknameValue,
  nicknameInputRef, communityStats, locale, showBgPicker, showSlimePicker, slimes, species, avatarSlimeId,
  accessToken, fetchUser, t,
  setEditingNickname, setNicknameValue, handleNicknameSubmit,
  setShowBgPicker, setShowSlimePicker, handleBgChange, handleSelectAvatarSlime, setSubView, setShowLogoutModal,
}: MainViewProps) {
  const avatarSpeciesId = avatarSlimeId ? slimes.find((s) => s.id === avatarSlimeId)?.species_id : undefined;
  const avatarSvg = generateSlimeIconSvg(avatarElement, 80, avatarGrade, avatarAccessoryOverlays, avatarSpeciesId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    if (file.size > 5 * 1024 * 1024) {
      toastError("이미지 크기는 5MB 이하여야 합니다");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      await uploadApi<{ profile_image_url: string }>("/api/profile/image", formData, accessToken);
      await fetchUser();
      toastSuccess("프로필 이미지가 변경되었습니다", "📸");
    } catch {
      toastError("이미지 업로드에 실패했습니다");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const langLabel = LANGUAGE_OPTIONS.find((o) => o.value === locale)?.labelKey || "lang_auto";
  const hasProfileImage = !!user?.profile_image_url;

  return (
    <div className="p-4 space-y-4">
      {/* Profile Card */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: bgPreset.gradient }}>
        {/* Background picker button */}
        <button onClick={() => setShowBgPicker(!showBgPicker)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-sm active:scale-90 transition z-10">
          🎨
        </button>

        <div className="p-6 flex flex-col items-center">
          {/* Avatar — show profile image or slime */}
          <div className="relative mb-3">
            <button onClick={() => setShowSlimePicker(!showSlimePicker)}
              className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 active:scale-95 transition overflow-hidden"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              {hasProfileImage ? (
                <img src={resolveMediaUrl(user!.profile_image_url!)} alt="profile" className="w-full h-full object-cover" draggable={false} />
              ) : (
                <img src={avatarSvg} alt="avatar" className="w-16 h-16" draggable={false} />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </button>
            {/* Camera button for photo upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#55EFC4] flex items-center justify-center text-xs active:scale-90 transition border-2 border-white/80"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
              📷
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Nickname */}
          {editingNickname ? (
            <input
              ref={nicknameInputRef}
              value={nicknameValue}
              onChange={(e) => setNicknameValue(e.target.value)}
              onBlur={handleNicknameSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleNicknameSubmit()}
              maxLength={20}
              className="text-white font-bold text-xl text-center bg-black/30 rounded-lg px-3 py-1 outline-none border border-white/30 w-48"
            />
          ) : (
            <button onClick={() => setEditingNickname(true)} className="group">
              <span className="text-white font-bold text-xl">{user?.nickname}</span>
              <span className="text-white/40 text-xs ml-2 group-hover:text-white/60 transition">✏️</span>
              <p className="text-white/50 text-[10px] mt-0.5">{t("tap_to_edit")} (🪙 {NICKNAME_COST})</p>
            </button>
          )}

          {/* Level */}
          <div className="mt-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm">
            <span className="text-white/80 text-xs font-bold">{t("level")} {user?.level}</span>
          </div>

          {/* Currency row */}
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-sm">🪙</span>
              <span className="text-white/80 text-xs font-medium">{user?.gold?.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-purple-400 text-sm">💎</span>
              <span className="text-white/80 text-xs font-medium">{user?.gems?.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-cyan-300 text-sm">✨</span>
              <span className="text-white/80 text-xs font-medium">{user?.stardust?.toLocaleString()}</span>
            </div>
          </div>

          {/* Community stats */}
          <div className="flex gap-6 mt-3">
            <div className="text-center">
              <p className="text-white font-bold text-lg">{communityStats.post_count}</p>
              <p className="text-white/50 text-[10px]">{t("posts")}</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">{communityStats.comment_count}</p>
              <p className="text-white/50 text-[10px]">{t("comments")}</p>
            </div>
          </div>
        </div>

        {/* Slime picker grid */}
        {showSlimePicker && slimes.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-white/60 text-xs font-bold mb-2">아바타 슬라임 선택</p>
            <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {slimes.map((sl) => {
                const sp = species.find((s) => s.id === sl.species_id);
                const icon = generateSlimeIconSvg(sl.element, 36, sp?.grade || "common", undefined, sl.species_id);
                const isSelected = sl.id === avatarSlimeId;
                return (
                  <button key={sl.id} onClick={() => handleSelectAvatarSlime(sl.id)}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition active:scale-90"
                    style={{
                      background: isSelected ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)",
                      border: isSelected ? "2px solid rgba(255,255,255,0.6)" : "2px solid transparent",
                    }}>
                    <img src={icon} alt="" className="w-9 h-9" draggable={false} />
                    <span className="text-white/70 text-[8px] truncate max-w-full">
                      {sl.name || sp?.name || `#${sl.species_id}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Background picker grid */}
        {showBgPicker && (
          <div className="px-4 pb-4">
            <p className="text-white/60 text-xs font-bold mb-2">{t("change_background")}</p>
            <div className="grid grid-cols-6 gap-2">
              {BG_PRESETS.map((preset) => (
                <button key={preset.id} onClick={() => handleBgChange(preset.id)}
                  className="w-full aspect-square rounded-lg border-2 transition active:scale-90"
                  style={{
                    background: preset.gradient,
                    borderColor: preset.id === bgPreset.id ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.1)",
                  }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings Section */}
      <div className="rounded-2xl overflow-hidden border border-white/5"
        style={{ background: "linear-gradient(180deg, rgba(20,20,40,0.9), rgba(15,15,30,0.95))" }}>

        <SettingsItem emoji="🎬" label="크리에이터 스튜디오" onClick={() => setSubView("creator")} />
        <Divider />
        <SettingsItem emoji="👤" label="계정 관리" onClick={() => setSubView("account")} />
        <Divider />
        <SettingsItem emoji="🔔" label="알림 설정" onClick={() => setSubView("notifications")} />
        <Divider />
        <SettingsItem emoji="🌐" label={t("language")} value={t(langLabel)} onClick={() => setSubView("language")} />
        <Divider />
        <SettingsItem emoji="📩" label={t("contact")} onClick={() => setSubView("contact")} />
        <Divider />
        <SettingsItem emoji="📋" label={t("terms")} onClick={() => setSubView("terms")} />
        <Divider />
        <SettingsItem emoji="🔒" label={t("privacy")} onClick={() => setSubView("privacy")} />
        <Divider />
        <SettingsItem emoji="🚪" label={t("logout")} danger onClick={() => setShowLogoutModal(true)} />
      </div>

      {/* Homepage link */}
      <a
        href={HOMEPAGE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-2xl overflow-hidden border border-white/5 active:scale-[0.98] transition"
        style={{ background: "linear-gradient(135deg, rgba(85,239,196,0.08), rgba(0,184,148,0.04))" }}
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-lg">🏠</span>
          <div className="flex-1">
            <p className="text-white/80 text-sm font-medium">SlimeTopia 홈페이지</p>
            <p className="text-white/30 text-[10px] mt-0.5">공식 홈페이지 방문하기</p>
          </div>
          <span className="text-[#55EFC4]/60 text-sm">↗</span>
        </div>
      </a>

      {/* Version info */}
      <p className="text-center text-white/20 text-[10px] py-2">
        SlimeTopia v1.0.0 (Build 2026.02)
      </p>
    </div>
  );
}

// ─── Settings Item ───────────────────────────────────────────────────────────

function SettingsItem({ emoji, label, value, danger, onClick }: {
  emoji: string;
  label: string;
  value?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition">
      <span className="text-lg">{emoji}</span>
      <span className={`flex-1 text-left text-sm font-medium ${danger ? "text-red-400" : "text-white/80"}`}>
        {label}
      </span>
      {value && <span className="text-white/40 text-xs">{value}</span>}
      <span className="text-white/20 text-sm">›</span>
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-white/5 mx-4" />;
}

// ─── Language View ───────────────────────────────────────────────────────────

function LanguageView({ locale, setLocale, t, setSubView }: {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  setSubView: (v: SubView) => void;
}) {
  const handleSelect = (value: Locale) => {
    setLocale(value);
    setSubView("main");
  };

  return (
    <div className="p-4">
      <div className="rounded-2xl overflow-hidden border border-white/5"
        style={{ background: "linear-gradient(180deg, rgba(20,20,40,0.9), rgba(15,15,30,0.95))" }}>
        {LANGUAGE_OPTIONS.map((opt, idx) => (
          <div key={opt.value}>
            {idx > 0 && <Divider />}
            <button onClick={() => handleSelect(opt.value)}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition">
              <span className={`flex-1 text-left text-sm font-medium ${locale === opt.value ? "text-[#55EFC4]" : "text-white/80"}`}>
                {t(opt.labelKey)}
              </span>
              {locale === opt.value && <span className="text-[#55EFC4] text-sm">✓</span>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Contact View ────────────────────────────────────────────────────────────

function ContactView({ t, contactCategory, setContactCategory, contactEmail, setContactEmail, contactContent, setContactContent, handleContactSubmit }: {
  t: (key: string) => string;
  contactCategory: string;
  setContactCategory: (v: string) => void;
  contactEmail: string;
  setContactEmail: (v: string) => void;
  contactContent: string;
  setContactContent: (v: string) => void;
  handleContactSubmit: () => void;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Category */}
      <div>
        <label className="text-white/50 text-xs font-bold mb-2 block">{t("contact_category")}</label>
        <div className="flex flex-wrap gap-2">
          {CONTACT_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setContactCategory(cat)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95"
              style={{
                background: contactCategory === cat ? "rgba(85,239,196,0.15)" : "rgba(255,255,255,0.05)",
                border: contactCategory === cat ? "1px solid rgba(85,239,196,0.3)" : "1px solid rgba(255,255,255,0.1)",
                color: contactCategory === cat ? "#55EFC4" : "rgba(255,255,255,0.6)",
              }}>
              {t(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="text-white/50 text-xs font-bold mb-2 block">{t("contact_email")}</label>
        <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
          placeholder="email@example.com"
          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#55EFC4]/30 transition placeholder:text-white/20" />
      </div>

      {/* Content */}
      <div>
        <label className="text-white/50 text-xs font-bold mb-2 block">{t("contact_content")}</label>
        <textarea value={contactContent} onChange={(e) => setContactContent(e.target.value)}
          placeholder={t("contact_placeholder")}
          rows={6}
          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#55EFC4]/30 transition resize-none placeholder:text-white/20" />
      </div>

      {/* Submit */}
      <button onClick={handleContactSubmit}
        disabled={!contactContent.trim()}
        className="w-full py-3 rounded-xl font-bold text-sm text-white transition active:scale-[0.98] disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #55EFC4, #00B894)" }}>
        {t("contact_submit")}
      </button>
    </div>
  );
}

// ─── Text View (Terms / Privacy) ─────────────────────────────────────────────

function TextView({ content }: { content: string }) {
  return (
    <div className="p-4">
      <div className="rounded-2xl p-4 border border-white/5"
        style={{ background: "linear-gradient(180deg, rgba(20,20,40,0.9), rgba(15,15,30,0.95))" }}>
        <pre className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap font-sans">
          {content}
        </pre>
      </div>
    </div>
  );
}

// ─── Account View ─────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  if (!email) return "-";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function AccountView({ user, accessToken, fetchUser, t }: {
  user: { id?: string; nickname: string; email?: string } | null;
  accessToken: string | null;
  fetchUser: () => Promise<void>;
  t: (key: string) => string;
}) {
  const [copied, setCopied] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const handleCopyUuid = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleChangePassword = async () => {
    if (!accessToken || !currentPw || !newPw) return;
    if (newPw !== confirmPw) {
      toastError("새 비밀번호가 일치하지 않습니다");
      return;
    }
    if (newPw.length < 6) {
      toastError("비밀번호는 6자 이상이어야 합니다");
      return;
    }
    setPwLoading(true);
    try {
      await authApi("/api/user/me/password", accessToken, {
        method: "PATCH",
        body: { current_password: currentPw, new_password: newPw },
      });
      toastSuccess("비밀번호가 변경되었습니다");
      setShowPwForm(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } };
      if (e?.data?.error === "incorrect password") {
        toastError("현재 비밀번호가 올바르지 않습니다");
      } else {
        toastError("비밀번호 변경에 실패했습니다");
      }
    }
    setPwLoading(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl overflow-hidden border border-white/5"
        style={{ background: "linear-gradient(180deg, rgba(20,20,40,0.9), rgba(15,15,30,0.95))" }}>

        {/* UUID */}
        <div className="px-4 py-3.5">
          <p className="text-white/40 text-[10px] font-bold mb-1">내 UUID</p>
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-xs font-mono flex-1 truncate">{user?.id || "-"}</span>
            <button onClick={handleCopyUuid}
              className="px-2 py-1 rounded-lg bg-white/5 text-white/50 text-[10px] font-bold hover:bg-white/10 transition active:scale-95">
              {copied ? "복사됨!" : "복사"}
            </button>
          </div>
        </div>
        <Divider />

        {/* Nickname */}
        <div className="px-4 py-3.5">
          <p className="text-white/40 text-[10px] font-bold mb-1">닉네임</p>
          <p className="text-white/80 text-sm">{user?.nickname || "-"}</p>
          <p className="text-white/30 text-[10px] mt-0.5">프로필 화면에서 변경 가능 (🪙 {NICKNAME_COST})</p>
        </div>
        <Divider />

        {/* Email */}
        <div className="px-4 py-3.5">
          <p className="text-white/40 text-[10px] font-bold mb-1">이메일</p>
          <p className="text-white/80 text-sm">{maskEmail(user?.email || "")}</p>
        </div>
        <Divider />

        {/* Password */}
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between">
            <p className="text-white/40 text-[10px] font-bold">비밀번호</p>
            <button onClick={() => setShowPwForm(!showPwForm)}
              className="text-[#55EFC4] text-[10px] font-bold hover:text-[#00B894] transition">
              {showPwForm ? "취소" : "변경하기"}
            </button>
          </div>

          {showPwForm && (
            <div className="mt-3 space-y-2">
              <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="현재 비밀번호"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#55EFC4]/30 transition placeholder:text-white/20" />
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                placeholder="새 비밀번호 (6자 이상)"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#55EFC4]/30 transition placeholder:text-white/20" />
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="새 비밀번호 확인"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#55EFC4]/30 transition placeholder:text-white/20" />
              <button onClick={handleChangePassword} disabled={pwLoading || !currentPw || !newPw || !confirmPw}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition active:scale-[0.98] disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #55EFC4, #00B894)" }}>
                {pwLoading ? "변경 중..." : "비밀번호 변경"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Notification Settings View ───────────────────────────────────────────────

function NotificationSettingsView({ t }: { t: (key: string) => string }) {
  const [gameNotif, setGameNotif] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("notification_game") !== "false" : true
  );
  const [communityNotif, setCommunityNotif] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("notification_community") !== "false" : true
  );
  const [eventNotif, setEventNotif] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("notification_event") !== "false" : true
  );

  const toggle = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(!value);
    localStorage.setItem(key, String(!value));
  };

  return (
    <div className="p-4">
      <div className="rounded-2xl overflow-hidden border border-white/5"
        style={{ background: "linear-gradient(180deg, rgba(20,20,40,0.9), rgba(15,15,30,0.95))" }}>

        <ToggleItem label="게임 알림" desc="탐험 완료, 배고픈 슬라임 등"
          value={gameNotif} onToggle={() => toggle("notification_game", gameNotif, setGameNotif)} />
        <Divider />
        <ToggleItem label="커뮤니티 알림" desc="댓글, 좋아요 알림"
          value={communityNotif} onToggle={() => toggle("notification_community", communityNotif, setCommunityNotif)} />
        <Divider />
        <ToggleItem label="이벤트/공지 알림" desc="새 이벤트, 업데이트 공지"
          value={eventNotif} onToggle={() => toggle("notification_event", eventNotif, setEventNotif)} />
      </div>
    </div>
  );
}

// ─── Creator Studio View ──────────────────────────────────────────────────────

function CreatorStudioView() {
  const token = useAuthStore((s) => s.accessToken);
  const { myShorts, myTotalViews, myTotalLikes, myTotalTipsGold, myTotalTipsGems, fetchMyShorts, deleteShort } = useShortsStore();
  const [showUpload, setShowUpload] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (token) fetchMyShorts(token);
  }, [token]);

  const handleDelete = async (id: string) => {
    if (!token || deleting) return;
    setDeleting(id);
    try {
      await deleteShort(token, id);
      toastSuccess("삭제되었습니다");
    } catch {
      toastError("삭제에 실패했습니다");
    }
    setDeleting(null);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 border border-white/5" style={{ background: "rgba(20,20,40,0.9)" }}>
          <p className="text-white/40 text-[10px]">총 조회수</p>
          <p className="text-white font-bold text-lg">{myTotalViews.toLocaleString()}</p>
        </div>
        <div className="rounded-xl p-3 border border-white/5" style={{ background: "rgba(20,20,40,0.9)" }}>
          <p className="text-white/40 text-[10px]">총 좋아요</p>
          <p className="text-white font-bold text-lg">{myTotalLikes.toLocaleString()}</p>
        </div>
        <div className="rounded-xl p-3 border border-white/5" style={{ background: "rgba(20,20,40,0.9)" }}>
          <p className="text-white/40 text-[10px]">받은 골드</p>
          <p className="text-yellow-400 font-bold text-lg">{myTotalTipsGold.toLocaleString()}G</p>
        </div>
        <div className="rounded-xl p-3 border border-white/5" style={{ background: "rgba(20,20,40,0.9)" }}>
          <p className="text-white/40 text-[10px]">받은 젬</p>
          <p className="text-purple-400 font-bold text-lg">{myTotalTipsGems.toLocaleString()}</p>
        </div>
      </div>

      {/* Upload button */}
      <button
        onClick={() => setShowUpload(true)}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm"
      >
        새 쇼츠 업로드
      </button>

      {/* My shorts grid */}
      <div>
        <h3 className="text-white/60 text-xs font-bold mb-3">내 쇼츠 ({myShorts.length})</h3>
        {myShorts.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">
            아직 업로드한 쇼츠가 없어요
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {myShorts.map((s) => (
              <div key={s.id} className="rounded-xl overflow-hidden border border-white/5" style={{ background: "rgba(20,20,40,0.9)" }}>
                {/* Thumbnail */}
                <div className="aspect-[9/16] max-h-36 bg-black/50 relative">
                  {s.thumbnail_url ? (
                    <img src={s.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
                  )}
                  <div className="absolute bottom-1 right-1 flex gap-1">
                    <span className="text-[9px] text-white/70 bg-black/50 px-1 rounded">
                      👁️ {s.views}
                    </span>
                    <span className="text-[9px] text-white/70 bg-black/50 px-1 rounded">
                      ❤️ {s.likes}
                    </span>
                  </div>
                </div>
                {/* Info */}
                <div className="p-2">
                  <p className="text-white/80 text-xs font-bold truncate">{s.title}</p>
                  <p className="text-white/30 text-[10px] mt-0.5">{formatTime(s.created_at)}</p>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deleting === s.id}
                    className="mt-1.5 w-full py-1 rounded-lg bg-red-500/10 text-red-400/70 text-[10px] font-bold border border-red-500/10"
                  >
                    {deleting === s.id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && <ShortsUploadModal onClose={() => { setShowUpload(false); if (token) fetchMyShorts(token); }} />}
    </div>
  );
}

function ToggleItem({ label, desc, value, onToggle }: {
  label: string;
  desc: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition">
      <div className="flex-1 text-left">
        <p className="text-white/80 text-sm font-medium">{label}</p>
        <p className="text-white/30 text-[10px] mt-0.5">{desc}</p>
      </div>
      <div className="w-10 h-6 rounded-full relative transition-colors duration-200"
        style={{ background: value ? "rgba(85,239,196,0.4)" : "rgba(255,255,255,0.1)" }}>
        <div className="absolute top-1 w-4 h-4 rounded-full transition-all duration-200"
          style={{
            left: value ? 20 : 4,
            background: value ? "#55EFC4" : "rgba(255,255,255,0.3)",
          }} />
      </div>
    </button>
  );
}
