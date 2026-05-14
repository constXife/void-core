import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAssistantSessionsStore } from "./assistant-sessions.js";
import { createAssistantRun, readAssistantRunEvents } from "../lib/assistant-run-client.js";

vi.mock("../lib/assistant-run-client.js", () => ({
  cancelAssistantRun: vi.fn(),
  createAssistantRun: vi.fn(),
  readAssistantRunEvents: vi.fn()
}));

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  vi.useRealTimers();
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

  it("hides a user/assistant pair and restores it when deletion is undone", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({
        ...sessionPayload(),
        message_count: 2,
        messages: [userMessage("question"), assistantMessage("answer")],
        active_run: null
      })
    );

    const store = useAssistantSessionsStore();
    await store.selectSession("session-1");
    await store.deleteMessagePair("message-assistant-1");

    expect(store.currentMessages).toEqual([]);
    expect(store.pendingMessageDeletion?.count).toBe(2);

    store.undoMessageDeletion();

    expect(store.currentMessages.map((message) => message.id)).toEqual([
      "message-user-1",
      "message-assistant-1"
    ]);
    expect(store.pendingMessageDeletion).toBeNull();
  });

  it("commits message pair deletion after the undo window", async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(async (url, init = {}) => {
      if (String(url) === "/assistant/sessions/session-1") {
        return jsonResponse({
          ...sessionPayload(),
          message_count: 2,
          messages: [userMessage("question"), assistantMessage("answer")],
          active_run: null
        });
      }
      expect(String(url)).toBe("/assistant/sessions/session-1/messages/message-assistant-1");
      expect(init.method).toBe("DELETE");
      return jsonResponse({ ok: true });
    });

    const store = useAssistantSessionsStore();
    await store.selectSession("session-1");
    await store.deleteMessagePair("message-assistant-1");
    await vi.advanceTimersByTimeAsync(5000);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/assistant/sessions/session-1/messages/message-assistant-1",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(store.pendingMessageDeletion).toBeNull();
    expect(store.currentMessages).toEqual([]);
  });

  it("exposes the active run phase while waiting for the first token", async () => {
    let finishStream;
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({
        ...sessionPayload(),
        messages: [],
        active_run: null
      })
    );
    createAssistantRun.mockResolvedValue({
      run_id: "run-1",
      user_message_id: "message-user-server",
      assistant_message_id: "message-assistant-server"
    });
    readAssistantRunEvents.mockImplementation(async (_runId, { onEvent }) => {
      onEvent({ event: "running", json: {} });
      await new Promise((resolve) => {
        finishStream = resolve;
      });
      onEvent({ event: "done", json: { status: "completed" } });
    });

    const store = useAssistantSessionsStore();
    await store.selectSession("session-1");
    store.draft = "hello";

    const pending = store.send({ targetId: "default" });
    await flushPromises();

    expect(store.streaming).toBe(true);
    expect(store.streamingPhase).toBe("running");
    expect(store.streamingStatus).toBe("running");

    finishStream();
    await pending;
  });

  it("attaches skill blocks from the completion event before session reload", async () => {
    let finishStream;
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({
        ...sessionPayload(),
        messages: [],
        active_run: null
      })
    );
    createAssistantRun.mockResolvedValue({
      run_id: "run-1",
      user_message_id: "message-user-server",
      assistant_message_id: "message-assistant-server"
    });
    readAssistantRunEvents.mockImplementation(async (_runId, { onEvent }) => {
      onEvent({
        event: "done",
        json: {
          status: "completed",
          skill_run: skillRunPayload()
        }
      });
      await new Promise((resolve) => {
        finishStream = resolve;
      });
    });

    const store = useAssistantSessionsStore();
    await store.selectSession("session-1");
    store.draft = "/skill github-trending";

    const pending = store.send({ targetId: "default" });
    await flushPromises();

    const assistantMessage = store.currentMessages.find((message) => message.role === "assistant");
    expect(assistantMessage.skill_run).toEqual(skillRunPayload());

    finishStream();
    await pending;
  });

  it("keeps narration deltas separate from assistant content", async () => {
    let finishStream;
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({
        ...sessionPayload(),
        messages: [],
        active_run: null
      })
    );
    createAssistantRun.mockResolvedValue({
      run_id: "run-1",
      user_message_id: "message-user-server",
      assistant_message_id: "message-assistant-server"
    });
    readAssistantRunEvents.mockImplementation(async (_runId, { onEvent }) => {
      onEvent({
        event: "delta",
        json: { kind: "narration", text: "Подбираю подходящий навык." }
      });
      onEvent({ event: "delta", json: { text: "Итоговый ответ" } });
      await new Promise((resolve) => {
        finishStream = resolve;
      });
      onEvent({ event: "done", json: { status: "completed" } });
    });

    const store = useAssistantSessionsStore();
    await store.selectSession("session-1");
    store.draft = "дайджест";

    const pending = store.send({ targetId: "default" });
    await flushPromises();

    const assistantMessage = store.currentMessages.find((message) => message.role === "assistant");
    expect(assistantMessage.content).toBe("Итоговый ответ");
    expect(assistantMessage.narration_content).toBe("Подбираю подходящий навык.");

    finishStream();
    await pending;
  });

  it("approves a skill batch through the backend batch endpoint", async () => {
    let sessionReads = 0;
    globalThis.fetch = vi.fn(async (url, init = {}) => {
      if (String(url) === "/assistant/sessions/session-1") {
        sessionReads += 1;
        return jsonResponse({
          ...sessionPayload(),
          messages: [assistantMessage("")],
          active_run: null
        });
      }
      expect(String(url)).toBe("/assistant/skill-run-batches/approve");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({
        skill_run_ids: ["skill-run-1", "skill-run-2"]
      });
      return jsonResponse({
        run: {
          id: "run-1",
          session_id: "session-1",
          assistant_message_id: "message-assistant-1",
          status: "queued"
        }
      });
    });
    readAssistantRunEvents.mockImplementation(async (_runId, { onEvent }) => {
      onEvent({
        event: "done",
        json: {
          status: "completed",
          skill_runs: [
            skillRunPayload("skill-run-1", "digest_hackernews"),
            skillRunPayload("skill-run-2", "digest_github")
          ]
        }
      });
    });

    const store = useAssistantSessionsStore();
    await store.selectSession("session-1");
    await store.approveSkillRuns(["skill-run-1", "skill-run-2"]);

    expect(readAssistantRunEvents).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        onEvent: expect.any(Function)
      })
    );
    expect(sessionReads).toBe(3);
  });

  it("updates a skill result layout without re-running the skill", async () => {
    globalThis.fetch = vi.fn(async (url, init = {}) => {
      if (String(url) === "/assistant/sessions/session-1") {
        return jsonResponse({
          ...sessionPayload(),
          messages: [
            {
              ...assistantMessage("projection"),
              message_kind: "skill_result",
              layout_config: { variant: "cards" },
              skill_runs: [skillRunPayload("skill-run-1", "digest_hackernews")]
            }
          ],
          active_run: null
        });
      }
      expect(String(url)).toBe("/assistant/messages/message-assistant-1/layout");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({ variant: "compact" });
      return jsonResponse({
        ...assistantMessage("projection"),
        message_kind: "skill_result",
        layout_config: { variant: "compact" },
        skill_runs: [skillRunPayload("skill-run-1", "digest_hackernews")]
      });
    });

    const store = useAssistantSessionsStore();
    await store.selectSession("session-1");
    await store.changeMessageLayout("message-assistant-1", "compact");

    expect(store.currentMessages[0].layout_config).toEqual({ variant: "compact" });
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

function userMessage(content) {
  return {
    id: "message-user-1",
    role: "user",
    content,
    stopped: false,
    error: false,
    created_at: "2026-05-06T07:00:00Z"
  };
}

function skillRunPayload(id = "skill-run-1", skillId = "") {
  return {
    id,
    skill_id: skillId,
    status: "",
    error: "",
    blocks: [
      {
        type: "section_header",
        text: "GitHub trending",
        subtitle: "GitHub"
      }
    ]
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
