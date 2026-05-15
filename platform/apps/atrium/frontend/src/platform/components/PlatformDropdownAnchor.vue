<script>
const DROPDOWN_OPEN_EVENT = "platform-dropdown-anchor:open";
let nextDropdownAnchorId = 0;
</script>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";

const props = defineProps({
  align: {
    type: String,
    default: "right"
  },
  open: {
    type: Boolean,
    default: false
  },
  panelClass: {
    type: [String, Array, Object],
    default: ""
  }
});

const emit = defineEmits(["update:open"]);

const rootEl = ref(null);
const anchorId = ++nextDropdownAnchorId;

const close = () => {
  emit("update:open", false);
};

const openDropdown = () => {
  document.dispatchEvent(
    new CustomEvent(DROPDOWN_OPEN_EVENT, {
      detail: { anchorId }
    })
  );
  emit("update:open", true);
};

const toggle = () => {
  if (props.open) {
    close();
  } else {
    openDropdown();
  }
};

const contains = (target) => Boolean(rootEl.value?.contains?.(target));

const handleDocumentClick = (event) => {
  if (!props.open) return;
  if (contains(event?.target)) return;
  close();
};

const handleSiblingOpen = (event) => {
  if (!props.open) return;
  if (event?.detail?.anchorId === anchorId) return;
  close();
};

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener(DROPDOWN_OPEN_EVENT, handleSiblingOpen);
});

onUnmounted(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener(DROPDOWN_OPEN_EVENT, handleSiblingOpen);
});

defineExpose({
  contains,
  rootEl
});
</script>

<template>
  <div ref="rootEl" class="platform-dropdown-anchor">
    <slot
      name="trigger"
      :close="close"
      :open="openDropdown"
      :toggle="toggle"
    />

    <Transition name="platform-dropdown">
      <div
        v-if="props.open"
        class="platform-dropdown-anchor__panel"
        :class="[
          panelClass,
          align === 'left'
            ? 'platform-dropdown-anchor__panel--left'
            : 'platform-dropdown-anchor__panel--right'
        ]"
      >
        <slot
          name="dropdown"
          :close="close"
          :open="openDropdown"
          :toggle="toggle"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.platform-dropdown-anchor {
  position: relative;
}

.platform-dropdown-anchor__panel {
  position: absolute;
  top: calc(100% + 0.55rem);
  z-index: 40;
}

.platform-dropdown-anchor__panel--left {
  left: 0;
}

.platform-dropdown-anchor__panel--right {
  right: 0;
}

.platform-dropdown-enter-active,
.platform-dropdown-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.platform-dropdown-enter-from,
.platform-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-0.35rem) scale(0.98);
}
</style>
