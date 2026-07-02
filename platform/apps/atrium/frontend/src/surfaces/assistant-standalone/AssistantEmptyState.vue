<script setup>
import { computed } from "vue";
import { Sparkles } from "lucide-vue-next";
import { resolvePlatformAccount } from "../../platform/account.js";

const props = defineProps({
  suggestions: {
    type: Array,
    default: () => []
  },
  currentUser: { type: Object, default: null },
  t: { type: Function, required: true }
});

const emit = defineEmits(["choose"]);

// Имя резидента для приветствия: берём display-name (не email), первое слово.
const firstName = computed(() => {
  const account = props.currentUser ? resolvePlatformAccount(props.currentUser) : null;
  const display = account?.displayName || "";
  return display ? display.split(/\s+/)[0] : "";
});

// Бакет времени суток — слово приветствия локализуемо, имя приклеивается кодом.
const greeting = computed(() => {
  const hour = new Date().getHours();
  let bucket = "night";
  if (hour >= 5 && hour < 12) bucket = "morning";
  else if (hour >= 12 && hour < 18) bucket = "afternoon";
  else if (hour >= 18 && hour < 23) bucket = "evening";
  const word = props.t(`assistant.empty.greeting.${bucket}`);
  return firstName.value ? `${word}, ${firstName.value}` : word;
});
</script>

<template>
  <section class="assistant-empty">
    <div class="assistant-empty__hero">
      <Sparkles :size="28" class="assistant-empty__icon" />
      <h1 class="assistant-empty__title">{{ greeting }}</h1>
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
