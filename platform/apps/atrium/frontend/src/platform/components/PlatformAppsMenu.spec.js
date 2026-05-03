import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import PlatformAppsMenu from "./PlatformAppsMenu.vue";

async function openMenu(wrapper) {
  await wrapper.get(".platform-apps-menu__trigger").trigger("click");
  await nextTick();
}

describe("PlatformAppsMenu", () => {
  it("shows the default product surfaces", async () => {
    const wrapper = mount(PlatformAppsMenu, {
      props: {
        currentProduct: "atrium",
        domain: "arkham.void"
      }
    });

    await openMenu(wrapper);

    const labels = wrapper
      .findAll(".platform-apps-menu__item-label")
      .map((item) => item.text());
    const hrefs = wrapper
      .findAll("a.platform-apps-menu__item")
      .map((item) => item.attributes("href"));

    expect(labels).toEqual(["Atrium", "Calendar", "Inventory", "Finance"]);
    expect(hrefs).toEqual([
      "https://atrium.arkham.void/",
      "https://calendar.arkham.void/",
      "https://inventory.arkham.void/",
      "https://finance.arkham.void/"
    ]);
  });
});
