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

  it("renders the current user avatar on user messages", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        currentUser: { email: "user@example.com" },
        message: {
          id: "message-1",
          role: "user",
          content: "Вопрос",
          created_at: "2026-05-06T08:07:00Z"
        }
      }
    });

    const avatar = wrapper.find(".assistant-message__avatar--user");
    expect(avatar.exists()).toBe(true);
    expect(avatar.text()).toBe("U");
  });

  it("does not invent a user avatar without an account context", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "user",
          content: "Вопрос",
          created_at: "2026-05-06T08:07:00Z"
        }
      }
    });

    const avatar = wrapper.find(".assistant-message__avatar--user");
    expect(avatar.exists()).toBe(false);
  });

  it("uses the current user avatar image when provided", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        currentUser: {
          email: "user@example.com",
          avatar_url: "https://example.com/avatar.png"
        },
        message: {
          id: "message-1",
          role: "user",
          content: "Вопрос",
          created_at: "2026-05-06T08:07:00Z"
        }
      }
    });

    const image = wrapper.find(".assistant-message__avatar--user img");
    expect(image.exists()).toBe(true);
    expect(image.attributes("src")).toBe("https://example.com/avatar.png");
  });
});
