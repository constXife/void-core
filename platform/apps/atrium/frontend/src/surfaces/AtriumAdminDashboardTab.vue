<script setup>
const props = defineProps({
  blocksForSpace: { type: Function, required: true },
  openDashboardEditor: { type: Function, required: true },
  provisioningDashboardDetails: { type: Object, required: true },
  provisioningDashboardLoading: { type: Boolean, default: false },
  spacesAdmin: { type: Array, required: true },
  t: { type: Function, required: true }
});

const dashboardDetailForSpace = (space) => {
  const spaceKey = String(space?.provisioning_space_id || space?.slug || "").trim();
  if (!spaceKey) return null;
  return props.provisioningDashboardDetails?.[spaceKey] || null;
};
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
            {{
              t("admin.dashboard.blocksCount", {
                count:
                  dashboardDetailForSpace(space)?.blocks_count ?? blocksForSpace(space.id).length
              })
            }}
          </div>
          <div
            v-if="space.provisioning_dashboard_template"
            class="mt-1 text-[11px] text-white/45"
          >
            {{ t("admin.spaces.field.dashboardTemplate") }}:
            {{ space.provisioning_dashboard_template }}
          </div>
          <div
            v-if="dashboardDetailForSpace(space)?.template"
            class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/40"
          >
            <span>
              {{ t("admin.dashboard.templateVersion") }}:
              v{{ dashboardDetailForSpace(space).template.version }}
            </span>
            <span>
              {{ t("admin.dashboard.provisionedBlocksCount", {
                count: dashboardDetailForSpace(space).blocks_count
              }) }}
            </span>
            <span v-if="dashboardDetailForSpace(space).block_types?.length">
              {{ t("admin.dashboard.blockTypes") }}:
              {{ dashboardDetailForSpace(space).block_types.join(", ") }}
            </span>
            <span>
              {{ t("admin.dashboard.editorBlocksCount", { count: blocksForSpace(space.id).length }) }}
            </span>
          </div>
          <div
            v-else-if="provisioningDashboardLoading && space.provisioning_dashboard_template"
            class="mt-1 text-[11px] text-white/35"
          >
            {{ t("admin.dashboard.loadingProvisionedDashboard") }}
          </div>
          <div
            v-else-if="space.provisioning_dashboard_template"
            class="mt-1 text-[11px] text-white/35"
          >
            {{ t("admin.dashboard.noProvisionedDashboard") }}
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
