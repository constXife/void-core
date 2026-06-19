<script setup>
// ArtifactPage — fullscreen artifact view. Generic route /artifacts/:id.
// Fetches `?layout=full` envelope, dispatches к нужному renderer'у по envelope.schema.
//
// Adding a new artifact type later = добавить import + один branch в `rendererFor`.
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronLeft, Trash2 } from "lucide-vue-next";

import { deleteAssistantSkillRun, readAssistantSkillRun } from "../../lib/assistant-skill-runs.js";
import { useAtriumAppStore } from "../../stores/atrium-app.js";
import DigestNewspaperRenderer from "./renderers/DigestNewspaperRenderer.vue";
import DigestRunRenderer from "./renderers/DigestRunRenderer.vue";
import TableRunRenderer from "./renderers/TableRunRenderer.vue";

const route = useRoute();
const router = useRouter();
const appStore = useAtriumAppStore();
const t = (key, vars = {}) => appStore.t(key, vars);

function onBack() {
  // Если есть browser history (юзер пришёл из чата) — возвращаемся туда.
  // Если открыли по direct URL (share, bookmark) — fall back на assistant home.
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push({ name: "assistant-home" });
  }
}

async function onDelete() {
  if (!envelope.value?.id) return;
  if (!window.confirm(t("artifact.list.delete_confirm"))) return;
  try {
    await deleteAssistantSkillRun(envelope.value.id);
    // После delete — возврат в список артефактов (если из него пришли) или assistant-home.
    router.push({ name: "artifact-list" });
  } catch (err) {
    error.value = err?.message || t("artifact.list.delete_failed");
  }
}

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
    case "digest_run.v1":
      return DigestRunRenderer;
    case "table.v1":
      return TableRunRenderer;
    default:
      return null;
  }
}

const Renderer = computed(() => rendererFor(envelope.value?.schema));
</script>

<template>
  <main class="artifact-page">
    <header class="artifact-page__topbar">
      <button type="button" class="artifact-page__back" @click="onBack" :aria-label="t('artifact.back')">
        <ChevronLeft :size="16" />
        <span>{{ t("artifact.back") }}</span>
      </button>
      <button
        v-if="envelope"
        type="button"
        class="artifact-page__delete"
        :aria-label="t('artifact.list.delete')"
        :title="t('artifact.list.delete')"
        @click="onDelete"
      >
        <Trash2 :size="16" />
        <span>{{ t("artifact.list.delete") }}</span>
      </button>
    </header>
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
  /*
    body { overflow: hidden } в app/22-base.css блокирует document-level скролл.
    ArtifactPage должна быть своим scroll container — height фиксируется на viewport,
    overflow-y: auto. Sticky topbar остаётся sticky относительно этого контейнера.
  */
  height: 100dvh;
  overflow-y: auto;
  background: var(--surface-base, #0f172a);
  color: var(--text-primary, #f8fafc);
}

.artifact-page__topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: color-mix(in srgb, var(--surface-base, #0f172a) 88%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid color-mix(in srgb, currentColor 8%, transparent);
}

.artifact-page__delete {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted, color-mix(in srgb, currentColor 60%, transparent));
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
}

.artifact-page__delete:hover {
  border-color: color-mix(in srgb, #ef4444 50%, transparent);
  background: color-mix(in srgb, #ef4444 14%, transparent);
  color: #fca5a5;
}

.artifact-page__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary, #f8fafc);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;
}

.artifact-page__back:hover {
  border-color: color-mix(in srgb, currentColor 30%, transparent);
  background: color-mix(in srgb, currentColor 6%, transparent);
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
