import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BlockRenderer from "./BlockRenderer.vue";

describe("BlockRenderer", () => {
  it("renders article cards with title, url, summary and metrics", () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        blocks: [
          {
            type: "article_card",
            title: "Переведенный заголовок",
            title_original: "Original title",
            url: "https://example.com/story",
            summary: "Короткое описание.",
            source_label: "Hacker News",
            metrics: [{ label: "баллов", value: "230" }]
          }
        ]
      }
    });

    const link = wrapper.get(".assistant-article-card__title");
    expect(link.text()).toBe("Переведенный заголовок");
    expect(link.attributes("href")).toBe("https://example.com/story");
    expect(wrapper.text()).toContain("Короткое описание.");
    expect(wrapper.text()).toContain("230 баллов");
  });

  it("renders section headers and link lists", () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        blocks: [
          { type: "section_header", text: "Digest", subtitle: "Today" },
          {
            type: "link_list",
            items: [{ label: "AGENTS.md", url: "https://example.com/agents", note: "rules" }]
          }
        ]
      }
    });

    expect(wrapper.get(".assistant-section-header").text()).toContain("Digest");
    const link = wrapper.get(".assistant-link-list a");
    expect(link.text()).toBe("AGENTS.md");
    expect(link.attributes("href")).toBe("https://example.com/agents");
    expect(wrapper.text()).toContain("rules");
  });
});
