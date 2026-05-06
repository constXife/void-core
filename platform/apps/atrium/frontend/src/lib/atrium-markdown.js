import DOMPurify from "dompurify";
import { Renderer, marked } from "marked";

const MARKDOWN_OPTIONS = {
  breaks: true,
  gfm: true
};

const MERMAID_LANGUAGE = "mermaid";

export function sanitizeHtml(html) {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true }
  });
}

export function sanitizeSvg(svg) {
  if (!svg) return "";
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true }
  });
}

export function normalizeMermaidSvgLabels(svg) {
  if (!svg || typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") {
    return svg || "";
  }
  const parser = new DOMParser();
  const document = parser.parseFromString(svg, "image/svg+xml");
  if (document.querySelector("parsererror")) return svg;

  for (const foreignObject of Array.from(document.querySelectorAll("foreignObject"))) {
    const label = foreignObject.textContent?.replace(/\s+/g, " ").trim();
    if (!label) {
      foreignObject.remove();
      continue;
    }
    foreignObject.replaceWith(createSvgTextLabel(document, foreignObject, label));
  }

  for (const labelGroup of Array.from(document.querySelectorAll(".node .label"))) {
    if (labelGroup.querySelector("text")) continue;
    const label = labelGroup.textContent?.replace(/\s+/g, " ").trim();
    if (!label) continue;
    labelGroup.replaceChildren(createCenteredSvgTextLabel(document, label));
  }

  return new XMLSerializer().serializeToString(document.documentElement);
}

export function renderMarkdown(markdown, options = {}) {
  if (!markdown) return "";
  return sanitizeHtml(marked.parse(markdown, {
    ...MARKDOWN_OPTIONS,
    renderer: createMarkdownRenderer(options)
  }));
}

function createMarkdownRenderer(options) {
  const renderer = new Renderer();
  const renderDiagrams = options.renderDiagrams === true;
  const renderTable = renderer.table.bind(renderer);

  renderer.html = (token) => escapeHtml(token.text || token.raw || "");
  renderer.table = (token) => (
    `<div class="assistant-markdown__table-scroll">${renderTable(token)}</div>`
  );
  renderer.code = (token) => {
    const language = normalizeLanguage(token.lang);
    const code = String(token.text || "");
    if (renderDiagrams && language === MERMAID_LANGUAGE) {
      return [
        '<div class="assistant-mermaid" data-assistant-mermaid="true">',
        '<div class="assistant-mermaid__canvas" aria-hidden="true"></div>',
        '<pre class="assistant-mermaid__source"><code>',
        escapeHtml(code),
        "</code></pre>",
        "</div>"
      ].join("");
    }
    return [
      "<pre><code",
      language ? ` class="language-${escapeAttribute(language)}"` : "",
      ">",
      escapeHtml(code),
      "</code></pre>\n"
    ].join("");
  };

  return renderer;
}

function normalizeLanguage(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)[0];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function createSvgTextLabel(document, foreignObject, label) {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const text = document.createElementNS(svgNamespace, "text");
  const className = foreignObject.querySelector("[class]")?.getAttribute("class") || "nodeLabel";
  const x = readSvgNumber(foreignObject, "x");
  const y = readSvgNumber(foreignObject, "y");
  const width = readSvgNumber(foreignObject, "width");
  const height = readSvgNumber(foreignObject, "height");
  text.setAttribute("class", className);
  text.setAttribute("x", String(x + width / 2));
  text.setAttribute("y", String(y + height / 2));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");
  text.textContent = label;
  return text;
}

function createCenteredSvgTextLabel(document, label) {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const text = document.createElementNS(svgNamespace, "text");
  text.setAttribute("class", "nodeLabel");
  text.setAttribute("x", "0");
  text.setAttribute("y", "0");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");
  text.textContent = label;
  return text;
}

function readSvgNumber(element, attribute) {
  const value = Number.parseFloat(element.getAttribute(attribute) || "0");
  return Number.isFinite(value) ? value : 0;
}

export { marked };
