<script setup>
import { Pin, Search, X } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import Tooltip from "./Tooltip.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { useSpaceStore } from "../stores/space.js";
import { useUiStore } from "../stores/ui.js";

const appStore = useAtriumAppStore();
const spaceStore = useSpaceStore();
const uiStore = useUiStore();

const { t } = appStore;
const {
  currentSpace,
  spacePickerOpen,
  spacePickerSections,
  spaceQuery
} = storeToRefs(spaceStore);
const { isKioskMode, isMobile, tooltipDelay, tooltipsDisabled } = storeToRefs(uiStore);
</script>

<template>
  <div
    v-if="spacePickerOpen && !isKioskMode"
    class="space-picker-scrim"
    @click="spaceStore.closeSpacePicker()"
  ></div>
  <div
    v-if="spacePickerOpen && !isKioskMode"
    class="space-picker"
    :class="isMobile ? 'space-picker-sheet' : 'space-picker-dropdown'"
  >
    <div class="space-picker-header">
      <div>
        <div class="space-picker-title">{{ t("space.picker.title") }}</div>
        <div class="space-picker-subtitle">{{ t("space.picker.subtitle") }}</div>
      </div>
      <button class="btn btn-ghost btn-icon" @click="spaceStore.closeSpacePicker()">
        <Tooltip :content="t('app.close')" :disabled="tooltipsDisabled" :delay="tooltipDelay">
          <X class="w-4 h-4" />
        </Tooltip>
      </button>
    </div>

    <div class="space-picker-search">
      <Search class="w-4 h-4 text-white/40" />
      <input
        v-model="spaceQuery"
        type="search"
        class="space-picker-input"
        :placeholder="t('app.searchSpaces')"
      />
    </div>

    <div class="space-picker-body">
      <div v-if="spacePickerSections.length === 0" class="space-picker-empty">
        {{ t("app.noSpaces") }}
      </div>
      <div v-else class="space-picker-sections">
        <div v-for="section in spacePickerSections" :key="section.label" class="space-picker-section">
          <div class="space-picker-section-title">{{ t(section.label) }}</div>
          <div class="space-picker-list">
            <div
              v-for="space in section.items"
              :key="space.id"
              class="space-picker-item"
              :class="{ active: currentSpace?.id === space.id }"
              role="button"
              tabindex="0"
              @click="spaceStore.selectSpace(space)"
              @keydown.enter.prevent="spaceStore.selectSpace(space)"
            >
              <span class="space-picker-icon">{{ spaceStore.spaceIconLabel(space) }}</span>
              <span class="space-picker-info">
                <span class="space-picker-name">{{ space.title }}</span>
                <span v-if="spaceStore.spaceMetaLabel(space)" class="space-picker-meta">
                  {{ spaceStore.spaceMetaLabel(space) }}
                </span>
              </span>
              <button
                class="space-picker-pin"
                :class="{ active: spaceStore.isPinnedSpace(space.id) }"
                @click.stop="spaceStore.togglePinnedSpace(space.id)"
              >
                <Tooltip
                  :content="t('space.picker.pin')"
                  :disabled="tooltipsDisabled"
                  :delay="tooltipDelay"
                >
                  <Pin class="w-4 h-4" />
                </Tooltip>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
