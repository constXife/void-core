<script setup>
import { onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { useActivityStore } from "../stores/activity.js";
import PlatformActivityList from "../platform/components/PlatformActivityList.vue";

// Страница активности (ADR-0034 / лента обновлений): полный архив user-событий с фильтром по
// категории и пагинацией 20/стр. Колокол в хедере — только glance за 24ч, отсюда «Вся
// активность». Фильтр — в URL (?type=), чтобы deep-link и перезагрузка не сбрасывали вид.

const FILTERS = ["all", "approval", "message", "run", "session"];

const appStore = useAtriumAppStore();
const { t } = appStore;
const { currentLang } = storeToRefs(appStore);
const route = useRoute();
const router = useRouter();

const store = useActivityStore();
const { items, type, loading, loadingMore, error, nextCursor } = storeToRefs(store);

const typeFromRoute = () => {
  const q = route.query.type;
  return FILTERS.includes(q) ? q : "all";
};

const selectType = (next) => {
  if (next === type.value) return;
  // URL = источник истины фильтра: replace (без новой записи в истории) → reload не сбросит.
  const query = { ...route.query };
  if (next === "all") delete query.type;
  else query.type = next;
  router.replace({ query });
};

// Дееплинк/назад-вперёд: ведём загрузку от значения в URL.
watch(
  () => route.query.type,
  () => store.load(typeFromRoute()),
  { immediate: false }
);

onMounted(() => store.load(typeFromRoute()));

const openApproval = () => router.push({ name: "approvals" });
</script>

<template>
  <div class="atrium-activity">
    <div class="atrium-activity__inner">
      <header class="atrium-activity__head">
        <h1 class="atrium-activity__title">{{ t("activity.title") }}</h1>
        <p class="atrium-activity__intro">{{ t("activity.intro") }}</p>
      </header>

      <nav class="atrium-activity__filters" role="tablist">
        <button
          v-for="f in FILTERS"
          :key="f"
          type="button"
          role="tab"
          class="atrium-activity__chip"
          :class="{ 'atrium-activity__chip--active': type === f }"
          :aria-selected="type === f"
          @click="selectType(f)"
        >
          {{ t(`activity.filter.${f}`) }}
        </button>
      </nav>

      <p v-if="loading" class="atrium-activity__muted">{{ t("feed.loading") }}</p>
      <p v-else-if="error" class="atrium-activity__error">{{ error }}</p>
      <p v-else-if="!items.length" class="atrium-activity__muted">{{ t("activity.empty") }}</p>

      <template v-else>
        <PlatformActivityList :items="items" :t="t" :lang="currentLang" @open="openApproval" />
        <button
          v-if="nextCursor != null"
          type="button"
          class="atrium-activity__more"
          :disabled="loadingMore"
          @click="store.loadMore()"
        >
          {{ loadingMore ? t("feed.loading") : t("feed.loadMore") }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Свой scroll-контейнер на высоту вьюпорта (как account-хаб): shell-хедер/футер — fixed
   overlay, поэтому верх/низ-clearance резервируют под них место. */
.atrium-activity {
  position: relative;
  z-index: 10;
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  padding: 7.5rem clamp(1rem, 4vw, 2rem) 6.5rem;
  box-sizing: border-box;
}
@media (max-width: 1024px) {
  .atrium-activity {
    padding-top: 9rem;
  }
}
@media (max-width: 640px) {
  .atrium-activity {
    padding-inline: 1rem;
  }
}
.atrium-activity__inner {
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  display: grid;
  gap: clamp(1.5rem, 3.5vw, 2rem);
  min-width: 0;
}
.atrium-activity__head {
  display: grid;
  gap: 0.4rem;
}
.atrium-activity__title {
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 1.7rem);
  font-weight: 700;
  color: var(--ink-primary, #f8fafc);
}
.atrium-activity__intro {
  margin: 0;
  color: color-mix(in srgb, var(--ink-secondary, #94a3b8) 88%, transparent);
  font-size: 0.95rem;
  line-height: 1.5;
}
.atrium-activity__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.atrium-activity__chip {
  appearance: none;
  background: transparent;
  border: 1px solid var(--border-1, #2a2c33);
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  color: var(--ink-secondary, #94a3b8);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}
.atrium-activity__chip:hover {
  color: var(--ink-primary, #f8fafc);
}
.atrium-activity__chip--active {
  background: var(--surface-2, #1b1d23);
  color: var(--ink-primary, #f8fafc);
  border-color: color-mix(in srgb, var(--accent, #5b8def) 50%, var(--border-1, #2a2c33));
}
.atrium-activity__muted {
  margin: 0;
  color: var(--ink-secondary, #94a3b8);
  font-size: 0.9rem;
}
.atrium-activity__error {
  margin: 0;
  color: #f1857a;
  font-size: 0.9rem;
}
.atrium-activity__more {
  justify-self: start;
  background: transparent;
  border: 1px solid var(--border-1, #2a2c33);
  color: var(--ink-secondary, #94a3b8);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  cursor: pointer;
}
.atrium-activity__more:hover {
  color: var(--ink-primary, #f8fafc);
}
.atrium-activity__more:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
