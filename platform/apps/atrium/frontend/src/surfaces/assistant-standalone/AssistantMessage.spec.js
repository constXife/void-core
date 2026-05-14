import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantMessage from "./AssistantMessage.vue";

const messages = {
  "assistant.message.proposalOne": "Предлагаю запустить {name}",
  "assistant.message.proposalBatch": "Предлагаю запустить batch: {names}",
  "assistant.message.awaitingApproval": "ожидает подтверждения",
  "assistant.message.approve": "Запускать",
  "assistant.message.reject": "Не запускать",
  "assistant.message.changeLayout": "Изменить раскладку skill",
  "assistant.message.copy": "Скопировать сообщение",
  "assistant.message.regenerate": "Сгенерировать заново",
  "assistant.message.deletePair": "Удалить пару сообщений",
  "assistant.message.stopped": "Генерация остановлена.",
  "assistant.layout.compact": "Compact",
  "assistant.layout.cards": "Cards",
  "assistant.metric.score": "баллов",
  "assistant.metric.descendants": "комментариев",
  "assistant.block.unknown": "Неподдерживаемый блок: {type}"
};

const t = (key, vars = {}) => {
  let value = messages[key] || key;
  for (const [name, replacement] of Object.entries(vars)) {
    value = value.replace(`{${name}}`, String(replacement));
  }
  return value;
};

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
        showRegenerate: true,
        t
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
        showDelete: true,
        t
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
        streamingStatus: "Модель начала обработку…",
        t
      }
    });

    expect(wrapper.find(".assistant-message__streaming-line").text()).toContain(
      "Модель начала обработку…"
    );
    expect(wrapper.find(".assistant-message__cursor").exists()).toBe(true);
  });

  it("renders narration as plain muted text outside markdown", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "",
          narration_content: "Подбираю подходящий навык.",
          created_at: "2026-05-06T08:07:00Z"
        },
        streaming: true,
        t
      }
    });

    expect(wrapper.find(".assistant-message__narration").text()).toBe(
      "Подбираю подходящий навык."
    );
    expect(wrapper.findComponent({ name: "AssistantMarkdown" }).exists()).toBe(false);
  });

  it("renders skill blocks instead of markdown when a skill run is attached", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "# Markdown projection",
          created_at: "2026-05-06T08:07:00Z",
          skill_run: {
            id: "skill-run-1",
            blocks: [
              {
                type: "article_card",
                title: "Block title",
                url: "https://example.com/story",
                summary: "Block summary",
                metrics: []
              }
            ]
          }
        },
        t
      }
    });

    expect(wrapper.find(".assistant-article-card").exists()).toBe(true);
    expect(wrapper.text()).toContain("Block title");
    expect(wrapper.text()).not.toContain("Markdown projection");
  });

  it("emits all pending skill ids from a batch proposal", async () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "Предлагаю запустить batch",
          message_kind: "skill_proposal",
          created_at: "2026-05-06T08:07:00Z",
          skill_runs: [
            { id: "skill-run-1", skill_id: "digest_hackernews", status: "awaiting_approval" },
            { id: "skill-run-2", skill_id: "digest_github", status: "awaiting_approval" }
          ]
        },
        t
      }
    });

    await wrapper.get(".assistant-message__proposal-button").trigger("click");

    expect(wrapper.find(".assistant-message__proposal-list").text()).toContain("digest_github");
    expect(wrapper.emitted("approve-skills")).toEqual([[["skill-run-1", "skill-run-2"]]]);
  });

  it("uses launch and no-launch actions for skill proposals", async () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "Предлагаю запустить Hacker News digest",
          message_kind: "skill_proposal",
          created_at: "2026-05-06T08:07:00Z",
          skill_run: {
            id: "skill-run-1",
            skill_id: "digest_hackernews",
            status: "awaiting_approval"
          }
        },
        t
      }
    });

    const buttons = wrapper.findAll(".assistant-message__proposal-button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].text()).toContain("Запускать");
    expect(buttons[1].text()).toContain("Не запускать");
    expect(wrapper.text()).not.toContain("Отклонить");
    expect(wrapper.text()).not.toContain("Отмена");

    await buttons[1].trigger("click");

    expect(wrapper.emitted("reject-skill")).toEqual([["skill-run-1"]]);
  });

  it("renders blocks from multiple completed skill runs", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "# Markdown projection",
          message_kind: "skill_result",
          created_at: "2026-05-06T08:07:00Z",
          skill_runs: [
            {
              id: "skill-run-1",
              blocks: [
                {
                  type: "section_header",
                  text: "Hacker News",
                  subtitle: "HN"
                }
              ]
            },
            {
              id: "skill-run-2",
              blocks: [
                {
                  type: "section_header",
                  text: "GitHub",
                  subtitle: "Trending"
                }
              ]
            }
          ]
        },
        t
      }
    });

    expect(wrapper.text()).toContain("Hacker News");
    expect(wrapper.text()).toContain("GitHub");
    expect(wrapper.text()).not.toContain("Markdown projection");
  });

  it("emits the next layout variant for skill results", async () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "# Markdown projection",
          message_kind: "skill_result",
          layout_config: { variant: "cards" },
          created_at: "2026-05-06T08:07:00Z",
          skill_runs: [
            {
              id: "skill-run-1",
              blocks: [
                {
                  type: "section_header",
                  text: "Hacker News",
                  subtitle: "HN"
                }
              ]
            }
          ]
        },
        t
      }
    });

    await wrapper.get(".assistant-message__action--text").trigger("click");

    expect(wrapper.emitted("change-layout")).toEqual([
      [{ messageId: "message-1", variant: "compact" }]
    ]);
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
        },
        t
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
        },
        t
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
        },
        t
      }
    });

    const image = wrapper.find(".assistant-message__avatar--user img");
    expect(image.exists()).toBe(true);
    expect(image.attributes("src")).toBe("https://example.com/avatar.png");
  });
});
