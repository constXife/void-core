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
  activeTab: { type: String, default: "chat" }
});

const emit = defineEmits([
  "new-chat",
  "select",
  "rename",
  "delete",
  "restore",
  "open-trash",
  "toggle-collapsed",
  "resize-start"
]);

const trashOpen = ref(false);

const isEmpty = computed(() => !props.loading && props.groups.length === 0);

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
        title="Развернуть сайдбар"
        aria-label="Expand sidebar"
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
          title="Свернуть сайдбар"
          aria-label="Collapse sidebar"
          @click="emit('toggle-collapsed')"
        >
          <PanelLeftClose :size="14" />
        </button>
      </template>
    </div>

    <div v-if="activeTab === 'chat'" class="assistant-sidebar__top">
      <button
        type="button"
        class="assistant-sidebar__new"
        :title="collapsed ? 'Новый чат' : ''"
        @click="emit('new-chat')"
      >
        <Plus :size="14" />
        <span class="assistant-sidebar__new-label">Новый чат</span>
      </button>
    </div>

    <!-- Chat mode: history list + trash -->
    <template v-if="activeTab === 'chat'">
      <div class="assistant-sidebar__list">
        <p v-if="loading && groups.length === 0" class="assistant-sidebar__hint">
          Загружаем чаты…
        </p>
        <p v-else-if="isEmpty" class="assistant-sidebar__hint">
          Здесь будут ваши чаты.
        </p>

        <div
          v-for="group in groups"
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
          <span>Корзина</span>
          <span class="assistant-sidebar__trash-count" v-if="trashed.length">{{ trashed.length }}</span>
        </button>
        <div v-if="trashOpen" class="assistant-sidebar__trash-list">
          <p v-if="!trashedLoaded" class="assistant-sidebar__hint">Загружаем…</p>
          <p v-else-if="trashed.length === 0" class="assistant-sidebar__hint">
            Корзина пуста.
          </p>
          <AssistantSidebarItem
            v-for="session in trashed"
            :key="session.id"
            :session="session"
            trashed
            @restore="(session) => emit('restore', session)"
          />
        </div>
      </div>
    </template>

    <!-- Capabilities mode: filter slot (placeholder in Wave 1, filled in Wave 2) -->
    <div v-else-if="activeTab === 'capabilities'" class="assistant-sidebar__list">
      <slot name="capabilities">
        <p class="assistant-sidebar__hint">Фильтры появятся в Wave 2.</p>
      </slot>
    </div>

    <!-- Routines mode: filter slot (placeholder in Wave 1, filled in Wave 3) -->
    <div v-else-if="activeTab === 'routines'" class="assistant-sidebar__list">
      <slot name="routines">
        <p class="assistant-sidebar__hint">Фильтры появятся в Wave 3.</p>
      </slot>
    </div>

    <button
      v-if="!collapsed"
      type="button"
      class="assistant-sidebar__resize-handle"
      :aria-label="'Resize sidebar'"
      @mousedown.prevent="(event) => emit('resize-start', event)"
    />
  </aside>
</template>
