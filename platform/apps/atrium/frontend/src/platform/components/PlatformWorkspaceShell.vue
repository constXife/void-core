<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
const props = defineProps({
  sidebarOpen: { type: Boolean, required: true },
  collapsed: { type: Boolean, required: true },
  narrow: { type: Boolean, required: true },
  sidebarWidth: { type: Number, required: true },
  closeLabel: { type: String, required: true },
  sidebarLabel: { type: String, required: true }
});
const emit = defineEmits(["close-sidebar"]);
const sidebar = ref(null);
let returnFocus = null;
const onKeydown = (event) => {
  if (event.defaultPrevented || !props.narrow || !props.sidebarOpen) return;
  if (event.key === "Escape") emit("close-sidebar");
  if (event.key !== "Tab") return;
  const targets = [...sidebar.value.querySelectorAll(
    'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]'
  )].filter((node) => node.getClientRects().length);
  const first = targets[0], last = targets.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first?.focus();
  }
};
watch(() => props.narrow && props.sidebarOpen, async (open) => {
  if (open) {
    returnFocus = document.activeElement;
    document.addEventListener("keydown", onKeydown);
    await nextTick();
    sidebar.value?.querySelector('button, a[href], input')?.focus();
  } else {
    document.removeEventListener("keydown", onKeydown);
    returnFocus?.focus(); returnFocus = null;
  }
});
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>
<template>
  <section class="platform-workspace" :class="{ 'platform-workspace--collapsed': collapsed && !narrow }"
    :style="{ '--workspace-sidebar-width': `${sidebarWidth}px` }">
    <div class="platform-workspace__header" :inert="narrow && sidebarOpen"><slot name="header" /></div>
    <div ref="sidebar" class="platform-workspace__sidebar"
      :class="{ 'platform-workspace__sidebar--open': sidebarOpen }" :inert="narrow && !sidebarOpen"
      :role="narrow && sidebarOpen ? 'dialog' : undefined"
      :aria-modal="narrow && sidebarOpen ? true : undefined" :aria-label="sidebarLabel">
      <button v-if="narrow && sidebarOpen" type="button" class="platform-workspace__close"
        :aria-label="closeLabel" @click="emit('close-sidebar')">×</button>
      <slot name="sidebar" />
    </div>
    <button v-if="narrow && sidebarOpen" type="button" class="platform-workspace__backdrop"
      :aria-label="closeLabel" tabindex="-1" @click="emit('close-sidebar')" />
    <main class="platform-workspace__content" :inert="narrow && sidebarOpen"><slot /></main>
  </section>
</template>
<style scoped>
.platform-workspace {
  display: grid; grid-template-columns: var(--workspace-sidebar-width) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr); height: 100dvh; overflow: hidden;
  background: var(--surface-base); color: var(--ink-primary);
}
.platform-workspace--collapsed { grid-template-columns: 64px minmax(0, 1fr); }
.platform-workspace__header { grid-column: 1 / -1; min-width: 0; z-index: 30; }
.platform-workspace__sidebar { min-height: 0; min-width: 0; position: relative; }
.platform-workspace__content { min-height: 0; min-width: 0; overflow: hidden; }
.platform-workspace__close {
  position: absolute; top: 8px; right: 8px; z-index: 2; width: 44px; height: 44px;
  border: 0; border-radius: 8px; background: var(--surface-raised); color: var(--ink-primary); font-size: 24px;
}
.platform-workspace__backdrop { position: fixed; inset: 0; z-index: 35; border: 0; background: #0008; }
@media (max-width: 1024px) {
  .platform-workspace, .platform-workspace--collapsed { grid-template-columns: minmax(0, 1fr); }
  .platform-workspace__sidebar {
    position: fixed; inset: 0 auto 0 0; z-index: 40; width: min(320px, calc(100vw - 48px));
    transform: translateX(-100%); visibility: hidden;
  }
  .platform-workspace__sidebar--open { transform: none; visibility: visible; }
}
</style>
