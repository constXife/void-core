<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { RotateCcw } from "lucide-vue-next";
import { createAtriumApi } from "../lib/atrium-api.js";
import { useAtriumAppStore } from "../stores/atrium-app.js";

const appStore = useAtriumAppStore();
const { currentLang } = storeToRefs(appStore);
const { fetchJSON } = createAtriumApi();

const loading = ref(true);
const error = ref("");
const summary = ref(null);

const copy = computed(() =>
  currentLang.value === "ru"
    ? {
        eyebrow: "Shopping v0",
        title: "Нужно купить, что уже в списке и что недавно закрыто.",
        subtitle:
          "Это тонкий product-facing read path поверх Arkham Knowledge API, без browser-side raw MCP.",
        back: "Назад к Atrium",
        retry: "Обновить",
        loadFailed: "Не удалось загрузить shopping snapshot.",
        unavailable:
          "Shopping perimeter ещё не сконфигурирован. Проверь `KNOWLEDGE_API_*` env у Atrium backend.",
        needs: "Нужно купить",
        run: "Сейчас в списке",
        closed: "Недавно закрыто",
        needCount: "Активных потребностей",
        actionableCount: "Actionable items",
        closedCount: "Закрыто недавно",
        emptyNeeds: "Активных purchase intent пока нет.",
        emptyRun: "Активный shopping run пока не найден.",
        emptyClosed: "Недавно закрытых позиций пока нет.",
        untitled: "Без названия"
      }
    : {
        eyebrow: "Shopping v0",
        title: "What needs to be bought, what is in the current list, and what was closed recently.",
        subtitle:
          "This is a thin product-facing read path on top of Arkham Knowledge API, without browser-side raw MCP.",
        back: "Back to Atrium",
        retry: "Refresh",
        loadFailed: "Failed to load shopping snapshot.",
        unavailable:
          "Shopping perimeter is not configured yet. Check Atrium backend `KNOWLEDGE_API_*` env.",
        needs: "Need to buy",
        run: "In current run",
        closed: "Recently closed",
        needCount: "Active needs",
        actionableCount: "Actionable items",
        closedCount: "Recently closed",
        emptyNeeds: "No active purchase intents yet.",
        emptyRun: "No active shopping run yet.",
        emptyClosed: "No recently closed items yet.",
        untitled: "Untitled"
      }
);

const needsToBuy = computed(() => summary.value?.needs_to_buy?.items || []);
const activeRun = computed(() => summary.value?.active_run?.run || null);
const activeRunItems = computed(() => summary.value?.active_run?.items || []);
const recentlyClosed = computed(() => summary.value?.recently_closed?.items || []);

const statusLabels = {
  considering: { ru: "обдумывается", en: "considering" },
  wanted: { ru: "нужно", en: "wanted" },
  planned: { ru: "запланировано", en: "planned" },
  fulfilled: { ru: "закрыто", en: "fulfilled" },
  cancelled: { ru: "отменено", en: "cancelled" },
  suggested: { ru: "предложено", en: "suggested" },
  accepted: { ru: "принято", en: "accepted" },
  deferred: { ru: "отложено", en: "deferred" },
  dismissed: { ru: "снято", en: "dismissed" },
  purchased: { ru: "куплено", en: "purchased" },
  active: { ru: "активен", en: "active" },
  completed: { ru: "завершён", en: "completed" }
};

const priorityLabels = {
  low: { ru: "низкий", en: "low" },
  normal: { ru: "обычный", en: "normal" },
  high: { ru: "высокий", en: "high" }
};

const localizedValue = (table, value) => {
  const item = table[String(value || "").toLowerCase()];
  if (!item) return String(value || "");
  return currentLang.value === "ru" ? item.ru : item.en;
};

const titleFor = (item) =>
  item?.title ||
  item?.name ||
  item?.item_name ||
  item?.intent_id ||
  item?.item_id ||
  copy.value.untitled;

const compactDate = (value) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(currentLang.value === "ru" ? "ru-RU" : "en-US", {
      day: "2-digit",
      month: "short"
    }).format(new Date(value));
  } catch {
    return "";
  }
};

const chipText = (item) => {
  const parts = [];
  const status =
    item?.intent_status || item?.status || item?.run_status || item?.lifecycle_status || "";
  const priority = item?.priority || "";
  const quantity = item?.quantity_hint ? `${item.quantity_hint}${item.unit_hint ? ` ${item.unit_hint}` : ""}` : "";
  const dateText = compactDate(item?.updated_at || item?.generated_at || item?.created_at);

  if (status) parts.push(localizedValue(statusLabels, status));
  if (priority) parts.push(localizedValue(priorityLabels, priority));
  if (quantity) parts.push(quantity);
  if (dateText) parts.push(dateText);
  return parts.filter(Boolean).join(" • ");
};

const loadSummary = async () => {
  loading.value = true;
  error.value = "";
  try {
    summary.value = await fetchJSON("/api/shopping/summary");
  } catch (err) {
    summary.value = null;
    const message = String(err?.message || "");
    error.value = message.includes("shopping api not configured")
      ? copy.value.unavailable
      : message || copy.value.loadFailed;
  } finally {
    loading.value = false;
  }
};

onMounted(loadSummary);
</script>

<template>
  <section class="shopping-page">
    <header class="shopping-hero">
      <div class="shopping-hero-copy">
        <div class="shopping-eyebrow">{{ copy.eyebrow }}</div>
        <h1 class="shopping-title">{{ copy.title }}</h1>
        <p class="shopping-subtitle">{{ copy.subtitle }}</p>
      </div>

      <div class="shopping-hero-actions">
        <button class="shopping-action shopping-action-muted" @click="appStore.navigateHome()">
          {{ copy.back }}
        </button>
        <button class="shopping-action" @click="loadSummary">
          <RotateCcw class="w-4 h-4" />
          <span>{{ copy.retry }}</span>
        </button>
      </div>
    </header>

    <section class="shopping-metrics">
      <article class="shopping-metric">
        <span class="shopping-metric-label">{{ copy.needCount }}</span>
        <strong class="shopping-metric-value">{{ summary?.need_to_buy_count || 0 }}</strong>
      </article>
      <article class="shopping-metric">
        <span class="shopping-metric-label">{{ copy.actionableCount }}</span>
        <strong class="shopping-metric-value">{{ summary?.active_run?.actionable_count || 0 }}</strong>
      </article>
      <article class="shopping-metric">
        <span class="shopping-metric-label">{{ copy.closedCount }}</span>
        <strong class="shopping-metric-value">{{ summary?.recently_closed?.count || 0 }}</strong>
      </article>
    </section>

    <div v-if="loading" class="shopping-state">Loading shopping snapshot...</div>
    <div v-else-if="error" class="shopping-state shopping-state-error">{{ error }}</div>

    <div v-else class="shopping-grid">
      <article class="shopping-panel">
        <div class="shopping-panel-header">
          <h2>{{ copy.needs }}</h2>
          <span>{{ summary?.needs_to_buy?.count || 0 }}</span>
        </div>
        <div v-if="needsToBuy.length === 0" class="shopping-empty">{{ copy.emptyNeeds }}</div>
        <ul v-else class="shopping-list">
          <li v-for="item in needsToBuy" :key="item.intent_id || item.id || item.title" class="shopping-item">
            <div class="shopping-item-title">{{ titleFor(item) }}</div>
            <div class="shopping-item-meta">{{ chipText(item) }}</div>
          </li>
        </ul>
      </article>

      <article class="shopping-panel shopping-panel-featured">
        <div class="shopping-panel-header">
          <div>
            <h2>{{ copy.run }}</h2>
            <p v-if="activeRun" class="shopping-run-title">
              {{ activeRun.title || activeRun.run_id }}
            </p>
          </div>
          <span>{{ activeRunItems.length }}</span>
        </div>
        <div v-if="!activeRun" class="shopping-empty">{{ copy.emptyRun }}</div>
        <template v-else>
          <div class="shopping-run-meta">{{ chipText(activeRun) }}</div>
          <ul v-if="activeRunItems.length > 0" class="shopping-list">
            <li
              v-for="item in activeRunItems"
              :key="item.item_id || item.title"
              class="shopping-item shopping-item-compact"
            >
              <div class="shopping-item-title">{{ titleFor(item) }}</div>
              <div class="shopping-item-meta">{{ chipText(item) }}</div>
            </li>
          </ul>
          <div v-else class="shopping-empty">{{ copy.emptyRun }}</div>
        </template>
      </article>

      <article class="shopping-panel">
        <div class="shopping-panel-header">
          <h2>{{ copy.closed }}</h2>
          <span>{{ recentlyClosed.length }}</span>
        </div>
        <div v-if="recentlyClosed.length === 0" class="shopping-empty">{{ copy.emptyClosed }}</div>
        <ul v-else class="shopping-list">
          <li
            v-for="item in recentlyClosed"
            :key="item.item_id || item.title"
            class="shopping-item"
          >
            <div class="shopping-item-title">{{ titleFor(item) }}</div>
            <div class="shopping-item-meta">{{ chipText(item) }}</div>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style scoped>
.shopping-page {
  width: min(1280px, calc(100vw - 2rem));
  margin: 0 auto 3rem;
  padding: clamp(6.5rem, 8vw, 7.75rem) 0 0;
}

.shopping-hero {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.4rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(255, 214, 102, 0.18), transparent 34%),
    linear-gradient(135deg, rgba(12, 16, 26, 0.92), rgba(20, 26, 40, 0.84));
}

.shopping-hero-copy {
  max-width: 48rem;
}

.shopping-eyebrow {
  margin-bottom: 0.55rem;
  color: rgba(255, 214, 102, 0.9);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.shopping-title {
  margin: 0;
  font-size: clamp(1.55rem, 3vw, 2.5rem);
  line-height: 1.08;
  color: #fff9e8;
}

.shopping-subtitle {
  margin: 0.8rem 0 0;
  max-width: 40rem;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.55;
}

.shopping-hero-actions {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.shopping-action {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.8rem 1rem;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 214, 102, 0.16);
  color: #fff6d6;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}

.shopping-action-muted {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
}

.shopping-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
  margin-top: 1rem;
}

.shopping-metric,
.shopping-panel {
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 24px;
  background: rgba(11, 15, 23, 0.72);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.shopping-metric {
  padding: 1rem 1.1rem;
}

.shopping-metric-label {
  display: block;
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.82rem;
}

.shopping-metric-value {
  display: block;
  margin-top: 0.45rem;
  color: #fff8e5;
  font-size: 1.9rem;
  line-height: 1;
}

.shopping-state {
  margin-top: 1rem;
  padding: 1rem 1.1rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.8);
}

.shopping-state-error {
  border: 1px solid rgba(255, 128, 96, 0.34);
  background: rgba(101, 22, 18, 0.35);
  color: #ffd9c9;
}

.shopping-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.shopping-panel {
  padding: 1.1rem;
}

.shopping-panel-featured {
  background:
    radial-gradient(circle at top right, rgba(255, 214, 102, 0.12), transparent 32%),
    rgba(11, 15, 23, 0.78);
}

.shopping-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.shopping-panel-header h2 {
  margin: 0;
  color: #fff8e5;
  font-size: 1rem;
}

.shopping-panel-header span {
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
}

.shopping-run-title,
.shopping-run-meta,
.shopping-item-meta,
.shopping-empty {
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.88rem;
  line-height: 1.5;
}

.shopping-run-title {
  margin: 0.35rem 0 0;
  color: rgba(255, 255, 255, 0.82);
}

.shopping-run-meta {
  margin-top: 0.7rem;
}

.shopping-list {
  display: grid;
  gap: 0.7rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.shopping-item {
  padding: 0.8rem 0.9rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
}

.shopping-item-compact {
  background: rgba(255, 214, 102, 0.06);
}

.shopping-item-title {
  color: #fffdf5;
  font-weight: 600;
  line-height: 1.35;
}

.shopping-item-meta {
  margin-top: 0.3rem;
}

.shopping-empty {
  margin-top: 1rem;
}

@media (max-width: 980px) {
  .shopping-page {
    padding-top: 9.5rem;
  }

  .shopping-metrics,
  .shopping-grid {
    grid-template-columns: 1fr;
  }

  .shopping-hero {
    flex-direction: column;
  }
}
</style>
