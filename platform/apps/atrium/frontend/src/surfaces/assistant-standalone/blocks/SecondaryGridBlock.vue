<script setup>
import { metricKey, metricLabel } from "./newspaperBlock.js";

const props = defineProps({
  block: { type: Object, required: true },
  t: { type: Function, required: true }
});

const t = (key, vars = {}) => props.t(key, vars);
</script>

<template>
  <section class="assistant-secondary-grid" :aria-label="t('assistant.newspaper.secondary')">
    <article
      v-for="item in block.items || []"
      :key="`${item.title}:${item.url}`"
      class="assistant-secondary-grid__item"
    >
      <a
        class="assistant-secondary-grid__title"
        :href="item.url"
        target="_blank"
        rel="noreferrer"
      >
        {{ item.title }}
      </a>
      <div v-if="item.kicker" class="assistant-secondary-grid__kicker">{{ item.kicker }}</div>
      <p v-if="item.summary" class="assistant-secondary-grid__summary">{{ item.summary }}</p>
      <footer class="assistant-secondary-grid__meta">
        <span v-if="item.source_label">{{ item.source_label }}</span>
        <span
          v-for="metric in item.metrics || []"
          :key="metricKey(metric)"
        >
          {{ metric.value }} {{ metricLabel(metric, t) }}
        </span>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.assistant-secondary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.assistant-secondary-grid__item {
  display: grid;
  align-content: start;
  gap: 7px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--line-soft, rgba(255, 255, 255, 0.06));
  border-radius: var(--radius-md, 8px);
  background: var(--surface-elev-1, #11161f);
}

.assistant-secondary-grid__kicker {
  color: var(--ink-tertiary, rgba(230, 237, 243, 0.42));
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 11px;
  line-height: 1.25;
}

.assistant-secondary-grid__title {
  color: var(--ink-primary, #e6edf3);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  text-decoration: none;
}

.assistant-secondary-grid__title:hover {
  text-decoration: underline;
}

.assistant-secondary-grid__summary {
  margin: 0;
  color: var(--ink-secondary, rgba(230, 237, 243, 0.66));
  font-size: 13px;
  line-height: 1.45;
}

.assistant-secondary-grid__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  color: var(--ink-tertiary, rgba(230, 237, 243, 0.42));
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  line-height: 1.3;
}

.assistant-secondary-grid__meta span + span::before {
  content: "·";
  margin-right: 10px;
  color: var(--line-strong, rgba(255, 255, 255, 0.18));
}
</style>
