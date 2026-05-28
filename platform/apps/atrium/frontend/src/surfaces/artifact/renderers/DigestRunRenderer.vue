<script setup>
// DigestRunRenderer — fullscreen renderer для skill artifact schema=digest_run.v1.
// Это default schema когда /skill <name> вызывается без variant=newspaper.
// Reuse'ит existing BlockRenderer + ArticleCard blocks (через backend digest_cards_layout
// для ?layout=full). Layout проще чем newspaper — single column article list с page header.
import { computed } from "vue";

import BlockRenderer from "../../assistant-standalone/blocks/BlockRenderer.vue";

const props = defineProps({
  envelope: { type: Object, required: true },
  t: { type: Function, required: true }
});

// Filter section_header — backend эмитит "Hacker News digest" header, который дублирует
// masthead (skill display name).
// Также убираем source_label из каждой ArticleCard footer'а — masthead уже показывает источник,
// дубликат на каждой карточке = шум.
const blocks = computed(() => {
  const all = props.envelope?.blocks || [];
  return all
    .filter((b) => b?.type !== "section_header")
    .map((b) => {
      if (b?.type === "article_card" && b.source_label) {
        // Shallow clone + drop source_label чтобы не мутировать prop.envelope payload.
        const { source_label: _omit, ...rest } = b;
        return rest;
      }
      return b;
    });
});

const title = computed(() => {
  const skillId = props.envelope?.skill_id || "";
  if (skillId === "digest_hackernews") return "Hacker News";
  if (skillId === "digest_github") return "GitHub Trending";
  return skillId || props.t("artifact.newspaper.default_title");
});

const sourceId = computed(() => props.envelope?.payload?.source_id || "");

const displayDate = computed(() => {
  const ts = props.envelope?.updated_at || props.envelope?.created_at;
  if (!ts) return "";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return ts;
  }
});
</script>

<template>
  <article class="digest-run">
    <header class="digest-run__masthead">
      <h1 class="digest-run__title">{{ title }}</h1>
      <div class="digest-run__meta">
        <span v-if="displayDate">{{ displayDate }}</span>
        <span v-if="sourceId" class="digest-run__dot">·</span>
        <span v-if="sourceId" class="digest-run__source">{{ sourceId }}</span>
      </div>
    </header>
    <div class="digest-run__body">
      <BlockRenderer :blocks="blocks" :t="t" />
    </div>
  </article>
</template>

<style scoped>
.digest-run {
  font-family: "Georgia", "Iowan Old Style", "Times New Roman", serif;
  max-width: 880px;
  margin: 0 auto;
  padding: 48px 32px 96px;
  color: var(--text-primary, #f8fafc);
}

.digest-run__masthead {
  border-bottom: 3px double currentColor;
  padding-bottom: 16px;
  margin-bottom: 32px;
  text-align: center;
}

.digest-run__title {
  font-family: inherit;
  font-weight: 900;
  font-size: clamp(36px, 6vw, 64px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0 0 8px;
}

.digest-run__meta {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  font-style: italic;
  font-size: 13px;
  color: var(--text-muted, color-mix(in srgb, #ffffff 70%, transparent));
}

.digest-run__dot {
  opacity: 0.5;
}

.digest-run__source {
  font-style: normal;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-size: 11px;
}

.digest-run__body :deep(.assistant-blocks) {
  /* Override BlockRenderer's chat-width constraint */
  width: 100%;
  max-width: none;
  gap: 0;
}

/*
  Newspaper polish: убрать chat-style borders/backgrounds на ArticleCard'ах,
  заменить typography separation (тонкая нижняя линия между статьями).
  Это переключает читаемое ощущение с "cards в чате" на "колонка статей в газете".
*/
.digest-run__body :deep(.assistant-article-card) {
  border: none;
  background: transparent;
  border-radius: 0;
  padding: 24px 0;
  border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  gap: 8px;
}

.digest-run__body :deep(.assistant-article-card:last-child) {
  border-bottom: none;
}

/* Newspaper-style title: serif heading, no underline (browser default), underline on hover */
.digest-run__body :deep(.assistant-article-card__title) {
  font-family: inherit;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
  text-decoration: none;
}

.digest-run__body :deep(.assistant-article-card__title:hover) {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

/* Summary / lede — slightly larger чем chat-inline */
.digest-run__body :deep(.assistant-article-card__summary),
.digest-run__body :deep(.assistant-article-card__original) {
  font-size: 14px;
  line-height: 1.55;
}

/* Meta: тонкая стрипа с метриками */
.digest-run__body :deep(.assistant-article-card__meta) {
  margin-top: 4px;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.7;
}

@media (max-width: 720px) {
  .digest-run {
    padding: 24px 16px 64px;
  }
}
</style>
