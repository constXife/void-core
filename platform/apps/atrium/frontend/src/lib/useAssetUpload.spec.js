import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import { useAssetUpload } from "./useAssetUpload.js";

function makeFile(name = "photo.png", type = "image/png", size = 1024) {
  const file = new File(["x".repeat(8)], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function intentResponse(assetId = "as1") {
  return {
    upload_intent: {
      presigned_upload: { url: `https://garage.local/${assetId}`, method: "PUT", headers: {} }
    },
    finalize_request: { asset_id: assetId, original_filename: "photo.png" }
  };
}

function finalizeResponse(assetId = "as1") {
  return {
    asset_id: assetId,
    file: { mime_type: "image/png" },
    finalized: { title: "photo.png" }
  };
}

function makeHarness(overrides = {}) {
  const postJson = vi.fn(async (path) => {
    if (path.startsWith("/api/knowledge/v1/assets/uploads/finalize")) return finalizeResponse();
    return intentResponse();
  });
  const putWithProgress = vi.fn(async ({ onProgress }) => {
    onProgress?.(100);
  });
  const upload = useAssetUpload({
    attachToEntityId: "item-1",
    postJson,
    putWithProgress,
    createObjectURL: () => "blob:fake",
    revokeObjectURL: () => {},
    ...overrides
  });
  return { upload, postJson, putWithProgress };
}

describe("useAssetUpload", () => {
  it("runs intent → put → finalize and projects the finalized asset", async () => {
    const onUploaded = vi.fn();
    const { upload, postJson, putWithProgress } = makeHarness({ onUploaded });

    upload.enqueue([makeFile()]);
    await flushPromises();

    const item = upload.items[0];
    expect(item.status).toBe(upload.STATUS.DONE);
    expect(item.progress).toBe(100);
    expect(item.asset).toMatchObject({
      asset_id: "as1",
      previewable: true,
      mime_type: "image/png"
    });
    expect(onUploaded).toHaveBeenCalledWith(item.asset, item);

    // intent зовётся с attach_to_entity_id + relation_ref
    expect(postJson).toHaveBeenCalledWith(
      "/api/knowledge/v1/assets/uploads",
      expect.objectContaining({
        attach_to_entity_id: "item-1",
        relation_ref: "kernel:has-asset",
        original_filename: "photo.png"
      }),
      expect.anything()
    );
    expect(putWithProgress).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://garage.local/as1", method: "PUT" })
    );
  });

  it("rejects oversized files before any network call", async () => {
    const { upload, postJson } = makeHarness({ maxSize: 100 });

    upload.enqueue([makeFile("big.png", "image/png", 999)]);
    await flushPromises();

    expect(upload.items[0].status).toBe(upload.STATUS.ERROR);
    expect(upload.items[0].error).toBe("file_too_large");
    expect(postJson).not.toHaveBeenCalled();
  });

  it("honours the concurrency limit", async () => {
    const gates = [deferred(), deferred()];
    let started = 0;
    const putWithProgress = vi.fn(() => {
      const gate = gates[started];
      started += 1;
      return gate.promise;
    });
    const { upload } = makeHarness({ concurrency: 1, putWithProgress });

    upload.enqueue([makeFile("a.png"), makeFile("b.png")]);
    await flushPromises();

    // лимит 1: второй файл ждёт в очереди, put вызван только один раз
    expect(started).toBe(1);
    expect(upload.items[1].status).toBe(upload.STATUS.QUEUED);

    gates[0].resolve();
    await flushPromises();

    expect(started).toBe(2);
    expect(upload.items[0].status).toBe(upload.STATUS.DONE);
  });

  it("cancels an in-flight upload via abort", async () => {
    const gate = deferred();
    const putWithProgress = vi.fn(({ signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError"))
        );
        gate.promise.then(_resolve);
      })
    );
    const { upload } = makeHarness({ putWithProgress });

    upload.enqueue([makeFile()]);
    await flushPromises();
    expect(upload.items[0].status).toBe(upload.STATUS.UPLOADING);

    upload.cancel(upload.items[0].id);
    await flushPromises();
    expect(upload.items[0].status).toBe(upload.STATUS.CANCELED);
  });

  it("retries a failed upload", async () => {
    let attempt = 0;
    const putWithProgress = vi.fn(() => {
      attempt += 1;
      if (attempt === 1) return Promise.reject(new Error("boom"));
      return Promise.resolve();
    });
    const { upload } = makeHarness({ putWithProgress });

    upload.enqueue([makeFile()]);
    await flushPromises();
    expect(upload.items[0].status).toBe(upload.STATUS.ERROR);

    upload.retry(upload.items[0].id);
    await flushPromises();
    expect(upload.items[0].status).toBe(upload.STATUS.DONE);
  });
});
