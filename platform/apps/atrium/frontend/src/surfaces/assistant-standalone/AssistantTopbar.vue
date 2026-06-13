<script setup>
import { Menu } from "lucide-vue-next";

const props = defineProps({
  activeTab: { type: String, required: true },
  t: { type: Function, required: true },
  // Источник табов поднят в родитель (общий с drawer-навигацией).
  tabs: { type: Array, default: () => [] },
  // Заголовок активного раздела — показывается вместо ряда табов на narrow,
  // где переключение разделов переехало в drawer.
  activeTabLabel: { type: String, default: "" },
  // На narrow показываем кнопку-гамбургер: единственный способ открыть
  // off-canvas sidebar, чьи own-toggle уехали за экран.
  showMenu: { type: Boolean, default: false }
});

const emit = defineEmits(["tab-change", "toggle-sidebar"]);

const onClick = (tabId) => {
  if (tabId === props.activeTab) return;
  emit("tab-change", tabId);
};
</script>

<template>
  <nav class="assistant-topbar" :aria-label="t('assistant.tabs.ariaLabel')">
    <button
      v-if="showMenu"
      type="button"
      class="assistant-topbar__menu"
      :title="t('assistant.sidebar.expand')"
      :aria-label="t('assistant.sidebar.expand')"
      @click="emit('toggle-sidebar')"
    >
      <Menu :size="18" />
    </button>
    <!-- narrow: ряд табов не помещается → показываем только активный раздел,
         переключение — в drawer (см. AssistantSidebar section-nav). -->
    <span v-if="showMenu" class="assistant-topbar__title">{{ activeTabLabel }}</span>
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
