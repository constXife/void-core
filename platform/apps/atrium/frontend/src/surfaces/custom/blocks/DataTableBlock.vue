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
          <td v-for="column in columns" :key="column">
            <span
              v-if="column === 'status' && row[column]"
              class="data-table__status"
              :data-status="String(row[column]).toLowerCase()"
            >{{ cell(row, column) }}</span>
            <template v-else>{{ cell(row, column) }}</template>
          </td>
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

/* Status badge — generic colour cues по типичным значениям статуса; неизвестные → neutral. */
.data-table__status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
  background: color-mix(in srgb, currentColor 12%, transparent);
  color: var(--text-muted, color-mix(in srgb, currentColor 70%, transparent));
}

.data-table__status[data-status="ok"],
.data-table__status[data-status="fresh"],
.data-table__status[data-status="active"] {
  background: color-mix(in srgb, #22c55e 18%, transparent);
  color: #86efac;
}

.data-table__status[data-status="low"],
.data-table__status[data-status="opened"] {
  background: color-mix(in srgb, #f59e0b 18%, transparent);
  color: #fcd34d;
}

.data-table__status[data-status="missing"],
.data-table__status[data-status="expired"],
.data-table__status[data-status="discarded"] {
  background: color-mix(in srgb, #ef4444 18%, transparent);
  color: #fca5a5;
}
</style>
