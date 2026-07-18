import { tinykeys } from "tinykeys";

const isTypingTarget = (event) => {
  const target = event.target;
  if (!target) return false;
  const tag = target.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  return target.isContentEditable === true;
};

export function useAtriumAppListeners({
  currentIndex,
  handleGlobalClick,
  handleVisibilityChange,
  isMobile,
  resourcePopoverAnchor,
  resourcePopoverOpen,
  scrollToIndex,
  showShortcuts,
  spaces,
  updateResourcePopoverPlacement
}) {
  let hotkeysCleanup = null;
  let listenersRegistered = false;

  const updateViewport = () => {
    if (typeof window === "undefined") return;
    // Планшетный порог = 1024px, как у ассистент-поверхности (NARROW_QUERY) и CSS
    // shell/panel-брейкпоинтов. Ниже него виджет-дашборд стекается в колонку
    // (dashboard-grid-mobile), иначе жёсткая 12-колоночная сетка тесна на iPad.
    isMobile.value = window.matchMedia("(max-width: 1024px)").matches;
    if (resourcePopoverOpen.value && resourcePopoverAnchor.value) {
      updateResourcePopoverPlacement(resourcePopoverAnchor.value);
    }
  };

  const closeShortcuts = () => {
    showShortcuts.value = false;
  };

  const toggleShortcuts = (event) => {
    event?.preventDefault();
    showShortcuts.value = !showShortcuts.value;
  };

  const registerWindowListeners = () => {
    if (listenersRegistered || typeof window === "undefined") return;
    listenersRegistered = true;

    window.addEventListener("resize", updateViewport);
    document.addEventListener("click", handleGlobalClick);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    hotkeysCleanup = tinykeys(window, {
      "?": (event) => toggleShortcuts(event),
      Escape: (event) => {
        if (!showShortcuts.value) return;
        event.preventDefault();
        showShortcuts.value = false;
      },
      ArrowRight: (event) => {
        if (isTypingTarget(event)) return;
        scrollToIndex(Math.min(currentIndex.value + 1, spaces.value.length - 1));
      },
      ArrowLeft: (event) => {
        if (isTypingTarget(event)) return;
        scrollToIndex(Math.max(currentIndex.value - 1, 0));
      },
      KeyD: (event) => {
        if (isTypingTarget(event)) return;
        scrollToIndex(Math.min(currentIndex.value + 1, spaces.value.length - 1));
      },
      KeyA: (event) => {
        if (isTypingTarget(event)) return;
        scrollToIndex(Math.max(currentIndex.value - 1, 0));
      }
    });
  };

  const disposeWindowListeners = () => {
    if (!listenersRegistered || typeof window === "undefined") return;
    window.removeEventListener("resize", updateViewport);
    document.removeEventListener("click", handleGlobalClick);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    hotkeysCleanup?.();
    hotkeysCleanup = null;
    listenersRegistered = false;
  };

  return {
    closeShortcuts,
    disposeWindowListeners,
    registerWindowListeners,
    toggleShortcuts,
    updateViewport
  };
}
