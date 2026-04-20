import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({ breaks: true });

export function sanitizeHtml(html) {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true }
  });
}

export function renderMarkdown(markdown) {
  if (!markdown) return "";
  return sanitizeHtml(marked.parse(markdown));
}

export { marked };
