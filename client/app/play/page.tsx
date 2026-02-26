"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore } from "@/lib/store/gameStore";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import HomePage, { HOME_BACKGROUNDS } from "@/components/ui/HomePage";
import InventoryPage from "@/components/ui/InventoryPage";
import MergePage from "@/components/ui/MergePage";
import ShopPage from "@/components/ui/ShopPage";
import CodexPage from "@/components/ui/CodexPage";
import AchievementPage from "@/components/ui/AchievementPage";
import LeaderboardPage from "@/components/ui/LeaderboardPage";
import SlimeInfoPanel from "@/components/ui/SlimeInfoPanel";
import MergeResultModal from "@/components/ui/MergeResultModal";
import LevelUpModal from "@/components/ui/LevelUpModal";
import MissionModal from "@/components/ui/MissionModal";
import AttendanceModal from "@/components/ui/AttendanceModal";
import EvolutionTree from "@/components/ui/EvolutionTree";
import DailyWheelModal from "@/components/ui/DailyWheelModal";
import ToastContainer from "@/components/ui/Toast";
import WhatsNewModal from "@/components/ui/WhatsNewModal";
import MailboxModal from "@/components/ui/MailboxModal";
import WelcomeBackModal from "@/components/ui/WelcomeBackModal";
import CommunityPage from "@/components/ui/CommunityPage";
import ShortsPage from "@/components/ui/ShortsPage";
import ProfilePage from "@/components/ui/ProfilePage";
import DiscoveryPage from "@/components/ui/DiscoveryPage";
import MiniContentsPage from "@/components/ui/MiniContentsPage";
import CollectionPage from "@/components/ui/CollectionPage";
import GachaPage from "@/components/ui/GachaPage";
import SplashScreen from "@/components/ui/SplashScreen";
import { useAndroidBackButton } from "@/lib/useBackButton";

const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-[#1a1a2e]">
      <p className="text-[#55EFC4] text-lg animate-pulse">Loading...</p>
    </div>
  ),
});

export default function PlayPage() {
  const router = useRouter();
  const { user, accessToken, fetchUser } = useAuthStore();

  // Fetchers — stable references, don't trigger re-renders
  const fetchSlimes = useGameStore((s) => s.fetchSlimes);
  const fetchSpecies = useGameStore((s) => s.fetchSpecies);
  const fetchDailyMissions = useGameStore((s) => s.fetchDailyMissions);
  const fetchAttendance = useGameStore((s) => s.fetchAttendance);
  const fetchMailbox = useGameStore((s) => s.fetchMailbox);
  const fetchCollectionCount = useGameStore((s) => s.fetchCollectionCount);
  const fetchCollectionEntries = useGameStore((s) => s.fetchCollectionEntries);
  const fetchCollectionRequirements = useGameStore((s) => s.fetchCollectionRequirements);
  const fetchMaterialDefs = useGameStore((s) => s.fetchMaterialDefs);
  const fetchMaterialInventory = useGameStore((s) => s.fetchMaterialInventory);
  const fetchAllEquippedAccessories = useGameStore((s) => s.fetchAllEquippedAccessories);

  // UI state — individual selectors to avoid cross-property re-renders
  const activePanel = useGameStore((s) => s.activePanel);
  const selectedSlimeId = useGameStore((s) => s.selectedSlimeId);
  const showMergeResult = useGameStore((s) => s.showMergeResult);
  const levelUpInfo = useGameStore((s) => s.levelUpInfo);
  const showMissionModal = useGameStore((s) => s.showMissionModal);
  const showAttendanceModal = useGameStore((s) => s.showAttendanceModal);
  const showEvolutionTree = useGameStore((s) => s.showEvolutionTree);
  const setShowEvolutionTree = useGameStore((s) => s.setShowEvolutionTree);
  const showWheel = useGameStore((s) => s.showWheel);
  const setShowWheel = useGameStore((s) => s.setShowWheel);
  const showMailbox = useGameStore((s) => s.showMailbox);
  const setShowMailbox = useGameStore((s) => s.setShowMailbox);
  const showCommunity = useGameStore((s) => s.showCommunity);
  const setShowCommunity = useGameStore((s) => s.setShowCommunity);
  const showProfile = useGameStore((s) => s.showProfile);
  const setShowProfile = useGameStore((s) => s.setShowProfile);
  const showShorts = useGameStore((s) => s.showShorts);
  const setShowShorts = useGameStore((s) => s.setShowShorts);
  const showMiniContents = useGameStore((s) => s.showMiniContents);
  const setShowMiniContents = useGameStore((s) => s.setShowMiniContents);
  const showCollection = useGameStore((s) => s.showCollection);
  const setShowCollection = useGameStore((s) => s.setShowCollection);

  const [showSplash, setShowSplash] = useState(true);

  useAndroidBackButton();

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      return;
    }
    fetchUser();
  }, [accessToken, fetchUser, router]);

  useEffect(() => {
    if (accessToken && user) {
      Promise.all([
        fetchSlimes(accessToken),
        fetchSpecies(accessToken),
        fetchDailyMissions(accessToken),
        fetchAttendance(accessToken),
        fetchMailbox(accessToken),
        fetchCollectionCount(accessToken),
        fetchCollectionEntries(accessToken),
        fetchCollectionRequirements(accessToken),
        fetchMaterialDefs(accessToken),
        fetchMaterialInventory(accessToken),
        fetchAllEquippedAccessories(accessToken),
      ]);
    }
  }, [accessToken, user, fetchSlimes, fetchSpecies, fetchDailyMissions, fetchAttendance, fetchMailbox, fetchCollectionCount, fetchCollectionEntries, fetchCollectionRequirements, fetchMaterialDefs, fetchMaterialInventory, fetchAllEquippedAccessories]);

  if (!user) return <SplashScreen onFinished={() => {}} minDuration={3000} />;
  if (showSplash) return <SplashScreen onFinished={() => setShowSplash(false)} minDuration={1500} />;

  const hasFullOverlay = showCommunity || showProfile || showShorts || showMiniContents || showCollection;

  // Home background theme
  const [homeBgId, setHomeBgId] = useState(() => {
    if (typeof window === "undefined") return "default";
    return localStorage.getItem("home_background") || "default";
  });
  // Listen for background changes from HomePage (custom event + storage)
  useEffect(() => {
    const handler = () => setHomeBgId(localStorage.getItem("home_background") || "default");
    window.addEventListener("storage", handler);
    window.addEventListener("bg-change", handler);
    return () => { window.removeEventListener("storage", handler); window.removeEventListener("bg-change", handler); };
  }, []);

  const homeBg = HOME_BACKGROUNDS.find(b => b.id === homeBgId) || HOME_BACKGROUNDS[0];

  return (
    <div className="game-body">
      <div className="game-frame">
        {/* Home background overlay */}
        {activePanel === "home" && homeBgId !== "default" && (
          <div className="absolute inset-0 z-0 pointer-events-none opacity-60" style={{ background: homeBg.css }} />
        )}
        {/* Canvas: always mounted, hidden when not on home tab */}
        <div style={{ display: activePanel === "home" ? "block" : "none" }} className="w-full h-full relative z-[1]">
          <GameCanvas />
        </div>

        {/* TopBar: only show on home tab, hide for fullscreen overlays */}
        {activePanel === "home" && !hasFullOverlay && <TopBar />}

        {activePanel === "home" && <HomePage />}
        {activePanel === "inventory" && <InventoryPage />}
        {activePanel === "merge" && <MergePage />}
        {activePanel === "discovery" && <DiscoveryPage />}
        {activePanel === "shop" && <ShopPage />}
        {activePanel === "gacha" && <GachaPage />}
        {activePanel === "codex" && <CodexPage />}
        {activePanel === "achievements" && <AchievementPage />}
        {activePanel === "leaderboard" && <LeaderboardPage />}

        {/* Modals (above all pages) */}
        {selectedSlimeId && <SlimeInfoPanel />}
        {showMergeResult && <MergeResultModal />}
        {levelUpInfo && <LevelUpModal />}
        {showMissionModal && <MissionModal />}
        {showAttendanceModal && <AttendanceModal />}
        {showEvolutionTree !== null && (
          <EvolutionTree speciesId={showEvolutionTree} onClose={() => setShowEvolutionTree(null)} />
        )}

        {showWheel && <DailyWheelModal onClose={() => setShowWheel(false)} />}
        {showMailbox && <MailboxModal />}

        {showCommunity && (
          <div className="absolute inset-0 z-50 bg-[#0a0a1a]" style={{ bottom: 76 }}>
            <CommunityPage onClose={() => setShowCommunity(false)} />
          </div>
        )}

        {showProfile && (
          <div className="absolute inset-0 z-50 bg-[#0a0a1a]" style={{ bottom: 76 }}>
            <ProfilePage onClose={() => setShowProfile(false)} />
          </div>
        )}

        {showShorts && (
          <div className="absolute inset-0 z-50 bg-black" style={{ bottom: 76 }}>
            <ShortsPage onClose={() => setShowShorts(false)} />
          </div>
        )}

        {showMiniContents && (
          <div className="absolute inset-0 z-50 bg-[#0a0a1a]" style={{ bottom: 76 }}>
            <MiniContentsPage onClose={() => setShowMiniContents(false)} />
          </div>
        )}

        {showCollection && (
          <div className="absolute inset-0 z-50 bg-[#0a0a1a]" style={{ bottom: 76 }}>
            <CollectionPage onClose={() => setShowCollection(false)} />
          </div>
        )}

        <WelcomeBackModal />
        <BottomNav />
        <ToastContainer />
        <WhatsNewModal />
      </div>
    </div>
  );
}
