import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantTopbar from "./AssistantTopbar.vue";

const ruMessages = {
  "assistant.tabs.ariaLabel": "Разделы ассистента",
  "assistant.tabs.chat": "Чат",
  "assistant.tabs.capabilities": "Возможности",
  "assistant.tabs.routines": "Рутины",
  "assistant.tabs.artifacts": "Артефакты",
  "assistant.tabs.surfaces": "Страницы"
};

const t = (key) => ruMessages[key] || key;

describe("AssistantTopbar", () => {
  it("renders tab labels through the provided localization function", () => {
    const wrapper = mount(AssistantTopbar, {
      props: {
        activeTab: "chat",
        t,
        capabilitiesCount: 2,
        routinesCount: 4
      }
    });

    expect(wrapper.find("nav").attributes("aria-label")).toBe("Разделы ассистента");
    expect(wrapper.findAll(".assistant-topbar__tab-label").map((node) => node.text()))
      .toEqual(["Чат", "Возможности", "Рутины", "Артефакты", "Страницы"]);
  });
});
