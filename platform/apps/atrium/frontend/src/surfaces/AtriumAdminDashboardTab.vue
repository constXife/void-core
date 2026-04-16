<script setup>
defineProps({
  blocksForSpace: { type: Function, required: true },
  openDashboardEditor: { type: Function, required: true },
  spacesAdmin: { type: Array, required: true },
  t: { type: Function, required: true }
});
</script>

<template>
  <div class="admin-card">
    <h4 class="font-medium mb-4">{{ t("admin.dashboard.templates") }}</h4>
    <div v-if="spacesAdmin.length === 0" class="text-white/30 text-sm py-4">
      {{ t("app.noSpaces") }}
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="space in spacesAdmin"
        :key="space.id"
        class="admin-list-item"
      >
        <div>
          <div class="font-medium text-sm">{{ space.title }}</div>
          <div class="text-[11px] text-white/30">
            {{ t("admin.dashboard.blocksCount", { count: blocksForSpace(space.id).length }) }}
          </div>
        </div>
        <button
          class="btn btn-ghost text-xs"
          @click="openDashboardEditor(space)"
        >
          {{ t("admin.dashboard.editBlocks") }}
        </button>
      </div>
    </div>
  </div>
</template>
