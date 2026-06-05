<script setup>
// SurfaceBlock — dispatch-обёртка для ОДНОГО block instance из PageSpec.
// Разруливает два разных prop-контракта:
//   - bridge (assistant.latest_artifact) → AssistantLatestArtifactBlock { block, resolved, t }
//   - dataSlot-блоки (inventory.* / primitives) → registry-компонент { block, data, t }
//   - неизвестный block → graceful unknown-fallback
// Чистый presentational компонент: без fetch/store. Read-only (ADR-0026 § render read-only).
import { computed } from "vue";

import AssistantLatestArtifactBlock from "../artifact/AssistantLatestArtifactBlock.vue";
import { componentForBlock } from "./blockRegistry.js";

const props = defineProps({
  // PageSpec block instance: { id, block, region, props: { dataSlot?, ... } }
  block: { type: Object, required: true },
  // slotId → dataset (adapted dashboard data)
  slotData: { type: Object, default: () => ({}) },
  // instanceId → resolved bridge artifact (envelope)
  bridgeArtifacts: { type: Object, default: () => ({}) },
  t: { type: Function, required: true }
});

const BRIDGE_BLOCK = "assistant.latest_artifact";

const isBridge = computed(() => props.block?.block === BRIDGE_BLOCK);
const component = computed(() => componentForBlock(props.block?.block));
const dataset = computed(() => props.slotData?.[props.block?.props?.dataSlot] || {});
const resolved = computed(() => props.bridgeArtifacts?.[props.block?.id] || {});
</script>

<template>
  <AssistantLatestArtifactBlock
    v-if="isBridge"
    :block="block"
    :resolved="resolved"
    :t="t"
  />
  <component
    :is="component"
    v-else-if="component"
    :block="block"
    :data="dataset"
    :t="t"
  />
  <div v-else class="surface-block__unknown" role="status">
    {{ t("surface.render.unsupported_block", { block: block.block }) }}
  </div>
</template>

<style scoped>
.surface-block__unknown {
  padding: 16px;
  border: 1px dashed color-mix(in srgb, currentColor 20%, transparent);
  border-radius: 10px;
  font-size: 12px;
  font-style: italic;
  color: var(--ink-muted, color-mix(in srgb, currentColor 55%, transparent));
}
</style>
