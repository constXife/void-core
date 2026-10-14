import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  cancelAssistantRun,
  createAssistantRun,
  readAssistantRunEvents
} from "../lib/assistant-run-client.js";

let nextMessageId = 1;

export const useAssistantStore = defineStore("void-assistant", () => {
  const modelsState = ref("idle");
  const modelsError = ref("");
  const loaded = computed(() => !["idle", "loading"].includes(modelsState.value));
  const enabled = computed(() => modelsState.value === "ready");
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

  const visible = computed(() => enabled.value || modelsState.value === "error");
  const canSend = computed(() => enabled.value && !streaming.value && draft.value.trim().length > 0);

  const loadModels = async ({ force = false } = {}) => {
    if (modelsState.value === "loading") return false;
    if (loaded.value && modelsState.value !== "error" && !force) return enabled.value;
    modelsState.value = "loading";

    try {
      const response = await fetch("/assistant/models", {
        credentials: "include",
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        const payload = response.headers.get("Content-Type")?.includes("application/json")
          ? await response.json() : null;
        if (response.status === 404 && payload?.error === "void_assistant_disabled") {
          disableAssistant();
          return false;
        }
        throw new Error(`GET /assistant/models: HTTP ${response.status}: ${payload?.message || response.statusText}`);
      }

      const payload = await response.json();
      if (payload.enabled === false) {
        disableAssistant();
        return false;
      }
      if (payload.enabled !== true || !Array.isArray(payload.providers) ||
          !Array.isArray(payload.targets) || !payload.targets.length ||
          !payload.targets.some((target) => target.id === payload.default_target_id)) {
        throw new Error("GET /assistant/models: invalid model catalog or default target");
      }
      providers.value = payload.providers;
      targets.value = payload.targets;
      defaultTargetId.value = payload.default_target_id;
      selectedTargetId.value = payload.default_target_id;
      modelsError.value = "";
      modelsState.value = "ready";
      return true;
    } catch (error) {
      console.error("void-assistant: loadModels failed", error);
      clearModelCatalog();
      modelsError.value = String(error?.message || "Assistant models request failed");
      modelsState.value = "error";
      return false;
    }
  };

  const open = async () => {
    const available = await loadModels();
    if (!available && modelsState.value !== "error") return;
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

  const clearModelCatalog = () => {
    providers.value = [];
    targets.value = [];
    defaultTargetId.value = "";
    selectedTargetId.value = "";
  };

  const disableAssistant = () => {
    clearModelCatalog();
    modelsError.value = "";
    modelsState.value = "disabled";
    isOpen.value = false;
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
    modelsState,
    modelsError,
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
