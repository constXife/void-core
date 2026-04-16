<script setup>
const props = defineProps({
  label: {
    type: String,
    default: ""
  },
  icon: {
    type: [Object, Function],
    default: null
  },
  compact: {
    type: Boolean,
    default: false
  }
});
</script>

<template>
  <div class="platform-settings-row" :class="{ 'platform-settings-row--compact': compact }">
    <div class="platform-settings-row__label">
      <slot name="label">
        <component :is="icon" v-if="icon" :size="14" />
        <span>{{ label }}</span>
      </slot>
    </div>

    <div class="platform-settings-row__control">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.platform-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
}

.platform-settings-row--compact {
  padding: 2px 0;
}

.platform-settings-row__label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: color-mix(in srgb, var(--ink-secondary, #94a3b8) 86%, transparent);
  font-size: 13px;
  line-height: 1.4;
}

.platform-settings-row__control {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
}
</style>
