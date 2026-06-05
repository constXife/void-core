/**
 * Surface render origin (ADR-0026 Phase 4).
 *
 * Render живёт на выделенном Surface-origin, а не на текущем продуктовом хосте
 * (`assistant` = BYOK-чат; `atrium` = legacy-дашборд). Ссылки на render с этих хостов
 * должны вести на канонический Surface-origin. Origin выводится host-agnostic — свопом
 * первого DNS-лейбла на `surfaces` (тот же приём, что `resolveProductHref` в
 * `PlatformAppsMenu.vue`), без хардкода домена: на `assistant.<domain>` → `surfaces.<domain>`.
 *
 * На localhost / IP / single-label host (dev) субдомена нет — остаёмся на относительном
 * пути (same-origin), там render обслуживается тем же dev-хостом.
 */
export const SURFACE_HOST_LABEL = "surfaces";

export function surfaceRenderHref(renderPath) {
  const path = String(renderPath || "");
  if (typeof window === "undefined") return path;

  const { protocol, hostname, port } = window.location;
  const host = String(hostname || "").trim().toLowerCase();
  const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
  if (!host || host === "localhost" || isIpv4 || !host.includes(".")) {
    return path;
  }

  const labels = host.split(".");
  labels[0] = SURFACE_HOST_LABEL;
  const origin = `${protocol}//${labels.join(".")}${port ? `:${port}` : ""}`;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
