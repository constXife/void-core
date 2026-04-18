<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import AtriumAdminDashboardTab from "../../surfaces/AtriumAdminDashboardTab.vue";
import { useAtriumAppStore } from "../../stores/atrium-app.js";
import { useAdminStore } from "../../stores/admin.js";

const appStore = useAtriumAppStore();
const adminStore = useAdminStore();

const { spacesAdmin } = storeToRefs(appStore);
const { fetchJSON, t } = appStore;
const provisioningDashboardDetails = ref({});
const provisioningDashboardLoading = ref(false);

const provisioningSpaceKeys = computed(() => [
  ...new Set(
    spacesAdmin.value
      .map((space) => String(space?.provisioning_space_id || space?.slug || "").trim())
      .filter(Boolean)
  )
]);

watch(
  provisioningSpaceKeys,
  async (spaceIDs) => {
    if (!spaceIDs.length) {
      provisioningDashboardDetails.value = {};
      provisioningDashboardLoading.value = false;
      return;
    }
    provisioningDashboardLoading.value = true;
    try {
      const entries = await Promise.all(
        spaceIDs.map(async (spaceID) => {
          try {
            const payload = await fetchJSON(
              `/atrium/provisioning/dashboard?space_id=${encodeURIComponent(spaceID)}`
            );
            return [spaceID, payload];
          } catch {
            return [spaceID, null];
          }
        })
      );
      provisioningDashboardDetails.value = Object.fromEntries(entries);
    } finally {
      provisioningDashboardLoading.value = false;
    }
  },
  { immediate: true }
);
</script>

<template>
  <AtriumAdminDashboardTab
    :blocks-for-space="appStore.blocksForSpace"
    :open-dashboard-editor="adminStore.openDashboardEditor"
    :provisioning-dashboard-details="provisioningDashboardDetails"
    :provisioning-dashboard-loading="provisioningDashboardLoading"
    :spaces-admin="spacesAdmin"
    :t="t"
  />
</template>
