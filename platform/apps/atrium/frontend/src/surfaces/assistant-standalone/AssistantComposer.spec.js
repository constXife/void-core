import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantComposer from "./AssistantComposer.vue";

const t = (key) => key;

function mountComposer(modelValue = "") {
  return mount(AssistantComposer, {
    props: { modelValue, t },
    global: { stubs: { AssistantModelPicker: true } }
  });
}

describe("AssistantComposer paste trimming", () => {
  it("trims leading/trailing whitespace from pasted text", async () => {
    const wrapper = mountComposer("");
    await wrapper.find("textarea").trigger("paste", {
      clipboardData: { getData: () => "\n\n  привет, мир  \n\n" }
    });

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted.at(-1)[0]).toBe("привет, мир");
  });

  it("inserts trimmed paste at the caret without dropping existing text", async () => {
    const wrapper = mountComposer("abc");
    const textarea = wrapper.find("textarea");
    // Каретка в конце существующего текста.
    textarea.element.setSelectionRange(3, 3);
    await textarea.trigger("paste", {
      clipboardData: { getData: () => "  X\n" }
    });

    expect(wrapper.emitted("update:modelValue").at(-1)[0]).toBe("abcX");
  });

  it("leaves clean pastes to the default browser behavior", async () => {
    const wrapper = mountComposer("");
    await wrapper.find("textarea").trigger("paste", {
      clipboardData: { getData: () => "уже чисто" }
    });

    // Нечего чистить → не перехватываем, update:modelValue не эмитим из onPaste.
    expect(wrapper.emitted("update:modelValue")).toBeFalsy();
  });
});
