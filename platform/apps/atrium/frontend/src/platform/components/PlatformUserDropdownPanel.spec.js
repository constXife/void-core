import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PlatformUserDropdownPanel from "./PlatformUserDropdownPanel.vue";

function mountPanel(domain) {
  return mount(PlatformUserDropdownPanel, {
    props: {
      user: { authenticated: true, email: "reader@example.test" },
      currentLang: "ru",
      theme: "dark",
      t: (key) => key,
      domain
    }
  });
}

describe("PlatformUserDropdownPanel", () => {
  it("links product surfaces to the canonical Atrium account hub", () => {
    const wrapper = mountPanel("arkham.void");

    expect(wrapper.get("a.platform-user-dropdown-panel__action").attributes("href"))
      .toBe("https://atrium.arkham.void/account");
  });

  it("uses the local account route without a platform domain", () => {
    const wrapper = mountPanel("");

    expect(wrapper.get("a.platform-user-dropdown-panel__action").attributes("href"))
      .toBe("/account");
  });
});
