<script setup>
import { RouterView } from "vue-router";
import TheGlobalToaster from "./components/TheGlobalToaster.vue";
</script>

<template>
  <TheGlobalToaster />
  <RouterView />
</template>
