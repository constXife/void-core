<script setup>
import { Sparkles } from "lucide-vue-next";

defineProps({
  suggestions: {
    type: Array,
    default: () => []
  },
  t: { type: Function, required: true }
});

const emit = defineEmits(["choose"]);
</script>

<template>
  <section class="assistant-empty">
    <div class="assistant-empty__hero">
      <Sparkles :size="28" class="assistant-empty__icon" />
      <h1 class="assistant-empty__title">Void Assistant</h1>
      <p class="assistant-empty__subtitle">{{ t("assistant.empty.subtitle") }}</p>
    </div>

    <div class="assistant-empty__privacy" role="note">
      <p>
        {{ t("assistant.empty.providerNotice") }}
      </p>
      <p>{{ t("assistant.empty.reliabilityNotice") }}</p>
    </div>

    <div v-if="suggestions.length" class="assistant-empty__suggestions">
      <button
        v-for="(suggestion, index) in suggestions"
        :key="suggestion"
        type="button"
        class="assistant-empty__chip"
        :style="{ '--chip-index': index }"
        @click="emit('choose', suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>
  </section>
</template>
