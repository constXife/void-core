import { storeToRefs } from "pinia";
import { defineStore } from "pinia";
import { useAtriumAppStore } from "./atrium-app.js";

export const useSpaceStore = defineStore("atrium-space", () => {
  const app = useAtriumAppStore();
  const {
    currentSpace,
    globalWidgets,
    hasNextSpaces,
    hasPrevSpaces,
    isKioskMode,
    nextSpace,
    prevSpace,
    spacePickerOpen,
    spacePickerSections,
    spaceQuery,
    spaces
  } = storeToRefs(app);

  return {
    closeSpacePicker: app.closeSpacePicker,
    currentSpace,
    globalWidgets,
    hasNextSpaces,
    hasPrevSpaces,
    isKioskMode,
    isPinnedSpace: app.isPinnedSpace,
    localWidgets: app.localWidgets,
    nextSpace,
    prevSpace,
    selectSpace: app.selectSpace,
    spaceDescription: app.spaceDescription,
    spaceIconLabel: app.spaceIconLabel,
    spaceMetaLabel: app.spaceMetaLabel,
    spacePickerOpen,
    spacePickerSections,
    spaceQuery,
    spaceTitle: app.spaceTitle,
    spaces,
    togglePinnedSpace: app.togglePinnedSpace,
    toggleSpacePicker: app.toggleSpacePicker
  };
});
