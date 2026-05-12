<script setup>
defineProps({
  block: { type: Object, required: true }
});
</script>

<template>
  <article class="assistant-article-card">
    <div class="assistant-article-card__main">
      <a
        class="assistant-article-card__title"
        :href="block.url"
        target="_blank"
        rel="noreferrer"
      >
        {{ block.title }}
      </a>
      <p v-if="block.title_original" class="assistant-article-card__original">
        {{ block.title_original }}
      </p>
      <p class="assistant-article-card__summary">{{ block.summary }}</p>
    </div>
    <footer v-if="block.source_label || block.metrics?.length" class="assistant-article-card__meta">
      <span v-if="block.source_label">{{ block.source_label }}</span>
      <span v-for="metric in block.metrics || []" :key="`${metric.label}:${metric.value}`">
        {{ metric.value }} {{ metric.label }}
      </span>
    </footer>
  </article>
</template>

<style scoped>
.assistant-article-card {
  display: grid;
  gap: 9px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--text-secondary, #94a3b8) 22%, transparent);
  border-radius: 8px;
  background: var(--surface-1, #111827);
}

.assistant-article-card__main {
  display: grid;
  gap: 5px;
}

.assistant-article-card__title {
  color: var(--text-primary, #f8fafc);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  text-decoration: none;
}

.assistant-article-card__title:hover {
  text-decoration: underline;
}

.assistant-article-card__original,
.assistant-article-card__summary {
  margin: 0;
  color: var(--text-secondary, #9ca3af);
  font-size: 13px;
  line-height: 1.45;
}

.assistant-article-card__original {
  color: color-mix(in srgb, var(--text-secondary, #9ca3af) 80%, var(--text-primary, #f8fafc));
}

.assistant-article-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  color: var(--text-secondary, #9ca3af);
  font-size: 12px;
  line-height: 1.3;
}

.assistant-article-card__meta span + span::before {
  content: "·";
  margin-right: 10px;
  color: color-mix(in srgb, var(--text-secondary, #9ca3af) 65%, transparent);
}
</style>
