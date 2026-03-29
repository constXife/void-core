<script setup>
import { Pin } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useAtriumAppStore } from "../stores/atrium-app.js";

const props = defineProps({
  scope: { type: String, default: "local" },
  space: { type: Object, default: null },
  widget: { type: Object, required: true },
});

const appStore = useAtriumAppStore();
const { businessNotifications } = storeToRefs(appStore);

const {
  bookingStatusClass,
  bookingStatusLabel,
  calendarDateLabel,
  calendarEventsFor,
  calendarVariant,
  clockDateFor,
  clockThemeClass,
  clockTimeFor,
  eventStatusClass,
  formatNotifTime,
  isKidsSpace,
  todoItemsFor,
  toggleTodo,
  widgetHtml
} = appStore;
</script>

<template>
  <div
    class="card-glass card-note col-span-full sm:col-span-1 lg:col-span-2"
    :class="{
      'card-note-tech': props.scope === 'local' && props.widget.id?.includes('admin'),
      'card-note-kids': props.scope === 'local' && isKidsSpace(props.space)
    }"
  >
    <div class="flex items-start justify-between gap-3 mb-3">
      <div>
        <div class="text-base font-semibold text-white/90">
          <template v-if="props.scope === 'global'">
            📢 {{ props.widget.title || "Объявления" }}
          </template>
          <template v-else>
            <span :class="{ 'note-title-tech': props.widget.id?.includes('admin') }">
              {{ props.widget.title || "Объявления" }}
            </span>
          </template>
        </div>
      </div>
      <Pin :class="props.scope === 'global' ? 'w-5 h-5 note-pin' : 'w-5 h-5 text-white/60'" />
    </div>

    <div v-if="props.widget.type === 'markdown'" class="note-body" v-html="widgetHtml(props.widget.content)"></div>
    <div v-else-if="props.widget.type === 'clock'" class="clock-widget" :class="clockThemeClass(props.widget, props.space)">
      <div class="clock-time">{{ clockTimeFor(props.widget) }}</div>
      <div class="clock-date">{{ clockDateFor() }}</div>
    </div>
    <div v-else-if="props.widget.type === 'calendar'" class="widget-calendar" :class="{ 'calendar-compact': calendarVariant(props.widget, props.space) === 'compact' }">
      <div class="calendar-date">{{ calendarDateLabel(props.widget) }}</div>
      <div class="calendar-events">
        <div
          v-for="(event, idx) in calendarEventsFor(props.widget, props.space)"
          :key="`${props.widget.id}-event-${idx}`"
          class="calendar-event"
        >
          <span class="event-dot" :class="eventStatusClass(event)"></span>
          <span class="event-time">{{ event.time }}</span>
          <span class="event-title">{{ event.title }}</span>
        </div>
        <div v-if="calendarEventsFor(props.widget, props.space).length === 0" class="calendar-empty">
          No events
        </div>
      </div>
    </div>
    <div v-else-if="props.widget.type === 'todo'" class="widget-todo">
      <div class="todo-list">
        <button
          v-for="(todo, idx) in todoItemsFor(props.widget)"
          :key="`${props.widget.id}-todo-${idx}`"
          type="button"
          class="todo-item"
          :class="{ done: todo.done }"
          @click="toggleTodo(props.widget.id, idx)"
        >
          <span class="todo-check">{{ todo.done ? "✓" : "" }}</span>
          <span class="todo-text">{{ todo.text }}</span>
        </button>
        <div v-if="todoItemsFor(props.widget).length === 0" class="todo-empty">
          Nothing to do
        </div>
      </div>
    </div>
    <div v-else-if="props.widget.type === 'booking'" class="widget-booking">
      <div class="booking-header">
        <div class="booking-resource">{{ props.widget.booking?.resource || "Resource" }}</div>
        <div class="booking-status" :class="bookingStatusClass(props.widget.booking)">
          {{ bookingStatusLabel(props.widget.booking) }}
        </div>
      </div>
      <div class="booking-bar">
        <div class="booking-bar-fill" :style="{ width: `${props.widget.booking?.busy_percent || 0}%` }"></div>
      </div>
      <div v-if="props.widget.booking?.cta" class="booking-cta">{{ props.widget.booking.cta }}</div>
    </div>
    <div v-else-if="props.widget.type === 'timeline'" class="widget-timeline">
      <div class="timeline-list">
        <div
          v-for="notif in businessNotifications.slice(0, props.widget.limit || 5)"
          :key="notif.id"
          class="timeline-item"
        >
          <span class="timeline-icon">{{ notif.icon || "📢" }}</span>
          <span class="timeline-time">{{ formatNotifTime(notif.created_at) }}</span>
          <span class="timeline-text">{{ notif.title }}</span>
        </div>
        <div v-if="businessNotifications.length === 0" class="timeline-empty">
          No recent events
        </div>
      </div>
    </div>
  </div>
</template>
