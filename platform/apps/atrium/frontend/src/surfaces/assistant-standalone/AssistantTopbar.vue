<script setup>
import { PanelLeft } from "@lucide/vue";
import PlatformHeaderFrame from "../../platform/components/PlatformHeaderFrame.vue";
defineProps({
  identity: { type: Object, required: true },
  collapsed: { type: Boolean, required: true },
  t: { type: Function, required: true }
});
const emit = defineEmits(["toggle-sidebar"]);
</script>
<template>
  <PlatformHeaderFrame variant="bar" class="assistant-topbar">
    <template #left>
      <button type="button" class="assistant-topbar__toggle"
        :aria-expanded="!collapsed"
        :aria-label="collapsed ? t('assistant.sidebar.expand') : t('assistant.sidebar.collapse')"
        @click="emit('toggle-sidebar')"><PanelLeft :size="20" /></button>
      <span class="assistant-topbar__brand">{{ identity.label }}</span>
    </template>
    <template #right><div class="assistant-topbar__actions"><slot name="actions" /></div></template>
  </PlatformHeaderFrame>
</template>
<style scoped>
.assistant-topbar__toggle {
  width: 44px; height: 44px; display: grid; place-items: center; flex: 0 0 auto;
  padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--ink-secondary); cursor: pointer;
}
.assistant-topbar__toggle:hover { background: var(--surface-overlay); color: var(--ink-primary); }
.assistant-topbar__brand { font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.assistant-topbar__actions { display: flex; align-items: center; gap: 0; }
</style>
