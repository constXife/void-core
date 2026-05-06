import { describe, expect, it } from "vitest";
import {
  normalizeMermaidSvgLabels,
  renderMarkdown,
  sanitizeHtml,
  sanitizeSvg
} from "./atrium-markdown.js";

describe("atrium markdown sanitization", () => {
  it("escapes raw html in rendered markdown", () => {
    expect(renderMarkdown("hello<script>alert('xss')</script>world")).toBe(
      "<p>hello&lt;script&gt;alert('xss')&lt;/script&gt;world</p>\n"
    );
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

  it("leaves mermaid fences as code unless diagrams are explicitly enabled", () => {
    const html = renderMarkdown("```mermaid\nflowchart TD\n  A --> B\n```");
    expect(html).toContain("<pre><code class=\"language-mermaid\">");
    expect(html).not.toContain("data-assistant-mermaid");
  });

  it("renders assistant mermaid fences as explicit diagram placeholders", () => {
    const html = renderMarkdown("```mermaid\nflowchart TD\n  A --> B\n```", {
      renderDiagrams: true
    });
    expect(html).toContain("data-assistant-mermaid=\"true\"");
    expect(html).toContain("assistant-mermaid__source");
    expect(html).toContain("flowchart TD");
  });

  it("wraps markdown tables in a horizontal scroll container", () => {
    const html = renderMarkdown("| Вещество | Роль |\n| --- | --- |\n| CO₂ | Фотосинтез |");
    expect(html).toContain("assistant-markdown__table-scroll");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>CO₂</td>");
  });

  it("sanitizes rendered svg fragments", () => {
    const svg = sanitizeSvg('<svg><script>alert(1)</script><g onclick="x()"></g></svg>');
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<script");
    expect(svg).not.toContain("onclick");
  });

  it("converts Mermaid foreignObject labels to plain svg text", () => {
    const svg = normalizeMermaidSvgLabels(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <g class="label">
          <foreignObject x="-40" y="-12" width="80" height="24">
            <div xmlns="http://www.w3.org/1999/xhtml">
              <span class="nodeLabel"><p>Атмосфера</p></span>
            </div>
          </foreignObject>
        </g>
      </svg>
    `);
    expect(svg).not.toContain("foreignObject");
    expect(svg).toContain("class=\"nodeLabel\"");
    expect(svg).toContain("Атмосфера");
    expect(sanitizeSvg(svg)).toContain("Атмосфера");
  });

  it("keeps Mermaid node labels when html nodes are emitted inside label groups", () => {
    const svg = normalizeMermaidSvgLabels(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <g class="node">
          <rect width="120" height="40"></rect>
          <g class="label" transform="translate(60, 20)">
            <span class="nodeLabel"><p>Растения</p></span>
          </g>
        </g>
      </svg>
    `);
    expect(svg).toContain("<text");
    expect(svg).toContain("class=\"nodeLabel\"");
    expect(svg).toContain("Растения");
    expect(sanitizeSvg(svg)).toContain("Растения");
  });
});
