<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { MoreHorizontal, Pencil, Trash2, RotateCcw } from "lucide-vue-next";

const props = defineProps({
  session: { type: Object, required: true },
  active: { type: Boolean, default: false },
  trashed: { type: Boolean, default: false },
  t: { type: Function, required: true }
});

const emit = defineEmits(["select", "rename", "delete", "restore"]);

const menuOpen = ref(false);
const rootRef = ref(null);
const t = (key, vars = {}) => props.t(key, vars);

const placeholderTitle = computed(() => t("assistant.sidebar.untitled"));

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

const onDocumentPointerDown = (event) => {
  if (!menuOpen.value) return;
  if (rootRef.value?.contains(event.target)) return;
  closeMenu();
};

const onDocumentKeydown = (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
};

onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  document.addEventListener("keydown", onDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  document.removeEventListener("keydown", onDocumentKeydown);
});
</script>

<template>
  <div
    ref="rootRef"
    class="assistant-sidebar-item"
    :class="{
      'assistant-sidebar-item--active': active,
      'assistant-sidebar-item--trashed': trashed
    }"
    @click.stop="onSelect"
  >
    <span class="assistant-sidebar-item__title" :title="session.title">
      {{ session.title || placeholderTitle }}
    </span>

    <button
      type="button"
      class="assistant-sidebar-item__menu-trigger"
      :aria-label="t('assistant.sidebar.openMenu')"
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
        <span>{{ t("assistant.sidebar.rename") }}</span>
      </button>
      <button
        v-if="!trashed"
        type="button"
        class="assistant-sidebar-item__menu-action assistant-sidebar-item__menu-action--danger"
        @click="onDelete"
      >
        <Trash2 :size="14" />
        <span>{{ t("assistant.sidebar.delete") }}</span>
      </button>
      <button
        v-if="trashed"
        type="button"
        class="assistant-sidebar-item__menu-action"
        @click="onRestore"
      >
        <RotateCcw :size="14" />
        <span>{{ t("assistant.sidebar.restore") }}</span>
      </button>
    </div>
  </div>
</template>
