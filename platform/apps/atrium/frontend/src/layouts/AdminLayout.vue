<script setup>
import { RouterView } from "vue-router";
import { storeToRefs } from "pinia";
import TheHeader from "../components/TheHeader.vue";
import TheShellBackdrop from "../components/TheShellBackdrop.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { useUiStore } from "../stores/ui.js";
import AtriumDashboardOverlays from "../surfaces/AtriumDashboardOverlays.vue";
import AtriumAdminShell from "../surfaces/AtriumAdminShell.vue";

const appStore = useAtriumAppStore();
const uiStore = useUiStore();

const {
  adminSubtitle,
  adminTab,
  adminTitle,
  spacesAdmin
} = storeToRefs(appStore);
const { t } = appStore;
const { error, isKioskMode } = storeToRefs(uiStore);
</script>

<template>
  <main class="spaces-root" :class="{ 'no-ui-blur': uiStore.backgroundBlurDisabled }">
    <TheShellBackdrop />
    <TheHeader v-if="!isKioskMode" />

    <div v-if="error" class="banner banner-error spaces-banner">
      <span>{{ error }}</span>
    </div>

    <AtriumAdminShell
      :admin-tab="adminTab"
      :spaces-count="spacesAdmin.length"
      :title="adminTitle"
      :subtitle="adminSubtitle"
      :t="t"
      @back="appStore.navigateHome"
      @navigate-tab="appStore.navigateToAdmin"
    >
      <RouterView />
    </AtriumAdminShell>

    <AtriumDashboardOverlays />
  </main>
</template>
