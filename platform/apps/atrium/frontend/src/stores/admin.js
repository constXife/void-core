import { storeToRefs } from "pinia";
import { defineStore } from "pinia";
import { useAtriumAppStore } from "./atrium-app.js";

export const useAdminStore = defineStore("atrium-admin", () => {
  const app = useAtriumAppStore();
  const {
    adminSubtitle,
    adminTab,
    adminTitle,
    archivedSpacesAdmin,
    contentSpaceId,
    dashboardTemplates,
    directoryAdmin,
    directoryForm,
    editDisplayConfig,
    editPersonalizationRules,
    editSpace,
    membershipBulk,
    membershipForm,
    membershipSpaceId,
    memberships,
    newSpace,
    reloadConfigPending,
    roles,
    spacesAdmin
  } = storeToRefs(app);

  return {
    addMembership: app.addMembership,
    adminSubtitle,
    adminTab,
    adminTitle,
    archiveSpace: app.archiveSpace,
    archivedSpacesAdmin,
    closeEditSpace: app.closeEditSpace,
    contentSpaceId,
    createDirectoryItem: app.createDirectoryItem,
    createSpace: app.createSpace,
    dashboardTemplates,
    deleteDirectoryItem: app.deleteDirectoryItem,
    deleteSpace: app.deleteSpace,
    directoryAdmin,
    directoryForm,
    editDisplayConfig,
    editPersonalizationRules,
    editSpace,
    handleContentSpaceChange: app.handleContentSpaceChange,
    handleMembershipSpaceChange: app.handleMembershipSpaceChange,
    importMemberships: app.importMemberships,
    membershipBulk,
    membershipForm,
    membershipSegmentOptions: app.membershipSegmentOptions,
    membershipSpaceId,
    memberships,
    navigateHome: app.navigateHome,
    navigateToAdmin: app.navigateToAdmin,
    newSpace,
    normalizeIconUrl: app.normalizeIconUrl,
    openDashboardEditor: app.openDashboardEditor,
    openServiceDetails: app.openServiceDetails,
    reloadConfig: app.reloadConfig,
    reloadConfigPending,
    removeMembership: app.removeMembership,
    restoreSpace: app.restoreSpace,
    roles,
    spacesAdmin,
    startEditSpace: app.startEditSpace,
    updateDirectoryItem: app.updateDirectoryItem,
    updateMemberSegment: app.updateMemberSegment,
    updateSpace: app.updateSpace
  };
});
