<script setup>
// DataTreeNode — рекурсивный узел для DataTreeBlock. Рендерит name + опциональный count
// и детей (если есть). Read-only.
import { computed } from "vue";

const props = defineProps({
  node: { type: Object, required: true },
  showCounts: { type: Boolean, default: false }
});

const children = computed(() =>
  Array.isArray(props.node?.children) ? props.node.children : []
);
const count = computed(() =>
  Number.isFinite(props.node?.count) ? props.node.count : null
);
</script>

<template>
  <li class="data-tree-node">
    <div class="data-tree-node__row">
      <span class="data-tree-node__name">{{ node.name }}</span>
      <span v-if="showCounts && count !== null" class="data-tree-node__count">{{ count }}</span>
    </div>
    <ul v-if="children.length" class="data-tree-node__children">
      <DataTreeNode
        v-for="child in children"
        :key="child.id"
        :node="child"
        :show-counts="showCounts"
      />
    </ul>
  </li>
</template>

<style scoped>
.data-tree-node {
  list-style: none;
}

.data-tree-node__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 0;
}

.data-tree-node__name {
  font-size: 13px;
  color: var(--text-primary, #f8fafc);
}

.data-tree-node__count {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted, color-mix(in srgb, currentColor 60%, transparent));
}

.data-tree-node__children {
  margin: 0;
  padding: 0 0 0 16px;
  border-left: 1px solid color-mix(in srgb, currentColor 10%, transparent);
}
</style>
