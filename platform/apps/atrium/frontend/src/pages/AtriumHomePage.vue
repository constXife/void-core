<script setup>
import { storeToRefs } from "pinia";
import AtriumEntryState from "../surfaces/AtriumEntryState.vue";
import AtriumPublicIntro from "../surfaces/AtriumPublicIntro.vue";
import AtriumStagePanel from "../surfaces/AtriumStagePanel.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { useAuthStore } from "../stores/auth.js";

const appStore = useAtriumAppStore();
const authStore = useAuthStore();

const {
  actualRole,
  effectiveRole,
  guestFocusSpace,
  loading,
  loginPageUrl,
  me,
  performanceMode,
  spaces,
  stageRef,
  updateIndex
} = storeToRefs(appStore);
const { t } = appStore;
</script>

<template>
  <div v-if="loading" class="spaces-loading">
    <div class="skeleton-shell">
      <div class="skeleton-header">
        <div class="skeleton-pill"></div>
        <div class="skeleton-lines">
          <span class="skeleton-line w-40"></span>
          <span class="skeleton-line w-24"></span>
        </div>
      </div>
      <div class="skeleton-grid">
        <div v-for="idx in 6" :key="`skeleton-${idx}`" class="skeleton-card"></div>
      </div>
    </div>
  </div>

  <AtriumEntryState
    v-else-if="!me && spaces.length === 0"
    mode="guest"
    :performance-mode="performanceMode"
    :login-page-url="loginPageUrl"
    :t="t"
  />

  <AtriumEntryState
    v-else-if="spaces.length === 0 && me"
    mode="no-access"
    :performance-mode="performanceMode"
    :effective-role="effectiveRole"
    :actual-role="actualRole"
    :t="t"
    @logout="authStore.logout"
  />

  <section
    v-else
    ref="stageRef"
    class="stage-scroll"
    :class="{ 'stage-scroll-low': performanceMode === 'low' }"
    @scroll.passive="updateIndex"
  >
    <AtriumPublicIntro
      v-if="!me"
      :title="appStore.spacePublicTitle(guestFocusSpace) || t('guest.title')"
      :description="appStore.spaceDescription(guestFocusSpace) || t('guest.publicShellSubtitle')"
      :help-text="appStore.spacePublicHelp(guestFocusSpace)"
      :trust-note="t('guest.trustNote')"
      :spaces-count="spaces.length"
      :login-page-url="loginPageUrl"
      :t="t"
    />

    <AtriumStagePanel
      v-for="(space, sidx) in spaces"
      :key="space.id"
      :sidx="sidx"
      :space="space"
    />
  </section>
</template>
