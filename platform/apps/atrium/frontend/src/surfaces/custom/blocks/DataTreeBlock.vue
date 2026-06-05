<script setup>
// DataTreeBlock — render для layout-примитива `data.tree`.
// Generic иерархическое дерево над tree-shaped data slot (inventory.locations.tree) с
// опциональными per-node counts. Read-only навигация/группировка.
import { computed } from "vue";
import DataTreeNode from "./DataTreeNode.vue";

const props = defineProps({
  // { id, block, region, props: { dataSlot, showCounts? } }
  block: { type: Object, required: true },
  // Adapted dataset: { nodes: [{ id, name, count?, children: [...] }] }
  data: { type: Object, default: () => ({}) },
  t: { type: Function, required: true }
});

const nodes = computed(() => (Array.isArray(props.data?.nodes) ? props.data.nodes : []));
const showCounts = computed(() => props.block?.props?.showCounts === true);
</script>

<template>
  <article class="data-tree">
    <div v-if="!nodes.length" class="data-tree__empty" role="status">
      {{ t("surface.tree.empty") }}
    </div>
    <ul v-else class="data-tree__root">
      <DataTreeNode
        v-for="node in nodes"
        :key="node.id"
        :node="node"
        :show-counts="showCounts"
      />
    </ul>
  </article>
</template>

<style scoped>
.data-tree {
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 12px;
  background: var(--surface-elevated, color-mix(in srgb, #ffffff 4%, transparent));
}

.data-tree__root {
  margin: 0;
  padding: 0;
  list-style: none;
}

.data-tree__empty {
  padding: 24px;
  text-align: center;
  font-style: italic;
  font-size: 13px;
  color: var(--ink-muted, color-mix(in srgb, currentColor 55%, transparent));
}
</style>
