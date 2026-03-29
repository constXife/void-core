<script setup>
defineProps({
  t: {
    type: Function,
    required: true
  }
});

defineEmits(["privacy"]);
</script>

<template>
  <footer class="trust-footer trust-footer-global">
    <button type="button" class="trust-footer-link" @click="$emit('privacy')">
      {{ t("app.privacy") }}
    </button>
  </footer>
</template>
