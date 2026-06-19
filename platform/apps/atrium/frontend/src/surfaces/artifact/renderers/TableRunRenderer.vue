<script setup>
// TableRunRenderer — fullscreen renderer для skill artifact schema=table.v1.
// Бэкенд для full layout отдаёт ровно один self-contained Table block (table_full_layout),
// поэтому переиспользуем BlockRenderer → TableBlock, как DigestRunRenderer.
//
// table.v1 обычно рендерится инлайн в чате; эта страница нужна для прямого перехода
// по /artifacts/:id (share/bookmark) — раньше тут была ошибка «Неподдерживаемая schema».
import { computed } from "vue";

import BlockRenderer from "../../assistant-standalone/blocks/BlockRenderer.vue";

const props = defineProps({
  envelope: { type: Object, required: true },
  t: { type: Function, required: true }
});

const blocks = computed(() => props.envelope?.blocks || []);
</script>

<template>
  <article class="table-run">
    <BlockRenderer :blocks="blocks" :t="t" />
  </article>
</template>

<style scoped>
.table-run {
  max-width: 880px;
  margin: 0 auto;
  padding: 32px 24px 96px;
  color: var(--text-primary, #f8fafc);
}

.table-run :deep(.assistant-blocks) {
  /* Снимаем chat-width ограничение BlockRenderer — таблица занимает всю страницу. */
  width: 100%;
  max-width: none;
}
</style>
