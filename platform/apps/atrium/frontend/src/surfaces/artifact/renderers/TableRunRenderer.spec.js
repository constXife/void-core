import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TableRunRenderer from "./TableRunRenderer.vue";

const t = (key) => key;

describe("TableRunRenderer", () => {
  it("renders the full-layout table block from the envelope", () => {
    const wrapper = mount(TableRunRenderer, {
      props: {
        envelope: {
          schema: "table.v1",
          blocks: [
            {
              type: "table",
              title: "Инвентарь",
              subtitle: "предметов: 1",
              columns: [
                { key: "category", label: "Категория" },
                { key: "where", label: "Где" }
              ],
              rows: [
                {
                  label: "Кроссовки",
                  cells: [
                    { column: "category", value: "Гардероб" },
                    { column: "where", value: "Прихожая" }
                  ],
                  highlight: false
                }
              ],
              note: null
            }
          ]
        },
        t
      }
    });

    expect(wrapper.find(".skill-table").exists()).toBe(true);
    expect(wrapper.text()).toContain("Инвентарь");
    expect(wrapper.text()).toContain("Где");
    expect(wrapper.text()).toContain("Кроссовки");
    expect(wrapper.text()).toContain("Прихожая");
  });

  it("renders nothing when the envelope has no blocks", () => {
    const wrapper = mount(TableRunRenderer, {
      props: { envelope: { schema: "table.v1" }, t }
    });

    expect(wrapper.find(".skill-table").exists()).toBe(false);
  });
});
