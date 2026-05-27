<script setup>
// DigestNewspaperRenderer — fullscreen newspaper layout для skill artifact schema=newspaper_issue.v1.
// Принимает уже rendered envelope (blocks + payload metadata из ?layout=full backend response).
// Reuse'ит existing block components (LeadStoryBlock / SecondaryGridBlock / RailBlock).
import { computed } from "vue";

import BlockRenderer from "../../assistant-standalone/blocks/BlockRenderer.vue";
import NewspaperMasthead from "../NewspaperMasthead.vue";

const props = defineProps({
  envelope: { type: Object, required: true },
  t: { type: Function, required: true }
});

const totalCount = computed(() => {
  const payload = props.envelope?.payload || {};
  const lead = Array.isArray(payload.lead_items) ? payload.lead_items.length : 0;
  const secondary = Array.isArray(payload.secondary_items) ? payload.secondary_items.length : 0;
  const rail = Array.isArray(payload.rail_items) ? payload.rail_items.length : 0;
  return lead + secondary + rail;
});

const assembledAt = computed(() => props.envelope?.payload?.assembled_at || "");

const editorialNote = computed(() => {
  const policy = props.envelope?.payload?.editorial_policy_snapshot;
  if (!policy) return "";
  const sortBy = policy.sort_by;
  switch (sortBy) {
    case "top_score":
      return props.t("artifact.newspaper.sort.top_score");
    case "recent":
      return props.t("artifact.newspaper.sort.recent");
    default:
      return "";
  }
});

const title = computed(() => {
  // Skill metadata title если есть; иначе fall back на skill_id
  const skillId = props.envelope?.skill_id || "";
  if (skillId === "digest_hackernews") return "Hacker News";
  if (skillId === "digest_github") return "GitHub Trending";
  return skillId || props.t("artifact.newspaper.default_title");
});

// Filter blocks: SectionHeader из backend дублирует masthead — скрываем чтобы не было визуальной дубликации
const renderableBlocks = computed(() => {
  const blocks = props.envelope?.blocks || [];
  return blocks.filter((b) => b?.type !== "section_header");
});
</script>

<template>
  <article class="digest-newspaper">
    <NewspaperMasthead
      :title="title"
      :date="assembledAt"
      :total-count="totalCount"
      :editorial-note="editorialNote"
      :t="t"
    />
    <div class="digest-newspaper__body">
      <BlockRenderer :blocks="renderableBlocks" :t="t" />
    </div>
  </article>
</template>

<style scoped>
.digest-newspaper {
  /* Use system serif family for newspaper feel; keep readable on dark/light themes */
  font-family: "Georgia", "Iowan Old Style", "Times New Roman", serif;
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 32px 96px;
  color: var(--text-primary, #f8fafc);
}

.digest-newspaper__body :deep(.assistant-blocks) {
  /* Override BlockRenderer's chat-width constraint — fullscreen wants wide */
  width: 100%;
  max-width: none;
  gap: 24px;
}

/* Override block component sizes for newspaper context — sans-serif → serif inheritance */
.digest-newspaper__body :deep(.assistant-lead-story__title) {
  font-family: inherit;
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.digest-newspaper__body :deep(.assistant-lead-story__summary) {
  font-size: 16px;
  line-height: 1.6;
}

.digest-newspaper__body :deep(.assistant-secondary-grid) {
  margin-top: 16px;
  border-top: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  padding-top: 24px;
}

.digest-newspaper__body :deep(.assistant-rail-block) {
  margin-top: 16px;
  border-top: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  padding-top: 24px;
}

@media (max-width: 720px) {
  .digest-newspaper {
    padding: 24px 16px 64px;
  }
}
</style>
