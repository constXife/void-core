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

  it("emits delete for assistant messages", async () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "Ответ",
          created_at: "2026-05-06T08:07:00Z"
        },
        showDelete: true
      }
    });

    await wrapper.get(".assistant-message__action--danger").trigger("click");

    expect(wrapper.emitted("delete")).toEqual([["message-1"]]);
  });

  it("shows a visible streaming status before the first token", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "",
          created_at: "2026-05-06T08:07:00Z"
        },
        streaming: true,
        streamingStatus: "Модель начала обработку…"
      }
    });

    expect(wrapper.find(".assistant-message__streaming-line").text()).toContain(
      "Модель начала обработку…"
    );
    expect(wrapper.find(".assistant-message__cursor").exists()).toBe(true);
  });
});
