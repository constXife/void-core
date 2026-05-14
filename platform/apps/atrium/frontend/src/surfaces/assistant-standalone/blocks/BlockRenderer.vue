<script setup>
import SectionHeaderBlock from "./SectionHeaderBlock.vue";
import ArticleCardBlock from "./ArticleCardBlock.vue";
import LinkListBlock from "./LinkListBlock.vue";
import UnknownBlock from "./UnknownBlock.vue";

defineProps({
  blocks: { type: Array, required: true },
  t: { type: Function, required: true }
});

function blockKey(block, index) {
  return `${block?.type || "unknown"}-${index}`;
}

function componentFor(block) {
  switch (block?.type) {
    case "section_header":
      return SectionHeaderBlock;
    case "article_card":
      return ArticleCardBlock;
    case "link_list":
      return LinkListBlock;
    default:
      return UnknownBlock;
  }
}
</script>

<template>
  <div class="assistant-blocks">
    <component
      :is="componentFor(block)"
      v-for="(block, index) in blocks"
      :key="blockKey(block, index)"
      :block="block"
      :t="t"
    />
  </div>
</template>

<style scoped>
.assistant-blocks {
  display: grid;
  gap: 10px;
  width: min(100%, 720px);
}
</style>
