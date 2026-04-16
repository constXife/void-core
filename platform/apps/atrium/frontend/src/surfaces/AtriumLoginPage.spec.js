import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AtriumLoginPage from "./AtriumLoginPage.vue";

const messages = {
  "auth.title": "Sign in to Atrium",
  "auth.subtitle": "Sign-in is available only when Atrium authentication is configured.",
  "auth.devQuick": "Dev quick login",
  "auth.sso": "Sign in with SSO",
  "auth.ssoHint": "Continue through the configured OIDC provider.",
  "auth.unavailable": "Sign-in is not configured for this Atrium.",
  "auth.unavailableHint": "OIDC is not configured and local sign-in is unavailable."
};

function t(key, params = {}) {
  if (key === "auth.signInAs") {
    return `Sign in as ${params.email}`;
  }
  return messages[key] || key;
}

describe("AtriumLoginPage", () => {
  it("renders the main login options for configured auth", () => {
    const wrapper = mount(AtriumLoginPage, {
      props: {
        authModes: { oidc: true, local: false },
        loginUrl: "/auth/login?next=%2F",
        showDevLogin: false,
        devLoginEmails: [],
        loginBusy: false,
        loginError: "",
        hasLoginOption: true,
        t
      }
    });

    const ssoLink = wrapper.get("a.atrium-login-page__primary");
    expect(ssoLink.attributes("href")).toBe("/auth/login?next=%2F");
    expect(ssoLink.text()).toContain("Sign in with SSO");
    expect(wrapper.text()).toContain("Continue through the configured OIDC provider.");
    expect(wrapper.text()).not.toContain("OIDC is not configured and local sign-in is unavailable.");
  });

  it("emits dev login with the selected email", async () => {
    const wrapper = mount(AtriumLoginPage, {
      props: {
        authModes: { oidc: false, local: true },
        loginUrl: "/auth/login",
        showDevLogin: true,
        devLoginEmails: ["admin@example.com", "user@example.com"],
        loginBusy: false,
        loginError: "",
        hasLoginOption: true,
        t
      }
    });

    const buttons = wrapper.findAll(".atrium-login-page__dev-actions button");
    expect(buttons).toHaveLength(2);

    await buttons[1].trigger("click");

    expect(wrapper.emitted("dev-login")).toEqual([["user@example.com"]]);
  });
});
