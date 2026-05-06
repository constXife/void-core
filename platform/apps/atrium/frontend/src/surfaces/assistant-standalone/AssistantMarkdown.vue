<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
let themeObserver = null;

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

onMounted(() => {
  if (typeof MutationObserver === "undefined") return;
  themeObserver = new MutationObserver(() => {
    rerenderMermaidDiagrams();
  });
  themeObserver.observe(document.documentElement, {
    attributeFilter: ["data-theme", "style"],
    attributes: true
  });
});

onBeforeUnmount(() => {
  themeObserver?.disconnect();
  themeObserver = null;
});

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
  mermaidRuntime.initialize(createMermaidConfig());
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
    mermaid.initialize(createMermaidConfig());
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

async function rerenderMermaidDiagrams() {
  await nextTick();
  const nodes = Array.from(rootRef.value?.querySelectorAll("[data-assistant-mermaid]") || []);
  for (const node of nodes) {
    delete node.dataset.assistantMermaidRendered;
    node.classList.remove("assistant-mermaid--rendered", "assistant-mermaid--error");
    node.querySelector(".assistant-mermaid__canvas")?.replaceChildren();
  }
  await renderMermaidDiagrams();
}

function createMermaidConfig() {
  const surfaceBase = readCssColor("--surface-base", "#0d1117");
  const surfaceRaised = readCssColor("--surface-raised", "#161b22");
  const surfaceOverlay = readCssColor("--surface-overlay", "#21262d");
  const inkPrimary = readCssColor("--ink-primary", "#f0f6fc");
  const inkSecondary = readCssColor("--ink-secondary", "#8b949e");
  const borderDefault = readCssColor("--border-default", "#30363d");
  const accentPrimary = readCssColor("--accent-primary", "#58a6ff");
  const accentPurple = readCssColor("--accent-purple", "#a371f7");

  return {
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: {
      background: surfaceBase,
      mainBkg: surfaceRaised,
      primaryColor: surfaceRaised,
      primaryTextColor: inkPrimary,
      primaryBorderColor: accentPurple,
      secondaryColor: surfaceOverlay,
      secondaryTextColor: inkPrimary,
      secondaryBorderColor: borderDefault,
      tertiaryColor: surfaceBase,
      tertiaryTextColor: inkPrimary,
      tertiaryBorderColor: borderDefault,
      lineColor: inkSecondary,
      textColor: inkPrimary,
      nodeTextColor: inkPrimary,
      edgeLabelBackground: surfaceOverlay,
      clusterBkg: surfaceBase,
      clusterBorder: borderDefault,
      noteBkgColor: surfaceOverlay,
      noteTextColor: inkPrimary,
      noteBorderColor: borderDefault,
      actorBkg: surfaceRaised,
      actorTextColor: inkPrimary,
      actorBorder: accentPrimary,
      signalColor: inkSecondary,
      signalTextColor: inkPrimary,
      labelBoxBkgColor: surfaceOverlay,
      labelBoxBorderColor: borderDefault,
      labelTextColor: inkPrimary,
      loopTextColor: inkPrimary,
      activationBkgColor: surfaceOverlay,
      activationBorderColor: accentPrimary,
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }
  };
}

function readCssColor(token, fallback) {
  if (typeof document === "undefined") return fallback;
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  probe.style.position = "absolute";
  probe.style.pointerEvents = "none";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color || fallback;
}
</script>

<template>
  <div ref="rootRef" class="assistant-markdown" v-html="html" />
</template>
