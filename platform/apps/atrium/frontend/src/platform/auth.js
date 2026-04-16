export async function checkSession() {
  const res = await fetch("/api/me", { credentials: "include" });
  if (!res.ok) return null;
  return await res.json();
}

export function redirectToLogin(returnPath) {
  const next = returnPath || window.location.pathname + window.location.search;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}
