import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { readAssistantSseEvents } from "../lib/assistant-sse.js";

let nextMessageId = 1;

export const useAssistantStore = defineStore("atrium-assistant", () => {
  const loaded = ref(false);
  const enabled = ref(false);
  const isOpen = ref(false);
  const profiles = ref([]);
  const defaultProfileId = ref("");
  const selectedProfileId = ref("");
  const messages = ref([]);
  const draft = ref("");
  const streaming = ref(false);
  const status = ref("");

  let activeAbort = null;

  const activeProfile = computed(() =>
    profiles.value.find((profile) => profile.id === selectedProfileId.value) || null
  );

  const visible = computed(() => loaded.value && enabled.value);
  const canSend = computed(() => enabled.value && !streaming.value && draft.value.trim().length > 0);

  const loadProfiles = async ({ force = false } = {}) => {
    if (loaded.value && !force) return enabled.value;

    try {
      const response = await fetch("/atrium/assistant/profiles", {
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
        throw new Error(response.statusText || "Assistant profile request failed");
      }

      const payload = await response.json();
      profiles.value = Array.isArray(payload.profiles) ? payload.profiles : [];
      defaultProfileId.value = String(payload.default_profile_id || "");
      enabled.value = payload.enabled === true && profiles.value.length > 0;
      selectedProfileId.value = profiles.value.some((profile) => profile.id === defaultProfileId.value)
        ? defaultProfileId.value
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
    const available = await loadProfiles();
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
      const response = await fetch("/atrium/assistant/chat", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          profile_id: selectedProfileId.value || undefined,
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
    profiles.value = [];
    defaultProfileId.value = "";
    selectedProfileId.value = "";
  };

  return {
    abort,
    activeProfile,
    canSend,
    clear,
    close,
    defaultProfileId,
    draft,
    enabled,
    isOpen,
    loadProfiles,
    loaded,
    messages,
    open,
    profiles,
    selectedProfileId,
    send,
    status,
    streaming,
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
