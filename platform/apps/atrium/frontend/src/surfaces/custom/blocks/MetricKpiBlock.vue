<script setup>
// MetricKpiBlock — render для layout-примитива `metric.kpi`.
// Читает одну метрику (field) из stats data slot (inventory.dashboard.stats) + опциональный label.
// Generic primitive: несколько штук в header дают stats summary без монолитного product-блока.
import { computed } from "vue";

const props = defineProps({
  // PageSpec block instance: { id, block, region, props: { dataSlot, field, label? } }
  block: { type: Object, required: true },
  // Adapted slot dataset для inventory.dashboard.stats: { totalItems, lowStockCount, ... }
  data: { type: Object, default: () => ({}) },
  t: { type: Function, required: true }
});

const field = computed(() => props.block?.props?.field || "");
const value = computed(() => {
  const raw = props.data?.[field.value];
  return Number.isFinite(raw) ? raw : null;
});
const label = computed(
  () => props.block?.props?.label || props.t(`surface.metric.field.${field.value}`)
);
</script>

<template>
  <article class="metric-kpi">
    <span class="metric-kpi__value">{{ value === null ? "—" : value }}</span>
    <span class="metric-kpi__label">{{ label }}</span>
  </article>
</template>

<style scoped>
.metric-kpi {
  display: grid;
  gap: 4px;
  padding: 16px 18px;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 12px;
  background: var(--surface-elevated, color-mix(in srgb, #ffffff 4%, transparent));
}

.metric-kpi__value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--text-primary, #f8fafc);
  font-variant-numeric: tabular-nums;
}

.metric-kpi__label {
  font-size: 12px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--text-muted, color-mix(in srgb, currentColor 65%, transparent));
}
</style>
