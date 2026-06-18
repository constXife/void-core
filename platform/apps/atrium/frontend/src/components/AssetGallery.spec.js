import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import AssetGallery from "./AssetGallery.vue";

describe("AssetGallery", () => {
  it("renders a previewable image via the provided url", () => {
    const wrapper = mount(AssetGallery, {
      props: {
        assets: [
          {
            asset_id: "a1",
            url: "/api/inventory/assets/a1",
            title: "Дрель",
            previewable: true
          }
        ]
      }
    });
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("/api/inventory/assets/a1");
    expect(img.attributes("alt")).toBe("Дрель");
  });

  it("builds a generic content url from asset_id when url is absent", () => {
    const wrapper = mount(AssetGallery, {
      props: { assets: [{ asset_id: "a2", asset_type: "image" }] }
    });
    expect(wrapper.find("img").attributes("src")).toBe(
      "/api/knowledge/v1/assets/a2/content"
    );
  });

  it("renders a file chip for non-image assets", () => {
    const wrapper = mount(AssetGallery, {
      props: {
        assets: [
          {
            asset_id: "d1",
            url: "/x",
            title: "Чек.pdf",
            mime_type: "application/pdf"
          }
        ]
      }
    });
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find(".asset-gallery__file").text()).toContain("Чек.pdf");
  });

  it("renders nothing when there are no assets", () => {
    const wrapper = mount(AssetGallery, { props: { assets: [] } });
    expect(wrapper.find(".asset-gallery").exists()).toBe(false);
  });
});
