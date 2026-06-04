import { shallowMount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SurfaceRenderer from "./SurfaceRenderer.vue";
import SurfaceBlock from "./SurfaceBlock.vue";

const t = (key) => key;

describe("SurfaceRenderer", () => {
  it("lays blocks out by active regions in REGION_ORDER, collapsing empty regions", () => {
    const pageSpec = {
      blocks: [
        { id: "a", block: "metric.kpi", region: "header" },
        { id: "b", block: "data.table", region: "right" },
        { id: "c", block: "data.tree", region: "left" }
      ]
    };
    const wrapper = shallowMount(SurfaceRenderer, {
      props: { pageSpec, slotData: {}, bridgeArtifacts: {}, t }
    });
    const regions = wrapper
      .findAll(".surface-render__region")
      .map((node) => node.attributes("data-region"));
    // header < left < right; footer отсутствует → схлопнут.
    expect(regions).toEqual(["header", "left", "right"]);
    expect(wrapper.findAllComponents(SurfaceBlock).length).toBe(3);
  });

  it("renders no regions for an empty/null pageSpec", () => {
    const wrapper = shallowMount(SurfaceRenderer, {
      props: { pageSpec: null, slotData: {}, bridgeArtifacts: {}, t }
    });
    expect(wrapper.findAll(".surface-render__region").length).toBe(0);
    expect(wrapper.findAllComponents(SurfaceBlock).length).toBe(0);
  });

  it("passes slotData and bridgeArtifacts down to each SurfaceBlock", () => {
    const pageSpec = { blocks: [{ id: "a", block: "metric.kpi", region: "header" }] };
    const slotData = { s1: { x: 1 } };
    const bridgeArtifacts = { a: { artifactId: "z" } };
    const wrapper = shallowMount(SurfaceRenderer, {
      props: { pageSpec, slotData, bridgeArtifacts, t }
    });
    const block = wrapper.findComponent(SurfaceBlock);
    expect(block.props("slotData")).toEqual(slotData);
    expect(block.props("bridgeArtifacts")).toEqual(bridgeArtifacts);
  });
});
