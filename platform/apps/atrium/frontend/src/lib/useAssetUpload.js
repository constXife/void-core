import { computed, reactive } from "vue";

// useAssetUpload — headless ядро заливки assets (`kernel:asset`) в Garage через
// существующий legacy presigned-флоу. Без разметки: переиспользуемо в карточке
// сущности, чат-композере, любом surface. Вся UI-логика — в AssetUploader.vue.
//
// Поток на файл (ASSISTANT_ASSET_UPLOAD_CONTRACT, legacy путь — UI грузит владелец
// руками, confirm_token/approval не нужны):
//   1. POST /api/knowledge/v1/assets/uploads (intent)
//        → { upload_intent.presigned_upload {url, method, headers}, finalize_request }
//   2. PUT файла НАПРЯМУЮ в Garage по presigned URL; прогресс+отмена через XHR
//      (fetch не отдаёт upload-progress: Safari/Firefox не умеют request-stream).
//   3. POST /api/knowledge/v1/assets/uploads/finalize (тело = эхо finalize_request)
//        → создаёт kernel:asset + kernel:has-asset.
// Браузер sha256 НЕ считает: finalize сам качает объект из Garage и хеширует серверно.
//
// Очередь N файлов с лимитом параллелизма. transport-функции инъектируются (тест
// подменяет XHR/fetch без сети).

const STATUS = Object.freeze({
  QUEUED: "queued",
  UPLOADING: "uploading",
  FINALIZING: "finalizing",
  DONE: "done",
  ERROR: "error",
  CANCELED: "canceled",
  DELETING: "deleting"
});

const ACTIVE_STATUSES = [STATUS.UPLOADING, STATUS.FINALIZING];

// Дефолтный JSON-вызов: cookie-сессия, как весь atrium-фронт (atrium-api.js).
async function defaultPostJson(path, body, signal) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
    signal
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || `request_failed_${res.status}`);
  }
  const text = await res.text();
  return text.trim() ? JSON.parse(text) : null;
}

// Дефолтное hard-удаление сохранённого asset'а (REST DELETE, owner-scoped на сервере).
async function defaultDeleteJson(path, signal) {
  const res = await fetch(path, { method: "DELETE", credentials: "include", signal });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || `delete_failed_${res.status}`);
  }
  const text = await res.text();
  return text.trim() ? JSON.parse(text) : null;
}

// Дефолтный presigned PUT через XHR — единственный портабельный способ получить
// upload-progress и отмену (xhr.upload.progress / xhr.abort) на июнь 2026.
function defaultPutWithProgress({ url, method = "PUT", headers = {}, body, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    for (const [key, value] of Object.entries(headers || {})) {
      xhr.setRequestHeader(key, value);
    }
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`upload_failed_${xhr.status}: ${xhr.responseText || xhr.statusText}`));
    });
    xhr.addEventListener("error", () => reject(new Error("upload_network_error")));
    xhr.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(body);
  });
}

function isImageFile(file) {
  return String(file?.type || "").startsWith("image/");
}

// Проекция finalize-ответа в shape, который понимает AssetGallery.
function projectFinalizedAsset(finalized, item) {
  const assetId = finalized?.asset_id || finalized?.finalized?.asset_id || "";
  return {
    asset_id: assetId,
    title: finalized?.finalized?.title || item.name,
    original_filename: item.name,
    mime_type: finalized?.file?.mime_type || item.file?.type || "",
    previewable: item.isImage
  };
}

export function useAssetUpload(options = {}) {
  const {
    attachToEntityId,
    relationRef = "kernel:has-asset",
    concurrency = 3,
    maxSize = 0,
    ownerSubjectId = "",
    onUploaded = null,
    onDeleted = null,
    postJson = defaultPostJson,
    putWithProgress = defaultPutWithProgress,
    deleteJson = defaultDeleteJson,
    createObjectURL = typeof URL !== "undefined" && URL.createObjectURL
      ? (file) => URL.createObjectURL(file)
      : () => "",
    revokeObjectURL = typeof URL !== "undefined" && URL.revokeObjectURL
      ? (url) => URL.revokeObjectURL(url)
      : () => {}
  } = options;

  const items = reactive([]);
  const controllers = new Map();
  let seq = 0;

  const activeCount = computed(
    () => items.filter((item) => ACTIVE_STATUSES.includes(item.status)).length
  );
  const pendingCount = computed(
    () => items.filter((item) => item.status === STATUS.QUEUED).length
  );
  const busy = computed(() => activeCount.value > 0 || pendingCount.value > 0);

  const intentPath = () => {
    const base = "/api/knowledge/v1/assets/uploads";
    return ownerSubjectId
      ? `${base}?owner_subject_id=${encodeURIComponent(ownerSubjectId)}`
      : base;
  };
  const finalizePath = () => {
    const base = "/api/knowledge/v1/assets/uploads/finalize";
    return ownerSubjectId
      ? `${base}?owner_subject_id=${encodeURIComponent(ownerSubjectId)}`
      : base;
  };

  function makeItem(file, overrides = {}) {
    const isImage = isImageFile(file);
    return reactive({
      id: `upload-${++seq}`,
      file,
      name: file?.name || "",
      size: file?.size || 0,
      isImage,
      previewUrl: isImage ? createObjectURL(file) : "",
      status: STATUS.QUEUED,
      progress: 0,
      error: "",
      asset: null,
      ...overrides
    });
  }

  async function runItem(item) {
    item.status = STATUS.UPLOADING;
    item.progress = 0;
    item.error = "";
    const controller = new AbortController();
    controllers.set(item.id, controller);
    try {
      const intent = await postJson(
        intentPath(),
        {
          original_filename: item.file.name,
          mime_type: item.file.type || undefined,
          attach_to_entity_id: attachToEntityId,
          relation_ref: relationRef
        },
        controller.signal
      );
      const presigned = intent?.upload_intent?.presigned_upload;
      const finalizeRequest = intent?.finalize_request;
      if (!presigned?.url || !finalizeRequest) {
        throw new Error("upload_intent_malformed");
      }
      await putWithProgress({
        url: presigned.url,
        method: presigned.method || "PUT",
        headers: presigned.headers || {},
        body: item.file,
        onProgress: (percent) => {
          item.progress = percent;
        },
        signal: controller.signal
      });
      item.progress = 100;
      item.status = STATUS.FINALIZING;
      const finalized = await postJson(finalizePath(), finalizeRequest, controller.signal);
      item.asset = projectFinalizedAsset(finalized, item);
      item.status = STATUS.DONE;
      if (onUploaded) onUploaded(item.asset, item);
    } catch (error) {
      if (error?.name === "AbortError" || controller.signal.aborted) {
        item.status = STATUS.CANCELED;
      } else {
        item.status = STATUS.ERROR;
        item.error = error?.message || String(error);
      }
    } finally {
      controllers.delete(item.id);
    }
  }

  // Идемпотентный планировщик: заполняет свободные слоты параллелизма queued-айтемами.
  function schedule() {
    let slots = concurrency - activeCount.value;
    if (slots <= 0) return;
    for (const item of items) {
      if (slots <= 0) break;
      if (item.status === STATUS.QUEUED) {
        slots -= 1;
        runItem(item).finally(schedule);
      }
    }
  }

  function enqueue(fileList) {
    const files = Array.from(fileList || []);
    for (const file of files) {
      if (maxSize && file.size > maxSize) {
        items.push(makeItem(file, { status: STATUS.ERROR, error: "file_too_large" }));
        continue;
      }
      items.push(makeItem(file));
    }
    schedule();
  }

  function cancel(id) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    const controller = controllers.get(id);
    if (controller) {
      controller.abort();
    } else if (item.status === STATUS.QUEUED) {
      item.status = STATUS.CANCELED;
    }
  }

  function retry(id) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    if (item.status !== STATUS.ERROR && item.status !== STATUS.CANCELED) return;
    item.status = STATUS.QUEUED;
    item.progress = 0;
    item.error = "";
    schedule();
  }

  function remove(id) {
    const index = items.findIndex((entry) => entry.id === id);
    if (index === -1) return;
    cancel(id);
    const [removed] = items.splice(index, 1);
    if (removed?.previewUrl) revokeObjectURL(removed.previewUrl);
  }

  // Hard-удаление уже сохранённого (done) asset'а: DELETE на сервер, затем убираем
  // строку. Осмысленно только для status=done (есть asset_id).
  async function deleteAsset(id) {
    const item = items.find((entry) => entry.id === id);
    if (!item || item.status !== STATUS.DONE || !item.asset?.asset_id) return;
    item.status = STATUS.DELETING;
    item.error = "";
    try {
      const base = `/api/knowledge/v1/assets/${encodeURIComponent(item.asset.asset_id)}`;
      const path = ownerSubjectId
        ? `${base}?owner_subject_id=${encodeURIComponent(ownerSubjectId)}`
        : base;
      await deleteJson(path);
      const deletedAsset = item.asset;
      remove(id);
      if (onDeleted) onDeleted(deletedAsset, item);
    } catch (error) {
      item.status = STATUS.DONE;
      item.error = error?.message || String(error);
    }
  }

  // Освободить object-URL превью при размонтировании компонента.
  function dispose() {
    for (const controller of controllers.values()) controller.abort();
    controllers.clear();
    for (const item of items) {
      if (item.previewUrl) revokeObjectURL(item.previewUrl);
    }
    items.splice(0, items.length);
  }

  return {
    STATUS,
    items,
    activeCount,
    pendingCount,
    busy,
    enqueue,
    cancel,
    retry,
    remove,
    deleteAsset,
    dispose
  };
}
