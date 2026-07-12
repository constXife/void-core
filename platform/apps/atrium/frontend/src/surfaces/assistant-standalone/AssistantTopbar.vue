<script setup>
import { ref } from "vue";
import { Menu, ChevronDown } from "@lucide/vue";

const props = defineProps({
  activeTab: { type: String, required: true },
  t: { type: Function, required: true },
  // Источник табов поднят в родитель (общий с narrow-dropdown'ом).
  tabs: { type: Array, default: () => [] },
  // Заголовок активного раздела — текст narrow-dropdown'а разделов.
  activeTabLabel: { type: String, default: "" },
  // На narrow показываем кнопку-гамбургер (открыть drawer истории) и
  // dropdown разделов вместо ряда табов, который не помещается.
  showMenu: { type: Boolean, default: false }
});

const emit = defineEmits(["tab-change", "toggle-sidebar"]);

// narrow: открыт ли dropdown выбора раздела.
const sectionMenuOpen = ref(false);

const onClick = (tabId) => {
  if (tabId === props.activeTab) return;
  emit("tab-change", tabId);
};

// Выбор раздела из narrow-dropdown'а: закрыть и переключить.
const onSelectSection = (tabId) => {
  sectionMenuOpen.value = false;
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
    <!-- narrow: ряд табов не помещается → компактный dropdown разделов
         (отдельно от drawer истории чатов). -->
    <div v-if="showMenu" class="assistant-topbar__section-select">
      <button
        type="button"
        class="assistant-topbar__section-trigger"
        :aria-expanded="sectionMenuOpen"
        :aria-label="t('assistant.tabs.ariaLabel')"
        @click="sectionMenuOpen = !sectionMenuOpen"
      >
        <span>{{ activeTabLabel }}</span>
        <ChevronDown :size="16" />
      </button>
      <div
        v-if="sectionMenuOpen"
        class="assistant-topbar__section-menu"
        role="menu"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="menuitem"
          class="assistant-topbar__section-item"
          :class="{ 'assistant-topbar__section-item--active': tab.id === activeTab }"
          :aria-current="tab.id === activeTab ? 'page' : undefined"
          @click="onSelectSection(tab.id)"
        >
          <span>{{ tab.label }}</span>
          <span
            v-if="tab.showCount && tab.count !== null"
            class="assistant-topbar__section-item-count"
          >{{ tab.count }}</span>
        </button>
      </div>
      <button
        v-if="sectionMenuOpen"
        type="button"
        class="assistant-topbar__section-backdrop"
        :aria-label="t('assistant.tabs.ariaLabel')"
        @click="sectionMenuOpen = false"
      />
    </div>
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
