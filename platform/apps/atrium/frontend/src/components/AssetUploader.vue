<script setup>
// AssetUploader — презентационная обёртка над useAssetUpload: drag-drop зона +
// выбор файлов + очередь с прогрессом/превью/отменой. Generic: грузит фото/файлы к
// ЛЮБОЙ сущности (attach-to-entity-id), не inventory-specific. Логика заливки целиком
// в useAssetUpload; здесь только UI и локализация.
import { onBeforeUnmount, ref } from "vue";
import { UploadCloud, X, RotateCcw, FileText } from "lucide-vue-next";

import { useAssetUpload } from "../lib/useAssetUpload.js";

const props = defineProps({
  // graph entity id, к которому привязываем asset через kernel:has-asset
  attachToEntityId: { type: String, required: true },
  relationRef: { type: String, default: "kernel:has-asset" },
  accept: { type: String, default: "image/*" },
  multiple: { type: Boolean, default: true },
  // 0 = без лимита; иначе байты
  maxSize: { type: Number, default: 0 },
  concurrency: { type: Number, default: 3 },
  t: { type: Function, required: true }
});

const emit = defineEmits(["uploaded"]);

const inputRef = ref(null);
const dragging = ref(false);

const upload = useAssetUpload({
  attachToEntityId: props.attachToEntityId,
  relationRef: props.relationRef,
  maxSize: props.maxSize,
  concurrency: props.concurrency,
  onUploaded: (asset) => emit("uploaded", asset)
});

function openPicker() {
  inputRef.value?.click();
}

function onPick(event) {
  upload.enqueue(event.target.files);
  // сбрасываем value, чтобы повторный выбор того же файла снова триггерил change
  event.target.value = "";
}

function onDrop(event) {
  event.preventDefault();
  dragging.value = false;
  upload.enqueue(event.dataTransfer?.files);
}

function onDragover(event) {
  event.preventDefault();
  dragging.value = true;
}

function onDragleave() {
  dragging.value = false;
}

function statusLabel(item) {
  if (item.status === upload.STATUS.QUEUED) return props.t("surface.upload.queued");
  if (item.status === upload.STATUS.UPLOADING) return `${item.progress}%`;
  if (item.status === upload.STATUS.FINALIZING) return props.t("surface.upload.finalizing");
  if (item.status === upload.STATUS.DONE) return props.t("surface.upload.done");
  if (item.status === upload.STATUS.CANCELED) return props.t("surface.upload.canceled");
  if (item.status === upload.STATUS.ERROR) {
    return item.error === "file_too_large"
      ? props.t("surface.upload.tooLarge")
      : props.t("surface.upload.error");
  }
  return "";
}

const canCancel = (item) =>
  item.status === upload.STATUS.QUEUED ||
  item.status === upload.STATUS.UPLOADING ||
  item.status === upload.STATUS.FINALIZING;
const canRetry = (item) =>
  item.status === upload.STATUS.ERROR || item.status === upload.STATUS.CANCELED;

onBeforeUnmount(() => upload.dispose());
</script>

<template>
  <div class="asset-uploader">
    <button
      type="button"
      class="asset-uploader__dropzone"
      :class="{ 'asset-uploader__dropzone--active': dragging }"
      @click="openPicker"
      @drop="onDrop"
      @dragover="onDragover"
      @dragleave="onDragleave"
    >
      <UploadCloud :size="22" aria-hidden="true" />
      <span class="asset-uploader__hint">{{ t("surface.upload.dropHint") }}</span>
      <input
        ref="inputRef"
        type="file"
        class="asset-uploader__input"
        :accept="accept"
        :multiple="multiple"
        :aria-label="t('surface.upload.choose')"
        @change="onPick"
      />
    </button>

    <ul v-if="upload.items.length" class="asset-uploader__list">
      <li
        v-for="item in upload.items"
        :key="item.id"
        class="asset-uploader__item"
        :data-status="item.status"
      >
        <span class="asset-uploader__thumb">
          <img v-if="item.previewUrl" :src="item.previewUrl" :alt="item.name" />
          <FileText v-else :size="18" aria-hidden="true" />
        </span>
        <span class="asset-uploader__meta">
          <span class="asset-uploader__name" :title="item.name">{{ item.name }}</span>
          <span class="asset-uploader__bar" aria-hidden="true">
            <span
              class="asset-uploader__bar-fill"
              :data-status="item.status"
              :style="{ width: item.progress + '%' }"
            />
          </span>
          <span class="asset-uploader__status" :data-status="item.status">
            {{ statusLabel(item) }}
          </span>
        </span>
        <button
          v-if="canCancel(item)"
          type="button"
          class="asset-uploader__action"
          :aria-label="t('surface.upload.cancel')"
          @click="upload.cancel(item.id)"
        >
          <X :size="15" />
        </button>
        <button
          v-else-if="canRetry(item)"
          type="button"
          class="asset-uploader__action"
          :aria-label="t('surface.upload.retry')"
          @click="upload.retry(item.id)"
        >
          <RotateCcw :size="15" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.asset-uploader {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.asset-uploader__dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 22px;
  border: 1px dashed var(--color-border-tertiary, rgba(127, 127, 127, 0.35));
  border-radius: var(--border-radius-md, 8px);
  background: color-mix(in srgb, currentColor 3%, transparent);
  color: var(--color-text-secondary, inherit);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.asset-uploader__dropzone:hover,
.asset-uploader__dropzone--active {
  border-color: color-mix(in srgb, currentColor 45%, transparent);
  background: color-mix(in srgb, currentColor 7%, transparent);
}
.asset-uploader__input {
  display: none;
}

.asset-uploader__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.asset-uploader__item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.asset-uploader__thumb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: var(--border-radius-md, 8px);
  overflow: hidden;
  border: 1px solid var(--color-border-tertiary, rgba(127, 127, 127, 0.25));
  color: var(--color-text-secondary, inherit);
}
.asset-uploader__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.asset-uploader__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1 1 auto;
}
.asset-uploader__name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.asset-uploader__bar {
  display: block;
  height: 4px;
  border-radius: 2px;
  background: color-mix(in srgb, currentColor 12%, transparent);
  overflow: hidden;
}
.asset-uploader__bar-fill {
  display: block;
  height: 100%;
  background: var(--color-accent, #3b82f6);
  transition: width 0.15s ease;
}
.asset-uploader__bar-fill[data-status="done"] {
  background: var(--color-green-500, #22c55e);
}
.asset-uploader__bar-fill[data-status="error"],
.asset-uploader__bar-fill[data-status="canceled"] {
  background: var(--color-red-500, #ef4444);
}
.asset-uploader__status {
  font-size: 12px;
  color: var(--color-text-secondary, color-mix(in srgb, currentColor 60%, transparent));
}
.asset-uploader__status[data-status="error"] {
  color: var(--color-red-500, #ef4444);
}
.asset-uploader__action {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border-tertiary, rgba(127, 127, 127, 0.25));
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.asset-uploader__action:hover {
  background: color-mix(in srgb, currentColor 8%, transparent);
}
</style>
