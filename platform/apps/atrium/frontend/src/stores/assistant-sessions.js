import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  cancelAssistantRun,
  createAssistantRun,
  readAssistantRunEvents
} from "../lib/assistant-run-client.js";

// Standalone Assistant surface использует серверные сессии: история, soft-delete,
// streaming с persistent state. Frontend отправляет только новый user input;
// backend сам собирает provider context из Postgres.

const SESSIONS_URL = "/assistant/sessions";
const TRASHED_URL = "/assistant/sessions/trashed";
const SKILL_PROPOSALS_URL = "/assistant/skill-proposals";
const SKILL_BATCH_APPROVE_URL = "/assistant/skill-run-batches/approve";
const MESSAGE_DELETE_UNDO_MS = 5000;

export const useAssistantSessionsStore = defineStore("void-assistant-sessions", () => {
  const sessions = ref([]);
  const trashedSessions = ref([]);
  const sessionsLoaded = ref(false);
  const trashedLoaded = ref(false);
  const loadingSessions = ref(false);
  const loadingTrashed = ref(false);

  const currentSessionId = ref("");
  const currentSession = ref(null);
  const currentMessages = ref([]);
  const currentLoaded = ref(false);
  const loadingCurrent = ref(false);

  const draft = ref("");
  const streaming = ref(false);
  const streamingPhase = ref("");
  const streamingStatus = computed(() => streamingPhase.value);
  const status = ref("");
  const pendingMessageDeletion = ref(null);

  let activeAbort = null;
  let activeRunId = "";
  let pendingMessageDeletionInternal = null;

  const groupedSessions = computed(() => groupSessionsByDate(sessions.value));
  const canSend = computed(() => !streaming.value && draft.value.trim().length > 0);
  const hasCurrent = computed(() => Boolean(currentSessionId.value));

  const loadSessions = async () => {
    loadingSessions.value = true;
    try {
      const payload = await fetchJson(SESSIONS_URL);
      sessions.value = normalizeSessionList(payload?.sessions);
      sessionsLoaded.value = true;
      status.value = "";
    } catch (error) {
      reportError("Failed to load assistant sessions", error);
    } finally {
      loadingSessions.value = false;
    }
  };

  const loadTrashed = async () => {
    loadingTrashed.value = true;
    try {
      const payload = await fetchJson(TRASHED_URL);
      trashedSessions.value = normalizeSessionList(payload?.sessions);
      trashedLoaded.value = true;
    } catch (error) {
      reportError("Failed to load trashed sessions", error);
    } finally {
      loadingTrashed.value = false;
    }
  };

  const selectSession = async (id) => {
    const trimmedId = String(id || "").trim();
    if (!trimmedId) {
      currentSessionId.value = "";
      currentSession.value = null;
      currentMessages.value = [];
      currentLoaded.value = false;
      return;
    }
    currentSessionId.value = trimmedId;
    await reloadCurrent();
  };

  const reloadCurrent = async ({ resumeActiveRun = true } = {}) => {
    if (!currentSessionId.value) return;
    let activeRun = null;
    loadingCurrent.value = true;
    currentLoaded.value = false;
    try {
      const payload = await fetchJson(`${SESSIONS_URL}/${currentSessionId.value}`);
      currentSession.value = normalizeSession(payload);
      currentMessages.value = filterPendingDeletedMessages(
        currentSessionId.value,
        normalizeMessageList(payload?.messages)
      );
      activeRun = normalizeRun(payload?.active_run);
      currentLoaded.value = true;
      status.value = "";
    } catch (error) {
      currentSession.value = null;
      currentMessages.value = [];
      reportError("Failed to load session", error);
    } finally {
      loadingCurrent.value = false;
    }
    if (resumeActiveRun && shouldResumeRun(activeRun)) {
      resumeRun(activeRun);
    }
  };

  const createSession = async ({ targetId } = {}) => {
    const body = targetId ? { target_id: targetId } : {};
    const payload = await fetchJson(SESSIONS_URL, {
      method: "POST",
      body: JSON.stringify(body)
    });
    const session = normalizeSession(payload);
    sessions.value = [session, ...sessions.value];
    return session;
  };

  const changeSessionTarget = async (id, targetId) => {
    const payload = await fetchJson(`${SESSIONS_URL}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ target_id: targetId })
    });
    const updated = normalizeSession(payload);
    sessions.value = sessions.value.map((session) => (session.id === id ? updated : session));
    if (currentSession.value?.id === id) {
      currentSession.value = updated;
    }
    return updated;
  };

  const renameSession = async (id, title) => {
    const payload = await fetchJson(`${SESSIONS_URL}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title })
    });
    const updated = normalizeSession(payload);
    sessions.value = sessions.value.map((session) => (session.id === id ? updated : session));
    if (currentSession.value?.id === id) {
      currentSession.value = updated;
    }
    return updated;
  };

  const softDeleteSession = async (id) => {
    await fetchJson(`${SESSIONS_URL}/${id}`, { method: "DELETE" });
    const removed = sessions.value.find((session) => session.id === id);
    sessions.value = sessions.value.filter((session) => session.id !== id);
    if (removed) {
      const stamped = { ...removed, deleted_at: new Date().toISOString() };
      trashedSessions.value = [stamped, ...trashedSessions.value];
    }
    if (currentSessionId.value === id) {
      currentSessionId.value = "";
      currentSession.value = null;
      currentMessages.value = [];
      currentLoaded.value = false;
    }
  };

  const restoreSession = async (id) => {
    const payload = await fetchJson(`${SESSIONS_URL}/${id}/restore`, { method: "POST" });
    const restored = normalizeSession(payload);
    trashedSessions.value = trashedSessions.value.filter((session) => session.id !== id);
    sessions.value = [restored, ...sessions.value.filter((session) => session.id !== id)];
    return restored;
  };

  const send = async ({ targetId } = {}) => {
    const content = draft.value.trim();
    if (!content || streaming.value) return;
    if (!(await commitPendingMessageDeletion())) return;

    let session = currentSession.value;
    if (!session) {
      session = await createSession({ targetId });
      currentSessionId.value = session.id;
      currentSession.value = session;
      currentMessages.value = [];
      currentLoaded.value = true;
    }

    const targetForRequest = targetId || session.target_id || "";
    const optimisticUser = createOptimisticMessage("user", content);
    const optimisticAssistant = createOptimisticMessage("assistant", "");
    currentMessages.value = [...currentMessages.value, optimisticUser, optimisticAssistant];
    draft.value = "";
    streaming.value = true;
    streamingPhase.value = "creating";
    status.value = "";

    activeAbort = new AbortController();
    let assistantMessageId = optimisticAssistant.id;

    try {
      const payload = await createAssistantRun({
        sessionId: session.id,
        targetId: targetForRequest || "",
        message: content,
        signal: activeAbort.signal
      });
      activeRunId = String(payload?.run_id || payload?.run?.id || "");
      if (!activeRunId) {
        throw new Error("Assistant run create returned empty id");
      }
      streamingPhase.value = "queued";
      const serverUserMessageId = String(
        payload?.user_message_id || payload?.run?.user_message_id || ""
      );
      const serverAssistantMessageId = String(
        payload?.assistant_message_id || payload?.run?.assistant_message_id || ""
      );
      if (serverUserMessageId) {
        markMessage(optimisticUser.id, { id: serverUserMessageId, optimistic: false });
      }
      if (serverAssistantMessageId) {
        markMessage(optimisticAssistant.id, { id: serverAssistantMessageId, optimistic: false });
        assistantMessageId = serverAssistantMessageId;
      }
      await readAssistantRunEvents(activeRunId, {
        signal: activeAbort.signal,
        onEvent: (event) => applyStreamEvent(event, assistantMessageId)
      });
      bumpSessionUpdatedAt(session.id);
      await reloadCurrent({ resumeActiveRun: false });
    } catch (error) {
      if (error?.name === "AbortError") {
        markMessage(assistantMessageId, { stopped: true });
      } else {
        markMessage(assistantMessageId, {
          error: true,
          content: normalizeErrorMessage(error)
        });
        reportError("Assistant chat failed", error);
      }
    } finally {
      streaming.value = false;
      streamingPhase.value = "";
      activeAbort = null;
      activeRunId = "";
    }
  };

  const proposeSkillRun = async ({ skillId, targetId, params = {}, locale = "" } = {}) => {
    const normalizedSkillId = String(skillId || "").trim();
    if (!normalizedSkillId || streaming.value) return null;
    if (!(await commitPendingMessageDeletion())) return null;

    let session = currentSession.value;
    if (!session) {
      session = await createSession({ targetId });
      currentSessionId.value = session.id;
      currentSession.value = session;
      currentMessages.value = [];
      currentLoaded.value = true;
    }

    const payload = await fetchJson(SKILL_PROPOSALS_URL, {
      method: "POST",
      body: JSON.stringify({
        session_id: session.id,
        skill_id: normalizedSkillId,
        params,
        locale
      })
    });
    await reloadCurrent({ resumeActiveRun: false });
    return payload;
  };

  const approveSkillRun = async (skillRunId) => {
    const payload = await mutateSkillRun(skillRunId, "approve", null, { reload: false });
    const run = normalizeRun(payload?.run);
    await reloadCurrent({ resumeActiveRun: false });
    if (shouldResumeRun(run)) {
      await resumeRun(run);
    }
  };

  const approveSkillRuns = async (skillRunIds = []) => {
    const ids = Array.isArray(skillRunIds) ? skillRunIds.map(String).filter(Boolean) : [];
    if (ids.length === 1) {
      await approveSkillRun(ids[0]);
      return;
    }
    if (!ids.length) return;
    const payload = await fetchJson(SKILL_BATCH_APPROVE_URL, {
      method: "POST",
      body: JSON.stringify({ skill_run_ids: ids })
    });
    const run = normalizeRun(payload?.run);
    await reloadCurrent({ resumeActiveRun: false });
    if (shouldResumeRun(run)) {
      await resumeRun(run);
    }
  };

  const rejectSkillRun = async (skillRunId) => {
    await mutateSkillRun(skillRunId, "reject", {});
  };

  const cancelSkillRun = async (skillRunId) => {
    await mutateSkillRun(skillRunId, "cancel");
  };

  const changeMessageLayout = async (messageId, variant) => {
    const normalizedId = String(messageId || "").trim();
    const normalizedVariant = String(variant || "").trim();
    if (!normalizedId || !normalizedVariant) return null;
    const payload = await fetchJson(`/assistant/messages/${normalizedId}/layout`, {
      method: "POST",
      body: JSON.stringify({ variant: normalizedVariant })
    });
    const [message] = normalizeMessageList([payload]);
    if (message) markMessage(message.id, message);
    return message || null;
  };

  const mutateSkillRun = async (skillRunId, action, body = null, { reload = true } = {}) => {
    const normalizedId = String(skillRunId || "").trim();
    if (!normalizedId) return null;
    const payload = await fetchJson(`/assistant/skill-runs/${normalizedId}/${action}`, {
      method: "POST",
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (reload) await reloadCurrent({ resumeActiveRun: false });
    return payload;
  };

  const resumeRun = async (run) => {
    if (!shouldResumeRun(run)) return;
    streaming.value = true;
    streamingPhase.value = run.status || "running";
    status.value = "";
    activeAbort = new AbortController();
    activeRunId = run.id;
    const assistantMessageId = run.assistant_message_id;

    try {
      await readAssistantRunEvents(run.id, {
        signal: activeAbort.signal,
        onEvent: (event) => applyStreamEvent(event, assistantMessageId)
      });
      bumpSessionUpdatedAt(run.session_id);
      await reloadCurrent({ resumeActiveRun: false });
    } catch (error) {
      if (error?.name === "AbortError") {
        markMessage(assistantMessageId, { stopped: true });
      } else {
        reportError("Assistant chat resume failed", error);
      }
    } finally {
      streaming.value = false;
      streamingPhase.value = "";
      activeAbort = null;
      activeRunId = "";
    }
  };

  const shouldResumeRun = (run) =>
    Boolean(
      run?.id &&
        run?.assistant_message_id &&
        run?.session_id === currentSessionId.value &&
        !streaming.value
    );

  const abort = () => {
    const runId = activeRunId;
    if (runId) {
      streamingPhase.value = "cancelling";
      cancelAssistantRun(runId).catch((error) => {
        console.error("void-assistant: cancel run failed", error);
      });
    }
    if (activeAbort) {
      activeAbort.abort();
      activeAbort = null;
    }
    activeRunId = "";
    streaming.value = false;
    streamingPhase.value = "";
  };

  const regenerateLast = async ({ targetId } = {}) => {
    if (streaming.value || !currentSession.value) return;
    if (!(await commitPendingMessageDeletion())) return;
    const messages = currentMessages.value;
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    if (!lastAssistant || !lastUser) return;
    currentMessages.value = messages.filter(
      (message) => message.id !== lastAssistant.id && message.id !== lastUser.id
    );
    draft.value = lastUser.content;
    await send({ targetId });
  };

  const deleteMessagePair = async (messageId) => {
    if (streaming.value || !currentSessionId.value) return;
    if (!(await commitPendingMessageDeletion())) return;
    const pair = resolveMessagePair(currentMessages.value, messageId);
    if (!pair) return;
    const messageIds = new Set(pair.messages.map((message) => message.id));
    const deletion = {
      sessionId: currentSessionId.value,
      requestMessageId: String(messageId),
      anchorIndex: pair.anchorIndex,
      messages: pair.messages,
      messageIds,
      timer: null
    };
    currentMessages.value = currentMessages.value.filter((message) => !messageIds.has(message.id));
    pendingMessageDeletionInternal = deletion;
    deletion.timer = window.setTimeout(() => {
      commitPendingMessageDeletion();
    }, MESSAGE_DELETE_UNDO_MS);
    pendingMessageDeletion.value = publicDeletion(deletion);
  };

  const undoMessageDeletion = () => {
    const deletion = pendingMessageDeletionInternal;
    if (!deletion) return;
    if (deletion.timer) {
      window.clearTimeout(deletion.timer);
    }
    if (currentSessionId.value === deletion.sessionId) {
      currentMessages.value = restoreDeletedMessages(currentMessages.value, deletion);
    }
    pendingMessageDeletionInternal = null;
    pendingMessageDeletion.value = null;
  };

  const commitPendingMessageDeletion = async () => {
    const deletion = pendingMessageDeletionInternal;
    if (!deletion) return true;
    if (deletion.timer) {
      window.clearTimeout(deletion.timer);
    }
    pendingMessageDeletionInternal = null;
    pendingMessageDeletion.value = null;
    try {
      await fetchJson(
        `${SESSIONS_URL}/${deletion.sessionId}/messages/${deletion.requestMessageId}`,
        { method: "DELETE" }
      );
      updateSessionMessageCount(deletion.sessionId, -deletion.messages.length);
      return true;
    } catch (error) {
      if (currentSessionId.value === deletion.sessionId) {
        currentMessages.value = restoreDeletedMessages(currentMessages.value, deletion);
      }
      reportError("Failed to delete assistant message pair", error);
      return false;
    }
  };

  const applyStreamEvent = (event, assistantMessageId) => {
    if (event.event === "queued" || event.event === "running") {
      streamingPhase.value = event.event;
      return;
    }
    if (event.event === "delta") {
      streamingPhase.value = "receiving";
      const text = String(event.json?.text || "");
      if (event.json?.kind === "step") {
        upsertAssistantRunStep(assistantMessageId, event.json?.step);
      } else if (text && event.json?.kind === "narration") {
        appendAssistantNarration(assistantMessageId, text);
      } else if (text) {
        appendAssistantText(assistantMessageId, text);
      }
      return;
    }
    if (event.event === "error") {
      streamingPhase.value = "failed";
      markMessage(assistantMessageId, {
        error: true,
        content: String(event.json?.message || "Assistant provider error")
      });
      return;
    }
    if (event.event === "done") {
      streamingPhase.value = "completed";
      const skillRun = normalizeSkillRun(event.json?.skill_run);
      if (skillRun) markMessage(assistantMessageId, { skill_run: skillRun });
      const skillRuns = normalizeSkillRunList(event.json?.skill_runs);
      if (skillRuns.length) {
        markMessage(assistantMessageId, {
          skill_run: skillRuns[0],
          skill_runs: skillRuns
        });
      }
      return;
    }
    if (event.event === "cancelled") {
      streamingPhase.value = "cancelled";
      markMessage(assistantMessageId, { stopped: true });
    }
  };

  const appendAssistantText = (id, text) => {
    currentMessages.value = currentMessages.value.map((message) =>
      message.id === id ? { ...message, content: `${message.content}${text}` } : message
    );
  };

  const appendAssistantNarration = (id, text) => {
    currentMessages.value = currentMessages.value.map((message) =>
      message.id === id
        ? { ...message, narration_content: `${message.narration_content || ""}${text}` }
        : message
    );
  };

  const upsertAssistantRunStep = (id, rawStep) => {
    const step = normalizeRunStep(rawStep);
    if (!step) return;
    currentMessages.value = currentMessages.value.map((message) => {
      if (message.id !== id) return message;
      const steps = Array.isArray(message.run_steps) ? message.run_steps : [];
      const nextSteps = steps.some((item) => item.id === step.id)
        ? steps.map((item) => (item.id === step.id ? { ...item, ...step } : item))
        : [...steps, step];
      return { ...message, run_steps: nextSteps };
    });
  };

  const markMessage = (id, patch) => {
    currentMessages.value = currentMessages.value.map((message) =>
      message.id === id ? { ...message, ...patch } : message
    );
  };

  const bumpSessionUpdatedAt = (id) => {
    const now = new Date().toISOString();
    sessions.value = sessions.value
      .map((session) => (session.id === id ? { ...session, updated_at: now } : session))
      .sort((left, right) => (right.updated_at || "").localeCompare(left.updated_at || ""));
  };

  const updateSessionMessageCount = (id, delta) => {
    sessions.value = sessions.value.map((session) => {
      if (session.id !== id) return session;
      return {
        ...session,
        message_count: Math.max(0, session.message_count + delta),
        updated_at: new Date().toISOString()
      };
    });
  };

  const filterPendingDeletedMessages = (sessionId, messages) => {
    const deletion = pendingMessageDeletionInternal;
    if (!deletion || deletion.sessionId !== sessionId) return messages;
    return messages.filter((message) => !deletion.messageIds.has(message.id));
  };

  const reportError = (label, error) => {
    console.error(`void-assistant: ${label}`, error);
    status.value = String(error?.message || error || label);
  };

  return {
    abort,
    approveSkillRun,
    approveSkillRuns,
    canSend,
    cancelSkillRun,
    changeMessageLayout,
    changeSessionTarget,
    createSession,
    currentLoaded,
    currentMessages,
    currentSession,
    currentSessionId,
    draft,
    groupedSessions,
    hasCurrent,
    loadSessions,
    loadTrashed,
    loadingCurrent,
    loadingSessions,
    loadingTrashed,
    regenerateLast,
    deleteMessagePair,
    proposeSkillRun,
    rejectSkillRun,
    reloadCurrent,
    renameSession,
    restoreSession,
    selectSession,
    send,
    sessions,
    sessionsLoaded,
    softDeleteSession,
    status,
    streaming,
    streamingPhase,
    streamingStatus,
    pendingMessageDeletion,
    undoMessageDeletion,
    trashedLoaded,
    trashedSessions
  };
});

let optimisticCounter = 1;

function createOptimisticMessage(role, content) {
  return {
    id: `optimistic-${optimisticCounter++}`,
    role,
    content,
    message_kind: "text",
    skill_run_ids: [],
    layout_config: {},
    skill_run: null,
    skill_runs: [],
    narration_content: "",
    run_steps: [],
    error: false,
    stopped: false,
    optimistic: true
  };
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {})
    },
    ...init
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const message = text || response.statusText || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

function normalizeSession(payload) {
  if (!payload || typeof payload !== "object") return null;
  return {
    id: String(payload.id || ""),
    title: String(payload.title || ""),
    target_id: String(payload.target_id || ""),
    created_at: String(payload.created_at || ""),
    updated_at: String(payload.updated_at || ""),
    deleted_at: payload.deleted_at ? String(payload.deleted_at) : null,
    message_count: Number(payload.message_count || 0)
  };
}

function normalizeSessionList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeSession).filter(Boolean);
}

function normalizeMessageList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => ({
    id: String(entry?.id || ""),
    role: String(entry?.role || ""),
    content: String(entry?.content || ""),
    message_kind: String(entry?.message_kind || "text"),
    skill_run_ids: Array.isArray(entry?.skill_run_ids) ? entry.skill_run_ids.map(String) : [],
    layout_config:
      entry?.layout_config && typeof entry.layout_config === "object" ? entry.layout_config : {},
    skill_run: normalizeSkillRun(entry?.skill_run),
    skill_runs: normalizeSkillRunList(entry?.skill_runs),
    narration_content: String(entry?.narration_content || ""),
    run_steps: normalizeRunStepList(entry?.run_steps),
    stopped: Boolean(entry?.stopped),
    error: Boolean(entry?.error),
    created_at: String(entry?.created_at || "")
  }));
}

function normalizeSkillRun(value) {
  if (!value || typeof value !== "object") return null;
  const id = String(value.id || "");
  const blocks = Array.isArray(value.blocks) ? value.blocks : [];
  if (!id) return null;
  return {
    id,
    skill_id: String(value.skill_id || ""),
    status: String(value.status || ""),
    error: value.error ? String(value.error) : "",
    blocks
  };
}

function normalizeSkillRunList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeSkillRun).filter(Boolean);
}

function normalizeRunStep(value) {
  if (!value || typeof value !== "object") return null;
  const id = String(value.id || "");
  const key = String(value.key || "");
  const status = String(value.status || "");
  if (!id || !key || !status) return null;
  return {
    id,
    key,
    status,
    skill_id: value.skill_id ? String(value.skill_id) : "",
    skill_run_id: value.skill_run_id ? String(value.skill_run_id) : ""
  };
}

function normalizeRunStepList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeRunStep).filter(Boolean);
}

function normalizeRun(payload) {
  if (!payload || typeof payload !== "object") return null;
  const id = String(payload.id || "");
  const sessionId = String(payload.session_id || "");
  const assistantMessageId = String(payload.assistant_message_id || "");
  const status = String(payload.status || "");
  if (!id || !sessionId || !assistantMessageId) return null;
  if (status !== "queued" && status !== "running") return null;
  return {
    id,
    session_id: sessionId,
    assistant_message_id: assistantMessageId,
    status
  };
}

function resolveMessagePair(messages, messageId) {
  const index = messages.findIndex((message) => message.id === messageId);
  if (index < 0) return null;
  const message = messages[index];
  if (message.role === "assistant") {
    const previous = messages[index - 1];
    if (previous?.role !== "user") return null;
    return {
      anchorIndex: index - 1,
      messages: [previous, message]
    };
  }
  if (message.role === "user") {
    const next = messages[index + 1];
    if (next?.role !== "assistant") return null;
    return {
      anchorIndex: index,
      messages: [message, next]
    };
  }
  return null;
}

function restoreDeletedMessages(messages, deletion) {
  const existingIds = new Set(messages.map((message) => message.id));
  const restored = deletion.messages.filter((message) => !existingIds.has(message.id));
  if (restored.length === 0) return messages;
  const before = messages.slice(0, deletion.anchorIndex);
  const after = messages.slice(deletion.anchorIndex);
  return [...before, ...restored, ...after];
}

function publicDeletion(deletion) {
  return {
    count: deletion.messages.length
  };
}

function normalizeErrorMessage(error) {
  const message = String(error?.message || "").trim();
  if (!message) return "Assistant request failed";
  try {
    const payload = JSON.parse(message);
    return String(payload.message || payload.error || "Assistant request failed");
  } catch {
    return message;
  }
}

function groupSessionsByDate(list) {
  const buckets = {
    today: { id: "today", items: [] },
    yesterday: { id: "yesterday", items: [] },
    week: { id: "week", items: [] },
    month: { id: "month", items: [] },
    older: { id: "older", items: [] }
  };
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = startOfLocalDay(now);
  const startOfYesterday = startOfToday - dayMs;
  const startOfWeek = startOfToday - 7 * dayMs;
  const startOfMonth = startOfToday - 30 * dayMs;

  for (const session of list) {
    const stamp = new Date(session.updated_at || session.created_at || 0).getTime();
    if (Number.isNaN(stamp) || stamp <= 0) {
      buckets.older.items.push(session);
      continue;
    }
    if (stamp >= startOfToday) buckets.today.items.push(session);
    else if (stamp >= startOfYesterday) buckets.yesterday.items.push(session);
    else if (stamp >= startOfWeek) buckets.week.items.push(session);
    else if (stamp >= startOfMonth) buckets.month.items.push(session);
    else buckets.older.items.push(session);
  }
  return Object.values(buckets).filter((bucket) => bucket.items.length > 0);
}

function startOfLocalDay(timestamp) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
