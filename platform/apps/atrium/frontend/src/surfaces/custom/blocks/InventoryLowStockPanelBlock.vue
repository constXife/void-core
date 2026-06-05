<script setup>
// InventoryLowStockPanelBlock — render для product-блока `inventory.low_stock_panel`.
// Компактный список позиций (read-only) из items data slot, ограниченный block.props.limit.
// v0: показывает первые N позиций (name + status); product-специфичная low-stock фильтрация по
// threshold — future enrichment (backend сейчас не отдаёт low-stock флаг отдельно).
import { computed } from "vue";

const props = defineProps({
  // { id, block, region, props: { dataSlot, threshold?, limit } }
  block: { type: Object, required: true },
  // Adapted dataset для inventory.items.list: { rows: [{ name, status, ... }] }
  data: { type: Object, default: () => ({}) },
  t: { type: Function, required: true }
});

const limit = computed(() => {
  const raw = props.block?.props?.limit;
  return Number.isFinite(raw) && raw > 0 ? raw : 10;
});
const rows = computed(() => {
  const all = Array.isArray(props.data?.rows) ? props.data.rows : [];
  return all.slice(0, limit.value);
});
</script>

<template>
  <article class="low-stock">
    <h3 class="low-stock__title">{{ t("surface.low_stock.title") }}</h3>
    <div v-if="!rows.length" class="low-stock__empty" role="status">
      {{ t("surface.low_stock.empty") }}
    </div>
    <ul v-else class="low-stock__list">
      <li v-for="(row, index) in rows" :key="row.id || index" class="low-stock__item">
        <span class="low-stock__name">{{ row.name }}</span>
        <span v-if="row.status" class="low-stock__status">{{ row.status }}</span>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.low-stock {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 12px;
  background: var(--surface-elevated, color-mix(in srgb, #ffffff 4%, transparent));
}

.low-stock__title {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ink-muted, color-mix(in srgb, currentColor 65%, transparent));
}

.low-stock__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.low-stock__item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-primary, #f8fafc);
}

.low-stock__status {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--ink-muted, color-mix(in srgb, currentColor 60%, transparent));
}

.low-stock__empty {
  font-style: italic;
  font-size: 13px;
  color: var(--ink-muted, color-mix(in srgb, currentColor 55%, transparent));
}
</style>
