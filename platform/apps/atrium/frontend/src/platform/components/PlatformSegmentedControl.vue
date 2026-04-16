<script setup>
const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true
  },
  options: {
    type: Array,
    default: () => []
  },
  ariaLabel: {
    type: String,
    default: ""
  },
  size: {
    type: String,
    default: "md"
  },
  fullWidth: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["update:modelValue"]);

const optionIcon = (option) => option?.icon || null;
</script>

<template>
  <div
    class="platform-segmented-control"
    :class="[
      `platform-segmented-control--${size}`,
      { 'platform-segmented-control--full': fullWidth }
    ]"
    role="group"
    :aria-label="ariaLabel"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="platform-segmented-control__option"
      :class="{ active: modelValue === option.value }"
      :title="option.title || option.label"
      @click="emit('update:modelValue', option.value)"
    >
      <component :is="optionIcon(option)" v-if="optionIcon(option)" :size="size === 'sm' ? 12 : 13" />
      <span v-if="option.label">{{ option.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.platform-segmented-control {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 3px;
  min-height: 40px;
  padding: 3px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--border-default, rgba(255, 255, 255, 0.12)) 72%, transparent);
  background: color-mix(in srgb, var(--surface-overlay, #1a222c) 88%, transparent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 1px 0 rgba(0, 0, 0, 0.08);
}

.platform-segmented-control--sm {
  min-height: 34px;
  padding: 2px;
  border-radius: 10px;
}

.platform-segmented-control--full {
  width: 100%;
}

.platform-segmented-control__option {
  min-height: 30px;
  border: none;
  background: transparent;
  color: color-mix(in srgb, var(--ink-secondary, #94a3b8) 78%, transparent);
  border-radius: 9px;
  padding: 0 11px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  transition:
    background 150ms ease,
    color 150ms ease,
    transform 150ms ease,
    box-shadow 150ms ease;
}

.platform-segmented-control--sm .platform-segmented-control__option {
  min-height: 28px;
  padding: 0 10px;
  font-size: 11px;
  border-radius: 8px;
}

.platform-segmented-control__option:hover {
  color: var(--ink-primary, #f8fafc);
}

.platform-segmented-control__option.active {
  background: color-mix(in srgb, var(--glass-bg-hover, rgba(255, 255, 255, 0.12)) 86%, transparent);
  color: var(--ink-primary, #f8fafc);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    0 6px 16px rgba(0, 0, 0, 0.18);
}

@media (max-width: 720px) {
  .platform-segmented-control--full .platform-segmented-control__option {
    flex: 1 1 0;
  }
}
</style>
