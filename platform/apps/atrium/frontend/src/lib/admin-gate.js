/**
 * Admin authorization-gate (ADR-0034 slice b). Вход в собственную админку требует активного
 * elevation-окна на admin_access; окно выдаётся за СВЕЖИЙ OIDC step-up (re-auth с max_age=0).
 * `status` решает: пускать в админку или показать interstitial; `elevate` конвертирует свежий
 * re-auth в окно (backend проверяет свежесть, substrate фиксирует elevation). Сетевой слой —
 * fetch same-origin с credentials:include (atrium-cookie), как assistant-breakglass.
 */
export class AdminStepUpRequiredError extends Error {
  constructor(message) {
    super(message || "step-up required");
    this.name = "AdminStepUpRequiredError";
  }
}

// Активно ли elevation-окно. 401/403 (нет сессии / не админ / не поднят) → false:
// в админку без явного gate не пускаем (fail-closed).
export async function fetchAdminGateStatus() {
  const response = await fetch("/auth/admin-gate/status", {
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) return false;
  const body = await response.json().catch(() => ({}));
  return Boolean(body?.elevated);
}

// Конвертировать свежий re-auth в elevation. 401 stepup_required → нужен (повторный) step-up.
export async function elevateAdminGate() {
  const response = await fetch("/auth/admin-gate/elevate", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  if (response.status === 401) {
    const payload = await response.json().catch(() => ({}));
    if (payload?.error === "stepup_required") {
      throw new AdminStepUpRequiredError(payload?.message);
    }
    throw new Error(payload?.message || "unauthorized");
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || response.statusText || "elevation failed");
  }
  return response.json();
}

// Редирект на OIDC step-up (re-auth) с возвратом на interstitial; `stepped=1` → авто-elevate
// после возврата. Куда идти дальше (исходный admin-роут) interstitial хранит в sessionStorage.
export function redirectToAdminStepUp() {
  const next = encodeURIComponent("/admin/elevate?stepped=1");
  window.location.assign(`/auth/login?stepup=1&next=${next}`);
}
