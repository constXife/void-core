/**
 * Break-glass shell.rw (ADR-0034 slice a5). Привилегированный root-путь: backend гейтит
 * cookie-сессию + admin, затем команда подтверждается per-command на enrolled-устройстве
 * (device_factor, companion Face ID, WYSIWYS — телефон показывает ровно эту команду).
 * `runBreakGlassShell` создаёт approval-request (НЕ исполняет); `pollBreakGlassResult` поллит
 * его до терминального статуса. Исполняет approval-executor после подтверждения. OIDC step-up
 * больше не используется (rauthy его не форсирует).
 */

const TERMINAL = new Set(["completed", "failed", "rejected", "cancelled", "expired"]);

// Создать break-glass approval. Возвращает { request_id, status:"awaiting_approval" }.
export async function runBreakGlassShell({ command, timeoutSec } = {}) {
  const body = { command: String(command || "") };
  if (Number.isInteger(timeoutSec)) body.timeout_sec = timeoutSec;
  const response = await fetch("/assistant/breakglass/shell", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || response.statusText || "break-glass request failed");
  }
  return response.json();
}

// Поллит GET /assistant/approvals/{id} до терминального статуса. Возвращает запись
// { status, result, error }. На timeout — статус "expired" (синтетический).
export async function pollBreakGlassResult(requestId, { intervalMs = 2500, timeoutMs = 330000, signal } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) return { status: "cancelled" };
    const response = await fetch(`/assistant/approvals/${requestId}`, {
      credentials: "include",
      headers: { Accept: "application/json" }
    });
    if (response.ok) {
      const record = await response.json().catch(() => ({}));
      if (TERMINAL.has(record?.status)) return record;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return { status: "expired" };
}
