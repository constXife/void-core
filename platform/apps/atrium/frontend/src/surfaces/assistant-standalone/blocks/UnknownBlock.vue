<script setup>
defineProps({
  block: { type: Object, required: true }
});
</script>

<template>
  <p class="assistant-unknown-block" role="alert">
    Неподдерживаемый блок: {{ block?.type || "unknown" }}
  </p>
</template>

<style scoped>
.assistant-unknown-block {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, #f97316 35%, transparent);
  border-radius: 8px;
  color: var(--text-primary, #f8fafc);
  background: color-mix(in srgb, #f97316 12%, transparent);
  font-size: 13px;
  line-height: 1.4;
}
</style>
