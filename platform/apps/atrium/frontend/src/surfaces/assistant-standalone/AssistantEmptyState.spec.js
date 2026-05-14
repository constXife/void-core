import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantEmptyState from "./AssistantEmptyState.vue";

const messages = {
  "assistant.empty.subtitle": "Спроси что угодно или начни с подсказки.",
  "assistant.empty.providerNotice": "Модель настраивает оператор: это может быть сторонний провайдер со своими правилами обработки и retention.",
  "assistant.empty.reliabilityNotice": "ИИ может ошибаться. Не принимай ответы как проверенный факт без проверки."
};

const t = (key) => messages[key] || key;

describe("AssistantEmptyState", () => {
  it("shows provider and AI reliability notice before the first message", () => {
    const wrapper = mount(AssistantEmptyState, { props: { t } });

    const notice = wrapper.find(".assistant-empty__privacy");
    expect(notice.exists()).toBe(true);
    expect(notice.text()).toContain("сторонний провайдер");
    expect(notice.text()).toContain("ИИ может ошибаться");
  });
});
