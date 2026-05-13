import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantSkillCard from "./AssistantSkillCard.vue";

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
      props: { skill: hnSkill }
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
      props: { skill: hnSkill }
    });

    const detailsText = wrapper.find(".assistant-skill-card__details").text();
    expect(detailsText).toContain("trust_class: untrusted_web");
    expect(detailsText).toContain("reads: http_get_json");
    expect(detailsText).toContain("writes: digest_run.v1");
  });
});
