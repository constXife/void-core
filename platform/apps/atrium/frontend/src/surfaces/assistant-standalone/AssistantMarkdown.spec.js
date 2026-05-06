import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import AssistantMarkdown from "./AssistantMarkdown.vue";

const { mermaidRender, mermaidInitialize } = vi.hoisted(() => ({
  mermaidInitialize: vi.fn(),
  mermaidRender: vi.fn(async () => ({
    svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>ok</text></svg>'
  }))
}));

vi.mock("mermaid", () => ({
  default: {
    initialize: mermaidInitialize,
    render: mermaidRender
  }
}));

afterEach(() => {
  mermaidInitialize.mockClear();
  mermaidRender.mockClear();
});

describe("AssistantMarkdown", () => {
  it("renders mermaid blocks only when diagram rendering is enabled", async () => {
    const wrapper = mount(AssistantMarkdown, {
      props: {
        content: "```mermaid\nflowchart TD\n  A --> B\n```",
        renderDiagrams: true
      }
    });

    await flushPromises();

    expect(mermaidRender).toHaveBeenCalledOnce();
    expect(mermaidInitialize).toHaveBeenCalledWith(
      expect.objectContaining({
        securityLevel: "strict",
        startOnLoad: false,
        theme: "base",
        themeVariables: expect.objectContaining({
          primaryTextColor: expect.any(String),
          primaryColor: expect.any(String),
          lineColor: expect.any(String)
        })
      })
    );
    expect(wrapper.find(".assistant-mermaid--rendered").exists()).toBe(true);
    expect(wrapper.find("svg").exists()).toBe(true);
  });

  it("keeps mermaid blocks as code when diagram rendering is disabled", async () => {
    const wrapper = mount(AssistantMarkdown, {
      props: {
        content: "```mermaid\nflowchart TD\n  A --> B\n```",
        renderDiagrams: false
      }
    });

    await flushPromises();

    expect(mermaidRender).not.toHaveBeenCalled();
    expect(wrapper.find(".assistant-mermaid").exists()).toBe(false);
    expect(wrapper.find("code.language-mermaid").exists()).toBe(true);
  });
});
