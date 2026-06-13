import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantTopbar from "./AssistantTopbar.vue";

const ruMessages = {
  "assistant.tabs.ariaLabel": "Разделы ассистента",
  "assistant.tabs.chat": "Чат",
  "assistant.tabs.capabilities": "Возможности",
  "assistant.tabs.routines": "Рутины",
  "assistant.tabs.memory": "Память",
  "assistant.tabs.artifacts": "Артефакты",
  "assistant.tabs.pages": "Страницы"
};

const t = (key) => ruMessages[key] || key;

// Источник табов поднят в родитель (общий с drawer-навигацией); topbar
// рендерит переданный список.
const tabs = [
  { id: "chat", label: t("assistant.tabs.chat"), count: null, showCount: false },
  { id: "capabilities", label: t("assistant.tabs.capabilities"), count: 2, showCount: true },
  { id: "routines", label: t("assistant.tabs.routines"), count: 4, showCount: true },
  { id: "memory", label: t("assistant.tabs.memory"), count: null, showCount: false },
  { id: "artifacts", label: t("assistant.tabs.artifacts"), count: null, showCount: false },
  { id: "pages", label: t("assistant.tabs.pages"), count: null, showCount: false }
];

describe("AssistantTopbar", () => {
  it("renders tab labels from the provided tabs prop", () => {
    const wrapper = mount(AssistantTopbar, {
      props: { activeTab: "chat", t, tabs }
    });

    expect(wrapper.find("nav").attributes("aria-label")).toBe("Разделы ассистента");
    expect(wrapper.findAll(".assistant-topbar__tab-label").map((node) => node.text()))
      .toEqual(["Чат", "Возможности", "Рутины", "Память", "Артефакты", "Страницы"]);
  });
});
