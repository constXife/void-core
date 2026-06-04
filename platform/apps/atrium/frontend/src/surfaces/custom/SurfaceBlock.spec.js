import { shallowMount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SurfaceBlock from "./SurfaceBlock.vue";
import AssistantLatestArtifactBlock from "../artifact/AssistantLatestArtifactBlock.vue";
import MetricKpiBlock from "./blocks/MetricKpiBlock.vue";

const t = (key, vars = {}) => (vars.block ? `${key}:${vars.block}` : key);

describe("SurfaceBlock dispatch", () => {
  it("routes bridge block to AssistantLatestArtifactBlock with its resolved envelope", () => {
    const block = { id: "b1", block: "assistant.latest_artifact", region: "right", props: {} };
    const wrapper = shallowMount(SurfaceBlock, {
      props: { block, slotData: {}, bridgeArtifacts: { b1: { artifactId: "x" } }, t }
    });
    const bridge = wrapper.findComponent(AssistantLatestArtifactBlock);
    expect(bridge.exists()).toBe(true);
    expect(bridge.props("resolved")).toEqual({ artifactId: "x" });
  });

  it("routes a registered dataSlot block to its registry component with the slot dataset", () => {
    const block = { id: "b2", block: "metric.kpi", region: "header", props: { dataSlot: "s1" } };
    const dataset = { totalItems: 7 };
    const wrapper = shallowMount(SurfaceBlock, {
      props: { block, slotData: { s1: dataset }, bridgeArtifacts: {}, t }
    });
    const kpi = wrapper.findComponent(MetricKpiBlock);
    expect(kpi.exists()).toBe(true);
    expect(kpi.props("data")).toEqual(dataset);
  });

  it("renders the unknown fallback for an unregistered block", () => {
    const block = { id: "b3", block: "totally.unknown", region: "left", props: {} };
    const wrapper = shallowMount(SurfaceBlock, {
      props: { block, slotData: {}, bridgeArtifacts: {}, t }
    });
    const unknown = wrapper.find(".surface-block__unknown");
    expect(unknown.exists()).toBe(true);
    expect(unknown.text()).toContain("totally.unknown");
  });
});
