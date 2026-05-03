import { nextTick } from "vue";
import { routeStateFromRoute } from "./useAtriumAppRouting.js";

export function useAtriumAppWorkspaceLifecycle({
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
}) {
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
    const fallbackNext = routeStateFromRoute(route).view === "login" ? "/" : route?.fullPath || "/";
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

  return {
    ensureAuthPageReady,
    ensurePublicRouteReady,
    ensureWorkspaceReady,
    resolveHomePath,
    syncRouteSelection,
    updateLoginTargetFromRoute
  };
}
