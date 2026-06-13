import { defineStore } from "pinia";
import { ref } from "vue";

// Companion device & QR-pairing store (ADR-0031). Список устройств (registry),
// revoke, и pairing-флоу выдающей стороны: создать grant → показать QR →
// поллить pending claim'ы → подтвердить/отклонить. Сетевой слой — fetch с
// credentials:include (session cookie), как у остальных assistant-стора.

const PENDING_POLL_MS = 2000;

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

export const useCompanionDevicesStore = defineStore("companion-devices", () => {
  const devices = ref([]);
  const loading = ref(false);
  const error = ref("");

  // Pairing-сессия выдающей стороны.
  const pairing = ref(null); // { grantId, secret, qrPayload, expiresAt }
  const pending = ref([]); // claimed grants, ждущие подтверждения
  let pollTimer = null;

  const loadDevices = async () => {
    loading.value = true;
    error.value = "";
    try {
      const body = await callJson("/companion/devices");
      devices.value = Array.isArray(body.devices) ? body.devices : [];
    } catch (e) {
      error.value = String(e.message || e);
    } finally {
      loading.value = false;
    }
  };

  const revokeDevice = async (id) => {
    await callJson(`/companion/devices/${id}/revoke`, { method: "POST" });
    await loadDevices();
  };

  const startPairing = async () => {
    error.value = "";
    const body = await callJson("/companion/pairing/grant", { method: "POST" });
    // QR несёт origin инсталляции + одноразовый secret — companion-сканер
    // знает, куда идти, без ручного ввода адреса.
    const qrPayload = JSON.stringify({ u: window.location.origin, s: body.secret });
    pairing.value = {
      grantId: body.grant_id,
      secret: body.secret,
      qrPayload,
      expiresAt: body.expires_at
    };
    startPolling();
  };

  const stopPairing = () => {
    pairing.value = null;
    pending.value = [];
    stopPolling();
  };

  const pollPending = async () => {
    try {
      const body = await callJson("/companion/pairing/pending");
      pending.value = Array.isArray(body.pending) ? body.pending : [];
    } catch (e) {
      // Поллинг не должен ронять UI; ошибку показываем, но цикл продолжаем.
      error.value = String(e.message || e);
    }
  };

  const confirmPending = async (grantId) => {
    await callJson(`/companion/pairing/grant/${grantId}/confirm`, { method: "POST" });
    // Привязка завершена: новое устройство само заберёт сессию поллингом.
    stopPairing();
    await loadDevices();
  };

  const rejectPending = async (grantId) => {
    await callJson(`/companion/pairing/grant/${grantId}/reject`, { method: "POST" });
    pending.value = pending.value.filter((p) => p.grant_id !== grantId);
  };

  function startPolling() {
    stopPolling();
    pollPending();
    pollTimer = window.setInterval(pollPending, PENDING_POLL_MS);
  }

  function stopPolling() {
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  return {
    devices,
    loading,
    error,
    pairing,
    pending,
    loadDevices,
    revokeDevice,
    startPairing,
    stopPairing,
    confirmPending,
    rejectPending
  };
});
