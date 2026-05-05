import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { readAssistantSseEvents } from "../lib/assistant-sse.js";

let nextMessageId = 1;

export const useAssistantStore = defineStore("void-assistant", () => {
  const loaded = ref(false);
  const enabled = ref(false);
  const isOpen = ref(false);
  const providers = ref([]);
  const targets = ref([]);
  const defaultTargetId = ref("");
  const selectedTargetId = ref("");
  const messages = ref([]);
  const draft = ref("");
  const streaming = ref(false);
  const status = ref("");

  let activeAbort = null;

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
    } catch {
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
    messages.value = [];
    status.value = "";
  };

  const abort = () => {
    if (activeAbort) {
      activeAbort.abort();
      activeAbort = null;
    }
    streaming.value = false;
  };

  const send = async () => {
    const content = draft.value.trim();
    if (!content || streaming.value) return;

    const outgoingMessages = messages.value
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        role: message.role,
        content: message.content
      }));
    const userMessage = createMessage("user", content);
    const assistantMessage = createMessage("assistant", "");
    messages.value = [...messages.value, userMessage, assistantMessage];
    draft.value = "";
    streaming.value = true;
    status.value = "";

    activeAbort = new AbortController();

    try {
      const response = await fetch("/assistant/chat", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          target_id: selectedTargetId.value || undefined,
          messages: [...outgoingMessages, { role: "user", content }]
        }),
        signal: activeAbort.signal
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(text || response.statusText || "Assistant request failed");
      }

      await readChatStream(response.body, assistantMessage.id);
    } catch (error) {
      if (error?.name === "AbortError") {
        markAssistantMessage(assistantMessage.id, { stopped: true });
      } else {
        markAssistantMessage(assistantMessage.id, {
          error: true,
          content: normalizeErrorMessage(error)
        });
      }
    } finally {
      streaming.value = false;
      activeAbort = null;
    }
  };

  const readChatStream = async (body, assistantMessageId) => {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = readAssistantSseEvents(buffer);
      buffer = parsed.buffer;
      for (const event of parsed.events) {
        applyStreamEvent(event, assistantMessageId);
        if (event.event === "done" || event.event === "error") {
          return;
        }
      }
    }
  };

  const applyStreamEvent = (event, assistantMessageId) => {
    if (event.event === "delta") {
      const text = String(event.json?.text || "");
      if (text) appendAssistantText(assistantMessageId, text);
      return;
    }
    if (event.event === "error") {
      markAssistantMessage(assistantMessageId, {
        error: true,
        content: String(event.json?.message || "Assistant provider error")
      });
    }
  };

  const appendAssistantText = (id, text) => {
    messages.value = messages.value.map((message) =>
      message.id === id ? { ...message, content: `${message.content}${text}` } : message
    );
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
