import { describe, expect, it } from "vitest";
import { renderMarkdown, sanitizeHtml } from "./atrium-markdown.js";

describe("atrium markdown sanitization", () => {
  it("strips script tags from rendered markdown", () => {
    expect(renderMarkdown("hello<script>alert('xss')</script>world")).toBe("<p>helloworld</p>\n");
  });

  it("removes dangerous javascript hrefs", () => {
    const html = renderMarkdown("[click](javascript:alert('xss'))");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("<a>click</a>");
  });

  it("sanitizes raw html fragments", () => {
    const html = sanitizeHtml('<img src="x" onerror="alert(1)"><p>ok</p>');
    expect(html).toContain("<img src=\"x\">");
    expect(html).not.toContain("onerror");
    expect(html).toContain("<p>ok</p>");
  });
});
