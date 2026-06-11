/**
 * Break-glass shell.rw (слайс 3). Привилегированный путь: backend гейтит cookie-сессию +
 * admin + СВЕЖИЙ OIDC step-up. 401 stepup_required → нужен re-auth (UI редиректит на step-up).
 */
export class StepUpRequiredError extends Error {
  constructor(message) {
    super(message || "step-up required");
    this.name = "StepUpRequiredError";
  }
}

export async function runBreakGlassShell({ command, timeoutSec, signal } = {}) {
  const body = { command: String(command || "") };
  if (Number.isInteger(timeoutSec)) body.timeout_sec = timeoutSec;
  const response = await fetch("/assistant/breakglass/shell", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal
  });
  if (response.status === 401) {
    const payload = await response.json().catch(() => ({}));
    if (payload?.error === "stepup_required") {
      throw new StepUpRequiredError(payload?.message);
    }
    throw new Error(payload?.message || "unauthorized");
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || response.statusText || "break-glass failed");
  }
  return response.json();
}

// Редирект на OIDC step-up (re-auth) с возвратом на break-glass; `next` помечается
// `stepped=1`, чтобы UI авто-подал отложенную команду после возврата.
export function redirectToStepUp() {
  const next = encodeURIComponent("/breakglass?stepped=1");
  window.location.assign(`/auth/login?stepup=1&next=${next}`);
}
