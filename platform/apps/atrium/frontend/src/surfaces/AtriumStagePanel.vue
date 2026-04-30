<script setup>
import { storeToRefs } from "pinia";
import AtriumSpaceDashboard from "./AtriumSpaceDashboard.vue";
import AtriumWidgetCard from "./AtriumWidgetCard.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";

const props = defineProps({
  sidx: { type: Number, required: true },
  space: { type: Object, required: true }
});

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
  globalWidgets,
  isMobile,
  loginPageUrl,
  me,
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
  bookingStatusClass,
  bookingStatusLabel,
  calendarDateLabel,
  calendarEventsFor,
  calendarVariant,
  canEditDashboardSpace,
  canOpenResourceDetails,
  clearDashboardEditSelection,
  clockDateFor,
  clockThemeClass,
  clockTimeFor,
  closeResourcePopover,
  copyText,
  enableV0Editor,
  enableV0ResourceDetails,
  eventStatusClass,
  formatEndpointLine,
  formatNotifTime,
  gridClass,
  hasDashboard,
  invokeServiceAction,
  isDashboardEditing,
  isKidsSpace,
  isPublicReadonlySpace,
  localWidgets,
  normalizeActionKeys,
  normalizeLinks,
  openAddBlockPicker,
  rememberResourceVisit,
  resourceInitial,
  normalizeIconUrl: resolveIconUrl,
  runSurfaceAction,
  s3EndpointsFor,
  saveDashboardLayout,
  serviceStatusLabel,
  setDashboardEditSelection,
  spaceDescription,
  spaceTitle,
  surfaceCardActions,
  surfaceCardsFor,
  surfaceHeadingFor,
  stopDashboardEdit,
  t,
  toggleDashboardEdit,
  toggleDashboardEditAdvanced,
  toggleResourcePopover,
  todoItemsFor,
  toggleTodo,
  widgetHtml
} = appStore;
</script>

<template>
  <div class="stage-panel">
    <div class="stage-header">
      <div>
        <h2 class="stage-title">{{ spaceTitle(props.space) }}</h2>
        <div v-if="spaceDescription(props.space)" class="stage-subtitle">
          {{ spaceDescription(props.space) }}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="enableV0Editor && canManage && !isMobile && !isDashboardEditing(props.space) && !isPublicReadonlySpace(props.space) && canEditDashboardSpace(props.space)"
          class="btn btn-ghost"
          @click="toggleDashboardEdit(props.space)"
        >
          {{ t("app.editLayout") }}
        </button>
      </div>
    </div>

    <div class="grid" :class="gridClass(props.space)">
      <div v-if="me && surfaceCardsFor(props.space).length" class="col-span-full">
        <div class="surface-brief">
          <div class="surface-brief-header">
            <div>
              <div class="surface-brief-title">{{ surfaceHeadingFor(props.space).title }}</div>
              <div class="surface-brief-subtitle">{{ surfaceHeadingFor(props.space).subtitle }}</div>
            </div>
          </div>
          <div class="surface-brief-grid">
            <article
              v-for="card in surfaceCardsFor(props.space)"
              :key="`${props.space.id}-${card.id}`"
              class="surface-brief-card"
            >
              <div class="surface-brief-eyebrow">{{ card.eyebrow }}</div>
              <div class="surface-brief-card-title">{{ card.title }}</div>
              <p class="surface-brief-card-body">{{ card.body }}</p>
              <div v-if="surfaceCardActions(card).length" class="flex flex-wrap gap-2 self-start">
                <button
                  v-for="action in surfaceCardActions(card)"
                  :key="action.id"
                  class="btn btn-ghost text-xs self-start"
                  :disabled="action.disabled"
                  @click="runSurfaceAction(action)"
                >
                  {{ action.label }}
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div v-if="!me && !isPublicReadonlySpace(props.space)" class="col-span-full">
        <div class="card-glass core-card">
          <div class="section-title">Доступ</div>
          <div class="core-card-title">Войдите, чтобы увидеть содержимое</div>
          <div class="text-white/50 text-sm mt-2">
            Контент и действия доступны после авторизации.
          </div>
          <a class="btn btn-primary mt-4" :href="loginPageUrl">Войти</a>
        </div>
      </div>

      <AtriumSpaceDashboard
        v-if="me && (hasDashboard(props.space) || canManage) && !isPublicReadonlySpace(props.space)"
        :space="props.space"
      />

      <div v-if="me && globalWidgets.length && props.sidx === 0" class="col-span-full grid gap-3 sm:grid-cols-2 lg:grid-cols-4 note-hero">
        <AtriumWidgetCard
          v-for="widget in globalWidgets"
          :key="widget.id"
          scope="global"
          :space="props.space"
          :widget="widget"
        />
      </div>

      <AtriumWidgetCard
        v-for="widget in localWidgets(props.space)"
        v-if="me"
        :key="widget.id"
        scope="local"
        :space="props.space"
        :widget="widget"
      />
    </div>
  </div>
</template>
