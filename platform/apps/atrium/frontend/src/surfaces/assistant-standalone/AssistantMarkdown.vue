<script setup>
import { computed } from "vue";
import DOMPurify from "dompurify";
import { marked } from "marked";

const props = defineProps({
  content: {
    type: String,
    default: ""
  },
  timeText: {
    type: String,
    default: ""
  },
  timeIso: {
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
  const sanitized = DOMPurify.sanitize(rendered, { USE_PROFILES: { html: true } });
  if (!props.timeText) return sanitized;
  return injectInlineTime(sanitized, props.timeText, props.timeIso);
});

function injectInlineTime(htmlSource, text, iso) {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return htmlSource;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body><div id="root">${htmlSource}</div></body>`, "text/html");
  const root = doc.getElementById("root");
  if (!root) return htmlSource;

  const timeEl = doc.createElement("time");
  timeEl.className = "assistant-time-inline";
  if (iso) {
    timeEl.setAttribute("datetime", iso);
    timeEl.setAttribute("title", iso);
  }
  timeEl.textContent = text;

  const last = root.lastElementChild;
  // PRE/TABLE — block-only элементы; вкладывать time внутрь сломает форматирование.
  // Для них ставим time как sibling после блока (он попадёт на новую строку).
  if (!last || last.tagName === "PRE" || last.tagName === "TABLE") {
    root.appendChild(timeEl);
  } else {
    last.appendChild(timeEl);
  }
  return root.innerHTML;
}
</script>

<template>
  <div class="assistant-markdown" v-html="html" />
</template>
