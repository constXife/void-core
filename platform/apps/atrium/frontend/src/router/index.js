import { createRouter, createWebHistory } from "vue-router";
import AppLayout from "../layouts/AppLayout.vue";
import AdminLayout from "../layouts/AdminLayout.vue";
import AuthLayout from "../layouts/AuthLayout.vue";
import AtriumHomePage from "../pages/AtriumHomePage.vue";
import AtriumLoginRoute from "../pages/AtriumLoginRoute.vue";
import AtriumPrivacyRoute from "../pages/AtriumPrivacyRoute.vue";
import AdminContentRoute from "../pages/admin/AdminContentRoute.vue";
import AdminDashboardRoute from "../pages/admin/AdminDashboardRoute.vue";
import AdminMembersRoute from "../pages/admin/AdminMembersRoute.vue";
import AdminOverviewRoute from "../pages/admin/AdminOverviewRoute.vue";
import AdminSpacesRoute from "../pages/admin/AdminSpacesRoute.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";

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

    if (to.meta.authRequired) {
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

  return router;
}
