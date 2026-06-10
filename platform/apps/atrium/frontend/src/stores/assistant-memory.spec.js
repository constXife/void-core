import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAssistantMemoryStore } from "./assistant-memory.js";

beforeEach(() => {
  setActivePinia(createPinia());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("assistant memory store", () => {
  it("loads memory notes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          notes: [memoryNote({ instance_id: "note-1", statement: "Prefers concise answers" })]
        })
      )
    );

    const store = useAssistantMemoryStore();
    await store.loadNotes();

    expect(fetch).toHaveBeenCalledWith(
      "/assistant/memory-notes",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({ Accept: "application/json" })
      })
    );
    expect(store.notes).toEqual([
      expect.objectContaining({
        instance_id: "note-1",
        statement: "Prefers concise answers"
      })
    ]);
    expect(store.error).toBe("");
  });

  it("keeps the current list when loading fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "memory_failed", message: "database unavailable" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        })
      )
    );

    const store = useAssistantMemoryStore();
    store.notes = [memoryNote({ instance_id: "existing-note" })];

    await store.loadNotes();

    expect(store.notes).toEqual([expect.objectContaining({ instance_id: "existing-note" })]);
    expect(store.error).toContain("database unavailable");
  });
});

function memoryNote(overrides = {}) {
  return {
    instance_id: "note-1",
    title: "Communication style",
    statement: "Prefers concise answers",
    category: "preference",
    salience: "high",
    source_session_id: "session-1",
    created_at: "2026-06-10T09:00:00Z",
    ...overrides
  };
}

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
