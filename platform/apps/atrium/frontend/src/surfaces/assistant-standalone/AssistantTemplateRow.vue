<script setup>
import { computed } from "vue";

const props = defineProps({
  template: { type: Object, required: true }
});

const emit = defineEmits(["enable", "go-to-routine"]);

const isEnabled = computed(() => Boolean(props.template.enabled_instance_id));

const onPrimary = () => {
  if (isEnabled.value) {
    emit("go-to-routine", props.template.enabled_instance_id);
  } else {
    emit("enable", props.template.id);
  }
};
</script>

<template>
  <div class="assistant-template-row">
    <div class="assistant-template-row__main">
      <div class="assistant-template-row__name">{{ template.name }}</div>
      <div class="assistant-template-row__sub">
        {{ template.trigger_kind }} · {{ template.trigger_label }}
      </div>
    </div>
    <span
      class="assistant-template-row__status"
      :class="{ 'assistant-template-row__status--on': isEnabled }"
    >
      {{ isEnabled ? "routine enabled" : "не включено" }}
    </span>
    <button
      type="button"
      class="assistant-template-row__action"
      :class="{ 'assistant-template-row__action--ghost': isEnabled }"
      @click="onPrimary"
    >
      {{ isEnabled ? "View routine →" : "Enable…" }}
    </button>
  </div>
</template>
