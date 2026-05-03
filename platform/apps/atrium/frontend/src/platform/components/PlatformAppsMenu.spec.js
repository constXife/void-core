import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import PlatformAppsMenu from "./PlatformAppsMenu.vue";

async function openMenu(wrapper) {
  await wrapper.get(".platform-apps-menu__trigger").trigger("click");
  await nextTick();
}

describe("PlatformAppsMenu", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads official product surfaces from the product catalog", async () => {
    const fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [
            {
              key: "rauthy",
              classification: "official-profile",
              title: "Rauthy",
              href: "https://id.arkham.void",
              order: 1
            },
            {
              key: "atrium",
              classification: "official-product",
              title: { translations: { en: "Atrium", ru: "Атриум" } },
              href: "https://atrium.arkham.void",
              order: 2
            },
            {
              key: "calendar",
              classification: "official-product",
              title: { translations: { en: "Calendar", ru: "Календарь" } },
              href: "https://calendar.arkham.void",
              order: 3
            },
            {
              key: "mailpit",
              classification: "client-owned",
              title: "Mailpit",
              href: "https://mail.arkham.void",
              order: 4
            }
          ]
        })
      });
    vi.stubGlobal("fetch", fetch);

    const wrapper = mount(PlatformAppsMenu, {
      props: {
        currentProduct: "atrium",
        lang: "en"
      }
    });

    await flushPromises();
    await openMenu(wrapper);

    const labels = wrapper
      .findAll(".platform-apps-menu__item-label")
      .map((item) => item.text());
    const hrefs = wrapper
      .findAll("a.platform-apps-menu__item")
      .map((item) => item.attributes("href"));

    expect(fetch).toHaveBeenCalledWith("/product-catalog.json", { credentials: "same-origin" });
    expect(labels).toEqual(["Atrium", "Calendar"]);
    expect(hrefs).toEqual([
      "https://atrium.arkham.void",
      "https://calendar.arkham.void"
    ]);
  });

  it("supports explicit products without loading workspace data", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const wrapper = mount(PlatformAppsMenu, {
      props: {
        currentProduct: "atrium",
        domain: "arkham.void",
        products: [
          { key: "atrium", label: "Atrium", accent: "A" },
          { key: "calendar", label: "Calendar", accent: "C" }
        ]
      }
    });

    await flushPromises();
    await openMenu(wrapper);

    const labels = wrapper
      .findAll(".platform-apps-menu__item-label")
      .map((item) => item.text());
    const hrefs = wrapper
      .findAll("a.platform-apps-menu__item")
      .map((item) => item.attributes("href"));

    expect(fetch).not.toHaveBeenCalled();
    expect(labels).toEqual(["Atrium", "Calendar"]);
    expect(hrefs).toEqual([
      "https://atrium.arkham.void/",
      "https://calendar.arkham.void/"
    ]);
  });
});
