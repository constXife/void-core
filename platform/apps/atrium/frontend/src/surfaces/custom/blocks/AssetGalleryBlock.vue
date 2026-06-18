<script setup>
// AssetGalleryBlock — surface-блок `data.asset_gallery`: рендерит AssetGallery из
// data-slot'а. Generic, не inventory-specific: slot отдаёт массив asset-проекций
// (или { assets: [] } / { items: [] }). Делает универсальный рендер фото любой
// сущности доступным в любом custom-surface через тот же registry, что и
// metric/table/tree/timeline.
import { computed } from "vue";
import AssetGallery from "../../../components/AssetGallery.vue";

const props = defineProps({
  // { id, block, region, props: { dataSlot } }
  block: { type: Object, required: true },
  data: { type: [Array, Object], default: () => [] },
  t: { type: Function, required: true }
});

const assets = computed(() => {
  const data = props.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.assets)) return data.assets;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
});
</script>

<template>
  <AssetGallery :assets="assets" :t="t" />
</template>
