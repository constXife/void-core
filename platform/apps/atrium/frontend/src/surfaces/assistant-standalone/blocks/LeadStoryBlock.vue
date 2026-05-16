<script setup>
import { metricKey, metricLabel } from "./newspaperBlock.js";

const props = defineProps({
  block: { type: Object, required: true },
  t: { type: Function, required: true }
});

const t = (key, vars = {}) => props.t(key, vars);
</script>

<template>
  <article class="assistant-lead-story">
    <div class="assistant-lead-story__label">{{ block.kicker || t("assistant.newspaper.lead") }}</div>
    <a
      class="assistant-lead-story__title"
      :href="block.url"
      target="_blank"
      rel="noreferrer"
    >
      {{ block.title }}
    </a>
    <p v-if="block.deck" class="assistant-lead-story__summary">{{ block.deck }}</p>
    <footer class="assistant-lead-story__meta">
      <span v-if="block.source_label">{{ block.source_label }}</span>
      <span
        v-for="metric in block.metrics || []"
        :key="metricKey(metric)"
      >
        {{ metric.value }} {{ metricLabel(metric, t) }}
      </span>
      <span v-if="block.submitted_at_display">{{ block.submitted_at_display }}</span>
    </footer>
  </article>
</template>

<style scoped>
.assistant-lead-story {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--line-medium, rgba(255, 255, 255, 0.10));
  border-radius: var(--radius-md, 8px);
  background: color-mix(in srgb, var(--surface-elev-1, #11161f) 88%, var(--accent-cyan, #06b6d4) 12%);
}

.assistant-lead-story__label {
  color: var(--accent-cyan, #06b6d4);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  text-transform: uppercase;
}

.assistant-lead-story__title {
  color: var(--ink-primary, #e6edf3);
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
  text-decoration: none;
}

.assistant-lead-story__title:hover {
  text-decoration: underline;
}

.assistant-lead-story__summary {
  margin: 0;
  color: var(--ink-secondary, rgba(230, 237, 243, 0.66));
  font-size: 13px;
  line-height: 1.45;
}

.assistant-lead-story__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  color: var(--ink-tertiary, rgba(230, 237, 243, 0.42));
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  line-height: 1.3;
}

.assistant-lead-story__meta span + span::before {
  content: "·";
  margin-right: 10px;
  color: var(--line-strong, rgba(255, 255, 255, 0.18));
}
</style>
