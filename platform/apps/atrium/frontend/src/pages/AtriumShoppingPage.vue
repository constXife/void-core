<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Plus, RotateCcw } from "lucide-vue-next";
import { useAtriumAppStore } from "../stores/atrium-app.js";

const appStore = useAtriumAppStore();
const {
  currentLang,
  shoppingMutationError,
  shoppingMutationPendingKey,
  shoppingSummary,
  shoppingSummaryError,
  shoppingSummaryLoading
} = storeToRefs(appStore);

const manualItemTitle = ref("");

const copy = computed(() =>
  currentLang.value === "ru"
      ? {
        eyebrow: "Shopping v0",
        title: "Нужно купить, что уже в списке и что недавно закрыто.",
        subtitle:
          "Это тонкий product-facing read/write path поверх Arkham Knowledge API, без browser-side raw MCP.",
        back: "Назад к Atrium",
        retry: "Обновить",
        loadFailed: "Не удалось загрузить shopping snapshot.",
        unavailable:
          "Shopping perimeter ещё не сконфигурирован. Проверь `KNOWLEDGE_API_*` env у Atrium backend.",
        actionFailed: "Не удалось применить shopping-изменение.",
        loading: "Загружаем shopping snapshot...",
        needs: "Нужно купить",
        run: "Сейчас в списке",
        closed: "Недавно закрыто",
        needCount: "Активных потребностей",
        actionableCount: "Actionable items",
        closedCount: "Закрыто недавно",
        emptyNeeds: "Активных purchase intent пока нет.",
        emptyRun:
          "Активного shopping run сейчас нет. Он появится автоматически, когда ты добавишь первую позицию.",
        emptyClosed:
          "Здесь видны только купленные и снятые позиции. Отложенный остаток остаётся в истории run.",
        untitled: "Без названия",
        addToRun: "В список",
        alreadyQueued: "Уже в run",
        closeRun: "Закрыть run и отложить остаток",
        closeRunHint:
          "При закрытии незавершённые позиции переходят в «отложено» и не попадают в «недавно закрыто».",
        quickAddLabel: "Быстро добавить вручную",
        quickAddPlaceholder: "Например: фильтры для кофе",
        quickAddButton: "Добавить",
        quickAddRequired: "Сначала укажи название позиции.",
        accept: "Принять",
        defer: "Отложить",
        purchased: "Куплено",
        dismiss: "Снять",
        runHint: "Можно добавить вручную или притянуть из active needs."
      }
    : {
        eyebrow: "Shopping v0",
        title: "What needs to be bought, what is in the current list, and what was closed recently.",
        subtitle:
          "This is a thin product-facing read/write path on top of Arkham Knowledge API, without browser-side raw MCP.",
        back: "Back to Atrium",
        retry: "Refresh",
        loadFailed: "Failed to load shopping snapshot.",
        unavailable:
          "Shopping perimeter is not configured yet. Check Atrium backend `KNOWLEDGE_API_*` env.",
        actionFailed: "Failed to apply shopping change.",
        loading: "Loading shopping snapshot...",
        needs: "Need to buy",
        run: "In current run",
        closed: "Recently closed",
        needCount: "Active needs",
        actionableCount: "Actionable items",
        closedCount: "Recently closed",
        emptyNeeds: "No active purchase intents yet.",
        emptyRun:
          "There is no active shopping run right now. A new run will appear automatically once you add the first item.",
        emptyClosed:
          "Only purchased and dismissed items show here. Deferred leftovers stay in run history.",
        untitled: "Untitled",
        addToRun: "Queue item",
        alreadyQueued: "Already queued",
        closeRun: "Close run and defer rest",
        closeRunHint:
          "Closing the run moves unfinished items to deferred, so they do not appear in recently closed.",
        quickAddLabel: "Quick add",
        quickAddPlaceholder: "For example: coffee filters",
        quickAddButton: "Add item",
        quickAddRequired: "Enter an item title first.",
        accept: "Accept",
        defer: "Defer",
        purchased: "Purchased",
        dismiss: "Dismiss",
        runHint: "You can add items manually or pull them from active needs."
      }
);

const summary = computed(() => shoppingSummary.value || null);
const loading = computed(() => shoppingSummaryLoading.value);
const mutationError = computed(() => shoppingMutationError.value);
const loadError = computed(() => {
  const message = String(shoppingSummaryError.value || "");
  if (!message) return "";
  return message.includes("shopping api not configured")
    ? copy.value.unavailable
    : message || copy.value.loadFailed;
});

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
  const quantity = item?.quantity_hint
    ? `${item.quantity_hint}${item.unit_hint ? ` ${item.unit_hint}` : ""}`
    : "";
  const dateText = compactDate(item?.updated_at || item?.generated_at || item?.created_at);

  if (status) parts.push(localizedValue(statusLabels, status));
  if (priority) parts.push(localizedValue(priorityLabels, priority));
  if (quantity) parts.push(quantity);
  if (dateText) parts.push(dateText);
  return parts.filter(Boolean).join(" • ");
};

const loadSummary = async ({ force = false } = {}) => {
  await appStore.loadShoppingSummary({ force });
};
const isPending = (key) => shoppingMutationPendingKey.value === key;
const isNeedQueued = (item) => appStore.shoppingNeedQueued(item);

const addNeedToRun = async (item) => {
  if (isNeedQueued(item) || !item?.intent_id) return;
  await appStore.addShoppingNeedToRun(item);
};

const addManualItem = async () => {
  const title = manualItemTitle.value.trim();
  if (!title) {
    shoppingMutationError.value = copy.value.quickAddRequired;
    return;
  }

  await appStore.addManualShoppingItem(title);
  manualItemTitle.value = "";
};

const patchItemStatus = async (item, status) => {
  if (!item?.item_id || item?.status === status) return;
  await appStore.patchShoppingItemStatus(item.item_id, status);
};

const closeRun = async () => {
  if (!activeRun.value?.run_id) return;
  await appStore.closeShoppingRun({ runID: activeRun.value.run_id });
};

onMounted(() => {
  if (!shoppingSummary.value && !shoppingSummaryLoading.value) {
    void loadSummary();
  }
});
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
        <button
          class="shopping-action"
          :disabled="loading || !!shoppingMutationPendingKey"
          @click="loadSummary({ force: true })"
        >
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

    <div v-if="loading" class="shopping-state">{{ copy.loading }}</div>
    <div v-else-if="loadError" class="shopping-state shopping-state-error">{{ loadError }}</div>
    <div v-if="mutationError" class="shopping-state shopping-state-error">{{ mutationError }}</div>

    <div v-if="!loading && !loadError" class="shopping-grid">
      <article class="shopping-panel">
        <div class="shopping-panel-header">
          <h2>{{ copy.needs }}</h2>
          <span>{{ summary?.needs_to_buy?.count || 0 }}</span>
        </div>
        <div v-if="needsToBuy.length === 0" class="shopping-empty">{{ copy.emptyNeeds }}</div>
        <ul v-else class="shopping-list">
          <li v-for="item in needsToBuy" :key="item.intent_id || item.id || item.title" class="shopping-item">
            <div class="shopping-item-row">
              <div class="shopping-item-copy">
                <div class="shopping-item-title">{{ titleFor(item) }}</div>
                <div class="shopping-item-meta">{{ chipText(item) }}</div>
              </div>
              <button
                class="shopping-chip-action"
                :disabled="isNeedQueued(item) || !!shoppingMutationPendingKey || !item.intent_id"
                @click="addNeedToRun(item)"
              >
                {{ isNeedQueued(item) ? copy.alreadyQueued : copy.addToRun }}
              </button>
            </div>
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
          <div class="shopping-panel-tools">
            <button
              v-if="activeRun"
              class="shopping-chip-action shopping-chip-action-muted"
              :disabled="!!shoppingMutationPendingKey"
              @click="closeRun"
            >
              {{ copy.closeRun }}
            </button>
            <span>{{ activeRunItems.length }}</span>
          </div>
        </div>
        <div v-if="!activeRun" class="shopping-empty">{{ copy.emptyRun }}</div>
        <template v-else>
          <div class="shopping-run-meta">{{ chipText(activeRun) }}</div>
          <p class="shopping-run-hint">{{ copy.closeRunHint }}</p>
        </template>

        <form class="shopping-quick-add" @submit.prevent="addManualItem">
          <label class="shopping-quick-add-label" for="shopping-manual-item">
            {{ copy.quickAddLabel }}
          </label>
          <div class="shopping-quick-add-row">
            <input
              id="shopping-manual-item"
              v-model="manualItemTitle"
              class="shopping-input"
              type="text"
              :placeholder="copy.quickAddPlaceholder"
              :disabled="!!shoppingMutationPendingKey"
            />
            <button
              class="shopping-action shopping-action-small"
              type="submit"
              :disabled="!!shoppingMutationPendingKey"
            >
              <Plus class="w-4 h-4" />
              <span>{{ copy.quickAddButton }}</span>
            </button>
          </div>
          <p class="shopping-quick-add-hint">{{ copy.runHint }}</p>
        </form>

        <ul v-if="activeRunItems.length > 0" class="shopping-list">
          <li
            v-for="item in activeRunItems"
            :key="item.item_id || item.title"
            class="shopping-item shopping-item-compact"
          >
            <div class="shopping-item-title">{{ titleFor(item) }}</div>
            <div class="shopping-item-meta">{{ chipText(item) }}</div>
            <div class="shopping-item-actions">
              <button
                class="shopping-chip-action"
                :disabled="!!shoppingMutationPendingKey || item.status === 'accepted'"
                @click="patchItemStatus(item, 'accepted')"
              >
                {{ copy.accept }}
              </button>
              <button
                class="shopping-chip-action shopping-chip-action-muted"
                :disabled="!!shoppingMutationPendingKey || item.status === 'deferred'"
                @click="patchItemStatus(item, 'deferred')"
              >
                {{ copy.defer }}
              </button>
              <button
                class="shopping-chip-action shopping-chip-action-success"
                :disabled="!!shoppingMutationPendingKey || item.status === 'purchased'"
                @click="patchItemStatus(item, 'purchased')"
              >
                {{ copy.purchased }}
              </button>
              <button
                class="shopping-chip-action shopping-chip-action-danger"
                :disabled="!!shoppingMutationPendingKey || item.status === 'dismissed'"
                @click="patchItemStatus(item, 'dismissed')"
              >
                {{ copy.dismiss }}
              </button>
            </div>
          </li>
        </ul>
        <div v-else class="shopping-empty">{{ copy.emptyRun }}</div>
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

.shopping-action:disabled,
.shopping-chip-action:disabled {
  cursor: default;
  opacity: 0.5;
}

.shopping-action-small {
  padding: 0.75rem 0.95rem;
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

.shopping-panel-tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.shopping-run-title,
.shopping-run-meta,
.shopping-run-hint,
.shopping-item-meta,
.shopping-empty,
.shopping-quick-add-hint {
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

.shopping-run-hint {
  margin: 0.65rem 0 0;
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

.shopping-item-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.shopping-item-copy {
  min-width: 0;
  flex: 1 1 auto;
}

.shopping-item-title {
  color: #fffdf5;
  font-weight: 600;
  line-height: 1.35;
}

.shopping-item-meta {
  margin-top: 0.3rem;
}

.shopping-item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.shopping-chip-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 249, 232, 0.9);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
}

.shopping-chip-action-muted {
  background: rgba(255, 255, 255, 0.05);
}

.shopping-chip-action-success {
  background: rgba(68, 186, 112, 0.16);
  border-color: rgba(68, 186, 112, 0.24);
}

.shopping-chip-action-danger {
  background: rgba(192, 81, 70, 0.18);
  border-color: rgba(192, 81, 70, 0.24);
}

.shopping-quick-add {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.shopping-quick-add-label {
  display: block;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.86rem;
  font-weight: 600;
}

.shopping-quick-add-row {
  display: flex;
  gap: 0.7rem;
  margin-top: 0.6rem;
}

.shopping-input {
  width: 100%;
  min-width: 0;
  padding: 0.8rem 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  color: #fffdf5;
  font: inherit;
}

.shopping-input::placeholder {
  color: rgba(255, 255, 255, 0.36);
}

.shopping-quick-add-hint {
  margin: 0.55rem 0 0;
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

  .shopping-hero,
  .shopping-item-row,
  .shopping-quick-add-row {
    flex-direction: column;
  }
}
</style>
