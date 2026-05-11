<script setup>
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
</script>

<template>
  <div
    class="bg-layer"
    :class="{ 'bg-visible': showA }"
    :style="{
      backgroundImage: bgA ? `url(${bgA})` : 'none',
      imageRendering: backgroundPixelated ? 'pixelated' : 'auto'
    }"
  ></div>
  <div
    class="bg-layer"
    :class="{ 'bg-visible': !showA }"
    :style="{
      backgroundImage: bgB ? `url(${bgB})` : 'none',
      imageRendering: backgroundPixelated ? 'pixelated' : 'auto'
    }"
  ></div>
  <div
    class="bg-overlay"
    :class="{ 'bg-overlay-no-blur': backgroundBlurDisabled }"
    :data-tone="props.tone"
  ></div>
</template>
