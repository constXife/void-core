<script setup>
import { storeToRefs } from "pinia";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { useToastStore } from "../stores/toast.js";
import AtriumHeroToast from "../surfaces/AtriumHeroToast.vue";

const appStore = useAtriumAppStore();
const toastStore = useToastStore();

const { tooltipDelay, tooltipsDisabled } = storeToRefs(appStore);
const { t } = appStore;
const { activeHeroToast, currentBanner, heroToastProgress } = storeToRefs(toastStore);
</script>

<template>
  <div
    v-if="currentBanner?.message"
    class="banner spaces-banner"
    :class="{
      'banner-success': currentBanner.type === 'success',
      'banner-error': currentBanner.type === 'error',
      'banner-info': currentBanner.type === 'info' || !currentBanner.type
    }"
  >
    <span>{{ currentBanner.message }}</span>
  </div>

  <AtriumHeroToast
    :toast="activeHeroToast"
    :progress="heroToastProgress"
    :t="t"
    :tooltips-disabled="tooltipsDisabled"
    :tooltip-delay="tooltipDelay"
    @dismiss="toastStore.dismissHeroToast"
  />
</template>
