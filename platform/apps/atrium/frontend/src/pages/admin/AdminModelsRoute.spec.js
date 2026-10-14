import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { MESSAGES } from "../../atrium-config.js";
import AdminModelsRoute from "./AdminModelsRoute.vue";

const { fetchJSON } = vi.hoisted(() => ({ fetchJSON: vi.fn() }));
vi.mock("../../stores/atrium-app.js", () => ({
  useAtriumAppStore: () => ({ fetchJSON, t: (key) => MESSAGES.ru[key] || key })
}));
vi.mock("vue-router", () => ({ useRoute: () => ({ query: {} }) }));

const binding = (job, target, reasoning = "provider-default") => ({
  job_id: `assistant.${job}.v1`, element_id: "assistant", operation_id: job,
  target_id: target, reasoning_policy: reasoning, data_policy: "external-allowed", revision: 3
});
const chat = binding("chat", "p:chat");
const title = binding("title", "p:haiku", "disabled");
const targets = [
  { id: "p:chat", label: "Chat model", model: "chat", provider_label: "P", execution_zone: "external" },
  { id: "p:haiku", label: "Haiku 5.5", model: "haiku", provider_label: "P", execution_zone: "external" }
];
beforeEach(() => {
  vi.stubGlobal("CSS", { escape: (value) => value });
  fetchJSON.mockReset().mockResolvedValue({ model_job_bindings: [chat, title], targets });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("показывает отдельные настройки названий и сохраняет только выбранное назначение", async () => {
  const wrapper = mount(AdminModelsRoute);
  await flushPromises();
  const titleRow = wrapper.get('[data-model-job="assistant.title.v1"]');
  expect(titleRow.text()).toContain("Названия чатов");
  expect(titleRow.text()).toContain("Внутренние диалоги не отправляются внешней модели");
  const selects = titleRow.findAll("select");
  expect(selects[0].element.value).toBe("p:haiku");
  expect(selects[2].element.value).toBe("disabled");
  await selects[0].setValue("p:chat");
  fetchJSON.mockResolvedValueOnce({ binding: { ...title, target_id: "p:chat", revision: 4 } });
  await titleRow.get("button").trigger("click");
  await flushPromises();
  expect(fetchJSON).toHaveBeenLastCalledWith("/assistant/model-jobs/assistant.title.v1", {
    method: "PUT", body: JSON.stringify({ targetId: "p:chat", dataPolicy: "external-allowed",
      reasoningPolicy: "disabled", expectedRevision: 3 })
  });
  expect(titleRow.text()).toContain("Маршрутизация обновлена");
  expect(wrapper.get('[data-model-job="assistant.chat.v1"]').findAll("select")[0].element.value).toBe("p:chat");
  wrapper.unmount();
});
