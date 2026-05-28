<script setup>
// ArtifactListPage — paginated список всех skill artifacts текущего юзера.
// Используется через /artifacts route (без id) + sidebar nav entry "АРТЕФАКТЫ".
//
// Каждый row backend возвращает с готовым `artifact_link` (SkillBlock::ArtifactLink),
// frontend reuse'ит ArtifactLinkBlock.vue (тот же компонент что в чате) — поведение
// row click'а симметрично с chat card click'ом.
import { computed, ref, onMounted } from "vue";

import { listAssistantSkillRuns } from "../../lib/assistant-skill-runs.js";
import { useAtriumAppStore } from "../../stores/atrium-app.js";
import ArtifactLinkBlock from "../assistant-standalone/blocks/ArtifactLinkBlock.vue";

const appStore = useAtriumAppStore();
const t = (key, vars = {}) => appStore.t(key, vars);

const PAGE_SIZE = 50;

const items = ref([]);
const loading = ref(false);
const error = ref("");
const offset = ref(0);
const hasMore = ref(false);

// Filter state — фронт пока поддерживает только skill_id pick (frontend filter UX
// можно расширить позже; backend сразу принимает skillId query param).
const skillFilter = ref("");

const isEmpty = computed(() => !loading.value && !error.value && items.value.length === 0);

async function load({ reset = false } = {}) {
  if (reset) {
    items.value = [];
    offset.value = 0;
    hasMore.value = false;
  }
  loading.value = true;
  error.value = "";
  try {
    const data = await listAssistantSkillRuns({
      status: "completed",
      skillId: skillFilter.value || undefined,
      limit: PAGE_SIZE,
      offset: offset.value
    });
    const fetched = Array.isArray(data?.items) ? data.items : [];
    items.value = reset ? fetched : [...items.value, ...fetched];
    hasMore.value = fetched.length === PAGE_SIZE;
    offset.value += fetched.length;
  } catch (err) {
    error.value = err?.message || t("artifact.list.fetch_failed");
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

onMounted(() => load({ reset: true }));
</script>

<template>
  <main class="artifact-list">
    <header class="artifact-list__header">
      <h1 class="artifact-list__title">{{ t("artifact.list.title") }}</h1>
    </header>

    <div v-if="error" class="artifact-list__state artifact-list__state--error" role="alert">
      {{ error }}
    </div>
    <div v-else-if="isEmpty" class="artifact-list__state">
      {{ t("artifact.list.empty") }}
    </div>

    <ul v-if="items.length" class="artifact-list__items">
      <li v-for="item in items" :key="item.id" class="artifact-list__row">
        <ArtifactLinkBlock
          v-if="item.artifact_link"
          :block="item.artifact_link"
          :t="t"
        />
        <time
          v-if="item.created_at"
          class="artifact-list__date"
          :datetime="item.created_at"
        >{{ formatDate(item.created_at) }}</time>
      </li>
    </ul>

    <div v-if="hasMore && !loading" class="artifact-list__more">
      <button type="button" class="artifact-list__more-button" @click="load({ reset: false })">
        {{ t("artifact.list.load_more") }}
      </button>
    </div>

    <div v-if="loading" class="artifact-list__state" role="status">
      {{ t("artifact.list.loading") }}
    </div>
  </main>
</template>

<style scoped>
.artifact-list {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  color: var(--text-primary, #f8fafc);
}

.artifact-list__header {
  margin-bottom: 32px;
}

.artifact-list__title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0;
}

.artifact-list__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.artifact-list__row {
  display: grid;
  gap: 4px;
}

.artifact-list__date {
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted, color-mix(in srgb, currentColor 55%, transparent));
  padding-left: 4px;
}

.artifact-list__state {
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--text-muted, color-mix(in srgb, currentColor 60%, transparent));
}

.artifact-list__state--error {
  color: var(--text-error, #fca5a5);
}

.artifact-list__more {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.artifact-list__more-button {
  padding: 10px 24px;
  border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary, #f8fafc);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;
}

.artifact-list__more-button:hover {
  border-color: color-mix(in srgb, currentColor 30%, transparent);
  background: color-mix(in srgb, currentColor 6%, transparent);
}
</style>
