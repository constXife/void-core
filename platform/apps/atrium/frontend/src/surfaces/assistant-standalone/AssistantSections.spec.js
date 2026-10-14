import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantSections from "./AssistantSections.vue";

describe("AssistantSections", () => {
  it("keeps secondary destinations reachable without putting them in primary navigation", async () => {
    const wrapper = mount(AssistantSections, { props: {
      tabs: [{ id: "artifacts", label: "Results", primary: true }, { id: "routines", label: "Tasks", primary: true },
        { id: "memory", label: "Memory" }, { id: "pages", label: "Pages" }],
      activeTab: "artifacts", collapsed: false, t: (key) => key
    }});
    expect(wrapper.text()).toContain("Results");
    expect(wrapper.text()).not.toContain("Memory");
    expect(wrapper.get('[aria-current="page"]').text()).toBe("Results");
    await wrapper.get('[aria-expanded]').trigger("click");
    expect(wrapper.text()).toContain("Memory");
    const buttons = wrapper.findAll(".assistant-sections__menu button");
    await buttons[1].trigger("click");
    expect(wrapper.emitted("select")).toEqual([["pages"]]);
    expect(wrapper.find(".assistant-sections__menu").exists()).toBe(false);
    wrapper.unmount();
  });
});
