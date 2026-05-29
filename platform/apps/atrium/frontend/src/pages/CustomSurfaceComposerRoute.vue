<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ChevronLeft } from "lucide-vue-next";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import {
  ApiCallError,
  compilePageSpec,
  fetchLatestPagespec,
  fetchScopedManifest,
  previewPageSpec,
  resolveBridgeArtifacts,
  savePageSpec
} from "../lib/customSurfaces/api.js";
import AssistantLatestArtifactBlock from "../surfaces/artifact/AssistantLatestArtifactBlock.vue";

const appStore = useAtriumAppStore();
const router = useRouter();
const { t } = appStore;

function onBack() {
  // Composer — standalone surface. Возврат: browser history если есть, иначе assistant home.
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push({ name: "assistant-home" });
  }
}

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
const compileAttempts = ref([]);

const previewError = ref(null);
const previewLoading = ref(false);

// Bridge blocks (assistant.latest_artifact) resolution per ADR-21.
// После successful preview validation мы запрашиваем actual envelope для каждого bridge block —
// composer показывает real rendered preview этих blocks. Inventory blocks остаются TBD (P1.4).
const resolvedBridgeArtifacts = ref({});
const resolveError = ref(null);

const saveError = ref(null);
const saveLoading = ref(false);
const saveSuccess = ref(null);  // { pagespecId, version, confirmTokenId } после успешного save
const latestSaved = ref(null);  // pre-loaded latest pagespec на mount (если есть)
const latestLoading = ref(false);

const bridgeBlocks = computed(() => {
  const blocks = pageSpec.value?.blocks || [];
  return blocks.filter((b) => b?.block === "assistant.latest_artifact");
});

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
  compileAttempts.value = [];
  try {
    // compile endpoint возвращает CompileResponse {ok, pageSpec, validation, attempts,
    // targetId, model} — не сам PageSpec. Извлекаем pageSpec; при ok=false показываем
    // понятную ошибку (LLM выдал невалидный output даже после repair attempt).
    const result = await compilePageSpec({ prompt: prompt.value, pageKind: PAGE_KIND });
    compileAttempts.value = Array.isArray(result?.attempts) ? result.attempts : [];
    if (result?.ok && result?.pageSpec) {
      pageSpec.value = result.pageSpec;
    } else {
      pageSpec.value = null;
      const layers = result?.validation?.layers;
      const firstErr = result?.validation?.errors?.[0];
      compileError.value = {
        status: 422,
        code: firstErr?.code || "compile_validation_failed",
        message: firstErr?.message
          ? `LLM выдал невалидный PageSpec (${result?.model || "?"}): ${firstErr.message}. Попробуй переформулировать запрос или повтори.`
          : `LLM не собрал валидный PageSpec после repair (parseable=${layers?.parseable}). Попробуй переформулировать запрос.`
      };
    }
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
  resolveError.value = null;
  resolvedBridgeArtifacts.value = {};
  try {
    await previewPageSpec({ pageSpec: pageSpec.value });
    // Если в PageSpec есть bridge blocks — fetch их envelopes для render.
    if (bridgeBlocks.value.length > 0) {
      try {
        const result = await resolveBridgeArtifacts({ pageSpec: pageSpec.value });
        resolvedBridgeArtifacts.value = result?.artifacts || {};
      } catch (error) {
        resolveError.value = formatApiError(error);
      }
    }
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
  saveSuccess.value = null;
  try {
    const result = await savePageSpec({ pageSpec: pageSpec.value, pageKind: PAGE_KIND });
    saveSuccess.value = {
      pagespecId: result?.pagespecId,
      version: result?.version,
      confirmTokenId: result?.confirmTokenId
    };
    // После successful save обновляем latestSaved так чтобы reload показал свежую версию.
    latestSaved.value = result;
  } catch (error) {
    saveError.value = formatApiError(error);
  } finally {
    saveLoading.value = false;
  }
}

async function loadLatestSaved() {
  latestLoading.value = true;
  try {
    const result = await fetchLatestPagespec(PAGE_KIND);
    latestSaved.value = result;
    // Auto-populate pageSpec для удобной "продолжить редактирование" UX.
    if (result?.pagespec) {
      pageSpec.value = result.pagespec;
    }
  } catch (error) {
    // 404 returns null уже — другие ошибки log'аем но не блокируем composer mount.
    console.warn("Failed to load latest saved pagespec:", error);
  } finally {
    latestLoading.value = false;
  }
}

function formatApiError(error) {
  if (error instanceof ApiCallError) {
    return { status: error.status, code: error.code, message: error.message };
  }
  return { status: 0, code: "unknown_error", message: String(error?.message || error) };
}

onMounted(() => {
  loadManifest();
  loadLatestSaved();
});
</script>

<template>
  <div class="composer">
    <div class="composer__topbar">
      <button type="button" class="composer__back" @click="onBack" :aria-label="t('artifact.back')">
        <ChevronLeft :size="16" />
        <span>{{ t("artifact.back") }}</span>
      </button>
    </div>
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

    <section v-if="pageSpec" class="composer__panel">
      <h2>{{ t("composer.previewBridgeTitle") }}</h2>
      <p class="composer__hint">{{ t("composer.previewBridgeNote") }}</p>
      <p
        v-if="resolveError"
        class="composer__error"
      >
        <strong>{{ resolveError.code }}</strong> — {{ resolveError.message }}
      </p>
      <p v-if="bridgeBlocks.length === 0" class="composer__hint">
        {{ t("composer.previewBridgeEmpty") }}
      </p>
      <div v-else class="composer__bridge-blocks">
        <AssistantLatestArtifactBlock
          v-for="block in bridgeBlocks"
          :key="block.id"
          :block="block"
          :resolved="resolvedBridgeArtifacts[block.id] || {}"
          :t="t"
        />
      </div>
    </section>

    <section class="composer__panel">
      <h2>{{ t("composer.savePanelTitle") }}</h2>
      <p
        v-if="latestSaved && !saveSuccess"
        class="composer__hint composer__hint--success"
      >
        {{ t("composer.savedLatest", {
          version: latestSaved.version,
          createdAt: latestSaved.createdAt
        }) }}
      </p>
      <p v-else-if="latestLoading" class="composer__hint">
        {{ t("composer.savedLoading") }}
      </p>
      <div class="composer__actions">
        <button type="button" :disabled="saveButtonDisabled" @click="runSave">
          {{ saveLoading ? t("composer.saveLoading") : t("composer.saveButton") }}
        </button>
      </div>
      <p
        v-if="saveSuccess"
        class="composer__success"
      >
        {{ t("composer.saveSuccessMessage", {
          version: saveSuccess.version,
          pagespecId: saveSuccess.pagespecId
        }) }}
      </p>
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
  /*
    body { overflow: hidden } (app/22-base.css) блокирует document scroll.
    Composer — standalone surface, должен быть своим scroll container:
    height фиксируется на viewport, overflow-y: auto. (Раньше был внутри
    AppLayout со своим скроллом; после перевода в standalone нужен явный.)
  */
  height: 100dvh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.composer__topbar {
  display: flex;
  align-items: center;
}

.composer__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: transparent;
  color: var(--color-text, #111827);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;
}

.composer__back:hover {
  border-color: var(--color-text-muted, #6b7280);
  background: var(--color-surface-subtle, #f3f4f6);
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

.composer__bridge-blocks {
  display: grid;
  gap: 12px;
}

.composer__hint--success {
  color: var(--color-text, #111827);
  font-weight: 500;
}

.composer__success {
  font-size: 0.875rem;
  color: var(--color-success, #047857);
  background: var(--color-success-surface, #ecfdf5);
  padding: 0.625rem;
  border-radius: 0.375rem;
  margin: 0;
}
</style>
