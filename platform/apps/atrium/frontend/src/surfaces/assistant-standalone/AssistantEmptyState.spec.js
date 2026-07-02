import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantEmptyState from "./AssistantEmptyState.vue";

const messages = {
  "assistant.empty.subtitle": "Спроси что угодно или начни с подсказки."
};

const t = (key) => messages[key] || key;

describe("AssistantEmptyState", () => {
  it("keeps the hero clean: provider/reliability notice lives in the composer now", () => {
    const wrapper = mount(AssistantEmptyState, { props: { t } });

    expect(wrapper.find(".assistant-empty__privacy").exists()).toBe(false);
    expect(wrapper.find(".assistant-empty__subtitle").text()).toContain("начни с подсказки");
  });

  it("renders suggestion chips and emits the chosen one", async () => {
    const wrapper = mount(AssistantEmptyState, {
      props: { t, suggestions: ["Что у меня в инвентаре?", "Собери дайджест Hacker News"] }
    });

    const chips = wrapper.findAll(".assistant-empty__chip");
    expect(chips).toHaveLength(2);
    await chips[0].trigger("click");
    expect(wrapper.emitted("choose")).toEqual([["Что у меня в инвентаре?"]]);
  });
});
