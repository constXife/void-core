import { readAssistantSseEvents } from "./assistant-sse.js";

export async function createAssistantRun({ sessionId, targetId, message, signal } = {}) {
  const response = await fetch("/assistant/runs", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      session_id: sessionId,
      target_id: targetId || undefined,
      message
    }),
    signal
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText || "Assistant run create failed");
  }
  return response.json();
}

export async function cancelAssistantRun(runId) {
  const response = await fetch(`/assistant/runs/${encodeURIComponent(runId)}/cancel`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText || "Assistant run cancel failed");
  }
  return response.json();
}

export async function readAssistantRunEvents(runId, { signal, onEvent, after = 0 } = {}) {
  const cursor = Number.isFinite(after) && after > 0 ? `?after=${after}` : "";
  const response = await fetch(
    `/assistant/runs/${encodeURIComponent(runId)}/events${cursor}`,
    {
      credentials: "include",
      headers: {
        Accept: "text/event-stream"
      },
      signal
    }
  );
  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(text || response.statusText || "Assistant run event stream failed");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = readAssistantSseEvents(buffer);
    buffer = parsed.buffer;
    for (const event of parsed.events) {
      onEvent?.(event);
      if (event.event === "done" || event.event === "error" || event.event === "cancelled") {
        return;
      }
    }
  }
}
