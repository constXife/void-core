<script setup>
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAccountSessionsStore } from "../stores/account-sessions.js";

// Реестр web-сессий в atrium account-хабе (ADR-0033 §7). Визуально переиспользует
// глобальные классы `assistant-devices__*` (загружены через app.css) для
// согласованности со списком устройств; логика — account-sessions store.

const props = defineProps({
  t: { type: Function, required: true }
});
const t = (key, vars = {}) => props.t(key, vars);

const store = useAccountSessionsStore();
const { sessions, loading, error } = storeToRefs(store);

onMounted(() => {
  store.loadSessions();
});

const surfaceLabel = (surface) =>
  surface === "companion"
    ? t("account.sessions.surface.companion")
    : t("account.sessions.surface.web");

const formatWhen = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
};

const sessionMeta = (session) =>
  [
    surfaceLabel(session.surface),
    session.geo || t("account.sessions.geoUnknown"),
    formatWhen(session.last_seen_at)
  ]
    .filter(Boolean)
    .join(" · ");

const onRevoke = (session) => {
  if (!window.confirm(t("account.sessions.revokeConfirm"))) return;
  store.revokeSession(session.session_id);
};

const onLogoutAll = async () => {
  if (!window.confirm(t("account.sessions.logoutAllConfirm"))) return;
  const url = await store.logoutAll();
  window.location.href = url || "/login";
};
</script>

<template>
  <section class="assistant-devices">
    <header class="assistant-devices__head">
      <div>
        <h2 class="assistant-devices__title">{{ t("account.sessions.title") }}</h2>
        <p class="assistant-devices__intro">{{ t("account.sessions.intro") }}</p>
      </div>
      <button
        v-if="sessions.length"
        type="button"
        class="assistant-devices__add"
        @click="onLogoutAll"
      >
        {{ t("account.sessions.logoutAll") }}
      </button>
    </header>

    <p v-if="error" class="assistant-devices__error" role="alert">{{ error }}</p>

    <p v-if="loading && sessions.length === 0" class="assistant-devices__hint">
      {{ t("account.sessions.loading") }}
    </p>
    <p v-else-if="sessions.length === 0" class="assistant-devices__hint">
      {{ t("account.sessions.empty") }}
    </p>
    <ul v-else class="assistant-devices__list">
      <li
        v-for="session in sessions"
        :key="session.session_id"
        class="assistant-devices__item"
      >
        <div class="assistant-devices__item-main">
          <span class="assistant-devices__item-name">
            {{ session.user_agent || surfaceLabel(session.surface) }}
          </span>
          <span class="assistant-devices__item-platform">{{ sessionMeta(session) }}</span>
        </div>
        <div class="assistant-devices__badges">
          <span v-if="session.current" class="assistant-devices__badge">
            {{ t("account.sessions.current") }}
          </span>
        </div>
        <button
          v-if="!session.current"
          type="button"
          class="assistant-devices__revoke"
          @click="onRevoke(session)"
        >
          {{ t("account.sessions.revoke") }}
        </button>
      </li>
    </ul>
  </section>
</template>
