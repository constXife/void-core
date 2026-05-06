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
  const status = ref("");

  let activeAbort = null;
  let activeRunId = "";

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
      currentMessages.value = normalizeMessageList(payload?.messages);
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
      activeAbort = null;
      activeRunId = "";
    }
  };

  const resumeRun = async (run) => {
    if (!shouldResumeRun(run)) return;
    streaming.value = true;
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
  };

  const regenerateLast = async ({ targetId } = {}) => {
    if (streaming.value || !currentSession.value) return;
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

  const applyStreamEvent = (event, assistantMessageId) => {
    if (event.event === "delta") {
      const text = String(event.json?.text || "");
      if (text) appendAssistantText(assistantMessageId, text);
      return;
    }
    if (event.event === "error") {
      markMessage(assistantMessageId, {
        error: true,
        content: String(event.json?.message || "Assistant provider error")
      });
    }
    if (event.event === "cancelled") {
      markMessage(assistantMessageId, { stopped: true });
    }
  };

  const appendAssistantText = (id, text) => {
    currentMessages.value = currentMessages.value.map((message) =>
      message.id === id ? { ...message, content: `${message.content}${text}` } : message
    );
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

  const reportError = (label, error) => {
    console.error(`void-assistant: ${label}`, error);
    status.value = String(error?.message || error || label);
  };

  return {
    abort,
    canSend,
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
    stopped: Boolean(entry?.stopped),
    error: Boolean(entry?.error),
    created_at: String(entry?.created_at || "")
  }));
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
    today: { id: "today", label: "Сегодня", labelEn: "Today", items: [] },
    yesterday: { id: "yesterday", label: "Вчера", labelEn: "Yesterday", items: [] },
    week: { id: "week", label: "7 дней", labelEn: "Last 7 days", items: [] },
    month: { id: "month", label: "30 дней", labelEn: "Last 30 days", items: [] },
    older: { id: "older", label: "Старше", labelEn: "Older", items: [] }
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
