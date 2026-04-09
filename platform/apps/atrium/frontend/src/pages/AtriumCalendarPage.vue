<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";
import {
  BellRing,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  ExternalLink,
  House,
  RefreshCcw
} from "lucide-vue-next";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import {
  addDays,
  buildCalendarRange,
  compactDateTimeLabel,
  dateKey,
  daysForView,
  entryDurationMinutes,
  entryEnd,
  entryStart,
  longDateLabel,
  monthLabel,
  monthMatrix,
  normalizeCalendarDate,
  normalizeCalendarView,
  parseBooleanQuery,
  sameDay,
  startOfWeek,
  timeLabel,
  weekdayLabel,
  type CalendarEntryKind,
  type CalendarItem,
  type CalendarResponse,
  type CalendarSummary,
  type CalendarView
} from "../lib/calendar";

const appStore = useAtriumAppStore();
const route = useRoute();
const router = useRouter();
const { currentLang } = storeToRefs(appStore);

const loading = ref(false);
const error = ref("");
const payload = ref<CalendarResponse | null>(null);
const selectedEntryId = ref("");
const showEvents = ref(true);
const showReminders = ref(true);

const locale = computed(() => (currentLang.value === "ru" ? "ru-RU" : "en-US"));
const isRussian = computed(() => currentLang.value === "ru");
const copy = computed(() =>
  isRussian.value
    ? {
        eyebrow: "Calendar v0",
        title: "День, неделя и месяц поверх owner-scoped calendar projection.",
        subtitle:
          "Это отдельный календарный host на том же OIDC session perimeter: планы и напоминания читаются через тонкий backend proxy, а не через browser-side raw MCP.",
        back: "В Atrium",
        today: "Сегодня",
        refresh: "Обновить",
        export: "iCal",
        openInspect: "Inspect",
        empty: "На выбранное окно пока ничего не попало.",
        loading: "Загружаем calendar projection...",
        planned: "События",
        reminders: "Напоминания",
        next: "Следующее",
        visible: "В окне",
        upcoming: "Ближайшие 7 дней",
        overdue: "Просроченные reminders",
        miniMonth: "Навигатор",
        selected: "Выбранный элемент",
        noSelection: "Кликни по событию или напоминанию справа на сетке.",
        noDetails: "В этот день пока нет событий или reminders.",
        day: "День",
        week: "Неделя",
        month: "Месяц",
        dayAgenda: "Повестка дня",
        calendars: "Слои",
        plannerEvent: "Planner event",
        plannerReminder: "Planner reminder",
        status: "Статус",
        place: "Место",
        source: "Источник",
        when: "Когда",
        channel: "Канал",
        loginFailed: "Не удалось загрузить календарь."
      }
    : {
        eyebrow: "Calendar v0",
        title: "Day, week, and month views on top of the owner-scoped calendar projection.",
        subtitle:
          "This is a dedicated calendar host on the same OIDC session perimeter: plans and reminders are loaded through a thin backend proxy, not browser-side raw MCP.",
        back: "Back to Atrium",
        today: "Today",
        refresh: "Refresh",
        export: "iCal",
        openInspect: "Inspect",
        empty: "Nothing falls into the selected window yet.",
        loading: "Loading calendar projection...",
        planned: "Events",
        reminders: "Reminders",
        next: "Next",
        visible: "Visible",
        upcoming: "Next 7 days",
        overdue: "Overdue reminders",
        miniMonth: "Navigator",
        selected: "Selected item",
        noSelection: "Select an event or reminder from the timeline.",
        noDetails: "There are no events or reminders for this day yet.",
        day: "Day",
        week: "Week",
        month: "Month",
        dayAgenda: "Day agenda",
        calendars: "Layers",
        plannerEvent: "Planner event",
        plannerReminder: "Planner reminder",
        status: "Status",
        place: "Place",
        source: "Source",
        when: "When",
        channel: "Channel",
        loginFailed: "Failed to load calendar."
      }
);

const replaceQuery = async (patch: Record<string, string | undefined>) => {
  const nextQuery: LocationQueryRaw = { ...route.query };
  for (const [key, value] of Object.entries(patch)) {
    if (!value) {
      delete nextQuery[key];
      continue;
    }
    nextQuery[key] = value;
  }
  await router.replace({ query: nextQuery });
};

const view = computed<CalendarView>({
  get: () => normalizeCalendarView(route.query.view),
  set: (value) => {
    void replaceQuery({ view: value });
  }
});

const focusDate = computed<string>({
  get: () => normalizeCalendarDate(route.query.date),
  set: (value) => {
    void replaceQuery({ date: value });
  }
});

const includeReminders = computed<boolean>({
  get: () => parseBooleanQuery(route.query.include_reminders, true),
  set: (value) => {
    void replaceQuery({ include_reminders: value ? "true" : "false" });
  }
});

const summary = computed<CalendarSummary>(
  () => payload.value?.summary || { visible_count: 0, event_count: 0, reminder_count: 0 }
);
const allItems = computed<CalendarItem[]>(() =>
  Array.isArray(payload.value?.items) ? payload.value.items : []
);
const filteredItems = computed<CalendarItem[]>(() =>
  allItems.value.filter((item) => {
    if (item.entry_kind === "event" && !showEvents.value) return false;
    if (item.entry_kind === "reminder" && !showReminders.value) return false;
    return true;
  })
);

const timelineDays = computed(() => daysForView(focusDate.value, view.value));
const monthCells = computed(() => monthMatrix(focusDate.value));
const hourLabels = Array.from({ length: 24 }, (_, hour) => hour);
const hourHeight = 72;

const selectedEntry = computed<CalendarItem | null>(() => {
  if (!filteredItems.value.length) return null;
  return (
    filteredItems.value.find((item) => item.entry_id === selectedEntryId.value) ||
    filteredItems.value[0] ||
    null
  );
});

const selectedDay = computed(() => {
  const entry = selectedEntry.value;
  const start = entry ? entryStart(entry) : null;
  return start ? dateKey(start) : focusDate.value;
});

const selectedDayItems = computed(() =>
  filteredItems.value
    .filter((item) => sameDay(item, selectedDay.value))
    .sort((left, right) => {
      const leftAt = entryStart(left)?.getTime() || 0;
      const rightAt = entryStart(right)?.getTime() || 0;
      return leftAt - rightAt;
    })
);

const periodLabel = computed(() => {
  if (view.value === "month") return monthLabel(focusDate.value, locale.value);
  if (view.value === "day") return longDateLabel(focusDate.value, locale.value);
  const weekStart = startOfWeek(focusDate.value);
  const weekEnd = addDays(weekStart, 6);
  return `${longDateLabel(weekStart, locale.value)} - ${longDateLabel(weekEnd, locale.value)}`;
});

const requestParams = computed(() => {
  const range = buildCalendarRange(focusDate.value, view.value);
  const params = new URLSearchParams();
  params.set("from", range.from);
  params.set("to", range.to);
  params.set("window", range.window);
  params.set("include_reminders", includeReminders.value ? "true" : "false");
  params.set("include_archived", "false");
  params.set("limit", view.value === "month" ? "300" : "120");
  return params;
});

const icsHref = computed(() => `/api/calendar/feed.ics?${requestParams.value.toString()}`);
const jsonHref = computed(() => `/api/calendar/events?${requestParams.value.toString()}`);

const fetchCalendar = async () => {
  loading.value = true;
  error.value = "";
  try {
    const res = await fetch(jsonHref.value, {
      credentials: "include",
      headers: {
        Accept: "application/json"
      }
    });

    if (res.status === 401 || res.status === 403) {
      await router.push({
        name: "login",
        query: { next: route.fullPath }
      });
      return;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || copy.value.loginFailed);
    }

    payload.value = (await res.json()) as CalendarResponse;
    if (!payload.value || !Array.isArray(payload.value.items)) {
      payload.value = {
        items: [],
        summary: { visible_count: 0, event_count: 0, reminder_count: 0 }
      };
    }
    if (!filteredItems.value.some((item) => item.entry_id === selectedEntryId.value)) {
      selectedEntryId.value = filteredItems.value[0]?.entry_id || "";
    }
  } catch (err) {
    payload.value = null;
    error.value = String((err as Error)?.message || copy.value.loginFailed);
  } finally {
    loading.value = false;
  }
};

watch(
  [view, focusDate, includeReminders],
  () => {
    void fetchCalendar();
  },
  { immediate: true }
);

watch(
  filteredItems,
  (items) => {
    if (!items.length) {
      selectedEntryId.value = "";
      return;
    }
    if (!items.some((item) => item.entry_id === selectedEntryId.value)) {
      selectedEntryId.value = items[0]?.entry_id || "";
    }
  },
  { deep: false }
);

const shiftWindow = (direction: -1 | 1) => {
  if (view.value === "day") {
    focusDate.value = addDays(focusDate.value, direction);
    return;
  }
  if (view.value === "week") {
    focusDate.value = addDays(focusDate.value, direction * 7);
    return;
  }
  const next = new Date(`${focusDate.value}T12:00:00`);
  next.setMonth(next.getMonth() + direction, 1);
  focusDate.value = dateKey(next);
};

const goToToday = () => {
  focusDate.value = dateKey(new Date());
};

const dayItems = (dateISO: string) =>
  filteredItems.value
    .filter((item) => sameDay(item, dateISO))
    .sort(
      (left, right) =>
        (entryStart(left)?.getTime() || 0) - (entryStart(right)?.getTime() || 0)
    );

const entryStyle = (item: CalendarItem) => {
  const start = entryStart(item);
  const end = entryEnd(item);
  if (!start || !end) return {};
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const duration = entryDurationMinutes(item);
  return {
    top: `${(startMinutes / 60) * hourHeight}px`,
    height: `${Math.max((duration / 60) * hourHeight, 38)}px`
  };
};

const nowMarkerTop = (dateISO: string) => {
  const now = new Date();
  if (dateKey(now) !== dateISO) return null;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return `${(minutes / 60) * hourHeight}px`;
};

const itemTone = (kind: CalendarEntryKind) => (kind === "event" ? "event" : "reminder");
const itemKindLabel = (item: CalendarItem) =>
  item.entry_kind === "event" ? copy.value.plannerEvent : copy.value.plannerReminder;
const formatTime = (item: CalendarItem) => {
  const start = entryStart(item);
  const end = entryEnd(item);
  if (!start || !end) return "";
  return `${timeLabel(start, locale.value)} - ${timeLabel(end, locale.value)}`;
};
const summaryNext = computed(
  () => compactDateTimeLabel(summary.value.next_item_at, locale.value) || "—"
);
const monthlyPreview = (dateISO: string) => dayItems(dateISO).slice(0, 3);
</script>

<template>
  <section class="calendar-shell text-white">
    <aside class="calendar-left-panel">
      <div class="calendar-panel-head">
        <span class="calendar-kicker">{{ copy.eyebrow }}</span>
        <button class="calendar-home" type="button" @click="appStore.navigateHome()">
          <House :size="16" />
          <span>{{ copy.back }}</span>
        </button>
      </div>

      <div class="calendar-story card-glass min-h-0">
        <p class="calendar-story-title">{{ copy.title }}</p>
        <p class="calendar-story-body">{{ copy.subtitle }}</p>
      </div>

      <div class="calendar-sidebar-group">
        <div class="calendar-sidebar-title">{{ copy.calendars }}</div>
        <button
          class="calendar-filter"
          :class="{ 'calendar-filter-off': !showEvents }"
          type="button"
          @click="showEvents = !showEvents"
        >
          <span class="calendar-filter-copy">
            <Circle :size="12" class="calendar-filter-dot calendar-filter-dot-event" />
            <span>{{ copy.planned }}</span>
          </span>
          <span class="calendar-filter-count">{{ summary.event_count || 0 }}</span>
        </button>
        <button
          class="calendar-filter"
          :class="{ 'calendar-filter-off': !showReminders }"
          type="button"
          @click="showReminders = !showReminders"
        >
          <span class="calendar-filter-copy">
            <BellRing :size="14" class="calendar-filter-dot calendar-filter-dot-reminder" />
            <span>{{ copy.reminders }}</span>
          </span>
          <span class="calendar-filter-count">{{ summary.reminder_count || 0 }}</span>
        </button>
      </div>

      <div class="calendar-sidebar-group">
        <div class="calendar-sidebar-title">Metrics</div>
        <div class="calendar-metric-grid">
          <article class="calendar-metric-card">
            <span>{{ copy.visible }}</span>
            <strong>{{ summary.visible_count || 0 }}</strong>
          </article>
          <article class="calendar-metric-card">
            <span>{{ copy.next }}</span>
            <strong>{{ summaryNext }}</strong>
          </article>
          <article class="calendar-metric-card">
            <span>{{ copy.upcoming }}</span>
            <strong>{{ summary.next_7d_count || 0 }}</strong>
          </article>
          <article class="calendar-metric-card">
            <span>{{ copy.overdue }}</span>
            <strong>{{ summary.overdue_reminder_count || 0 }}</strong>
          </article>
        </div>
      </div>
    </aside>

    <main class="calendar-main-panel">
      <header class="calendar-toolbar card-glass">
        <div class="calendar-toolbar-left">
          <span class="calendar-kicker">{{ copy.eyebrow }}</span>
          <h1 class="calendar-toolbar-title">{{ periodLabel }}</h1>
        </div>
        <div class="calendar-toolbar-actions">
          <div class="calendar-nav-cluster">
            <button class="calendar-nav-button" type="button" @click="shiftWindow(-1)">
              <ChevronLeft :size="18" />
            </button>
            <button class="calendar-nav-button calendar-nav-today" type="button" @click="goToToday">
              {{ copy.today }}
            </button>
            <button class="calendar-nav-button" type="button" @click="shiftWindow(1)">
              <ChevronRight :size="18" />
            </button>
          </div>
          <div class="calendar-view-switcher">
            <button
              class="calendar-view-button"
              :class="{ 'calendar-view-active': view === 'day' }"
              type="button"
              @click="view = 'day'"
            >
              <CalendarClock :size="16" />
              <span>{{ copy.day }}</span>
            </button>
            <button
              class="calendar-view-button"
              :class="{ 'calendar-view-active': view === 'week' }"
              type="button"
              @click="view = 'week'"
            >
              <CalendarRange :size="16" />
              <span>{{ copy.week }}</span>
            </button>
            <button
              class="calendar-view-button"
              :class="{ 'calendar-view-active': view === 'month' }"
              type="button"
              @click="view = 'month'"
            >
              <CalendarDays :size="16" />
              <span>{{ copy.month }}</span>
            </button>
          </div>
          <div class="calendar-nav-cluster">
            <button class="calendar-nav-button" type="button" @click="includeReminders = !includeReminders">
              <BellRing :size="16" />
              <span>{{ copy.reminders }}</span>
            </button>
            <button class="calendar-nav-button" type="button" @click="fetchCalendar">
              <RefreshCcw :size="16" />
              <span>{{ copy.refresh }}</span>
            </button>
            <a class="calendar-nav-button" :href="icsHref">
              <Download :size="16" />
              <span>{{ copy.export }}</span>
            </a>
          </div>
        </div>
      </header>

      <div v-if="loading" class="calendar-state card-glass">
        {{ copy.loading }}
      </div>
      <div
        v-else-if="error"
        class="calendar-state card-glass border border-status-offline/30 text-status-offline"
      >
        {{ error }}
      </div>
      <div v-else-if="!filteredItems.length" class="calendar-state card-glass">
        {{ copy.empty }}
      </div>

      <section v-else-if="view === 'month'" class="calendar-board card-glass">
        <div class="calendar-month-headings">
          <span v-for="cell in monthCells.slice(0, 7)" :key="cell.date">{{ weekdayLabel(cell.date, locale, 'short') }}</span>
        </div>
        <div class="calendar-month-grid">
          <button
            v-for="cell in monthCells"
            :key="cell.date"
            class="calendar-month-cell"
            :class="{
              'calendar-month-cell-muted': !cell.inMonth,
              'calendar-month-cell-active': cell.date === selectedDay,
              'calendar-month-cell-today': cell.date === dateKey(new Date())
            }"
            type="button"
            @click="focusDate = cell.date"
          >
            <span class="calendar-month-day">{{ Number(cell.date.slice(8, 10)) }}</span>
            <div class="calendar-month-items">
              <span
                v-for="item in monthlyPreview(cell.date)"
                :key="`${cell.date}:${item.entry_id}`"
                class="calendar-month-chip"
                :class="`calendar-month-chip-${itemTone(item.entry_kind)}`"
                @click.stop="selectedEntryId = item.entry_id"
              >
                {{ item.title }}
              </span>
            </div>
          </button>
        </div>
      </section>

      <section v-else class="calendar-board card-glass">
        <div class="calendar-grid-head">
          <div class="calendar-grid-gutter"></div>
          <div
            class="calendar-grid-days"
            :style="{ gridTemplateColumns: `repeat(${timelineDays.length}, minmax(0, 1fr))` }"
          >
            <button
              v-for="day in timelineDays"
              :key="day"
              class="calendar-day-pill"
              :class="{ 'calendar-day-pill-active': day === selectedDay }"
              type="button"
              @click="focusDate = day"
            >
              <span>{{ weekdayLabel(day, locale, 'short') }}</span>
              <strong>{{ Number(day.slice(8, 10)) }}</strong>
            </button>
          </div>
        </div>

        <div class="calendar-grid-body">
          <div class="calendar-grid-gutter">
            <div
              v-for="hour in hourLabels"
              :key="hour"
              class="calendar-hour-label"
              :style="{ top: `${hour * hourHeight}px` }"
            >
              {{ String(hour).padStart(2, '0') }}:00
            </div>
          </div>
          <div
            class="calendar-grid-days"
            :style="{ gridTemplateColumns: `repeat(${timelineDays.length}, minmax(0, 1fr))` }"
          >
            <div
              v-for="day in timelineDays"
              :key="day"
              class="calendar-day-column"
              :style="{ height: `${hourLabels.length * hourHeight}px` }"
            >
              <div
                v-for="hour in hourLabels"
                :key="`${day}:${hour}`"
                class="calendar-hour-row"
                :style="{ top: `${hour * hourHeight}px` }"
              ></div>
              <div
                v-if="nowMarkerTop(day)"
                class="calendar-now-line"
                :style="{ top: nowMarkerTop(day) || '0px' }"
              ></div>
              <button
                v-for="item in dayItems(day)"
                :key="item.entry_id"
                class="calendar-entry"
                :class="`calendar-entry-${itemTone(item.entry_kind)}`"
                :style="entryStyle(item)"
                type="button"
                @click="selectedEntryId = item.entry_id"
              >
                <span class="calendar-entry-time">{{ formatTime(item) }}</span>
                <strong class="calendar-entry-title">{{ item.title }}</strong>
                <span class="calendar-entry-meta">{{ itemKindLabel(item) }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <aside class="calendar-right-panel">
      <section class="calendar-mini card-glass">
        <div class="calendar-sidebar-title">{{ copy.miniMonth }}</div>
        <div class="calendar-mini-headings">
          <span v-for="cell in monthCells.slice(0, 7)" :key="`mini-${cell.date}`">{{ weekdayLabel(cell.date, locale, 'narrow') }}</span>
        </div>
        <div class="calendar-mini-grid">
          <button
            v-for="cell in monthCells"
            :key="`mini-grid-${cell.date}`"
            class="calendar-mini-day"
            :class="{
              'calendar-mini-day-muted': !cell.inMonth,
              'calendar-mini-day-active': cell.date === focusDate,
              'calendar-mini-day-today': cell.date === dateKey(new Date())
            }"
            type="button"
            @click="focusDate = cell.date"
          >
            {{ Number(cell.date.slice(8, 10)) }}
          </button>
        </div>
      </section>

      <section class="calendar-detail card-glass">
        <div class="calendar-detail-header">
          <div>
            <div class="calendar-sidebar-title">{{ copy.selected }}</div>
            <p class="calendar-detail-date">{{ longDateLabel(selectedDay, locale) }}</p>
          </div>
          <a class="calendar-detail-link" :href="jsonHref">
            <ExternalLink :size="15" />
          </a>
        </div>

        <article v-if="selectedEntry" class="calendar-detail-focus">
          <span
            class="calendar-detail-kind"
            :class="`calendar-detail-kind-${itemTone(selectedEntry.entry_kind)}`"
          >
            {{ itemKindLabel(selectedEntry) }}
          </span>
          <h2 class="calendar-detail-title">{{ selectedEntry.title }}</h2>
          <dl class="calendar-detail-grid">
            <div>
              <dt>{{ copy.when }}</dt>
              <dd>{{ formatTime(selectedEntry) || compactDateTimeLabel(selectedEntry.scheduled_at, locale) }}</dd>
            </div>
            <div>
              <dt>{{ copy.status }}</dt>
              <dd>{{ selectedEntry.status }}</dd>
            </div>
            <div v-if="selectedEntry.location_text">
              <dt>{{ copy.place }}</dt>
              <dd>{{ selectedEntry.location_text }}</dd>
            </div>
            <div v-if="selectedEntry.channel">
              <dt>{{ copy.channel }}</dt>
              <dd>{{ selectedEntry.channel }}</dd>
            </div>
            <div v-if="selectedEntry.linked_record_kind || selectedEntry.linked_record_id">
              <dt>{{ copy.source }}</dt>
              <dd>{{ selectedEntry.linked_record_kind }} / {{ selectedEntry.linked_record_id }}</dd>
            </div>
          </dl>
          <a v-if="selectedEntry.inspect_path" class="calendar-inspect-link" :href="selectedEntry.inspect_path">
            <ExternalLink :size="16" />
            <span>{{ copy.openInspect }}</span>
          </a>
        </article>
        <p v-else class="calendar-detail-empty">{{ copy.noSelection }}</p>

        <div class="calendar-agenda-divider"></div>

        <div>
          <div class="calendar-sidebar-title">{{ copy.dayAgenda }}</div>
          <ul v-if="selectedDayItems.length" class="calendar-agenda-list">
            <li
              v-for="item in selectedDayItems"
              :key="`agenda-${item.entry_id}`"
              class="calendar-agenda-item"
              :class="{ 'calendar-agenda-item-active': item.entry_id === selectedEntryId }"
            >
              <button class="calendar-agenda-button" type="button" @click="selectedEntryId = item.entry_id">
                <span class="calendar-agenda-dot" :class="`calendar-agenda-dot-${itemTone(item.entry_kind)}`"></span>
                <span class="calendar-agenda-copy">
                  <strong>{{ item.title }}</strong>
                  <small>{{ formatTime(item) }}</small>
                </span>
              </button>
            </li>
          </ul>
          <p v-else class="calendar-detail-empty">{{ copy.noDetails }}</p>
        </div>
      </section>
    </aside>
  </section>
</template>

<style scoped>
.calendar-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 320px;
  gap: 18px;
  min-height: 100vh;
  padding: 18px;
}

.calendar-left-panel,
.calendar-right-panel {
  display: grid;
  gap: 18px;
  align-self: start;
}

.calendar-main-panel {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.calendar-panel-head,
.calendar-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.calendar-kicker {
  font-size: 11px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

.calendar-home,
.calendar-detail-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  padding: 10px 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.calendar-story,
.calendar-toolbar,
.calendar-board,
.calendar-mini,
.calendar-detail,
.calendar-state {
  min-height: 0;
  background: linear-gradient(180deg, rgba(10, 12, 18, 0.86), rgba(10, 12, 18, 0.72));
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.calendar-story-title,
.calendar-toolbar-title,
.calendar-detail-title {
  margin: 0;
  font-weight: 600;
  line-height: 1.05;
}

.calendar-story-title,
.calendar-toolbar-title {
  font-size: clamp(1.5rem, 2vw, 2.4rem);
}

.calendar-story-body,
.calendar-detail-empty,
.calendar-detail-date {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
}

.calendar-sidebar-group {
  display: grid;
  gap: 10px;
}

.calendar-sidebar-title {
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

.calendar-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  padding: 14px 16px;
}

.calendar-filter-off {
  opacity: 0.5;
}

.calendar-filter-copy {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.calendar-filter-count {
  min-width: 28px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.72);
}

.calendar-filter-dot-event {
  color: #ff6f61;
}

.calendar-filter-dot-reminder {
  color: #ffb347;
}

.calendar-metric-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.calendar-metric-card {
  display: grid;
  gap: 8px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 14px;
}

.calendar-metric-card span {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.42);
}

.calendar-metric-card strong {
  font-size: 18px;
  font-weight: 600;
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.calendar-toolbar-left,
.calendar-toolbar-actions,
.calendar-nav-cluster,
.calendar-view-switcher {
  display: flex;
  align-items: center;
  gap: 10px;
}

.calendar-toolbar-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.calendar-nav-button,
.calendar-view-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  padding: 10px 14px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.82);
}

.calendar-nav-today,
.calendar-view-active {
  background: rgba(255, 111, 97, 0.18);
  border-color: rgba(255, 111, 97, 0.45);
  color: #fff;
}

.calendar-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  font-size: 15px;
}

.calendar-board {
  display: grid;
  gap: 16px;
  overflow: hidden;
}

.calendar-grid-head,
.calendar-grid-body {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 12px;
}

.calendar-grid-days {
  display: grid;
  gap: 12px;
}

.calendar-day-pill {
  display: grid;
  gap: 6px;
  justify-items: center;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  color: rgba(255, 255, 255, 0.78);
}

.calendar-day-pill strong {
  font-size: 24px;
  line-height: 1;
}

.calendar-day-pill-active {
  border-color: rgba(255, 111, 97, 0.45);
  background: rgba(255, 111, 97, 0.14);
  color: #fff;
}

.calendar-grid-gutter {
  position: relative;
}

.calendar-hour-label {
  position: absolute;
  inset-inline: 0;
  height: 72px;
  transform: translateY(-8px);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.28);
}

.calendar-day-column {
  position: relative;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(6, 8, 14, 0.72);
  overflow: hidden;
}

.calendar-hour-row {
  position: absolute;
  inset-inline: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
}

.calendar-now-line {
  position: absolute;
  inset-inline: 0;
  height: 2px;
  background: rgba(255, 79, 79, 0.95);
  box-shadow: 0 0 18px rgba(255, 79, 79, 0.6);
  z-index: 3;
}

.calendar-entry {
  position: absolute;
  left: 10px;
  right: 10px;
  display: grid;
  align-content: start;
  gap: 6px;
  border-radius: 16px;
  padding: 10px 12px;
  text-align: left;
  overflow: hidden;
  z-index: 4;
}

.calendar-entry-event {
  border: 1px solid rgba(255, 111, 97, 0.4);
  background: linear-gradient(180deg, rgba(255, 111, 97, 0.28), rgba(255, 111, 97, 0.12));
}

.calendar-entry-reminder {
  border: 1px solid rgba(255, 179, 71, 0.4);
  background: linear-gradient(180deg, rgba(255, 179, 71, 0.24), rgba(255, 179, 71, 0.08));
}

.calendar-entry-time,
.calendar-entry-meta {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.74);
}

.calendar-entry-title {
  font-size: 14px;
  line-height: 1.35;
}

.calendar-month-headings,
.calendar-mini-headings {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.34);
}

.calendar-month-grid,
.calendar-mini-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.calendar-month-cell {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 122px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  text-align: left;
}

.calendar-month-cell-muted {
  opacity: 0.38;
}

.calendar-month-cell-active,
.calendar-mini-day-active {
  border-color: rgba(255, 111, 97, 0.45);
  box-shadow: inset 0 0 0 1px rgba(255, 111, 97, 0.18);
}

.calendar-month-cell-today,
.calendar-mini-day-today {
  background: rgba(255, 111, 97, 0.08);
}

.calendar-month-day {
  font-size: 17px;
  font-weight: 600;
}

.calendar-month-items {
  display: grid;
  gap: 6px;
}

.calendar-month-chip {
  overflow: hidden;
  border-radius: 999px;
  padding: 6px 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

.calendar-month-chip-event {
  background: rgba(255, 111, 97, 0.16);
  color: #ffd5d1;
}

.calendar-month-chip-reminder {
  background: rgba(255, 179, 71, 0.14);
  color: #ffe2b5;
}

.calendar-mini-day {
  aspect-ratio: 1;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.82);
}

.calendar-mini-day-muted {
  opacity: 0.42;
}

.calendar-detail {
  display: grid;
  gap: 16px;
}

.calendar-detail-focus {
  display: grid;
  gap: 14px;
}

.calendar-detail-kind,
.calendar-inspect-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.calendar-detail-kind-event {
  background: rgba(255, 111, 97, 0.16);
  color: #ffd5d1;
}

.calendar-detail-kind-reminder {
  background: rgba(255, 179, 71, 0.14);
  color: #ffe2b5;
}

.calendar-detail-grid {
  display: grid;
  gap: 12px;
  margin: 0;
}

.calendar-detail-grid div {
  display: grid;
  gap: 4px;
}

.calendar-detail-grid dt {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.38);
}

.calendar-detail-grid dd {
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
}

.calendar-inspect-link {
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.84);
}

.calendar-agenda-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.calendar-agenda-list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.calendar-agenda-item {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.calendar-agenda-item-active {
  border-color: rgba(255, 111, 97, 0.35);
}

.calendar-agenda-button {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  text-align: left;
}

.calendar-agenda-dot {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 999px;
  flex: none;
}

.calendar-agenda-dot-event {
  background: #ff6f61;
}

.calendar-agenda-dot-reminder {
  background: #ffb347;
}

.calendar-agenda-copy {
  display: grid;
  gap: 4px;
}

.calendar-agenda-copy small {
  color: rgba(255, 255, 255, 0.56);
}

@media (max-width: 1400px) {
  .calendar-shell {
    grid-template-columns: 240px minmax(0, 1fr) 280px;
  }
}

@media (max-width: 1120px) {
  .calendar-shell {
    grid-template-columns: 1fr;
  }

  .calendar-grid-head,
  .calendar-grid-body {
    grid-template-columns: 46px minmax(0, 1fr);
  }
}

@media (max-width: 780px) {
  .calendar-shell {
    padding: 12px;
    gap: 12px;
  }

  .calendar-toolbar,
  .calendar-toolbar-actions,
  .calendar-toolbar-left {
    display: grid;
    gap: 12px;
  }

  .calendar-nav-cluster,
  .calendar-view-switcher {
    flex-wrap: wrap;
  }

  .calendar-grid-days {
    gap: 8px;
  }

  .calendar-entry {
    left: 6px;
    right: 6px;
    padding: 8px 10px;
  }
}
</style>
