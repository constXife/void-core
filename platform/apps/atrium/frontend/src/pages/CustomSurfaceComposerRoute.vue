<script setup>
import { computed, onMounted, ref } from "vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import {
  ApiCallError,
  compilePageSpec,
  fetchScopedManifest,
  previewPageSpec,
  savePageSpec
} from "../lib/customSurfaces/api.js";

const appStore = useAtriumAppStore();
const { t } = appStore;

// Phase 1 slice 1 supports only inventory.overview pageKind (см. ADR-0020).
// Будущий slice добавит pageKind selector над routing/state.
const PAGE_KIND = "inventory.overview";

const manifest = ref(null);
const manifestError = ref(null);
const manifestLoading = ref(false);

const prompt = ref("");
const pageSpec = ref(null);
const compileError = ref(null);
const compileLoading = ref(false);

const previewError = ref(null);
const previewLoading = ref(false);

const saveError = ref(null);
const saveLoading = ref(false);

const manifestJson = computed(() =>
  manifest.value ? JSON.stringify(manifest.value, null, 2) : ""
);
const pageSpecJson = computed(() =>
  pageSpec.value ? JSON.stringify(pageSpec.value, null, 2) : ""
);

const compileButtonDisabled = computed(
  () => compileLoading.value || !prompt.value.trim() || !manifest.value
);
const previewButtonDisabled = computed(
  () => previewLoading.value || !pageSpec.value
);
const saveButtonDisabled = computed(() => saveLoading.value || !pageSpec.value);

async function loadManifest() {
  manifestLoading.value = true;
  manifestError.value = null;
  try {
    manifest.value = await fetchScopedManifest({ pageKind: PAGE_KIND });
  } catch (error) {
    manifest.value = null;
    manifestError.value = formatApiError(error);
  } finally {
    manifestLoading.value = false;
  }
}

async function runCompile() {
  compileLoading.value = true;
  compileError.value = null;
  try {
    pageSpec.value = await compilePageSpec({
      prompt: prompt.value,
      pageKind: PAGE_KIND
    });
  } catch (error) {
    pageSpec.value = null;
    compileError.value = formatApiError(error);
  } finally {
    compileLoading.value = false;
  }
}

async function runPreview() {
  if (!pageSpec.value) return;
  previewLoading.value = true;
  previewError.value = null;
  try {
    await previewPageSpec({ pageSpec: pageSpec.value });
  } catch (error) {
    previewError.value = formatApiError(error);
  } finally {
    previewLoading.value = false;
  }
}

async function runSave() {
  if (!pageSpec.value) return;
  saveLoading.value = true;
  saveError.value = null;
  try {
    await savePageSpec({ pageSpec: pageSpec.value, pageKind: PAGE_KIND });
  } catch (error) {
    saveError.value = formatApiError(error);
  } finally {
    saveLoading.value = false;
  }
}

function formatApiError(error) {
  if (error instanceof ApiCallError) {
    return { status: error.status, code: error.code, message: error.message };
  }
  return { status: 0, code: "unknown_error", message: String(error?.message || error) };
}

onMounted(loadManifest);
</script>

<template>
  <div class="composer">
    <header class="composer__header">
      <h1>{{ t("composer.title") }}</h1>
      <p class="composer__subtitle">{{ t("composer.subtitle") }}</p>
      <p class="composer__pageKind">
        <span class="composer__label">{{ t("composer.pageKindLabel") }}</span>
        <code>{{ PAGE_KIND }}</code>
      </p>
    </header>

    <section class="composer__panel">
      <h2>{{ t("composer.promptPanelTitle") }}</h2>
      <label for="composer-prompt" class="composer__label">
        {{ t("composer.promptLabel") }}
      </label>
      <textarea
        id="composer-prompt"
        v-model="prompt"
        rows="4"
        :placeholder="t('composer.promptPlaceholder')"
      />
      <div class="composer__actions">
        <button type="button" :disabled="compileButtonDisabled" @click="runCompile">
          {{ compileLoading ? t("composer.compileLoading") : t("composer.compileButton") }}
        </button>
      </div>
      <p
        v-if="compileError"
        class="composer__error"
        :class="{ 'composer__error--stub': compileError.status === 501 }"
      >
        <strong>{{ compileError.code }}</strong> — {{ compileError.message }}
      </p>
      <p
        v-if="!compileError && !pageSpec"
        class="composer__hint"
      >
        {{ t("composer.compileDisabledNote") }}
      </p>
    </section>

    <section class="composer__panel">
      <h2>{{ t("composer.manifestPanelTitle") }}</h2>
      <p v-if="manifestLoading" class="composer__hint">{{ t("composer.manifestLoading") }}</p>
      <p v-if="manifestError" class="composer__error">
        <strong>{{ manifestError.code }}</strong> — {{ manifestError.message }}
      </p>
      <details v-if="manifest" class="composer__details">
        <summary>
          {{ t("composer.manifestSummary", {
            pageKinds: manifest.pageKinds.length,
            blocks: manifest.blocks.length,
            dataSlots: manifest.dataSlots.length
          }) }}
        </summary>
        <pre class="composer__json">{{ manifestJson }}</pre>
      </details>
    </section>

    <section class="composer__panel">
      <h2>{{ t("composer.pageSpecPanelTitle") }}</h2>
      <p v-if="!pageSpec" class="composer__hint">{{ t("composer.pageSpecEmpty") }}</p>
      <pre v-else class="composer__json">{{ pageSpecJson }}</pre>
    </section>

    <section class="composer__panel">
      <h2>{{ t("composer.previewPanelTitle") }}</h2>
      <p class="composer__hint">{{ t("composer.previewStubNote") }}</p>
      <div class="composer__actions">
        <button type="button" :disabled="previewButtonDisabled" @click="runPreview">
          {{ previewLoading ? t("composer.previewLoading") : t("composer.previewButton") }}
        </button>
      </div>
      <p
        v-if="previewError"
        class="composer__error"
        :class="{ 'composer__error--stub': previewError.status === 501 }"
      >
        <strong>{{ previewError.code }}</strong> — {{ previewError.message }}
      </p>
    </section>

    <section class="composer__panel">
      <h2>{{ t("composer.savePanelTitle") }}</h2>
      <p class="composer__hint">{{ t("composer.saveStubNote") }}</p>
      <div class="composer__actions">
        <button type="button" :disabled="saveButtonDisabled" @click="runSave">
          {{ saveLoading ? t("composer.saveLoading") : t("composer.saveButton") }}
        </button>
      </div>
      <p
        v-if="saveError"
        class="composer__error"
        :class="{ 'composer__error--stub': saveError.status === 501 }"
      >
        <strong>{{ saveError.code }}</strong> — {{ saveError.message }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.composer {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.composer__header h1 {
  font-size: 1.75rem;
  margin: 0 0 0.5rem;
}

.composer__subtitle {
  color: var(--color-text-muted, #6b7280);
  margin: 0;
}

.composer__pageKind {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  font-size: 0.875rem;
}

.composer__pageKind code {
  background: var(--color-surface-subtle, #f3f4f6);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.composer__panel {
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1.25rem;
  background: var(--color-surface, #ffffff);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.composer__panel h2 {
  font-size: 1.125rem;
  margin: 0;
}

.composer__label {
  font-size: 0.875rem;
  color: var(--color-text-muted, #6b7280);
}

.composer__panel textarea {
  width: 100%;
  font-family: inherit;
  font-size: 0.95rem;
  padding: 0.625rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.375rem;
  resize: vertical;
}

.composer__actions {
  display: flex;
  gap: 0.5rem;
}

.composer__actions button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: 1px solid var(--color-accent, #2563eb);
  background: var(--color-accent, #2563eb);
  color: #ffffff;
  cursor: pointer;
  font-size: 0.95rem;
}

.composer__actions button:disabled {
  background: var(--color-surface-subtle, #e5e7eb);
  border-color: var(--color-surface-subtle, #e5e7eb);
  color: var(--color-text-muted, #6b7280);
  cursor: not-allowed;
}

.composer__details summary {
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--color-text, #111827);
}

.composer__json {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: var(--color-surface-subtle, #f9fafb);
  border-radius: 0.375rem;
  font-size: 0.8rem;
  font-family: ui-monospace, SFMono-Regular, monospace;
  overflow-x: auto;
  max-height: 24rem;
}

.composer__hint {
  font-size: 0.875rem;
  color: var(--color-text-muted, #6b7280);
  margin: 0;
}

.composer__error {
  font-size: 0.875rem;
  color: var(--color-danger, #b91c1c);
  background: var(--color-danger-surface, #fef2f2);
  padding: 0.625rem;
  border-radius: 0.375rem;
  margin: 0;
}

.composer__error--stub {
  color: var(--color-warning, #92400e);
  background: var(--color-warning-surface, #fef3c7);
}
</style>
