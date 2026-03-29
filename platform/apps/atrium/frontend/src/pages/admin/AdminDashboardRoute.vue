<script setup>
import { storeToRefs } from "pinia";
import AtriumAdminDashboardTab from "../../surfaces/AtriumAdminDashboardTab.vue";
import { useAtriumAppStore } from "../../stores/atrium-app.js";
import { useAdminStore } from "../../stores/admin.js";

const appStore = useAtriumAppStore();
const adminStore = useAdminStore();

const { spacesAdmin } = storeToRefs(appStore);
const { t } = appStore;
</script>

<template>
  <AtriumAdminDashboardTab
    :blocks-for-space="appStore.blocksForSpace"
    :open-dashboard-editor="adminStore.openDashboardEditor"
    :spaces-admin="spacesAdmin"
    :t="t"
  />
</template>
