export function sanitizeNextPath(value, fallback = "/") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.includes("://")) return fallback;
  if (raw.includes("\\")) return fallback;
  return raw;
}

export async function checkSession() {
  const res = await fetch("/api/me", { credentials: "include" });
  if (!res.ok) return null;
  return await res.json();
}

export function redirectToLogin(returnPath) {
  const next = sanitizeNextPath(
    returnPath || window.location.pathname + window.location.search
  );
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}
