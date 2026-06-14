<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { ShieldCheck, Smartphone, ChevronDown } from "lucide-vue-next";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { useApprovalsStore } from "../stores/approvals.js";

// Web «Апрувы» (ADR-0034): очередь pending + история/аудит. approve device_factor — только
// на устройстве (WYSIWYS); тут просмотр + reject + «подтвердите на устройстве».

const appStore = useAtriumAppStore();
const t = (key, vars = {}) => appStore.t(key, vars);
const store = useApprovalsStore();
const { items, scope, loading, error } = storeToRefs(store);

const expanded = ref(null); // id раскрытой карточки
const detail = ref(null);
const detailLoading = ref(false);
const busy = ref("");

onMounted(() => store.load("pending"));

const TERMINAL = new Set(["completed", "failed", "rejected", "cancelled", "expired"]);
const isPending = (s) => s === "awaiting_approval";
const isDeviceFactor = (item) => item?.requirement?.method === "device_factor";

const statusLabel = (status) => t(`approvals.status.${status}`, {});
const statusTone = (status) =>
  status === "completed" || status === "approved"
    ? "ok"
    : status === "rejected" || status === "failed"
      ? "bad"
      : TERMINAL.has(status)
        ? "muted"
        : "wait";

const subjectLabel = (type) =>
  type === "auth_gate" ? t("approvals.type.authGate") : t("approvals.type.toolApply");

// Заголовок карточки: человекочитаемый operation из preview, иначе класс/тип.
const titleOf = (item) =>
  item?.preview?.operation || item?.consequence_class || subjectLabel(item?.subject_type);

// Детали preview как пары ключ-значение (preview.event либо сам preview без operation).
const previewPairs = (preview) => {
  if (!preview || typeof preview !== "object") return [];
  const source = preview.event && typeof preview.event === "object" ? preview.event : preview;
  return Object.entries(source)
    .filter(([key]) => key !== "operation")
    .map(([key, value]) => [key, typeof value === "object" ? JSON.stringify(value) : String(value)]);
};

const toggle = async (item) => {
  if (expanded.value === item.id) {
    expanded.value = null;
    return;
  }
  expanded.value = item.id;
  detail.value = null;
  detailLoading.value = true;
  try {
    detail.value = await store.loadDetail(item.id);
  } catch (e) {
    detail.value = { error: String(e.message || e) };
  } finally {
    detailLoading.value = false;
  }
};

const onReject = async (item) => {
  busy.value = item.id;
  try {
    await store.reject(item.id);
    if (expanded.value === item.id) expanded.value = null;
  } catch (e) {
    error.value = String(e.message || e);
  } finally {
    busy.value = "";
  }
};
</script>

<template>
  <div class="approvals">
    <div class="approvals__inner">
      <header class="approvals__head">
        <h1 class="approvals__title">
          <ShieldCheck :size="20" />
          {{ t("approvals.title") }}
        </h1>
        <p class="approvals__intro">{{ t("approvals.intro") }}</p>
      </header>

      <div class="approvals__tabs">
        <button
          class="approvals__tab"
          :class="{ 'approvals__tab--active': scope === 'pending' }"
          type="button"
          @click="store.load('pending')"
        >
          {{ t("approvals.tab.pending") }}
        </button>
        <button
          class="approvals__tab"
          :class="{ 'approvals__tab--active': scope === 'all' }"
          type="button"
          @click="store.load('all')"
        >
          {{ t("approvals.tab.history") }}
        </button>
      </div>

      <p v-if="loading" class="approvals__muted">{{ t("approvals.loading") }}</p>
      <p v-else-if="error" class="approvals__error">{{ error }}</p>
      <p v-else-if="!items.length" class="approvals__muted">{{ t("approvals.empty") }}</p>

      <ul v-else class="approvals__list">
        <li v-for="item in items" :key="item.id" class="approvals__item">
          <button class="approvals__row" type="button" @click="toggle(item)">
            <div class="approvals__row-main">
              <span class="approvals__op">{{ titleOf(item) }}</span>
              <span class="approvals__meta">
                {{ subjectLabel(item.subject_type) }} · {{ item.consequence_class }} ·
                {{ item.created_at }}
              </span>
            </div>
            <span class="approvals__badge" :class="`approvals__badge--${statusTone(item.status)}`">
              {{ statusLabel(item.status) }}
            </span>
            <ChevronDown :size="16" class="approvals__chev" />
          </button>

          <div v-if="expanded === item.id" class="approvals__detail">
            <p v-if="detailLoading" class="approvals__muted">{{ t("approvals.loading") }}</p>
            <template v-else>
              <dl class="approvals__kv">
                <div v-for="[k, v] in previewPairs(item.preview)" :key="k" class="approvals__kv-row">
                  <dt>{{ k }}</dt>
                  <dd>{{ v }}</dd>
                </div>
                <div class="approvals__kv-row">
                  <dt>{{ t("approvals.requester") }}</dt>
                  <dd>{{ item.requester_subject }}</dd>
                </div>
                <div class="approvals__kv-row">
                  <dt>{{ t("approvals.method") }}</dt>
                  <dd>{{ item.requirement?.method }}</dd>
                </div>
              </dl>

              <div v-if="detail?.grants?.length" class="approvals__audit">
                <h3 class="approvals__audit-title">{{ t("approvals.audit") }}</h3>
                <div v-for="(g, i) in detail.grants" :key="i" class="approvals__audit-row">
                  {{ t(`approvals.decision.${g.decision}`) }} ·
                  {{ g.method }}<template v-if="g.credential_ref"> · {{ g.credential_ref }}</template>
                  · {{ g.created_at }}
                </div>
              </div>

              <p v-if="item.error" class="approvals__error">{{ item.error }}</p>

              <div class="approvals__actions">
                <p v-if="isPending(item) && isDeviceFactor(item)" class="approvals__device">
                  <Smartphone :size="15" />
                  <span>{{ t("approvals.onDevice") }}</span>
                </p>
                <button
                  v-if="isPending(item)"
                  class="approvals__reject"
                  type="button"
                  :disabled="busy === item.id"
                  @click="onReject(item)"
                >
                  {{ t("approvals.reject") }}
                </button>
              </div>
            </template>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* account-hub contract: свой scroll-контейнер + clearance под fixed header/footer. */
.approvals {
  position: relative;
  z-index: 10;
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  padding: 6rem clamp(1rem, 4vw, 2rem) 5rem;
  box-sizing: border-box;
}
@media (max-width: 1024px) {
  .approvals {
    padding-top: 7.5rem;
  }
}
.approvals__inner {
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  display: grid;
  gap: 1.25rem;
  min-width: 0;
}
.approvals__head {
  display: grid;
  gap: 0.4rem;
}
.approvals__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 1.7rem);
  font-weight: 700;
  color: var(--ink-primary, #f8fafc);
}
.approvals__intro {
  margin: 0;
  color: color-mix(in srgb, var(--ink-secondary, #94a3b8) 88%, transparent);
  font-size: 0.95rem;
}
.approvals__tabs {
  display: flex;
  gap: 0.5rem;
}
.approvals__tab {
  background: transparent;
  border: 1px solid var(--border-1, #2a2c33);
  color: var(--ink-secondary, #94a3b8);
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  font-size: 0.85rem;
  cursor: pointer;
}
.approvals__tab--active {
  background: var(--surface-2, #1b1d23);
  color: var(--ink-primary, #f8fafc);
  border-color: color-mix(in srgb, var(--accent, #5b8def) 50%, var(--border-1, #2a2c33));
}
.approvals__muted {
  color: var(--ink-secondary, #94a3b8);
  font-size: 0.9rem;
}
.approvals__error {
  color: #f1857a;
  font-size: 0.9rem;
}
.approvals__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
  min-width: 0;
}
.approvals__item {
  border: 1px solid var(--border-1, #2a2c33);
  border-radius: 12px;
  background: var(--surface-1, #14151a);
  overflow: hidden;
  min-width: 0;
}
.approvals__row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: inherit;
  min-width: 0;
}
.approvals__row-main {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 0.2rem;
}
.approvals__op {
  font-weight: 600;
  color: var(--ink-primary, #f8fafc);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.approvals__meta {
  font-size: 0.78rem;
  color: var(--ink-secondary, #94a3b8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.approvals__badge {
  font-size: 0.72rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
}
.approvals__badge--ok {
  background: rgba(70, 180, 120, 0.16);
  color: #7ed3a6;
}
.approvals__badge--bad {
  background: rgba(220, 80, 60, 0.16);
  color: #f1a097;
}
.approvals__badge--wait {
  background: rgba(230, 184, 0, 0.16);
  color: #e6c34d;
}
.approvals__badge--muted {
  background: var(--surface-2, #1b1d23);
  color: var(--ink-secondary, #94a3b8);
}
.approvals__chev {
  color: var(--ink-secondary, #94a3b8);
  flex: none;
}
.approvals__detail {
  padding: 0.5rem 1rem 1rem;
  border-top: 1px solid var(--border-1, #2a2c33);
  display: grid;
  gap: 0.75rem;
}
.approvals__kv {
  margin: 0;
  display: grid;
  gap: 0.3rem;
}
.approvals__kv-row {
  display: grid;
  grid-template-columns: minmax(6rem, 9rem) 1fr;
  gap: 0.5rem;
  font-size: 0.82rem;
}
.approvals__kv-row dt {
  color: var(--ink-secondary, #94a3b8);
}
.approvals__kv-row dd {
  margin: 0;
  color: var(--ink-primary, #f8fafc);
  word-break: break-word;
}
.approvals__audit-title {
  margin: 0 0 0.3rem;
  font-size: 0.8rem;
  color: var(--ink-secondary, #94a3b8);
}
.approvals__audit-row {
  font-size: 0.8rem;
  color: var(--ink-primary, #f8fafc);
}
.approvals__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.approvals__device {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: 0.82rem;
  color: #e6c34d;
}
.approvals__reject {
  background: transparent;
  border: 1px solid rgba(220, 80, 60, 0.5);
  color: #f1a097;
  border-radius: 8px;
  padding: 0.45rem 0.9rem;
  font-size: 0.85rem;
  cursor: pointer;
  margin-left: auto;
}
.approvals__reject:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
