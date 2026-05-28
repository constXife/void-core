export async function readAssistantSkillRun(
  id,
  { context = "chat-inline", layout, signal } = {}
) {
  const normalizedId = String(id || "").trim();
  if (!normalizedId) {
    throw new Error("Assistant skill run id is required");
  }
  const params = new URLSearchParams();
  if (context) params.set("context", context);
  // layout overrides context-based default per backend `?layout=mini|full`.
  // Артефактные страницы fullscreen используют layout=full, чат — default chat-inline mapping.
  if (layout) params.set("layout", layout);
  const query = params.toString();
  const response = await fetch(
    `/assistant/skill-runs/${encodeURIComponent(normalizedId)}${query ? `?${query}` : ""}`,
    {
      credentials: "include",
      headers: {
        Accept: "application/json"
      },
      signal
    }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || response.statusText || "Assistant skill run fetch failed");
  }
  return response.json();
}

/**
 * Удаление skill_run artifact'а. Проходит ownership check на backend.
 * @returns {Promise<{deleted: true, id: string}>}
 */
export async function deleteAssistantSkillRun(id, { signal } = {}) {
  const normalizedId = String(id || "").trim();
  if (!normalizedId) {
    throw new Error("Assistant skill run id is required");
  }
  const response = await fetch(`/assistant/skill-runs/${encodeURIComponent(normalizedId)}`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
    signal
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || response.statusText || "Assistant skill run delete failed");
  }
  return response.json();
}

/**
 * Paginated list скилл-артефактов текущего юзера.
 *
 * @param {Object} options
 * @param {string} [options.status] — "completed" default; "any" чтобы получить все статусы
 * @param {string} [options.skillId] — filter, например "digest_hackernews"
 * @param {number} [options.limit] — clamp backend'ом [1, 100], default 50
 * @param {number} [options.offset] — pagination cursor, default 0
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{items: Array, limit: number, offset: number, returned: number}>}
 */
export async function listAssistantSkillRuns({
  status,
  skillId,
  limit,
  offset,
  signal
} = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (skillId) params.set("skillId", skillId);
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  const query = params.toString();
  const response = await fetch(`/assistant/skill-runs${query ? `?${query}` : ""}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    signal
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || response.statusText || "Assistant skill runs list failed");
  }
  return response.json();
}
