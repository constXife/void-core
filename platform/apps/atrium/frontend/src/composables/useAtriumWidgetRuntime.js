import { computed, ref, watch } from "vue";

export function useAtriumWidgetRuntime({
  currentSpace,
  globalWidgets,
  isKidsSpace,
  localWidgets,
  stageRef,
  widgets
}) {
  const clockNow = ref(new Date());
  const todoState = ref({});
  const isPageVisible = ref(typeof document === "undefined" ? true : !document.hidden);
  let clockTimer = null;

  const clockThemeClass = (widget, space) => {
    if (widget?.type !== "clock") return "";
    const theme = widget?.style || (isKidsSpace(space) ? "warm" : "glass");
    return theme === "warm" ? "card-clock-warm" : "card-clock";
  };

  const updateClock = () => {
    clockNow.value = new Date();
  };

  const clockTimeFor = (widget) => {
    const hour12 = String(widget?.time_format || "24") === "12";
    return clockNow.value.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12
    });
  };

  const clockDateFor = () =>
    clockNow.value.toLocaleDateString([], {
      weekday: "long",
      day: "numeric",
      month: "long"
    });

  const calendarDateLabel = (widget) => {
    if (widget?.date_label) return widget.date_label;
    return clockNow.value
      .toLocaleDateString([], { day: "2-digit", month: "short" })
      .toUpperCase();
  };

  const hasClockWidget = computed(() => {
    if (!currentSpace.value) return false;
    const isClock = (widget) => widget?.type === "clock";
    if (globalWidgets.value.some(isClock)) return true;
    return localWidgets(currentSpace.value.id).some(isClock);
  });

  const syncClockTimer = () => {
    const shouldRun = isPageVisible.value && !!stageRef.value && hasClockWidget.value;
    if (shouldRun) {
      if (!clockTimer) {
        updateClock();
        clockTimer = setInterval(updateClock, 1000);
      }
      return;
    }
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };

  const handleVisibilityChange = () => {
    isPageVisible.value = typeof document === "undefined" ? true : !document.hidden;
    syncClockTimer();
  };

  const calendarVariant = (widget, space) => {
    if (widget?.style === "compact") return "compact";
    return space?.layout_mode === "list" ? "compact" : "default";
  };

  const calendarEventsFor = (widget, space) => {
    const events = Array.isArray(widget?.events) ? widget.events : [];
    return calendarVariant(widget, space) === "compact" ? events.slice(0, 2) : events;
  };

  const todoItemsFor = (widget) => {
    if (!widget?.id || !Array.isArray(widget?.todos)) return [];
    if (!todoState.value[widget.id]) {
      todoState.value[widget.id] = widget.todos.map((todo) => !!todo.done);
    }
    return widget.todos.map((todo, idx) => ({
      ...todo,
      done: todoState.value[widget.id]?.[idx] ?? !!todo.done
    }));
  };

  const toggleTodo = (widgetId, index) => {
    if (!widgetId) return;
    const current = todoState.value[widgetId] || [];
    todoState.value = {
      ...todoState.value,
      [widgetId]: current.map((value, idx) => (idx === index ? !value : value))
    };
  };

  const bookingStatusLabel = (booking) => booking?.status || "Status";

  const bookingStatusClass = (booking) => {
    const status = String(booking?.status || "").toLowerCase();
    if (status.includes("free") || status.includes("available")) return "booking-status-free";
    if (status.includes("busy") || status.includes("occupied")) return "booking-status-busy";
    return "booking-status-warn";
  };

  const eventStatusClass = (event) => {
    const status = String(event?.status || "").toLowerCase();
    if (status.includes("urgent") || status.includes("alert")) return "event-dot-urgent";
    if (status.includes("done")) return "event-dot-done";
    return "event-dot-normal";
  };

  watch(() => widgets.value, () => {
    todoState.value = {};
  });

  watch([hasClockWidget, () => stageRef.value, isPageVisible], () => {
    syncClockTimer();
  });

  return {
    bookingStatusClass,
    bookingStatusLabel,
    calendarDateLabel,
    calendarEventsFor,
    calendarVariant,
    clockDateFor,
    clockNow,
    clockThemeClass,
    clockTimeFor,
    eventStatusClass,
    handleVisibilityChange,
    syncClockTimer,
    todoItemsFor,
    toggleTodo,
    updateClock
  };
}
