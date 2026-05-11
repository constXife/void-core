import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { useAtriumAdminData } from "../composables/useAtriumAdminData.js";
import { useAtriumAppListeners } from "../composables/app/useAtriumAppListeners.js";
import {
  formatNotifTime,
  gridClass,
  isAdminSpace,
  isKidsSpace,
  isPublicReadonlySpace,
  parseDisplayConfig,
  useAtriumAppPresentationText,
  widgetHtml
} from "../composables/app/useAtriumAppPresentation.js";
import { useAtriumAppRouting } from "../composables/app/useAtriumAppRouting.js";
import { useAtriumAppWorkspaceLifecycle } from "../composables/app/useAtriumAppWorkspaceLifecycle.js";
import { useAtriumWidgetScope } from "../composables/app/useAtriumWidgetScope.js";
import { useAtriumAuthPage } from "../composables/useAtriumAuthPage.js";
import { useAtriumDashboard } from "../composables/useAtriumDashboard.js";
import { useAtriumDisplayRuntime } from "../composables/useAtriumDisplayRuntime.js";
import { useAtriumI18n } from "../composables/useAtriumI18n.js";
import { useAtriumResources } from "../composables/useAtriumResources.js";
import { useAtriumRoleOverride } from "../composables/useAtriumRoleOverride.js";
import { useAtriumTheme } from "../composables/useAtriumTheme.js";
import {
  useAdminMeta,
  usePublicShellMeta
} from "../composables/useAtriumShellMeta.js";
import { useAtriumSpacePicker } from "../composables/useAtriumSpacePicker.js";
import { useAtriumStageRuntime } from "../composables/useAtriumStageRuntime.js";
import { useAtriumWidgetRuntime } from "../composables/useAtriumWidgetRuntime.js";
import { useAtriumWorkspaceBootstrap } from "../composables/useAtriumWorkspaceBootstrap.js";
import {
  BLOCK_TYPE_CARDS,
  BLOCK_TYPE_OPTIONS,
  BLOCK_TYPES,
  ENABLE_V0_DEV_ADMIN_SEAMS,
  ENABLE_V0_EDITOR,
  ENABLE_V0_RESOURCE_DETAILS,
  HOTKEYS
} from "../atrium-config.js";
import privacyDocumentEn from "../content/privacy.en.md?raw";
import privacyDocumentRu from "../content/privacy.ru.md?raw";
import { createAtriumApi } from "../lib/atrium-api.js";
import { createAtriumSettings } from "../lib/atrium-settings.js";
import { staffMetrics, staffQueue, staffQuickActions } from "../mocks/staff.js";
import { useToastStore } from "./toast.js";

export const useAtriumAppStore = defineStore("atrium-app", () => {
  const toastStore = useToastStore();

  const workspaceBootstrapped = ref(false);
  const sessionLoaded = ref(false);
  const authModesLoaded = ref(false);

  const me = ref(null);
  const spaces = ref([]);
  const loading = ref(true);
  const error = ref("");
  const authEnabled = ref(true);
  const showShortcuts = ref(false);
  const showUserDropdown = ref(false);
  const widgets = ref([]);
  const isMobile = ref(false);
  const businessNotifications = ref([]);
  const serviceDetailsOpen = ref(false);
  const serviceDetailsItem = ref(null);
  const userMenuRef = ref(null);

  const {
    adminTab,
    attachRouter,
    currentRoute,
    isLoginPage,
    isPrivacyPage,
    navigateTo,
    navigateToAdmin,
    navigateToPrivacy,
    navigateToSpace,
    replaceRoute,
    routeState,
    routerReady,
    showAdmin
  } = useAtriumAppRouting({
    getWorkspaceBootstrapped: () => workspaceBootstrapped.value,
    syncLangFromContext: () => syncLangFromContext(),
    syncRouteSelection: (...args) => syncRouteSelection(...args),
    updateLoginTargetFromRoute: (...args) => updateLoginTargetFromRoute(...args)
  });

  const notify = (message, type = "info") => {
    toastStore.pushBanner(message, type);
  };

  const {
    currentIndex,
    currentSpace,
    disposeStageRuntime,
    hasNextSpaces,
    hasPrevSpaces,
    initialScrollDone,
    lastSpaceSlug,
    lastSpaceSlugKey,
    nextSpace,
    pinnedSpaceIds,
    pinnedSpacesKey,
    prevSpace,
    recentResourcesBySpace,
    recentResourcesKey,
    recentSpaceIds,
    recentSpacesKey,
    scrollToIndex,
    spaceRouteSlug,
    stageRef,
    updateIndex
  } = useAtriumStageRuntime({
    getPerformanceMode: () => performanceMode.value,
    onRecentSpace: (spaceId) => updateRecentSpaces(spaceId),
    persistLastSpaceSlug: (slug) => settingsStore.setJSON(lastSpaceSlugKey, slug),
    replaceRoute,
    scheduleBackgroundRefresh: () => scheduleBackgroundRefresh(),
    setBackground: (space) => setBackground(space),
    spaces
  });

  const settingsStore = createAtriumSettings({
    getCurrentSpace: () => currentSpace.value
  });

  const { currentTheme, themePreference, themeSelection } = useAtriumTheme();

  const isKioskMode = computed(() => {
    const cfg = parseDisplayConfig(currentSpace.value);
    return cfg.kiosk === true;
  });

  const {
    PERFORMANCE_PREF_KEY,
    bgA,
    bgB,
    disposeDisplayRuntime,
    backgroundBlurDisabled,
    backgroundPixelated,
    performanceMode,
    performancePreference,
    performanceSelection,
    performanceSelectorVisible,
    scheduleBackgroundRefresh,
    setBackground,
    showA,
    tooltipDelay,
    tooltipsDisabled
  } = useAtriumDisplayRuntime({
    currentSpace,
    isKioskMode,
    me,
    parseDisplayConfig,
    settingsStore
  });

  const navigateHome = () => {
    if (lastSpaceSlug.value) {
      navigateToSpace(lastSpaceSlug.value);
      return;
    }
    navigateTo("/");
  };

  const { fetchJSON, fetchMaybeJSON } = createAtriumApi({
    onMaybeNotFound: () => {
      authEnabled.value = false;
    }
  });

  const loadSession = async () => {
    if (sessionLoaded.value) return me.value;
    try {
      me.value = await fetchMaybeJSON("/api/me");
    } catch {
      me.value = null;
    } finally {
      sessionLoaded.value = true;
    }
    return me.value;
  };

  const ensureSession = async () => loadSession();

  const {
    loadAll,
    logout,
    userInitials
  } = useAtriumWorkspaceBootstrap({
    actualIsAdmin: () => actualIsAdmin.value,
    authEnabled,
    canManage: () => canManage.value,
    enableDevAdminSeams: ENABLE_V0_DEV_ADMIN_SEAMS,
    error,
    fetchJSON,
    fetchMaybeJSON,
    getRouteState: () => routeState.value,
    loadAdminSeams: (...args) => loadAdminSeams(...args),
    loadAuthModes: (...args) => loadAuthModes(...args),
    loadDashboardReadModel: (...args) => loadDashboardReadModel(...args),
    loadSession,
    loading,
    me,
    scheduleBackgroundRefresh: () => scheduleBackgroundRefresh(),
    scrollToIndex: (...args) => scrollToIndex(...args),
    setBackground: (...args) => setBackground(...args),
    spaceRouteSlug: (...args) => spaceRouteSlug(...args),
    spaces,
    syncRoleOverride: () => syncRoleOverride(),
    syncLangFromContext: () => syncLangFromContext(),
    t: (...args) => t(...args),
    widgets,
    withRoleOverride: (...args) => withRoleOverride(...args)
  });

  const {
    addMembership,
    archiveSpace,
    archivedSpacesAdmin,
    contentSpaceId,
    createDirectoryItem,
    createSpace,
    deleteDirectoryItem,
    deleteSpace,
    directoryAdmin,
    directoryForm,
    editDisplayConfig,
    editPersonalizationRules,
    editSpace,
    importMemberships,
    loadAdminSeams,
    membershipBulk,
    membershipForm,
    membershipSpaceId,
    memberships,
    newSpace,
    normalizeIconUrl,
    onContentSpaceChange,
    onMembershipSpaceChange,
    provisioningCatalog,
    provisioningDirectoryAdmin,
    provisioningSpaceDetail,
    provisioningSpaceDetailLoading,
    removeMembership,
    restoreSpace,
    provisioningRoles,
    roles,
    selectedContentSpace,
    spacesAdmin,
    startEditSpace,
    clearProvisioningSpaceDetail,
    updateDirectoryItem,
    updateMemberSegment,
    updateSpace
  } = useAtriumAdminData({
    fetchJSON,
    error,
    notify,
    translate: (...args) => t(...args)
  });

  const PRIVACY_DOCUMENTS = {
    en: privacyDocumentEn,
    ru: privacyDocumentRu
  };

  const {
    actualIsAdmin,
    actualRole,
    canManage,
    effectiveRole,
    isAdmin,
    roleOptions,
    roleOverrideActive,
    roleOverrideSelection,
    syncRoleOverride,
    withRoleOverride
  } = useAtriumRoleOverride({
    loadAll,
    me,
    navigateHome,
    provisioningRoles,
    roles,
    settingsStore,
    showAdmin,
    onOverrideApplied: () => {
      showUserDropdown.value = false;
      dashboards.value = {};
      dashboardData.value = {};
    }
  });

  const {
    actionLabel,
    canOpenResourceDetails,
    closeResourcePopover,
    copyText,
    formatEndpointLine,
    handleGlobalClick,
    invokeServiceAction,
    normalizeActionKeys,
    normalizeLinks,
    openResourceLink,
    rememberResourceVisit,
    resourceInitial,
    resourcePopoverAnchor,
    resourcePopoverItem,
    resourcePopoverOpen,
    resourcePopoverPlacement,
    resourcePopoverViewer,
    runSurfaceAction,
    s3EndpointsFor,
    serviceStatusLabel,
    surfaceCardActions,
    surfaceCardsFor,
    surfaceHeadingFor,
    toggleResourcePopover,
    updateResourcePopoverPlacement
  } = useAtriumResources({
    BLOCK_TYPES,
    blockDataFor: (...args) => blockDataFor(...args),
    blockTypeIs: (...args) => blockTypeIs(...args),
    blocksForSpace: (...args) => blocksForSpace(...args),
    fetchJSON,
    isAdminSpace: (...args) => isAdminSpace(...args),
    isKidsSpace: (...args) => isKidsSpace(...args),
    isPublicReadonlySpace: (...args) => isPublicReadonlySpace(...args),
    navigateTo: (...args) => navigateTo(...args),
    navigateToAdmin: (...args) => navigateToAdmin(...args),
    notify,
    recentResourcesBySpace,
    recentResourcesKey,
    settingsStore,
    showUserDropdown,
    spaces,
    t: (...args) => t(...args),
    userMenuRef,
    withRoleOverride: (...args) => withRoleOverride(...args)
  });

  const {
    currentLang,
    currentLocale,
    languageLabels,
    languageSelection,
    languageSwitcherMode,
    languageSwitcherVisible,
    privacyDocumentHtml,
    supportedLangs,
    syncLangFromContext,
    t
  } = useAtriumI18n({
    actualRole,
    authEnabled,
    currentSpace,
    isKioskMode,
    me,
    parseDisplayConfig,
    privacyDocuments: PRIVACY_DOCUMENTS,
    settingsStore
  });

  const {
    localizedText,
    resourceDescription,
    resourceTitle,
    spaceDescription,
    spacePublicHelp,
    spacePublicTitle,
    spaceTitle
  } = useAtriumAppPresentationText({ currentLang, currentLocale });

  const {
    authModes,
    hasLoginOption,
    loadAuthModes,
    loginBusy,
    loginError,
    loginNext,
    loginPageUrl,
    loginUrl,
    setLoginTarget,
    showDevLogin,
    devLoginEmails,
    applyDevLogin
  } = useAtriumAuthPage(fetchJSON, t);

  const { adminTitle, adminSubtitle } = useAdminMeta(adminTab, t);

  const closeEditSpace = () => {
    editSpace.value = null;
    clearProvisioningSpaceDetail();
  };

  const membershipSegmentOptions = computed(() => {
    const id = Number(membershipSpaceId.value || 0);
    const space = spacesAdmin.value.find((item) => item.id === id);
    const cfg = parseDisplayConfig(space);
    const raw =
      cfg.segment_options ||
      cfg.user_segments ||
      cfg.segments ||
      cfg.segmentOptions ||
      [];
    if (!Array.isArray(raw)) return [];
    return raw.map((value) => String(value)).filter((value) => value);
  });

  const handleMembershipSpaceChange = async (value) => {
    membershipSpaceId.value = value;
    await onMembershipSpaceChange();
  };

  const handleContentSpaceChange = async (value) => {
    contentSpaceId.value = value;
    await onContentSpaceChange();
  };

  const openServiceDetails = (item) => {
    serviceDetailsItem.value = item;
    serviceDetailsOpen.value = true;
  };

  const closeServiceDetails = () => {
    serviceDetailsOpen.value = false;
    serviceDetailsItem.value = null;
  };

  const { guestFocusSpace } = usePublicShellMeta(spaces);

  const {
    addBlockFromPicker,
    addDashboardBlock,
    canEditDashboardSpace,
    applyProvisioningSnapshotToEditor,
    resetDashboardEditorDraft,
    applyDashboardEditForm,
    blockDataCount,
    blockDataFor,
    blockOrderMapForSpace,
    blockOrderMapFromBlocks,
    blockStyle,
    blockTitle,
    blockTypeIs,
    blockTypeLabel,
    blocksForSpace,
    closeAddBlockPicker,
    closeInlineEdit,
    createBlockFromPlaceholder,
    dashboardAddOpen,
    dashboardData,
    dashboardDragGhost,
    dashboardDragging,
    dashboardEditAdvanced,
    dashboardEditDirty,
    dashboardEditForm,
    dashboardEditNewType,
    dashboardEditPanelStyle,
    dashboardEditSelectedId,
    dashboardEditSpaceId,
    dashboardEditorBlocks,
    dashboardEditorOrder,
    dashboardEditorSaving,
    dashboardEditorProvisioningLoading,
    dashboardEditorProvisioningSnapshot,
    dashboardEditorSpace,
    dashboardLoading,
    dashboardPreviewRole,
    dashboards,
    deleteDashboardBlockDraft,
    deleteInlineItem,
    disposeDashboard,
    hasDashboard,
    inlineAddForm,
    inlineEditAdvanced,
    inlineEditBlock,
    inlineEditForm,
    inlineEditPopover,
    isDashboardEditing,
    isResourcesBlock,
    loadDashboardReadModel,
    onPreviewRoleChange,
    openAddBlockPicker,
    openBlockAddContent,
    openBlockSettings,
    openDashboardEditor,
    saveBlockSettings,
    saveDashboardEditor,
    saveDashboardLayout,
    saveInlineContent,
    setDashboardEditSelection,
    showDashboardEditor,
    stopDashboardEdit,
    toggleDashboardEdit
  } = useAtriumDashboard({
    BLOCK_TYPES,
    canManage,
    fetchJSON,
    isMobile,
    isPublicReadonlySpace,
    localizedText,
    notify,
    parseDisplayConfig,
    showAdmin,
    spaces,
    spacesAdmin,
    t,
    withRoleOverride
  });

  const { globalWidgets, localWidgets } = useAtriumWidgetScope({
    parseDisplayConfig,
    widgets
  });

  const {
    bookingStatusClass,
    bookingStatusLabel,
    calendarDateLabel,
    calendarEventsFor,
    calendarVariant,
    clockDateFor,
    clockNow,
    clockThemeClass,
    clockTimeFor,
    eventStatusClass,
    handleVisibilityChange,
    syncClockTimer,
    todoItemsFor,
    toggleTodo,
    updateClock
  } = useAtriumWidgetRuntime({
    currentSpace,
    globalWidgets,
    isKidsSpace,
    localWidgets,
    stageRef,
    widgets
  });

  const {
    closeShortcuts,
    registerWindowListeners,
    toggleShortcuts,
    updateViewport
  } = useAtriumAppListeners({
    currentIndex,
    handleGlobalClick,
    handleVisibilityChange,
    isMobile,
    resourcePopoverAnchor,
    resourcePopoverOpen,
    scrollToIndex,
    showShortcuts,
    spaces,
    updateResourcePopoverPlacement
  });

  const closeDashboardEditor = () => {
    showDashboardEditor.value = false;
    dashboardEditorSpace.value = null;
    dashboardEditorBlocks.value = [];
    dashboardEditorOrder.value = [];
    dashboardPreviewRole.value = "admin";
    dashboardEditorProvisioningSnapshot.value = null;
    dashboardEditorProvisioningLoading.value = false;
  };

  const setDashboardPreviewRole = (value) => {
    dashboardPreviewRole.value = value;
  };

  const clearDashboardEditSelection = () => {
    dashboardEditSelectedId.value = null;
  };

  const toggleDashboardEditAdvanced = () => {
    dashboardEditAdvanced.value = !dashboardEditAdvanced.value;
  };

  const toggleInlineEditAdvanced = () => {
    inlineEditAdvanced.value = !inlineEditAdvanced.value;
  };

  const {
    closeSpacePicker,
    isPinnedSpace,
    selectSpace,
    spaceIconLabel,
    spaceMetaLabel,
    spacePickerOpen,
    spacePickerSections,
    spaceQuery,
    togglePinnedSpace,
    toggleSpacePicker,
    updateRecentSpaces
  } = useAtriumSpacePicker({
    isKioskMode,
    pinnedSpaceIds,
    pinnedSpacesKey,
    recentSpaceIds,
    recentSpacesKey,
    scrollToIndex,
    settingsStore,
    spaceDescription,
    spaceTitle,
    spaces
  });

  const {
    ensureAuthPageReady,
    ensurePublicRouteReady,
    ensureWorkspaceReady,
    resolveHomePath,
    syncRouteSelection,
    updateLoginTargetFromRoute
  } = useAtriumAppWorkspaceLifecycle({
    PERFORMANCE_PREF_KEY,
    authModesLoaded,
    currentIndex,
    currentRoute,
    initialScrollDone,
    lastSpaceSlug,
    lastSpaceSlugKey,
    loadAll,
    loadAuthModes,
    loadSession,
    loading,
    performancePreference,
    pinnedSpaceIds,
    pinnedSpacesKey,
    recentResourcesBySpace,
    recentResourcesKey,
    recentSpaceIds,
    recentSpacesKey,
    registerWindowListeners,
    scrollToIndex,
    setLoginTarget,
    settingsStore,
    spaceRouteSlug,
    spaces,
    syncClockTimer,
    syncLangFromContext,
    updateClock,
    updateViewport,
    workspaceBootstrapped
  });

  watch(
    () => isKioskMode.value,
    (value) => {
      if (!value) return;
      closeSpacePicker();
      showUserDropdown.value = false;
    }
  );

  watch(
    () => spaces.value.length,
    async (length) => {
      if (!length || !workspaceBootstrapped.value) return;
      await syncRouteSelection(currentRoute.value);
    }
  );

  return {
    actionLabel,
    actualIsAdmin,
    actualRole,
    addBlockFromPicker,
    addDashboardBlock,
    applyProvisioningSnapshotToEditor,
    resetDashboardEditorDraft,
    addMembership,
    adminSubtitle,
    adminTab,
    adminTitle,
    applyDashboardEditForm,
    applyDevLogin,
    archiveSpace,
    archivedSpacesAdmin,
    attachRouter,
    authEnabled,
    authModes,
    backgroundBlurDisabled,
    backgroundPixelated,
    bgA,
    bgB,
    blockDataCount,
    blockDataFor,
    blockOrderMapForSpace,
    blockOrderMapFromBlocks,
    blockStyle,
    blockTitle,
    blockTypeCards: BLOCK_TYPE_CARDS,
    blockTypeIs,
    blockTypeLabel,
    blockTypeOptions: BLOCK_TYPE_OPTIONS,
    blockTypes: BLOCK_TYPES,
    blocksForSpace,
    bookingStatusClass,
    bookingStatusLabel,
    businessNotifications,
    calendarDateLabel,
    calendarEventsFor,
    calendarVariant,
    canEditDashboardSpace,
    canManage,
    canOpenResourceDetails,
    clearDashboardEditSelection,
    closeAddBlockPicker,
    closeDashboardEditor,
    closeEditSpace,
    closeInlineEdit,
    closeResourcePopover,
    closeServiceDetails,
    closeShortcuts,
    closeSpacePicker,
    clockDateFor,
    clockNow,
    clockThemeClass,
    clockTimeFor,
    contentSpaceId,
    copyText,
    createDirectoryItem,
    createSpace,
    currentIndex,
    currentLang,
    currentTheme,
    currentRoute,
    currentSpace,
    dashboardAddOpen,
    dashboardData,
    dashboardDragGhost,
    dashboardDragging,
    dashboardEditAdvanced,
    dashboardEditDirty,
    dashboardEditForm,
    dashboardEditPanelStyle,
    dashboardEditSelectedId,
    dashboardEditorBlocks,
    dashboardEditorSaving,
    dashboardEditorProvisioningLoading,
    dashboardEditorProvisioningSnapshot,
    dashboardEditorSpace,
    dashboardLoading,
    dashboardPreviewRole,
    dashboards,
    deleteDashboardBlockDraft,
    deleteDirectoryItem,
    deleteInlineItem,
    deleteSpace,
    devLoginEmails,
    directoryAdmin,
    directoryForm,
    editDisplayConfig,
    editPersonalizationRules,
    editSpace,
    effectiveRole,
    enableV0DevAdminSeams: ENABLE_V0_DEV_ADMIN_SEAMS,
    enableV0Editor: ENABLE_V0_EDITOR,
    enableV0ResourceDetails: ENABLE_V0_RESOURCE_DETAILS,
    ensureAuthPageReady,
    ensurePublicRouteReady,
    ensureSession,
    ensureWorkspaceReady,
    error,
    eventStatusClass,
    fetchJSON,
    formatEndpointLine,
    formatNotifTime,
    globalWidgets,
    gridClass,
    guestFocusSpace,
    handleContentSpaceChange,
    handleMembershipSpaceChange,
    hasDashboard,
    hasLoginOption,
    hasNextSpaces,
    hasPrevSpaces,
    hotkeys: HOTKEYS,
    importMemberships,
    inlineAddForm,
    inlineEditAdvanced,
    inlineEditBlock,
    inlineEditForm,
    inlineEditPopover,
    invokeServiceAction,
    isAdmin,
    isAdminSpace,
    isDashboardEditing,
    isKidsSpace,
    isKioskMode,
    isLoginPage,
    isMobile,
    isPinnedSpace,
    isPrivacyPage,
    isPublicReadonlySpace,
    isResourcesBlock,
    languageLabels,
    languageSelection,
    languageSwitcherMode,
    languageSwitcherVisible,
    loading,
    localWidgets,
    loginBusy,
    loginError,
    loginNext,
    loginPageUrl,
    loginUrl,
    logout,
    me,
    membershipBulk,
    membershipForm,
    membershipSegmentOptions,
    membershipSpaceId,
    memberships,
    navigateHome,
    navigateTo,
    navigateToAdmin,
    navigateToPrivacy,
    navigateToSpace,
    newSpace,
    nextSpace,
    normalizeActionKeys,
    normalizeIconUrl,
    normalizeLinks,
    openResourceLink,
    onDashboardPreviewRoleChange: onPreviewRoleChange,
    openAddBlockPicker,
    openBlockAddContent,
    openBlockSettings,
    openDashboardEditor,
    openServiceDetails,
    performanceMode,
    performanceSelection,
    performanceSelectorVisible,
    prevSpace,
    privacyDocumentHtml,
    provisioningCatalog,
    provisioningDirectoryAdmin,
    provisioningSpaceDetail,
    provisioningSpaceDetailLoading,
    recentResourcesBySpace,
    rememberResourceVisit,
    removeMembership,
    restoreSpace,
    resolveHomePath,
    resourceInitial,
    resourceDescription,
    resourcePopoverItem,
    resourcePopoverOpen,
    resourcePopoverPlacement,
    resourcePopoverViewer,
    resourceTitle,
    roleOptions,
    roleOverrideActive,
    roleOverrideSelection,
    roles,
    routeState,
    routerReady,
    runSurfaceAction,
    s3EndpointsFor,
    saveBlockSettings,
    saveDashboardEditor,
    saveDashboardLayout,
    saveInlineContent,
    selectSpace,
    serviceDetailsItem,
    serviceDetailsOpen,
    serviceStatusLabel,
    setDashboardEditSelection,
    setDashboardPreviewRole,
    showA,
    showAdmin,
    showDashboardEditor,
    showDevLogin,
    showShortcuts,
    showUserDropdown,
    selectedContentSpace,
    spaceDescription,
    spaceIconLabel,
    spaceMetaLabel,
    spacePickerOpen,
    spacePickerSections,
    spacePublicHelp,
    spacePublicTitle,
    spaceTitle,
    spaceQuery,
    spaces,
    spacesAdmin,
    staffMetrics,
    staffQueue,
    staffQuickActions,
    stageRef,
    startEditSpace,
    stopDashboardEdit,
    supportedLangs,
    surfaceCardActions,
    surfaceCardsFor,
    surfaceHeadingFor,
    syncRoleOverride,
    t,
    themePreference,
    themeSelection,
    toastStore,
    todoItemsFor,
    toggleDashboardEdit,
    toggleDashboardEditAdvanced,
    toggleInlineEditAdvanced,
    togglePinnedSpace,
    toggleResourcePopover,
    toggleShortcuts,
    toggleSpacePicker,
    toggleTodo,
    tooltipDelay,
    tooltipsDisabled,
    updateDirectoryItem,
    updateIndex,
    updateMemberSegment,
    updateSpace,
    userInitials,
    userMenuRef,
    widgetHtml,
    widgets
  };
});
