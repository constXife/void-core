import interact from "interactjs";
import {
  createDashboardDragListeners,
  createDashboardResizeListeners
} from "./useAtriumDashboardInteractionHandlers.js";

export function createAtriumDashboardInteractions({
  GRID_COLUMNS,
  GRID_GAP,
  blockGridPosition,
  blockLgLayout,
  blocksForSpace,
  dashboardDragging,
  dashboardDragGhost,
  dashboardEditPanelStyle,
  dashboardEditSelectedId,
  getGridMetrics,
  isDashboardEditing,
  isMobile,
  updateDashboardBlocks
}) {
  let activeDashboardElements = [];

  const updateDashboardEditPanelPosition = (spaceId) => {
    if (!spaceId || !dashboardEditSelectedId.value) {
      dashboardEditPanelStyle.value = {};
      return;
    }
    const gridEl = document.querySelector(`[data-dashboard-grid="${spaceId}"]`);
    if (!gridEl) return;
    const blockEl = gridEl.querySelector(`[data-block-id="${dashboardEditSelectedId.value}"]`);
    if (!blockEl) return;
    const gridRect = gridEl.getBoundingClientRect();
    const blockRect = blockEl.getBoundingClientRect();
    const top = blockRect.top - gridRect.top + blockRect.height + 12;
    const left = Math.max(0, blockRect.left - gridRect.left);
    const maxLeft = Math.max(0, gridRect.width - 320);
    dashboardEditPanelStyle.value = {
      top: `${top}px`,
      left: `${Math.min(left, maxLeft)}px`
    };
  };

  const stopDashboardInteractions = () => {
    activeDashboardElements.forEach((el) => interact(el).unset());
    activeDashboardElements = [];
  };

  const initDashboardInteractions = (space) => {
    if (!space || !isDashboardEditing(space) || isMobile.value) return;
    const gridEl = document.querySelector(`[data-dashboard-grid="${space.id}"]`);
    const metrics = getGridMetrics(gridEl);
    if (!metrics) return;

    stopDashboardInteractions();

    const elements = gridEl.querySelectorAll(`[data-space-id="${space.id}"][data-block-id]`);
    elements.forEach((el) => {
      const blockId = el.getAttribute("data-block-id");
      if (!blockId) return;
      const currentBlock = blocksForSpace(space.id).find((block) => block.id === blockId);
      if (!currentBlock) return;

      el.dataset.x = "0";
      el.dataset.y = "0";
      el.style.transform = "translate(0px, 0px)";

      const context = {
        blockId,
        blockLgLayout,
        blocksForSpace,
        dashboardDragging,
        dashboardDragGhost,
        metrics,
        space,
        updateDashboardBlocks,
        updateDashboardEditPanelPosition
      };
      const draggable = interact(el).draggable({
        inertia: true,
        modifiers: [interact.modifiers.restrictRect({ restriction: gridEl, endOnly: true })],
        listeners: createDashboardDragListeners({ ...context, blockGridPosition })
      });

      interact(el).resizable({
        edges: {
          right: ".dashboard-resize-handle",
          bottom: ".dashboard-resize-handle"
        },
        modifiers: [
          interact.modifiers.snapSize({
            targets: [interact.snappers.grid({ x: metrics.stepX, y: metrics.stepY })],
            range: Math.max(metrics.stepX, metrics.stepY) * 0.75
          }),
          interact.modifiers.restrictEdges({ outer: gridEl, endOnly: true })
        ],
        listeners: createDashboardResizeListeners({ ...context, GRID_COLUMNS, GRID_GAP })
      });

      activeDashboardElements.push(el);
      draggable.resizable = true;
    });
  };

  return {
    initDashboardInteractions,
    stopDashboardInteractions,
    updateDashboardEditPanelPosition
  };
}
