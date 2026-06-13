<script setup>
import { computed, ref } from "vue";
import { Plus, Trash2, PanelLeftClose, PanelLeftOpen } from "lucide-vue-next";
import AssistantSidebarItem from "./AssistantSidebarItem.vue";
import PlatformIdentityBrand from "../../platform/components/PlatformIdentityBrand.vue";

const props = defineProps({
  groups: { type: Array, default: () => [] },
  trashed: { type: Array, default: () => [] },
  trashedLoaded: { type: Boolean, default: false },
  activeId: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
  identity: { type: Object, required: true },
  activeTab: { type: String, default: "chat" },
  // Навигация по разделам в drawer — на narrow, где ряд табов topbar не влезает.
  tabs: { type: Array, default: () => [] },
  showSectionNav: { type: Boolean, default: false },
  t: { type: Function, required: true }
});

const emit = defineEmits([
  "new-chat",
  "select",
  "rename",
  "delete",
  "restore",
  "open-trash",
  "toggle-collapsed",
  "resize-start",
  "tab-change"
]);

const trashOpen = ref(false);
const searchQuery = ref("");
const t = (key, vars = {}) => props.t(key, vars);

const isEmpty = computed(() => !props.loading && props.groups.length === 0);
const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase());
const filteredGroups = computed(() => {
  if (!normalizedSearchQuery.value) return props.groups;

  return props.groups
    .map((group) => ({
      ...group,
      // Untitled sessions have no title to match against, so they never match a query.
      items: group.items.filter((session) =>
        (session.title || "").toLowerCase().includes(normalizedSearchQuery.value)
      )
    }))
    .filter((group) => group.items.length > 0);
});
const searchHasNoResults = computed(
  () => !props.loading && normalizedSearchQuery.value && filteredGroups.value.length === 0
);

const toggleTrash = () => {
  trashOpen.value = !trashOpen.value;
  if (trashOpen.value && !props.trashedLoaded) {
    emit("open-trash");
  }
};
</script>

<template>
  <aside class="assistant-sidebar" :class="{ 'assistant-sidebar--collapsed': collapsed }">
    <div class="assistant-sidebar__brand">
      <!-- В collapsed brand-полоса занята кнопкой untoggle: иконка-логотип в узкой
           колонке избыточна, а у пользователя должен быть очевидный способ вернуть
           sidebar обратно. В expanded brand-полоса показывает identity слева и
           collapse-toggle справа — одна линия с topbar'ом, без отдельного top-блока. -->
      <button
        v-if="collapsed"
        type="button"
        class="assistant-sidebar__toggle assistant-sidebar__toggle--brand"
        :title="t('assistant.sidebar.expand')"
        :aria-label="t('assistant.sidebar.expand')"
        @click="emit('toggle-collapsed')"
      >
        <PanelLeftOpen :size="16" />
      </button>
      <template v-else>
        <slot name="brand" :identity="identity" :collapsed="collapsed">
          <PlatformIdentityBrand
            :identity="identity"
            :collapsed="collapsed"
            :mark-size="26"
            :mark-rounded="6"
          />
        </slot>
        <button
          type="button"
          class="assistant-sidebar__toggle assistant-sidebar__toggle--brand-end"
          :title="t('assistant.sidebar.collapse')"
          :aria-label="t('assistant.sidebar.collapse')"
          @click="emit('toggle-collapsed')"
        >
          <PanelLeftClose :size="14" />
        </button>
      </template>
    </div>

    <!-- Section-nav (narrow): переключение разделов переехало сюда из topbar.
         На десктопе разделы живут в topbar, этот блок скрыт. -->
    <nav v-if="showSectionNav" class="assistant-sidebar__sections" :aria-label="t('assistant.tabs.ariaLabel')">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="assistant-sidebar__section"
        :class="{ 'assistant-sidebar__section--active': tab.id === activeTab }"
        :aria-current="tab.id === activeTab ? 'page' : undefined"
        @click="emit('tab-change', tab.id)"
      >
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.showCount && tab.count !== null"
          class="assistant-sidebar__section-count"
        >{{ tab.count }}</span>
      </button>
    </nav>

    <div v-if="activeTab === 'chat'" class="assistant-sidebar__top">
      <button
        type="button"
        class="assistant-sidebar__new"
        :title="collapsed ? t('assistant.sidebar.newChat') : ''"
        @click="emit('new-chat')"
      >
        <Plus :size="14" />
        <span class="assistant-sidebar__new-label">{{ t("assistant.sidebar.newChat") }}</span>
      </button>
      <input
        v-if="!collapsed"
        v-model="searchQuery"
        type="search"
        class="assistant-sidebar__search"
        :placeholder="t('assistant.sidebar.searchPlaceholder')"
        :aria-label="t('assistant.sidebar.searchPlaceholder')"
        @keydown.escape="searchQuery = ''"
      />
    </div>

    <!-- Chat mode: history list + trash -->
    <template v-if="activeTab === 'chat'">
      <div class="assistant-sidebar__list">
        <p v-if="loading && groups.length === 0" class="assistant-sidebar__hint">
          {{ t("assistant.sidebar.loadingChats") }}
        </p>
        <p v-else-if="isEmpty" class="assistant-sidebar__hint">
          {{ t("assistant.sidebar.emptyChats") }}
        </p>
        <p v-else-if="searchHasNoResults" class="assistant-sidebar__hint">
          {{ t("assistant.sidebar.searchEmpty") }}
        </p>

        <div
          v-for="group in filteredGroups"
          :key="group.id"
          class="assistant-sidebar__group"
        >
          <h3 class="assistant-sidebar__group-title">{{ group.label }}</h3>
          <TransitionGroup name="assistant-sidebar-row" tag="div" class="assistant-sidebar__group-items" appear>
            <AssistantSidebarItem
              v-for="session in group.items"
              :key="session.id"
              :session="session"
              :active="session.id === activeId"
              :t="t"
              @select="(id) => emit('select', id)"
              @rename="(session) => emit('rename', session)"
              @delete="(session) => emit('delete', session)"
            />
          </TransitionGroup>
        </div>
      </div>

      <div class="assistant-sidebar__trash">
        <button
          type="button"
          class="assistant-sidebar__trash-toggle"
          @click="toggleTrash"
        >
          <Trash2 :size="14" />
          <span>{{ t("assistant.sidebar.trash") }}</span>
          <span class="assistant-sidebar__trash-count" v-if="trashed.length">{{ trashed.length }}</span>
        </button>
        <div v-if="trashOpen" class="assistant-sidebar__trash-list">
          <p v-if="!trashedLoaded" class="assistant-sidebar__hint">{{ t("assistant.sidebar.loading") }}</p>
          <p v-else-if="trashed.length === 0" class="assistant-sidebar__hint">
            {{ t("assistant.sidebar.trashEmpty") }}
          </p>
          <AssistantSidebarItem
            v-for="session in trashed"
            :key="session.id"
            :session="session"
            trashed
            :t="t"
            @restore="(session) => emit('restore', session)"
          />
        </div>
      </div>
    </template>

    <!-- Capabilities mode: filter slot (placeholder in Wave 1, filled in Wave 2) -->
    <div v-else-if="activeTab === 'capabilities'" class="assistant-sidebar__list">
      <slot name="capabilities">
        <p class="assistant-sidebar__hint">{{ t("assistant.sidebar.capabilitiesFiltersSoon") }}</p>
      </slot>
    </div>

    <!-- Routines mode: filter slot (placeholder in Wave 1, filled in Wave 3) -->
    <div v-else-if="activeTab === 'routines'" class="assistant-sidebar__list">
      <slot name="routines">
        <p class="assistant-sidebar__hint">{{ t("assistant.sidebar.routinesFiltersSoon") }}</p>
      </slot>
    </div>

    <button
      v-if="!collapsed"
      type="button"
      class="assistant-sidebar__resize-handle"
      :aria-label="t('assistant.sidebar.resize')"
      @mousedown.prevent="(event) => emit('resize-start', event)"
    />
  </aside>
</template>
