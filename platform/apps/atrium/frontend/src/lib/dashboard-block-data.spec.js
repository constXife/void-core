import { describe, expect, it } from "vitest";
import {
  calendarUpcomingQueryFromBlock,
  inventorySummaryQueryFromBlock,
  isCalendarUpcomingBlock,
  isInventorySummaryBlock
} from "./dashboard-block-data.js";

describe("dashboard block data helpers", () => {
  it("normalizes calendar upcoming block types and prefers scalar config overrides", () => {
    expect(isCalendarUpcomingBlock({ type: "core.calendar_upcoming" })).toBe(true);

    expect(
      calendarUpcomingQueryFromBlock({
        type: "calendar_upcoming",
        config: {
          limit: 6,
          include_reminders: false
        },
        contract: {
          inspect: {
            params: {
              window: "fortnight",
              include_archived: true,
              include_reminders: true,
              limit: 24
            }
          }
        }
      })
    ).toEqual({
      window: "fortnight",
      include_archived: true,
      include_reminders: false,
      limit: 6
    });
  });

  it("falls back to bounded inventory defaults when config is sparse", () => {
    expect(isInventorySummaryBlock({ type: "inventory_summary" })).toBe(true);

    expect(
      inventorySummaryQueryFromBlock({
        type: "core.inventory_summary",
        contract: {
          inspect: {
            params: {
              slice: "care",
              include_archived: true
            }
          }
        }
      })
    ).toEqual({
      slice: "care",
      include_archived: true,
      attention_limit: 6
    });
  });
});
