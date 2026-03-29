import { ref } from "vue";
import { shallowMount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  appStore: null,
  authStore: null
}));

vi.mock("pinia", async () => {
  const actual = await vi.importActual("pinia");
  return {
    ...actual,
    storeToRefs: (store) => store
  };
});

vi.mock("../stores/atrium-app.js", () => ({
  useAtriumAppStore: () => mockState.appStore
}));

vi.mock("../stores/auth.js", () => ({
  useAuthStore: () => mockState.authStore
}));

import AtriumHomePage from "./AtriumHomePage.vue";

function createAppStore() {
  return {
    actualRole: ref("guest"),
    effectiveRole: ref("guest"),
    guestFocusSpace: ref({ id: "public" }),
    loading: ref(false),
    loginPageUrl: ref("/login"),
    me: ref(null),
    performanceMode: ref("normal"),
    spaces: ref([]),
    stageRef: ref(null),
    updateIndex: vi.fn(),
    t: (key) => key,
    spacePublicTitle: vi.fn(() => "Public Atrium"),
    spaceDescription: vi.fn(() => "Public spaces available before sign-in."),
    spacePublicHelp: vi.fn(() => "Ask the operator if you need access.")
  };
}

function mountPage() {
  return shallowMount(AtriumHomePage, {
    global: {
      stubs: {
        AtriumEntryState: {
          props: ["mode", "loginPageUrl", "performanceMode", "effectiveRole", "actualRole"],
          template:
            '<div data-test="entry-state" :data-mode="mode" :data-login-page-url="loginPageUrl" :data-effective-role="effectiveRole" :data-actual-role="actualRole"></div>'
        },
        AtriumPublicIntro: {
          props: ["title", "description", "helpText", "trustNote", "spacesCount", "loginPageUrl"],
          template:
            '<div data-test="public-intro" :data-title="title" :data-description="description" :data-spaces-count="String(spacesCount)" :data-login-page-url="loginPageUrl"></div>'
        },
        AtriumStagePanel: {
          props: ["space", "sidx"],
          template: '<div data-test="stage-panel" :data-space-id="space.id" :data-space-index="String(sidx)"></div>'
        }
      }
    }
  });
}

describe("AtriumHomePage", () => {
  beforeEach(() => {
    mockState.appStore = createAppStore();
    mockState.authStore = {
      logout: vi.fn()
    };
  });

  it("shows the loading skeleton while workspace bootstrap is running", () => {
    mockState.appStore.loading.value = true;

    const wrapper = mountPage();

    expect(wrapper.find(".spaces-loading").exists()).toBe(true);
    expect(wrapper.find('[data-test="entry-state"]').exists()).toBe(false);
  });

  it("renders the guest empty state when no session and no public spaces are available", () => {
    const wrapper = mountPage();
    const entryState = wrapper.get('[data-test="entry-state"]');

    expect(entryState.attributes("data-mode")).toBe("guest");
    expect(entryState.attributes("data-login-page-url")).toBe("/login");
  });

  it("renders the no-access state for authenticated users without assigned spaces", () => {
    mockState.appStore.me.value = { email: "user@example.com" };
    mockState.appStore.actualRole.value = "user";
    mockState.appStore.effectiveRole.value = "user";

    const wrapper = mountPage();
    const entryState = wrapper.get('[data-test="entry-state"]');

    expect(entryState.attributes("data-mode")).toBe("no-access");
    expect(entryState.attributes("data-effective-role")).toBe("user");
    expect(entryState.attributes("data-actual-role")).toBe("user");
  });

  it("renders the public intro and stage panels when guest spaces are available", () => {
    mockState.appStore.spaces.value = [
      { id: "home", title: "Home" },
      { id: "media", title: "Media" }
    ];

    const wrapper = mountPage();
    const publicIntro = wrapper.get('[data-test="public-intro"]');
    const stagePanels = wrapper.findAll('[data-test="stage-panel"]');

    expect(publicIntro.attributes("data-title")).toBe("Public Atrium");
    expect(publicIntro.attributes("data-description")).toBe("Public spaces available before sign-in.");
    expect(publicIntro.attributes("data-spaces-count")).toBe("2");
    expect(stagePanels).toHaveLength(2);
    expect(stagePanels[0].attributes("data-space-id")).toBe("home");
    expect(stagePanels[1].attributes("data-space-id")).toBe("media");
  });
});
