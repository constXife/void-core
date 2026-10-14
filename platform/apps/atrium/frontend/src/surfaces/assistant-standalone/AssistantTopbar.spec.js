import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import AssistantTopbar from "./AssistantTopbar.vue";

describe("AssistantTopbar", () => {
  it("keeps the product and global actions visible while toggling navigation", async () => {
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    const wrapper = mount(AssistantTopbar, {
      props: { identity: { label: "Void Assistant" }, collapsed: true, t: (key) => key },
      slots: { actions: '<button>Apps</button>' }
    });
    expect(wrapper.text()).toContain("Void Assistant");
    expect(wrapper.text()).toContain("Apps");
    expect(wrapper.get(".assistant-topbar__toggle").attributes("aria-expanded")).toBe("false");
    await wrapper.get(".assistant-topbar__toggle").trigger("click");
    expect(wrapper.emitted("toggle-sidebar")).toHaveLength(1);
    wrapper.unmount();
  });
});
