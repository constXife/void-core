<script setup>
// AssistantLatestArtifactBlock — Vue renderer для Custom Surface block `assistant.latest_artifact`
// (per ADR-21 § Bridge block).
//
// Принимает:
//   - block: { id, block: "assistant.latest_artifact", region, props: {...} }
//   - resolved: { artifactId, envelope, emptyReason } — pre-fetched backend resolver result
//   - t: i18n function
//
// Render path read-only: this component никогда не trigger'ит skill execution.
// Backend resolver уже rendered envelope.blocks per renderProfile (mini | cards | newspaper);
// мы просто delegating к existing block renderers symmetric с chat-inline / fullscreen flows.
import { computed } from "vue";
import { ChevronRight } from "lucide-vue-next";

import BlockRenderer from "../assistant-standalone/blocks/BlockRenderer.vue";

const props = defineProps({
  block: { type: Object, required: true },
  resolved: { type: Object, default: () => ({}) },
  t: { type: Function, required: true }
});

const envelope = computed(() => props.resolved?.envelope || null);
const artifactId = computed(() => props.resolved?.artifactId || null);
const emptyReason = computed(() => props.resolved?.emptyReason || null);
const renderProfile = computed(() => props.block?.props?.renderProfile || "mini");

const blocks = computed(() => envelope.value?.blocks || []);
const skillId = computed(() => envelope.value?.skill_id || "");

const fallbackEmptyState = computed(() => {
  switch (emptyReason.value) {
    case "no_completed_skill_run":
      return props.t("artifact.bridge.empty.no_run");
    case "schema_not_accepted":
      return props.t("artifact.bridge.empty.schema_mismatch");
    case "routine_resolver_not_implemented":
      return props.t("artifact.bridge.empty.routine_pending");
    case "invalid_artifact_query":
      return props.t("artifact.bridge.empty.invalid_query");
    default:
      return props.t("artifact.bridge.empty.default");
  }
});

const emptyStateText = computed(
  () => props.block?.props?.emptyState || fallbackEmptyState.value
);

const detailLink = computed(() =>
  artifactId.value
    ? { name: "artifact-detail", params: { artifactId: artifactId.value } }
    : null
);

const headerTitle = computed(() => {
  // Skill display name из backend rendered envelope; fallback на skill_id.
  if (skillId.value === "digest_hackernews") return "Hacker News";
  if (skillId.value === "digest_github") return "GitHub Trending";
  return skillId.value || props.t("artifact.bridge.title_fallback");
});
</script>

<template>
  <article class="bridge-block" :data-render-profile="renderProfile">
    <header v-if="envelope" class="bridge-block__header">
      <h3 class="bridge-block__title">{{ headerTitle }}</h3>
      <router-link
        v-if="detailLink"
        :to="detailLink"
        class="bridge-block__open"
        :aria-label="t('artifact.bridge.open_fullscreen')"
      >
        <span>{{ t("artifact.bridge.open_fullscreen") }}</span>
        <ChevronRight :size="14" />
      </router-link>
    </header>

    <div v-if="envelope" class="bridge-block__body">
      <BlockRenderer :blocks="blocks" :t="t" />
    </div>

    <div v-else class="bridge-block__empty" role="status">
      <p class="bridge-block__empty-text">{{ emptyStateText }}</p>
    </div>
  </article>
</template>

<style scoped>
.bridge-block {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 12px;
  background: var(--surface-elevated, color-mix(in srgb, #ffffff 4%, transparent));
}

.bridge-block[data-render-profile="newspaper"] {
  /* Newspaper profile нуждается в больше vertical space для lead + secondary + rail */
  padding: 24px;
}

.bridge-block__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent);
  padding-bottom: 8px;
}

.bridge-block__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--text-muted, color-mix(in srgb, currentColor 70%, transparent));
}

.bridge-block__open {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--accent, #60a5fa);
  text-decoration: none;
  white-space: nowrap;
}

.bridge-block__open:hover {
  text-decoration: underline;
}

.bridge-block__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  padding: 16px;
  color: var(--text-muted, color-mix(in srgb, currentColor 50%, transparent));
  font-style: italic;
  font-size: 13px;
  text-align: center;
}

.bridge-block__empty-text {
  margin: 0;
}

/* Inherit constrained BlockRenderer width — bridge body не нужно вырастать to full screen,
   block instance ограничен своим region в PageSpec. */
.bridge-block__body :deep(.assistant-blocks) {
  width: 100%;
  max-width: none;
  gap: 12px;
}
</style>
