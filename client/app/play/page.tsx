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
  const {
    fetchSlimes,
    fetchSpecies,
    fetchDailyMissions,
    fetchAttendance,
    fetchMailbox,
    fetchCollectionCount,
    fetchCollectionEntries,
    fetchCollectionRequirements,
    fetchMaterialDefs,
    fetchMaterialInventory,
    fetchAllEquippedAccessories,
    activePanel,
    selectedSlimeId,
    showMergeResult,
    levelUpInfo,
    showMissionModal,
    showAttendanceModal,
    showEvolutionTree,
    setShowEvolutionTree,
    showWheel,
    setShowWheel,
    showMailbox,
    setShowMailbox,
    showCommunity,
    setShowCommunity,
    showProfile,
    setShowProfile,
    showShorts,
    setShowShorts,
    showMiniContents,
    setShowMiniContents,
    showCollection,
    setShowCollection,
  } = useGameStore();

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
      fetchSlimes(accessToken);
      fetchSpecies(accessToken);
      fetchDailyMissions(accessToken);
      fetchAttendance(accessToken);
      fetchMailbox(accessToken);
      fetchCollectionCount(accessToken);
      fetchCollectionEntries(accessToken);
      fetchCollectionRequirements(accessToken);
      fetchMaterialDefs(accessToken);
      fetchMaterialInventory(accessToken);
      fetchAllEquippedAccessories(accessToken);
    }
  }, [accessToken, user, fetchSlimes, fetchSpecies, fetchDailyMissions, fetchAttendance, fetchMailbox, fetchCollectionCount, fetchCollectionEntries, fetchCollectionRequirements, fetchMaterialDefs, fetchMaterialInventory, fetchAllEquippedAccessories]);

  if (!user) return null;

  const hasFullOverlay = showCommunity || showProfile || showShorts || showMiniContents || showCollection;

  // Home background theme
  const [homeBgId, setHomeBgId] = useState(() => {
    if (typeof window === "undefined") return "default";
    return localStorage.getItem("home_background") || "default";
  });
  // Listen for background changes from HomePage
  useEffect(() => {
    const handler = () => setHomeBgId(localStorage.getItem("home_background") || "default");
    window.addEventListener("storage", handler);
    // Also poll for same-tab changes
    const interval = setInterval(handler, 500);
    return () => { window.removeEventListener("storage", handler); clearInterval(interval); };
  }, []);

  const homeBg = HOME_BACKGROUNDS.find(b => b.id === homeBgId) || HOME_BACKGROUNDS[0];

  return (
    <div className="game-body">
      <div className="game-frame">
        {/* Home background overlay */}
        {activePanel === "home" && homeBgId !== "default" && (
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40" style={{ background: homeBg.css }} />
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
