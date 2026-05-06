import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAssistantSessionsStore } from "./assistant-sessions.js";
import { readAssistantRunEvents } from "../lib/assistant-run-client.js";

vi.mock("../lib/assistant-run-client.js", () => ({
  cancelAssistantRun: vi.fn(),
  createAssistantRun: vi.fn(),
  readAssistantRunEvents: vi.fn()
}));

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe("assistant sessions store", () => {
  it("resumes the active run after loading a session", async () => {
    let sessionReads = 0;
    globalThis.fetch = vi.fn(async (url) => {
      expect(String(url)).toBe("/assistant/sessions/session-1");
      sessionReads += 1;
      if (sessionReads === 1) {
        return jsonResponse({
          ...sessionPayload(),
          messages: [assistantMessage("")],
          active_run: {
            id: "run-1",
            session_id: "session-1",
            assistant_message_id: "message-assistant-1",
            status: "running"
          }
        });
      }
      return jsonResponse({
        ...sessionPayload(),
        messages: [assistantMessage("final answer")],
        active_run: null
      });
    });
    readAssistantRunEvents.mockImplementation(async (_runId, { onEvent }) => {
      onEvent({ event: "delta", json: { text: "partial" } });
      onEvent({ event: "done", json: { status: "completed" } });
    });

    const store = useAssistantSessionsStore();
    await store.selectSession("session-1");
    await flushPromises();

    expect(readAssistantRunEvents).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        onEvent: expect.any(Function)
      })
    );
    expect(sessionReads).toBe(2);
    expect(store.currentMessages[0].content).toBe("final answer");
    expect(store.streaming).toBe(false);
  });
});

function sessionPayload() {
  return {
    id: "session-1",
    title: "Session",
    target_id: "default",
    created_at: "2026-05-06T07:00:00Z",
    updated_at: "2026-05-06T07:00:00Z",
    deleted_at: null,
    message_count: 1
  };
}

function assistantMessage(content) {
  return {
    id: "message-assistant-1",
    role: "assistant",
    content,
    stopped: false,
    error: false,
    created_at: "2026-05-06T07:00:00Z"
  };
}

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
