<script setup>
// CustomSurfacePage — view-контейнер сохранённого PageSpec. Generic route /surfaces/:pageKind.
// Владеет async: fetch latest PageSpec + inventory dashboard-data (→ adapt в per-slot datasets)
// + resolve bridge-артефактов; loading/error/empty states. Сам рендер делегирован
// SurfaceRenderer (тот же компонент, что использует composer preview → нет divergence).
// Read-only — рендер не триггерит мутаций/skill execution.
//
// Доступен на atrium host (там AppState + inventory dashboard-data endpoint same-origin).
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronLeft } from "lucide-vue-next";

import {
  fetchLatestPagespec,
  fetchResolvedReadModel,
  resolveBridgeArtifacts
} from "../../lib/customSurfaces/api.js";
import { useAtriumAppStore } from "../../stores/atrium-app.js";
import SurfaceRenderer from "./SurfaceRenderer.vue";
import AssetUploader from "../../components/AssetUploader.vue";
import AssetGallery from "../../components/AssetGallery.vue";
import { deleteKnowledgeAsset } from "../../lib/useAssetUpload.js";

const route = useRoute();
const router = useRouter();
const appStore = useAtriumAppStore();
const t = (key, vars = {}) => appStore.t(key, vars);

const DEFAULT_SLICE = "pantry";

const pageKind = computed(() => String(route.params.pageKind || ""));
const slice = computed(() => String(route.query.slice || DEFAULT_SLICE));
// entity-scoped detail-страницы (ADR-0026 §3 W1): $page.entityId из query.
const entityId = computed(() => String(route.query.entityId || ""));

const pageSpec = ref(null);
const slotData = ref({});
const bridgeArtifacts = ref({});
const loading = ref(false);
const error = ref("");

const title = computed(() => pageSpec.value?.title || t("surface.render.default_title"));

function onBack() {
  if (window.history.length > 1) router.back();
  else router.push({ name: "assistant-home" });
}

async function load() {
  loading.value = true;
  error.value = "";
  bridgeArtifacts.value = {};
  try {
    // ADR-0026 §3 W4.3: на entity-странице read_model резолвится ПЕРВЫМ — он отдаёт entityKind
    // (graph kind_ref), нужный get_latest для fold kind-overlay слоя каскада
    // (vendorBase→global→kind→entity). foundation get_latest графа не видит, поэтому kind
    // приходит параметром. resolved переиспользуется как slotData (без второго запроса).
    let resolved = null;
    let entityKind = "";
    if (entityId.value) {
      resolved = await fetchResolvedReadModel({ entityId: entityId.value });
      entityKind = resolved?.entityKind || "";
    }
    const record = await fetchLatestPagespec(pageKind.value, entityId.value, entityKind);
    if (!record || !record.pagespec) {
      pageSpec.value = null;
      return;
    }
    pageSpec.value = record.pagespec;
    // read_model слоты резолвятся server-side (ADR-0027 C3): backend отдаёт готовые
    // per-slot датасеты + provenance. Overview-страница (без entityId) резолвит по slice здесь.
    if (!resolved) {
      resolved = await fetchResolvedReadModel({ slice: slice.value });
    }
    slotData.value = Object.fromEntries(
      Object.entries(resolved?.slots || {}).map(([slotId, slot]) => [slotId, slot?.payload])
    );
    // Bridge-артефакты — отдельный, некритичный путь: если резолв упал, не валим
    // весь render (inventory-блоки уже есть). Один broken bridge ≠ пустая страница.
    try {
      const bridge = await resolveBridgeArtifacts({ pageSpec: pageSpec.value });
      bridgeArtifacts.value = bridge?.artifacts || {};
    } catch {
      bridgeArtifacts.value = {};
    }
  } catch (err) {
    error.value = err?.message || t("surface.render.error");
    pageSpec.value = null;
  } finally {
    loading.value = false;
  }
}

// Существующие фото сущности: read_model отдаёт их в payload entity-слота как `assets`
// (generic-скан — не привязываемся к конкретному slot id).
const entityAssets = computed(() => {
  for (const payload of Object.values(slotData.value || {})) {
    if (payload && Array.isArray(payload.assets)) return payload.assets;
  }
  return [];
});

watch([pageKind, slice, entityId], load, { immediate: true });

// После заливки/удаления фото перерезолвить read_model, чтобы AssetGallery
// отразил изменение. Coalesce: если load уже идёт, дозагрузим один раз после него.
let reloadPending = false;
async function onAssetMutated() {
  if (loading.value) {
    reloadPending = true;
    return;
  }
  await load();
  if (reloadPending) {
    reloadPending = false;
    await load();
  }
}

// Удаление уже существующего фото из галереи: подтверждение → hard-delete → reload.
async function onDeleteExistingAsset(asset) {
  const assetId = asset?.asset_id;
  if (!assetId) return;
  if (!window.confirm(t("surface.asset.deleteConfirm"))) return;
  try {
    await deleteKnowledgeAsset(assetId);
    await onAssetMutated();
  } catch (err) {
    error.value = err?.message || t("surface.upload.deleteError");
  }
}
</script>

<template>
  <main class="surface-page">
    <header class="surface-page__topbar">
      <button
        type="button"
        class="surface-page__back"
        @click="onBack"
        :aria-label="t('surface.render.back')"
      >
        <ChevronLeft :size="16" />
        <span>{{ t("surface.render.back") }}</span>
      </button>
      <h1 v-if="pageSpec" class="surface-page__title">{{ title }}</h1>
    </header>

    <div v-if="loading" class="surface-page__state" role="status">
      {{ t("surface.render.loading") }}
    </div>
    <div v-else-if="error" class="surface-page__state surface-page__state--error" role="alert">
      {{ error }}
    </div>
    <div v-else-if="!pageSpec" class="surface-page__state">
      {{ t("surface.render.empty") }}
    </div>

    <SurfaceRenderer
      v-else
      :page-spec="pageSpec"
      :slot-data="slotData"
      :bridge-artifacts="bridgeArtifacts"
      :t="t"
    />

    <!-- Action-зона entity-страницы: загрузка фото/файлов к сущности (kernel:has-asset).
         Вне read-only SurfaceRenderer (ADR-0026 § render read-only): write-аффорданс
         владеет stateful-контейнер, а не PageSpec-блок. -->
    <section v-if="pageSpec && entityId" class="surface-page__upload">
      <h2 class="surface-page__upload-title">{{ t("surface.upload.title") }}</h2>
      <AssetGallery
        v-if="entityAssets.length"
        :assets="entityAssets"
        :t="t"
        :deletable="true"
        @delete="onDeleteExistingAsset"
      />
      <AssetUploader
        :attach-to-entity-id="entityId"
        :t="t"
        @uploaded="onAssetMutated"
        @deleted="onAssetMutated"
      />
    </section>
  </main>
</template>

<style scoped>
.surface-page {
  height: 100dvh;
  overflow-y: auto;
  background: var(--surface-base, #0f172a);
  color: var(--ink-primary, #f8fafc);
}

.surface-page__topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: color-mix(in srgb, var(--surface-base, #0f172a) 88%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid color-mix(in srgb, currentColor 8%, transparent);
}

.surface-page__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
  border-radius: 8px;
  background: transparent;
  color: var(--ink-primary, #f8fafc);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.surface-page__back:hover {
  border-color: color-mix(in srgb, currentColor 30%, transparent);
  background: color-mix(in srgb, currentColor 6%, transparent);
}

.surface-page__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.surface-page__state {
  max-width: 720px;
  margin: 80px auto;
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--ink-muted, color-mix(in srgb, currentColor 60%, transparent));
}

.surface-page__state--error {
  color: var(--color-red-500, #f85149);
}

.surface-page__upload {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px 32px;
}

.surface-page__upload-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-muted, color-mix(in srgb, currentColor 70%, transparent));
}
</style>
