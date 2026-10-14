<script setup>

const props = defineProps({
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
      <h1 class="assistant-empty__title">{{ t("assistant.empty.title") }}</h1>
      <p class="assistant-empty__subtitle">{{ t("assistant.empty.subtitle") }}</p>
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
