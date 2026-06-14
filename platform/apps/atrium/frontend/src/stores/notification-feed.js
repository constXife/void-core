import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { connectAssistantUserEvents } from "../lib/assistant-user-events-client.js";

// Платформенная лента обновлений (notification center). История — REST `/auth/events/recent`,
// live — WS `/auth/events` (NOTIFY-backed, same-origin на atrium и assistant). Непрочитанное —
// по курсору last_seen (POST `/auth/events/seen`). Один стор на вкладку; компонент-колокол в
// каждом продуктовом header'е подключается к нему.

async function callJson(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(body?.message || res.statusText);
  }
  return body;
}

export const useNotificationFeedStore = defineStore("notification-feed", () => {
  const items = ref([]); // newest-first; кадры { id, event, session_id, data }
  const lastSeenId = ref(0);
  const connected = ref(false);
  let connection = null;

  const unreadCount = computed(
    () => items.value.filter((item) => Number(item.id) > lastSeenId.value).length
  );

  const upsert = (frame) => {
    const id = Number(frame?.id || 0);
    if (!id || items.value.some((item) => Number(item.id) === id)) return;
    items.value.unshift(frame);
    if (items.value.length > 100) items.value.splice(100);
  };

  const loadRecent = async () => {
    try {
      const body = await callJson("/auth/events/recent");
      items.value = Array.isArray(body.events) ? body.events : []; // recent отдаёт newest-first
      lastSeenId.value = Number(body.last_seen_id || 0);
    } catch {
      // лента не критична — при ошибке остаётся пустой/прежней
    }
  };

  const start = () => {
    if (connection) return;
    loadRecent();
    connection = connectAssistantUserEvents({
      path: "/auth/events",
      onEvent: upsert,
      onStatus: ({ connected: isConnected }) => {
        connected.value = isConnected;
      }
    });
  };

  const stop = () => {
    connection?.close();
    connection = null;
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
    } catch {
      // best-effort; локальный курсор уже сдвинут
    }
  };

  return { items, lastSeenId, connected, unreadCount, start, stop, loadRecent, markAllSeen };
});
