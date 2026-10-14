import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { useAssistantStore } from "./assistant.js";
import AssistantModelsStatus from "../surfaces/assistant-standalone/AssistantModelsStatus.vue";

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status, headers: { "Content-Type": "application/json" }
});
const catalog = () => json({ enabled: true, default_target_id: "p:model",
  providers: [{ id: "p" }], targets: [{ id: "p:model", model: "model" }] });

beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("загрузка моделей Assistant", () => {
  it.each([401, 403, 404, 500])("показывает ошибку HTTP %i, а не отключение", async (status) => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "unknown_assistant_target", message: "Unknown target" }, status)));
    const store = useAssistantStore();
    await store.loadModels();
    expect(store.modelsState).toBe("error");
    expect(store.modelsError).toContain("Unknown target");
    expect(store.enabled).toBe(false);
    expect(store.visible).toBe(true);
  });

  it("считает отключением только явный ответ сервера", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "void_assistant_disabled" }, 404)));
    const store = useAssistantStore();
    await store.loadModels();
    expect(store.modelsState).toBe("disabled");
    expect(store.modelsError).toBe("");
  });

  it("не подменяет недоступную default-модель первой из списка", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ enabled: true, default_target_id: "removed",
      providers: [], targets: [{ id: "available" }] })));
    const store = useAssistantStore();
    await store.loadModels();
    expect(store.modelsState).toBe("error");
    expect(store.selectedTargetId).toBe("");
  });

  it("сохраняет исходную сетевую ошибку в диагностике", async () => {
    const cause = new TypeError("Connection lost");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(cause));
    await useAssistantStore().loadModels();
    expect(console.error).toHaveBeenCalledWith("void-assistant: loadModels failed", cause);
  });

  it("повторяет загрузку кнопкой, блокирует повторный клик и сохраняет черновик", async () => {
    let finish;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ message: "Unavailable" }, 503))
      .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })));
    const store = useAssistantStore();
    store.draft = "Сохранённый черновик";
    await store.loadModels();
    const Host = defineComponent({ components: { AssistantModelsStatus },
      setup: () => ({ store, t: (key) => key }),
      template: '<AssistantModelsStatus :state="store.modelsState" :error="store.modelsError" :t="t" @retry="store.loadModels()" />' });
    const wrapper = mount(Host);
    expect(wrapper.get('[role="alert"]').text()).toContain("assistant.models.loadFailed");
    await wrapper.get("button").trigger("click");
    expect(wrapper.get("button").attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("assistant.models.retrying");
    await store.loadModels();
    expect(fetch).toHaveBeenCalledTimes(2);
    finish(catalog());
    await flushPromises();
    expect(store.modelsState).toBe("ready");
    expect(store.selectedTargetId).toBe("p:model");
    expect(store.draft).toBe("Сохранённый черновик");
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
