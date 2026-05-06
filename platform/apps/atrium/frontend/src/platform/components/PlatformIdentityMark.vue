<script setup>
import { computed } from "vue";

const props = defineProps({
  identity: {
    type: Object,
    required: true
  },
  size: {
    type: [Number, String],
    required: true
  },
  rounded: {
    type: [Number, String],
    required: true
  }
});

const mark = computed(() => props.identity.mark);
const rootStyle = computed(() => ({
  borderRadius: typeof props.rounded === "number" ? `${props.rounded}px` : props.rounded
}));
</script>

<template>
  <svg
    class="platform-identity-mark"
    :width="size"
    :height="size"
    :viewBox="mark.viewBox"
    fill="none"
    aria-hidden="true"
    :style="rootStyle"
  >
    <rect
      v-if="mark.background"
      :width="mark.background.width"
      :height="mark.background.height"
      :rx="mark.background.rx"
      :fill="mark.background.fill"
    />
    <path
      v-for="path in mark.paths"
      :key="path.d"
      :d="path.d"
      :stroke="path.stroke"
      :stroke-width="path.strokeWidth"
      :stroke-linecap="path.strokeLinecap"
      :stroke-linejoin="path.strokeLinejoin"
      :fill="path.fill"
    />
  </svg>
</template>
