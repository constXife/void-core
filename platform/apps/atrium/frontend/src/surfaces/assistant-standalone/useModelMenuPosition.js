import { nextTick, onBeforeUnmount, ref, watch } from "vue";

// Фиксированное меню в top-level portal не обрезается прокруткой диалога.
export function useModelMenuPosition(open, anchor) {
  const menuStyle = ref({});
  const place = () => {
    if (!anchor.value) return;
    const rect = anchor.value.getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    const margin = 12, gap = 8;
    const above = Math.max(0, rect.top - top - gap - margin);
    const below = Math.max(0, top + height - rect.bottom - gap - margin);
    const opensAbove = above >= below;
    const menuWidth = Math.min(448, Math.max(384, rect.width), width - margin * 2);
    menuStyle.value = {
      left: `${Math.max(left + margin, Math.min(rect.left, left + width - margin - menuWidth))}px`,
      width: `${menuWidth}px`,
      maxHeight: `${Math.min(352, opensAbove ? above : below)}px`,
      top: opensAbove ? "auto" : `${Math.max(top + margin, rect.bottom + gap)}px`,
      bottom: opensAbove ? `${window.innerHeight - Math.min(top + height - margin, rect.top - gap)}px` : "auto"
    };
  };
  const stop = () => {
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, true);
    window.visualViewport?.removeEventListener("resize", place);
    window.visualViewport?.removeEventListener("scroll", place);
  };
  watch(open, async (value) => {
    stop();
    if (!value) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    await nextTick();
    place();
  });
  onBeforeUnmount(stop);
  return menuStyle;
}
