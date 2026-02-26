"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/lib/store/authStore";
import { useGameStore } from "@/lib/store/gameStore";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import HomePage from "@/components/ui/HomePage";
import InventoryPage from "@/components/ui/InventoryPage";
import MergePage from "@/components/ui/MergePage";
import ExplorePage from "@/components/ui/ExplorePage";
import ShopPage from "@/components/ui/ShopPage";
import CodexPage from "@/components/ui/CodexPage";
import AchievementPage from "@/components/ui/AchievementPage";
import LeaderboardPage from "@/components/ui/LeaderboardPage";
import SlimeInfoPanel from "@/components/ui/SlimeInfoPanel";
import MergeResultModal from "@/components/ui/MergeResultModal";
import LevelUpModal from "@/components/ui/LevelUpModal";
import MissionModal from "@/components/ui/MissionModal";
import AttendanceModal from "@/components/ui/AttendanceModal";
import SlimeRace from "@/components/game/SlimeRace";
import FishingGame from "@/components/game/FishingGame";
import EvolutionTree from "@/components/ui/EvolutionTree";
import VillagePage from "@/components/ui/VillagePage";
import DailyWheelModal from "@/components/ui/DailyWheelModal";
import ToastContainer from "@/components/ui/Toast";
import WhatsNewModal from "@/components/ui/WhatsNewModal";
import MailboxModal from "@/components/ui/MailboxModal";
import WelcomeBackModal from "@/components/ui/WelcomeBackModal";
import CommunityPage from "@/components/ui/CommunityPage";
import ProfilePage from "@/components/ui/ProfilePage";
import WorldBossPage from "@/components/ui/WorldBossPage";
import TrainingPage from "@/components/ui/TrainingPage";
import PlazaPage from "@/components/ui/PlazaPage";
import { useAndroidBackButton } from "@/lib/useBackButton";

const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-[#1a1a2e]">
      <p className="text-[#55EFC4] text-lg animate-pulse">로딩 중...</p>
    </div>
  ),
});

export default function Home() {
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
    showRace,
    setShowRace,
    showEvolutionTree,
    setShowEvolutionTree,
    showVillage,
    setShowVillage,
    showFishing,
    setShowFishing,
    showWheel,
    setShowWheel,
    showMailbox,
    setShowMailbox,
    showCommunity,
    setShowCommunity,
    showProfile,
    setShowProfile,
    showWorldBoss,
    setShowWorldBoss,
    showTraining,
    setShowTraining,
    showPlaza,
    setShowPlaza,
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

  return (
    <div className="game-frame">
      {/* Canvas: always mounted, hidden when not on home tab */}
      <div style={{ display: activePanel === "home" ? "block" : "none" }} className="w-full h-full">
        <GameCanvas />
      </div>

      {/* TopBar: only show on home tab, hide for fullscreen overlays */}
      {activePanel === "home" && !showCommunity && !showVillage && !showWorldBoss && !showTraining && !showProfile && !showPlaza && <TopBar />}

      {activePanel === "home" && <HomePage />}
      {activePanel === "inventory" && <InventoryPage />}
      {activePanel === "merge" && <MergePage />}
      {activePanel === "explore" && <ExplorePage />}
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
      {showRace && <SlimeRace onClose={() => setShowRace(false)} />}
      {showFishing && <FishingGame onClose={() => setShowFishing(false)} />}
      {showEvolutionTree !== null && (
        <EvolutionTree speciesId={showEvolutionTree} onClose={() => setShowEvolutionTree(null)} />
      )}
      {showVillage && (
        <div className="absolute inset-0 z-50 bg-[#0a0a1a] flex flex-col" style={{ bottom: 76 }}>
          <VillagePage onClose={() => setShowVillage(false)} />
        </div>
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

      {showWorldBoss && <WorldBossPage onClose={() => setShowWorldBoss(false)} />}
      {showTraining && <TrainingPage onClose={() => setShowTraining(false)} />}

      {showPlaza && (
        <div className="absolute inset-0 z-50 bg-[#0a0a1a]" style={{ bottom: 76 }}>
          <PlazaPage onClose={() => setShowPlaza(false)} />
        </div>
      )}
      <WelcomeBackModal />
      <BottomNav />
      <ToastContainer />
      <WhatsNewModal />
    </div>
  );
}
