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

const provisioningCopy = computed(() => ({
    title: "Provisioning Read Path",
    subtitle:
      "Atrium admin is reading the generated provisioning artifact through the Rust runtime surface.",
    loading: t("app.loading"),
    fallbackError: "Failed to load the provisioning summary.",
    notConfigured: "Provisioning summary is not configured yet.",
    missing: "Provisioning load artifact is missing.",
    loadPath: "Load path",
    activeSpaces: "Active spaces",
    roles: "Roles",
    templates: "Templates",
    spaces: "Spaces",
    directoryItems: "Directory items"
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

const loadProvisioningSummary = async () => {
  provisioningSummaryLoading.value = true;
  provisioningSummaryError.value = "";
  try {
    provisioningSummary.value = await fetchJSON("/api/provisioning/summary");
  } catch (error) {
    provisioningSummary.value = null;
    provisioningSummaryError.value = String(error?.message || provisioningCopy.value.fallbackError);
  } finally {
    provisioningSummaryLoading.value = false;
  }
};

watch(
  () => adminSpace.value?.id || "",
  (spaceID) => {
    if (!spaceID) {
      provisioningSummary.value = null;
      provisioningSummaryError.value = "";
      provisioningSummaryLoading.value = false;
      return;
    }
    void loadProvisioningSummary();
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
      <div class="core-card-title">{{ provisioningSummaryPath || "/etc/atrium/provisioning-load.yaml" }}</div>
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
            {{ provisioningSummaryPath || "/etc/atrium/provisioning-load.yaml" }}
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

    <AtriumSpaceDashboard :space="adminSpace" />
  </section>

  <div v-else class="admin-card">
    <div class="core-card-title">{{ t("app.noSpaces") }}</div>
    <p class="text-sm text-white/50 mt-2">
      {{ t("admin.subtitle.overview") }}
    </p>
  </div>
</template>
