import { computed, ref } from "vue";

export function useAtriumRoleOverride({
  loadAll,
  me,
  navigateHome,
  provisioningRoles,
  roles,
  settingsStore,
  showAdmin,
  onOverrideApplied
}) {
  const roleOverrideKey = "atrium:role-override";
  const roleOverride = ref("");
  const roleOverrideReady = ref(false);

  const actualRole = computed(() => me.value?.role || "");
  const actualIsAdmin = computed(() => actualRole.value === "admin");
  const effectiveRole = computed(() => roleOverride.value || actualRole.value || "");
  const isAdmin = computed(() => effectiveRole.value === "admin");
  const roleOverrideActive = computed(() =>
    actualIsAdmin.value &&
    !!roleOverride.value &&
    roleOverride.value !== actualRole.value &&
      roleOverride.value !== "admin"
  );

  const parsePermissions = (value) => {
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry || "").trim()).filter(Boolean);
    }
    if (typeof value !== "string" || !value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map((entry) => String(entry || "").trim()).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  };

  const effectivePermissions = computed(() => {
    if (!me.value) return [];
    const roleKey = effectiveRole.value;
    const fromProvisioningRole = Array.isArray(provisioningRoles?.value)
      ? provisioningRoles.value.find((role) => role.key === roleKey)?.permissions
      : null;
    const fromLegacyRole = Array.isArray(roles.value)
      ? roles.value.find((role) => role.key === roleKey)?.permissions
      : null;
    const normalizedProvisioning = parsePermissions(fromProvisioningRole);
    if (normalizedProvisioning.length > 0) return normalizedProvisioning;
    const normalizedLegacy = parsePermissions(fromLegacyRole);
    if (normalizedLegacy.length > 0) return normalizedLegacy;
    if (roleOverrideActive.value) {
      return roleKey === "admin" ? ["view", "manage"] : ["view"];
    }
    const perms = Array.isArray(me.value.permissions) ? me.value.permissions : [];
    if (perms.length > 0) return perms;
    return roleKey === "admin" ? ["view", "manage"] : ["view"];
  });

  const canManage = computed(() => {
    if (!me.value) return false;
    return effectivePermissions.value.includes("manage") || effectiveRole.value === "admin";
  });

  const syncRoleOverride = () => {
    if (roleOverrideReady.value) return;
    if (!actualIsAdmin.value) {
      roleOverride.value = "";
      settingsStore.setJSON(roleOverrideKey, "");
      roleOverrideReady.value = true;
      return;
    }
    const stored = settingsStore.getJSON(roleOverrideKey, "");
    const normalized = typeof stored === "string" ? stored.trim() : "";
    if (!normalized || normalized === actualRole.value || normalized === "admin") {
      roleOverride.value = "";
    } else {
      roleOverride.value = normalized;
    }
    if (roleOverride.value && window.location.pathname.startsWith("/admin")) {
      navigateHome();
    }
    roleOverrideReady.value = true;
  };

  const applyRoleOverride = async (nextRole) => {
    const normalized = String(nextRole || "").trim();
    const next =
      actualIsAdmin.value &&
      normalized &&
      normalized !== actualRole.value &&
      normalized !== "admin"
        ? normalized
        : "";
    if (roleOverride.value === next) return;
    roleOverride.value = next;
    settingsStore.setJSON(roleOverrideKey, next);
    onOverrideApplied();
    if (showAdmin.value && !isAdmin.value) {
      navigateHome();
    }
    await loadAll();
  };

  const roleOptions = computed(() => {
    const defaults = ["guest", "user", "admin"];
    const provisioningRoleKeys = Array.isArray(provisioningRoles?.value)
      ? provisioningRoles.value.map((role) => role.key).filter(Boolean)
      : [];
    const legacyRoleKeys = Array.isArray(roles.value)
      ? roles.value.map((role) => role.key).filter(Boolean)
      : [];
    const roleKeys = [...provisioningRoleKeys, ...legacyRoleKeys];
    const next = [...new Set([...roleKeys, ...defaults])];
    return next.sort((a, b) => a.localeCompare(b));
  });

  const roleOverrideSelection = computed({
    get() {
      return roleOverride.value || actualRole.value || "guest";
    },
    set(value) {
      void applyRoleOverride(value);
    }
  });

  const withRoleOverride = (path) => {
    if (!roleOverrideActive.value) return path;
    const url = new URL(path, window.location.origin);
    if (!url.searchParams.has("audience")) {
      url.searchParams.set("audience", roleOverride.value);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  };

  return {
    actualIsAdmin,
    actualRole,
    applyRoleOverride,
    canManage,
    effectivePermissions,
    effectiveRole,
    isAdmin,
    roleOptions,
    roleOverride,
    roleOverrideActive,
    roleOverrideReady,
    roleOverrideSelection,
    syncRoleOverride,
    withRoleOverride
  };
}
