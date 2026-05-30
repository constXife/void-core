<script setup>
// DataTableBlock — render для layout-примитива `data.table`.
// Generic read-only таблица над list data slot с выбираемыми колонками. Колонки задаёт
// block.props.columns (enum в catalog); строки приходят уже adapted из slot dataset.
import { computed } from "vue";

const props = defineProps({
  // { id, block, region, props: { dataSlot, columns: string[] } }
  block: { type: Object, required: true },
  // Adapted dataset для list slot: { rows: [{ name, sku, location, quantity, status, updatedAt }] }
  data: { type: Object, default: () => ({}) },
  t: { type: Function, required: true }
});

const columns = computed(() => {
  const cols = props.block?.props?.columns;
  return Array.isArray(cols) && cols.length ? cols : [];
});
const rows = computed(() => (Array.isArray(props.data?.rows) ? props.data.rows : []));

function cell(row, column) {
  const raw = row?.[column];
  return raw === null || raw === undefined || raw === "" ? "—" : String(raw);
}
</script>

<template>
  <article class="data-table">
    <div v-if="!rows.length" class="data-table__empty" role="status">
      {{ t("surface.table.empty") }}
    </div>
    <table v-else class="data-table__table">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column" scope="col">
            {{ t(`surface.table.column.${column}`) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="row.id || index">
          <td v-for="column in columns" :key="column">{{ cell(row, column) }}</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>

<style scoped>
.data-table {
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 12px;
  background: var(--surface-elevated, color-mix(in srgb, #ffffff 4%, transparent));
  overflow: hidden;
}

.data-table__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table__table th,
.data-table__table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid color-mix(in srgb, currentColor 8%, transparent);
}

.data-table__table th {
  font-size: 11px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--text-muted, color-mix(in srgb, currentColor 65%, transparent));
  background: color-mix(in srgb, currentColor 4%, transparent);
}

.data-table__table td {
  color: var(--text-primary, #f8fafc);
}

.data-table__table tbody tr:last-child td {
  border-bottom: none;
}

.data-table__empty {
  padding: 24px;
  text-align: center;
  font-style: italic;
  font-size: 13px;
  color: var(--text-muted, color-mix(in srgb, currentColor 55%, transparent));
}
</style>
