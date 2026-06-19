import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  cancelAssistantRun,
  createAssistantRun,
  readAssistantRunEvents
} from "../lib/assistant-run-client.js";

let nextMessageId = 1;

export const useAssistantStore = defineStore("void-assistant", () => {
  const loaded = ref(false);
  const enabled = ref(false);
  const isOpen = ref(false);
  const providers = ref([]);
  const targets = ref([]);
  const defaultTargetId = ref("");
  const selectedTargetId = ref("");
  const currentSessionId = ref("");
  const messages = ref([]);
  const draft = ref("");
  const streaming = ref(false);
  const status = ref("");

  let activeAbort = null;
  let activeRunId = "";

  const activeTarget = computed(() =>
    targets.value.find((target) => target.id === selectedTargetId.value) || null
  );

  const visible = computed(() => loaded.value && enabled.value);
  const canSend = computed(() => enabled.value && !streaming.value && draft.value.trim().length > 0);

  const loadModels = async ({ force = false } = {}) => {
    if (loaded.value && !force) return enabled.value;

    try {
      const response = await fetch("/assistant/models", {
        credentials: "include",
        headers: {
          Accept: "application/json"
        }
      });

      if (response.status === 404 || response.status === 401 || response.status === 403) {
        disableAssistant();
        return false;
      }
      if (!response.ok) {
        throw new Error(response.statusText || "Assistant models request failed");
      }

      const payload = await response.json();
      providers.value = Array.isArray(payload.providers) ? payload.providers : [];
      targets.value = Array.isArray(payload.targets) ? payload.targets : [];
      defaultTargetId.value = String(payload.default_target_id || "");
      enabled.value = payload.enabled === true && targets.value.length > 0;
      selectedTargetId.value = targets.value.some((target) => target.id === defaultTargetId.value)
        ? defaultTargetId.value
        : "";
      loaded.value = true;
      if (!enabled.value) isOpen.value = false;
      return enabled.value;
    } catch (error) {
      console.error("void-assistant: loadModels failed", error);
      status.value = String(error?.message || "Assistant load failed");
      disableAssistant();
      return false;
    }
  };

  const open = async () => {
    const available = await loadModels();
    if (!available) return;
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
  };

  const clear = () => {
    abort();
    currentSessionId.value = "";
    messages.value = [];
    status.value = "";
  };

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

  const send = async () => {
    const content = draft.value.trim();
    if (!content || streaming.value) return;

    if (!currentSessionId.value) {
      currentSessionId.value = await createEmbeddedSession(selectedTargetId.value);
    }

    const userMessage = createMessage("user", content);
    const assistantMessage = createMessage("assistant", "");
    messages.value = [...messages.value, userMessage, assistantMessage];
    draft.value = "";
    streaming.value = true;
    status.value = "";

    activeAbort = new AbortController();
    let assistantMessageId = assistantMessage.id;

    try {
      const payload = await createAssistantRun({
        sessionId: currentSessionId.value,
        targetId: selectedTargetId.value || "",
        message: content,
        signal: activeAbort.signal
      });
      activeRunId = String(payload?.run_id || payload?.run?.id || "");
      if (!activeRunId) {
        throw new Error("Assistant run create returned empty id");
      }
      const serverAssistantMessageId = String(
        payload?.assistant_message_id || payload?.run?.assistant_message_id || ""
      );
      if (serverAssistantMessageId) {
        markAssistantMessage(assistantMessage.id, { id: serverAssistantMessageId });
        assistantMessageId = serverAssistantMessageId;
      }
      await readAssistantRunEvents(activeRunId, {
        signal: activeAbort.signal,
        onEvent: (event) => applyStreamEvent(event, assistantMessageId)
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        markAssistantMessage(assistantMessageId, { stopped: true });
      } else {
        markAssistantMessage(assistantMessageId, {
          error: true,
          content: normalizeErrorMessage(error)
        });
      }
    } finally {
      streaming.value = false;
      activeAbort = null;
      activeRunId = "";
    }
  };

  const createEmbeddedSession = async (targetId) => {
    const response = await fetch("/assistant/sessions", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(targetId ? { target_id: targetId } : {})
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || response.statusText || "Assistant session create failed");
    }
    const payload = await response.json();
    const sessionId = String(payload?.id || "").trim();
    if (!sessionId) {
      throw new Error("Assistant session create returned empty id");
    }
    return sessionId;
  };

  const applyStreamEvent = (event, assistantMessageId) => {
    if (event.event === "delta") {
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
      markAssistantMessage(assistantMessageId, {
        error: true,
        content: String(event.json?.message || "Assistant provider error")
      });
      return;
    }
    if (event.event === "done") {
      const skillRun = normalizeSkillRun(event.json?.skill_run);
      if (skillRun) markAssistantMessage(assistantMessageId, { skill_run: skillRun });
      return;
    }
    if (event.event === "cancelled") {
      markAssistantMessage(assistantMessageId, { stopped: true });
    }
  };

  const appendAssistantText = (id, text) => {
    messages.value = messages.value.map((message) =>
      message.id === id ? { ...message, content: `${message.content}${text}` } : message
    );
  };

  const appendAssistantNarration = (id, text) => {
    messages.value = messages.value.map((message) =>
      message.id === id
        ? { ...message, narration_content: `${message.narration_content || ""}${text}` }
        : message
    );
  };

  const upsertAssistantRunStep = (id, rawStep) => {
    const step = normalizeRunStep(rawStep);
    if (!step) return;
    messages.value = messages.value.map((message) => {
      if (message.id !== id) return message;
      const steps = Array.isArray(message.run_steps) ? message.run_steps : [];
      const nextSteps = steps.some((item) => item.id === step.id)
        ? steps.map((item) => (item.id === step.id ? { ...item, ...step } : item))
        : [...steps, step];
      return { ...message, run_steps: nextSteps };
    });
  };

  const markAssistantMessage = (id, patch) => {
    messages.value = messages.value.map((message) =>
      message.id === id ? { ...message, ...patch } : message
    );
  };

  const disableAssistant = () => {
    loaded.value = true;
    enabled.value = false;
    isOpen.value = false;
    providers.value = [];
    targets.value = [];
    defaultTargetId.value = "";
    selectedTargetId.value = "";
  };

  return {
    abort,
    activeTarget,
    canSend,
    clear,
    close,
    currentSessionId,
    defaultTargetId,
    draft,
    enabled,
    isOpen,
    loadModels,
    loaded,
    messages,
    open,
    providers,
    selectedTargetId,
    send,
    status,
    streaming,
    targets,
    visible
  };
});

function createMessage(role, content) {
  return {
    id: nextMessageId++,
    role,
    content,
    skill_run: null,
    narration_content: "",
    run_steps: [],
    error: false,
    stopped: false
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

function normalizeSkillRun(value) {
  if (!value || typeof value !== "object") return null;
  const id = String(value.id || "");
  const blocks = Array.isArray(value.blocks) ? value.blocks : [];
  if (!id || blocks.length === 0) return null;
  return { id, blocks };
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
    skill_run_id: value.skill_run_id ? String(value.skill_run_id) : "",
    // memory_used: процитированные заметки (id+title) → ссылки на /memory.
    notes: normalizeRunStepNotes(value.notes)
  };
}

function normalizeRunStepNotes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((note) => note && typeof note === "object")
    .map((note) => ({ id: String(note.id || ""), title: String(note.title || "") }))
    .filter((note) => note.id && note.title);
}
