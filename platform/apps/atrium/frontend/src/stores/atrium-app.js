import { computed, nextTick, ref, shallowRef, watch } from "vue";
import { defineStore } from "pinia";
import { tinykeys } from "tinykeys";
import { useAtriumAdminData } from "../composables/useAtriumAdminData.js";
import { useAtriumAuthPage } from "../composables/useAtriumAuthPage.js";
import { useAtriumDashboard } from "../composables/useAtriumDashboard.js";
import { useAtriumDisplayRuntime } from "../composables/useAtriumDisplayRuntime.js";
import { useAtriumI18n } from "../composables/useAtriumI18n.js";
import { useAtriumResources } from "../composables/useAtriumResources.js";
import { useAtriumRoleOverride } from "../composables/useAtriumRoleOverride.js";
import { useAtriumTheme } from "../composables/useAtriumTheme.js";
import {
  spaceDescription,
  spacePublicHelp,
  spacePublicTitle,
  useAdminMeta,
  usePublicShellMeta
} from "../composables/useAtriumShellMeta.js";
import { useAtriumSpacePicker } from "../composables/useAtriumSpacePicker.js";
import { useAtriumStageRuntime } from "../composables/useAtriumStageRuntime.js";
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
import { renderMarkdown } from "../lib/atrium-markdown.js";
import { createAtriumSettings } from "../lib/atrium-settings.js";
import { staffMetrics, staffQueue, staffQuickActions } from "../mocks/staff.js";
import { useToastStore } from "./toast.js";

const ADMIN_TABS = new Set(["overview", "spaces", "members", "content", "dashboard"]);

const createFallbackRoute = () => ({
  name: "home",
  path: "/",
  fullPath: "/",
  params: {},
  query: {}
});

const normalizeAdminTab = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  return ADMIN_TABS.has(raw) ? raw : "overview";
};

const routeStateFromRoute = (route) => {
  const name = String(route?.name || "");
  if (name === "login") {
    return { view: "login", tab: null, spaceSlug: null };
  }
  if (name === "privacy") {
    return { view: "privacy", tab: null, spaceSlug: null };
  }
  if (name.startsWith("admin")) {
    const tabFromName = name.startsWith("admin-")
      ? name.replace("admin-", "")
      : "";
    return {
      view: "admin",
      tab: normalizeAdminTab(tabFromName || route?.params?.adminTab),
      spaceSlug: null
    };
  }
  const spaceSlug =
    typeof route?.params?.spaceSlug === "string" ? route.params.spaceSlug : null;
  return { view: "spaces", tab: null, spaceSlug };
};

export const useAtriumAppStore = defineStore("atrium-app", () => {
  const toastStore = useToastStore();

  const currentRoute = shallowRef(createFallbackRoute());
  const routerReady = ref(false);
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
  const clockNow = ref(new Date());
  const todoState = ref({});
  const isMobile = ref(false);
  const isPageVisible = ref(typeof document === "undefined" ? true : !document.hidden);
  const businessNotifications = ref([]);
  const serviceDetailsOpen = ref(false);
  const serviceDetailsItem = ref(null);
  const userMenuRef = ref(null);

  let routerInstance = null;
  let removeAfterEach = null;
  let hotkeysCleanup = null;
  let listenersRegistered = false;
  let clockTimer = null;

  const routeState = computed(() => routeStateFromRoute(currentRoute.value));
  const adminTab = computed(() => routeState.value.tab || "overview");
  const isLoginPage = computed(() => routeState.value.view === "login");
  const isPrivacyPage = computed(() => routeState.value.view === "privacy");
  const showAdmin = computed(() => routeState.value.view === "admin");

  const notify = (message, type = "info") => {
    toastStore.pushBanner(message, type);
  };

  const parseDisplayConfig = (space) => {
    const raw = space?.display_config;
    if (!raw) return {};
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return {};
    }
  };

  const safeRouterCall = async (method, target) => {
    if (!routerInstance) return;
    try {
      await routerInstance[method](target);
    } catch {
      // ignore duplicated navigations
    }
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
    replaceRoute: (path) => {
      if (!routerInstance || routerInstance.currentRoute.value.path === path) return;
      void safeRouterCall("replace", path);
    },
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

  const navigateTo = (path) => {
    const nextPath = path.startsWith("/") ? path : `/${path}`;
    void safeRouterCall("push", nextPath);
  };

  const navigateToAdmin = (tab = "overview") => {
    const nextTab = normalizeAdminTab(tab);
    void safeRouterCall("push", {
      name: `admin-${nextTab}`
    });
  };

  const navigateToPrivacy = () => {
    void safeRouterCall("push", { name: "privacy" });
  };

  const navigateToSpace = (slug) => {
    const normalized = String(slug || "").trim();
    if (!normalized) {
      navigateTo("/");
      return;
    }
    void safeRouterCall("push", {
      name: "space",
      params: { spaceSlug: normalized }
    });
  };

  const navigateHome = () => {
    if (lastSpaceSlug.value) {
      navigateToSpace(lastSpaceSlug.value);
      return;
    }
    void safeRouterCall("push", { name: "home" });
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

  const widgetHtml = (content) => {
    if (!content) return "";
    return renderMarkdown(content);
  };

  const isKidsSpace = (space) =>
    space?.id === "kids" || space?.id === "home-kids" || space?.slug === "home-kids";

  const isAdminSpace = (space) =>
    space?.id === "admin" || space?.id === "home-admin" || space?.slug === "home-admin";

  const isPublicReadonlySpace = (space) =>
    String(space?.access_mode || "").toLowerCase() === "public_readonly";

  const updateViewport = () => {
    if (typeof window === "undefined") return;
    isMobile.value = window.matchMedia("(max-width: 768px)").matches;
    if (resourcePopoverOpen.value && resourcePopoverAnchor.value) {
      updateResourcePopoverPlacement(resourcePopoverAnchor.value);
    }
  };

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
    notify,
    parseDisplayConfig,
    showAdmin,
    spaces,
    spacesAdmin,
    t,
    withRoleOverride
  });

  const normalizeSpaceKey = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    return raw
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
  };

  const widgetInSpace = (widget, space) => {
    if (!widget?.spaces || widget.spaces.length === 0) return true;
    if (widget.spaces.includes("*")) return true;
    if (!space) return false;
    const cfg = typeof space === "object" ? parseDisplayConfig(space) : {};
    const candidates = [];
    if (typeof space === "string") {
      candidates.push(space);
    } else {
      candidates.push(space.id, space.title, cfg?.url);
    }
    const normalizedTargets = candidates.map(normalizeSpaceKey).filter(Boolean);
    const normalizedAllowed = widget.spaces.map(normalizeSpaceKey).filter(Boolean);
    return normalizedAllowed.some((value) => normalizedTargets.includes(value));
  };

  const clockThemeClass = (widget, space) => {
    if (widget?.type !== "clock") return "";
    const theme = widget?.style || (isKidsSpace(space) ? "warm" : "glass");
    return theme === "warm" ? "card-clock-warm" : "card-clock";
  };

  const globalWidgets = computed(() =>
    widgets.value.filter((widget) => widgetInSpace(widget, null))
  );

  const localWidgets = (space) =>
    widgets.value
      .filter(
        (widget) => widgetInSpace(widget, space) && !widget.spaces.includes("*")
      )
      .sort((a, b) => {
        const aTech = a.id?.includes("admin") ? 1 : 0;
        const bTech = b.id?.includes("admin") ? 1 : 0;
        return aTech - bTech;
      });

  const gridClass = (space) => {
    switch (space.layout_mode) {
      case "hero":
        return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6";
      case "list":
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";
      default:
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-4";
    }
  };

  const updateClock = () => {
    clockNow.value = new Date();
  };

  const clockTimeFor = (widget) => {
    const format = String(widget?.time_format || "24");
    const hour12 = format === "12";
    return clockNow.value.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12
    });
  };

  const clockDateFor = () =>
    clockNow.value.toLocaleDateString([], {
      weekday: "long",
      day: "numeric",
      month: "long"
    });

  const calendarDateLabel = (widget) => {
    if (widget?.date_label) return widget.date_label;
    return clockNow.value
      .toLocaleDateString([], { day: "2-digit", month: "short" })
      .toUpperCase();
  };

  const hasClockWidget = computed(() => {
    if (!currentSpace.value) return false;
    const isClock = (widget) => widget?.type === "clock";
    if (globalWidgets.value.some(isClock)) return true;
    return localWidgets(currentSpace.value.id).some(isClock);
  });

  const syncClockTimer = () => {
    const shouldRun = isPageVisible.value && !!stageRef.value && hasClockWidget.value;
    if (shouldRun) {
      if (!clockTimer) {
        updateClock();
        clockTimer = setInterval(updateClock, 1000);
      }
      return;
    }
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };

  const handleVisibilityChange = () => {
    isPageVisible.value = typeof document === "undefined" ? true : !document.hidden;
    syncClockTimer();
  };

  const calendarVariant = (widget, space) => {
    if (widget?.style === "compact") return "compact";
    return space?.layout_mode === "list" ? "compact" : "default";
  };

  const calendarEventsFor = (widget, space) => {
    const events = Array.isArray(widget?.events) ? widget.events : [];
    if (calendarVariant(widget, space) === "compact") {
      return events.slice(0, 2);
    }
    return events;
  };

  const todoItemsFor = (widget) => {
    if (!widget?.id || !Array.isArray(widget?.todos)) return [];
    if (!todoState.value[widget.id]) {
      todoState.value[widget.id] = widget.todos.map((todo) => !!todo.done);
    }
    return widget.todos.map((todo, idx) => ({
      ...todo,
      done: todoState.value[widget.id]?.[idx] ?? !!todo.done
    }));
  };

  const toggleTodo = (widgetId, index) => {
    if (!widgetId) return;
    const current = todoState.value[widgetId] || [];
    todoState.value = {
      ...todoState.value,
      [widgetId]: current.map((value, idx) => (idx === index ? !value : value))
    };
  };

  const bookingStatusLabel = (booking) => {
    if (!booking?.status) return "Status";
    return booking.status;
  };

  const bookingStatusClass = (booking) => {
    const status = String(booking?.status || "").toLowerCase();
    if (status.includes("free") || status.includes("available")) return "booking-status-free";
    if (status.includes("busy") || status.includes("occupied")) return "booking-status-busy";
    return "booking-status-warn";
  };

  const eventStatusClass = (event) => {
    const status = String(event?.status || "").toLowerCase();
    if (status.includes("urgent") || status.includes("alert")) return "event-dot-urgent";
    if (status.includes("done")) return "event-dot-done";
    return "event-dot-normal";
  };

  const formatNotifTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isTypingTarget = (event) => {
    const target = event.target;
    if (!target) return false;
    const tag = target.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea") return true;
    return target.isContentEditable === true;
  };

  const closeShortcuts = () => {
    showShortcuts.value = false;
  };

  const toggleShortcuts = (event) => {
    event?.preventDefault();
    showShortcuts.value = !showShortcuts.value;
  };

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
    spaces
  });

  const restoreWorkspacePreferences = () => {
    pinnedSpaceIds.value = settingsStore.getJSON(pinnedSpacesKey, []);
    recentSpaceIds.value = settingsStore.getJSON(recentSpacesKey, []);
    recentResourcesBySpace.value = settingsStore.getJSON(recentResourcesKey, {});
    lastSpaceSlug.value = settingsStore.getJSON(lastSpaceSlugKey, "");
    performancePreference.value = settingsStore.getJSON(PERFORMANCE_PREF_KEY, "auto");
  };

  const updateLoginTargetFromRoute = (route = currentRoute.value) => {
    const nextParam =
      typeof route?.query?.next === "string" && route.query.next ? route.query.next : "";
    const fallbackNext =
      routeStateFromRoute(route).view === "login" ? "/" : route?.fullPath || "/";
    setLoginTarget(nextParam || fallbackNext);
  };

  const syncRouteSelection = async (route = currentRoute.value) => {
    currentRoute.value = route;
    updateLoginTargetFromRoute(route);
    syncLangFromContext();

    if (routeStateFromRoute(route).view !== "spaces" || spaces.value.length === 0) {
      return;
    }

    const { spaceSlug } = routeStateFromRoute(route);
    if (spaceSlug) {
      const idx = spaces.value.findIndex((space) => spaceRouteSlug(space) === spaceSlug);
      if (idx >= 0) {
        await nextTick();
        scrollToIndex(idx, false, !initialScrollDone.value);
        return;
      }
    }

    if (currentIndex.value !== 0) {
      await nextTick();
      scrollToIndex(0, false, !initialScrollDone.value);
    }
  };

  const registerWindowListeners = () => {
    if (listenersRegistered || typeof window === "undefined") return;
    listenersRegistered = true;

    window.addEventListener("resize", updateViewport);
    document.addEventListener("click", handleGlobalClick);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    hotkeysCleanup = tinykeys(window, {
      "?": (event) => toggleShortcuts(event),
      Escape: (event) => {
        if (!showShortcuts.value) return;
        event.preventDefault();
        showShortcuts.value = false;
      },
      ArrowRight: (event) => {
        if (isTypingTarget(event)) return;
        scrollToIndex(Math.min(currentIndex.value + 1, spaces.value.length - 1));
      },
      ArrowLeft: (event) => {
        if (isTypingTarget(event)) return;
        scrollToIndex(Math.max(currentIndex.value - 1, 0));
      },
      KeyD: (event) => {
        if (isTypingTarget(event)) return;
        scrollToIndex(Math.min(currentIndex.value + 1, spaces.value.length - 1));
      },
      KeyA: (event) => {
        if (isTypingTarget(event)) return;
        scrollToIndex(Math.max(currentIndex.value - 1, 0));
      }
    });
  };

  const attachRouter = (router) => {
    if (routerInstance === router && removeAfterEach) {
      currentRoute.value = router.currentRoute.value;
      return;
    }

    routerInstance = router;
    currentRoute.value = router.currentRoute.value;
    routerReady.value = true;

    if (removeAfterEach) {
      removeAfterEach();
      removeAfterEach = null;
    }

    removeAfterEach = router.afterEach((to) => {
      currentRoute.value = to;
      updateLoginTargetFromRoute(to);
      if (workspaceBootstrapped.value) {
        void syncRouteSelection(to);
      } else {
        syncLangFromContext();
      }
    });
  };

  const ensureAuthPageReady = async (route = currentRoute.value) => {
    currentRoute.value = route;
    updateLoginTargetFromRoute(route);
    syncLangFromContext();
    if (!authModesLoaded.value) {
      await loadAuthModes();
      authModesLoaded.value = true;
    }
    loading.value = false;
  };

  const ensurePublicRouteReady = async (route = currentRoute.value) => {
    currentRoute.value = route;
    updateLoginTargetFromRoute(route);
    syncLangFromContext();
    loading.value = false;
  };

  const ensureWorkspaceReady = async (route = currentRoute.value) => {
    currentRoute.value = route;
    updateLoginTargetFromRoute(route);

    if (!workspaceBootstrapped.value) {
      restoreWorkspacePreferences();
      registerWindowListeners();
      updateClock();
      updateViewport();
      await loadAll();
      workspaceBootstrapped.value = true;
    } else {
      await loadSession();
    }

    await syncRouteSelection(route);
    syncClockTimer();
  };

  const resolveHomePath = () => (lastSpaceSlug.value ? `/space/${lastSpaceSlug.value}` : "/");

  watch(
    () => widgets.value,
    () => {
      todoState.value = {};
    }
  );

  watch([hasClockWidget, () => stageRef.value, isPageVisible], () => {
    syncClockTimer();
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
    hasClockWidget,
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
    resourcePopoverItem,
    resourcePopoverOpen,
    resourcePopoverPlacement,
    resourcePopoverViewer,
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
