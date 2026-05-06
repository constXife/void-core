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

export { marked };
