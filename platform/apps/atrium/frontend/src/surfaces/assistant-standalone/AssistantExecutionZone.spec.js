import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantExecutionZone from "./AssistantExecutionZone.vue";

describe("AssistantExecutionZone", () => {
  it.each([["same-host", "internal"], ["private-network", "internal"], ["external", "external"], ["", "unknown"], ["future-zone", "unknown"]])(
    "renders the declared zone %s without treating missing metadata as local", (zone, expected) => {
      const wrapper = mount(AssistantExecutionZone, { props: { zone, t: (key) => key } });
      expect(wrapper.get('[role="img"]').attributes("aria-label")).toBe(`assistant.model.zone.${expected}`);
    }
  );
});
