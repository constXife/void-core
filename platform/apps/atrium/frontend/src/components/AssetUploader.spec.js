import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

import AssetUploader from "./AssetUploader.vue";

const t = (key) => key;

function makeFile(name = "photo.png", type = "image/png", size = 1024) {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("AssetUploader", () => {
  beforeEach(() => {
    // intent зависает → айтем остаётся в uploading, сеть не нужна
    global.fetch = vi.fn(() => new Promise(() => {}));
    if (!global.URL.createObjectURL) global.URL.createObjectURL = () => "blob:fake";
    if (!global.URL.revokeObjectURL) global.URL.revokeObjectURL = () => {};
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a localized dropzone with a file input", () => {
    const wrapper = mount(AssetUploader, { props: { attachToEntityId: "item-1", t } });
    expect(wrapper.find(".asset-uploader__dropzone").exists()).toBe(true);
    const input = wrapper.find("input[type='file']");
    expect(input.exists()).toBe(true);
    expect(input.attributes("aria-label")).toBe("surface.upload.choose");
  });

  it("adds a queued/uploading row when files are selected", async () => {
    const wrapper = mount(AssetUploader, { props: { attachToEntityId: "item-1", t } });
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", { value: [makeFile()], writable: false });
    await input.trigger("change");
    await flushPromises();

    const row = wrapper.find(".asset-uploader__item");
    expect(row.exists()).toBe(true);
    expect(row.find(".asset-uploader__name").text()).toBe("photo.png");
    // активная заливка → доступна отмена
    expect(wrapper.find("[aria-label='surface.upload.cancel']").exists()).toBe(true);
  });

  it("marks oversized files as errors with a retry affordance", async () => {
    const wrapper = mount(AssetUploader, {
      props: { attachToEntityId: "item-1", maxSize: 100, t }
    });
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", {
      value: [makeFile("big.png", "image/png", 999)],
      writable: false
    });
    await input.trigger("change");
    await flushPromises();

    const row = wrapper.find(".asset-uploader__item");
    expect(row.attributes("data-status")).toBe("error");
    expect(row.find(".asset-uploader__status").text()).toBe("surface.upload.tooLarge");
    expect(wrapper.find("[aria-label='surface.upload.retry']").exists()).toBe(true);
  });

  it("emits uploaded when the composable reports a finalized asset", async () => {
    // здесь нужен реальный успешный флоу: подменяем fetch на отвечающий
    global.fetch = vi.fn(async (path) => {
      const body = path.includes("/finalize")
        ? { asset_id: "as1", file: { mime_type: "image/png" }, finalized: { title: "photo.png" } }
        : {
            upload_intent: {
              presigned_upload: { url: "https://garage.local/as1", method: "PUT", headers: {} }
            },
            finalize_request: { asset_id: "as1", original_filename: "photo.png" }
          };
      return { ok: true, status: 200, text: async () => JSON.stringify(body) };
    });
    // XHR PUT → мгновенный успех
    global.XMLHttpRequest = class {
      constructor() {
        this.upload = { addEventListener: () => {} };
        this.status = 200;
      }
      open() {}
      setRequestHeader() {}
      addEventListener(event, cb) {
        if (event === "load") this._load = cb;
      }
      send() {
        this._load?.();
      }
    };

    const wrapper = mount(AssetUploader, { props: { attachToEntityId: "item-1", t } });
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", { value: [makeFile()], writable: false });
    await input.trigger("change");
    await flushPromises();

    const emitted = wrapper.emitted("uploaded");
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toMatchObject({ asset_id: "as1", previewable: true });
  });
});
