import { describe, expect, it } from "vitest";
import { resolveBlockInspectHref } from "./dashboard-inspect.js";

describe("resolveBlockInspectHref", () => {
  it("prefers the declared resource host when requested by the contract", () => {
    const href = resolveBlockInspectHref({
      contract: {
        inspect: {
          preferred_target: "resource",
          resource: {
            id: "calendar",
            url: "https://calendar.example.local"
          },
          path: "/calendar/page",
          params: {
            window: "week",
            limit: 24,
            owner_subject_id: {
              from: "viewer.owner_subject_id",
              required: true
            }
          }
        }
      }
    });

    expect(href).toBe("https://calendar.example.local?window=week&limit=24");
  });

  it("does not fall back when the preferred resource host is missing", () => {
    const href = resolveBlockInspectHref({
      contract: {
        inspect: {
          preferred_target: "resource",
          params: {
            include_reminders: true,
            include_archived: false
          }
        }
      }
    });

    expect(href).toBe("");
  });
});
