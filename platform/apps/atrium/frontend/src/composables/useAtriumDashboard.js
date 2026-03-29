import { nextTick, ref } from "vue";
import interact from "interactjs";
import {
  createAtriumDashboardModel,
  createDashboardEditForm,
  createInlineAddForm
} from "./useAtriumDashboardModel.js";

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
    if (dash?.template?.blocks) {
      try {
        const blocks = Array.isArray(dash.template.blocks)
          ? dash.template.blocks
          : typeof dash.template.blocks === "string"
            ? JSON.parse(dash.template.blocks)
            : [];
        if (blocks.length > 0) return true;
      } catch {
        // ignore malformed local draft and fall back to display config
      }
    }
    const cfg = parseDisplayConfig(space);
    return cfg.use_dashboard === true || cfg.dashboard_template_key || cfg.shared_template_key;
  };

  const dashboardForSpace = (spaceId) => dashboards.value[spaceId] || null;

  const blocksForSpace = (spaceId) => {
    const dash = dashboardForSpace(spaceId);
    if (!dash?.template?.blocks) return [];
    try {
      const rawBlocks = Array.isArray(dash.template.blocks)
        ? dash.template.blocks
        : JSON.parse(dash.template.blocks);
      return rawBlocks.map((block, idx) => normalizeBlock(block, idx));
    } catch {
      return [];
    }
  };

  const blockOrderForSpace = (spaceId, blocks) => {
    const dash = dashboardForSpace(spaceId);
    let order = [];
    if (dash?.mobile_order) {
      try {
        order = Array.isArray(dash.mobile_order) ? dash.mobile_order : JSON.parse(dash.mobile_order);
      } catch {
        order = [];
      }
    }
    if (order.length === 0) {
      return blocks
        .slice()
        .sort((a, b) => blockOrderValue(a, 0) - blockOrderValue(b, 0))
        .map((block) => block.id);
    }
    return order;
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
    const dash =
      existing?.template?.blocks !== undefined
        ? existing
        : {
            space: spaces.value.find((space) => space.id === spaceId) || {},
            template: { id: 0, key: "", version: 0, blocks: [] },
            preferences: { hidden_block_ids: [], block_order: [] },
            mobile_order: []
          };
    let blocks = [];
    try {
      blocks = Array.isArray(dash.template.blocks)
        ? dash.template.blocks
        : JSON.parse(dash.template.blocks);
    } catch {
      blocks = [];
    }
    const normalized = blocks.map((block, idx) => normalizeBlock(block, idx));
    const updatedBlocks = updater(normalized.map((block) => ({ ...block })));
    dashboards.value = {
      ...dashboards.value,
      [spaceId]: {
        ...dash,
        template: {
          ...dash.template,
          blocks: updatedBlocks
        }
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

  const loadDashboard = async (space, force = false) => {
    if (!space?.id || !space?.database_id) return;
    if (!force && !hasDashboard(space)) return;
    dashboardLoading.value = { ...dashboardLoading.value, [space.id]: true };
    try {
      const dash = await fetchJSON(withRoleOverride(`/api/spaces/${space.database_id}/dashboard`));
      dashboards.value = { ...dashboards.value, [space.id]: dash };
      const blocks = blocksForSpace(space.id);
      const ids = blocks.map((block) => block.id).filter(Boolean);
      if (ids.length > 0) {
        const types = blocks.map((block) => block.type).filter(Boolean);
        const typeParam = types.length ? `&types=${encodeURIComponent(types.join(","))}` : "";
        const data = await fetchJSON(
          withRoleOverride(`/api/spaces/${space.database_id}/blocks/data?ids=${ids.join(",")}${typeParam}`)
        );
        dashboardData.value = { ...dashboardData.value, [space.id]: data };
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      dashboardLoading.value = { ...dashboardLoading.value, [space.id]: false };
    }
  };

  const discardDashboardChanges = async (space) => {
    if (!space) return;
    await loadDashboard(space);
    dashboardEditDirty.value = false;
    const blocks = blocksForSpace(space.id);
    dashboardEditSelectedId.value = blocks[0]?.id || null;
    if (dashboardEditSelectedId.value) {
      dashboardEditForm.value = buildDashboardEditForm(blocks[0]);
    }
  };

  const loadDashboardPreview = async (space, roleOverride) => {
    if (!space?.id || !hasDashboard(space)) return;
    const blocks = blocksForSpace(space.id);
    const ids = blocks.map((block) => block.id).filter(Boolean);
    if (ids.length === 0) return;
    const params = new URLSearchParams({ ids: ids.join(",") });
    const types = blocks.map((block) => block.type).filter(Boolean);
    if (types.length > 0) {
      params.set("types", types.join(","));
    }
    if (roleOverride && roleOverride !== "admin") {
      params.set("audience", roleOverride);
    }
    try {
      const data = await fetchJSON(`/api/spaces/${space.database_id}/blocks/data?${params.toString()}`);
      dashboardData.value = { ...dashboardData.value, [space.id]: data };
    } catch (err) {
      console.error("Failed to load preview data:", err);
    }
  };

  const onPreviewRoleChange = async () => {
    if (!dashboardEditorSpace.value) return;
    await loadDashboardPreview(dashboardEditorSpace.value, dashboardPreviewRole.value);
  };

  const startDashboardEdit = async (space) => {
    if (!space || !canManage.value || isMobile.value || (isPublicReadonlySpace(space) && !showAdmin.value)) return;
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
    const databaseId = resolveSpaceDatabaseId(space.database_id, space.id);
    if (!databaseId) {
      notify("No database ID for space", "error");
      return;
    }
    dashboardEditorSaving.value = true;
    try {
      const blocks = blocksForSpace(space.id);
      const payload = {
        blocks,
        block_order: blockOrderForSpace(space.id, blocks)
      };
      const updated = await fetchJSON(withRoleOverride(`/api/spaces/${databaseId}/dashboard`), {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      dashboards.value = { ...dashboards.value, [space.id]: updated };
      dashboardEditDirty.value = false;
      notify(t("app.saveDone"), "success");
    } catch (err) {
      notify(err.message || t("app.saveFailed"), "error");
    } finally {
      dashboardEditorSaving.value = false;
    }
  };

  const openDashboardEditor = async (space) => {
    if (!space?.id || (isPublicReadonlySpace(space) && !showAdmin.value)) return;
    dashboardEditorSpace.value = space;
    showDashboardEditor.value = true;
    dashboardPreviewRole.value = "admin";
    await loadDashboard(space);
    await loadDashboardPreview(space, dashboardPreviewRole.value);
    const blocks = blocksForSpace(space.id);
    dashboardEditorBlocks.value = blocks.map((block) => ({ ...block }));
    dashboardEditorOrder.value = blockOrderForSpace(space.id, blocks);
  };

  const addDashboardBlock = () => {
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
    if (!dashboardEditorSpace.value?.id || !dashboardEditorSpace.value?.database_id) return;
    dashboardEditorSaving.value = true;
    try {
      const payload = {
        blocks: dashboardEditorBlocks.value,
        block_order: dashboardEditorOrder.value
      };
      const updated = await fetchJSON(
        withRoleOverride(`/api/spaces/${dashboardEditorSpace.value.database_id}/dashboard`),
        {
          method: "PUT",
          body: JSON.stringify(payload)
        }
      );
      dashboards.value = { ...dashboards.value, [dashboardEditorSpace.value.id]: updated };
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
    const { block, spaceSlug, databaseId } = inlineEditBlock.value;
    const resolvedDatabaseId = resolveSpaceDatabaseId(databaseId, spaceSlug);
    if (!resolvedDatabaseId) {
      notify("No database ID for space", "error");
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
        blocks: updatedBlocks,
        block_order: blockOrderForSpace(spaceSlug, currentBlocks)
      };

      const updated = await fetchJSON(withRoleOverride(`/api/spaces/${resolvedDatabaseId}/dashboard`), {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      dashboards.value = { ...dashboards.value, [spaceSlug]: updated };
      notify("Block updated", "success");
      closeInlineEdit();
    } catch (err) {
      notify(err.message || "Failed to update block", "error");
    }
  };

  const deleteBlockInline = async (block, spaceSlug, databaseId) => {
    if (!confirm(`Delete block "${block.title || blockTypeLabel(block)}"?`)) return;
    const resolvedDatabaseId = resolveSpaceDatabaseId(databaseId, spaceSlug);
    if (!resolvedDatabaseId) {
      notify("No database ID for space", "error");
      return;
    }

    try {
      const currentBlocks = blocksForSpace(spaceSlug);
      const updatedBlocks = currentBlocks.filter((b) => b.id !== block.id);
      const payload = {
        blocks: updatedBlocks,
        block_order: blockOrderForSpace(spaceSlug, currentBlocks).filter((id) => id !== block.id)
      };

      const updated = await fetchJSON(withRoleOverride(`/api/spaces/${resolvedDatabaseId}/dashboard`), {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      dashboards.value = { ...dashboards.value, [spaceSlug]: updated };
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
    const numericSpaceId = resolveSpaceDatabaseId(databaseId, spaceSlug);
    if (!numericSpaceId) {
      notify(`Invalid space database ID: ${databaseId}`, "error");
      console.error("addBlockInline called with invalid databaseId:", databaseId, "spaceSlug:", spaceSlug);
      return;
    }
    const space = spaces.value.find((item) => item.id === spaceSlug);
    if (isPublicReadonlySpace(space) && !showAdmin.value) {
      notify("Public spaces are read-only", "error");
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
        blocks: updatedBlocks,
        block_order: [...currentOrder, newBlock.id]
      };

      const updated = await fetchJSON(withRoleOverride(`/api/spaces/${numericSpaceId}/dashboard`), {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      dashboards.value = { ...dashboards.value, [spaceSlug]: updated };
      notify("Block added", "success");
      if (dashboardEditSpaceId.value === spaceSlug) {
        await nextTick();
        initDashboardInteractions({ id: spaceSlug });
      }
      openBlockSettings(newBlock, spaceSlug, numericSpaceId);
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
    const { block, spaceSlug, databaseId } = inlineEditBlock.value;
    const resolvedSpaceId = resolveSpaceDatabaseId(databaseId, spaceSlug);
    if (!resolvedSpaceId) {
      notify("No database ID for space", "error");
      return;
    }
    const space = spaces.value.find((item) => item.id === spaceSlug);
    if (isPublicReadonlySpace(space) && !showAdmin.value) {
      notify("Public spaces are read-only", "error");
      return;
    }

    try {
      if (isResourcesBlock(block)) {
        const payload = {
          space_id: resolvedSpaceId,
          title: inlineAddForm.value.title,
          url: inlineAddForm.value.url,
          item_type: "resource",
          pinned: true,
          audience_groups: ["user", "admin"]
        };
        await fetchJSON("/api/directory_items", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        notify("Resource created", "success");
      }

      if (space) {
        await loadDashboard(space);
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
        await fetchJSON(`/api/directory_items/${item.id}`, { method: "DELETE" });
        notify("Resource deleted", "success");
      }

      if (space) {
        await loadDashboard(space);
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
    dashboardEditorSpace,
    disposeDashboard,
    dashboardLoading,
    dashboardPreviewRole,
    dashboards,
    deleteDashboardBlockDraft,
    deleteInlineItem,
    discardDashboardChanges,
    hasDashboard,
    inlineAddForm,
    inlineEditAdvanced,
    inlineEditBlock,
    inlineEditForm,
    inlineEditPopover,
    isDashboardEditing,
    isResourcesBlock,
    loadDashboard,
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
