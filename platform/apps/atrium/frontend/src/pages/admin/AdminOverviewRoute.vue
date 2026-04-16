<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import AtriumSpaceDashboard from "../../surfaces/AtriumSpaceDashboard.vue";
import { useAtriumAppStore } from "../../stores/atrium-app.js";

const appStore = useAtriumAppStore();
const { currentSpace, spaces } = storeToRefs(appStore);
const { isAdminSpace, spaceDescription, t } = appStore;

const adminSpace = computed(() => {
  const scoped = spaces.value.find((space) => isAdminSpace(space));
  if (scoped) return scoped;
  if (currentSpace.value && isAdminSpace(currentSpace.value)) return currentSpace.value;
  return spaces.value[0] || null;
});
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

    <AtriumSpaceDashboard :space="adminSpace" />
  </section>

  <div v-else class="admin-card">
    <div class="core-card-title">{{ t("app.noSpaces") }}</div>
    <p class="text-sm text-white/50 mt-2">
      {{ t("admin.subtitle.overview") }}
    </p>
  </div>
</template>
