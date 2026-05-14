import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantSkillCard from "./AssistantSkillCard.vue";

const messages = {
  "assistant.skill.trust.untrusted_web": "читает публичный веб",
  "assistant.skill.trust.unknown": "требует проверки источника",
  "assistant.skill.evalPassed": "Проверено в поставке",
  "assistant.skill.evalNeedsReview": "Требует проверки",
  "assistant.skill.version": "Навык · версия {version}",
  "assistant.skill.source": "Источник",
  "assistant.skill.result": "Результат",
  "assistant.skill.restrictions": "Ограничения",
  "assistant.skill.call": "Как вызвать",
  "assistant.skill.sayInChat": "Скажите в чате: «{phrase}».",
  "assistant.skill.launchExplain": "Кнопка ниже откроет готовую карточку подтверждения этого навыка.",
  "assistant.skill.details": "Технические детали",
  "assistant.skill.footer": "Запуск начнётся только после подтверждения в чате.",
  "assistant.skill.openInChat": "Открыть запуск в чате",
  "assistant.skill.openInChatTitle": "Откроет чат и подготовит карточку подтверждения. Сам навык стартует после подтверждения.",
  "assistant.skill.source.http": "читает публичные веб-источники",
  "assistant.skill.source.none": "не читает внешние источники",
  "assistant.skill.source.allowed": "читает разрешённые источники",
  "assistant.skill.result.digest": "создаёт дайджест в чате",
  "assistant.skill.result.none": "ничего не записывает",
  "assistant.skill.result.structured": "создаёт структурированный результат",
  "assistant.skill.restrictions.none": "запрещённых действий нет",
  "assistant.skill.invoke.digest_hackernews": "дай дайджест Hacker News",
  "assistant.template.enabled": "routine enabled",
  "assistant.template.notEnabled": "не включено",
  "assistant.template.view": "View routine",
  "assistant.template.enable": "Enable"
};

const t = (key, vars = {}) => {
  let value = messages[key] || key;
  for (const [name, replacement] of Object.entries(vars)) {
    value = value.replace(`{${name}}`, String(replacement));
  }
  return value;
};

const hnSkill = {
  id: "digest_hackernews",
  display_name: "Дайджест Hacker News",
  version: 1,
  stage: 1,
  trust_class: "untrusted_web",
  domain: "web",
  output_kind: "digest",
  description: "Собирает топ-истории Hacker News и показывает краткий дайджест на русском.",
  reads: ["http_get_json"],
  writes: ["digest_run.v1"],
  forbidden: [],
  eval_hash: "",
  eval_passed: true,
  templates: []
};

describe("AssistantSkillCard", () => {
  it("renders user-facing launch copy and hides operator terms from the main card", () => {
    const wrapper = mount(AssistantSkillCard, {
      props: { skill: hnSkill, t }
    });

    expect(wrapper.find(".assistant-skill-card__head").text()).toContain("читает публичный веб");
    expect(wrapper.find(".assistant-skill-card__head").text()).toContain("Проверено в поставке");
    expect(wrapper.find(".assistant-skill-card__head").text()).not.toContain("untrusted_web");
    expect(wrapper.find(".assistant-skill-card__head").text()).not.toContain("eval");
    expect(wrapper.find(".assistant-skill-card__head").text()).not.toContain("stage");

    const metaText = wrapper.find(".assistant-skill-card__meta").text();
    expect(metaText).toContain("читает публичные веб-источники");
    expect(metaText).toContain("создаёт дайджест в чате");
    expect(metaText).not.toContain("http_get_json");
    expect(metaText).not.toContain("digest_run.v1");

    expect(wrapper.find(".assistant-skill-card__templates").text())
      .toContain("Скажите в чате: «дай дайджест Hacker News».");
    expect(wrapper.find(".assistant-skill-card__templates").text())
      .toContain("готовую карточку подтверждения");
    expect(wrapper.find(".assistant-skill-card__footer").text())
      .toContain("Запуск начнётся только после подтверждения");
    expect(wrapper.find(".assistant-skill-card__chat").attributes("title"))
      .toContain("подготовит карточку подтверждения");
  });

  it("keeps raw schema and trust details behind the technical disclosure", () => {
    const wrapper = mount(AssistantSkillCard, {
      props: { skill: hnSkill, t }
    });

    const detailsText = wrapper.find(".assistant-skill-card__details").text();
    expect(detailsText).toContain("trust_class: untrusted_web");
    expect(detailsText).toContain("reads: http_get_json");
    expect(detailsText).toContain("writes: digest_run.v1");
  });

  it("emits template params when enabling a suggested routine", async () => {
    const wrapper = mount(AssistantSkillCard, {
      props: {
        skill: {
          ...hnSkill,
          templates: [
            {
              id: "hn-digest-morning",
              name: "Утренний дайджест",
              trigger_kind: "schedule",
              trigger_label: "0 9 * * *",
              params: { top_n: "10" },
              variant: "cards",
              enabled_instance_id: null
            }
          ]
        },
        t
      }
    });

    await wrapper.find(".assistant-template-row__action").trigger("click");

    expect(wrapper.emitted("enable-template")).toEqual([
      [
        {
          skillId: "digest_hackernews",
          templateId: "hn-digest-morning",
          params: { top_n: "10" },
          variant: "cards"
        }
      ]
    ]);
  });
});
