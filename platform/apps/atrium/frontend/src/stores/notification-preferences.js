import { defineStore } from "pinia";
import { ref } from "vue";

// Пользовательские предпочтения уведомлений (ADR-0041): event_class × channel → enabled.
// Сетевой слой — fetch same-origin с credentials:include (atrium-cookie), как account-sessions.

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

export const useNotificationPreferencesStore = defineStore("notification-preferences", () => {
  const rows = ref([]);
  const loading = ref(false);
  const error = ref("");

  const loadPreferences = async () => {
    loading.value = true;
    error.value = "";
    try {
      const body = await callJson("/auth/notifications/preferences");
      rows.value = Array.isArray(body.preferences) ? body.preferences : [];
    } catch (e) {
      error.value = String(e.message || e);
    } finally {
      loading.value = false;
    }
  };

  const setPreference = async (eventClass, channel, enabled) => {
    const row = rows.value.find(
      (r) => r.event_class === eventClass && r.channel === channel
    );
    if (!row) return;

    const previousEnabled = row.enabled;
    row.enabled = enabled;
    row.overridden = true;
    error.value = "";

    try {
      await callJson("/auth/notifications/preferences", {
        method: "PUT",
        body: JSON.stringify({ event_class: eventClass, channel, enabled })
      });
    } catch (e) {
      row.enabled = previousEnabled;
      error.value = String(e.message || e);
    }
  };

  return { rows, loading, error, loadPreferences, setPreference };
});
