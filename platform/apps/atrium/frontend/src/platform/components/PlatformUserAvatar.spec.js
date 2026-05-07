import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PlatformUserAvatar from "./PlatformUserAvatar.vue";

describe("PlatformUserAvatar", () => {
  it("renders account initials through the shared account contract", () => {
    const wrapper = mount(PlatformUserAvatar, {
      props: {
        user: {
          authenticated: true,
          email: "first.last@example.com"
        }
      }
    });

    expect(wrapper.text()).toBe("FL");
  });

  it("renders account avatar images when provided", () => {
    const wrapper = mount(PlatformUserAvatar, {
      props: {
        user: {
          authenticated: true,
          email: "user@example.com",
          avatar_url: "https://example.com/avatar.png"
        }
      }
    });

    expect(wrapper.find("img").attributes("src")).toBe("https://example.com/avatar.png");
  });

  it("does not render for guest viewer state", () => {
    const wrapper = mount(PlatformUserAvatar, {
      props: {
        user: {
          authenticated: false,
          role: "guest",
          user_id: "guest"
        }
      }
    });

    expect(wrapper.find(".platform-user-avatar").exists()).toBe(false);
  });
});
