<script setup>
// InventoryFilterPanelBlock — render для product-блока `inventory.filter_panel`.
// Read-only: показывает включённые фильтры (block.props.enabledFilters) как статичные chip'ы.
// Фильтры не мутируют данные и пока не интерактивны в render path (read-only surface) — это
// affordance-витрина того, какие фильтры объявлены. Интерактивная фильтрация — future slice.
import { computed } from "vue";

const props = defineProps({
  // { id, block, region, props: { dataSlot, enabledFilters: string[] } }
  block: { type: Object, required: true },
  // data не используется — filter panel объявляет фильтры, не читает rows.
  data: { type: Object, default: () => ({}) },
  t: { type: Function, required: true }
});

const filters = computed(() => {
  const list = props.block?.props?.enabledFilters;
  return Array.isArray(list) ? list : [];
});
</script>

<template>
  <article class="filter-panel">
    <h3 class="filter-panel__title">{{ t("surface.filter.title") }}</h3>
    <div v-if="!filters.length" class="filter-panel__empty" role="status">
      {{ t("surface.filter.empty") }}
    </div>
    <ul v-else class="filter-panel__chips">
      <li v-for="filter in filters" :key="filter" class="filter-panel__chip">
        {{ t(`surface.filter.option.${filter}`) }}
      </li>
    </ul>
  </article>
</template>

<style scoped>
.filter-panel {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 12px;
  background: var(--surface-elevated, color-mix(in srgb, #ffffff 4%, transparent));
}

.filter-panel__title {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ink-muted, color-mix(in srgb, currentColor 65%, transparent));
}

.filter-panel__chips {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-panel__chip {
  padding: 5px 12px;
  border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
  border-radius: 999px;
  font-size: 12px;
  color: var(--ink-primary, #f8fafc);
  background: color-mix(in srgb, currentColor 5%, transparent);
}

.filter-panel__empty {
  font-style: italic;
  font-size: 13px;
  color: var(--ink-muted, color-mix(in srgb, currentColor 55%, transparent));
}
</style>
