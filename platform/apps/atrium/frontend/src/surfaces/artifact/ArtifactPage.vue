<script setup>
// ArtifactPage — fullscreen artifact view. Generic route /artifacts/:id.
// Fetches `?layout=full` envelope, dispatches к нужному renderer'у по envelope.schema.
//
// Adding a new artifact type later = добавить import + один branch в `rendererFor`.
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { readAssistantSkillRun } from "../../lib/assistant-skill-runs.js";
import { useAtriumAppStore } from "../../stores/atrium-app.js";
import DigestNewspaperRenderer from "./renderers/DigestNewspaperRenderer.vue";

const route = useRoute();
const appStore = useAtriumAppStore();
const t = (key, vars = {}) => appStore.t(key, vars);

const artifactId = computed(() => String(route.params.artifactId || ""));

const envelope = ref(null);
const loading = ref(false);
const error = ref("");

async function loadArtifact(id) {
  if (!id) {
    error.value = t("artifact.error.missing_id");
    envelope.value = null;
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const data = await readAssistantSkillRun(id, { context: "report", layout: "full" });
    envelope.value = data;
  } catch (err) {
    error.value = err?.message || t("artifact.error.fetch_failed");
    envelope.value = null;
  } finally {
    loading.value = false;
  }
}

// React к смене URL id (например если юзер откроет другой artifact в том же tab)
watch(artifactId, (id) => loadArtifact(id), { immediate: true });

function rendererFor(schema) {
  switch (schema) {
    case "newspaper_issue.v1":
      return DigestNewspaperRenderer;
    default:
      return null;
  }
}

const Renderer = computed(() => rendererFor(envelope.value?.schema));
</script>

<template>
  <main class="artifact-page">
    <div v-if="loading" class="artifact-page__state" role="status">
      {{ t("artifact.loading") }}
    </div>
    <div v-else-if="error" class="artifact-page__state artifact-page__state--error" role="alert">
      {{ error }}
    </div>
    <div v-else-if="!envelope" class="artifact-page__state">
      {{ t("artifact.empty") }}
    </div>
    <div v-else-if="!Renderer" class="artifact-page__state artifact-page__state--error" role="alert">
      {{ t("artifact.error.unsupported_schema", { schema: envelope.schema }) }}
    </div>
    <component
      v-else
      :is="Renderer"
      :envelope="envelope"
      :t="t"
    />
  </main>
</template>

<style scoped>
.artifact-page {
  min-height: 100vh;
  background: var(--surface-base, #0f172a);
  color: var(--text-primary, #f8fafc);
}

.artifact-page__state {
  max-width: 720px;
  margin: 80px auto;
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--text-muted, color-mix(in srgb, #ffffff 70%, transparent));
}

.artifact-page__state--error {
  color: var(--text-error, #fca5a5);
}
</style>
