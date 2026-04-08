const GRID_COLUMNS = 12;
const GRID_GAP = 12;
const GRID_ROW_HEIGHT = 48;

export const createDashboardEditForm = (type) => ({
  title: "",
  type,
  x: 1,
  y: 1,
  w: 6,
  h: 2,
  order: 1,
  limit: 8,
  scope: "this",
  filter: "",
  text: ""
});

export const createInlineAddForm = () => ({
  title: "",
  body: "",
  url: "",
  priority: "normal",
  pinned: false
});

export function createAtriumDashboardModel({ BLOCK_TYPES, isMobile, t }) {
  const normalizeBlockType = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return BLOCK_TYPES.resourcesPinned;
    if (raw === "resources_pinned") return BLOCK_TYPES.resourcesPinned;
    if (raw === "calendar_upcoming") return BLOCK_TYPES.calendarUpcoming;
    if (raw === "text") return BLOCK_TYPES.text;
    if (raw === "core.text") return BLOCK_TYPES.text;
    if (raw.startsWith("core.") || raw.startsWith("plugin.")) return raw;
    return raw;
  };

  const defaultBlockConfig = (type) => {
    switch (normalizeBlockType(type)) {
      case BLOCK_TYPES.resourcesPinned:
        return { limit: 12, scope: "this", filter: "pinned" };
      case BLOCK_TYPES.calendarUpcoming:
        return { limit: 8, scope: "this", filter: "" };
      case BLOCK_TYPES.text:
        return { text: "", scope: "this", filter: "" };
      default:
        return { limit: 8, scope: "this", filter: "" };
    }
  };

  const normalizeBlockLayout = (block, index = 0) => {
    const legacyX = Number(block?.x || 1);
    const legacyY = Number(block?.y || 1);
    const legacyW = Number(block?.w || 6);
    const legacyH = Number(block?.h || 2);
    const legacyOrder = Number(block?.order || index + 1);
    const layout = block?.layout || {};
    const lg = layout.lg || { x: legacyX, y: legacyY, w: legacyW, h: legacyH };
    const xs = layout.xs || { order: legacyOrder };
    return {
      lg: {
        x: Number(lg.x || 1),
        y: Number(lg.y || 1),
        w: Number(lg.w || 6),
        h: Number(lg.h || 2)
      },
      xs: {
        order: Number(xs.order || legacyOrder)
      }
    };
  };

  const normalizeBlock = (block, index = 0) => {
    const normalizedType = normalizeBlockType(block?.type);
    return {
      ...block,
      type: normalizedType,
      layout: normalizeBlockLayout(block, index),
      config: block?.config ? { ...block.config } : defaultBlockConfig(normalizedType)
    };
  };

  const blockOrderValue = (block, fallback = 0) => {
    const order = block?.layout?.xs?.order;
    if (Number.isFinite(Number(order))) return Number(order);
    if (Number.isFinite(Number(block?.order))) return Number(block.order);
    return fallback;
  };

  const blockLgLayout = (block) => block?.layout?.lg || normalizeBlockLayout(block).lg;

  const blockGridPosition = (block, metrics, startX, startY, deltaX, deltaY) => {
    if (!metrics) return { x: startX, y: startY };
    const deltaCols = Math.round(deltaX / metrics.stepX);
    const deltaRows = Math.round(deltaY / metrics.stepY);
    const maxX = Math.max(1, GRID_COLUMNS - (block.w || 1) + 1);
    const nextX = Math.min(Math.max(1, startX + deltaCols), maxX);
    const nextY = Math.max(1, startY + deltaRows);
    return { x: nextX, y: nextY };
  };

  const findNextBlockPlacement = (blocks, width = 6, height = 2) => {
    const rects = blocks.map((block) => {
      const layout = blockLgLayout(block);
      return {
        x: layout.x || 1,
        y: layout.y || 1,
        w: layout.w || 1,
        h: layout.h || 1
      };
    });
    const maxY = rects.reduce((acc, rect) => Math.max(acc, rect.y + rect.h), 1);
    for (let y = 1; y <= maxY + 6; y++) {
      for (let x = 1; x <= GRID_COLUMNS - width + 1; x++) {
        const candidate = { x, y, w: width, h: height };
        const overlaps = rects.some((rect) => {
          return !(
            candidate.x + candidate.w - 1 < rect.x ||
            rect.x + rect.w - 1 < candidate.x ||
            candidate.y + candidate.h - 1 < rect.y ||
            rect.y + rect.h - 1 < candidate.y
          );
        });
        if (!overlaps) {
          return { x, y };
        }
      }
    }
    return { x: 1, y: maxY + 1 };
  };

  const isResourcesBlock = (block) =>
    normalizeBlockType(block?.type) === BLOCK_TYPES.resourcesPinned;

  const blockTypeIs = (block, type) => normalizeBlockType(block?.type) === type;

  const blockTypeLabel = (block) => {
    const normalized = normalizeBlockType(block?.type);
    switch (normalized) {
      case BLOCK_TYPES.resourcesPinned:
        return t("block.type.resourcesPinned");
      case BLOCK_TYPES.calendarUpcoming:
        return t("block.type.calendarUpcoming");
      case BLOCK_TYPES.text:
        return t("block.type.text");
      default:
        return normalized;
    }
  };

  const blockOrderMapFromBlocks = (blocks) =>
    blocks.reduce((acc, block, idx) => {
      if (block.id) {
        acc[block.id] = blockOrderValue(block, idx + 1);
      }
      return acc;
    }, {});

  const blockStyle = (block, orderMap) => {
    const layout = blockLgLayout(block);
    const styles = {
      gridColumn: `${layout.x || 1} / span ${layout.w || 4}`,
      gridRow: `${layout.y || 1} / span ${layout.h || 2}`
    };
    if (isMobile.value) {
      styles.order = orderMap[block.id] ?? 0;
    }
    return styles;
  };

  const blockTitle = (block) => block.title || blockTypeLabel(block) || "Block";

  const getGridMetrics = (gridEl) => {
    if (!gridEl) return null;
    const width = gridEl.clientWidth;
    const columnWidth = (width - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
    const stepX = columnWidth + GRID_GAP;
    const stepY = GRID_ROW_HEIGHT + GRID_GAP;
    return { columnWidth, stepX, stepY };
  };

  return {
    GRID_COLUMNS,
    defaultBlockConfig,
    findNextBlockPlacement,
    getGridMetrics,
    blockGridPosition,
    blockLgLayout,
    blockOrderMapFromBlocks,
    blockOrderValue,
    blockStyle,
    blockTitle,
    blockTypeIs,
    blockTypeLabel,
    isResourcesBlock,
    normalizeBlock,
    normalizeBlockLayout,
    normalizeBlockType
  };
}
