<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import AtriumSpaceDashboard from "../../surfaces/AtriumSpaceDashboard.vue";
import { useAtriumAppStore } from "../../stores/atrium-app.js";

const appStore = useAtriumAppStore();
const { currentSpace, spaces } = storeToRefs(appStore);
const { fetchJSON, isAdminSpace, spaceDescription, t } = appStore;

const adminSpace = computed(() => {
  const scoped = spaces.value.find((space) => isAdminSpace(space));
  if (scoped) return scoped;
  if (currentSpace.value && isAdminSpace(currentSpace.value)) return currentSpace.value;
  return spaces.value[0] || null;
});

const provisioningSummary = ref(null);
const provisioningSummaryError = ref("");
const provisioningSummaryLoading = ref(false);
const provisioningCatalog = ref(null);
const provisioningCatalogError = ref("");
const provisioningCatalogLoading = ref(false);

const provisioningCopy = computed(() => ({
  title: "Provisioning Read Path",
  subtitle:
    "Atrium admin is reading the generated provisioning artifact through the canonical runtime surface.",
  loading: t("app.loading"),
  fallbackError: "Failed to load the provisioning summary.",
  notConfigured: "Provisioning summary is not configured yet.",
  missing: "Provisioning load artifact is missing.",
  loadPath: "Load path",
  activeSpaces: "Active spaces",
  roles: "Roles",
  templates: "Templates",
  spaces: "Spaces",
  directoryItems: "Directory items",
  provisionedRoles: "Provisioned roles",
  provisionedTemplates: "Provisioned templates",
  provisionedSpaces: "Provisioned spaces",
  provisionedDirectoryItems: "Provisioned directory items",
  noCatalog: "Provisioning catalog is not available.",
  builtin: "builtin",
  custom: "custom",
  permissions: "permissions",
  template: "template",
  items: "items",
  audience: "audience",
  pinned: "pinned",
  unpinned: "unpinned",
  type: "type",
  serviceType: "service",
  space: "space",
  classification: "classification",
  accessPath: "access",
  visibility: "visibility",
  accessMode: "access mode",
  layout: "layout",
  parent: "parent",
  url: "url",
  background: "background",
  description: "description",
  defaultPublicEntry: "default public entry",
  lockable: "lockable",
  tags: "tags",
  tier: "tier",
  lifecycle: "lifecycle",
  runbook: "runbook",
  dependsOn: "depends on",
  enabled: "enabled",
  disabled: "disabled",
  none: "none"
}));

const provisioningStats = computed(() => {
  const summary = provisioningSummary.value?.summary;
  if (!summary) return [];
  return [
    { label: provisioningCopy.value.roles, value: summary.role_count ?? 0 },
    { label: provisioningCopy.value.templates, value: summary.template_count ?? 0 },
    { label: provisioningCopy.value.spaces, value: summary.space_count ?? 0 },
    { label: provisioningCopy.value.directoryItems, value: summary.directory_item_count ?? 0 }
  ];
});

const activeSpaceIDs = computed(() => provisioningSummary.value?.summary?.active_space_ids || []);
const provisioningSummaryPath = computed(() => provisioningSummary.value?.path || "");
const catalogRoles = computed(() => provisioningCatalog.value?.catalog?.roles || []);
const catalogTemplates = computed(() => provisioningCatalog.value?.catalog?.templates || []);
const catalogSpaces = computed(() => provisioningCatalog.value?.catalog?.spaces || []);
const catalogDirectoryItems = computed(() => provisioningCatalog.value?.catalog?.directory_items || []);

const listOrNone = (items) => (Array.isArray(items) && items.length > 0 ? items.join(", ") : provisioningCopy.value.none);
const textOrNone = (value) => (String(value || "").trim() ? String(value).trim() : provisioningCopy.value.none);
const boolLabel = (value) => (value ? provisioningCopy.value.enabled : provisioningCopy.value.disabled);

const loadProvisioningSummary = async () => {
  provisioningSummaryLoading.value = true;
  provisioningSummaryError.value = "";
  try {
    provisioningSummary.value = await fetchJSON("/atrium/provisioning/summary");
  } catch (error) {
    provisioningSummary.value = null;
    provisioningSummaryError.value = String(error?.message || provisioningCopy.value.fallbackError);
  } finally {
    provisioningSummaryLoading.value = false;
  }
};

const loadProvisioningCatalog = async () => {
  provisioningCatalogLoading.value = true;
  provisioningCatalogError.value = "";
  try {
    provisioningCatalog.value = await fetchJSON("/atrium/provisioning/catalog");
  } catch (error) {
    provisioningCatalog.value = null;
    provisioningCatalogError.value = String(error?.message || provisioningCopy.value.noCatalog);
  } finally {
    provisioningCatalogLoading.value = false;
  }
};

watch(
  () => adminSpace.value?.id || "",
  (spaceID) => {
    if (!spaceID) {
      provisioningSummary.value = null;
      provisioningSummaryError.value = "";
      provisioningSummaryLoading.value = false;
      provisioningCatalog.value = null;
      provisioningCatalogError.value = "";
      provisioningCatalogLoading.value = false;
      return;
    }
    void loadProvisioningSummary();
    void loadProvisioningCatalog();
  },
  { immediate: true }
);
</script>

<template>
  <section v-if="adminSpace" class="space-y-4">
    <div class="admin-card">
      <div class="section-title">{{ t("app.adminPanel") }}</div>
      <div class="core-card-title">{{ adminSpace.title }}</div>
      <p class="text-sm text-white/50 mt-2">
        {{ spaceDescription(adminSpace) || t("admin.subtitle.overview") }}
      </p>
    </div>

    <div class="admin-card">
      <div class="section-title">{{ provisioningCopy.title }}</div>
      <div class="core-card-title">{{ provisioningSummaryPath || "/etc/atrium/client-root" }}</div>
      <p class="text-sm text-white/50 mt-2">
        {{ provisioningCopy.subtitle }}
      </p>

      <div v-if="provisioningSummaryLoading" class="text-sm text-white/50 mt-4">
        {{ provisioningCopy.loading }}
      </div>

      <div v-else-if="provisioningSummaryError" class="text-sm text-rose-300 mt-4">
        {{ provisioningSummaryError }}
      </div>

      <template v-else-if="provisioningSummary">
        <div
          v-if="provisioningSummary.configured && provisioningSummary.exists"
          class="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-4"
        >
          <div
            v-for="stat in provisioningStats"
            :key="stat.label"
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div class="text-[11px] uppercase tracking-wider text-white/50">{{ stat.label }}</div>
            <div class="mt-2 text-2xl font-semibold text-white">{{ stat.value }}</div>
          </div>
        </div>

        <div class="mt-4 space-y-2 text-sm text-white/70">
          <p>
            <span class="text-white/50">{{ provisioningCopy.loadPath }}:</span>
            {{ provisioningSummaryPath || "/etc/atrium/client-root" }}
          </p>
          <p v-if="activeSpaceIDs.length > 0">
            <span class="text-white/50">{{ provisioningCopy.activeSpaces }}:</span>
            {{ activeSpaceIDs.join(", ") }}
          </p>
          <p v-else-if="!provisioningSummary.configured" class="text-white/50">
            {{ provisioningCopy.notConfigured }}
          </p>
          <p v-else-if="!provisioningSummary.exists" class="text-white/50">
            {{ provisioningCopy.missing }}
          </p>
        </div>
      </template>
    </div>

    <div class="grid gap-4 xl:grid-cols-2">
      <div class="admin-card">
        <div class="section-title">{{ provisioningCopy.provisionedRoles }}</div>
        <div v-if="provisioningCatalogLoading" class="text-sm text-white/50 mt-3">
          {{ provisioningCopy.loading }}
        </div>
        <div v-else-if="provisioningCatalogError" class="text-sm text-rose-300 mt-3">
          {{ provisioningCatalogError }}
        </div>
        <div v-else-if="catalogRoles.length === 0" class="text-sm text-white/50 mt-3">
          {{ provisioningCopy.noCatalog }}
        </div>
        <div v-else class="mt-3 space-y-3">
          <div
            v-for="role in catalogRoles"
            :key="role.key"
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="font-medium text-white">{{ role.name || role.key }}</div>
              <div class="text-[11px] uppercase tracking-wider text-white/50">
                {{ role.is_builtin ? provisioningCopy.builtin : provisioningCopy.custom }}
              </div>
            </div>
            <div class="mt-1 text-xs text-white/60">{{ role.key }}</div>
            <div class="mt-2 text-sm text-white/70">
              {{ role.permissions_count }} {{ provisioningCopy.permissions }}
            </div>
            <div v-if="role.permissions?.length" class="mt-1 text-xs text-white/60">
              {{ role.permissions.join(", ") }}
            </div>
          </div>
        </div>
      </div>

      <div class="admin-card">
        <div class="section-title">{{ provisioningCopy.provisionedTemplates }}</div>
        <div v-if="provisioningCatalogLoading" class="text-sm text-white/50 mt-3">
          {{ provisioningCopy.loading }}
        </div>
        <div v-else-if="provisioningCatalogError" class="text-sm text-rose-300 mt-3">
          {{ provisioningCatalogError }}
        </div>
        <div v-else-if="catalogTemplates.length === 0" class="text-sm text-white/50 mt-3">
          {{ provisioningCopy.noCatalog }}
        </div>
        <div v-else class="mt-3 space-y-3">
          <div
            v-for="template in catalogTemplates"
            :key="template.key"
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div class="font-medium text-white">{{ template.key }}</div>
            <div class="mt-2 text-sm text-white/70">
              v{{ template.version }}
            </div>
          </div>
        </div>
      </div>

      <div class="admin-card">
        <div class="section-title">{{ provisioningCopy.provisionedSpaces }}</div>
        <div v-if="provisioningCatalogLoading" class="text-sm text-white/50 mt-3">
          {{ provisioningCopy.loading }}
        </div>
        <div v-else-if="provisioningCatalogError" class="text-sm text-rose-300 mt-3">
          {{ provisioningCatalogError }}
        </div>
        <div v-else-if="catalogSpaces.length === 0" class="text-sm text-white/50 mt-3">
          {{ provisioningCopy.noCatalog }}
        </div>
        <div v-else class="mt-3 space-y-3">
          <div
            v-for="space in catalogSpaces"
            :key="space.id"
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="font-medium text-white">{{ space.title || space.id }}</div>
              <div class="text-[11px] uppercase tracking-wider text-white/50">
                {{ space.state || "unknown" }}
              </div>
            </div>
            <div class="mt-1 text-xs text-white/60">{{ space.id }}</div>
            <div v-if="space.description" class="mt-2 text-sm text-white/70">
              {{ space.description }}
            </div>
            <div class="mt-2 text-sm text-white/70">
              {{ provisioningCopy.template }}: {{ space.dashboard_template || "none" }}
            </div>
            <div class="mt-1 text-sm text-white/70">
              {{ space.directory_item_count }} {{ provisioningCopy.items }}
            </div>
            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
              <span>{{ provisioningCopy.accessMode }}: {{ textOrNone(space.access_mode) }}</span>
              <span>{{ provisioningCopy.layout }}: {{ textOrNone(space.layout_mode) }}</span>
              <span>{{ provisioningCopy.visibility }}: {{ listOrNone(space.visibility_groups) }}</span>
              <span>{{ provisioningCopy.parent }}: {{ textOrNone(space.parent) }}</span>
            </div>
            <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
              <span>{{ provisioningCopy.defaultPublicEntry }}: {{ boolLabel(space.is_default_public_entry) }}</span>
              <span>{{ provisioningCopy.lockable }}: {{ boolLabel(space.is_lockable) }}</span>
              <span>{{ provisioningCopy.url }}: {{ textOrNone(space.url) }}</span>
              <span>{{ provisioningCopy.background }}: {{ textOrNone(space.background_url) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="admin-card">
      <div class="section-title">{{ provisioningCopy.provisionedDirectoryItems }}</div>
      <div v-if="provisioningCatalogLoading" class="text-sm text-white/50 mt-3">
        {{ provisioningCopy.loading }}
      </div>
      <div v-else-if="provisioningCatalogError" class="text-sm text-rose-300 mt-3">
        {{ provisioningCatalogError }}
      </div>
      <div v-else-if="catalogDirectoryItems.length === 0" class="text-sm text-white/50 mt-3">
        {{ provisioningCopy.noCatalog }}
      </div>
      <div v-else class="mt-3 space-y-3">
        <div
          v-for="item in catalogDirectoryItems"
          :key="`${item.space}:${item.key}`"
          class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="font-medium text-white">{{ item.title || item.key }}</div>
            <div class="text-[11px] uppercase tracking-wider text-white/50">
              {{ item.pinned ? provisioningCopy.pinned : provisioningCopy.unpinned }}
            </div>
          </div>
          <div class="mt-1 text-xs text-white/60">{{ item.key }}</div>
          <div v-if="item.description" class="mt-2 text-sm text-white/70">
            {{ item.description }}
          </div>
          <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70">
            <span>{{ provisioningCopy.space }}: {{ item.space || provisioningCopy.none }}</span>
            <span>{{ provisioningCopy.type }}: {{ item.item_type || provisioningCopy.none }}</span>
            <span>{{ provisioningCopy.serviceType }}: {{ item.service_type || provisioningCopy.none }}</span>
            <span>{{ provisioningCopy.accessPath }}: {{ item.access_path || provisioningCopy.none }}</span>
          </div>
          <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
            <span>{{ provisioningCopy.classification }}: {{ item.classification || provisioningCopy.none }}</span>
            <span>
              {{ provisioningCopy.audience }}:
              {{ item.audience_groups?.length ? item.audience_groups.join(", ") : provisioningCopy.none }}
            </span>
            <span>{{ provisioningCopy.tags }}: {{ listOrNone(item.tags) }}</span>
            <span>{{ provisioningCopy.tier }}: {{ textOrNone(item.tier) }}</span>
            <span>{{ provisioningCopy.lifecycle }}: {{ textOrNone(item.lifecycle) }}</span>
            <span>{{ provisioningCopy.url }}: {{ textOrNone(item.url) }}</span>
            <span>{{ provisioningCopy.runbook }}: {{ textOrNone(item.runbook_url) }}</span>
            <span>{{ provisioningCopy.dependsOn }}: {{ listOrNone(item.depends_on) }}</span>
          </div>
        </div>
      </div>
    </div>

    <AtriumSpaceDashboard :space="adminSpace" />
  </section>

  <div v-else class="admin-card">
    <div class="core-card-title">{{ t("app.noSpaces") }}</div>
    <p class="text-sm text-white/50 mt-2">
      {{ t("admin.subtitle.overview") }}
    </p>
  </div>
</template>
