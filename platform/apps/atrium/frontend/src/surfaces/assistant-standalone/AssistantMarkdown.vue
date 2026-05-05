<script setup>
import { computed } from "vue";
import DOMPurify from "dompurify";
import { marked } from "marked";

const props = defineProps({
  content: {
    type: String,
    default: ""
  }
});

marked.setOptions({
  breaks: true,
  gfm: true
});

const html = computed(() => {
  const trimmed = String(props.content || "").trim();
  if (!trimmed) return "";
  const rendered = marked.parse(trimmed);
  return DOMPurify.sanitize(rendered, { USE_PROFILES: { html: true } });
});
</script>

<template>
  <div class="assistant-markdown" v-html="html" />
</template>
