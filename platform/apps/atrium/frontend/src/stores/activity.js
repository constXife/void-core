import { defineStore } from "pinia";
import { ref } from "vue";

// Страница активности: полный архив user-событий (`assistant_user_events`) с фильтром по
// категории и keyset-пагинацией (20/стр). Источник — REST `/auth/events/recent` (тот же, что
// у колокола, но без окна 24ч и с `type`-фильтром). Категория = префикс домена события:
// approval | message | run | session; "all" — без фильтра. Live-WS тут НЕ подключаем — это
// browse/archive-вью, а realtime-glance даёт колокол.

const PAGE_SIZE = 20;

async function callJson(path) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(body?.message || res.statusText);
  }
  return body;
}

const recentPath = (type, before) => {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (type && type !== "all") params.set("type", type);
  if (before != null) params.set("before", String(before));
  return `/auth/events/recent?${params.toString()}`;
};

export const useActivityStore = defineStore("activity", () => {
  const items = ref([]);
  const type = ref("all"); // all | approval | message | run | session
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref("");
  const nextCursor = ref(null); // id для следующей keyset-страницы (null = дальше пусто)

  const load = async (nextType = type.value) => {
    type.value = nextType;
    loading.value = true;
    error.value = "";
    try {
      const body = await callJson(recentPath(nextType, null));
      items.value = Array.isArray(body.events) ? body.events : [];
      nextCursor.value = body.next_cursor ?? null;
    } catch (e) {
      error.value = String(e.message || e);
    } finally {
      loading.value = false;
    }
  };

  const loadMore = async () => {
    if (nextCursor.value == null || loadingMore.value) return;
    loadingMore.value = true;
    try {
      const body = await callJson(recentPath(type.value, nextCursor.value));
      const more = Array.isArray(body.events) ? body.events : [];
      const known = new Set(items.value.map((item) => Number(item.id)));
      for (const event of more) {
        if (!known.has(Number(event.id))) items.value.push(event);
      }
      nextCursor.value = body.next_cursor ?? null;
    } catch (e) {
      error.value = String(e.message || e);
    } finally {
      loadingMore.value = false;
    }
  };

  return { items, type, loading, loadingMore, error, nextCursor, load, loadMore };
});
