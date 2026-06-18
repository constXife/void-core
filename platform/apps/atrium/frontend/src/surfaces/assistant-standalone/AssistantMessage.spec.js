import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import AssistantMessage from "./AssistantMessage.vue";

const messages = {
  "assistant.message.proposalOne": "Предлагаю запустить {name}",
  "assistant.message.proposalBatch": "Предлагаю запустить batch: {names}",
  "assistant.message.awaitingApproval": "ожидает подтверждения",
  "assistant.message.statusApproved": "подтверждено",
  "assistant.message.statusRejected": "отклонено",
  "assistant.message.statusCancelled": "отменено",
  "assistant.message.approve": "Запускать",
  "assistant.message.reject": "Отклонить",
  "assistant.message.surfacePatchSummary": "{pageKind} · изменений: {count}",
  "assistant.message.surfacePatchApply": "Применить к {pageKind}",
  "assistant.message.surfacePatchReject": "Отклонить",
  "assistant.message.surfacePatchApplied": "Применено",
  "assistant.message.surfacePatchRejected": "Отклонено",
  "assistant.message.surfacePatchOpen": "Открыть страницу",
  "assistant.message.surfacePatchHint": "Создаст новую версию страницы — потом можно открыть и доредактировать.",
  "assistant.message.surfacePatchOp.addBlock": "+ блок {block} в {region}",
  "assistant.message.surfacePatchOp.removeBlock": "− блок {blockRef}",
  "assistant.message.surfacePatchOp.setProps": "изменены свойства {blockRef}",
  "assistant.message.surfacePatchOp.moveBlock": "{blockRef}: {fromRegion} → {toRegion}",
  "assistant.message.surfacePatchOp.setLayout": "макет → {layout}",
  "assistant.message.inventoryWriteSummary": "Добавить в инвентарь: {title}",
  "assistant.message.inventoryWriteApply": "Подтвердить",
  "assistant.message.inventoryWriteReject": "Отклонить",
  "assistant.message.inventoryWriteApplied": "Добавлено",
  "assistant.message.inventoryWriteRejected": "Отклонено",
  "assistant.message.inventoryWriteHint": "Добавит в инвентарь только после вашего подтверждения.",
  "assistant.message.changeLayout": "Изменить раскладку skill",
  "assistant.message.copy": "Скопировать сообщение",
  "assistant.message.copyCode": "Копировать",
  "assistant.message.copiedCode": "Скопировано",
  "assistant.message.regenerate": "Сгенерировать заново",
  "assistant.message.retry": "Повторить",
  "assistant.message.deletePair": "Удалить пару сообщений",
  "assistant.message.stopped": "Генерация остановлена.",
  "assistant.message.thinking": "Размышления",
  "assistant.step.skillProposal": "Подготовка {skill}",
  "assistant.step.skillRun": "Запуск {skill}",
  "assistant.step.memoryRecall": "Память: заметок в контексте — {count}",
  "assistant.step.memoryExtraction": "Запомнено: {count}",
  "assistant.step.sessionTitled": "Чат назван «{title}»",
  "assistant.step.unknown": "Шаг ассистента",
  "assistant.step.status.running": "выполняется",
  "assistant.step.status.completed": "готово",
  "assistant.step.status.failed": "ошибка",
  "assistant.step.status.unknown": "статус неизвестен",
  "assistant.latency.thinking": "Думает {time}",
  "assistant.latency.answering": "Отвечает {time} · думала {thinking}",
  "assistant.latency.completed": "Ответила за {total}",
  "assistant.latency.completedWithThinking": "Ответила за {total} · думала {thinking}",
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

  it("shows retry on error messages when regenerate is available", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "Provider failed",
          error: true,
          created_at: "2026-05-06T08:07:00Z"
        },
        showRegenerate: true,
        t
      }
    });

    const retry = wrapper.find(".assistant-message__error-retry");
    expect(retry.exists()).toBe(true);
    expect(retry.text()).toContain("Повторить");
  });

  it("hides retry on error messages when regenerate is unavailable", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "Provider failed",
          error: true,
          created_at: "2026-05-06T08:07:00Z"
        },
        t
      }
    });

    expect(wrapper.find(".assistant-message__error-retry").exists()).toBe(false);
  });

  it("emits regenerate from the error retry button", async () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "Provider failed",
          error: true,
          created_at: "2026-05-06T08:07:00Z"
        },
        showRegenerate: true,
        t
      }
    });

    await wrapper.get(".assistant-message__error-retry").trigger("click");

    expect(wrapper.emitted("regenerate")).toEqual([[]]);
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

  it("shows live thinking latency while waiting for the first token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T08:07:12Z"));
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "",
          created_at: "2026-05-06T08:07:00Z",
          timings: {
            started_at: "2026-05-06T08:07:00Z"
          }
        },
        streaming: true,
        latencyTick: Date.now(),
        t
      }
    });

    expect(wrapper.find(".assistant-message__latency").text()).toBe("Думает 0:12");
    vi.useRealTimers();
  });

  it("shows completed latency from persisted run timings", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "Ответ",
          created_at: "2026-05-06T08:07:00Z",
          timings: {
            started_at: "2026-05-06T08:07:00Z",
            first_delta_at: "2026-05-06T08:07:10Z",
            completed_at: "2026-05-06T08:07:45Z"
          }
        },
        t
      }
    });

    expect(wrapper.find(".assistant-message__latency").text()).toBe(
      "Ответила за 0:45 · думала 0:10"
    );
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

  it("renders provider think tags as a separate collapsed reasoning block", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "<think>Hidden reasoning</think>\nFinal answer",
          created_at: "2026-05-06T08:07:00Z"
        },
        t
      }
    });

    const thinking = wrapper.find(".assistant-message__thinking");
    expect(thinking.exists()).toBe(true);
    expect(thinking.attributes("open")).toBeUndefined();
    expect(thinking.text()).toContain("Размышления");
    expect(thinking.text()).toContain("Hidden reasoning");
    expect(wrapper.find(".assistant-markdown").text()).toContain("Final answer");
    expect(wrapper.find(".assistant-markdown").text()).not.toContain("<think>");
    expect(wrapper.find(".assistant-markdown").text()).not.toContain("Hidden reasoning");
  });

  it("keeps an unfinished provider think block open while streaming", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "<think>Still reasoning",
          created_at: "2026-05-06T08:07:00Z"
        },
        streaming: true,
        t
      }
    });

    const thinking = wrapper.find(".assistant-message__thinking");
    expect(thinking.exists()).toBe(true);
    expect(thinking.attributes("open")).toBe("");
    expect(thinking.text()).toContain("Still reasoning");
    expect(wrapper.find(".assistant-markdown").exists()).toBe(false);
  });

  it("renders structured run steps outside markdown", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "",
          run_steps: [
            {
              id: "skill-run:skill-run-1",
              key: "skill_run",
              status: "running",
              skill_id: "digest_hackernews",
              skill_run_id: "skill-run-1"
            }
          ],
          created_at: "2026-05-06T08:07:00Z"
        },
        streaming: true,
        t
      }
    });

    expect(wrapper.find(".assistant-message__step").text()).toContain("Запуск Hacker News digest");
    expect(wrapper.find(".assistant-message__step").text()).toContain("выполняется");
    expect(wrapper.findComponent({ name: "AssistantMarkdown" }).exists()).toBe(false);
  });

  it("renders memory and titling activity steps with expandable note titles", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "Ответ",
          run_steps: [
            {
              id: "memory-recall",
              key: "memory_recall",
              status: "completed",
              notes_count: 5
            },
            {
              id: "memory-extraction",
              key: "memory_extraction",
              status: "completed",
              notes_count: 2,
              titles: ["Характеристики bee", "Предпочтение по чаю"]
            },
            {
              id: "session-title",
              key: "session_titled",
              status: "completed",
              title: "Домашний сервер"
            }
          ],
          created_at: "2026-05-06T08:07:00Z"
        },
        t
      }
    });

    const steps = wrapper.findAll(".assistant-message__step");
    expect(steps).toHaveLength(3);
    expect(steps[0].text()).toContain("Память: заметок в контексте — 5");
    expect(steps[1].text()).toContain("Запомнено: 2");
    expect(steps[2].text()).toContain("Чат назван «Домашний сервер»");
    // Статус «готово» у завершённых activity-шагов не показывается — шум.
    for (const step of steps) {
      expect(step.text()).not.toContain("готово");
    }

    const details = steps[1].find(".assistant-message__step-details");
    expect(details.exists()).toBe(true);
    expect(details.text()).toContain("Характеристики bee");
    expect(details.text()).toContain("Предпочтение по чаю");
    expect(steps[0].find(".assistant-message__step-details").exists()).toBe(false);
  });

  it("hides empty activity steps", () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "Ответ",
          run_steps: [
            { id: "memory-recall", key: "memory_recall", status: "completed", notes_count: 0 },
            { id: "memory-extraction", key: "memory_extraction", status: "completed", notes_count: 0 },
            { id: "session-title", key: "session_titled", status: "completed", title: "  " }
          ],
          created_at: "2026-05-06T08:07:00Z"
        },
        t
      }
    });

    expect(wrapper.findAll(".assistant-message__step")).toHaveLength(0);
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

    const listText = wrapper.find(".assistant-message__proposal-list").text();
    expect(listText).toContain("GitHub trending digest");
    expect(listText).toContain("ожидает подтверждения");
    expect(listText).not.toContain("awaiting_approval");
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
    expect(buttons[1].text()).toContain("Отклонить");
    expect(wrapper.text()).not.toContain("Отмена");

    await buttons[1].trigger("click");

    expect(wrapper.emitted("reject-skill")).toEqual([["skill-run-1"]]);
  });

  it("renders an awaiting surface patch proposal with summary, diff ops, and apply action", async () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-1",
          role: "assistant",
          content: "Surface patch proposal",
          message_kind: "surface_patch_proposal",
          message_payload: {
            status: "awaiting_approval",
            pageKind: "dashboard",
            diff: {
              ops: [
                {
                  op: "addBlock",
                  blockRef: "block-1",
                  block: { type: "metric_card" },
                  region: "main"
                },
                { op: "removeBlock", blockRef: "old-block" },
                { op: "setProps", blockRef: "metric-1", props: { title: "MRR" } },
                {
                  op: "moveBlock",
                  blockRef: "chart-1",
                  fromRegion: "main",
                  toRegion: "sidebar"
                },
                { op: "setLayout", layout: "compact" }
              ]
            }
          },
          created_at: "2026-05-06T08:07:00Z"
        },
        t
      }
    });

    const proposal = wrapper.find(".assistant-message__proposal");
    expect(proposal.text()).toContain("dashboard · изменений: 5");
    expect(proposal.text()).toContain("+ блок metric_card в main");
    expect(proposal.text()).toContain("− блок old-block");
    expect(proposal.text()).toContain("изменены свойства metric-1");
    expect(proposal.text()).toContain("chart-1: main → sidebar");
    expect(proposal.text()).toContain("макет → compact");
    expect(proposal.text()).toContain("Создаст новую версию страницы");
    expect(wrapper.findComponent({ name: "AssistantMarkdown" }).exists()).toBe(false);

    const buttons = wrapper.findAll(".assistant-message__proposal-button");
    expect(buttons[0].text()).toContain("Применить к dashboard");

    await buttons[0].trigger("click");

    expect(wrapper.emitted("approve-surface-patch")).toEqual([["message-1"]]);
  });

  it("renders an awaiting inventory write proposal with summary, details, and confirm action", async () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: {
          id: "message-2",
          role: "assistant",
          content: "Inventory write proposal",
          message_kind: "inventory_write_proposal",
          message_payload: {
            status: "awaiting_approval",
            applyToolId: "inventory.item.create.apply",
            writePayload: {
              slice: "pantry",
              title: "Молоко",
              class_key: "dairy"
            },
            diff: {
              slice: { label: "Кладовая" },
              item: { title: "Молоко" }
            }
          },
          created_at: "2026-06-17T08:07:00Z"
        },
        t
      }
    });

    const proposal = wrapper.find(".assistant-message__proposal");
    expect(proposal.text()).toContain("Добавить в инвентарь: Молоко");
    expect(proposal.text()).toContain("Кладовая · dairy");
    expect(proposal.text()).toContain(
      "Добавит в инвентарь только после вашего подтверждения"
    );

    const buttons = wrapper.findAll(".assistant-message__proposal-button");
    expect(buttons[0].text()).toContain("Подтвердить");

    await buttons[0].trigger("click");

    expect(wrapper.emitted("approve-inventory-write")).toEqual([["message-2"]]);
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
