import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "./auth.js";

describe("sanitizeNextPath", () => {
  it("accepts relative in-app paths", () => {
    expect(sanitizeNextPath("/space/admin?tab=members#top")).toBe("/space/admin?tab=members#top");
  });

  it("rejects absolute and protocol-relative urls", () => {
    expect(sanitizeNextPath("https://evil.example")).toBe("/");
    expect(sanitizeNextPath("//evil.example")).toBe("/");
  });

  it("rejects paths containing backslashes", () => {
    expect(sanitizeNextPath("/foo\\bar")).toBe("/");
  });

  it("uses the provided fallback for invalid values", () => {
    expect(sanitizeNextPath("javascript:alert(1)", "/login")).toBe("/login");
  });
});
