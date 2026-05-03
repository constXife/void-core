import { computed } from "vue";

const normalizeSpaceKey = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  return raw
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
};

export function useAtriumWidgetScope({ parseDisplayConfig, widgets }) {
  const widgetInSpace = (widget, space) => {
    if (!widget?.spaces || widget.spaces.length === 0) return true;
    if (widget.spaces.includes("*")) return true;
    if (!space) return false;
    const cfg = typeof space === "object" ? parseDisplayConfig(space) : {};
    const candidates = [];
    if (typeof space === "string") {
      candidates.push(space);
    } else {
      candidates.push(space.id, space.title, cfg?.url);
    }
    const normalizedTargets = candidates.map(normalizeSpaceKey).filter(Boolean);
    const normalizedAllowed = widget.spaces.map(normalizeSpaceKey).filter(Boolean);
    return normalizedAllowed.some((value) => normalizedTargets.includes(value));
  };

  const globalWidgets = computed(() =>
    widgets.value.filter((widget) => widgetInSpace(widget, null))
  );

  const localWidgets = (space) =>
    widgets.value
      .filter((widget) => widgetInSpace(widget, space) && !widget.spaces.includes("*"))
      .sort((a, b) => {
        const aTech = a.id?.includes("admin") ? 1 : 0;
        const bTech = b.id?.includes("admin") ? 1 : 0;
        return aTech - bTech;
      });

  return {
    globalWidgets,
    localWidgets
  };
}
