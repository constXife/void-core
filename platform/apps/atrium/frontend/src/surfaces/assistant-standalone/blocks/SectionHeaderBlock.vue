<script setup>
defineProps({
  block: { type: Object, required: true }
});
</script>

<template>
  <header class="assistant-section-header">
    <h2>{{ block.text }}</h2>
    <p v-if="block.subtitle">{{ block.subtitle }}</p>
  </header>
</template>

<style scoped>
.assistant-section-header {
  display: grid;
  gap: 3px;
  padding-block: 2px;
}

.assistant-section-header h2 {
  margin: 0;
  color: var(--text-primary, #f8fafc);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
}

.assistant-section-header p {
  margin: 0;
  color: var(--text-secondary, #9ca3af);
  font-size: 13px;
  line-height: 1.35;
}
</style>
