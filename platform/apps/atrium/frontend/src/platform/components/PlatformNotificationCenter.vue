<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Bell, ArrowRight } from "@lucide/vue";
import { connectAssistantUserEvents } from "../../lib/assistant-user-events-client.js";
import PlatformActivityList from "./PlatformActivityList.vue";

// Платформенный колокол ленты обновлений для продуктовых хедеров (calendar/finance/inventory).
// Self-contained: без pinia/vue-router — состояние локальное, i18n через проп `t`. Это GLANCE —
// только события за последние 24ч (REST `/auth/events/recent?since=`, live — WS `/auth/events`);
// полный архив с фильтрами живёт на странице активности («Вся активность» внизу панели).
// Апрувы управляются на atrium → «Открыть» уводит туда (`domain`/`openApproval`).

const props = defineProps({
  t: { type: Function, required: true },
  domain: { type: String, default: "" },
  // Локаль для дневных заголовков/времени (Intl). См. group-by-day / PlatformActivityList.
  lang: { type: String, default: "" },
  // SPA-хост (atrium) передаёт колбэк для in-app навигации на «Апрувы»; продукты не передают —
  // тогда уход на atrium-страницу апрувов по `domain` (cross-origin).
  openApproval: { type: Function, default: null },
  // SPA-хост передаёт колбэк навигации на страницу активности; продукты — cross-origin на atrium.
  openActivity: { type: Function, default: null }
});

const WINDOW_HOURS = 24;

const open = ref(false);
const items = ref([]); // newest-first; кадры { id, event, session_id, data, created_at }
const lastSeenId = ref(0);
const cutoffMs = ref(Date.now() - WINDOW_HOURS * 3600_000);
let connection = null;

const refreshCutoff = () => {
  cutoffMs.value = Date.now() - WINDOW_HOURS * 3600_000;
};

// Только последние 24ч. Live-кадр без created_at (страховка) не отсеиваем.
const windowItems = computed(() =>
  items.value.filter((item) => {
    const ms = Date.parse(item?.created_at);
    return Number.isNaN(ms) ? true : ms >= cutoffMs.value;
  })
);

const unreadCount = computed(
  () => windowItems.value.filter((item) => Number(item.id) > lastSeenId.value).length
);

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
  if (items.value.length > 200) items.value.splice(200); // защитный кап буфера
};

const loadRecent = async () => {
  refreshCutoff();
  const since = new Date(cutoffMs.value).toISOString();
  try {
    const body = await callJson(`/auth/events/recent?since=${encodeURIComponent(since)}&limit=50`);
    items.value = Array.isArray(body.events) ? body.events : []; // recent отдаёт newest-first
    lastSeenId.value = Number(body.last_seen_id || 0);
  } catch (error) {
    // лента не критична — остаётся пустой/прежней, но ошибку не глотаем
    console.error("void: notification feed recent load failed", error);
  }
};

// Отметить всё видимое прочитанным (на открытии панели).
const markAllSeen = async () => {
  const maxId = windowItems.value.reduce(
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
  if (open.value) {
    refreshCutoff();
    markAllSeen();
  }
};

// Companion-поверхность (Phase 3): шелл кладёт JS-читаемый marker-cookie при инжекте сессии.
// В companion тап по апруву уводит на сентинел-схему — шелл перехватывает и поднимает нативную
// карточку (WYSIWYS device_factor); в обычном браузере апрув device_factor не подтвердить из веба.
const inCompanion =
  typeof document !== "undefined" && document.cookie.split("; ").includes("void_companion=1");

const atriumHref = (path) => (props.domain ? `https://atrium.${props.domain}${path}` : path);

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
  window.location.href = atriumHref("/approvals");
};

const openActivityPage = () => {
  open.value = false;
  if (props.openActivity) {
    props.openActivity();
    return;
  }
  window.location.href = atriumHref("/activity");
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
        <p v-if="!windowItems.length" class="notif__empty">{{ t("feed.empty24h") }}</p>
        <div v-else class="notif__body">
          <PlatformActivityList :items="windowItems" :t="t" :lang="lang" @open="openApprovalItem" />
        </div>
        <button type="button" class="notif__foot" @click="openActivityPage">
          {{ t("feed.allActivity") }}
          <ArrowRight :size="14" />
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
  display: flex;
  flex-direction: column;
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
  flex: none;
}
.notif__empty {
  margin: 0;
  padding: 1.2rem 0.9rem;
  color: var(--ink-secondary, #94a3b8);
  font-size: 0.9rem;
}
.notif__body {
  padding: 0.3rem;
  overflow-y: auto;
  min-height: 0;
}
.notif__foot {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
  padding: 0.6rem;
  background: transparent;
  border: none;
  border-top: 1px solid var(--border-1, #2a2c33);
  color: var(--ink-secondary, #94a3b8);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
}
.notif__foot:hover {
  color: var(--ink-primary, #f8fafc);
}
</style>
