import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import AssistantMemoryPanel from "./AssistantMemoryPanel.vue";

// Панель читает ?note={id} через useRoute (подсветка процитированной заметки);
// в unit-окружении роутера нет — отдаём пустой query.
vi.mock("vue-router", () => ({
  useRoute: () => ({ query: {} })
}));

const messages = {
  "assistant.memory.title": "Memory",
  "assistant.memory.intro": "What the assistant knows about you.",
  "assistant.memory.loading": "Loading memory...",
  "assistant.memory.error": "Failed to load memory.",
  "assistant.memory.retry": "Retry",
  "assistant.memory.emptyTitle": "The assistant has not remembered anything yet",
  "assistant.memory.emptyText": "Notes appear from dialogs automatically.",
  "assistant.memory.field.title": "Title",
  "assistant.memory.field.statement": "Statement",
  "assistant.memory.field.category": "Category",
  "assistant.memory.field.salience": "Salience",
  "assistant.memory.placeholder.title": "Short label",
  "assistant.memory.placeholder.statement": "What should the assistant remember?",
  "assistant.memory.add": "Add note",
  "assistant.memory.adding": "Adding...",
  "assistant.memory.edit": "Edit",
  "assistant.memory.save": "Save",
  "assistant.memory.saving": "Saving...",
  "assistant.memory.cancel": "Cancel",
  "assistant.memory.delete": "Delete",
  "assistant.memory.deleteConfirm": "Delete?",
  "assistant.memory.deleting": "Deleting...",
  "assistant.memory.sourceDialog": "from dialog",
  "assistant.memory.category.preference": "Preference",
  "assistant.memory.category.fact": "Fact",
  "assistant.memory.category.project": "Project",
  "assistant.memory.category.habit": "Habit",
  "assistant.memory.category.relationship": "Relationship",
  "assistant.memory.salience.low": "Low",
  "assistant.memory.salience.normal": "Normal",
  "assistant.memory.salience.high": "High"
};

const t = (key) => messages[key] || key;

beforeEach(() => {
  setActivePinia(createPinia());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AssistantMemoryPanel", () => {
  it("renders memory notes with metadata and source dialog link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ notes: [memoryNote()] }))
    );

    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.text()).toContain("Prefers concise answers");
    expect(wrapper.text()).toContain("Preference");
    expect(wrapper.text()).toContain("High");
    expect(wrapper.text()).toContain("from dialog");
    expect(wrapper.findComponent({ name: "RouterLink" }).props("to")).toEqual({
      name: "assistant-chat",
      params: { id: "session-1" }
    });
  });

  it("does not render a date for non-RFC3339 created_at values", async () => {
    // A bare kadath commit-seq ("170") parses as year 170 via Date(); the panel
    // must hide the timestamp instead of rendering nonsense.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ notes: [memoryNote({ created_at: "170" })] }))
    );

    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.find("time").text().trim()).toBe("");
    expect(wrapper.text()).not.toContain("170 г.");
  });

  it("renders about chips and skips incomplete about entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          notes: [
            memoryNote({
              about: [
                { instance_id: "bee-device", kind_ref: "living:device", title: "bee" },
                { instance_id: "untitled", kind_ref: "kernel:place", title: "" }
              ]
            })
          ]
        })
      )
    );

    const wrapper = mountPanel();
    await flushPromises();

    const chips = wrapper.findAll('[data-test="memory-about-chip"]');
    expect(chips).toHaveLength(1);
    expect(chips[0].text()).toBe("bee");
  });

  it("renders no about chips when the field is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ notes: [memoryNote()] }))
    );

    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.findAll('[data-test="memory-about-chip"]')).toHaveLength(0);
  });

  it("renders the empty state", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ notes: [] })));

    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.text()).toContain("The assistant has not remembered anything yet");
    expect(wrapper.text()).toContain("Notes appear from dialogs automatically.");
  });

  it("deletes a note only after the confirm click", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init = {}) => {
        if (String(url) === "/assistant/memory-notes") {
          return jsonResponse({ notes: [memoryNote()] });
        }
        expect(String(url)).toBe("/assistant/memory-notes/note-1");
        expect(init.method).toBe("DELETE");
        return jsonResponse({ retracted: true });
      })
    );

    const wrapper = mountPanel();
    await flushPromises();

    const deleteButton = wrapper.get('[data-test="memory-delete"]');
    await deleteButton.trigger("click");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Delete?");
    expect(wrapper.text()).toContain("Prefers concise answers");

    await deleteButton.trigger("click");
    await flushPromises();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).not.toContain("Prefers concise answers");
  });

  it("keeps submit disabled while the form is empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ notes: [] })));

    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.get('[data-test="memory-create-submit"]').attributes("disabled")).toBeDefined();
  });
});

function mountPanel() {
  return mount(AssistantMemoryPanel, {
    props: { t },
    global: {
      stubs: {
        RouterLink: {
          name: "RouterLink",
          props: ["to"],
          template: '<a><slot /></a>'
        }
      }
    }
  });
}

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
