import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantSidebarItem from "./AssistantSidebarItem.vue";

const session = {
  id: "session-1",
  title: "Carbon cycle"
};

describe("AssistantSidebarItem", () => {
  it("keeps the menu open while pointer leaves the row", async () => {
    const wrapper = mount(AssistantSidebarItem, {
      props: { session }
    });

    await wrapper.get(".assistant-sidebar-item__menu-trigger").trigger("click");
    expect(wrapper.find(".assistant-sidebar-item__menu").exists()).toBe(true);

    await wrapper.get(".assistant-sidebar-item").trigger("mouseleave");
    expect(wrapper.find(".assistant-sidebar-item__menu").exists()).toBe(true);
  });

  it("closes the menu on outside pointer down", async () => {
    const wrapper = mount(AssistantSidebarItem, {
      props: { session },
      attachTo: document.body
    });

    await wrapper.get(".assistant-sidebar-item__menu-trigger").trigger("click");
    expect(wrapper.find(".assistant-sidebar-item__menu").exists()).toBe(true);

    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".assistant-sidebar-item__menu").exists()).toBe(false);
    wrapper.unmount();
  });
});
