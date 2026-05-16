export async function readAssistantSkillRun(id, { context = "chat-inline", signal } = {}) {
  const normalizedId = String(id || "").trim();
  if (!normalizedId) {
    throw new Error("Assistant skill run id is required");
  }
  const params = new URLSearchParams();
  if (context) params.set("context", context);
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
