import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantSidebar from "./AssistantSidebar.vue";

const messages = {
  "assistant.sidebar.expand": "Expand sidebar",
  "assistant.sidebar.collapse": "Collapse sidebar",
  "assistant.sidebar.newChat": "New chat",
  "assistant.sidebar.searchPlaceholder": "Search chats",
  "assistant.sidebar.emptyChats": "Your chats will appear here.",
  "assistant.sidebar.searchEmpty": "No chats found",
  "assistant.sidebar.trash": "Trash",
  "assistant.sidebar.untitled": "Untitled",
  "assistant.sidebar.openMenu": "Open chat menu",
  "assistant.sidebar.rename": "Rename",
  "assistant.sidebar.delete": "Delete",
  "assistant.sidebar.restore": "Restore",
  "assistant.sidebar.loading": "Loading...",
  "assistant.sidebar.trashEmpty": "Trash is empty."
};

const t = (key) => messages[key] || key;

const identity = {
  label: "Atrium",
  subtitle: "Assistant",
  mark: {
    viewBox: "0 0 24 24",
    paths: []
  }
};

const groups = [
  {
    id: "today",
    label: "Today",
    items: [
      { id: "session-1", title: "Carbon cycle" },
      { id: "session-2", title: "Grocery list" }
    ]
  },
  {
    id: "older",
    label: "Older",
    items: [{ id: "session-3", title: "Quarterly plan" }]
  }
];

const mountSidebar = (props = {}) =>
  mount(AssistantSidebar, {
    props: {
      groups,
      trashed: [],
      trashedLoaded: true,
      identity,
      t,
      ...props
    }
  });

describe("AssistantSidebar", () => {
  it("filters chat groups by session title", async () => {
    const wrapper = mountSidebar();

    await wrapper.get(".assistant-sidebar__search").setValue("CAR");

    expect(wrapper.text()).toContain("Carbon cycle");
    expect(wrapper.text()).toContain("Today");
    expect(wrapper.text()).not.toContain("Grocery list");
    expect(wrapper.text()).not.toContain("Quarterly plan");
    expect(wrapper.text()).not.toContain("Older");
  });

  it("shows the search empty hint when no chats match", async () => {
    const wrapper = mountSidebar();

    await wrapper.get(".assistant-sidebar__search").setValue("missing");

    expect(wrapper.find(".assistant-sidebar__hint").text()).toBe("No chats found");
    expect(wrapper.find(".assistant-sidebar__group").exists()).toBe(false);
  });

  it("does not crash on untitled sessions and excludes them from matches", async () => {
    const wrapper = mountSidebar({
      groups: [
        {
          id: "today",
          label: "Today",
          items: [
            { id: "session-1", title: "Carbon cycle" },
            { id: "session-2", title: "" }
          ]
        }
      ]
    });

    await wrapper.get(".assistant-sidebar__search").setValue("carbon");

    expect(wrapper.text()).toContain("Carbon cycle");
    expect(wrapper.text()).not.toContain("Untitled");
  });

  it("clears search with Escape and restores the full chat list", async () => {
    const wrapper = mountSidebar();
    const input = wrapper.get(".assistant-sidebar__search");

    await input.setValue("carbon");
    await input.trigger("keydown", { key: "Escape" });

    expect(input.element.value).toBe("");
    expect(wrapper.text()).toContain("Carbon cycle");
    expect(wrapper.text()).toContain("Grocery list");
    expect(wrapper.text()).toContain("Quarterly plan");
  });
});
