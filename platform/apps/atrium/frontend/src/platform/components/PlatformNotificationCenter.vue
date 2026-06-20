<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Activity, Bell, Inbox, KeyRound, MessageSquare, ShieldCheck } from "lucide-vue-next";
import { connectAssistantUserEvents } from "../../lib/assistant-user-events-client.js";
import { groupByDay } from "../../lib/group-by-day.js";

// Платформенный колокол ленты обновлений для продуктовых хедеров (calendar/finance/inventory).
// Self-contained: без pinia/vue-router — состояние локальное, i18n через проп `t`. История —
// REST `/auth/events/recent`, live — WS `/auth/events` (same-origin: каждый продуктовый хост
// монтирует platform_events_web). Апрувы управляются на atrium → «Открыть» уводит туда (`domain`).

const props = defineProps({
  t: { type: Function, required: true },
  domain: { type: String, default: "" },
  // Локаль для дневных заголовков (Intl-форматирование дат). См. group-by-day.
  lang: { type: String, default: "" },
  // SPA-хост (atrium) передаёт колбэк для in-app навигации на «Апрувы»; продукты не передают —
  // тогда уход на atrium-страницу апрувов по `domain` (cross-origin).
  openApproval: { type: Function, default: null }
});

const open = ref(false);
const items = ref([]); // newest-first; кадры { id, event, session_id, data }
const lastSeenId = ref(0);
const nextCursor = ref(null); // id для следующей страницы истории (keyset), null = дальше пусто
const loadingMore = ref(false);
const expanded = ref(false); // догружали историю → не каппим живые prepend'ы (иначе срежет догрузку)
let connection = null;

const unreadCount = computed(
  () => items.value.filter((item) => Number(item.id) > lastSeenId.value).length
);

// Дневные секции с заголовками (Сегодня/Вчера/дата) — общий рендер с панелью апрувов.
const dayGroups = computed(() => groupByDay(items.value, { t: props.t, locale: props.lang }));

async function callJson(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(body?.message || res.statusText);
  return body;
}

const upsert = (frame) => {
  const id = Number(frame?.id || 0);
  if (!id || items.value.some((item) => Number(item.id) === id)) return;
  items.value.unshift(frame);
  // Каппим живой prepend только пока историю не догружали — иначе splice срежет догрузку.
  if (!expanded.value && items.value.length > 100) items.value.splice(100);
};

const loadRecent = async () => {
  try {
    const body = await callJson("/auth/events/recent");
    items.value = Array.isArray(body.events) ? body.events : []; // recent отдаёт newest-first
    lastSeenId.value = Number(body.last_seen_id || 0);
    nextCursor.value = body.next_cursor ?? null;
  } catch (error) {
    // лента не критична — остаётся пустой/прежней, но ошибку не глотаем
    console.error("void: notification feed recent load failed", error);
  }
};

// «Загрузить ещё»: keyset-страница старше курсора, дописывается в конец (старые внизу).
const loadMore = async () => {
  if (nextCursor.value == null || loadingMore.value) return;
  loadingMore.value = true;
  expanded.value = true;
  try {
    const body = await callJson(`/auth/events/recent?before=${nextCursor.value}&limit=50`);
    const more = Array.isArray(body.events) ? body.events : [];
    const known = new Set(items.value.map((item) => Number(item.id)));
    for (const event of more) {
      if (!known.has(Number(event.id))) items.value.push(event);
    }
    nextCursor.value = body.next_cursor ?? null;
  } catch (error) {
    console.error("void: notification feed load-more failed", error);
  } finally {
    loadingMore.value = false;
  }
};

// Отметить всё видимое прочитанным (на открытии панели).
const markAllSeen = async () => {
  const maxId = items.value.reduce(
    (max, item) => Math.max(max, Number(item.id) || 0),
    lastSeenId.value
  );
  if (maxId <= lastSeenId.value) return;
  lastSeenId.value = maxId;
  try {
    await callJson("/auth/events/seen", {
      method: "POST",
      body: JSON.stringify({ up_to_id: maxId })
    });
  } catch (error) {
    // best-effort; локальный курсор уже сдвинут, но ошибку не глотаем
    console.error("void: notification feed mark-seen failed", error);
  }
};

onMounted(() => {
  loadRecent();
  connection = connectAssistantUserEvents({ path: "/auth/events", onEvent: upsert });
});

onUnmounted(() => {
  connection?.close();
  connection = null;
});

const toggle = () => {
  open.value = !open.value;
  if (open.value) markAllSeen();
};

const iconFor = (event) =>
  event === "approval.requested" || event === "approval.status"
    ? ShieldCheck
    : event === "message.created"
      ? MessageSquare
      : event === "run.status"
        ? Activity
        : event === "session.updated"
          ? KeyRound
          : Inbox;

const titleFor = (item) => {
  const data = item?.data || {};
  switch (item?.event) {
    case "approval.requested": {
      const what = data.preview?.title || data.preview?.operation || data.consequence_class || "";
      return props.t("feed.event.approval", { what });
    }
    case "approval.status":
      return props.t("feed.event.approvalStatus", { status: data.status || "" });
    case "message.created":
      return props.t("feed.event.message");
    case "run.status":
      return props.t("feed.event.run", { status: data.status || "" });
    case "session.updated":
      return props.t("feed.event.session");
    default:
      return item?.event || "";
  }
};

const isPendingApproval = (item) => item?.event === "approval.requested";

// Companion-поверхность (Phase 3): шелл кладёт JS-читаемый marker-cookie при инжекте сессии.
// В companion тап по апруву уводит на сентинел-схему — шелл перехватывает и поднимает нативную
// карточку (WYSIWYS device_factor); в обычном браузере апрув device_factor не подтвердить из веба.
const inCompanion =
  typeof document !== "undefined" && document.cookie.split("; ").includes("void_companion=1");

// Апрувы живут на atrium: на продукте «Открыть» уводит на atrium-страницу апрувов.
const approvalsHref = computed(() =>
  props.domain ? `https://atrium.${props.domain}/approvals` : "/approvals"
);

const openApprovalItem = (item) => {
  open.value = false;
  // Companion: тап → нативная карточка именно этого запроса (id из события).
  const requestId = item?.data?.approval_request_id;
  if (inCompanion && requestId) {
    window.location.href = `voidcompanion://approval/${encodeURIComponent(requestId)}`;
    return;
  }
  // SPA-хост (atrium/assistant) — in-app переход; продукт — cross-origin на atrium.
  if (props.openApproval) {
    props.openApproval();
    return;
  }
  window.location.href = approvalsHref.value;
};
</script>

<template>
  <div class="notif">
    <button class="notif__bell" type="button" :aria-label="t('feed.title')" @click="toggle">
      <Bell :size="18" />
      <span v-if="unreadCount > 0" class="notif__badge">{{ unreadCount > 9 ? "9+" : unreadCount }}</span>
    </button>

    <template v-if="open">
      <div class="notif__overlay" @click="open = false"></div>
      <div class="notif__panel">
        <header class="notif__head">{{ t("feed.title") }}</header>
        <p v-if="!items.length" class="notif__empty">{{ t("feed.empty") }}</p>
        <div v-else class="notif__groups">
          <section v-for="group in dayGroups" :key="group.key" class="notif__day">
            <h4 class="notif__day-label">{{ group.label }}</h4>
            <ul class="notif__list">
              <li v-for="item in group.items" :key="item.id" class="notif__item">
                <component :is="iconFor(item.event)" :size="16" class="notif__item-icon" />
                <div class="notif__item-main">
                  <span class="notif__item-title">{{ titleFor(item) }}</span>
                  <button
                    v-if="isPendingApproval(item)"
                    class="notif__item-action"
                    type="button"
                    @click="openApprovalItem(item)"
                  >
                    {{ t("feed.open") }}
                  </button>
                </div>
              </li>
            </ul>
          </section>
        </div>
        <button
          v-if="nextCursor != null"
          type="button"
          class="notif__more"
          :disabled="loadingMore"
          @click="loadMore"
        >
          {{ loadingMore ? t("feed.loading") : t("feed.loadMore") }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.notif {
  position: relative;
  display: inline-flex;
}
.notif__bell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: var(--ink-secondary, #94a3b8);
  cursor: pointer;
}
.notif__bell:hover {
  background: color-mix(in srgb, var(--ink-secondary, #94a3b8) 14%, transparent);
  color: var(--ink-primary, #f8fafc);
}
.notif__badge {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: #e5484d;
  color: #fff;
  font-size: 0.65rem;
  line-height: 1rem;
  font-weight: 700;
  text-align: center;
}
.notif__overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.notif__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 41;
  width: min(22rem, 90vw);
  max-height: 70vh;
  overflow-y: auto;
  background: var(--surface-1, #14151a);
  border: 1px solid var(--border-1, #2a2c33);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}
.notif__head {
  padding: 0.7rem 0.9rem;
  font-weight: 700;
  color: var(--ink-primary, #f8fafc);
  border-bottom: 1px solid var(--border-1, #2a2c33);
}
.notif__empty {
  margin: 0;
  padding: 1.2rem 0.9rem;
  color: var(--ink-secondary, #94a3b8);
  font-size: 0.9rem;
}
.notif__groups {
  padding: 0.3rem;
  display: grid;
  gap: 0.55rem;
}
.notif__day-label {
  margin: 0;
  padding: 0.15rem 0.3rem 0.2rem;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-secondary, #94a3b8);
}
.notif__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.15rem;
}
.notif__item {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  padding: 0.55rem 0.6rem;
  border-radius: 8px;
}
.notif__item:hover {
  background: var(--surface-2, #1b1d23);
}
.notif__item-icon {
  margin-top: 0.1rem;
  color: var(--ink-secondary, #94a3b8);
  flex: none;
}
.notif__more {
  width: calc(100% - 1.2rem);
  margin: 0.2rem 0.6rem 0.4rem;
  background: transparent;
  border: 1px solid var(--border-1, #2a2c33);
  color: var(--ink-secondary, #94a3b8);
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
  font-size: 0.82rem;
  cursor: pointer;
}
.notif__more:hover {
  color: var(--ink-primary, #f8fafc);
}
.notif__more:disabled {
  opacity: 0.6;
  cursor: default;
}
.notif__item-main {
  min-width: 0;
  display: grid;
  gap: 0.25rem;
}
.notif__item-title {
  color: var(--ink-primary, #f8fafc);
  font-size: 0.88rem;
  line-height: 1.35;
  word-break: break-word;
}
.notif__item-action {
  justify-self: start;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--accent, #5b8def) 55%, var(--border-1, #2a2c33));
  color: var(--accent, #5b8def);
  border-radius: 7px;
  padding: 0.2rem 0.6rem;
  font-size: 0.78rem;
  cursor: pointer;
}
</style>
