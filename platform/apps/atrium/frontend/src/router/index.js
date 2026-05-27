import { createRouter, createWebHistory } from "vue-router";
import AppLayout from "../layouts/AppLayout.vue";
import AdminLayout from "../layouts/AdminLayout.vue";
import AuthLayout from "../layouts/AuthLayout.vue";
import AtriumHomePage from "../pages/AtriumHomePage.vue";
import AssistantProductRoute from "../pages/AssistantProductRoute.vue";
import AssistantRunReportRoute from "../pages/AssistantRunReportRoute.vue";
import AssistantRunsRoute from "../pages/AssistantRunsRoute.vue";
import ArtifactPage from "../surfaces/artifact/ArtifactPage.vue";
import AtriumLoginRoute from "../pages/AtriumLoginRoute.vue";
import AtriumPrivacyRoute from "../pages/AtriumPrivacyRoute.vue";
import CustomSurfaceComposerRoute from "../pages/CustomSurfaceComposerRoute.vue";
import AdminContentRoute from "../pages/admin/AdminContentRoute.vue";
import AdminDashboardRoute from "../pages/admin/AdminDashboardRoute.vue";
import AdminMembersRoute from "../pages/admin/AdminMembersRoute.vue";
import AdminOverviewRoute from "../pages/admin/AdminOverviewRoute.vue";
import AdminSpacesRoute from "../pages/admin/AdminSpacesRoute.vue";
import { hasResolvedPlatformAccount } from "../platform/account.js";
import { useAtriumAppStore } from "../stores/atrium-app.js";

function isAssistantHost() {
  if (typeof window === "undefined") return false;
  return String(window.location.hostname || "").toLowerCase().startsWith("assistant.");
}

const assistantHost = isAssistantHost();
const assistantAccountMeta = { authRequired: true, accountRequired: true };

export function hasResolvedRouteAccount(appStore) {
  return hasResolvedPlatformAccount(appStore?.me, { role: appStore?.actualRole });
}

const routes = [
  {
    path: "/login",
    component: AuthLayout,
    children: [
      {
        path: "",
        name: "login",
        component: AtriumLoginRoute,
        meta: { authPage: true }
      }
    ]
  },
  {
    path: "/privacy",
    component: AuthLayout,
    children: [
      {
        path: "",
        name: "privacy",
        component: AtriumPrivacyRoute,
        meta: { publicPage: true }
      }
    ]
  },
  ...(assistantHost
    ? [
        {
          path: "/",
          name: "assistant-home",
          component: AssistantProductRoute,
          meta: assistantAccountMeta
        },
        {
          path: "/c/:id",
          name: "assistant-chat",
          component: AssistantProductRoute,
          meta: assistantAccountMeta
        },
        {
          path: "/capabilities",
          name: "assistant-capabilities",
          component: AssistantProductRoute,
          meta: assistantAccountMeta
        },
        {
          path: "/capabilities/:skillId",
          name: "assistant-capability-detail",
          component: AssistantProductRoute,
          meta: assistantAccountMeta
        },
        {
          path: "/routines",
          name: "assistant-routines",
          component: AssistantProductRoute,
          meta: assistantAccountMeta
        },
        {
          path: "/routines/:instanceId",
          name: "assistant-routine-inspect",
          component: AssistantProductRoute,
          meta: { ...assistantAccountMeta, drawerMode: "inspect" }
        },
        {
          path: "/routines/:instanceId/edit",
          name: "assistant-routine-edit",
          component: AssistantProductRoute,
          meta: { ...assistantAccountMeta, drawerMode: "edit" }
        },
        {
          path: "/runs/:id",
          name: "assistant-run-report",
          component: AssistantRunReportRoute,
          meta: assistantAccountMeta
        },
        {
          path: "/routines/:instanceId/runs",
          name: "assistant-routine-runs",
          component: AssistantRunsRoute,
          meta: assistantAccountMeta
        },
        {
          path: "/routines/:instanceId/runs/:runId",
          name: "assistant-routine-run-detail",
          component: AssistantRunsRoute,
          meta: assistantAccountMeta
        }
      ]
    : [
        {
          path: "/",
          component: AppLayout,
          meta: { workspace: true },
          children: [
            {
              path: "",
              name: "home",
              component: AtriumHomePage
            }
          ]
        }
      ]),
  {
    path: "/assistant",
    name: "assistant",
    component: AssistantProductRoute,
    meta: assistantAccountMeta
  },
  {
    path: "/space/:spaceSlug",
    component: AppLayout,
    meta: { workspace: true },
    children: [
      {
        path: "",
        name: "space",
        component: AtriumHomePage
      }
    ]
  },
  {
    path: "/composer",
    component: AppLayout,
    meta: { workspace: true, authRequired: true },
    children: [
      {
        path: "",
        name: "custom-surface-composer",
        component: CustomSurfaceComposerRoute
      }
    ]
  },
  {
    // Generic fullscreen artifact view. Entry-point — ArtifactLinkBlock card в чате,
    // schema dispatch внутри ArtifactPage. URL stable: можно share, открыть позже.
    // Доступен на обоих hosts (assistant.* и main) — это generic primitive, не product-specific.
    path: "/artifacts/:artifactId",
    name: "artifact-detail",
    component: ArtifactPage,
    meta: { authRequired: true, accountRequired: true }
  },
  {
    path: "/admin",
    component: AdminLayout,
    meta: { workspace: true, authRequired: true, adminOnly: true },
    children: [
      {
        path: "",
        redirect: { name: "admin-overview" }
      },
      {
        path: "overview",
        name: "admin-overview",
        component: AdminOverviewRoute
      },
      {
        path: "spaces",
        name: "admin-spaces",
        component: AdminSpacesRoute
      },
      {
        path: "members",
        name: "admin-members",
        component: AdminMembersRoute
      },
      {
        path: "content",
        name: "admin-content",
        component: AdminContentRoute
      },
      {
        path: "dashboard",
        name: "admin-dashboard",
        component: AdminDashboardRoute
      }
    ]
  },
  {
    path: "/admin/:pathMatch(.*)*",
    redirect: { name: "admin-overview" }
  }
];

export function createAtriumRouter(pinia) {
  const router = createRouter({
    history: createWebHistory(),
    routes
  });

  const appStore = useAtriumAppStore(pinia);
  appStore.attachRouter(router);

  router.beforeEach(async (to) => {
    appStore.attachRouter(router);

    if (to.meta.authPage) {
      await appStore.ensureAuthPageReady(to);
      await appStore.ensureSession();
      if (appStore.me) {
        return appStore.resolveHomePath();
      }
      return true;
    }

    if (to.meta.publicPage) {
      await appStore.ensurePublicRouteReady(to);
      return true;
    }

    if (to.meta.accountRequired) {
      await appStore.ensureSession();
      if (!hasResolvedRouteAccount(appStore)) {
        return {
          name: "login",
          query: { next: to.fullPath }
        };
      }
    } else if (to.meta.authRequired) {
      await appStore.ensureSession();
      if (!appStore.me && appStore.authEnabled) {
        return {
          name: "login",
          query: { next: to.fullPath }
        };
      }
    }

    if (to.meta.workspace) {
      await appStore.ensureWorkspaceReady(to);
      if (!appStore.me && appStore.authEnabled) {
        return {
          name: "login",
          query: { next: to.fullPath }
        };
      }
    }

    if (to.meta.adminOnly && !appStore.isAdmin) {
      return appStore.resolveHomePath();
    }

    return true;
  });

  // Document title — assistant routes используют один и тот же AssistantProductRoute,
  // поэтому компонент не пересоздаётся при переключении вкладок и сам title не выставит.
  // Делаем это здесь, в afterEach, чтобы вкладка браузера honestly отражала продукт.
  router.afterEach((to) => {
    if (typeof document === "undefined") return;
    const name = String(to.name || "");
    document.title = name === "assistant" || name.startsWith("assistant-")
      ? "Void Assistant"
      : "Atrium";
  });

  return router;
}
