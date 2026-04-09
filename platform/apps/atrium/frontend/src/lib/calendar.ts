export type CalendarView = "day" | "week" | "month";
export type CalendarEntryKind = "event" | "reminder";

export interface CalendarSourceItem {
  starts_at?: string | null;
  ends_at?: string | null;
  due_at?: string | null;
  [key: string]: unknown;
}

export interface CalendarItem {
  entry_kind: CalendarEntryKind;
  entry_id: string;
  scheduled_at: string;
  title: string;
  status: string;
  location_text?: string | null;
  channel?: string | null;
  linked_record_kind?: string | null;
  linked_record_id?: string | null;
  lifecycle_status?: string | null;
  inspect_path?: string | null;
  source_item?: CalendarSourceItem | null;
}

export interface CalendarSummary {
  visible_count: number;
  event_count: number;
  reminder_count: number;
  scheduled_event_count?: number;
  pending_reminder_count?: number;
  overdue_reminder_count?: number;
  next_item_at?: string | null;
  next_7d_count?: number;
}

export interface CalendarResponse {
  filters?: {
    from?: string;
    to?: string;
    window?: string;
    include_archived?: boolean;
    include_reminders?: boolean;
    limit?: number;
  };
  summary?: CalendarSummary;
  items?: CalendarItem[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_INDEX_MONDAY = 1;

const asString = (value: unknown) => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
};

const pad = (value: number) => String(value).padStart(2, "0");

export const normalizeCalendarView = (value: unknown): CalendarView => {
  const raw = asString(value).trim().toLowerCase();
  if (raw === "day" || raw === "month") {
    return raw;
  }
  return "week";
};

export const normalizeCalendarDate = (value: unknown, now = new Date()) => {
  const raw = asString(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  return dateKey(now);
};

export const parseBooleanQuery = (value: unknown, fallback: boolean) => {
  const raw = asString(value).trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
};

export const localDateFromKey = (dateISO: string) => {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);
};

export const dateKey = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const addDays = (dateISO: string, days: number) => {
  const date = localDateFromKey(dateISO);
  date.setDate(date.getDate() + days);
  return dateKey(date);
};

export const startOfWeek = (dateISO: string) => {
  const date = localDateFromKey(dateISO);
  const currentDay = date.getDay();
  const offset = currentDay === 0 ? -6 : WEEKDAY_INDEX_MONDAY - currentDay;
  date.setDate(date.getDate() + offset);
  return dateKey(date);
};

export const daysForView = (dateISO: string, view: CalendarView) => {
  if (view === "day") return [dateISO];
  if (view === "week") {
    const start = startOfWeek(dateISO);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }
  return [];
};

export const monthMatrix = (dateISO: string) => {
  const focus = localDateFromKey(dateISO);
  const monthStart = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const firstCell = localDateFromKey(startOfWeek(dateKey(monthStart)));

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(firstCell.getTime() + index * DAY_MS);
    return {
      date: dateKey(cellDate),
      inMonth: cellDate.getMonth() === focus.getMonth()
    };
  });
};

export const buildCalendarRange = (dateISO: string, view: CalendarView) => {
  const start = localDateFromKey(
    view === "week" ? startOfWeek(dateISO) : view === "month" ? `${dateISO.slice(0, 8)}01` : dateISO
  );
  const end = new Date(start);

  if (view === "day") {
    end.setDate(start.getDate());
  } else if (view === "week") {
    end.setDate(start.getDate() + 6);
  } else {
    end.setMonth(start.getMonth() + 1, 0);
  }

  const from = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0).toISOString();
  const to = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).toISOString();

  return {
    from,
    to,
    window: view
  };
};

export const entryStart = (item: CalendarItem) => {
  const raw = item?.scheduled_at || item?.source_item?.starts_at || item?.source_item?.due_at;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const entryEnd = (item: CalendarItem) => {
  const start = entryStart(item);
  if (!start) return null;
  const rawEnd = item?.source_item?.ends_at;
  if (rawEnd) {
    const parsedEnd = new Date(rawEnd);
    if (!Number.isNaN(parsedEnd.getTime()) && parsedEnd > start) {
      return parsedEnd;
    }
  }
  const fallbackMinutes = item.entry_kind === "reminder" ? 30 : 60;
  return new Date(start.getTime() + fallbackMinutes * 60 * 1000);
};

export const entryDurationMinutes = (item: CalendarItem) => {
  const start = entryStart(item);
  const end = entryEnd(item);
  if (!start || !end) return item.entry_kind === "reminder" ? 30 : 60;
  return Math.max(
    Math.round((end.getTime() - start.getTime()) / 60000),
    item.entry_kind === "reminder" ? 30 : 40
  );
};

export const weekdayLabel = (
  dateISO: string,
  locale: string,
  format: Intl.DateTimeFormatOptions["weekday"] = "short"
) => new Intl.DateTimeFormat(locale, { weekday: format }).format(localDateFromKey(dateISO));

export const monthLabel = (dateISO: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(localDateFromKey(dateISO));

export const longDateLabel = (dateISO: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(localDateFromKey(dateISO));

export const compactDateTimeLabel = (value: string | null | undefined, locale: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
};

export const timeLabel = (value: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);

export const sameDay = (item: CalendarItem, dateISO: string) => {
  const start = entryStart(item);
  if (!start) return false;
  return dateKey(start) === dateISO;
};
