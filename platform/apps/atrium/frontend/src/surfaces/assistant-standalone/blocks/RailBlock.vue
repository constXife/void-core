<script setup>
const props = defineProps({
  block: { type: Object, required: true },
  t: { type: Function, required: true }
});

const t = (key, vars = {}) => props.t(key, vars);
</script>

<template>
  <aside class="assistant-rail-block" :aria-label="t('assistant.newspaper.rail')">
    <div class="assistant-rail-block__title">{{ t("assistant.newspaper.rail") }}</div>
    <ul class="assistant-rail-block__list">
      <li v-for="item in block.items || []" :key="`${item.title}:${item.url}`">
        <span v-if="item.kicker" class="assistant-rail-block__kicker">{{ item.kicker }}</span>
        <a :href="item.url" target="_blank" rel="noreferrer">{{ item.title }}</a>
        <span v-if="item.metric_line">{{ item.metric_line }}</span>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.assistant-rail-block {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--line-soft, rgba(255, 255, 255, 0.06));
  border-radius: var(--radius-md, 8px);
  background: color-mix(in srgb, var(--surface-elev-1, #11161f) 90%, var(--surface-elev-3, #1f2937) 10%);
}

.assistant-rail-block__title {
  color: var(--ink-tertiary, rgba(230, 237, 243, 0.42));
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  text-transform: uppercase;
}

.assistant-rail-block__list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.assistant-rail-block li {
  display: grid;
  gap: 2px;
}

.assistant-rail-block a {
  color: var(--ink-primary, #e6edf3);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
  text-decoration: none;
}

.assistant-rail-block a:hover {
  text-decoration: underline;
}

.assistant-rail-block span {
  color: var(--ink-tertiary, rgba(230, 237, 243, 0.42));
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  line-height: 1.3;
}

.assistant-rail-block__kicker {
  color: var(--accent-cyan, #06b6d4);
}
</style>
