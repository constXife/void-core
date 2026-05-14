import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AssistantCapabilitiesSidebarFilters from "./AssistantCapabilitiesSidebarFilters.vue";

const messages = {
  "assistant.capabilities.filterSummary": "{count} skills в каталоге",
  "assistant.filters.all": "Все",
  "assistant.filters.stage": "Stage",
  "assistant.filters.stageValue": "Stage {value}",
  "assistant.filters.domain": "Domain",
  "assistant.filters.output": "Output",
  "assistant.filters.trustClass": "Trust class"
};

const t = (key, vars = {}) => {
  let value = messages[key] || key;
  for (const [name, replacement] of Object.entries(vars)) {
    value = value.replace(`{${name}}`, String(replacement));
  }
  return value;
};

const baseSkills = [
  {
    id: "digest_hackernews",
    stage: 1,
    domain: "web",
    output_kind: "digest",
    trust_class: "untrusted_web"
  },
  {
    id: "digest_github",
    stage: 1,
    domain: "web",
    output_kind: "digest",
    trust_class: "untrusted_web"
  }
];

describe("AssistantCapabilitiesSidebarFilters", () => {
  it("collapses non-discriminating filters for a tiny catalog", () => {
    const wrapper = mount(AssistantCapabilitiesSidebarFilters, {
      props: {
        skills: baseSkills,
        filters: { stage: null, domain: null, output_kind: null, trust_class: null },
        availableTrustClasses: new Set(["untrusted_web"]),
        t
      }
    });

    expect(wrapper.text()).toContain("2 skills в каталоге");
    expect(wrapper.text()).not.toContain("Stage");
    expect(wrapper.text()).not.toContain("Domain");
    expect(wrapper.text()).not.toContain("Output");
    expect(wrapper.text()).not.toContain("Trust class");
  });

  it("shows only filters that can actually narrow the catalog", () => {
    const wrapper = mount(AssistantCapabilitiesSidebarFilters, {
      props: {
        skills: [
          ...baseSkills,
          {
            id: "inventory_summary",
            stage: 1,
            domain: "inventory",
            output_kind: "digest",
            trust_class: "trusted_graph"
          }
        ],
        filters: { stage: null, domain: null, output_kind: null, trust_class: null },
        availableTrustClasses: new Set(["untrusted_web", "trusted_graph"]),
        t
      }
    });

    expect(wrapper.text()).not.toContain("Stage");
    expect(wrapper.text()).toContain("Domain");
    expect(wrapper.text()).not.toContain("Output");
    expect(wrapper.text()).toContain("Trust class");
  });
});
