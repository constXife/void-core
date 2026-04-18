import { nextTick, ref } from "vue";
import interact from "interactjs";
import {
  createAtriumDashboardModel,
  createDashboardEditForm,
  createInlineAddForm
} from "./useAtriumDashboardModel.js";
import {
  calendarUpcomingQueryFromBlock,
  inventorySummaryQueryFromBlock,
  isCalendarUpcomingBlock,
  isInventorySummaryBlock
} from "../lib/dashboard-block-data.js";
import { prefersProvisioningDashboard } from "../lib/dashboard-source.js";

export function useAtriumDashboard({
  BLOCK_TYPES,
  canManage,
  fetchJSON,
  isMobile,
  isPublicReadonlySpace,
  notify,
  parseDisplayConfig,
  showAdmin,
  spaces,
  spacesAdmin,
  t,
  withRoleOverride
}) {
  const dashboards = ref({});
  const dashboardData = ref({});
  const dashboardLoading = ref({});
  const showDashboardEditor = ref(false);
  const dashboardEditorSpace = ref(null);
  const dashboardEditorBlocks = ref([]);
  const dashboardEditorOrder = ref([]);
  const dashboardEditorSaving = ref(false);
  const dashboardEditorProvisioningSnapshot = ref(null);
  const dashboardEditorProvisioningLoading = ref(false);
  const dashboardEditSpaceId = ref(null);
  const dashboardEditDirty = ref(false);
  const dashboardEditSelectedId = ref(null);
  const dashboardEditAdvanced = ref(false);
  const dashboardDragging = ref(false);
  const dashboardDragGhost = ref(null);
  const dashboardAddOpen = ref(false);
  const dashboardEditPanelStyle = ref({});
  const dashboardEditNewType = ref(BLOCK_TYPES.resourcesPinned);
  const dashboardEditForm = ref(createDashboardEditForm(BLOCK_TYPES.resourcesPinned));
  const dashboardPreviewRole = ref("admin");

  const inlineEditBlock = ref(null);
  const inlineEditPopover = ref(null);
  const inlineEditAdvanced = ref(false);
  const inlineEditForm = ref(createDashboardEditForm(BLOCK_TYPES.resourcesPinned));
  const inlineAddForm = ref(createInlineAddForm());

  const dashboardPath = () => "/atrium/dashboard/save";
  const workspacePath = (spaceId) => {
    const normalized = String(spaceId || "").trim();
    if (!normalized) return "/atrium/workspace";
    return `/atrium/workspace?space_id=${encodeURIComponent(normalized)}`;
  };
  const canEditDashboardSpace = (space) => prefersProvisioningDashboard(space);

  let activeDashboardElements = [];

  const {
    GRID_COLUMNS,
    GRID_GAP,
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
    normalizeBlockType
  } = createAtriumDashboardModel({
    BLOCK_TYPES,
    isMobile,
    t
  });

  const coerceDashboardBlocks = (value) => {
    try {
      const rawBlocks = Array.isArray(value)
        ? value
        : typeof value === "string" && value.trim()
          ? JSON.parse(value)
          : [];
      return rawBlocks.map((block, idx) => normalizeBlock(block, idx));
    } catch {
      return [];
    }
  };

  const coerceDashboardOrder = (value, blocks) => {
    let parsed = [];
    try {
      parsed = Array.isArray(value)
        ? value
        : typeof value === "string" && value.trim()
          ? JSON.parse(value)
          : [];
    } catch {
      parsed = [];
    }
    const blockIDs = new Set(blocks.map((block) => block.id).filter(Boolean));
    const normalized = parsed
      .map((entry) => String(entry || "").trim())
      .filter((id) => id && blockIDs.has(id));
    const seen = new Set(normalized);
    const missing = blocks
      .slice()
      .sort((left, right) => blockOrderValue(left, 0) - blockOrderValue(right, 0))
      .map((block) => block.id)
      .filter((id) => id && !seen.has(id));
    return [...normalized, ...missing];
  };

  const createDashboardState = ({
    space = {},
    blocks = [],
    order = [],
    source = "canonical",
    templateID = null,
    templateKey = "",
    templateVersion = 0
  } = {}) => ({
    space,
    blocks: blocks.map((block, idx) => normalizeBlock(block, idx)),
    order: coerceDashboardOrder(order, blocks.map((block, idx) => normalizeBlock(block, idx))),
    source,
    templateID,
    templateKey: String(templateKey || ""),
    templateVersion: Number(templateVersion || 0)
  });

  const dashboardStateFromMutationPayload = (space, payload) => {
    const currentSpace = payload?.workspace?.current_space;
    const dashboard = currentSpace?.dashboard;
    const blocks = coerceDashboardBlocks(dashboard?.blocks);
    return createDashboardState({
      space: currentSpace || space || {},
      blocks,
      order: dashboard?.block_order,
      source: "canonical",
      templateID: null,
      templateKey:
        currentSpace?.display_config?.dashboard_template_key ||
        currentSpace?.template ||
        payload?.template_id ||
        "",
      templateVersion: 0
    });
  };

  const dashboardStateFromWorkspacePayload = (space, payload) => {
    const currentSpace = payload?.workspace?.current_space;
    const dashboard = currentSpace?.dashboard;
    const blocks = coerceDashboardBlocks(dashboard?.blocks);
    return createDashboardState({
      space: currentSpace || space || {},
      blocks,
      order: dashboard?.block_order,
      source: "canonical",
      templateID: null,
      templateKey:
        currentSpace?.display_config?.dashboard_template_key ||
        currentSpace?.template ||
        "",
      templateVersion: 0
    });
  };

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

  const buildDashboardEditForm = (block) => {
    const normalized = normalizeBlock(block);
    const layout = blockLgLayout(normalized);
    const config = normalized.config || defaultBlockConfig(normalized.type);
    return {
      title: normalized.title || "",
      type: normalized.type || BLOCK_TYPES.resourcesPinned,
      x: layout.x || 1,
      y: layout.y || 1,
      w: layout.w || 6,
      h: layout.h || 2,
      order: blockOrderValue(normalized, 1),
      limit: config.limit ?? defaultBlockConfig(normalized.type).limit,
      scope: config.scope || "this",
      filter: config.filter || "",
      text: config.text || ""
    };
  };

  const hasDashboard = (space) => {
    const dash = dashboards.value[space.id];
    if (Array.isArray(dash?.blocks)) {
      return dash.blocks.length > 0;
    }
    const cfg = parseDisplayConfig(space);
    return cfg.use_dashboard === true || cfg.dashboard_template_key;
  };

  const dashboardForSpace = (spaceId) => dashboards.value[spaceId] || null;

  const blocksForSpace = (spaceId) => {
    const dash = dashboardForSpace(spaceId);
    return Array.isArray(dash?.blocks) ? dash.blocks.map((block) => ({ ...block })) : [];
  };

  const blockOrderForSpace = (spaceId, blocks) => {
    const dash = dashboardForSpace(spaceId);
    const normalizedBlocks = Array.isArray(blocks) ? blocks : blocksForSpace(spaceId);
    return coerceDashboardOrder(dash?.order, normalizedBlocks);
  };

  const blockOrderMapForSpace = (spaceId) => {
    const blocks = blocksForSpace(spaceId);
    const order = blockOrderForSpace(spaceId, blocks);
    return order.reduce((acc, id, idx) => {
      acc[id] = idx + 1;
      return acc;
    }, {});
  };

  const blockDataFor = (spaceId, blockId) =>
    dashboardData.value[spaceId]?.[blockId] || [];

  const blockDataCount = (spaceId, blockId) => {
    const data = dashboardData.value[spaceId]?.[blockId];
    if (Array.isArray(data)) return data.length;
    if (data && typeof data === "object") return Object.keys(data).length;
    return 0;
  };

  const updateDashboardBlockData = (spaceId, blockId, updater) => {
    if (!spaceId || !blockId) return;
    const spaceData = dashboardData.value[spaceId] || {};
    const current = Array.isArray(spaceData[blockId]) ? spaceData[blockId] : [];
    dashboardData.value = {
      ...dashboardData.value,
      [spaceId]: {
        ...spaceData,
        [blockId]: updater(current.map((entry) => ({ ...entry })))
      }
    };
  };

  const removeDashboardItemFromSpaceData = (spaceId, itemId) => {
    if (!spaceId || !itemId) return;
    const spaceData = dashboardData.value[spaceId];
    if (!spaceData || typeof spaceData !== "object") return;
    const nextEntries = Object.fromEntries(
      Object.entries(spaceData).map(([blockId, items]) => [
        blockId,
        Array.isArray(items) ? items.filter((entry) => entry?.id !== itemId) : items
      ])
    );
    dashboardData.value = {
      ...dashboardData.value,
      [spaceId]: nextEntries
    };
  };

  const loadWorkspacePayload = async (space) =>
    await fetchJSON(withRoleOverride(workspacePath(space?.id || space?.provisioning_space_id)));

  const currentSpaceFromWorkspacePayload = (payload) => payload?.workspace?.current_space || null;

  const workspaceEntriesFromPayload = (payload) => {
    const items = payload?.workspace?.current_space?.entries?.items;
    return Array.isArray(items) ? items : [];
  };

  const filterProvisioningItemsForBlock = (items, block, audience = "") => {
    if (!isResourcesBlock(block)) return [];
    const normalized = normalizeBlock(block);
    const filter = String(normalized?.config?.filter || "").trim().toLowerCase();
    const role = String(audience || "").trim().toLowerCase();
    let next = Array.isArray(items) ? items.map((item) => ({ ...item })) : [];
    if (filter === "pinned") {
      next = next.filter((item) => item?.pinned);
    }
    if (role && role !== "admin") {
      next = next.filter((item) => {
        const groups = Array.isArray(item?.audience_groups)
          ? item.audience_groups.map((entry) => String(entry || "").trim().toLowerCase())
          : [];
        return groups.length === 0 || groups.includes(role);
      });
    }
    const limit = Number(normalized?.config?.limit || 0);
    return limit > 0 ? next.slice(0, limit) : next;
  };

  const loadProvisioningDashboardBlockData = async (space, blocks) => {
    if (!space?.id) return;
    if (!Array.isArray(blocks) || blocks.length === 0) {
      dashboardData.value = { ...dashboardData.value, [space.id]: {} };
      return;
    }
    const workspacePayload = await loadWorkspacePayload(space);
    const resources = blocks.some((block) => isResourcesBlock(block))
      ? workspaceEntriesFromPayload(workspacePayload)
      : [];
    const nextEntries = Object.fromEntries(
      await Promise.all(
        blocks.map(async (block) => {
          if (isResourcesBlock(block)) {
            return [block.id, resources];
          }
          if (isCalendarUpcomingBlock(block)) {
            try {
              const params = new URLSearchParams();
              const query = calendarUpcomingQueryFromBlock(block);
              params.set("window", query.window);
              params.set("include_archived", String(query.include_archived));
              params.set("include_reminders", String(query.include_reminders));
              params.set("limit", String(query.limit));
              return [
                block.id,
                await fetchJSON(`/api/knowledge/v1/calendar/upcoming?${params.toString()}`)
              ];
            } catch {
              return [block.id, {}];
            }
          }
          if (isInventorySummaryBlock(block)) {
            try {
              const params = new URLSearchParams();
              const query = inventorySummaryQueryFromBlock(block);
              params.set("slice", query.slice);
              params.set("include_archived", String(query.include_archived));
              params.set("attention_limit", String(query.attention_limit));
              return [
                block.id,
                await fetchJSON(`/api/knowledge/v1/inventory/summary?${params.toString()}`)
              ];
            } catch {
              return [block.id, {}];
            }
          }
          return [block.id, {}];
        })
      )
    );
    dashboardData.value = {
      ...dashboardData.value,
      [space.id]: nextEntries
    };
  };

  const loadProvisioningDashboardPreviewData = async (space, blocks, audience = "") => {
    if (!space?.id) return;
    if (!Array.isArray(blocks) || blocks.length === 0) {
      dashboardData.value = { ...dashboardData.value, [space.id]: {} };
      return;
    }
    const workspacePayload = await loadWorkspacePayload(space);
    const resources = blocks.some((block) => isResourcesBlock(block))
      ? workspaceEntriesFromPayload(workspacePayload)
      : [];
    const nextEntries = Object.fromEntries(
      await Promise.all(
        blocks.map(async (block) => {
          if (isResourcesBlock(block)) {
            return [block.id, filterProvisioningItemsForBlock(resources, block, audience)];
          }
          if (isCalendarUpcomingBlock(block)) {
            try {
              const params = new URLSearchParams();
              const query = calendarUpcomingQueryFromBlock(block);
              params.set("window", query.window);
              params.set("include_archived", String(query.include_archived));
              params.set("include_reminders", String(query.include_reminders));
              params.set("limit", String(query.limit));
              return [
                block.id,
                await fetchJSON(`/api/knowledge/v1/calendar/upcoming?${params.toString()}`)
              ];
            } catch {
              return [block.id, {}];
            }
          }
          if (isInventorySummaryBlock(block)) {
            try {
              const params = new URLSearchParams();
              const query = inventorySummaryQueryFromBlock(block);
              params.set("slice", query.slice);
              params.set("include_archived", String(query.include_archived));
              params.set("attention_limit", String(query.attention_limit));
              return [
                block.id,
                await fetchJSON(`/api/knowledge/v1/inventory/summary?${params.toString()}`)
              ];
            } catch {
              return [block.id, {}];
            }
          }
          return [block.id, {}];
        })
      )
    );
    dashboardData.value = {
      ...dashboardData.value,
      [space.id]: nextEntries
    };
  };

  const resolveSpaceDatabaseId = (databaseId, spaceSlug) => {
    const numeric = Number(databaseId);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
    if (spaceSlug) {
      const fromSpaces = spaces.value.find((space) => space.id === spaceSlug);
      const spaceDatabaseId = Number(fromSpaces?.database_id);
      if (Number.isFinite(spaceDatabaseId) && spaceDatabaseId > 0) return spaceDatabaseId;
      const fromAdmin = spacesAdmin.value.find(
        (space) => space.slug === spaceSlug || String(space.id) === String(spaceSlug)
      );
      const adminId = Number(fromAdmin?.id);
      if (Number.isFinite(adminId) && adminId > 0) return adminId;
    }
    return null;
  };

  const isDashboardEditing = (space) =>
    !!space && dashboardEditSpaceId.value === space.id;

  const syncDashboardEditForm = (spaceId) => {
    if (!dashboardEditSelectedId.value) return;
    const selected = blocksForSpace(spaceId).find(
      (block) => block.id === dashboardEditSelectedId.value
    );
    if (selected) {
      dashboardEditForm.value = buildDashboardEditForm(selected);
      nextTick().then(() => updateDashboardEditPanelPosition(spaceId));
    }
  };

  const updateDashboardBlocks = (spaceId, updater) => {
    const existing = dashboards.value[spaceId];
    const dash = existing ||
      createDashboardState({
        space: spaces.value.find((space) => space.id === spaceId) || {},
        blocks: [],
        order: []
      });
    const normalized = Array.isArray(dash.blocks)
      ? dash.blocks.map((block) => ({ ...block }))
      : [];
    const updatedBlocks = updater(normalized.map((block) => ({ ...block })));
    dashboards.value = {
      ...dashboards.value,
      [spaceId]: {
        ...dash,
        blocks: updatedBlocks.map((block, idx) => normalizeBlock(block, idx)),
        order: coerceDashboardOrder(dash.order, updatedBlocks)
      }
    };
    dashboardEditDirty.value = true;
    if (dashboardEditSpaceId.value === spaceId) {
      syncDashboardEditForm(spaceId);
      nextTick().then(() => updateDashboardEditPanelPosition(spaceId));
    }
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

      const draggable = interact(el).draggable({
        inertia: true,
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: gridEl,
            endOnly: true
          })
        ],
        listeners: {
          start: (event) => {
            dashboardDragging.value = true;
            const block = blocksForSpace(space.id).find((b) => b.id === blockId);
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

            const startX = Number(target.dataset.startX || 1);
            const startY = Number(target.dataset.startY || 1);
            const block = blocksForSpace(space.id).find((b) => b.id === blockId);
            if (block) {
              const layout = blockLgLayout(block);
              const position = blockGridPosition(
                { w: layout.w || 1 },
                metrics,
                startX,
                startY,
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
            }
          },
          end: (event) => {
            dashboardDragging.value = false;
            const target = event.target;
            const startX = Number(target.dataset.startX || 1);
            const startY = Number(target.dataset.startY || 1);
            const dx = parseFloat(target.dataset.dragX) || 0;
            const dy = parseFloat(target.dataset.dragY) || 0;
            const block = blocksForSpace(space.id).find((b) => b.id === blockId);
            if (block) {
              const layout = blockLgLayout(block);
              const position = blockGridPosition(
                { w: layout.w || 1 },
                metrics,
                startX,
                startY,
                dx,
                dy
              );
              updateDashboardBlocks(space.id, (blocks) =>
                blocks.map((b) =>
                  b.id === blockId
                    ? {
                        ...b,
                        layout: {
                          ...b.layout,
                          lg: { ...blockLgLayout(b), x: position.x, y: position.y }
                        }
                      }
                    : b
                )
              );
            }
            target.style.transform = "translate(0px, 0px)";
            target.dataset.dragX = "0";
            target.dataset.dragY = "0";
            dashboardDragGhost.value = null;
            updateDashboardEditPanelPosition(space.id);
          }
        }
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
          interact.modifiers.restrictEdges({
            outer: gridEl,
            endOnly: true
          })
        ],
        listeners: {
          start: (event) => {
            dashboardDragging.value = true;
            const block = blocksForSpace(space.id).find((b) => b.id === blockId);
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
            const width = event.rect.width;
            const height = event.rect.height;
            const nextW = Math.max(2, Math.round((width + GRID_GAP) / metrics.stepX));
            const nextH = Math.max(2, Math.round((height + GRID_GAP) / metrics.stepY));
            const maxW = Math.max(1, GRID_COLUMNS - startX + 1);
            const finalW = Math.min(Math.max(2, startW + (nextW - startW)), maxW);
            const finalH = Math.max(2, startH + (nextH - startH));
            updateDashboardBlocks(space.id, (blocks) =>
              blocks.map((b) =>
                b.id === blockId
                  ? {
                      ...b,
                      layout: {
                        ...b.layout,
                        lg: { ...blockLgLayout(b), w: finalW, h: finalH }
                      }
                    }
                  : b
              )
            );
            event.target.style.width = "";
            event.target.style.height = "";
            dashboardDragGhost.value = null;
            updateDashboardEditPanelPosition(space.id);
          }
        }
      });

      activeDashboardElements.push(el);
      draggable.resizable = true;
    });
  };

  const setDashboardEditSelection = (spaceId, blockId) => {
    dashboardEditSelectedId.value = blockId;
    dashboardEditAdvanced.value = false;
    const selected = blocksForSpace(spaceId).find((block) => block.id === blockId);
    if (selected) {
      dashboardEditForm.value = buildDashboardEditForm(selected);
      nextTick().then(() => updateDashboardEditPanelPosition(spaceId));
    }
  };

  const applyDashboardEditForm = (spaceId) => {
    if (!dashboardEditSelectedId.value) return;
    const form = dashboardEditForm.value;
    updateDashboardBlocks(spaceId, (blocks) =>
      blocks.map((block) =>
        block.id === dashboardEditSelectedId.value
          ? {
              ...block,
              title: form.title,
              type: form.type,
              layout: {
                ...block.layout,
                lg: {
                  ...blockLgLayout(block),
                  x: Number(form.x || 1),
                  y: Number(form.y || 1),
                  w: Number(form.w || 6),
                  h: Number(form.h || 2)
                },
                xs: {
                  order: Number(form.order || 1)
                }
              },
              config: {
                limit: Number(form.limit || 0) || defaultBlockConfig(form.type).limit,
                scope: form.scope || "this",
                filter: form.filter || "",
                text: form.text || ""
              }
            }
          : block
      )
    );
  };

  const addDashboardBlockDraft = (space, overrideType = null) => {
    if (!space) return;
    const spaceId = space.id;
    const blocks = blocksForSpace(spaceId);
    const nextOrder = blocks.length + 1;
    const placement = findNextBlockPlacement(blocks, 6, 2);
    const nextType = overrideType || dashboardEditNewType.value || BLOCK_TYPES.resourcesPinned;
    const newBlock = normalizeBlock(
      {
        id: `block-${Date.now()}`,
        type: nextType,
        title: "",
        layout: {
          lg: { x: placement.x, y: placement.y, w: 6, h: 2 },
          xs: { order: nextOrder }
        },
        config: defaultBlockConfig(nextType)
      },
      nextOrder - 1
    );
    updateDashboardBlocks(spaceId, (items) => [...items, newBlock]);
    setDashboardEditSelection(spaceId, newBlock.id);
    if (dashboardEditSpaceId.value === spaceId) {
      nextTick().then(() => initDashboardInteractions(space));
    }
  };

  const openAddBlockPicker = () => {
    dashboardAddOpen.value = true;
  };

  const closeAddBlockPicker = () => {
    dashboardAddOpen.value = false;
  };

  const addBlockFromPicker = (space, type) => {
    addDashboardBlockDraft(space, type);
    closeAddBlockPicker();
  };

  const deleteDashboardBlockDraft = (space, blockId) => {
    if (!space || !blockId) return;
    updateDashboardBlocks(space.id, (blocks) => blocks.filter((block) => block.id !== blockId));
    if (dashboardEditSelectedId.value === blockId) {
      const remaining = blocksForSpace(space.id);
      dashboardEditSelectedId.value = remaining[0]?.id || null;
      if (dashboardEditSelectedId.value) {
        dashboardEditForm.value = buildDashboardEditForm(remaining[0]);
      }
    }
  };

  const loadDashboardPreview = async (space, roleOverride, blocksOverride = null) => {
    if (!space?.id) return;
    const blocks =
      Array.isArray(blocksOverride) && blocksOverride.length > 0
        ? blocksOverride
        : blocksForSpace(space.id);
    try {
      await loadProvisioningDashboardPreviewData(space, blocks, roleOverride);
    } catch (err) {
      console.error("Failed to load preview data:", err);
    }
  };

  const onPreviewRoleChange = async () => {
    if (!dashboardEditorSpace.value) return;
    await loadDashboardPreview(
      dashboardEditorSpace.value,
      dashboardPreviewRole.value,
      dashboardEditorBlocks.value
    );
  };

  const startDashboardEdit = async (space) => {
    if (!space || !canManage.value || isMobile.value || (isPublicReadonlySpace(space) && !showAdmin.value)) return;
    if (!canEditDashboardSpace(space)) {
      return;
    }
    dashboardEditSpaceId.value = space.id;
    dashboardEditDirty.value = false;
    const blocks = blocksForSpace(space.id);
    if (blocks.length > 0) {
      setDashboardEditSelection(space.id, blocks[0].id);
    } else {
      dashboardEditSelectedId.value = null;
    }
    await nextTick();
    initDashboardInteractions(space);
    updateDashboardEditPanelPosition(space.id);
  };

  const stopDashboardEdit = () => {
    dashboardEditSpaceId.value = null;
    dashboardEditDirty.value = false;
    dashboardEditSelectedId.value = null;
    dashboardEditPanelStyle.value = {};
    stopDashboardInteractions();
  };

  const toggleDashboardEdit = async (space) => {
    if (isDashboardEditing(space)) {
      stopDashboardEdit();
      return;
    }
    await startDashboardEdit(space);
  };

  const saveDashboardLayout = async (space) => {
    if (!space || (isPublicReadonlySpace(space) && !showAdmin.value)) return;
    if (!canEditDashboardSpace(space)) {
      return;
    }
    dashboardEditorSaving.value = true;
    try {
      const blocks = blocksForSpace(space.id);
      const payload = {
        space_id: space.id,
        blocks,
        block_order: blockOrderForSpace(space.id, blocks)
      };
      const updated = await fetchJSON(withRoleOverride(dashboardPath()), {
        method: "POST",
        body: JSON.stringify(payload)
      });
      await syncDashboardAfterSave(space, updated);
      dashboardEditDirty.value = false;
      notify(t("app.saveDone"), "success");
    } catch (err) {
      notify(err.message || t("app.saveFailed"), "error");
    } finally {
      dashboardEditorSaving.value = false;
    }
  };

  const loadProvisioningDashboardSnapshot = async (space) => {
    if (!space?.id) {
      return null;
    }
    try {
      const payload = await loadWorkspacePayload(space);
      const currentSpace = currentSpaceFromWorkspacePayload(payload);
      if (!currentSpace) return null;
      return {
        space: currentSpace,
        template: {
          key: currentSpace?.display_config?.dashboard_template_key || currentSpace?.template || ""
        },
        blocks: Array.isArray(currentSpace?.dashboard?.blocks) ? currentSpace.dashboard.blocks : []
      };
    } catch (err) {
      return null;
    }
  };

  const loadDashboardProvisioningSnapshot = async (space) => {
    dashboardEditorProvisioningLoading.value = true;
    try {
      dashboardEditorProvisioningSnapshot.value = await loadProvisioningDashboardSnapshot(space);
    } catch (err) {
      console.error("Failed to load provisioning dashboard snapshot:", err);
      dashboardEditorProvisioningSnapshot.value = null;
    } finally {
      dashboardEditorProvisioningLoading.value = false;
    }
  };

  const provisioningBlocksFromSnapshot = (snapshot) => {
    const rawBlocks = Array.isArray(snapshot?.blocks)
      ? snapshot.blocks
      : [];
    const seeded = [];
    for (const [index, block] of rawBlocks.entries()) {
      const nextType = normalizeBlockType(block?.type || BLOCK_TYPES.resourcesPinned);
      const hasExplicitLayout =
        (block?.layout && typeof block.layout === "object") ||
        Number.isFinite(Number(block?.x)) ||
        Number.isFinite(Number(block?.y)) ||
        Number.isFinite(Number(block?.w)) ||
        Number.isFinite(Number(block?.h));
      const placement = hasExplicitLayout ? null : findNextBlockPlacement(seeded, 6, 2);
      const sourceBlock = {
        id: String(block?.id || `canonical-${index + 1}`),
        type: nextType,
        title: String(block?.title || ""),
        contract:
          block?.contract && typeof block.contract === "object"
            ? { ...block.contract }
            : undefined,
        config:
          block?.config && typeof block.config === "object"
            ? { ...block.config }
            : defaultBlockConfig(nextType),
        layout:
          block?.layout && typeof block.layout === "object"
            ? {
                ...block.layout,
                lg:
                  block.layout?.lg && typeof block.layout.lg === "object"
                    ? { ...block.layout.lg }
                    : undefined,
                xs:
                  block.layout?.xs && typeof block.layout.xs === "object"
                    ? { ...block.layout.xs }
                    : undefined
              }
            : placement
              ? {
                  lg: { x: placement.x, y: placement.y, w: 6, h: 2 },
                  xs: { order: index + 1 }
                }
              : undefined,
        x: block?.x,
        y: block?.y,
        w: block?.w,
        h: block?.h,
        order: block?.order
      };
      seeded.push(normalizeBlock(sourceBlock, index));
    }
    return seeded;
  };

  const provisioningBlocksForEditor = () =>
    provisioningBlocksFromSnapshot(dashboardEditorProvisioningSnapshot.value);

  const loadDashboardReadModel = async (space, force = false) => {
    if (!space?.id) return;
    dashboardLoading.value = { ...dashboardLoading.value, [space.id]: true };
    try {
      const payload = await loadWorkspacePayload(space);
      dashboards.value = {
        ...dashboards.value,
        [space.id]: dashboardStateFromWorkspacePayload(space, payload)
      };
      await loadProvisioningDashboardBlockData(space, blocksForSpace(space.id));
    } finally {
      dashboardLoading.value = { ...dashboardLoading.value, [space.id]: false };
    }
  };

  const syncDashboardAfterSave = async (space, updated) => {
    if (!space?.id) return;
    dashboards.value = {
      ...dashboards.value,
      [space.id]: dashboardStateFromMutationPayload(space, updated)
    };
    await loadProvisioningDashboardBlockData(space, blocksForSpace(space.id));
    if (dashboardEditorSpace.value?.id === space.id) {
      await loadDashboardProvisioningSnapshot(space);
    }
  };

  const applyProvisioningSnapshotToEditor = async () => {
    if (!dashboardEditorSpace.value) return;
    const blocks = provisioningBlocksForEditor();
    dashboardEditorBlocks.value = blocks.map((block) => ({ ...block }));
    dashboardEditorOrder.value = blockOrderForSpace(dashboardEditorSpace.value.id, blocks);
    await loadDashboardPreview(
      dashboardEditorSpace.value,
      dashboardPreviewRole.value,
      dashboardEditorBlocks.value
    );
  };

  const resetDashboardEditorDraft = async () => {
    if (!dashboardEditorSpace.value) return;
    if (!dashboardEditorProvisioningSnapshot.value && !dashboardEditorProvisioningLoading.value) {
      await loadDashboardProvisioningSnapshot(dashboardEditorSpace.value);
    }
    const blocks = provisioningBlocksForEditor();
    dashboardEditorBlocks.value = blocks.map((block) => ({ ...block }));
    dashboardEditorOrder.value = blockOrderForSpace(dashboardEditorSpace.value.id, blocks);
    await loadDashboardPreview(
      dashboardEditorSpace.value,
      dashboardPreviewRole.value,
      dashboardEditorBlocks.value
    );
  };

  const openDashboardEditor = async (space) => {
    if (!space?.id || (isPublicReadonlySpace(space) && !showAdmin.value)) return;
    dashboardEditorSpace.value = space;
    showDashboardEditor.value = true;
    dashboardPreviewRole.value = "admin";
    await loadDashboardProvisioningSnapshot(space);
    await resetDashboardEditorDraft();
  };

  const addDashboardBlock = () => {
    if (!canEditDashboardSpace(dashboardEditorSpace.value)) {
      return;
    }
    const nextOrder = dashboardEditorBlocks.value.length + 1;
    dashboardEditorBlocks.value = [
      ...dashboardEditorBlocks.value,
      normalizeBlock(
        {
          id: `block-${Date.now()}`,
          type: BLOCK_TYPES.resourcesPinned,
          title: "New block",
          layout: {
            lg: { x: 1, y: 1, w: 6, h: 2 },
            xs: { order: nextOrder }
          },
          config: defaultBlockConfig(BLOCK_TYPES.resourcesPinned)
        },
        nextOrder - 1
      )
    ];
  };

  const saveDashboardEditor = async () => {
    if (!dashboardEditorSpace.value?.id) return;
    if (!canEditDashboardSpace(dashboardEditorSpace.value)) {
      return;
    }
    dashboardEditorSaving.value = true;
    try {
      const payload = {
        space_id: dashboardEditorSpace.value.id,
        blocks: dashboardEditorBlocks.value,
        block_order: dashboardEditorOrder.value
      };
      const updated = await fetchJSON(
        withRoleOverride(dashboardPath()),
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );
      await syncDashboardAfterSave(dashboardEditorSpace.value, updated);
      notify(t("app.saveDone"), "success");
    } catch (err) {
      notify(err.message || t("app.saveFailed"), "error");
    } finally {
      dashboardEditorSaving.value = false;
    }
  };

  const openBlockSettings = (block, spaceSlug, databaseId = null) => {
    const normalized = normalizeBlock(block);
    inlineEditBlock.value = { block, spaceSlug, databaseId };
    inlineEditPopover.value = "settings";
    inlineEditAdvanced.value = false;
    const layout = blockLgLayout(normalized);
    inlineEditForm.value = {
      title: normalized.title || "",
      type: normalized.type || BLOCK_TYPES.resourcesPinned,
      x: layout.x || 1,
      y: layout.y || 1,
      w: layout.w || 6,
      h: layout.h || 2,
      order: blockOrderValue(normalized, 1),
      limit: normalized.config?.limit ?? defaultBlockConfig(normalized.type).limit,
      scope: normalized.config?.scope ?? "this",
      filter: normalized.config?.filter ?? "",
      text: normalized.config?.text ?? ""
    };
  };

  const openBlockAddContent = (block, spaceSlug, databaseId = null) => {
    inlineEditBlock.value = { block, spaceSlug, databaseId };
    inlineEditPopover.value = "add";
    inlineAddForm.value = createInlineAddForm();
  };

  const closeInlineEdit = () => {
    inlineEditBlock.value = null;
    inlineEditPopover.value = null;
  };

  const saveBlockSettings = async () => {
    if (!inlineEditBlock.value) return;
    const { block, spaceSlug } = inlineEditBlock.value;
    const space =
      spaces.value.find((item) => item.id === spaceSlug) || { id: spaceSlug };
    if (!canEditDashboardSpace(space)) {
      return;
    }

    try {
      const currentBlocks = blocksForSpace(spaceSlug);
      const updatedBlocks = currentBlocks.map((b) =>
        b.id === block.id
          ? {
              ...b,
              title: inlineEditForm.value.title,
              type: inlineEditForm.value.type,
              layout: {
                ...b.layout,
                lg: {
                  ...blockLgLayout(b),
                  x: inlineEditForm.value.x,
                  y: inlineEditForm.value.y,
                  w: inlineEditForm.value.w,
                  h: inlineEditForm.value.h
                },
                xs: {
                  order: Number(inlineEditForm.value.order || 1)
                }
              },
              config: {
                limit:
                  Number(inlineEditForm.value.limit || 0) ||
                  defaultBlockConfig(inlineEditForm.value.type).limit,
                scope: inlineEditForm.value.scope || "this",
                filter: inlineEditForm.value.filter || "",
                text: inlineEditForm.value.text || ""
              }
            }
          : b
      );

      const payload = {
        space_id: spaceSlug,
        blocks: updatedBlocks,
        block_order: blockOrderForSpace(spaceSlug, currentBlocks)
      };

      const updated = await fetchJSON(withRoleOverride(dashboardPath()), {
        method: "POST",
        body: JSON.stringify(payload)
      });

      await syncDashboardAfterSave(space, updated);
      notify("Block updated", "success");
      closeInlineEdit();
    } catch (err) {
      notify(err.message || "Failed to update block", "error");
    }
  };

  const deleteBlockInline = async (block, spaceSlug, databaseId) => {
    if (!confirm(`Delete block "${block.title || blockTypeLabel(block)}"?`)) return;
    const space =
      spaces.value.find((item) => item.id === spaceSlug) || { id: spaceSlug };
    if (!canEditDashboardSpace(space)) {
      return;
    }

    try {
      const currentBlocks = blocksForSpace(spaceSlug);
      const updatedBlocks = currentBlocks.filter((b) => b.id !== block.id);
      const payload = {
        space_id: spaceSlug,
        blocks: updatedBlocks,
        block_order: blockOrderForSpace(spaceSlug, currentBlocks).filter((id) => id !== block.id)
      };

      const updated = await fetchJSON(withRoleOverride(dashboardPath()), {
        method: "POST",
        body: JSON.stringify(payload)
      });

      await syncDashboardAfterSave(space, updated);
      notify("Block deleted", "success");
      closeInlineEdit();
    } catch (err) {
      notify(err.message || "Failed to delete block", "error");
    }
  };

  const addBlockInline = async (
    databaseId,
    spaceSlug,
    blockType = BLOCK_TYPES.resourcesPinned,
    blockTitle = "New Block"
  ) => {
    const space = spaces.value.find((item) => item.id === spaceSlug);
    if (isPublicReadonlySpace(space) && !showAdmin.value) {
      notify("Public spaces are read-only", "error");
      return;
    }
    if (!canEditDashboardSpace(space || { id: spaceSlug })) {
      return;
    }

    try {
      const currentBlocks = blocksForSpace(spaceSlug);
      const nextOrder = currentBlocks.length + 1;
      const currentMaxY = currentBlocks.length > 0
        ? Math.max(
            ...currentBlocks.map((b) => (blockLgLayout(b).y || 1) + (blockLgLayout(b).h || 2)),
            1
          )
        : 1;
      const newBlock = normalizeBlock(
        {
          id: `block-${Date.now()}`,
          type: blockType,
          title: blockTitle,
          layout: {
            lg: { x: 1, y: currentMaxY, w: 6, h: 2 },
            xs: { order: nextOrder }
          },
          config: defaultBlockConfig(blockType)
        },
        nextOrder - 1
      );

      const updatedBlocks = [...currentBlocks, newBlock];
      const currentOrder = currentBlocks.length > 0 ? blockOrderForSpace(spaceSlug, currentBlocks) : [];
      const payload = {
        space_id: spaceSlug,
        blocks: updatedBlocks,
        block_order: [...currentOrder, newBlock.id]
      };

      const updated = await fetchJSON(withRoleOverride(dashboardPath()), {
        method: "POST",
        body: JSON.stringify(payload)
      });

      await syncDashboardAfterSave(
        space || { id: spaceSlug },
        updated
      );
      notify("Block added", "success");
      if (dashboardEditSpaceId.value === spaceSlug) {
        await nextTick();
        initDashboardInteractions({ id: spaceSlug });
      }
      openBlockSettings(newBlock, spaceSlug, databaseId);
    } catch (err) {
      console.error(
        "Failed to add block:",
        err,
        "databaseId was:",
        databaseId,
        "spaceSlug was:",
        spaceSlug
      );
      notify(err.message || "Failed to add block", "error");
    }
  };

  const createBlockFromPlaceholder = async (space, blockType, blockTitle) => {
    if (!canManage.value || (isPublicReadonlySpace(space) && !showAdmin.value)) return;
    await addBlockInline(space?.database_id, space?.id, blockType, blockTitle);
  };

  const saveInlineContent = async () => {
    if (!inlineEditBlock.value) return;
    const { block, spaceSlug } = inlineEditBlock.value;
    const space = spaces.value.find((item) => item.id === spaceSlug);
    if (isPublicReadonlySpace(space) && !showAdmin.value) {
      notify("Public spaces are read-only", "error");
      return;
    }

    try {
      if (isResourcesBlock(block)) {
        const payload = {
          space_id: spaceSlug,
          title: inlineAddForm.value.title,
          url: inlineAddForm.value.url,
          item_type: "resource",
          pinned: true,
          audience_groups: ["user", "admin"]
        };
        const created = await fetchJSON("/atrium/directory-items", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        updateDashboardBlockData(spaceSlug, block.id, (items) => {
          const next = [created, ...items];
          const limit = Number(block?.config?.limit || 0);
          return limit > 0 ? next.slice(0, limit) : next;
        });
        notify("Resource created", "success");
      }

      closeInlineEdit();
    } catch (err) {
      notify(err.message || "Failed to add content", "error");
    }
  };

  const deleteInlineItem = async (item, blockType, spaceId) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    const space = spaces.value.find((s) => s.id === spaceId);
    if (isPublicReadonlySpace(space) && !showAdmin.value) {
      notify("Public spaces are read-only", "error");
      return;
    }

    try {
      const normalizedType = normalizeBlockType(blockType);
      if (normalizedType === BLOCK_TYPES.resourcesPinned) {
        await fetchJSON(`/atrium/directory-items/${encodeURIComponent(item.id)}`, { method: "DELETE" });
        removeDashboardItemFromSpaceData(spaceId, item.id);
        notify("Resource deleted", "success");
      }
    } catch (err) {
      notify(err.message || "Failed to delete item", "error");
    }
  };

  const disposeDashboard = () => {
    stopDashboardInteractions();
  };

  return {
    addBlockFromPicker,
    addDashboardBlock,
    canEditDashboardSpace,
    applyProvisioningSnapshotToEditor,
    resetDashboardEditorDraft,
    applyDashboardEditForm,
    blockDataCount,
    blockDataFor,
    blockOrderMapForSpace,
    blockOrderMapFromBlocks,
    blockStyle,
    blockTitle,
    blockTypeIs,
    blockTypeLabel,
    blocksForSpace,
    closeAddBlockPicker,
    closeInlineEdit,
    createBlockFromPlaceholder,
    dashboardAddOpen,
    dashboardData,
    dashboardDragGhost,
    dashboardDragging,
    dashboardEditAdvanced,
    dashboardEditDirty,
    dashboardEditForm,
    dashboardEditNewType,
    dashboardEditPanelStyle,
    dashboardEditSelectedId,
    dashboardEditSpaceId,
    dashboardEditorBlocks,
    dashboardEditorOrder,
    dashboardEditorSaving,
    dashboardEditorProvisioningLoading,
    dashboardEditorProvisioningSnapshot,
    dashboardEditorSpace,
    disposeDashboard,
    dashboardLoading,
    dashboardPreviewRole,
    dashboards,
    deleteDashboardBlockDraft,
    deleteInlineItem,
    hasDashboard,
    inlineAddForm,
    inlineEditAdvanced,
    inlineEditBlock,
    inlineEditForm,
    inlineEditPopover,
    isDashboardEditing,
    isResourcesBlock,
    loadDashboardReadModel,
    onPreviewRoleChange,
    openAddBlockPicker,
    openBlockAddContent,
    openBlockSettings,
    openDashboardEditor,
    saveBlockSettings,
    saveDashboardEditor,
    saveDashboardLayout,
    saveInlineContent,
    setDashboardEditSelection,
    showDashboardEditor,
    stopDashboardEdit,
    toggleDashboardEdit
  };
}
