import { readAssistantSseEvents } from "./assistant-sse.js";

const STREAM_RECONNECT_LIMIT = 6;
const STREAM_RECONNECT_DELAY_MS = 700;

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

export async function readAssistantRunEvents(
  runId,
  { signal, onEvent, after = 0, onEventId, onReconnect } = {}
) {
  let cursor = Number.isFinite(after) && after > 0 ? after : 0;
  let reconnects = 0;
  let lastError = null;

  while (true) {
    let completed = false;
    try {
      completed = await readAssistantRunEventStream(runId, {
        signal,
        onEvent: (event) => {
          const id = Number(event?.id || 0);
          if (Number.isFinite(id) && id > 0) {
            cursor = id;
            onEventId?.(id);
          }
          onEvent?.(event);
        },
        after: cursor
      });
      lastError = null;
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      lastError = error;
    }
    if (completed) return;
    if (signal?.aborted) throw abortError();
    reconnects += 1;
    if (reconnects > STREAM_RECONNECT_LIMIT) {
      const error = lastError || new Error("Assistant run event stream disconnected");
      error.code = "assistant_event_stream_disconnected";
      error.after = cursor;
      throw error;
    }
    onReconnect?.({ after: cursor, attempt: reconnects });
    await waitForReconnectDelay(signal);
  }
}

async function readAssistantRunEventStream(runId, { signal, onEvent, after = 0 } = {}) {
  const cursor = Number.isFinite(after) && after > 0 ? `?after=${after}` : "";
  const response = await fetch(`/assistant/runs/${encodeURIComponent(runId)}/events${cursor}`, {
    credentials: "include",
    headers: {
      Accept: "text/event-stream"
    },
    signal
  });
  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(text || response.statusText || "Assistant run event stream failed");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) return false;
    buffer += decoder.decode(value, { stream: true });
    const parsed = readAssistantSseEvents(buffer);
    buffer = parsed.buffer;
    for (const event of parsed.events) {
      onEvent?.(event);
      if (event.event === "done" || event.event === "error" || event.event === "cancelled") {
        return true;
      }
    }
  }
}

function waitForReconnectDelay(signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = window.setTimeout(resolve, STREAM_RECONNECT_DELAY_MS);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(abortError());
      },
      { once: true }
    );
  });
}

function abortError() {
  const error = new DOMException("The operation was aborted.", "AbortError");
  return error;
}
