import { ref } from "vue";
import { defineStore } from "pinia";

const MEMORY_NOTES_URL = "/assistant/memory-notes";

export const useAssistantMemoryStore = defineStore("void-assistant-memory", () => {
  const notes = ref([]);
  const loading = ref(false);
  const error = ref("");

  const loadNotes = async () => {
    loading.value = true;
    error.value = "";
    try {
      const payload = await fetchJson(MEMORY_NOTES_URL);
      notes.value = normalizeNoteList(payload?.notes);
    } catch (caught) {
      reportError("void-assistant-memory: load failed", caught);
    } finally {
      loading.value = false;
    }
  };

  const createNote = async ({ title, statement, category, salience }) => {
    error.value = "";
    try {
      const payload = await fetchJson(MEMORY_NOTES_URL, {
        method: "POST",
        body: JSON.stringify({ title, statement, category, salience })
      });
      const created = normalizeNotePayload(payload);
      notes.value = [created, ...notes.value.filter((note) => note.instance_id !== created.instance_id)];
      return created;
    } catch (caught) {
      reportError("void-assistant-memory: create failed", caught);
      throw caught;
    }
  };

  const patchNote = async (instanceId, patch) => {
    const id = String(instanceId || "");
    error.value = "";
    try {
      const payload = await fetchJson(`${MEMORY_NOTES_URL}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      const updated = normalizeNotePayload(payload);
      notes.value = notes.value.map((note) => (note.instance_id === id ? updated : note));
      return updated;
    } catch (caught) {
      reportError("void-assistant-memory: patch failed", caught);
      throw caught;
    }
  };

  const deleteNote = async (instanceId) => {
    const id = String(instanceId || "");
    error.value = "";
    try {
      const payload = await fetchJson(`${MEMORY_NOTES_URL}/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      if (payload?.retracted !== true) {
        throw new Error("Memory note delete returned unexpected response");
      }
      notes.value = notes.value.filter((note) => note.instance_id !== id);
      return payload;
    } catch (caught) {
      reportError("void-assistant-memory: delete failed", caught);
      throw caught;
    }
  };

  const reportError = (label, caught) => {
    console.error(label, caught);
    error.value = normalizeErrorMessage(caught);
  };

  return {
    notes,
    loading,
    error,
    loadNotes,
    createNote,
    patchNote,
    deleteNote
  };
});

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

function normalizeNotePayload(payload) {
  const note = normalizeNote(payload?.note ?? payload);
  if (!note) {
    throw new Error("Memory note response is missing note payload");
  }
  return note;
}

function normalizeNoteList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeNote).filter(Boolean);
}

function normalizeNote(value) {
  if (!value || typeof value !== "object") return null;
  const instanceId = String(value.instance_id || "");
  if (!instanceId) return null;
  return {
    instance_id: instanceId,
    title: String(value.title || ""),
    statement: String(value.statement || ""),
    category: String(value.category || ""),
    salience: String(value.salience || ""),
    source_session_id: value.source_session_id ? String(value.source_session_id) : null,
    created_at: value.created_at ? String(value.created_at) : null
  };
}

function normalizeErrorMessage(caught) {
  const message = String(caught?.message || "").trim();
  if (!message) return "Assistant memory request failed";
  try {
    const payload = JSON.parse(message);
    return String(payload.message || payload.error || "Assistant memory request failed");
  } catch {
    return message;
  }
}
