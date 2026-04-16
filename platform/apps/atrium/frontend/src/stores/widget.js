import { storeToRefs } from "pinia";
import { defineStore } from "pinia";
import { useAtriumAppStore } from "./atrium-app.js";

export const useWidgetStore = defineStore("atrium-widget", () => {
  const app = useAtriumAppStore();
  const { businessNotifications } = storeToRefs(app);

  return {
    bookingStatusClass: app.bookingStatusClass,
    bookingStatusLabel: app.bookingStatusLabel,
    businessNotifications,
    calendarDateLabel: app.calendarDateLabel,
    calendarEventsFor: app.calendarEventsFor,
    calendarVariant: app.calendarVariant,
    clockDateFor: app.clockDateFor,
    clockThemeClass: app.clockThemeClass,
    clockTimeFor: app.clockTimeFor,
    eventStatusClass: app.eventStatusClass,
    formatNotifTime: app.formatNotifTime,
    staffMetrics: app.staffMetrics,
    staffQueue: app.staffQueue,
    staffQuickActions: app.staffQuickActions,
    todoItemsFor: app.todoItemsFor,
    toggleTodo: app.toggleTodo,
    widgetHtml: app.widgetHtml
  };
});
