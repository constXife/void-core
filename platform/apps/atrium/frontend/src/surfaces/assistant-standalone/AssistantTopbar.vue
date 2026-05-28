<script setup>
import { computed } from "vue";

const props = defineProps({
  activeTab: { type: String, required: true },
  t: { type: Function, required: true },
  capabilitiesCount: { type: Number, default: null },
  routinesCount: { type: Number, default: null }
});

const emit = defineEmits(["tab-change"]);

const tabs = computed(() => [
  { id: "chat", label: props.t("assistant.tabs.chat"), count: null, showCount: false },
  { id: "capabilities", label: props.t("assistant.tabs.capabilities"), count: props.capabilitiesCount, showCount: true },
  { id: "routines", label: props.t("assistant.tabs.routines"), count: props.routinesCount, showCount: true },
  // Artifacts tab без count — count fetch для list зашёл бы в backend на каждом render
  // существующих tabs и усложнил бы Surface; пока tab без badge, ArtifactListPage сама загружает items.
  { id: "artifacts", label: props.t("assistant.tabs.artifacts"), count: null, showCount: false }
]);

const onClick = (tabId) => {
  if (tabId === props.activeTab) return;
  emit("tab-change", tabId);
};
</script>

<template>
  <nav class="assistant-topbar" :aria-label="t('assistant.tabs.ariaLabel')">
    <div class="assistant-topbar__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="assistant-topbar__tab"
        :class="{ 'assistant-topbar__tab--active': tab.id === activeTab }"
        :aria-current="tab.id === activeTab ? 'page' : undefined"
        @click="onClick(tab.id)"
      >
        <span class="assistant-topbar__tab-label">{{ tab.label }}</span>
        <span
          v-if="tab.showCount"
          class="assistant-topbar__tab-count"
          :data-loading="tab.count === null"
        >{{ tab.count === null ? "·" : tab.count }}</span>
      </button>
    </div>
    <div class="assistant-topbar__actions">
      <slot name="actions" />
    </div>
  </nav>
</template>
