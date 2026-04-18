<script setup>
import { ChevronDown, X } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import Tooltip from "../components/Tooltip.vue";
import { resolveBlockInspectHref } from "../lib/dashboard-inspect.js";
import { useAtriumAppStore } from "../stores/atrium-app.js";

const props = defineProps([
  "space",
]);

const appStore = useAtriumAppStore();
const {
  canManage,
  dashboardDragGhost,
  dashboardDragging,
  dashboardEditAdvanced,
  dashboardEditDirty,
  dashboardEditForm,
  dashboardEditPanelStyle,
  dashboardEditSelectedId,
  dashboardEditorSaving,
  dashboardLoading,
  isMobile,
  resourcePopoverItem,
  resourcePopoverOpen,
  resourcePopoverPlacement,
  resourcePopoverViewer,
  tooltipDelay,
  tooltipsDisabled
} = storeToRefs(appStore);

const {
  actionLabel,
  applyDashboardEditForm,
  blockDataFor,
  blockOrderMapForSpace,
  blockStyle,
  blockTitle,
  blockTypeIs,
  blockTypeLabel,
  blockTypeOptions,
  blockTypes,
  blocksForSpace,
  canEditDashboardSpace,
  canOpenResourceDetails,
  clearDashboardEditSelection,
  closeResourcePopover,
  copyText,
  deleteDashboardBlockDraft,
  enableV0Editor,
  enableV0ResourceDetails,
  formatEndpointLine,
  invokeServiceAction,
  isDashboardEditing,
  isPublicReadonlySpace,
  normalizeActionKeys,
  normalizeLinks,
  openAddBlockPicker,
  rememberResourceVisit,
  resourceInitial,
  normalizeIconUrl: resolveIconUrl,
  s3EndpointsFor,
  saveDashboardLayout,
  serviceStatusLabel,
  setDashboardEditSelection,
  stopDashboardEdit,
  t,
  toggleDashboardEditAdvanced,
  toggleResourcePopover
} = appStore;

const blockInspectHref = (block) => resolveBlockInspectHref(block);
const summaryFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const blockPayloadFor = (block) => {
  const payload = blockDataFor(props.space.id, block.id);
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
};

const calendarSummaryFor = (block) => blockPayloadFor(block)?.summary || null;
const calendarItemsFor = (block) =>
  Array.isArray(blockPayloadFor(block)?.items) ? blockPayloadFor(block).items : [];
const inventorySummaryFor = (block) => blockPayloadFor(block)?.summary || null;
const inventoryAttentionItemsFor = (block) => {
  const items = inventorySummaryFor(block)?.attention?.items;
  return Array.isArray(items) ? items : [];
};
const inventoryBucketCountsFor = (block) => {
  const items = inventorySummaryFor(block)?.bucket_counts;
  return Array.isArray(items) ? items : [];
};
const formatSummaryDateTime = (value) => {
  if (!value) return "";
  try {
    return summaryFormatter.format(new Date(value));
  } catch {
    return String(value);
  }
};
const calendarItemMeta = (item) =>
  [
    formatSummaryDateTime(item?.scheduled_at),
    item?.status ? String(item.status) : "",
    item?.location_text ? String(item.location_text) : "",
    item?.channel ? String(item.channel) : ""
  ]
    .filter(Boolean)
    .join(" • ");
const inventoryAttentionMeta = (item) =>
  [item?.status ? String(item.status) : "", item?.storage_zone ? String(item.storage_zone) : ""]
    .filter(Boolean)
    .join(" • ");
</script>

<template>
  <div class="col-span-full">
    <div class="dashboard-header">
      <div class="flex items-center gap-2">
        <span v-if="dashboardLoading[props.space.id]" class="chip chip-muted">{{ t("app.loading") }}</span>
        <button
          v-if="enableV0Editor && canManage && !isMobile && isDashboardEditing(props.space) && !isPublicReadonlySpace(props.space) && canEditDashboardSpace(props.space)"
          class="btn"
          :class="dashboardEditDirty ? 'btn-primary' : 'btn-ghost'"
          :disabled="dashboardEditorSaving || !dashboardEditDirty"
          @click="saveDashboardLayout(props.space)"
        >
          {{ dashboardEditorSaving ? `${t("app.save")}...` : t("app.save") }}
        </button>
        <button
          v-if="enableV0Editor && canManage && !isMobile && isDashboardEditing(props.space) && !isPublicReadonlySpace(props.space) && canEditDashboardSpace(props.space)"
          class="btn btn-ghost"
          @click="openAddBlockPicker"
        >
          {{ t("app.addBlock") }}
        </button>
        <button
          v-if="enableV0Editor && canManage && !isMobile && isDashboardEditing(props.space) && !isPublicReadonlySpace(props.space) && canEditDashboardSpace(props.space)"
          class="btn btn-ghost"
          @click="stopDashboardEdit"
        >
          {{ t("app.exit") }}
        </button>
      </div>
    </div>
    <div class="dashboard-layout" :class="{ 'dashboard-layout-editing': isDashboardEditing(props.space) }">
      <div class="dashboard-main">
        <div
          class="dashboard-grid"
          :class="{
            'dashboard-grid-mobile': isMobile,
            'dashboard-grid-editing': isDashboardEditing(props.space),
            'dashboard-grid-dragging': isDashboardEditing(props.space) && dashboardDragging
          }"
          :data-dashboard-grid="props.space.id"
        >
          <div
            v-if="dashboardDragGhost && dashboardDragGhost.spaceId === props.space.id"
            class="dashboard-drop-ghost"
            :style="{
              gridColumn: `${dashboardDragGhost.x} / span ${dashboardDragGhost.w}`,
              gridRow: `${dashboardDragGhost.y} / span ${dashboardDragGhost.h}`
            }"
          ></div>
          <div
            v-if="blocksForSpace(props.space.id).length === 0 && !isDashboardEditing(props.space)"
            class="col-span-full card-glass dashboard-empty"
          >
            <div class="section-title">{{ t("app.spaces") }}</div>
            <div class="core-card-title">{{ t("dashboard.empty.title") }}</div>
            <div class="text-white/50 text-sm mt-2">
              {{ t("dashboard.empty.body") }}
            </div>
          </div>
          <div
            v-for="block in blocksForSpace(props.space.id)"
            :key="block.id"
            class="dashboard-block card-glass"
            :class="{
              'dashboard-block-editing': isDashboardEditing(props.space),
              'dashboard-block-selected': isDashboardEditing(props.space) && block.id === dashboardEditSelectedId,
              'dashboard-block-plain': blockTypeIs(block, blockTypes.resourcesPinned)
            }"
            :data-space-id="props.space.id"
            :data-block-id="block.id"
            :style="blockStyle(block, blockOrderMapForSpace(props.space.id))"
            @click="isDashboardEditing(props.space) ? setDashboardEditSelection(props.space.id, block.id) : null"
          >
            <div v-if="!blockTypeIs(block, blockTypes.resourcesPinned)" class="dashboard-block-header">
              <div class="dashboard-block-title">{{ blockTitle(block) }}</div>
              <span class="chip chip-muted">{{ blockTypeLabel(block) }}</span>
            </div>
            <div class="dashboard-block-body">
              <div v-if="blockTypeIs(block, blockTypes.resourcesPinned)" class="dashboard-list">
                <div class="dashboard-resources">
                  <div
                    v-for="item in blockDataFor(props.space.id, block.id)"
                    :key="item.id"
                    class="resource-card resource-card-tile"
                    :class="{
                      'resource-card-expandable': canOpenResourceDetails(item) && !isPublicReadonlySpace(props.space),
                      'resource-card-active': resourcePopoverOpen && resourcePopoverItem?.id === item.id
                    }"
                    :data-resource-id="String(item.id)"
                  >
                    <span class="resource-icon resource-icon-tile">
                      <img v-if="resolveIconUrl(item.icon_url)" :src="resolveIconUrl(item.icon_url)" :alt="item.title" />
                      <span v-else>{{ resourceInitial(item) }}</span>
                    </span>
                    <span class="resource-meta">
                      <span class="resource-title-row">
                        <a
                          v-if="item.url"
                          :href="item.url"
                          target="_blank"
                          rel="noreferrer"
                          class="resource-title-link"
                          @click.stop="rememberResourceVisit(props.space, item)"
                        >
                          {{ item.title }}
                        </a>
                        <span v-else class="resource-title">{{ item.title }}</span>
                      </span>
                      <template v-if="item.type === 'service'">
                        <span v-if="item.description" class="resource-desc">
                          {{ item.description }}
                        </span>
                        <span class="flex flex-wrap gap-2 mt-1">
                          <span v-if="serviceStatusLabel(item)" class="chip">
                            {{ serviceStatusLabel(item) }}
                          </span>
                        </span>
                        <div v-if="!isPublicReadonlySpace(props.space) && normalizeActionKeys(item.action_keys).length" class="flex flex-wrap gap-2 mt-2">
                          <button
                            v-for="actionKey in normalizeActionKeys(item.action_keys).slice(0, 4)"
                            :key="actionKey"
                            class="btn btn-ghost text-xs"
                            @click.stop="invokeServiceAction(actionKey, item)"
                          >
                            {{ actionLabel(actionKey) || actionKey }}
                          </button>
                        </div>
                      </template>
                      <span v-else-if="item.description" class="resource-desc">{{ item.description }}</span>
                    </span>
                    <button
                      v-if="enableV0ResourceDetails && canOpenResourceDetails(item) && !isPublicReadonlySpace(props.space)"
                      class="resource-detail-toggle"
                      :class="{ active: resourcePopoverOpen && resourcePopoverItem?.id === item.id }"
                      @click.stop="toggleResourcePopover($event, item)"
                    >
                      <span class="resource-detail-toggle-label">{{ t("app.details") }}</span>
                      <ChevronDown class="resource-detail-toggle-icon" />
                    </button>

                    <div
                      v-if="enableV0ResourceDetails && resourcePopoverOpen && resourcePopoverItem?.id === item.id && !isPublicReadonlySpace(props.space)"
                      :class="[
                        'resource-popover',
                        'inline',
                        resourcePopoverPlacement === 'right'
                          ? 'resource-popover-right'
                          : 'resource-popover-left'
                      ]"
                    >
                      <div class="resource-popover-header">
                        <div class="min-w-0">
                          <div class="text-xs text-white/50 uppercase tracking-wider">{{ t("resource.details.title") }}</div>
                          <div class="text-lg font-semibold truncate">{{ resourcePopoverItem.title }}</div>
                        </div>
                        <button class="btn btn-ghost btn-icon" @click="closeResourcePopover">
                          <Tooltip
                            :content="t('app.close')"
                            :disabled="tooltipsDisabled"
                            :delay="tooltipDelay"
                          >
                            <X class="w-4 h-4" />
                          </Tooltip>
                        </button>
                      </div>

                      <div v-if="resourcePopoverViewer === 'service.s3'" class="resource-popover-body">
                        <div class="drawer-section">
                          <div class="drawer-section-title">{{ t("resource.details.overview") }}</div>
                          <div class="drawer-section-body">
                            <div class="drawer-row">
                              <span class="drawer-label">{{ t("resource.details.service") }}</span>
                              <span class="drawer-value">{{ resourcePopoverItem.title }}</span>
                            </div>
                            <div v-if="resourcePopoverItem.description" class="drawer-row">
                              <span class="drawer-label">{{ t("resource.details.description") }}</span>
                              <span class="drawer-value">{{ resourcePopoverItem.description }}</span>
                            </div>
                            <div v-if="resourcePopoverItem.tier" class="drawer-row">
                              <span class="drawer-label">{{ t("resource.details.tier") }}</span>
                              <span class="drawer-value">{{ resourcePopoverItem.tier }}</span>
                            </div>
                          </div>
                        </div>

                        <div class="drawer-section">
                          <div class="drawer-section-title">{{ t("resource.details.s3") }}</div>
                          <div class="drawer-section-body">
                            <div
                              v-for="(endpoint, idx) in s3EndpointsFor(resourcePopoverItem)"
                              :key="`s3-endpoint-${idx}`"
                              class="drawer-card"
                            >
                              <div class="drawer-row">
                                <span class="drawer-label">{{ t("resource.details.bucket") }}</span>
                                <span class="drawer-value">{{ endpoint.bucket || "—" }}</span>
                              </div>
                              <div class="drawer-row">
                                <span class="drawer-label">{{ t("resource.details.endpoint") }}</span>
                                <span class="drawer-value">{{ endpoint.endpoint || endpoint.url || "—" }}</span>
                              </div>
                              <div class="drawer-row">
                                <span class="drawer-label">{{ t("resource.details.region") }}</span>
                                <span class="drawer-value">{{ endpoint.region || "—" }}</span>
                              </div>
                              <div class="drawer-row">
                                <span class="drawer-label">{{ t("resource.details.console") }}</span>
                                <span class="drawer-value">
                                  <a
                                    v-if="resourcePopoverItem.url"
                                    :href="resourcePopoverItem.url"
                                    target="_blank"
                                    rel="noreferrer"
                                    class="resource-title-link"
                                    @click="rememberResourceVisit(props.space, resourcePopoverItem)"
                                  >
                                    {{ t("resource.details.openConsole") }}
                                  </a>
                                </span>
                              </div>
                              <div v-if="endpoint.bucket" class="drawer-actions">
                                <button class="btn btn-ghost text-xs" @click="copyText(`s3://${endpoint.bucket}`)">{{ t("resource.details.copyS3") }}</button>
                                <button class="btn btn-ghost text-xs" @click="copyText(`aws s3 ls s3://${endpoint.bucket}`)">{{ t("resource.details.copyCli") }}</button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div v-if="resourcePopoverItem.access_path" class="drawer-section">
                          <div class="drawer-section-title">{{ t("resource.details.access") }}</div>
                          <div class="drawer-section-body">
                            <div class="drawer-row">
                              <span class="drawer-label">{{ t("resource.details.accessPath") }}</span>
                              <span class="drawer-value">{{ resourcePopoverItem.access_path }}</span>
                            </div>
                          </div>
                        </div>

                        <div class="drawer-section">
                          <div class="drawer-section-title">{{ t("resource.details.actions") }}</div>
                          <div class="drawer-section-body">
                            <div v-if="normalizeActionKeys(resourcePopoverItem.action_keys).length" class="drawer-actions">
                              <button
                                v-for="actionKey in normalizeActionKeys(resourcePopoverItem.action_keys)"
                                :key="`s3-action-${actionKey}`"
                                class="btn btn-ghost text-xs"
                                @click="invokeServiceAction(actionKey, resourcePopoverItem)"
                              >
                                {{ actionLabel(actionKey) || actionKey }}
                              </button>
                            </div>
                            <div v-else class="text-xs text-white/50">{{ t("resource.details.noActions") }}</div>
                          </div>
                        </div>
                      </div>

                      <div v-else class="resource-popover-body">
                        <div class="drawer-section">
                          <div class="drawer-section-title">{{ t("resource.details.overview") }}</div>
                          <div class="drawer-section-body">
                            <div class="drawer-row">
                              <span class="drawer-label">{{ t("resource.details.titleField") }}</span>
                              <span class="drawer-value">{{ resourcePopoverItem.title }}</span>
                            </div>
                            <div v-if="resourcePopoverItem.description" class="drawer-row">
                              <span class="drawer-label">{{ t("resource.details.description") }}</span>
                              <span class="drawer-value">{{ resourcePopoverItem.description }}</span>
                            </div>
                            <div v-if="resourcePopoverItem.service_type" class="drawer-row">
                              <span class="drawer-label">{{ t("resource.details.type") }}</span>
                              <span class="drawer-value">{{ resourcePopoverItem.service_type }}</span>
                            </div>
                            <div v-if="resourcePopoverItem.tier" class="drawer-row">
                              <span class="drawer-label">{{ t("resource.details.tier") }}</span>
                              <span class="drawer-value">{{ resourcePopoverItem.tier }}</span>
                            </div>
                            <div v-if="resourcePopoverItem.lifecycle" class="drawer-row">
                              <span class="drawer-label">{{ t("resource.details.lifecycle") }}</span>
                              <span class="drawer-value">{{ resourcePopoverItem.lifecycle }}</span>
                            </div>
                            <div v-if="resourcePopoverItem.url" class="drawer-row">
                              <span class="drawer-label">{{ t("resource.details.primaryLink") }}</span>
                              <span class="drawer-value">
                                <a :href="resourcePopoverItem.url" target="_blank" rel="noreferrer" class="resource-title-link" @click="rememberResourceVisit(space, resourcePopoverItem)">{{ t("surface.action.openResource") }}</a>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div
                          v-if="resourcePopoverItem.owners && typeof resourcePopoverItem.owners === 'object' && Object.keys(resourcePopoverItem.owners).length"
                          class="drawer-section"
                        >
                          <div class="drawer-section-title">{{ t("resource.details.ownership") }}</div>
                          <div class="drawer-section-body">
                            <div class="drawer-row" v-for="(value, key) in resourcePopoverItem.owners" :key="`owner-${key}`">
                              <span class="drawer-label">{{ key }}</span>
                              <span class="drawer-value">{{ value }}</span>
                            </div>
                          </div>
                        </div>

                        <div v-if="normalizeLinks(resourcePopoverItem.links).length" class="drawer-section">
                          <div class="drawer-section-title">{{ t("resource.details.links") }}</div>
                          <div class="drawer-section-body">
                            <div v-for="(link, idx) in normalizeLinks(resourcePopoverItem.links)" :key="`link-${idx}`" class="drawer-row">
                              <span class="drawer-label">{{ link.label }}</span>
                              <span class="drawer-value">
                                <a :href="link.url" target="_blank" rel="noreferrer" class="resource-title-link">{{ t("surface.action.openResource") }}</a>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div v-if="Array.isArray(resourcePopoverItem.endpoints) && resourcePopoverItem.endpoints.length" class="drawer-section">
                          <div class="drawer-section-title">{{ t("resource.details.endpoints") }}</div>
                          <div class="drawer-section-body">
                            <div
                              v-for="(endpoint, idx) in resourcePopoverItem.endpoints"
                              :key="`endpoint-${idx}`"
                              class="drawer-row"
                            >
                              <span class="drawer-label">{{ endpoint.type || "endpoint" }}</span>
                              <span class="drawer-value">{{ formatEndpointLine(endpoint) || "—" }}</span>
                            </div>
                          </div>
                        </div>

                        <div v-if="resourcePopoverItem.access_path" class="drawer-section">
                          <div class="drawer-section-title">{{ t("resource.details.access") }}</div>
                          <div class="drawer-section-body">
                            <div class="drawer-row">
                              <span class="drawer-label">{{ t("resource.details.accessPath") }}</span>
                              <span class="drawer-value">{{ resourcePopoverItem.access_path }}</span>
                            </div>
                          </div>
                        </div>

                        <div class="drawer-section">
                          <div class="drawer-section-title">{{ t("resource.details.actions") }}</div>
                          <div class="drawer-section-body">
                            <div v-if="normalizeActionKeys(resourcePopoverItem.action_keys).length" class="drawer-actions">
                              <button
                                v-for="actionKey in normalizeActionKeys(resourcePopoverItem.action_keys)"
                                :key="`action-${actionKey}`"
                                class="btn btn-ghost text-xs"
                                @click="invokeServiceAction(actionKey, resourcePopoverItem)"
                              >
                                {{ actionLabel(actionKey) || actionKey }}
                              </button>
                            </div>
                            <div v-else class="text-xs text-white/50">{{ t("resource.details.noActions") }}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="blockDataFor(space.id, block.id).length === 0" class="core-empty">{{ t("resource.noPinned") }}</div>
              </div>
              <div v-else-if="blockTypeIs(block, blockTypes.calendarUpcoming)" class="flex flex-col items-start gap-3">
                <div class="text-sm leading-6 text-white/70">
                  {{ t("dashboard.calendarUpcoming.body") }}
                </div>
                <div
                  v-if="calendarSummaryFor(block)"
                  class="flex flex-wrap gap-2"
                >
                  <span class="chip chip-muted">
                    {{ t("dashboard.summary.visible") }}: {{ calendarSummaryFor(block)?.visible_count ?? 0 }}
                  </span>
                  <span class="chip chip-muted">
                    {{ t("dashboard.summary.events") }}: {{ calendarSummaryFor(block)?.event_count ?? 0 }}
                  </span>
                  <span class="chip chip-muted">
                    {{ t("dashboard.summary.reminders") }}: {{ calendarSummaryFor(block)?.reminder_count ?? 0 }}
                  </span>
                </div>
                <div
                  v-if="calendarItemsFor(block).length"
                  class="w-full space-y-2"
                >
                  <div
                    v-for="item in calendarItemsFor(block)"
                    :key="item.entry_id || item.id || item.title"
                    class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div class="text-sm font-medium text-white">
                      {{ item.title || item.entry_id || "Calendar item" }}
                    </div>
                    <div class="mt-1 text-xs text-white/60">
                      {{ calendarItemMeta(item) }}
                    </div>
                  </div>
                </div>
                <a
                  v-if="blockInspectHref(block)"
                  class="btn btn-ghost text-xs"
                  :href="blockInspectHref(block)"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ t("surface.action.openCalendar") }}
                </a>
                <div v-else class="core-empty">{{ t("dashboard.calendarUpcoming.missing") }}</div>
              </div>
              <div v-else-if="blockTypeIs(block, blockTypes.inventorySummary)" class="flex flex-col items-start gap-3">
                <div class="text-sm leading-6 text-white/70">
                  {{ t("dashboard.inventorySummary.body") }}
                </div>
                <div
                  v-if="inventorySummaryFor(block)"
                  class="flex flex-wrap gap-2"
                >
                  <span class="chip chip-muted">
                    {{ t("dashboard.summary.totalItems") }}: {{ inventorySummaryFor(block)?.total_count ?? 0 }}
                  </span>
                  <span class="chip chip-muted">
                    {{ t("dashboard.summary.attention") }}: {{ inventorySummaryFor(block)?.attention?.count ?? 0 }}
                  </span>
                </div>
                <div
                  v-if="inventoryBucketCountsFor(block).length"
                  class="flex flex-wrap gap-2"
                >
                  <span
                    v-for="bucket in inventoryBucketCountsFor(block)"
                    :key="bucket.key || bucket.label"
                    class="chip chip-muted"
                  >
                    {{ bucket.label || bucket.key }}: {{ bucket.count ?? 0 }}
                  </span>
                </div>
                <div
                  v-if="inventoryAttentionItemsFor(block).length"
                  class="w-full space-y-2"
                >
                  <div
                    v-for="item in inventoryAttentionItemsFor(block)"
                    :key="item.instance_id || item.id || item.title"
                    class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div class="text-sm font-medium text-white">
                      {{ item.title || item.instance_id || "Inventory item" }}
                    </div>
                    <div v-if="inventoryAttentionMeta(item)" class="mt-1 text-xs text-white/60">
                      {{ inventoryAttentionMeta(item) }}
                    </div>
                  </div>
                </div>
                <a
                  v-if="blockInspectHref(block)"
                  class="btn btn-ghost text-xs"
                  :href="blockInspectHref(block)"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ t("surface.action.openInventory") }}
                </a>
                <div v-else class="core-empty">{{ t("dashboard.inventorySummary.missing") }}</div>
              </div>
              <div v-else-if="blockTypeIs(block, blockTypes.text)" class="dashboard-text">
                <div v-if="block.config?.text" class="core-kv-value whitespace-pre-wrap">
                  {{ block.config.text }}
                </div>
                <div v-else class="core-empty">{{ t("dashboard.empty.body") }}</div>
              </div>
              <div v-else class="core-empty">{{ t("dashboard.empty.body") }}</div>
            </div>
            <div v-if="isDashboardEditing(space)" class="dashboard-resize-handle"></div>
          </div>
          <div
            v-if="isDashboardEditing(space) && dashboardEditSelectedId"
            class="dashboard-block-editor"
            :style="dashboardEditPanelStyle"
          >
            <div class="dashboard-editor-header">
              <div class="text-xs uppercase tracking-widest text-white/50">{{ t("editor.blockSettings") }}</div>
              <button class="btn btn-ghost btn-icon" @click="clearDashboardEditSelection">
                <Tooltip
                  :content="t('app.close')"
                  :disabled="tooltipsDisabled"
                  :delay="tooltipDelay"
                >
                  <X class="w-4 h-4" />
                </Tooltip>
              </button>
            </div>
            <div class="dashboard-sidebar-form">
              <label class="dashboard-field">
                <span>Title</span>
                <input v-model="dashboardEditForm.title" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
              </label>
              <label class="dashboard-field">
                <span>Type</span>
                <select v-model="dashboardEditForm.type" class="select text-xs" @change="applyDashboardEditForm(space.id)">
                  <option v-for="opt in blockTypeOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </label>
              <button class="btn btn-ghost text-xs self-start" @click="toggleDashboardEditAdvanced">
                {{ dashboardEditAdvanced ? t("editor.hideAdvanced") : t("editor.showAdvanced") }}
              </button>
              <p class="text-[11px] core-kv-label leading-5">
                {{ t("editor.advancedHint") }}
              </p>
              <div v-if="dashboardEditAdvanced" class="grid grid-cols-4 gap-2">
                <label class="dashboard-field">
                  <span>X</span>
                  <input v-model.number="dashboardEditForm.x" type="number" min="1" max="12" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                </label>
                <label class="dashboard-field">
                  <span>Y</span>
                  <input v-model.number="dashboardEditForm.y" type="number" min="1" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                </label>
                <label class="dashboard-field">
                  <span>W</span>
                  <input v-model.number="dashboardEditForm.w" type="number" min="1" max="12" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                </label>
                <label class="dashboard-field">
                  <span>H</span>
                  <input v-model.number="dashboardEditForm.h" type="number" min="1" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                </label>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <label class="dashboard-field">
                  <span>Order</span>
                  <input v-model.number="dashboardEditForm.order" type="number" min="1" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                </label>
                <label class="dashboard-field">
                  <span>Limit</span>
                  <input v-model.number="dashboardEditForm.limit" type="number" min="1" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                </label>
                <label class="dashboard-field">
                  <span>Scope</span>
                  <input v-model="dashboardEditForm.scope" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
                </label>
              </div>
              <label v-if="dashboardEditAdvanced" class="dashboard-field">
                <span>Filter</span>
                <input v-model="dashboardEditForm.filter" class="input text-xs" @input="applyDashboardEditForm(space.id)" />
              </label>
              <label v-if="dashboardEditForm.type === blockTypes.text" class="dashboard-field">
                <span>Text</span>
                <textarea v-model="dashboardEditForm.text" rows="4" class="input text-xs" @input="applyDashboardEditForm(space.id)"></textarea>
              </label>
              <button class="btn btn-danger" @click="deleteDashboardBlockDraft(space, dashboardEditSelectedId)">
                Delete block
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
