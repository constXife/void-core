<script setup>
import { computed } from "vue";
import { useUiStore } from "../stores/ui.js";
import { storeToRefs } from "pinia";

const uiStore = useUiStore();
const {
  backgroundBlurDisabled,
  backgroundPixelated,
  bgA,
  bgB,
  showA
} = storeToRefs(uiStore);

const props = defineProps({
  tone: {
    type: String,
    required: true,
    validator: (value) => ["workspace", "auth", "assistant"].includes(value)
  }
});

const hasBackgroundA = computed(() => Boolean(bgA.value));
const hasBackgroundB = computed(() => Boolean(bgB.value));
const hasShellBackground = computed(() => hasBackgroundA.value || hasBackgroundB.value);
</script>

<template>
  <div
    v-if="hasBackgroundA"
    class="bg-layer"
    :class="{ 'bg-visible': showA }"
    :style="{
      backgroundImage: `url(${bgA})`,
      imageRendering: backgroundPixelated ? 'pixelated' : 'auto'
    }"
  ></div>
  <div
    v-if="hasBackgroundB"
    class="bg-layer"
    :class="{ 'bg-visible': !showA }"
    :style="{
      backgroundImage: `url(${bgB})`,
      imageRendering: backgroundPixelated ? 'pixelated' : 'auto'
    }"
  ></div>
  <div
    v-if="hasShellBackground"
    class="bg-overlay"
    :class="{ 'bg-overlay-no-blur': backgroundBlurDisabled }"
    :data-tone="props.tone"
  ></div>
</template>
