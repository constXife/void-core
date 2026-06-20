import { createRouter, createWebHistory } from "vue-router";
import AppLayout from "../layouts/AppLayout.vue";
import AdminLayout from "../layouts/AdminLayout.vue";
import AuthLayout from "../layouts/AuthLayout.vue";
import AtriumHomePage from "../pages/AtriumHomePage.vue";
import AtriumAccountRoute from "../pages/AtriumAccountRoute.vue";
import AtriumActivityRoute from "../pages/AtriumActivityRoute.vue";
import AssistantProductRoute from "../pages/AssistantProductRoute.vue";
import AssistantRunReportRoute from "../pages/AssistantRunReportRoute.vue";
import AssistantRunsRoute from "../pages/AssistantRunsRoute.vue";
import BreakGlassRoute from "../pages/BreakGlassRoute.vue";
import AtriumAdminInterstitialRoute from "../pages/AtriumAdminInterstitialRoute.vue";
import ArtifactPage from "../surfaces/artifact/ArtifactPage.vue";
import CustomSurfacePage from "../surfaces/custom/CustomSurfacePage.vue";
import AtriumLoginRoute from "../pages/AtriumLoginRoute.vue";
import AtriumPrivacyRoute from "../pages/AtriumPrivacyRoute.vue";
import AdminContentRoute from "../pages/admin/AdminContentRoute.vue";
import AdminDashboardRoute from "../pages/admin/AdminDashboardRoute.vue";
import AdminMembersRoute from "../pages/admin/AdminMembersRoute.vue";
import AdminOverviewRoute from "../pages/admin/AdminOverviewRoute.vue";
import AdminSpacesRoute from "../pages/admin/AdminSpacesRoute.vue";
import { hasResolvedPlatformAccount } from "../platform/account.js";
import { fetchAdminGateStatus } from "../lib/admin-gate.js";
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
          path: "/memory",
          name: "assistant-memory",
          component: AssistantProductRoute,
          meta: assistantAccountMeta
        },
        {
          path: "/devices",
          name: "assistant-devices",
          component: AssistantProductRoute,
          meta: assistantAccountMeta
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
        },
        {
          // Artifact list — renders внутри AssistantStandaloneSurface как panel,
          // активный tab "Артефакты". Detail view (/artifacts/:id) остаётся top-level
          // standalone — это fullscreen newspaper, ему нужен canvas без shell chrome.
          path: "/artifacts",
          name: "artifact-list",
          component: AssistantProductRoute,
          meta: assistantAccountMeta
        },
        {
          // Pages list — renders внутри AssistantStandaloneSurface как panel, активный
          // tab «Страницы». Render отдельной страницы (/surfaces/:pageKind) остаётся
          // top-level (custom-surface-render).
          path: "/pages",
          name: "custom-surface-pages",
          component: AssistantProductRoute,
          meta: assistantAccountMeta
        },
        {
          // Break-glass shell.rw (слайс 3). Отдельный standalone-экран (не таб чата) —
          // визуально отделён, admin-only (gate на backend), требует свежий OIDC step-up.
          path: "/breakglass",
          name: "assistant-breakglass",
          component: BreakGlassRoute,
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
        },
        {
          // Account-хаб (ADR-0032 §5a / ADR-0033 §7): «Устройства» + «Сессии» на
          // atrium-поверхности. Только non-assistant host; assistant держит свой таб.
          path: "/account",
          component: AppLayout,
          meta: { workspace: true, authRequired: true, accountRequired: true },
          children: [
            {
              path: "",
              name: "account",
              component: AtriumAccountRoute
            }
          ]
        },
        {
          // Апрувы (ADR-0034) консолидированы во вкладку account-хаба. Имя сохранено для
          // существующих ссылок (notification center, deep-link) — редиректим в хаб.
          path: "/approvals",
          name: "approvals",
          redirect: { name: "account", query: { tab: "approvals" } }
        },
        {
          // Страница активности (лента обновлений): полный архив user-событий с фильтрами.
          // Колокол в хедере уводит сюда ссылкой «Вся активность». Фильтр — в URL (?type=).
          path: "/activity",
          component: AppLayout,
          meta: { workspace: true, authRequired: true, accountRequired: true },
          children: [
            {
              path: "",
              name: "activity",
              component: AtriumActivityRoute
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
  ...(!assistantHost
    ? [
        {
          path: "/assistant/memory",
          name: "assistant-memory",
          component: AssistantProductRoute,
          meta: assistantAccountMeta
        }
      ]
    : []),
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
    // Generic fullscreen artifact view. Entry-point — ArtifactLinkBlock card в чате,
    // schema dispatch внутри ArtifactPage. URL stable: можно share, открыть позже.
    // Доступен на обоих hosts (assistant.* и main) — это generic primitive, не product-specific.
    path: "/artifacts/:artifactId",
    name: "artifact-detail",
    component: ArtifactPage,
    meta: { authRequired: true, accountRequired: true }
  },
  {
    // Generic render сохранённого custom surface PageSpec по pageKind. Standalone (не AppLayout):
    // собственный scroll container + dark canvas, symmetric с ArtifactPage. Потребляет inventory
    // dashboard-data → доступен на atrium host (там AppState same-origin). ?slice= выбирает срез.
    path: "/surfaces/:pageKind",
    name: "custom-surface-render",
    component: CustomSurfacePage,
    meta: { authRequired: true, accountRequired: true }
  },
  {
    // Interstitial admin authorization-gate (ADR-0034 slice b): admin-by-role без активного
    // elevation-окна попадает сюда; после свежего OIDC step-up → обратно на исходный admin-роут.
    // НЕ под AdminLayout (страница для admin'а, который ещё не поднят); `adminElevateInterstitial`
    // гасит elevation-redirect для самой этой страницы — иначе цикл. Определён до catch-all
    // `/admin/:pathMatch` (статический сегмент ранжируется выше параметрического).
    path: "/admin/elevate",
    component: AppLayout,
    meta: {
      workspace: true,
      authRequired: true,
      accountRequired: true,
      adminOnly: true,
      adminElevateInterstitial: true
    },
    children: [
      {
        path: "",
        name: "admin-elevate",
        component: AtriumAdminInterstitialRoute
      }
    ]
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

    if (to.meta.adminOnly) {
      if (!appStore.isAdmin) {
        return appStore.resolveHomePath();
      }
      // Вход в админку (кроме самого interstitial) требует активного elevation-окна
      // (ADR-0034 slice b, device_factor) — admin-роль необходима, но недостаточна.
      // Нет окна → interstitial: подтверждение на enrolled-устройстве (companion Face ID).
      if (!to.meta.adminElevateInterstitial) {
        const elevated = await fetchAdminGateStatus();
        if (!elevated) {
          return { name: "admin-elevate", query: { next: to.fullPath } };
        }
      }
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
