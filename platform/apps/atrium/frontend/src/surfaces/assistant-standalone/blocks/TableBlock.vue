<script setup>
// TableBlock — render для generic skill-block `table.v1` (SkillBlock::Table).
// Self-contained: данные приходят инлайн в самом блоке (title/columns/rows/note),
// без внешнего fetch. Сравнение вариантов — частный случай: columns = критерии,
// rows = кандидаты (row.label = имя варианта).
//
// Контент уже локализован skill'ом (модель эмитит в requested locale), поэтому через
// t() ничего не прогоняем; `t` принимаем для единообразия сигнатуры block-рендеров.
import { computed } from "vue";

const props = defineProps({
  // { type: "table", title, subtitle?, columns: [{key,label}], rows: [{label, cells:[{column,value}], highlight}], note? }
  block: { type: Object, required: true },
  t: { type: Function, required: true }
});

const columns = computed(() =>
  Array.isArray(props.block?.columns) ? props.block.columns : []
);
const rows = computed(() => (Array.isArray(props.block?.rows) ? props.block.rows : []));

function cellValue(row, columnKey) {
  const cells = Array.isArray(row?.cells) ? row.cells : [];
  const found = cells.find((cell) => cell?.column === columnKey);
  const raw = found?.value;
  return raw === null || raw === undefined || raw === "" ? "—" : String(raw);
}
</script>

<template>
  <article class="skill-table">
    <header v-if="block.title || block.subtitle" class="skill-table__header">
      <h3 v-if="block.title" class="skill-table__title">{{ block.title }}</h3>
      <p v-if="block.subtitle" class="skill-table__subtitle">{{ block.subtitle }}</p>
    </header>

    <div class="skill-table__scroll">
      <table class="skill-table__table">
        <thead>
          <tr>
            <th scope="col" class="skill-table__corner"></th>
            <th v-for="column in columns" :key="column.key" scope="col">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in rows"
            :key="`${row.label}-${index}`"
            :class="{ 'skill-table__row--highlight': row.highlight }"
          >
            <th scope="row" class="skill-table__row-head">{{ row.label }}</th>
            <td v-for="column in columns" :key="column.key">
              {{ cellValue(row, column.key) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="block.note" class="skill-table__note">{{ block.note }}</p>
  </article>
</template>

<style scoped>
.skill-table {
  display: grid;
  gap: 12px;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 12px;
  background: var(--surface-elevated, color-mix(in srgb, #ffffff 4%, transparent));
  padding: 14px;
  overflow: hidden;
}

.skill-table__header {
  display: grid;
  gap: 3px;
}

.skill-table__title {
  margin: 0;
  color: var(--text-primary, #f8fafc);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
}

.skill-table__subtitle {
  margin: 0;
  color: var(--text-secondary, #9ca3af);
  font-size: 13px;
  line-height: 1.35;
}

.skill-table__scroll {
  overflow-x: auto;
}

.skill-table__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.skill-table__table th,
.skill-table__table td {
  padding: 10px 14px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid color-mix(in srgb, currentColor 8%, transparent);
}

.skill-table__table thead th {
  font-size: 11px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--text-muted, color-mix(in srgb, currentColor 65%, transparent));
  background: color-mix(in srgb, currentColor 4%, transparent);
}

.skill-table__corner {
  background: transparent !important;
}

.skill-table__row-head {
  font-weight: 600;
  color: var(--text-primary, #f8fafc);
  white-space: nowrap;
}

.skill-table__table td {
  color: var(--text-primary, #f8fafc);
}

.skill-table__table tbody tr:last-child th,
.skill-table__table tbody tr:last-child td {
  border-bottom: none;
}

.skill-table__row--highlight th,
.skill-table__row--highlight td {
  background: color-mix(in srgb, #22c55e 12%, transparent);
}

.skill-table__note {
  margin: 0;
  color: var(--text-secondary, #9ca3af);
  font-size: 12px;
  line-height: 1.45;
  font-style: italic;
}
</style>
