import { computed, ref, shallowRef } from "vue";

const ADMIN_TABS = new Set(["overview", "spaces", "members", "content", "dashboard"]);

export const createFallbackRoute = () => ({
  name: "home",
  path: "/",
  fullPath: "/",
  params: {},
  query: {}
});

export const normalizeAdminTab = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  return ADMIN_TABS.has(raw) ? raw : "overview";
};

export const routeStateFromRoute = (route) => {
  const name = String(route?.name || "");
  if (name === "login") {
    return { view: "login", tab: null, spaceSlug: null };
  }
  if (name === "privacy") {
    return { view: "privacy", tab: null, spaceSlug: null };
  }
  if (name.startsWith("admin")) {
    const tabFromName = name.startsWith("admin-") ? name.replace("admin-", "") : "";
    return {
      view: "admin",
      tab: normalizeAdminTab(tabFromName || route?.params?.adminTab),
      spaceSlug: null
    };
  }
  const spaceSlug = typeof route?.params?.spaceSlug === "string" ? route.params.spaceSlug : null;
  return { view: "spaces", tab: null, spaceSlug };
};

export function useAtriumAppRouting({
  getWorkspaceBootstrapped,
  syncLangFromContext,
  syncRouteSelection,
  updateLoginTargetFromRoute
}) {
  const currentRoute = shallowRef(createFallbackRoute());
  const routerReady = ref(false);
  let routerInstance = null;
  let removeAfterEach = null;

  const routeState = computed(() => routeStateFromRoute(currentRoute.value));
  const adminTab = computed(() => routeState.value.tab || "overview");
  const isLoginPage = computed(() => routeState.value.view === "login");
  const isPrivacyPage = computed(() => routeState.value.view === "privacy");
  const showAdmin = computed(() => routeState.value.view === "admin");

  const safeRouterCall = async (method, target) => {
    if (!routerInstance) return;
    try {
      await routerInstance[method](target);
    } catch {
      // ignore duplicated navigations
    }
  };

  const replaceRoute = (path) => {
    if (!routerInstance || routerInstance.currentRoute.value.path === path) return;
    void safeRouterCall("replace", path);
  };

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
      if (getWorkspaceBootstrapped()) {
        void syncRouteSelection(to);
      } else {
        syncLangFromContext();
      }
    });
  };

  return {
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
  };
}
