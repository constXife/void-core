<script setup>
import { ref } from "vue";
import { MoreHorizontal, Pencil, Trash2, RotateCcw } from "lucide-vue-next";

const props = defineProps({
  session: { type: Object, required: true },
  active: { type: Boolean, default: false },
  trashed: { type: Boolean, default: false }
});

const emit = defineEmits(["select", "rename", "delete", "restore"]);

const menuOpen = ref(false);

const placeholderTitle = "Без названия";

const onSelect = () => {
  if (props.trashed) return;
  emit("select", props.session.id);
};

const toggleMenu = (event) => {
  event.stopPropagation();
  menuOpen.value = !menuOpen.value;
};

const closeMenu = () => {
  menuOpen.value = false;
};

const onRename = () => {
  closeMenu();
  emit("rename", props.session);
};

const onDelete = () => {
  closeMenu();
  emit("delete", props.session);
};

const onRestore = () => {
  closeMenu();
  emit("restore", props.session);
};
</script>

<template>
  <div
    class="assistant-sidebar-item"
    :class="{
      'assistant-sidebar-item--active': active,
      'assistant-sidebar-item--trashed': trashed
    }"
    @click.stop="onSelect"
    @mouseleave="closeMenu"
  >
    <span class="assistant-sidebar-item__title" :title="session.title">
      {{ session.title || placeholderTitle }}
    </span>

    <button
      type="button"
      class="assistant-sidebar-item__menu-trigger"
      :aria-label="'Open chat menu'"
      @click="toggleMenu"
    >
      <MoreHorizontal :size="14" />
    </button>

    <div v-if="menuOpen" class="assistant-sidebar-item__menu" @click.stop>
      <button
        v-if="!trashed"
        type="button"
        class="assistant-sidebar-item__menu-action"
        @click="onRename"
      >
        <Pencil :size="14" />
        <span>Переименовать</span>
      </button>
      <button
        v-if="!trashed"
        type="button"
        class="assistant-sidebar-item__menu-action assistant-sidebar-item__menu-action--danger"
        @click="onDelete"
      >
        <Trash2 :size="14" />
        <span>Удалить</span>
      </button>
      <button
        v-if="trashed"
        type="button"
        class="assistant-sidebar-item__menu-action"
        @click="onRestore"
      >
        <RotateCcw :size="14" />
        <span>Восстановить</span>
      </button>
    </div>
  </div>
</template>
