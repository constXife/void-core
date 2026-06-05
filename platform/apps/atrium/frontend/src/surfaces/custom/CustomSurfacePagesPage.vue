<script setup>
// CustomSurfacePagesPage — owner-scoped список страниц (shipped catalog ∪ custom
// saved pagespecs). Рендерится как panel внутри AssistantStandaloneSurface, активный
// tab «Страницы». Авторинг страниц переехал в чат (ADR-0025 §1), composer-экрана нет —
// этот список заменяет composer как нормальную destination таба.
//
// Backend (GET /atrium/custom-surfaces/pages) уже делает union без потери данных и
// проставляет renderPath; фронт только отображает и ведёт на renderPath (atrium host).
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import { fetchPages } from "../../lib/customSurfaces/api.js";
import { useAtriumAppStore } from "../../stores/atrium-app.js";

const appStore = useAtriumAppStore();
const t = (key, vars = {}) => appStore.t(key, vars);

const pages = ref([]);
const loading = ref(false);
const error = ref("");

const isEmpty = computed(() => !loading.value && !error.value && pages.value.length === 0);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const data = await fetchPages();
    pages.value = Array.isArray(data?.pages) ? data.pages : [];
  } catch (err) {
    error.value = err?.message || t("pages.list.fetch_failed");
  } finally {
    loading.value = false;
  }
}

function formatDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return value;
  }
}

onMounted(load);
</script>

<template>
  <!--
    Без `<main>` — panel внутри AssistantStandaloneSurface, рядом с
    CapabilitiesPanel / ArtifactListPanel. Surface уже обеспечивает scroll container.
  -->
  <div class="pages-list">
    <header class="pages-list__header">
      <h1 class="pages-list__title">{{ t("pages.list.title") }}</h1>
      <p class="pages-list__subtitle">{{ t("pages.list.subtitle") }}</p>
    </header>

    <div v-if="error" class="pages-list__state pages-list__state--error" role="alert">
      {{ error }}
    </div>
    <div v-else-if="isEmpty" class="pages-list__state">
      {{ t("pages.list.empty") }}
    </div>

    <ul v-if="pages.length" class="pages-list__items">
      <li v-for="page in pages" :key="page.pageKind" class="pages-list__row">
        <div class="pages-list__row-main">
          <div class="pages-list__row-head">
            <span class="pages-list__name">{{ page.title }}</span>
            <span
              class="pages-list__badge"
              :class="`pages-list__badge--${page.source}`"
            >{{ t(`pages.list.source.${page.source}`) }}</span>
            <span
              v-if="page.customized"
              class="pages-list__badge pages-list__badge--customized"
            >{{ page.version === null ? t("pages.list.customized") : t("pages.list.customized_version", { version: page.version }) }}</span>
          </div>
          <code class="pages-list__kind">{{ page.pageKind }}</code>
          <p v-if="page.description" class="pages-list__description">{{ page.description }}</p>
          <time
            v-if="page.updatedAt"
            class="pages-list__date"
            :datetime="page.updatedAt"
          >{{ t("pages.list.updated_at", { date: formatDate(page.updatedAt) }) }}</time>
        </div>
        <RouterLink class="pages-list__open" :to="page.renderPath">
          {{ t("pages.list.open") }}
        </RouterLink>
      </li>
    </ul>

    <div v-if="loading" class="pages-list__state" role="status">
      {{ t("pages.list.loading") }}
    </div>
  </div>
</template>

<style scoped>
.pages-list {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  color: var(--ink-primary);
}

.pages-list__header {
  margin-bottom: 32px;
}

.pages-list__title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0;
}

.pages-list__subtitle {
  margin: 8px 0 0;
  color: var(--ink-muted);
  font-size: 14px;
}

.pages-list__state {
  padding: 16px 0;
  color: var(--ink-muted);
}

.pages-list__state--error {
  color: var(--color-red-500, #f87171);
}

.pages-list__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.pages-list__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--border-muted);
  border-radius: 12px;
  background: var(--surface-raised);
}

.pages-list__row-main {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.pages-list__row-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.pages-list__name {
  font-size: 16px;
  font-weight: 600;
}

.pages-list__badge {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-interactive);
  color: var(--ink-muted);
}

.pages-list__badge--custom {
  background: color-mix(in srgb, var(--accent-primary) 18%, transparent);
  color: var(--accent-primary);
}

.pages-list__badge--customized {
  background: color-mix(in srgb, var(--accent-primary) 18%, transparent);
  color: var(--accent-primary);
}

.pages-list__kind {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  color: var(--ink-muted);
}

.pages-list__description {
  margin: 0;
  font-size: 14px;
  color: var(--ink-secondary);
}

.pages-list__date {
  font-size: 12px;
  color: var(--ink-muted);
}

.pages-list__open {
  flex: none;
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-muted);
  color: var(--ink-primary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s ease;
}

.pages-list__open:hover {
  background: var(--surface-interactive);
}
</style>
