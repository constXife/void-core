<script setup>
// SurfaceRenderer — чистый рендер PageSpec по регионам. Переиспользуется view-route
// (CustomSurfacePage) и composer preview — preview честен by construction (тот же компонент).
// Без fetch/store/состояний загрузки: контейнер владеет async, сюда приходят готовые
// pageSpec + slotData + bridgeArtifacts. Read-only (ADR-0026 § render read-only; § 7 renderer split).
import { computed } from "vue";

import SurfaceBlock from "./SurfaceBlock.vue";

const props = defineProps({
  pageSpec: { type: Object, default: null },
  // slotId → dataset
  slotData: { type: Object, default: () => ({}) },
  // instanceId → resolved bridge artifact
  bridgeArtifacts: { type: Object, default: () => ({}) },
  t: { type: Function, required: true }
});

const REGION_ORDER = ["header", "left", "right", "footer"];

const blocks = computed(() =>
  Array.isArray(props.pageSpec?.blocks) ? props.pageSpec.blocks : []
);

// Рисуем только регионы, где реально есть блоки (graceful collapse пустых).
const activeRegions = computed(() =>
  REGION_ORDER.filter((region) => blocks.value.some((b) => b.region === region))
);

function blocksInRegion(region) {
  return blocks.value.filter((b) => b.region === region);
}
</script>

<template>
  <div class="surface-render">
    <section
      v-for="region in activeRegions"
      :key="region"
      class="surface-render__region"
      :data-region="region"
    >
      <SurfaceBlock
        v-for="block in blocksInRegion(region)"
        :key="block.id"
        :block="block"
        :slot-data="slotData"
        :bridge-artifacts="bridgeArtifacts"
        :t="t"
      />
    </section>
  </div>
</template>

<style scoped>
.surface-render {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.surface-render__region {
  display: grid;
  gap: 14px;
  align-content: start;
}

/* header и footer тянутся на обе колонки; header — горизонтальный ряд (KPI cards). */
.surface-render__region[data-region="header"],
.surface-render__region[data-region="footer"] {
  grid-column: 1 / -1;
}

.surface-render__region[data-region="header"] {
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
}

@media (max-width: 720px) {
  .surface-render {
    grid-template-columns: 1fr;
  }
  .surface-render__region[data-region="header"] {
    grid-auto-flow: row;
  }
}
</style>
