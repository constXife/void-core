import { describe, expect, it } from "vitest";
import {
  hasResolvedPlatformAccount,
  resolvePlatformUserAvatarUrl,
  resolvePlatformUserIdentity,
  resolvePlatformUserInitials
} from "./account.js";

describe("platform account contract", () => {
  it("resolves an authenticated user account", () => {
    const account = resolvePlatformUserIdentity({
      authenticated: true,
      email: "user@example.com",
      role: "user",
      user_id: "user-1"
    });

    expect(account).toMatchObject({
      email: "user@example.com",
      userId: "user-1",
      role: "user",
      label: "user@example.com",
      initials: "U"
    });
  });

  it("uses provider avatar fields from the account payload", () => {
    expect(
      resolvePlatformUserAvatarUrl({
        authenticated: true,
        email: "user@example.com",
        avatar_url: "https://example.com/avatar.png"
      })
    ).toBe("https://example.com/avatar.png");
  });

  it("keeps initials derivation centralized", () => {
    expect(
      resolvePlatformUserInitials({
        authenticated: true,
        email: "first.last@example.com"
      })
    ).toBe("FL");
  });

  it("rejects guest or anonymous viewer states", () => {
    expect(
      hasResolvedPlatformAccount({
        authenticated: false,
        email: "",
        role: "guest",
        user_id: "guest"
      })
    ).toBe(false);
    expect(hasResolvedPlatformAccount(null)).toBe(false);
  });

  it("lets route guards reject an overridden guest role", () => {
    expect(
      hasResolvedPlatformAccount(
        {
          authenticated: true,
          email: "admin@example.com",
          role: "admin"
        },
        { role: "guest" }
      )
    ).toBe(false);
  });
});
