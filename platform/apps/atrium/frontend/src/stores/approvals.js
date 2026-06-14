import { defineStore } from "pinia";
import { ref } from "vue";

// История/очередь апрувов (ADR-0034). Pending — ожидающие; история — все статусы.
// Read+reject зеркалятся на atrium foundation-router (`/auth/approvals*`); approve
// device_factor подписывается ТОЛЬКО на доверенном устройстве (WYSIWYS) — с веба нет.
// Сетевой слой — same-origin fetch с credentials:include, как account-sessions.

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

export const useApprovalsStore = defineStore("approvals", () => {
  const items = ref([]);
  const scope = ref("pending"); // pending | all
  const loading = ref(false);
  const error = ref("");

  const load = async (nextScope = scope.value) => {
    scope.value = nextScope;
    loading.value = true;
    error.value = "";
    try {
      const query = nextScope === "all" ? "?scope=all" : "";
      const body = await callJson(`/auth/approvals${query}`);
      items.value = Array.isArray(body.approvals) ? body.approvals : [];
    } catch (e) {
      error.value = String(e.message || e);
    } finally {
      loading.value = false;
    }
  };

  // Детали одного запроса + аудит-голоса (кто/метод/устройство/когда).
  const loadDetail = async (id) => callJson(`/auth/approvals/${id}`);

  const reject = async (id) => {
    await callJson(`/auth/approvals/${id}/reject`, { method: "POST" });
    await load(scope.value);
  };

  return { items, scope, loading, error, load, loadDetail, reject };
});
