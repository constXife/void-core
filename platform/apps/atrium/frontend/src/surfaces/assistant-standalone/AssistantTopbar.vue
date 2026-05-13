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
  { id: "chat", label: props.t("assistant.tabs.chat"), count: null },
  { id: "capabilities", label: props.t("assistant.tabs.capabilities"), count: props.capabilitiesCount },
  { id: "routines", label: props.t("assistant.tabs.routines"), count: props.routinesCount }
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
          v-if="tab.id !== 'chat'"
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
