<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  content: {
    type: String,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  placement: {
    type: String,
    default: "top"
  },
  delay: {
    type: Number,
    default: 60
  },
  offset: {
    type: Number,
    default: 8
  }
});

const triggerRef = ref(null);
const tooltipRef = ref(null);
const visible = ref(false);
const style = ref({});
let showTimer = null;
let hideTimer = null;

const clearTimers = () => {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
};

const updatePosition = () => {
  const trigger = triggerRef.value;
  const tooltip = tooltipRef.value;
  if (!trigger || !tooltip) return;

  const rect = trigger.getBoundingClientRect();
  const tipRect = tooltip.getBoundingClientRect();
  const gap = props.offset;
  let top = rect.top - tipRect.height - gap;
  let left = rect.left + (rect.width - tipRect.width) / 2;

  if (props.placement === "bottom" || top < 8) {
    top = rect.bottom + gap;
  }

  left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - tipRect.height - 8));

  style.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`
  };
};

const show = async () => {
  if (props.disabled) return;
  clearTimers();
  showTimer = setTimeout(async () => {
    visible.value = true;
    await nextTick();
    updatePosition();
  }, props.delay);
};

const hide = () => {
  clearTimers();
  hideTimer = setTimeout(() => {
    visible.value = false;
  }, 80);
};

const handleReposition = () => {
  if (!visible.value) return;
  updatePosition();
};

watch(visible, (value) => {
  if (value) {
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
  } else {
    window.removeEventListener("scroll", handleReposition, true);
    window.removeEventListener("resize", handleReposition);
  }
});

watch(
  () => props.disabled,
  (value) => {
    if (value) {
      visible.value = false;
      clearTimers();
    }
  }
);

onBeforeUnmount(() => {
  clearTimers();
  window.removeEventListener("scroll", handleReposition, true);
  window.removeEventListener("resize", handleReposition);
});
</script>

<template>
  <span
    ref="triggerRef"
    class="tooltip-trigger"
    @mouseenter="show"
    @mouseleave="hide"
    @focus="show"
    @blur="hide"
  >
    <slot />
  </span>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="tooltipRef"
      class="tooltip-bubble"
      role="tooltip"
      :style="style"
    >{{ content }}</div>
  </Teleport>
</template>
