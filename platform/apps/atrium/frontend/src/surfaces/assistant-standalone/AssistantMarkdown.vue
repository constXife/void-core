<script setup>
import { X } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  normalizeMermaidSvgLabels,
  renderMarkdown,
  sanitizeSvg
} from "../../lib/atrium-markdown.js";

const props = defineProps({
  content: {
    type: String,
    default: ""
  },
  copyCodeLabel: {
    type: String,
    default: "Copy code"
  },
  copiedCodeLabel: {
    type: String,
    default: "Copied"
  },
  renderDiagrams: {
    type: Boolean,
    default: false
  }
});

let renderCounter = 0;
let mermaidRuntime = null;
const rootRef = ref(null);
const zoomedDiagramSvg = ref("");
const codeCopyResetTimers = new WeakMap();
let themeObserver = null;

const html = computed(() => {
  const trimmed = String(props.content || "").trim();
  if (!trimmed) return "";
  return renderMarkdown(trimmed, { renderDiagrams: props.renderDiagrams });
});

watch(
  html,
  async () => {
    await installCodeCopyButtons();
    await renderMermaidDiagrams();
  },
  { flush: "post", immediate: true }
);

onMounted(() => {
  window.addEventListener("keydown", handleGlobalKeydown);
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
  window.removeEventListener("keydown", handleGlobalKeydown);
  themeObserver?.disconnect();
  themeObserver = null;
});

async function installCodeCopyButtons() {
  await nextTick();
  const buttons = Array.from(rootRef.value?.querySelectorAll("[data-assistant-code-copy]") || []);
  for (const button of buttons) {
    button.textContent = props.copyCodeLabel;
    button.setAttribute("aria-label", props.copyCodeLabel);
    button.setAttribute("title", props.copyCodeLabel);
    if (button.dataset.assistantCodeCopyInstalled === "true") continue;
    button.dataset.assistantCodeCopyInstalled = "true";
    button.addEventListener("click", () => copyCodeBlock(button));
  }
}

async function copyCodeBlock(button) {
  const code = button.closest("[data-assistant-code-block]")?.querySelector("code");
  const text = code?.textContent || "";
  if (!text || !navigator?.clipboard?.writeText) return;

  try {
    await navigator.clipboard.writeText(text);
    markCodeCopySuccess(button);
  } catch (error) {
    console.error("void-assistant: copy code block failed", error);
  }
}

function markCodeCopySuccess(button) {
  button.textContent = props.copiedCodeLabel;
  button.setAttribute("aria-label", props.copiedCodeLabel);
  button.setAttribute("title", props.copiedCodeLabel);

  const previousTimer = codeCopyResetTimers.get(button);
  if (previousTimer) clearTimeout(previousTimer);
  const timer = window.setTimeout(() => {
    button.textContent = props.copyCodeLabel;
    button.setAttribute("aria-label", props.copyCodeLabel);
    button.setAttribute("title", props.copyCodeLabel);
    codeCopyResetTimers.delete(button);
  }, 1200);
  codeCopyResetTimers.set(button, timer);
}

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
    canvas.innerHTML = sanitizeSvg(normalizeMermaidSvgLabels(result.svg || ""));
    installDiagramZoom(node, canvas);
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

function installDiagramZoom(node, canvas) {
  if (!canvas.innerHTML.trim()) return;
  if (canvas.dataset.assistantMermaidZoomInstalled === "true") return;
  const open = () => {
    zoomedDiagramSvg.value = canvas.innerHTML;
  };
  canvas.dataset.assistantMermaidZoomInstalled = "true";
  node.classList.add("assistant-mermaid--zoomable");
  canvas.setAttribute("role", "button");
  canvas.setAttribute("tabindex", "0");
  canvas.setAttribute("aria-label", "Open diagram preview");
  canvas.addEventListener("click", open);
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
}

function closeDiagramZoom() {
  zoomedDiagramSvg.value = "";
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape" && zoomedDiagramSvg.value) {
    closeDiagramZoom();
  }
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
    flowchart: {
      htmlLabels: false
    },
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
  <Teleport to="body">
    <div
      v-if="zoomedDiagramSvg"
      class="assistant-diagram-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Diagram preview"
      @click.self="closeDiagramZoom"
    >
      <div class="assistant-diagram-lightbox__panel">
        <button
          type="button"
          class="assistant-diagram-lightbox__close"
          aria-label="Close diagram preview"
          @click="closeDiagramZoom"
        >
          <X :size="18" />
        </button>
        <div class="assistant-diagram-lightbox__canvas" v-html="zoomedDiagramSvg" />
      </div>
    </div>
  </Teleport>
</template>
