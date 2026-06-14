/**
 * Admin authorization-gate (ADR-0034 slice b). Вход в собственную админку требует активного
 * elevation-окна на admin_access; окно выдаётся за подтверждение на enrolled-устройстве
 * (device_factor — companion Face ID / Secure Enclave, ADR-0030), НЕ через OIDC re-auth
 * (rauthy 0.35.2 его не форсирует). `request` создаёт запрос (companion подхватит поллером и
 * покажет нативный sheet); `status` поллим до выдачи elevation. Сетевой слой — fetch
 * same-origin с credentials:include (atrium-cookie), как account-sessions.
 */

// Активно ли elevation-окно. 401/403 (нет сессии / не админ / не поднят) → false (fail-closed).
export async function fetchAdminGateStatus() {
  const response = await fetch("/auth/admin-gate/status", {
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) return false;
  const body = await response.json().catch(() => ({}));
  return Boolean(body?.elevated);
}

// Создать запрос на elevation (device_factor). Возвращает { elevated, request_id? }:
// elevated:true — окно уже активно (запрос не нужен); иначе companion получит запрос.
export async function requestAdminElevation() {
  const response = await fetch("/auth/admin-gate/request", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || response.statusText || "elevation request failed");
  }
  return response.json();
}

// Поллит status, пока не elevated или не выйдет timeout. Возвращает true при elevation.
export async function waitForAdminElevation({ intervalMs = 3000, timeoutMs = 300000, signal } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) return false;
    if (await fetchAdminGateStatus()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}
