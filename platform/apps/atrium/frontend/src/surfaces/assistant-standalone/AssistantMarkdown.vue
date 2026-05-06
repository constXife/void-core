<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { renderMarkdown, sanitizeSvg } from "../../lib/atrium-markdown.js";

const props = defineProps({
  content: {
    type: String,
    default: ""
  },
  renderDiagrams: {
    type: Boolean,
    default: false
  }
});

let renderCounter = 0;
let mermaidRuntime = null;
const rootRef = ref(null);

const html = computed(() => {
  const trimmed = String(props.content || "").trim();
  if (!trimmed) return "";
  return renderMarkdown(trimmed, { renderDiagrams: props.renderDiagrams });
});

watch(
  html,
  async () => {
    await renderMermaidDiagrams();
  },
  { flush: "post", immediate: true }
);

async function renderMermaidDiagrams() {
  if (!props.renderDiagrams) return;
  await nextTick();
  const nodes = Array.from(rootRef.value?.querySelectorAll("[data-assistant-mermaid]") || []);
  if (nodes.length === 0) return;

  let mermaid;
  try {
    mermaid = await loadMermaidRuntime();
  } catch (error) {
    markDiagramRuntimeError(nodes, error);
    return;
  }

  for (const node of nodes) {
    await renderMermaidNode(mermaid, node);
  }
}

async function loadMermaidRuntime() {
  if (mermaidRuntime) return mermaidRuntime;
  const module = await import("mermaid");
  mermaidRuntime = module.default || module;
  mermaidRuntime.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base"
  });
  return mermaidRuntime;
}

async function renderMermaidNode(mermaid, node) {
  if (node.dataset.assistantMermaidRendered === "true") return;
  const source = node.querySelector(".assistant-mermaid__source code")?.textContent || "";
  const canvas = node.querySelector(".assistant-mermaid__canvas");
  if (!source.trim() || !canvas) return;

  try {
    const renderId = `assistant-mermaid-${Date.now()}-${renderCounter}`;
    renderCounter += 1;
    const result = await mermaid.render(renderId, source);
    canvas.innerHTML = sanitizeSvg(result.svg || "");
    if (typeof result.bindFunctions === "function") {
      result.bindFunctions(canvas);
    }
    node.classList.add("assistant-mermaid--rendered");
    node.dataset.assistantMermaidRendered = "true";
  } catch (error) {
    markDiagramError(node, error);
  }
}

function markDiagramRuntimeError(nodes, error) {
  for (const node of nodes) {
    markDiagramError(node, error);
  }
}

function markDiagramError(node, error) {
  node.classList.add("assistant-mermaid--error");
  node.dataset.assistantMermaidRendered = "true";
  const canvas = node.querySelector(".assistant-mermaid__canvas");
  if (!canvas) return;
  const errorLine = document.createElement("p");
  errorLine.className = "assistant-mermaid__error";
  errorLine.textContent = `Diagram render failed: ${String(error?.message || error || "unknown error")}`;
  canvas.replaceChildren(errorLine);
}
</script>

<template>
  <div ref="rootRef" class="assistant-markdown" v-html="html" />
</template>
