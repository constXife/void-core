import { describe, expect, it } from "vitest";
import { hasResolvedRouteAccount } from "./index.js";

describe("assistant route account contract", () => {
  it("accepts an authenticated account with an identity", () => {
    expect(
      hasResolvedRouteAccount({
        me: {
          authenticated: true,
          email: "user@example.com",
          role: "user"
        },
        actualRole: "user"
      })
    ).toBe(true);
  });

  it("rejects missing users even when global auth is disabled", () => {
    expect(
      hasResolvedRouteAccount({
        me: null,
        authEnabled: false,
        actualRole: ""
      })
    ).toBe(false);
  });

  it("rejects guest viewer state for account-required routes", () => {
    expect(
      hasResolvedRouteAccount({
        me: {
          authenticated: false,
          email: "",
          role: "guest",
          user_id: "guest"
        },
        actualRole: "guest"
      })
    ).toBe(false);
  });
});
