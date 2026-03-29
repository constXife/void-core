<script setup>
import { RouterView } from "vue-router";
import TheShellBackdrop from "../components/TheShellBackdrop.vue";
import { useUiStore } from "../stores/ui.js";

const uiStore = useUiStore();
</script>

<template>
  <main class="spaces-root" :class="{ 'no-ui-blur': uiStore.backgroundBlurDisabled }">
    <TheShellBackdrop />
    <RouterView />
  </main>
</template>
