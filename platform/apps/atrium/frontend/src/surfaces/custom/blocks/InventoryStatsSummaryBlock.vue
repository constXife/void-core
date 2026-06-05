<script setup>
// InventoryStatsSummaryBlock — render для product-блока `inventory.stats_summary`.
// Читает массив metric-ключей (block.props.metrics) из stats data slot и рендерит ряд KPI-карточек.
// Generic: «несколько метрик из stats slot» — то же, что metric.kpi × N, но конфигурируется одним блоком.
import { computed } from "vue";

const props = defineProps({
  // { id, block, region, props: { dataSlot, metrics: string[] } }
  block: { type: Object, required: true },
  // Adapted dataset для inventory.dashboard.stats: { totalItems, lowStockCount, missingCount, recentChangesCount }
  data: { type: Object, default: () => ({}) },
  t: { type: Function, required: true }
});

const metrics = computed(() => {
  const list = props.block?.props?.metrics;
  return Array.isArray(list) && list.length ? list : [];
});

function valueFor(metric) {
  const raw = props.data?.[metric];
  return Number.isFinite(raw) ? raw : null;
}
</script>

<template>
  <article class="stats-summary">
    <div v-for="metric in metrics" :key="metric" class="stats-summary__card">
      <span class="stats-summary__value">{{ valueFor(metric) === null ? "—" : valueFor(metric) }}</span>
      <span class="stats-summary__label">{{ t(`surface.metric.field.${metric}`) }}</span>
    </div>
  </article>
</template>

<style scoped>
.stats-summary {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 12px;
}

.stats-summary__card {
  display: grid;
  gap: 4px;
  padding: 16px 18px;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 12px;
  background: var(--surface-elevated, color-mix(in srgb, #ffffff 4%, transparent));
}

.stats-summary__value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--ink-primary, #f8fafc);
  font-variant-numeric: tabular-nums;
}

.stats-summary__label {
  font-size: 12px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ink-muted, color-mix(in srgb, currentColor 65%, transparent));
}

@media (max-width: 720px) {
  .stats-summary {
    grid-auto-flow: row;
  }
}
</style>
