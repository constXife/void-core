<script setup>
// AssetGallery — универсальный рендер прикреплённых assets (`kernel:asset`) любой
// сущности. НЕ inventory-specific: принимает список asset-проекций и рисует
// превью-изображения (по generic content-URL `/api/knowledge/v1/assets/{id}/content`)
// + чипы для не-картинок. Источник данных (item-тулы / entity-assets read /
// surface-slot) — забота вызывающего; компонент чисто презентационный.
import { computed } from "vue";
import { FileText, Trash2 } from "lucide-vue-next";

const props = defineProps({
  // [{ asset_id, url?, title?, previewable?, mime_type?, asset_type?, original_filename? }]
  assets: { type: Array, default: () => [] },
  // опциональный переводчик; fallback на сырые строки
  t: { type: Function, default: null },
  // включает кнопку удаления на каждом asset'е; компонент остаётся презентационным —
  // только эмитит `delete`, само удаление + подтверждение делает вызывающий.
  deletable: { type: Boolean, default: false }
});

const emit = defineEmits(["delete"]);

function contentUrl(asset) {
  if (asset.url) return String(asset.url);
  if (asset.asset_id) {
    return `/api/knowledge/v1/assets/${encodeURIComponent(String(asset.asset_id))}/content`;
  }
  return null;
}

const items = computed(() =>
  (Array.isArray(props.assets) ? props.assets : [])
    .map((asset) => {
      if (!asset || typeof asset !== "object") return null;
      const url = contentUrl(asset);
      if (!url) return null;
      const isImage =
        asset.previewable === true ||
        asset.asset_type === "image" ||
        String(asset.mime_type || "").startsWith("image/");
      return {
        key: asset.asset_id ? String(asset.asset_id) : url,
        url,
        title: asset.title ? String(asset.title) : "",
        filename: asset.original_filename ? String(asset.original_filename) : "",
        isImage: Boolean(isImage),
        raw: asset
      };
    })
    .filter(Boolean)
);

const fileLabel = (item) =>
  item.title ||
  item.filename ||
  (props.t ? props.t("surface.asset.file") : "Файл");

const deleteLabel = () => (props.t ? props.t("surface.asset.delete") : "Удалить");
</script>

<template>
  <div v-if="items.length" class="asset-gallery">
    <div v-for="item in items" :key="item.key" class="asset-gallery__cell">
      <a
        class="asset-gallery__item"
        :class="item.isImage ? 'asset-gallery__thumb' : 'asset-gallery__file'"
        :href="item.url"
        target="_blank"
        rel="noopener"
      >
        <img
          v-if="item.isImage"
          :src="item.url"
          :alt="item.title || item.filename"
          loading="lazy"
        />
        <template v-else>
          <FileText :size="16" aria-hidden="true" />
          <span>{{ fileLabel(item) }}</span>
        </template>
      </a>
      <button
        v-if="deletable"
        type="button"
        class="asset-gallery__delete"
        :aria-label="deleteLabel()"
        @click="emit('delete', item.raw)"
      >
        <Trash2 :size="13" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.asset-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0.4em 0;
}
.asset-gallery__cell {
  position: relative;
  display: inline-flex;
}
.asset-gallery__delete {
  position: absolute;
  top: 4px;
  right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: color-mix(in srgb, #000 55%, transparent);
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.asset-gallery__cell:hover .asset-gallery__delete,
.asset-gallery__delete:focus-visible {
  opacity: 1;
}
.asset-gallery__delete:hover {
  background: var(--color-red-500, #ef4444);
}
.asset-gallery__thumb {
  display: block;
  width: 96px;
  height: 96px;
  border-radius: var(--border-radius-md, 8px);
  overflow: hidden;
  border: 1px solid var(--color-border-tertiary, rgba(0, 0, 0, 0.12));
}
.asset-gallery__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.asset-gallery__file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--border-radius-md, 8px);
  border: 1px solid var(--color-border-tertiary, rgba(0, 0, 0, 0.12));
  color: var(--color-text-secondary, inherit);
  text-decoration: none;
  font-size: 13px;
}
</style>
