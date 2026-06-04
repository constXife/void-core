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
  fetchInventoryDashboardData,
  resolveBridgeArtifacts
} from "../../lib/customSurfaces/api.js";
import { useAtriumAppStore } from "../../stores/atrium-app.js";
import { adaptDashboardData } from "./adapter.js";
import SurfaceRenderer from "./SurfaceRenderer.vue";

const route = useRoute();
const router = useRouter();
const appStore = useAtriumAppStore();
const t = (key, vars = {}) => appStore.t(key, vars);

const DEFAULT_SLICE = "pantry";

const pageKind = computed(() => String(route.params.pageKind || ""));
const slice = computed(() => String(route.query.slice || DEFAULT_SLICE));

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
    const record = await fetchLatestPagespec(pageKind.value);
    if (!record || !record.pagespec) {
      pageSpec.value = null;
      return;
    }
    pageSpec.value = record.pagespec;
    const dashboard = await fetchInventoryDashboardData(slice.value);
    slotData.value = adaptDashboardData(dashboard);
    // Bridge-артефакты — отдельный, некритичный путь: если резолв упал, не валим
    // весь render (inventory-блоки уже есть). Один broken bridge ≠ пустая страница.
    try {
      const resolved = await resolveBridgeArtifacts({ pageSpec: pageSpec.value });
      bridgeArtifacts.value = resolved?.artifacts || {};
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

watch([pageKind, slice], load, { immediate: true });
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
  </main>
</template>

<style scoped>
.surface-page {
  height: 100dvh;
  overflow-y: auto;
  background: var(--surface-base, #0f172a);
  color: var(--text-primary, #f8fafc);
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
  color: var(--text-primary, #f8fafc);
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
  color: var(--text-muted, color-mix(in srgb, #ffffff 70%, transparent));
}

.surface-page__state--error {
  color: var(--text-error, #fca5a5);
}
</style>
