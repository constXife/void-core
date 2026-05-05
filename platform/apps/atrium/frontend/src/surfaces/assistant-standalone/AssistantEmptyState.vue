<script setup>
import { Sparkles } from "lucide-vue-next";

defineProps({
  suggestions: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["choose"]);
</script>

<template>
  <section class="assistant-empty">
    <div class="assistant-empty__hero">
      <Sparkles :size="28" class="assistant-empty__icon" />
      <h1 class="assistant-empty__title">Void Assistant</h1>
      <p class="assistant-empty__subtitle">Спроси что угодно или начни с подсказки.</p>
    </div>

    <div v-if="suggestions.length" class="assistant-empty__suggestions">
      <button
        v-for="suggestion in suggestions"
        :key="suggestion"
        type="button"
        class="assistant-empty__chip"
        @click="emit('choose', suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>
  </section>
</template>
