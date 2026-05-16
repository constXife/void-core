<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ChevronLeft } from "lucide-vue-next";
import TheShellBackdrop from "../components/TheShellBackdrop.vue";
import BlockRenderer from "../surfaces/assistant-standalone/blocks/BlockRenderer.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { useUiStore } from "../stores/ui.js";
import { readAssistantSkillRun } from "../lib/assistant-skill-runs.js";

const route = useRoute();
const router = useRouter();
const appStore = useAtriumAppStore();
const uiStore = useUiStore();
const { currentLang } = storeToRefs(uiStore);

const loading = ref(false);
const error = ref("");
const skillRun = ref(null);

const runId = computed(() => String(route.params?.id || ""));
const payload = computed(() => skillRun.value?.payload || {});
const sourceRunIds = computed(() =>
  Array.isArray(payload.value.source_run_ids) ? payload.value.source_run_ids.map(String) : []
);
const policyEntries = computed(() => flattenPolicy(payload.value.editorial_policy_snapshot));
const t = (key, vars = {}) => appStore.t(key, vars);

const load = async () => {
  if (!runId.value) return;
  loading.value = true;
  error.value = "";
  try {
    skillRun.value = await readAssistantSkillRun(runId.value, { context: "report" });
  } catch (reason) {
    error.value = normalizeError(reason, t);
    skillRun.value = null;
  } finally {
    loading.value = false;
  }
};

const onBack = () => {
  router.push({ name: "assistant-home" });
};

onMounted(load);
watch(runId, load);

function flattenPolicy(policy) {
  if (!policy || typeof policy !== "object") return [];
  return Object.entries(policy).map(([key, value]) => ({
    key,
    value: formatPolicyValue(value)
  }));
}

function formatPolicyValue(value) {
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "");
}

function formatDate(value, locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale || "en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function normalizeError(reason, translate) {
  const message = String(reason?.message || "").trim();
  if (!message) return translate("assistant.report.fetchFailed");
  try {
    const payload = JSON.parse(message);
    return String(payload.message || payload.error || message);
  } catch {
    return message;
  }
}
</script>

<template>
  <main class="assistant-report-root">
    <TheShellBackdrop tone="assistant" />

    <header class="assistant-report-header">
      <button type="button" class="assistant-report-back" @click="onBack">
        <ChevronLeft :size="16" />
        <span>{{ t("assistant.report.back") }}</span>
      </button>
      <div class="assistant-report-title-group">
        <h1 class="assistant-report-title">{{ t("assistant.report.title") }}</h1>
        <p v-if="payload.assembled_at" class="assistant-report-subtitle">
          {{ t("assistant.report.assembledAt", { value: formatDate(payload.assembled_at, currentLang) }) }}
        </p>
      </div>
    </header>

    <section class="assistant-report-body">
      <p v-if="loading" class="assistant-report-hint">{{ t("assistant.report.loading") }}</p>
      <p v-else-if="error" class="assistant-report-error" role="alert">{{ error }}</p>

      <template v-else-if="skillRun">
        <section class="assistant-report-provenance" :aria-label="t('assistant.report.provenance')">
          <div class="assistant-report-provenance__group">
            <span class="assistant-report-provenance__label">{{ t("assistant.report.schema") }}</span>
            <span class="assistant-report-provenance__value">{{ skillRun.schema }}</span>
          </div>
          <div v-if="sourceRunIds.length" class="assistant-report-provenance__group">
            <span class="assistant-report-provenance__label">{{ t("assistant.report.sources") }}</span>
            <div class="assistant-report-source-list">
              <router-link
                v-for="sourceId in sourceRunIds"
                :key="sourceId"
                class="assistant-report-source"
                :to="{ name: 'assistant-run-report', params: { id: sourceId } }"
              >
                {{ sourceId }}
              </router-link>
            </div>
          </div>
          <div v-if="policyEntries.length" class="assistant-report-provenance__group">
            <span class="assistant-report-provenance__label">{{ t("assistant.report.policy") }}</span>
            <div class="assistant-report-policy-list">
              <span
                v-for="entry in policyEntries"
                :key="entry.key"
                class="assistant-report-policy"
              >
                {{ entry.key }}={{ entry.value }}
              </span>
            </div>
          </div>
        </section>

        <BlockRenderer
          class="assistant-report-blocks"
          :blocks="skillRun.blocks || []"
          :t="t"
        />
      </template>

      <p v-else class="assistant-report-hint">{{ t("assistant.report.empty") }}</p>
    </section>
  </main>
</template>

<style scoped>
.assistant-report-root {
  min-height: 100vh;
  color: var(--ink-primary);
  background: var(--surface-base);
}

.assistant-report-header,
.assistant-report-body {
  position: relative;
  z-index: 1;
  width: min(100% - 32px, 1040px);
  margin-inline: auto;
}

.assistant-report-header {
  display: grid;
  gap: 18px;
  padding: 24px 0 16px;
}

.assistant-report-back {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--surface-raised);
  color: var(--ink-primary);
  font-size: 13px;
}

.assistant-report-title-group {
  display: grid;
  gap: 6px;
}

.assistant-report-title {
  margin: 0;
  color: var(--ink-primary);
  font-size: 28px;
  line-height: 1.15;
}

.assistant-report-subtitle,
.assistant-report-hint,
.assistant-report-error {
  margin: 0;
  color: var(--text-secondary, #9ca3af);
  font-size: 14px;
  line-height: 1.45;
}

.assistant-report-error {
  color: #fca5a5;
}

.assistant-report-body {
  display: grid;
  gap: 16px;
  padding-bottom: 42px;
}

.assistant-report-provenance {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--text-secondary, #94a3b8) 22%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-raised, #111827) 86%, transparent);
}

.assistant-report-provenance__group {
  display: grid;
  gap: 6px;
}

.assistant-report-provenance__label {
  color: var(--text-secondary, #9ca3af);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  text-transform: uppercase;
}

.assistant-report-provenance__value,
.assistant-report-source,
.assistant-report-policy {
  color: var(--ink-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.35;
}

.assistant-report-source-list,
.assistant-report-policy-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.assistant-report-source,
.assistant-report-policy {
  max-width: 100%;
  padding: 5px 8px;
  border: 1px solid color-mix(in srgb, var(--text-secondary, #94a3b8) 20%, transparent);
  border-radius: 8px;
  background: var(--surface-1, #111827);
  overflow-wrap: anywhere;
  text-decoration: none;
}

.assistant-report-source:hover {
  text-decoration: underline;
}

.assistant-report-blocks {
  width: 100%;
}
</style>
