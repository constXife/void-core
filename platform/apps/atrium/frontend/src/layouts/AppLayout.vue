<script setup>
import { RouterView } from "vue-router";
import { storeToRefs } from "pinia";
import SpacePicker from "../components/SpacePicker.vue";
import TheHeader from "../components/TheHeader.vue";
import TheShellBackdrop from "../components/TheShellBackdrop.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { useUiStore } from "../stores/ui.js";
import AtriumDashboardOverlays from "../surfaces/AtriumDashboardOverlays.vue";
import AtriumTrustFooter from "../surfaces/AtriumTrustFooter.vue";

const appStore = useAtriumAppStore();
const uiStore = useUiStore();

const { error, isKioskMode, loading } = storeToRefs(uiStore);
const { navigateToPrivacy, t } = appStore;
</script>

<template>
  <main class="spaces-root" :class="{ 'no-ui-blur': uiStore.backgroundBlurDisabled }">
    <TheShellBackdrop />
    <TheHeader v-if="!isKioskMode" />
    <SpacePicker />

    <div v-if="error" class="banner banner-error spaces-banner">
      <span>{{ error }}</span>
    </div>

    <RouterView />

    <AtriumTrustFooter
      v-if="!isKioskMode && !loading"
      :t="t"
      @privacy="navigateToPrivacy"
    />

    <AtriumDashboardOverlays />
  </main>
</template>
