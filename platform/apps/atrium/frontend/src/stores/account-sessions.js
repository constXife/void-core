import { defineStore } from "pinia";
import { ref } from "vue";

// Реестр web-сессий инсталляции (ADR-0033): активные входы, per-session revoke,
// «выйти везде» (logout-all → RP-initiated logout у rauthy). Сетевой слой —
// fetch same-origin с credentials:include (atrium-cookie), как companion-devices.

async function callJson(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const message = body?.message || res.statusText;
    throw new Error(message);
  }
  return body;
}

export const useAccountSessionsStore = defineStore("account-sessions", () => {
  const sessions = ref([]);
  const loading = ref(false);
  const error = ref("");

  const loadSessions = async () => {
    loading.value = true;
    error.value = "";
    try {
      const body = await callJson("/auth/sessions");
      sessions.value = Array.isArray(body.sessions) ? body.sessions : [];
    } catch (e) {
      error.value = String(e.message || e);
    } finally {
      loading.value = false;
    }
  };

  const revokeSession = async (id) => {
    await callJson(`/auth/sessions/${id}/revoke`, { method: "POST" });
    await loadSessions();
  };

  // «Выйти везде»: ревок всех сессий + URL для RP-initiated logout у rauthy.
  // Возвращает URL (или null) — вызывающий уводит браузер туда, иначе rauthy SSO
  // молча вернёт вход.
  const logoutAll = async () => {
    const body = await callJson("/auth/logout-all", { method: "POST" });
    return body?.rauthy_logout_url || null;
  };

  return { sessions, loading, error, loadSessions, revokeSession, logoutAll };
});
