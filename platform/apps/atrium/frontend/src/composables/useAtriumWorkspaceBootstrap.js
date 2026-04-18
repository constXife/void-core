import { computed } from "vue";

export function useAtriumWorkspaceBootstrap({
  actualIsAdmin,
  authEnabled,
  canManage,
  enableDevAdminSeams,
  error,
  fetchJSON,
  fetchMaybeJSON,
  getRouteState,
  loadAdminSeams,
  loadAuthModes,
  loadDashboardReadModel,
  loadSession,
  loading,
  me,
  scheduleBackgroundRefresh,
  scrollToIndex,
  setBackground,
  spaceRouteSlug,
  spaces,
  syncRoleOverride,
  syncLangFromContext,
  t,
  widgets,
  withRoleOverride
}) {
  const loadAll = async () => {
    loading.value = true;
    error.value = "";
    try {
      const route = getRouteState();
      await loadSession();
      if (route.view === "login") {
        loading.value = false;
        return;
      }
      syncRoleOverride();
      syncLangFromContext();

      const payload = await fetchJSON(withRoleOverride("/atrium/workspace"));
      spaces.value = payload?.workspace?.spaces || [];
      if (spaces.value.length > 0) {
        let nextIndex = 0;
        let matchedRoute = false;
        if (route.spaceSlug) {
          const idx = spaces.value.findIndex(
            (space) => spaceRouteSlug(space) === route.spaceSlug
          );
          if (idx >= 0) {
            nextIndex = idx;
            matchedRoute = true;
          }
        }
        const defaultIndex = spaces.value.findIndex((space) => space.is_default_public_entry);
        if (!matchedRoute && !me.value && defaultIndex >= 0) {
          nextIndex = defaultIndex;
        }
        scrollToIndex(nextIndex, true, true);
        setBackground(spaces.value[nextIndex]);
        scheduleBackgroundRefresh();
      }
      syncLangFromContext();
      const shouldLoadAllDashboards = canManage();
      await Promise.all(
        spaces.value.map((space) => loadDashboardReadModel(space, shouldLoadAllDashboards))
      );

      try {
        widgets.value = await fetchJSON("/atrium/widgets");
      } catch {
        widgets.value = [];
      }

      if (actualIsAdmin() && enableDevAdminSeams) {
        await loadAdminSeams();
      } else if (!me.value) {
        await loadAuthModes();
      }
    } catch (err) {
      error.value = err.message || "Failed to load";
    } finally {
      loading.value = false;
    }
  };

  const userInitials = computed(() => {
    if (!me.value?.email) return "?";
    const parts = me.value.email.split("@")[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return me.value.email.slice(0, 2).toUpperCase();
  });

  const logout = async () => {
    try {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
      window.location.reload();
    } catch {
      error.value = t("auth.logoutFailed");
    }
  };

  return {
    loadAll,
    logout,
    userInitials
  };
}
