import { useEffect } from "react";
import { App } from "@capacitor/app";
import { isNativePlatform } from "./platform";
import { useGameStore } from "./store/gameStore";

export function useAndroidBackButton() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    const listener = App.addListener("backButton", () => {
      const state = useGameStore.getState();

      // Close modals/overlays in priority order
      if (state.showPlaza) {
        state.setShowPlaza(false);
      } else if (state.showShorts) {
        state.setShowShorts(false);
      } else if (state.showProfile) {
        state.setShowProfile(false);
      } else if (state.showTraining) {
        state.setShowTraining(false);
      } else if (state.showWorldBoss) {
        state.setShowWorldBoss(false);
      } else if (state.showCommunity) {
        state.setShowCommunity(false);
      } else if (state.showVillage) {
        state.setShowVillage(false);
      } else if (state.showMailbox) {
        state.setShowMailbox(false);
      } else if (state.showWheel) {
        state.setShowWheel(false);
      } else if (state.showFishing) {
        state.setShowFishing(false);
      } else if (state.showRace) {
        state.setShowRace(false);
      } else if (state.showEvolutionTree !== null) {
        state.setShowEvolutionTree(null);
      } else if (state.showMissionModal) {
        state.setShowMissionModal(false);
      } else if (state.showAttendanceModal) {
        state.setShowAttendanceModal(false);
      } else if (state.selectedSlimeId) {
        state.selectSlime(null);
      } else if (state.activePanel !== "home") {
        state.setActivePanel("home");
      } else {
        // On home with nothing open — minimize app
        App.minimizeApp();
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);
}
