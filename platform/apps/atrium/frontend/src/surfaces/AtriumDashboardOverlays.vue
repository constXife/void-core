<script setup>
import { X } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import Tooltip from "../components/Tooltip.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import AtriumShortcutsModal from "./AtriumShortcutsModal.vue";

const appStore = useAtriumAppStore();
const {
  currentSpace,
  dashboardAddOpen,
  dashboardEditorBlocks,
  dashboardEditorSaving,
  dashboardEditorSpace,
  dashboardPreviewRole,
  inlineAddForm,
  inlineEditAdvanced,
  inlineEditBlock,
  inlineEditForm,
  inlineEditPopover,
  serviceDetailsItem,
  serviceDetailsOpen,
  showDashboardEditor,
  showShortcuts,
  tooltipDelay,
  tooltipsDisabled
} = storeToRefs(appStore);

const {
  addBlockFromPicker,
  addDashboardBlock,
  blockDataCount,
  blockTypeCards,
  blockTypeLabel,
  blockTypeOptions,
  blockTypes,
  blockOrderMapFromBlocks,
  blockStyle,
  blockTitle,
  closeAddBlockPicker,
  closeDashboardEditor,
  closeInlineEdit,
  closeServiceDetails,
  closeShortcuts,
  enableV0Editor,
  enableV0ResourceDetails,
  hotkeys,
  isResourcesBlock,
  onDashboardPreviewRoleChange,
  saveBlockSettings,
  saveDashboardEditor,
  saveInlineContent,
  setDashboardPreviewRole,
  t,
  toggleInlineEditAdvanced,
  updateDirectoryItem
} = appStore;
</script>

<template>
  <div v-if="dashboardAddOpen" class="modal-backdrop" @click.self="closeAddBlockPicker">
    <div class="modal-content block-picker-modal">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">{{ t("editor.addBlockTitle") }}</h3>
        <button class="btn btn-ghost btn-icon" @click="closeAddBlockPicker">
          <Tooltip
            :content="t('app.close')"
            :disabled="tooltipsDisabled"
            :delay="tooltipDelay"
          >
            <X class="w-4 h-4" />
          </Tooltip>
        </button>
      </div>
      <div class="text-sm text-white/50 mb-4">
        {{ t("editor.addBlockBody") }}
      </div>
      <div class="block-picker-grid">
        <button
          v-for="option in blockTypeCards"
          :key="option.value"
          class="block-picker-card"
          @click="addBlockFromPicker(currentSpace, option.value)"
        >
          <div class="block-picker-icon">
            <component :is="option.icon" class="w-5 h-5" />
          </div>
          <div class="block-picker-info">
            <div class="block-picker-title">{{ option.label }}</div>
            <div class="block-picker-desc">{{ option.description }}</div>
          </div>
        </button>
      </div>
    </div>
  </div>

  <AtriumShortcutsModal
    v-if="showShortcuts"
    :hotkeys="hotkeys"
    :t="t"
    :tooltips-disabled="tooltipsDisabled"
    :tooltip-delay="tooltipDelay"
    @close="closeShortcuts"
  />

  <div
    v-if="enableV0Editor && showDashboardEditor && dashboardEditorSpace"
    class="modal-backdrop"
    @click.self="closeDashboardEditor"
  >
    <div class="modal-content dashboard-editor-modal">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="text-lg font-semibold">{{ t("admin.dashboard.editor") }}</div>
          <div class="text-xs text-white/40">{{ dashboardEditorSpace.title }}</div>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-[11px] text-white/40 uppercase tracking-wider">{{ t("admin.dashboard.preview") }}</label>
          <select
            :value="dashboardPreviewRole"
            class="select text-xs"
            @change="setDashboardPreviewRole($event.target.value); onDashboardPreviewRoleChange()"
          >
            <option value="guest">guest</option>
            <option value="user">user</option>
            <option value="staff">staff</option>
            <option value="admin">admin</option>
          </select>
          <button class="btn btn-ghost" @click="closeDashboardEditor">{{ t("app.close") }}</button>
        </div>
      </div>
      <div class="dashboard-editor">
        <div class="dashboard-editor-preview">
          <div class="dashboard-grid">
            <div
              v-for="block in dashboardEditorBlocks"
              :key="block.id"
              class="dashboard-block card-glass"
              :style="blockStyle(block, blockOrderMapFromBlocks(dashboardEditorBlocks))"
            >
              <div class="dashboard-block-header">
                <div class="dashboard-block-title">{{ blockTitle(block) }}</div>
                <span class="chip chip-muted">{{ blockTypeLabel(block) }}</span>
              </div>
            </div>
          </div>
          <div class="mt-3 text-[11px] text-white/40 space-y-1">
            <div v-for="block in dashboardEditorBlocks" :key="`preview-${block.id}`">
              {{ blockTitle(block) }} · {{ blockDataCount(dashboardEditorSpace.id, block.id) }} items
            </div>
          </div>
        </div>
        <div class="dashboard-editor-controls">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-semibold">{{ t("admin.dashboard.blocks") }}</div>
            <button class="btn btn-ghost text-xs" @click="addDashboardBlock">
              {{ t("app.addBlock") }}
            </button>
          </div>
          <div class="space-y-3">
            <div v-for="block in dashboardEditorBlocks" :key="block.id" class="card-glass dashboard-editor-block">
              <div class="flex items-center justify-between gap-2 mb-3">
                <input v-model="block.title" class="input text-xs" placeholder="Block title" />
                <select v-model="block.type" class="select text-xs">
                  <option v-for="opt in blockTypeOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="grid grid-cols-4 gap-2 text-xs">
                <label class="text-white/50">x
                  <input v-model.number="block.layout.lg.x" type="number" min="1" max="12" class="input text-xs mt-1" />
                </label>
                <label class="text-white/50">y
                  <input v-model.number="block.layout.lg.y" type="number" min="1" class="input text-xs mt-1" />
                </label>
                <label class="text-white/50">w
                  <input v-model.number="block.layout.lg.w" type="number" min="1" max="12" class="input text-xs mt-1" />
                </label>
                <label class="text-white/50">h
                  <input v-model.number="block.layout.lg.h" type="number" min="1" class="input text-xs mt-1" />
                </label>
              </div>
              <div class="grid grid-cols-3 gap-2 text-xs mt-2">
                <label class="text-white/50">order
                  <input v-model.number="block.layout.xs.order" type="number" min="1" class="input text-xs mt-1" />
                </label>
                <label class="text-white/50">limit
                  <input v-model.number="block.config.limit" type="number" min="1" class="input text-xs mt-1" />
                </label>
                <label class="text-white/50">scope
                  <input v-model="block.config.scope" type="text" class="input text-xs mt-1" />
                </label>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-4">
            <button class="btn btn-primary flex-1" :disabled="dashboardEditorSaving" @click="saveDashboardEditor">
              {{ dashboardEditorSaving ? `${t("app.save")}...` : t("app.saveDashboard") }}
            </button>
            <button class="btn btn-ghost" @click="closeDashboardEditor">{{ t("app.cancel") }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="enableV0ResourceDetails && serviceDetailsOpen && serviceDetailsItem"
    class="modal-backdrop"
    @click.self="closeServiceDetails"
  >
    <div class="modal-content admin-modal">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">{{ t("resource.details.title") }}</h3>
        <button class="btn btn-ghost btn-icon" @click="closeServiceDetails">
          <Tooltip
            :content="t('app.close')"
            :disabled="tooltipsDisabled"
            :delay="tooltipDelay"
          >
            <X class="w-4 h-4" />
          </Tooltip>
        </button>
      </div>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.serviceType") }}</label>
            <input v-model="serviceDetailsItem.serviceType" class="input text-xs" :placeholder="t('admin.common.placeholder.serviceType')" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.tier") }}</label>
            <input v-model="serviceDetailsItem.tier" class="input text-xs" :placeholder="t('admin.common.placeholder.tier')" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.lifecycle") }}</label>
            <input v-model="serviceDetailsItem.lifecycle" class="input text-xs" :placeholder="t('admin.common.placeholder.lifecycle')" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.classification") }}</label>
            <input v-model="serviceDetailsItem.classification" class="input text-xs" :placeholder="t('admin.common.placeholder.classification')" />
          </div>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.runbookUrl") }}</label>
          <input v-model="serviceDetailsItem.runbookUrl" class="input text-xs" :placeholder="t('admin.common.placeholder.runbookUrl')" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.accessPath") }}</label>
          <input v-model="serviceDetailsItem.accessPath" class="input text-xs" :placeholder="t('admin.common.placeholder.accessPath')" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.dependsOn") }}</label>
          <input v-model="serviceDetailsItem.dependsOnInput" class="input text-xs" :placeholder="t('admin.common.placeholder.dependsOn')" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.ownersJson") }}</label>
          <textarea v-model="serviceDetailsItem.ownersInput" class="input text-xs" rows="4" :placeholder="t('admin.common.placeholder.ownersJson')"></textarea>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.linksJson") }}</label>
          <textarea v-model="serviceDetailsItem.linksInput" class="input text-xs" rows="4" :placeholder="t('admin.common.placeholder.linksJson')"></textarea>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.endpointsJson") }}</label>
          <textarea v-model="serviceDetailsItem.endpointsInput" class="input text-xs" rows="4" :placeholder="t('admin.common.placeholder.endpointsJson')"></textarea>
        </div>
        <div class="flex items-center gap-2 pt-2">
          <button class="btn btn-primary flex-1" @click="updateDirectoryItem(serviceDetailsItem)">{{ t("app.save") }}</button>
          <button class="btn btn-ghost" @click="closeServiceDetails">{{ t("app.close") }}</button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="inlineEditPopover === 'settings' && inlineEditBlock" class="modal-backdrop" @click.self="closeInlineEdit">
    <div class="inline-popover">
      <div class="inline-popover-header">
        <h3 class="text-lg font-semibold">{{ t("editor.blockSettings") }}</h3>
        <button class="btn btn-ghost btn-icon" @click="closeInlineEdit">
          <Tooltip
            :content="t('app.close')"
            :disabled="tooltipsDisabled"
            :delay="tooltipDelay"
          >
            <X class="w-4 h-4" />
          </Tooltip>
        </button>
      </div>
      <div class="space-y-4 mt-4">
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Title</label>
          <input v-model="inlineEditForm.title" class="input" placeholder="Block title" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Type</label>
          <select v-model="inlineEditForm.type" class="select w-full">
            <option v-for="opt in blockTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <button class="btn btn-ghost text-xs self-start" @click="toggleInlineEditAdvanced">
          {{ inlineEditAdvanced ? t("editor.hideAdvanced") : t("editor.showAdvanced") }}
        </button>
        <p class="text-[11px] core-kv-label leading-5">
          {{ t("editor.advancedHint") }}
        </p>
        <div v-if="inlineEditAdvanced" class="grid grid-cols-4 gap-2">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">X</label>
            <input v-model.number="inlineEditForm.x" type="number" min="1" max="12" class="input text-center" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Y</label>
            <input v-model.number="inlineEditForm.y" type="number" min="1" class="input text-center" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">W</label>
            <input v-model.number="inlineEditForm.w" type="number" min="1" max="12" class="input text-center" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">H</label>
            <input v-model.number="inlineEditForm.h" type="number" min="1" class="input text-center" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Order</label>
            <input v-model.number="inlineEditForm.order" type="number" min="1" class="input text-center" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Limit</label>
            <input v-model.number="inlineEditForm.limit" type="number" min="1" class="input text-center" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Scope</label>
            <input v-model="inlineEditForm.scope" type="text" class="input text-center" />
          </div>
        </div>
        <div v-if="inlineEditAdvanced">
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Filter</label>
          <input v-model="inlineEditForm.filter" type="text" class="input" />
        </div>
        <div v-if="inlineEditForm.type === blockTypes.text">
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Text</label>
          <textarea v-model="inlineEditForm.text" class="input" rows="4" placeholder="Text content"></textarea>
        </div>
        <div class="flex items-center gap-2 pt-2">
          <button class="btn btn-primary flex-1" @click="saveBlockSettings">Save</button>
          <button class="btn btn-ghost" @click="closeInlineEdit">Cancel</button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="inlineEditPopover === 'add' && inlineEditBlock" class="modal-backdrop" @click.self="closeInlineEdit">
    <div class="inline-popover">
      <div class="inline-popover-header">
        <h3 class="text-lg font-semibold">
          Add Resource
        </h3>
        <button class="btn btn-ghost btn-icon" @click="closeInlineEdit">
          <Tooltip
            :content="t('app.close')"
            :disabled="tooltipsDisabled"
            :delay="tooltipDelay"
          >
            <X class="w-4 h-4" />
          </Tooltip>
        </button>
      </div>
      <div class="space-y-4 mt-4">
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Title</label>
          <input v-model="inlineAddForm.title" class="input" placeholder="Title" />
        </div>

        <template v-if="isResourcesBlock(inlineEditBlock.block)">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">URL</label>
            <input v-model="inlineAddForm.url" class="input" placeholder="https://..." />
          </div>
        </template>

        <div class="flex items-center gap-2 pt-2">
          <button class="btn btn-primary flex-1" @click="saveInlineContent">
            Create Resource
          </button>
          <button class="btn btn-ghost" @click="closeInlineEdit">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>
