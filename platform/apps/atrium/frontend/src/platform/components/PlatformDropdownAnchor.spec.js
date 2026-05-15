import { mount } from "@vue/test-utils";
import { defineComponent, nextTick, ref } from "vue";
import { describe, expect, it } from "vitest";
import PlatformDropdownAnchor from "./PlatformDropdownAnchor.vue";

const Host = defineComponent({
  components: { PlatformDropdownAnchor },
  setup() {
    const firstOpen = ref(false);
    const secondOpen = ref(false);
    return { firstOpen, secondOpen };
  },
  template: `
    <PlatformDropdownAnchor v-model:open="firstOpen">
      <template #trigger="{ toggle }">
        <button class="first-trigger" type="button" @click.stop="toggle">First</button>
      </template>
      <template #dropdown>
        <div class="first-panel">First panel</div>
      </template>
    </PlatformDropdownAnchor>
    <PlatformDropdownAnchor v-model:open="secondOpen">
      <template #trigger="{ toggle }">
        <button class="second-trigger" type="button" @click.stop="toggle">Second</button>
      </template>
      <template #dropdown>
        <div class="second-panel">Second panel</div>
      </template>
    </PlatformDropdownAnchor>
  `
});

describe("PlatformDropdownAnchor", () => {
  it("closes other open dropdown anchors when one opens", async () => {
    const wrapper = mount(Host);

    await wrapper.get(".first-trigger").trigger("click");
    await nextTick();

    expect(wrapper.find(".first-panel").exists()).toBe(true);
    expect(wrapper.find(".second-panel").exists()).toBe(false);

    await wrapper.get(".second-trigger").trigger("click");
    await nextTick();

    expect(wrapper.vm.firstOpen).toBe(false);
    expect(wrapper.vm.secondOpen).toBe(true);
    expect(wrapper.find(".second-panel").exists()).toBe(true);
  });
});
