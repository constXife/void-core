export function createDashboardDragListeners({
  blockGridPosition,
  blockId,
  blockLgLayout,
  blocksForSpace,
  dashboardDragging,
  dashboardDragGhost,
  metrics,
  space,
  updateDashboardBlocks,
  updateDashboardEditPanelPosition
}) {
  return {
    start: (event) => {
      dashboardDragging.value = true;
      const block = blocksForSpace(space.id).find((candidate) => candidate.id === blockId);
      if (!block) return;
      const layout = blockLgLayout(block);
      event.target.dataset.startX = String(layout.x || 1);
      event.target.dataset.startY = String(layout.y || 1);
      event.target.dataset.dragX = "0";
      event.target.dataset.dragY = "0";
      dashboardDragGhost.value = {
        spaceId: space.id,
        id: blockId,
        x: layout.x || 1,
        y: layout.y || 1,
        w: layout.w || 1,
        h: layout.h || 1
      };
    },
    move: (event) => {
      const target = event.target;
      const dragX = (parseFloat(target.dataset.dragX) || 0) + event.dx;
      const dragY = (parseFloat(target.dataset.dragY) || 0) + event.dy;
      target.dataset.dragX = String(dragX);
      target.dataset.dragY = String(dragY);
      target.style.transform = `translate(${dragX}px, ${dragY}px)`;

      const block = blocksForSpace(space.id).find((candidate) => candidate.id === blockId);
      if (!block) return;
      const layout = blockLgLayout(block);
      const position = blockGridPosition(
        { w: layout.w || 1 },
        metrics,
        Number(target.dataset.startX || 1),
        Number(target.dataset.startY || 1),
        dragX,
        dragY
      );
      dashboardDragGhost.value = {
        spaceId: space.id,
        id: blockId,
        x: position.x,
        y: position.y,
        w: layout.w || 1,
        h: layout.h || 1
      };
    },
    end: (event) => {
      dashboardDragging.value = false;
      const target = event.target;
      const block = blocksForSpace(space.id).find((candidate) => candidate.id === blockId);
      if (block) {
        const layout = blockLgLayout(block);
        const position = blockGridPosition(
          { w: layout.w || 1 },
          metrics,
          Number(target.dataset.startX || 1),
          Number(target.dataset.startY || 1),
          parseFloat(target.dataset.dragX) || 0,
          parseFloat(target.dataset.dragY) || 0
        );
        updateDashboardBlocks(space.id, (blocks) =>
          blocks.map((candidate) =>
            candidate.id === blockId
              ? {
                  ...candidate,
                  layout: {
                    ...candidate.layout,
                    lg: { ...blockLgLayout(candidate), x: position.x, y: position.y }
                  }
                }
              : candidate
          )
        );
      }
      target.style.transform = "translate(0px, 0px)";
      target.dataset.dragX = "0";
      target.dataset.dragY = "0";
      dashboardDragGhost.value = null;
      updateDashboardEditPanelPosition(space.id);
    }
  };
}

export function createDashboardResizeListeners({
  GRID_COLUMNS,
  GRID_GAP,
  blockId,
  blockLgLayout,
  blocksForSpace,
  dashboardDragging,
  dashboardDragGhost,
  metrics,
  space,
  updateDashboardBlocks,
  updateDashboardEditPanelPosition
}) {
  return {
    start: (event) => {
      dashboardDragging.value = true;
      const block = blocksForSpace(space.id).find((candidate) => candidate.id === blockId);
      if (!block) return;
      const layout = blockLgLayout(block);
      event.target.dataset.startW = String(layout.w || 1);
      event.target.dataset.startH = String(layout.h || 1);
      event.target.dataset.startX = String(layout.x || 1);
      dashboardDragGhost.value = {
        spaceId: space.id,
        id: blockId,
        x: layout.x || 1,
        y: layout.y || 1,
        w: layout.w || 1,
        h: layout.h || 1
      };
    },
    move: (event) => {
      event.target.style.width = `${event.rect.width}px`;
      event.target.style.height = `${event.rect.height}px`;
    },
    end: (event) => {
      dashboardDragging.value = false;
      const startW = Number(event.target.dataset.startW || 1);
      const startH = Number(event.target.dataset.startH || 1);
      const startX = Number(event.target.dataset.startX || 1);
      const nextW = Math.max(2, Math.round((event.rect.width + GRID_GAP) / metrics.stepX));
      const nextH = Math.max(2, Math.round((event.rect.height + GRID_GAP) / metrics.stepY));
      const maxW = Math.max(1, GRID_COLUMNS - startX + 1);
      const finalW = Math.min(Math.max(2, startW + (nextW - startW)), maxW);
      const finalH = Math.max(2, startH + (nextH - startH));
      updateDashboardBlocks(space.id, (blocks) =>
        blocks.map((candidate) =>
          candidate.id === blockId
            ? {
                ...candidate,
                layout: {
                  ...candidate.layout,
                  lg: { ...blockLgLayout(candidate), w: finalW, h: finalH }
                }
              }
            : candidate
        )
      );
      event.target.style.width = "";
      event.target.style.height = "";
      dashboardDragGhost.value = null;
      updateDashboardEditPanelPosition(space.id);
    }
  };
}
