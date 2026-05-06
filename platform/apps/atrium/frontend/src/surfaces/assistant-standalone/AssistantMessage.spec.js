import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantMessage from "./AssistantMessage.vue";

describe("AssistantMessage", () => {
  it("places assistant actions on the timestamp row", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "Ответ",
          created_at: "2026-05-06T08:07:00Z"
        },
        showRegenerate: true
      }
    });

    const footer = wrapper.find(".assistant-message__footer");
    expect(footer.exists()).toBe(true);
    expect(footer.find(".assistant-message__time").exists()).toBe(true);
    expect(footer.find(".assistant-message__actions").exists()).toBe(true);
  });
});
