import { computed } from "vue";
import { storeToRefs } from "pinia";
import { defineStore } from "pinia";
import { useAtriumAppStore } from "./atrium-app.js";

export const useUiStore = defineStore("atrium-ui", () => {
  const app = useAtriumAppStore();
  const {
    backgroundBlurDisabled,
    backgroundPixelated,
    bgA,
    bgB,
    currentLang,
    error,
    isKioskMode,
    isLoginPage,
    isMobile,
    isPrivacyPage,
    languageSelection,
    languageSwitcherMode,
    languageSwitcherVisible,
    loading,
    performanceMode,
    performanceSelection,
    performanceSelectorVisible,
    showA,
    showShortcuts,
    showUserDropdown,
    tooltipDelay,
    tooltipsDisabled
  } = storeToRefs(app);
  const languageLabels = computed(() => app.languageLabels);

  return {
    backgroundBlurDisabled,
    backgroundPixelated,
    bgA,
    bgB,
    closeShortcuts: app.closeShortcuts,
    currentLang,
    error,
    isKioskMode,
    isLoginPage,
    isMobile,
    isPrivacyPage,
    languageLabels,
    languageSelection,
    languageSwitcherMode,
    languageSwitcherVisible,
    loading,
    performanceMode,
    performanceSelection,
    performanceSelectorVisible,
    showA,
    showShortcuts,
    showUserDropdown,
    toggleShortcuts: app.toggleShortcuts,
    tooltipDelay,
    tooltipsDisabled
  };
});
