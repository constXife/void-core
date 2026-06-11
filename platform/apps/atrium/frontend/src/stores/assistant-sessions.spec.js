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
  it("marks session load failures as visible error status", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let requestCount = 0;
    globalThis.fetch = vi.fn(async () => {
      requestCount += 1;
      if (requestCount === 1) {
        return new Response(
          JSON.stringify({
            error: "assistant_messages_list_failed",
            message: 'error returned from database: syntax error at or near "step"'
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      return jsonResponse({
        ...sessionPayload(),
        messages: [assistantMessage("restored")],
        active_run: null
      });
    });

    const store = useAssistantSessionsStore();
    await store.selectSession("session-1");

    expect(store.statusKind).toBe("error");
    expect(store.status).toContain("assistant_messages_list_failed");

    await store.reloadCurrent();

    expect(store.status).toBe("");
    expect(store.statusKind).toBe("");
  });

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

  it("hydrates the completed answer when the event stream disconnects during a run", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let sessionReads = 0;
    globalThis.fetch = vi.fn(async (url) => {
      expect(String(url)).toBe("/assistant/sessions/session-1");
      sessionReads += 1;
      if (sessionReads === 1) {
        return jsonResponse({
          ...sessionPayload(),
          messages: [],
          active_run: null
        });
      }
      return jsonResponse({
        ...sessionPayload(),
        messages: [
          {
            ...assistantMessage("final answer"),
            id: "message-assistant-server",
            run: {
              id: "run-1",
              status: "completed",
              target_id: "default",
              created_at: "2026-05-06T07:00:00Z",
              started_at: "2026-05-06T07:00:01Z",
              completed_at: "2026-05-06T07:00:11Z"
            }
          }
        ],
        active_run: null
      });
    });
    createAssistantRun.mockResolvedValue({
      run_id: "run-1",
      user_message_id: "message-user-server",
      assistant_message_id: "message-assistant-server",
      run: {
        id: "run-1",
        status: "queued",
        created_at: "2026-05-06T07:00:00Z"
      }
    });
    readAssistantRunEvents.mockImplementation(async (_runId, { onEvent, onEventId }) => {
      onEventId(7);
      onEvent({ event: "delta", id: "7", json: { text: "partial" } });
      throw new Error("Assistant run event stream disconnected");
    });

    const store = useAssistantSessionsStore();
    await store.selectSession("session-1");
    store.draft = "hello";
    await store.send({ targetId: "default" });

    expect(store.status).toBe("");
    expect(store.currentMessages[0].content).toBe("final answer");
    expect(store.currentMessages[0].timings.completed_at).toBe("2026-05-06T07:00:11Z");
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

  it("keeps structured step deltas separate from assistant content", async () => {
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
        json: {
          kind: "step",
          step: {
            id: "skill-run:skill-run-1",
            key: "skill_run",
            status: "running",
            skill_id: "digest_hackernews",
            skill_run_id: "skill-run-1"
          }
        }
      });
      onEvent({
        event: "delta",
        json: {
          kind: "step",
          step: {
            id: "skill-run:skill-run-1",
            key: "skill_run",
            status: "completed",
            skill_id: "digest_hackernews",
            skill_run_id: "skill-run-1"
          }
        }
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
    expect(assistantMessage.run_steps).toEqual([
      {
        id: "skill-run:skill-run-1",
        key: "skill_run",
        status: "completed",
        skill_id: "digest_hackernews",
        skill_run_id: "skill-run-1",
        notes_count: 0,
        titles: [],
        title: "",
        summary: ""
      }
    ]);

    finishStream();
    await pending;
  });

  it("loads persisted narration and run steps from session history", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({
        ...sessionPayload(),
        messages: [
          {
            ...assistantMessage("projection"),
            narration_content: "Собираю данные.",
            run_steps: [
              {
                id: "skill-run:skill-run-1",
                key: "skill_run",
                status: "completed",
                skill_id: "digest_hackernews",
                skill_run_id: "skill-run-1"
              }
            ]
          }
        ],
        active_run: null
      })
    );

    const store = useAssistantSessionsStore();
    await store.selectSession("session-1");

    expect(store.currentMessages[0].narration_content).toBe("Собираю данные.");
    expect(store.currentMessages[0].run_steps).toEqual([
      {
        id: "skill-run:skill-run-1",
        key: "skill_run",
        status: "completed",
        skill_id: "digest_hackernews",
        skill_run_id: "skill-run-1",
        notes_count: 0,
        titles: [],
        title: "",
        summary: ""
      }
    ]);
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

  it("passes template variant when proposing a skill run", async () => {
    const requests = [];
    globalThis.fetch = vi.fn(async (url, init = {}) => {
      requests.push({ url: String(url), init });
      if (String(url) === "/assistant/sessions") {
        return jsonResponse(sessionPayload());
      }
      if (String(url) === "/assistant/skill-proposals") {
        return jsonResponse({
          skill_run: skillRunPayload("skill-run-1", "digest_hackernews")
        });
      }
      if (String(url) === "/assistant/sessions/session-1") {
        return jsonResponse({
          ...sessionPayload(),
          messages: [assistantMessage("proposal")],
          active_run: null
        });
      }
      throw new Error(`unexpected request ${url}`);
    });

    const store = useAssistantSessionsStore();
    await store.proposeSkillRun({
      skillId: "digest_hackernews",
      targetId: "default",
      params: { top_n: "10" },
      variant: "newspaper",
      locale: "ru"
    });

    const proposal = requests.find((request) => request.url === "/assistant/skill-proposals");
    expect(JSON.parse(proposal.init.body)).toEqual({
      session_id: "session-1",
      skill_id: "digest_hackernews",
      params: { top_n: "10" },
      variant: "newspaper",
      locale: "ru"
    });
  });
});

describe("assistant sessions store user event feed", () => {
  it("applies session.updated to sidebar and current session", () => {
    const store = useAssistantSessionsStore();
    store.sessions = [
      { ...sessionPayload(), id: "session-1", title: "Old" },
      { ...sessionPayload(), id: "session-2", title: "Other" }
    ];
    store.currentSessionId = "session-1";
    store.currentSession = { ...sessionPayload(), id: "session-1", title: "Old" };

    store.applyUserEvent({
      id: 5,
      event: "session.updated",
      session_id: "session-1",
      data: { title: "Renamed", title_source: "llm_chat" }
    });

    expect(store.sessions.find((session) => session.id === "session-1").title).toBe("Renamed");
    expect(store.sessions.find((session) => session.id === "session-2").title).toBe("Other");
    expect(store.currentSession.title).toBe("Renamed");
    expect(store.currentSession.title_source).toBe("llm_chat");
  });

  it("reloads the open session quietly on foreign message.created", async () => {
    vi.useFakeTimers();
    const requests = [];
    globalThis.fetch = vi.fn(async (url) => {
      requests.push(String(url));
      return jsonResponse({
        ...sessionPayload(),
        messages: [userMessage("hi"), assistantMessage("hello")],
        active_run: null
      });
    });
    const store = useAssistantSessionsStore();
    store.sessions = [sessionPayload()];
    store.currentSessionId = "session-1";
    store.currentLoaded = true;

    store.applyUserEvent({
      id: 6,
      event: "message.created",
      session_id: "session-1",
      data: { message_id: "m-9", role: "assistant", message_kind: "text" }
    });
    store.applyUserEvent({
      id: 7,
      event: "run.status",
      session_id: "session-1",
      data: { run_id: "r-1", status: "completed", assistant_message_id: "m-9" }
    });

    expect(requests).toEqual([]);
    await vi.advanceTimersByTimeAsync(250);
    // Дебаунс: пачка событий → один GET сессии.
    expect(requests).toEqual(["/assistant/sessions/session-1"]);
    expect(store.currentMessages).toHaveLength(2);
    // quiet: открытый разговор не мигает спиннером.
    expect(store.loadingCurrent).toBe(false);
    vi.useRealTimers();
  });

  it("skips reload while own run is streaming", () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn();
    const store = useAssistantSessionsStore();
    store.sessions = [sessionPayload()];
    store.currentSessionId = "session-1";
    store.streaming = true;

    store.applyUserEvent({
      id: 8,
      event: "message.created",
      session_id: "session-1",
      data: { message_id: "m-1", role: "user", message_kind: "text" }
    });

    vi.advanceTimersByTime(1000);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("reloads the sessions list when an unknown session appears", () => {
    const requests = [];
    globalThis.fetch = vi.fn(async (url) => {
      requests.push(String(url));
      return jsonResponse({ sessions: [sessionPayload()] });
    });
    const store = useAssistantSessionsStore();
    store.sessions = [];

    store.applyUserEvent({
      id: 9,
      event: "message.created",
      session_id: "session-brand-new",
      data: { message_id: "m-1", role: "user", message_kind: "text" }
    });

    expect(requests).toEqual(["/assistant/sessions"]);
  });

  it("ignores error frames without touching the backend", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    globalThis.fetch = vi.fn();
    const store = useAssistantSessionsStore();

    store.applyUserEvent({ event: "error", data: { message: "stream failed" } });

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
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
    display_name: null,
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
