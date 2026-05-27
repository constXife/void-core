<script setup>
// ArtifactLinkBlock — compact "open as fullscreen artifact" card в чате.
// Эмитится backend'ом для skill artifacts на chat-inline layout=mini (default).
// Клик ведёт на /artifacts/:id route с fullscreen renderer'ом по envelope.schema.
//
// Backend contract:
//   { type: "artifact_link", artifact_id, schema, title, summary, action_label }
import { computed } from "vue";

const props = defineProps({
  block: { type: Object, required: true },
  t: { type: Function, required: true }
});

const to = computed(() => ({
  name: "artifact-detail",
  params: { artifactId: props.block.artifact_id }
}));

const iconForSchema = computed(() => {
  switch (props.block.schema) {
    case "newspaper_issue.v1":
      return "📰";
    default:
      return "📄";
  }
});
</script>

<template>
  <router-link
    :to="to"
    class="assistant-artifact-link"
    :aria-label="block.action_label || t('assistant.artifact.open')"
  >
    <span class="assistant-artifact-link__icon" aria-hidden="true">{{ iconForSchema }}</span>
    <span class="assistant-artifact-link__body">
      <span class="assistant-artifact-link__title">{{ block.title }}</span>
      <span class="assistant-artifact-link__summary">{{ block.summary }}</span>
    </span>
    <span class="assistant-artifact-link__action">
      {{ block.action_label || t("assistant.artifact.open") }}
      <span aria-hidden="true">→</span>
    </span>
  </router-link>
</template>

<style scoped>
.assistant-artifact-link {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border-subtle, color-mix(in srgb, #ffffff 12%, transparent));
  border-radius: 12px;
  background: var(--surface-elevated, color-mix(in srgb, #ffffff 6%, transparent));
  color: var(--text-primary, #f8fafc);
  text-decoration: none;
  transition: border-color 120ms ease, background 120ms ease, transform 80ms ease;
  cursor: pointer;
}

.assistant-artifact-link:hover {
  border-color: var(--border-emphasis, color-mix(in srgb, #ffffff 28%, transparent));
  background: var(--surface-elevated-hover, color-mix(in srgb, #ffffff 10%, transparent));
}

.assistant-artifact-link:active {
  transform: scale(0.998);
}

.assistant-artifact-link__icon {
  font-size: 24px;
  line-height: 1;
}

.assistant-artifact-link__body {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.assistant-artifact-link__title {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.2;
}

.assistant-artifact-link__summary {
  font-size: 12px;
  color: var(--text-muted, color-mix(in srgb, #ffffff 60%, transparent));
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.assistant-artifact-link__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--accent, #60a5fa);
  white-space: nowrap;
}
</style>
