import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantEmptyState from "./AssistantEmptyState.vue";

describe("AssistantEmptyState", () => {
  it("shows provider and AI reliability notice before the first message", () => {
    const wrapper = mount(AssistantEmptyState);

    const notice = wrapper.find(".assistant-empty__privacy");
    expect(notice.exists()).toBe(true);
    expect(notice.text()).toContain("сторонний провайдер");
    expect(notice.text()).toContain("ИИ может ошибаться");
  });
});
