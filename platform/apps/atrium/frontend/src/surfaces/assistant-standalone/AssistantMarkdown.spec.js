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
  document.body.innerHTML = "";
});

describe("AssistantMarkdown", () => {
  it("copies fenced code block content from the inline copy button", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });

    const wrapper = mount(AssistantMarkdown, {
      props: {
        content: "```sh\nsudo apt update\nsudo apt install openocd\n```",
        copyCodeLabel: "Копировать",
        copiedCodeLabel: "Скопировано"
      }
    });

    await flushPromises();
    const button = wrapper.get(".assistant-markdown__code-copy");
    expect(button.text()).toBe("Копировать");

    await button.trigger("click");

    expect(writeText).toHaveBeenCalledWith("sudo apt update\nsudo apt install openocd");
    expect(button.text()).toBe("Скопировано");
  });

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
        flowchart: {
          htmlLabels: false
        },
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

  it("keeps Mermaid node labels visible after svg sanitization", async () => {
    mermaidRender.mockResolvedValueOnce({
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg">
          <g class="node">
            <rect width="120" height="40"></rect>
            <g class="label">
              <foreignObject x="-60" y="-20" width="120" height="40">
                <div xmlns="http://www.w3.org/1999/xhtml">
                  <span class="nodeLabel"><p>Атмосфера</p></span>
                </div>
              </foreignObject>
            </g>
          </g>
        </svg>
      `
    });

    const wrapper = mount(AssistantMarkdown, {
      props: {
        content: "```mermaid\nflowchart TD\n  A[Атмосфера]\n```",
        renderDiagrams: true
      }
    });

    await flushPromises();

    expect(wrapper.html()).toContain("Атмосфера");
    expect(wrapper.html()).not.toContain("foreignObject");
  });

  it("opens Mermaid diagrams in a larger preview on click", async () => {
    const wrapper = mount(AssistantMarkdown, {
      props: {
        content: "```mermaid\nflowchart TD\n  A --> B\n```",
        renderDiagrams: true
      }
    });

    await flushPromises();
    await wrapper.find(".assistant-mermaid__canvas").trigger("click");

    expect(document.body.querySelector(".assistant-diagram-lightbox")).toBeTruthy();
    expect(document.body.querySelector(".assistant-diagram-lightbox svg")).toBeTruthy();
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
