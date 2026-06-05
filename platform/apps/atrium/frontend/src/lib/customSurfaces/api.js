/**
 * Custom Surfaces composer API client.
 *
 * Обёртка над POST /atrium/custom-surfaces/* endpoints из graph-runtime-mcp-rust
 * (см. ADR-0020 § 4 в репозитории void).
 *
 * Phase 1 slice 1: manifest endpoint реализован, compile/preview/save возвращают 501
 * — клиент пробрасывает ошибку как ApiCallError с понятным кодом, чтобы UI мог
 * показать stub state graceful.
 */

export class ApiCallError extends Error {
  constructor(message, { status = 0, code = "" } = {}) {
    super(message);
    this.name = "ApiCallError";
    this.status = status;
    this.code = code;
  }
}

async function postJson(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });
  } catch (networkError) {
    throw new ApiCallError(`network error: ${networkError.message}`, {
      status: 0,
      code: "custom_surfaces_network_error"
    });
  }
  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (parseError) {
      throw new ApiCallError(`malformed response body: ${parseError.message}`, {
        status: response.status,
        code: "custom_surfaces_malformed_response"
      });
    }
  }
  if (!response.ok) {
    const code = (payload && payload.error) || `http_${response.status}`;
    const message = (payload && payload.message) || `request failed (${response.status})`;
    throw new ApiCallError(message, { status: response.status, code });
  }
  return payload;
}

/**
 * Fetch scoped manifest для указанного pageKind.
 * @param {object} params
 * @param {string} [params.pageKind] — фильтр; если undefined, бэк вернёт full manifest.
 * @param {string} [params.subjectId] — будущая permission filtering (Phase 1 slice 2).
 * @returns {Promise<object>} ScopedManifest
 */
export function fetchScopedManifest(params = {}) {
  const body = {};
  if (params.pageKind) body.pageKind = params.pageKind;
  if (params.subjectId) body.subjectId = params.subjectId;
  return postJson("/atrium/custom-surfaces/manifest", body);
}

/**
 * Compile prompt → PageSpec через LLM. Phase 1 slice 1: backend возвращает 501.
 * @param {object} params
 * @param {string} params.prompt
 * @param {string} params.pageKind
 * @returns {Promise<object>} PageSpec
 */
export function compilePageSpec(params) {
  return postJson("/atrium/custom-surfaces/compile", {
    prompt: params.prompt,
    pageKind: params.pageKind
  });
}

/**
 * Server-side validation готового PageSpec (для save preflight). Phase 1 slice 1: 501.
 * @param {object} params
 * @param {object} params.pageSpec
 * @returns {Promise<object>} validation result
 */
export function previewPageSpec(params) {
  return postJson("/atrium/custom-surfaces/preview", { pageSpec: params.pageSpec });
}

/**
 * Persist PageSpec. Phase 1 slice 1: 501 — ждёт P1.1 (PG migration) + P1.2 slice 3.
 * @param {object} params
 * @param {object} params.pageSpec
 * @param {string} params.pageKind
 * @returns {Promise<object>} { pagespecId, confirmTokenId, version }
 */
export function savePageSpec(params) {
  return postJson("/atrium/custom-surfaces/save", {
    pageSpec: params.pageSpec,
    pageKind: params.pageKind
  });
}

/**
 * Resolve assistant.latest_artifact bridge blocks в PageSpec (per ADR-21).
 * Для каждого bridge block instance backend fetches latest matching skill_run и
 * возвращает envelope ready-to-render. Render path read-only — никакого skill triggering.
 *
 * @param {object} params
 * @param {object} params.pageSpec
 * @returns {Promise<{artifacts: {[instanceId: string]: {artifactId: string|null, envelope: object|null, emptyReason?: string}}}>}
 */
export function resolveBridgeArtifacts(params) {
  return postJson("/atrium/custom-surfaces/resolve-artifacts", {
    pageSpec: params.pageSpec
  });
}

/**
 * Fetch latest saved PageSpec для current user + pageKind.
 * Returns null если нет ни одной save'нутой версии (404 от backend).
 * @param {string} pageKind
 * @returns {Promise<object|null>} saved PageSpec record или null
 */
/**
 * Resolve read_model data-slots для render-пути (ADR-0027 C3 + ADR-0026 §3 W1).
 * Backend (connector-registry + server-side adapt) отдаёт per-slot датасеты с provenance,
 * поэтому браузер больше НЕ ходит в `/api/knowledge/...` напрямую.
 * Overview-страница передаёт `slice`; entity-scoped detail-страница — `entityId` ($page.entityId).
 * @param {{slice?: string, entityId?: string}} params
 * @returns {Promise<{slots: Record<string, {payload: object, provenance: object}>}>}
 */
export async function fetchResolvedReadModel({ slice, entityId } = {}) {
  const query = new URLSearchParams();
  const ent = String(entityId || "").trim();
  const sl = String(slice || "").trim();
  if (ent) {
    query.set("entityId", ent);
  } else if (sl) {
    query.set("slice", sl);
  } else {
    throw new Error("slice or entityId is required");
  }
  let response;
  try {
    response = await fetch(
      `/atrium/custom-surfaces/resolve-read-model?${query.toString()}`,
      { credentials: "include", headers: { Accept: "application/json" } }
    );
  } catch (networkError) {
    throw new ApiCallError(`network error: ${networkError.message}`, {
      status: 0,
      code: "custom_surfaces_network_error"
    });
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (err) {
      throw new ApiCallError(`malformed response body: ${err.message}`, {
        status: response.status,
        code: "custom_surfaces_malformed_response"
      });
    }
  }
  if (!response.ok) {
    const code = (payload && payload.error) || `http_${response.status}`;
    const message = (payload && payload.message) || `request failed (${response.status})`;
    throw new ApiCallError(message, { status: response.status, code });
  }
  return payload;
}

/**
 * Fetch owner-scoped список страниц (shipped catalog ∪ custom saved pagespecs).
 * Источник для таба «Страницы». Backend сам делает union без потери данных и
 * проставляет renderPath; фронт ничего не достраивает.
 * @returns {Promise<{pages: Array<object>}>}
 */
export async function fetchPages() {
  let response;
  try {
    response = await fetch("/atrium/custom-surfaces/pages", {
      credentials: "include",
      headers: { Accept: "application/json" }
    });
  } catch (networkError) {
    throw new ApiCallError(`network error: ${networkError.message}`, {
      status: 0,
      code: "custom_surfaces_network_error"
    });
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (err) {
      throw new ApiCallError(`malformed response body: ${err.message}`, {
        status: response.status,
        code: "custom_surfaces_malformed_response"
      });
    }
  }
  if (!response.ok) {
    const code = (payload && payload.error) || `http_${response.status}`;
    const message = (payload && payload.message) || `request failed (${response.status})`;
    throw new ApiCallError(message, { status: response.status, code });
  }
  return payload;
}

export async function fetchLatestPagespec(pageKind, entityId, entityKind) {
  const normalized = String(pageKind || "").trim();
  if (!normalized) {
    throw new Error("pageKind is required");
  }
  // ADR-0026 §3 W3/W4.3: backend фолдит owner-оверлеи в каскаде global→kind→entity.
  // entityId таргетит entity-слой; entityKind (graph kind_ref, резолвится из read-model) —
  // kind-слой. Один entity-pageKind хостит много entityKind'ов, поэтому kind берётся из сущности.
  const params = new URLSearchParams();
  const entity = String(entityId || "").trim();
  const kind = String(entityKind || "").trim();
  if (entity) params.set("entityId", entity);
  if (kind) params.set("entityKind", kind);
  const query = params.toString() ? `?${params.toString()}` : "";
  let response;
  try {
    response = await fetch(
      `/atrium/custom-surfaces/pagespecs/${encodeURIComponent(normalized)}/latest${query}`,
      { credentials: "include", headers: { Accept: "application/json" } }
    );
  } catch (networkError) {
    throw new ApiCallError(`network error: ${networkError.message}`, {
      status: 0,
      code: "custom_surfaces_network_error"
    });
  }
  if (response.status === 404) {
    return null;
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (err) {
      throw new ApiCallError(`malformed response body: ${err.message}`, {
        status: response.status,
        code: "custom_surfaces_malformed_response"
      });
    }
  }
  if (!response.ok) {
    const code = (payload && payload.error) || `http_${response.status}`;
    const message = (payload && payload.message) || `request failed (${response.status})`;
    throw new ApiCallError(message, { status: response.status, code });
  }
  return payload;
}
