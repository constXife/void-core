export const staffQuickActions = [
  { id: "sqa-1", title: "Открыть заявки", description: "Очередь / SLA / исполнители" },
  { id: "sqa-2", title: "Housekeeping", description: "Смены и чеклисты" },
  { id: "sqa-3", title: "Инциденты", description: "Критичные события" },
  { id: "sqa-4", title: "Смена статуса", description: "В работе / закрыто" }
];

export const staffQueue = [
  {
    id: "sq-1",
    title: "Номер 412: нет горячей воды",
    eta: "SLA 40 мин",
    priority: "critical",
    assignee: "Инженер"
  },
  {
    id: "sq-2",
    title: "Лифт B: ошибка двери",
    eta: "SLA 2 часа",
    priority: "high",
    assignee: "Сервис"
  }
];

export const staffMetrics = [
  { id: "sm-1", label: "В работе", value: "12" },
  { id: "sm-2", label: "SLA < 1ч", value: "4" },
  { id: "sm-3", label: "Просрочено", value: "1" },
  { id: "sm-4", label: "Нагрузка", value: "78%" }
];
