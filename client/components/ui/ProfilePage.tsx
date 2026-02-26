"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

// Homepage URL: use environment variable or same-origin root
const HOMEPAGE_URL = process.env.NEXT_PUBLIC_HOMEPAGE_URL || (typeof window !== "undefined" ? window.location.origin : "/");

// ─── Parchment theme constants ──────────────────────────────────────────────

const PARCHMENT = {
  pageBg: "#1A0E08",
  headerBg: "linear-gradient(180deg, #4A2515 0%, #3D2017 50%, #2C1810 100%)",
  parchment: "linear-gradient(170deg, #F5E6C8 0%, #E8D5B0 40%, #DCC9A3 100%)",
  parchmentLight: "linear-gradient(160deg, #FFF8EC, #F5E6C8)",
  leatherCard: "linear-gradient(180deg, #3D2017, #2C1810)",
  goldPrimary: "#C9A84C",
  goldDark: "#8B6914",
  goldBright: "#D4AF37",
  ink: "#2C1810",
  inkLight: "#5C4033",
  font: "Georgia, 'Times New Roman', serif",
};

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
  const { user, accessToken, fetchUser, logout } = useAuthStore();
  const { slimes, species, equippedAccessories } = useGameStore();
  const { locale, setLocale, t } = useLocaleStore();

  const [subView, setSubView] = useState<SubView>("main");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNicknameCostModal, setShowNicknameCostModal] = useState(false);
  const [showSlimePicker, setShowSlimePicker] = useState(false);

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

  // Get avatar slime info
  const avatarSlime = (avatarSlimeId ? slimes.find((s) => s.id === avatarSlimeId) : null) || slimes[0];
  const avatarSpecies = avatarSlime ? species.find((sp) => sp.id === avatarSlime.species_id) : null;
  const avatarElement = avatarSlime?.element || "water";
  const avatarGrade = avatarSpecies?.grade || "common";
  const avatarAccessoryOverlays = avatarSlime
    ? (equippedAccessories[avatarSlime.id] || []).map(e => e.svg_overlay).filter(Boolean)
    : undefined;

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
    window.location.replace("/login/");
  };

  const handleContactSubmit = () => {
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
    <div className="h-full flex flex-col" style={{ background: PARCHMENT.pageBg }}>
      {/* Header — leather texture with gold border */}
      <div
        className="relative flex items-center gap-3 px-4"
        style={{
          background: PARCHMENT.headerBg,
          borderBottom: `3px double ${PARCHMENT.goldDark}`,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          paddingBottom: 12,
        }}
      >
        <button onClick={handleBack} style={{ color: PARCHMENT.goldPrimary, fontFamily: PARCHMENT.font }}
          className="hover:opacity-80 transition text-lg">
          ←
        </button>
        <h1 className="font-bold text-lg flex-1 tracking-wide" style={{
          color: "#F5E6C8",
          fontFamily: PARCHMENT.font,
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
        }}>
          {getTitle()}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {subView === "main" && (
          <MainView
            avatarElement={avatarElement}
            avatarGrade={avatarGrade}
            avatarAccessoryOverlays={avatarAccessoryOverlays}
            user={user}
            editingNickname={editingNickname}
            nicknameValue={nicknameValue}
            nicknameInputRef={nicknameInputRef}
            communityStats={communityStats}
            locale={locale}
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
            setShowSlimePicker={setShowSlimePicker}
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

      {/* Logout confirmation modal — parchment style */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl p-6 mx-6 max-w-[320px] w-full relative"
            style={{
              background: PARCHMENT.parchment,
              border: `2px solid ${PARCHMENT.goldPrimary}`,
              boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 0 30px rgba(139,105,20,0.08)",
            }}>
            {/* Corner decorations */}
            <CornerDecorations />
            <p className="text-center font-medium mb-6" style={{
              color: PARCHMENT.ink, fontFamily: PARCHMENT.font,
            }}>{t("logout_confirm")}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition"
                style={{
                  background: "rgba(44,24,16,0.08)",
                  border: `1px solid ${PARCHMENT.goldDark}`,
                  color: PARCHMENT.inkLight,
                  fontFamily: PARCHMENT.font,
                }}>
                {t("cancel")}
              </button>
              <button onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition"
                style={{
                  background: "linear-gradient(135deg, #6B3A2A, #3D2017)",
                  color: "#F5E6C8",
                  border: `1px solid ${PARCHMENT.goldDark}`,
                  fontFamily: PARCHMENT.font,
                }}>
                {t("logout")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nickname cost confirmation modal — parchment style */}
      {showNicknameCostModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl p-6 mx-6 max-w-[320px] w-full relative"
            style={{
              background: PARCHMENT.parchment,
              border: `2px solid ${PARCHMENT.goldPrimary}`,
              boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 0 30px rgba(139,105,20,0.08)",
            }}>
            <CornerDecorations />
            <p className="text-center font-bold mb-2" style={{
              color: PARCHMENT.ink, fontFamily: PARCHMENT.font, fontSize: "16px",
            }}>닉네임 변경</p>
            <p className="text-center text-sm mb-6" style={{ color: PARCHMENT.inkLight, fontFamily: PARCHMENT.font }}>
              🪙 {NICKNAME_COST} 골드를 사용하여 닉네임을 변경하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setShowNicknameCostModal(false); if (user) setNicknameValue(user.nickname); }}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition"
                style={{
                  background: "rgba(44,24,16,0.08)",
                  border: `1px solid ${PARCHMENT.goldDark}`,
                  color: PARCHMENT.inkLight,
                  fontFamily: PARCHMENT.font,
                }}>
                {t("cancel")}
              </button>
              <button onClick={handleNicknameConfirm}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition"
                style={{
                  background: `linear-gradient(135deg, ${PARCHMENT.goldPrimary}, ${PARCHMENT.goldDark})`,
                  color: "#FFF8EC",
                  border: `1px solid ${PARCHMENT.goldBright}`,
                  fontFamily: PARCHMENT.font,
                }}>
                변경하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Corner Decorations ──────────────────────────────────────────────────────

function CornerDecorations() {
  return (
    <>
      <div className="absolute top-1.5 left-1.5 w-4 h-4">
        <div className="absolute top-0 left-0 w-full h-px" style={{ background: PARCHMENT.goldDark }} />
        <div className="absolute top-0 left-0 w-px h-full" style={{ background: PARCHMENT.goldDark }} />
      </div>
      <div className="absolute top-1.5 right-1.5 w-4 h-4">
        <div className="absolute top-0 right-0 w-full h-px" style={{ background: PARCHMENT.goldDark }} />
        <div className="absolute top-0 right-0 w-px h-full" style={{ background: PARCHMENT.goldDark }} />
      </div>
      <div className="absolute bottom-1.5 left-1.5 w-4 h-4">
        <div className="absolute bottom-0 left-0 w-full h-px" style={{ background: PARCHMENT.goldDark }} />
        <div className="absolute bottom-0 left-0 w-px h-full" style={{ background: PARCHMENT.goldDark }} />
      </div>
      <div className="absolute bottom-1.5 right-1.5 w-4 h-4">
        <div className="absolute bottom-0 right-0 w-full h-px" style={{ background: PARCHMENT.goldDark }} />
        <div className="absolute bottom-0 right-0 w-px h-full" style={{ background: PARCHMENT.goldDark }} />
      </div>
    </>
  );
}

// ─── Ornamental Divider ──────────────────────────────────────────────────────

function OrnamentalDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-2 px-4">
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${PARCHMENT.goldDark}, transparent)` }} />
      {label && (
        <span className="px-3 text-[9px] font-bold tracking-[0.25em] uppercase" style={{
          color: PARCHMENT.goldDark, fontFamily: PARCHMENT.font,
        }}>{label}</span>
      )}
      {label && (
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${PARCHMENT.goldDark}, transparent)` }} />
      )}
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────────────────────────

interface MainViewProps {
  avatarElement: string;
  avatarGrade: string;
  avatarAccessoryOverlays?: string[];
  user: { id?: string; nickname: string; level: number; gold: number; gems: number; stardust: number; profile_image_url?: string } | null;
  editingNickname: boolean;
  nicknameValue: string;
  nicknameInputRef: React.RefObject<HTMLInputElement | null>;
  communityStats: { post_count: number; comment_count: number };
  locale: Locale;
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
  setShowSlimePicker: (v: boolean) => void;
  handleSelectAvatarSlime: (id: string) => void;
  setSubView: (v: SubView) => void;
  setShowLogoutModal: (v: boolean) => void;
}

function MainView({
  avatarElement, avatarGrade, avatarAccessoryOverlays, user, editingNickname, nicknameValue,
  nicknameInputRef, communityStats, locale, showSlimePicker, slimes, species, avatarSlimeId,
  accessToken, fetchUser, t,
  setEditingNickname, setNicknameValue, handleNicknameSubmit,
  setShowSlimePicker, handleSelectAvatarSlime, setSubView, setShowLogoutModal,
}: MainViewProps) {
  const avatarSpeciesId = avatarSlimeId ? slimes.find((s) => s.id === avatarSlimeId)?.species_id : undefined;
  const avatarSvg = generateSlimeIconSvg(avatarElement, 96, avatarGrade, avatarAccessoryOverlays, avatarSpeciesId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showDeleteImageModal, setShowDeleteImageModal] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);

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

  const handleDeleteImage = async () => {
    if (!accessToken) return;
    setDeletingImage(true);
    try {
      await authApi("/api/profile/image", accessToken, { method: "DELETE" });
      await fetchUser();
      toastSuccess("프로필 이미지가 삭제되었습니다");
    } catch {
      toastError("이미지 삭제에 실패했습니다");
    }
    setDeletingImage(false);
    setShowDeleteImageModal(false);
  };

  const langLabel = LANGUAGE_OPTIONS.find((o) => o.value === locale)?.labelKey || "lang_auto";
  const hasProfileImage = !!user?.profile_image_url;

  return (
    <div className="p-4 space-y-4">
      {/* Profile Card — parchment style */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{
          background: PARCHMENT.parchment,
          border: `2px solid ${PARCHMENT.goldPrimary}`,
          boxShadow: "4px 4px 12px rgba(0,0,0,0.4), inset 0 0 40px rgba(139,105,20,0.08)",
        }}>
        {/* Corner decorations */}
        <CornerDecorations />

        {/* Page corner fold */}
        <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden rounded-bl-lg">
          <div className="absolute -top-4 -right-4 w-8 h-8 rotate-45"
            style={{ background: "linear-gradient(135deg, #D4C4A8, #C9B896)" }} />
        </div>

        <div className="p-5 pt-8 flex flex-col items-center">
          {/* Avatar — leather + gold frame with overlapping level badge */}
          <div className="relative mb-4">
            <button onClick={() => setShowSlimePicker(!showSlimePicker)}
              className="w-24 h-24 rounded-full flex items-center justify-center active:scale-95 transition overflow-hidden"
              style={{
                border: `3px solid ${PARCHMENT.goldPrimary}`,
                background: "linear-gradient(135deg, #3D2017, #2C1810)",
                boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px ${PARCHMENT.goldDark}`,
              }}>
              {hasProfileImage ? (
                <img src={resolveMediaUrl(user!.profile_image_url!)} alt="profile" className="w-full h-full object-cover" draggable={false} />
              ) : (
                <img src={avatarSvg} alt="avatar" className="w-20 h-20" draggable={false} />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </button>
            {/* Level badge — overlaps bottom of avatar */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full whitespace-nowrap" style={{
              background: "linear-gradient(135deg, #6B3A2A, #3D2017)",
              border: `1.5px solid ${PARCHMENT.goldPrimary}`,
              boxShadow: "0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(139,105,20,0.3)",
            }}>
              <span className="text-[10px] font-bold" style={{
                color: "#F5E6C8",
                fontFamily: PARCHMENT.font,
                letterSpacing: "0.05em",
              }}>{t("level")} {user?.level}</span>
            </div>
            {/* Camera button for photo upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs active:scale-90 transition"
              style={{
                background: `linear-gradient(135deg, ${PARCHMENT.goldPrimary}, ${PARCHMENT.goldDark})`,
                border: "2px solid #FFF8EC",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}>
              📷
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Profile image delete button */}
          {hasProfileImage && (
            <button
              onClick={() => setShowDeleteImageModal(true)}
              className="text-[10px] font-bold mb-1 active:scale-95 transition"
              style={{ color: "#8B4513", fontFamily: PARCHMENT.font }}
            >
              사진 삭제
            </button>
          )}

          {/* Nickname */}
          {editingNickname ? (
            <input
              ref={nicknameInputRef}
              value={nicknameValue}
              onChange={(e) => setNicknameValue(e.target.value)}
              onBlur={handleNicknameSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleNicknameSubmit()}
              maxLength={20}
              className="font-bold text-xl text-center rounded-lg px-3 py-1 outline-none w-48 mt-1"
              style={{
                color: PARCHMENT.ink,
                fontFamily: PARCHMENT.font,
                background: "rgba(139,105,20,0.08)",
                border: `1px solid ${PARCHMENT.goldDark}`,
              }}
            />
          ) : (
            <button onClick={() => setEditingNickname(true)} className="group mt-1">
              <span className="font-bold text-xl" style={{ color: PARCHMENT.ink, fontFamily: PARCHMENT.font }}>
                {user?.nickname}
              </span>
              <span className="text-xs ml-2 opacity-40 group-hover:opacity-60 transition">✏️</span>
              <p className="text-[10px] mt-0.5" style={{ color: PARCHMENT.inkLight, fontFamily: PARCHMENT.font }}>
                {t("tap_to_edit")} (🪙 {NICKNAME_COST})
              </p>
            </button>
          )}

          {/* Currency — 3-column leather grid */}
          <div className="grid grid-cols-3 gap-2 mt-4 w-full">
            {[
              { icon: "🪙", value: user?.gold, label: "Gold" },
              { icon: "💎", value: user?.gems, label: "Gems" },
              { icon: "✨", value: user?.stardust, label: "Stardust" },
            ].map((c) => (
              <div key={c.label} className="flex flex-col items-center py-2.5 rounded-xl" style={{
                background: "linear-gradient(145deg, rgba(61,32,23,0.6), rgba(44,24,16,0.8))",
                border: "1px solid rgba(139,105,20,0.2)",
              }}>
                <span className="text-base leading-none">{c.icon}</span>
                <span className="text-sm font-bold mt-1" style={{ color: PARCHMENT.goldBright, fontFamily: PARCHMENT.font, fontVariantNumeric: "tabular-nums" }}>
                  {c.value?.toLocaleString() ?? 0}
                </span>
                <span className="text-[9px] mt-0.5" style={{ color: PARCHMENT.inkLight, fontFamily: PARCHMENT.font }}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>

          <OrnamentalDivider />

          {/* Community stats — larger numbers with gold accent */}
          <div className="flex gap-8">
            <div className="text-center">
              <p className="font-bold text-2xl" style={{ color: PARCHMENT.goldBright, fontFamily: PARCHMENT.font }}>
                {communityStats.post_count}
              </p>
              <p className="text-[10px] font-medium" style={{ color: PARCHMENT.inkLight, fontFamily: PARCHMENT.font }}>
                {t("posts")}
              </p>
            </div>
            <div className="text-center">
              <p className="font-bold text-2xl" style={{ color: PARCHMENT.goldBright, fontFamily: PARCHMENT.font }}>
                {communityStats.comment_count}
              </p>
              <p className="text-[10px] font-medium" style={{ color: PARCHMENT.inkLight, fontFamily: PARCHMENT.font }}>
                {t("comments")}
              </p>
            </div>
          </div>
        </div>

        {/* Slime picker grid */}
        {showSlimePicker && slimes.length > 0 && (
          <div className="px-4 pb-4">
            <OrnamentalDivider label="아바타 슬라임 선택" />
            <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto mt-2" style={{ scrollbarWidth: "thin" }}>
              {slimes.map((sl) => {
                const sp = species.find((s) => s.id === sl.species_id);
                const icon = generateSlimeIconSvg(sl.element, 36, sp?.grade || "common", undefined, sl.species_id);
                const isSelected = sl.id === avatarSlimeId;
                return (
                  <button key={sl.id} onClick={() => handleSelectAvatarSlime(sl.id)}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition active:scale-90"
                    style={{
                      background: isSelected ? "rgba(139,105,20,0.15)" : "rgba(44,24,16,0.05)",
                      border: isSelected ? `2px solid ${PARCHMENT.goldPrimary}` : "2px solid transparent",
                    }}>
                    <img src={icon} alt="" className="w-9 h-9" draggable={false} />
                    <span className="text-[8px] truncate max-w-full" style={{ color: PARCHMENT.inkLight }}>
                      {sl.name || sp?.name || `#${sl.species_id}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Settings Section — leather card with gold border */}
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: PARCHMENT.leatherCard,
          border: `1px solid ${PARCHMENT.goldDark}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}>
        <SettingsItem emoji="🎬" label="크리에이터 스튜디오" onClick={() => setSubView("creator")} />
        <ParchmentDivider />
        <SettingsItem emoji="👤" label="계정 관리" onClick={() => setSubView("account")} />
        <ParchmentDivider />
        <SettingsItem emoji="🔔" label="알림 설정" onClick={() => setSubView("notifications")} />
        <ParchmentDivider />
        <SettingsItem emoji="🌐" label={t("language")} value={t(langLabel)} onClick={() => setSubView("language")} />
        <ParchmentDivider />
        <SettingsItem emoji="📩" label={t("contact")} onClick={() => setSubView("contact")} />
        <ParchmentDivider />
        <SettingsItem emoji="📋" label={t("terms")} onClick={() => setSubView("terms")} />
        <ParchmentDivider />
        <SettingsItem emoji="🔒" label={t("privacy")} onClick={() => setSubView("privacy")} />
        <ParchmentDivider />
        <SettingsItem emoji="🚪" label={t("logout")} danger onClick={() => setShowLogoutModal(true)} />
      </div>

      {/* Homepage link — parchment style */}
      <a
        href={HOMEPAGE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-2xl overflow-hidden active:scale-[0.98] transition"
        style={{
          background: PARCHMENT.parchmentLight,
          border: `1px solid ${PARCHMENT.goldDark}`,
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-lg">🏠</span>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: PARCHMENT.ink, fontFamily: PARCHMENT.font }}>
              SlimeTopia 홈페이지
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: PARCHMENT.inkLight, fontFamily: PARCHMENT.font }}>
              공식 홈페이지 방문하기
            </p>
          </div>
          <span className="text-sm" style={{ color: PARCHMENT.goldDark }}>↗</span>
        </div>
      </a>

      {/* Version info */}
      <p className="text-center text-[10px] py-2" style={{
        color: "rgba(201,168,76,0.3)",
        fontFamily: PARCHMENT.font,
        letterSpacing: "0.1em",
      }}>
        SlimeTopia v1.0.0 (Build 2026.02)
      </p>

      {/* Delete profile image confirmation modal */}
      {showDeleteImageModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl p-6 mx-6 max-w-[320px] w-full relative"
            style={{
              background: PARCHMENT.parchment,
              border: `2px solid ${PARCHMENT.goldPrimary}`,
              boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 0 30px rgba(139,105,20,0.08)",
            }}>
            <CornerDecorations />
            <p className="text-center font-bold mb-2" style={{
              color: PARCHMENT.ink, fontFamily: PARCHMENT.font, fontSize: "16px",
            }}>프로필 사진 삭제</p>
            <p className="text-center text-sm mb-6" style={{
              color: PARCHMENT.inkLight, fontFamily: PARCHMENT.font,
            }}>프로필 사진을 삭제하시겠습니까?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteImageModal(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition"
                style={{
                  background: "rgba(44,24,16,0.08)",
                  border: `1px solid ${PARCHMENT.goldDark}`,
                  color: PARCHMENT.inkLight,
                  fontFamily: PARCHMENT.font,
                }}>
                취소
              </button>
              <button onClick={handleDeleteImage} disabled={deletingImage}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #6B3A2A, #3D2017)",
                  color: "#F5E6C8",
                  border: `1px solid ${PARCHMENT.goldDark}`,
                  fontFamily: PARCHMENT.font,
                }}>
                {deletingImage ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
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
      className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-80 transition">
      <span className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{
        background: "linear-gradient(145deg, rgba(61,32,23,0.7), rgba(44,24,16,0.9))",
        border: "1px solid rgba(139,105,20,0.2)",
      }}>{emoji}</span>
      <span className="flex-1 text-left text-sm font-medium" style={{
        color: danger ? "#A0522D" : "#F5E6C8",
        fontFamily: PARCHMENT.font,
      }}>
        {label}
      </span>
      {value && <span className="text-xs" style={{ color: "rgba(201,168,76,0.5)" }}>{value}</span>}
      <span className="text-sm" style={{ color: "rgba(201,168,76,0.3)" }}>›</span>
    </button>
  );
}

function ParchmentDivider() {
  return (
    <div className="h-px mx-4" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3), transparent)" }} />
  );
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
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: PARCHMENT.parchment,
          border: `1px solid ${PARCHMENT.goldPrimary}`,
          boxShadow: "4px 4px 12px rgba(0,0,0,0.4), inset 0 0 40px rgba(139,105,20,0.08)",
        }}>
        {LANGUAGE_OPTIONS.map((opt, idx) => (
          <div key={opt.value}>
            {idx > 0 && (
              <div className="h-px mx-4" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.2), transparent)" }} />
            )}
            <button onClick={() => handleSelect(opt.value)}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-80 transition">
              <span className="flex-1 text-left text-sm font-medium" style={{
                color: locale === opt.value ? PARCHMENT.goldDark : PARCHMENT.ink,
                fontFamily: PARCHMENT.font,
              }}>
                {t(opt.labelKey)}
              </span>
              {locale === opt.value && <span className="text-sm" style={{ color: PARCHMENT.goldDark }}>✓</span>}
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
        <label className="text-xs font-bold mb-2 block" style={{ color: PARCHMENT.goldPrimary, fontFamily: PARCHMENT.font }}>
          {t("contact_category")}
        </label>
        <div className="flex flex-wrap gap-2">
          {CONTACT_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setContactCategory(cat)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95"
              style={{
                background: contactCategory === cat ? "rgba(139,105,20,0.12)" : "rgba(245,230,200,0.06)",
                border: contactCategory === cat ? `1px solid ${PARCHMENT.goldPrimary}` : "1px solid rgba(139,105,20,0.2)",
                color: contactCategory === cat ? PARCHMENT.goldPrimary : "rgba(245,230,200,0.6)",
                fontFamily: PARCHMENT.font,
              }}>
              {t(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="text-xs font-bold mb-2 block" style={{ color: PARCHMENT.goldPrimary, fontFamily: PARCHMENT.font }}>
          {t("contact_email")}
        </label>
        <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
          placeholder="email@example.com"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition"
          style={{
            background: "rgba(245,230,200,0.06)",
            border: "1px solid rgba(139,105,20,0.2)",
            color: "#F5E6C8",
            fontFamily: PARCHMENT.font,
          }} />
      </div>

      {/* Content */}
      <div>
        <label className="text-xs font-bold mb-2 block" style={{ color: PARCHMENT.goldPrimary, fontFamily: PARCHMENT.font }}>
          {t("contact_content")}
        </label>
        <textarea value={contactContent} onChange={(e) => setContactContent(e.target.value)}
          placeholder={t("contact_placeholder")}
          rows={6}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition resize-none"
          style={{
            background: "rgba(245,230,200,0.06)",
            border: "1px solid rgba(139,105,20,0.2)",
            color: "#F5E6C8",
            fontFamily: PARCHMENT.font,
          }} />
      </div>

      {/* Submit */}
      <button onClick={handleContactSubmit}
        disabled={!contactContent.trim()}
        className="w-full py-3 rounded-xl font-bold text-sm transition active:scale-[0.98] disabled:opacity-40"
        style={{
          background: `linear-gradient(135deg, ${PARCHMENT.goldPrimary}, ${PARCHMENT.goldDark})`,
          color: "#FFF8EC",
          fontFamily: PARCHMENT.font,
        }}>
        {t("contact_submit")}
      </button>
    </div>
  );
}

// ─── Text View (Terms / Privacy) ─────────────────────────────────────────────

function TextView({ content }: { content: string }) {
  return (
    <div className="p-4">
      <div className="rounded-2xl p-4 relative"
        style={{
          background: PARCHMENT.parchment,
          border: `1px solid ${PARCHMENT.goldPrimary}`,
          boxShadow: "4px 4px 12px rgba(0,0,0,0.4), inset 0 0 40px rgba(139,105,20,0.08)",
        }}>
        <CornerDecorations />
        <pre className="text-xs leading-relaxed whitespace-pre-wrap" style={{
          color: PARCHMENT.ink,
          fontFamily: PARCHMENT.font,
        }}>
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

  const inputStyle = {
    background: "rgba(245,230,200,0.06)",
    border: "1px solid rgba(139,105,20,0.2)",
    color: "#F5E6C8",
    fontFamily: PARCHMENT.font,
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl overflow-hidden relative"
        style={{
          background: PARCHMENT.parchment,
          border: `1px solid ${PARCHMENT.goldPrimary}`,
          boxShadow: "4px 4px 12px rgba(0,0,0,0.4), inset 0 0 40px rgba(139,105,20,0.08)",
        }}>
        <CornerDecorations />

        {/* UUID */}
        <div className="px-4 py-3.5">
          <p className="text-[10px] font-bold mb-1" style={{ color: PARCHMENT.goldDark, fontFamily: PARCHMENT.font }}>
            내 UUID
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono flex-1 truncate" style={{ color: PARCHMENT.ink }}>
              {user?.id || "-"}
            </span>
            <button onClick={handleCopyUuid}
              className="px-2 py-1 rounded-lg text-[10px] font-bold active:scale-95 transition"
              style={{
                background: "rgba(139,105,20,0.1)",
                color: PARCHMENT.goldDark,
                fontFamily: PARCHMENT.font,
              }}>
              {copied ? "복사됨!" : "복사"}
            </button>
          </div>
        </div>
        <div className="h-px mx-4" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.2), transparent)" }} />

        {/* Nickname */}
        <div className="px-4 py-3.5">
          <p className="text-[10px] font-bold mb-1" style={{ color: PARCHMENT.goldDark, fontFamily: PARCHMENT.font }}>
            닉네임
          </p>
          <p className="text-sm" style={{ color: PARCHMENT.ink, fontFamily: PARCHMENT.font }}>
            {user?.nickname || "-"}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: PARCHMENT.inkLight, fontFamily: PARCHMENT.font }}>
            프로필 화면에서 변경 가능 (🪙 {NICKNAME_COST})
          </p>
        </div>
        <div className="h-px mx-4" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.2), transparent)" }} />

        {/* Email */}
        <div className="px-4 py-3.5">
          <p className="text-[10px] font-bold mb-1" style={{ color: PARCHMENT.goldDark, fontFamily: PARCHMENT.font }}>
            이메일
          </p>
          <p className="text-sm" style={{ color: PARCHMENT.ink, fontFamily: PARCHMENT.font }}>
            {maskEmail(user?.email || "")}
          </p>
        </div>
        <div className="h-px mx-4" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.2), transparent)" }} />

        {/* Password */}
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold" style={{ color: PARCHMENT.goldDark, fontFamily: PARCHMENT.font }}>
              비밀번호
            </p>
            <button onClick={() => setShowPwForm(!showPwForm)}
              className="text-[10px] font-bold transition"
              style={{ color: PARCHMENT.goldPrimary, fontFamily: PARCHMENT.font }}>
              {showPwForm ? "취소" : "변경하기"}
            </button>
          </div>

          {showPwForm && (
            <div className="mt-3 space-y-2">
              <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="현재 비밀번호"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none transition"
                style={inputStyle} />
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                placeholder="새 비밀번호 (6자 이상)"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none transition"
                style={inputStyle} />
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="새 비밀번호 확인"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none transition"
                style={inputStyle} />
              <button onClick={handleChangePassword} disabled={pwLoading || !currentPw || !newPw || !confirmPw}
                className="w-full py-2.5 rounded-xl font-bold text-sm transition active:scale-[0.98] disabled:opacity-40"
                style={{
                  background: `linear-gradient(135deg, ${PARCHMENT.goldPrimary}, ${PARCHMENT.goldDark})`,
                  color: "#FFF8EC",
                  fontFamily: PARCHMENT.font,
                }}>
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
      <div className="rounded-2xl overflow-hidden relative"
        style={{
          background: PARCHMENT.parchment,
          border: `1px solid ${PARCHMENT.goldPrimary}`,
          boxShadow: "4px 4px 12px rgba(0,0,0,0.4), inset 0 0 40px rgba(139,105,20,0.08)",
        }}>
        <CornerDecorations />

        <ToggleItem label="게임 알림" desc="탐험 완료, 배고픈 슬라임 등"
          value={gameNotif} onToggle={() => toggle("notification_game", gameNotif, setGameNotif)} />
        <div className="h-px mx-4" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.2), transparent)" }} />
        <ToggleItem label="커뮤니티 알림" desc="댓글, 좋아요 알림"
          value={communityNotif} onToggle={() => toggle("notification_community", communityNotif, setCommunityNotif)} />
        <div className="h-px mx-4" style={{ background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.2), transparent)" }} />
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

  const statCardStyle = {
    background: PARCHMENT.leatherCard,
    border: `1px solid ${PARCHMENT.goldDark}`,
  };

  return (
    <div className="p-4 space-y-4">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={statCardStyle}>
          <p className="text-[10px]" style={{ color: "rgba(201,168,76,0.5)", fontFamily: PARCHMENT.font }}>총 조회수</p>
          <p className="font-bold text-lg" style={{ color: "#F5E6C8", fontFamily: PARCHMENT.font }}>{myTotalViews.toLocaleString()}</p>
        </div>
        <div className="rounded-xl p-3" style={statCardStyle}>
          <p className="text-[10px]" style={{ color: "rgba(201,168,76,0.5)", fontFamily: PARCHMENT.font }}>총 좋아요</p>
          <p className="font-bold text-lg" style={{ color: "#F5E6C8", fontFamily: PARCHMENT.font }}>{myTotalLikes.toLocaleString()}</p>
        </div>
        <div className="rounded-xl p-3" style={statCardStyle}>
          <p className="text-[10px]" style={{ color: "rgba(201,168,76,0.5)", fontFamily: PARCHMENT.font }}>받은 골드</p>
          <p className="font-bold text-lg" style={{ color: PARCHMENT.goldPrimary, fontFamily: PARCHMENT.font }}>{myTotalTipsGold.toLocaleString()}G</p>
        </div>
        <div className="rounded-xl p-3" style={statCardStyle}>
          <p className="text-[10px]" style={{ color: "rgba(201,168,76,0.5)", fontFamily: PARCHMENT.font }}>받은 젬</p>
          <p className="font-bold text-lg" style={{ color: PARCHMENT.goldPrimary, fontFamily: PARCHMENT.font }}>{myTotalTipsGems.toLocaleString()}</p>
        </div>
      </div>

      {/* Upload button */}
      <button
        onClick={() => setShowUpload(true)}
        className="w-full py-3 rounded-xl font-bold text-sm"
        style={{
          background: `linear-gradient(135deg, ${PARCHMENT.goldPrimary}, ${PARCHMENT.goldBright})`,
          color: PARCHMENT.ink,
          fontFamily: PARCHMENT.font,
        }}
      >
        새 쇼츠 업로드
      </button>

      {/* My shorts grid */}
      <div>
        <h3 className="text-xs font-bold mb-3" style={{ color: "rgba(201,168,76,0.5)", fontFamily: PARCHMENT.font }}>
          내 쇼츠 ({myShorts.length})
        </h3>
        {myShorts.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: "rgba(245,230,200,0.3)", fontFamily: PARCHMENT.font }}>
            아직 업로드한 쇼츠가 없어요
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {myShorts.map((s) => (
              <div key={s.id} className="rounded-xl overflow-hidden"
                style={{
                  background: PARCHMENT.leatherCard,
                  border: `1px solid ${PARCHMENT.goldDark}`,
                }}>
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
                  <p className="text-xs font-bold truncate" style={{ color: "#F5E6C8", fontFamily: PARCHMENT.font }}>{s.title}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(201,168,76,0.4)" }}>{formatTime(s.created_at)}</p>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deleting === s.id}
                    className="mt-1.5 w-full py-1 rounded-lg text-[10px] font-bold"
                    style={{
                      background: "rgba(160,82,45,0.1)",
                      color: "rgba(160,82,45,0.7)",
                      border: "1px solid rgba(160,82,45,0.2)",
                      fontFamily: PARCHMENT.font,
                    }}
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
    <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-80 transition">
      <div className="flex-1 text-left">
        <p className="text-sm font-medium" style={{ color: PARCHMENT.ink, fontFamily: PARCHMENT.font }}>{label}</p>
        <p className="text-[10px] mt-0.5" style={{ color: PARCHMENT.inkLight, fontFamily: PARCHMENT.font }}>{desc}</p>
      </div>
      <div className="w-10 h-6 rounded-full relative transition-colors duration-200"
        style={{ background: value ? "rgba(139,105,20,0.3)" : "rgba(44,24,16,0.15)" }}>
        <div className="absolute top-1 w-4 h-4 rounded-full transition-all duration-200"
          style={{
            left: value ? 20 : 4,
            background: value ? PARCHMENT.goldPrimary : "rgba(44,24,16,0.3)",
          }} />
      </div>
    </button>
  );
}
