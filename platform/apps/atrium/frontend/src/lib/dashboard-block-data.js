const normalizeBlockType = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "core.resources_pinned") return "resources_pinned";
  if (raw === "core.calendar_upcoming") return "calendar_upcoming";
  if (raw === "core.inventory_summary") return "inventory_summary";
  return raw;
};

const inspectParamsForBlock = (block) =>
  block?.contract?.inspect && typeof block.contract.inspect === "object"
    ? block.contract.inspect.params || {}
    : {};

const readString = (value, fallback = "") => {
  const normalized = String(value || "").trim();
  return normalized || fallback;
};

const readPositiveInt = (value, fallback) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);
  return fallback;
};

const readBoolean = (value, fallback) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
};

export const isCalendarUpcomingBlock = (block) =>
  normalizeBlockType(block?.type) === "calendar_upcoming";

export const isInventorySummaryBlock = (block) =>
  normalizeBlockType(block?.type) === "inventory_summary";

export function calendarUpcomingQueryFromBlock(block) {
  const inspectParams = inspectParamsForBlock(block);
  const rawWindow = readString(block?.config?.window ?? inspectParams.window, "week");
  const window = ["day", "week", "fortnight", "month"].includes(rawWindow) ? rawWindow : "week";

  return {
    window,
    include_archived: readBoolean(
      block?.config?.include_archived ?? inspectParams.include_archived,
      false
    ),
    include_reminders: readBoolean(
      block?.config?.include_reminders ?? inspectParams.include_reminders,
      true
    ),
    limit: readPositiveInt(block?.config?.limit ?? inspectParams.limit, 8)
  };
}

export function inventorySummaryQueryFromBlock(block) {
  const inspectParams = inspectParamsForBlock(block);

  return {
    slice: readString(block?.config?.slice ?? inspectParams.slice, "pantry"),
    include_archived: readBoolean(
      block?.config?.include_archived ?? inspectParams.include_archived,
      false
    ),
    attention_limit: readPositiveInt(
      block?.config?.attention_limit ?? block?.config?.limit ?? inspectParams.attention_limit,
      6
    )
  };
}
