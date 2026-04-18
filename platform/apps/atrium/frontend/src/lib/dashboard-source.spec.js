import { describe, expect, it } from "vitest";
import {
  canUseCompatDashboardFallback,
  hasProvisioningDashboardSnapshot,
  prefersProvisioningDashboard
} from "./dashboard-source.js";

describe("dashboard source helpers", () => {
  it("treats provisioning spaces as canonical-first and not legacy-backed", () => {
    const space = {
      id: "admin",
      provisioning_space_id: "admin",
      database_id: 42
    };

    expect(prefersProvisioningDashboard(space)).toBe(true);
    expect(canUseCompatDashboardFallback(space)).toBe(false);
  });

  it("allows compat fallback only for non-provisioned spaces with database ids", () => {
    expect(canUseCompatDashboardFallback({ id: "legacy", database_id: 17 })).toBe(true);
    expect(canUseCompatDashboardFallback({ id: "legacy" })).toBe(false);
  });

  it("distinguishes absent provisioning snapshots from canonical empty snapshots", () => {
    expect(hasProvisioningDashboardSnapshot(null)).toBe(false);
    expect(hasProvisioningDashboardSnapshot({})).toBe(false);
    expect(
      hasProvisioningDashboardSnapshot({
        configured: true,
        exists: true,
        blocks: []
      })
    ).toBe(true);
  });
});
