<script setup>
import { computed, ref } from "vue";
import { CalendarDays, Files, Settings } from "@lucide/vue";
import PlatformDropdownAnchor from "../../platform/components/PlatformDropdownAnchor.vue";
const props = defineProps({
  tabs: { type: Array, required: true }, activeTab: { type: String, required: true },
  collapsed: { type: Boolean, required: true }, t: { type: Function, required: true }
});
const emit = defineEmits(["select"]);
const open = ref(false);
const primary = computed(() => props.tabs.filter((tab) => tab.primary));
const secondary = computed(() => props.tabs.filter((tab) => !tab.primary && tab.id !== "chat"));
const choose = (id, close) => { close(); emit("select", id); };
</script>
<template>
  <nav class="assistant-sections" :aria-label="t('assistant.tabs.ariaLabel')">
    <button v-for="tab in primary" :key="tab.id" type="button" class="assistant-sections__item"
      :class="{ 'assistant-sections__item--active': activeTab === tab.id }"
      :aria-current="activeTab === tab.id ? 'page' : undefined"
      :title="tab.label" :aria-label="tab.label" @click="emit('select', tab.id)">
      <CalendarDays v-if="tab.id === 'routines'" :size="18" /><Files v-else :size="18" />
      <span v-if="!collapsed">{{ tab.label }}</span>
    </button>
    <PlatformDropdownAnchor v-model:open="open" align="left">
      <template #trigger="{ toggle }">
        <button type="button" class="assistant-sections__item" :aria-expanded="open"
          :aria-label="t('assistant.navigation.more')" :title="t('assistant.navigation.more')" @click="toggle">
          <Settings :size="18" /><span v-if="!collapsed">{{ t('assistant.navigation.more') }}</span>
        </button>
      </template>
      <template #dropdown="{ close }">
        <div class="assistant-sections__menu">
          <button v-for="tab in secondary" :key="tab.id" type="button" class="assistant-sections__item"
            :aria-current="activeTab === tab.id ? 'page' : undefined"
            @click="choose(tab.id, close)">{{ tab.label }}</button>
        </div>
      </template>
    </PlatformDropdownAnchor>
  </nav>
</template>
<style scoped>
.assistant-sections { display: grid; gap: 4px; padding-block: 8px 16px; }
.assistant-sections__item {
  width: 100%; min-height: 44px; display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border: 0; border-radius: 8px; background: transparent; color: var(--ink-secondary);
  text-align: start; font: inherit; font-size: 14px; cursor: pointer;
}
.assistant-sections__item:hover, .assistant-sections__item--active { background: var(--surface-overlay); color: var(--ink-primary); }
.assistant-sections__item:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: -2px; }
.assistant-sections__menu {
  width: 220px; max-width: calc(100vw - 48px); padding: 6px; border-radius: 12px;
  border: 1px solid var(--border-default); background: var(--surface-raised); box-shadow: 0 12px 32px #0004;
}
</style>
