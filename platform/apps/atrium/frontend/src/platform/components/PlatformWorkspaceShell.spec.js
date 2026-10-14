import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it } from "vitest";
import PlatformWorkspaceShell from "./PlatformWorkspaceShell.vue";

describe("PlatformWorkspaceShell", () => {
  it("isolates the mobile drawer, dismisses with Escape and restores trigger focus", async () => {
    const wrapper = mount(PlatformWorkspaceShell, { attachTo: document.body, props: {
      sidebarOpen: false, collapsed: false, narrow: true, sidebarWidth: 260,
      closeLabel: "Close navigation", sidebarLabel: "Navigation"
    }, slots: { header: '<button class="trigger">Menu</button>', sidebar: '<button>Chats</button>', default: '<textarea />' }});
    expect(wrapper.get(".platform-workspace__sidebar").attributes()).toHaveProperty("inert");
    wrapper.get(".trigger").element.focus();
    await wrapper.setProps({ sidebarOpen: true });
    await nextTick();
    expect(wrapper.get('[role="dialog"]').attributes("aria-modal")).toBe("true");
    expect(wrapper.get("main").attributes()).toHaveProperty("inert");
    expect(document.activeElement).toBe(wrapper.get(".platform-workspace__close").element);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(wrapper.emitted("close-sidebar")).toHaveLength(1);
    await wrapper.setProps({ sidebarOpen: false });
    expect(document.activeElement).toBe(wrapper.get(".trigger").element);
    wrapper.unmount();
  });
});
