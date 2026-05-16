export function metricLabel(metric, t) {
  switch (metric?.label) {
    case "баллов":
    case "points":
      return t("assistant.metric.score");
    case "комментариев":
    case "comments":
      return t("assistant.metric.descendants");
    default:
      return metric?.label || "";
  }
}

export function metricKey(metric) {
  return `${metric?.label || "metric"}:${metric?.value || ""}`;
}
