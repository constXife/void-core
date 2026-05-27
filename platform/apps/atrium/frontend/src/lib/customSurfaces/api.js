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
