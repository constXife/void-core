import { nextTick, ref } from "vue";
import { createDashboardEditForm } from "./useAtriumDashboardForms.js";
import { createAtriumDashboardModel } from "./useAtriumDashboardModel.js";
import { createAtriumDashboardData } from "./useAtriumDashboardData.js";
import { createAtriumDashboardInlineEdit } from "./useAtriumDashboardInlineEdit.js";
import { createAtriumDashboardInteractions } from "./useAtriumDashboardInteractions.js";
import { createAtriumDashboardProvisioningHelpers } from "./useAtriumDashboardProvisioning.js";
import { createAtriumDashboardStateHelpers } from "./useAtriumDashboardState.js";
import { prefersProvisioningDashboard } from "../lib/dashboard-source.js";

export function useAtriumDashboard({
  BLOCK_TYPES,
  canManage,
  fetchJSON,
  isMobile,
  isPublicReadonlySpace,
  localizedText,
  notify,
  parseDisplayConfig,
  showAdmin,
  spaces,
  spacesAdmin,
  t,
  withRoleOverride
}) {
  const dashboards = ref({});
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


  const dashboardPath = () => "/atrium/dashboard/save";
  const workspacePath = (spaceId) => {
    const normalized = String(spaceId || "").trim();
    if (!normalized) return "/atrium/workspace";
    return `/atrium/workspace?space_id=${encodeURIComponent(normalized)}`;
  };
  const canEditDashboardSpace = (space) => prefersProvisioningDashboard(space);


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
    localizedText,
    t
  });

  const {
    coerceDashboardOrder,
    createDashboardState,
    dashboardStateFromMutationPayload,
    dashboardStateFromWorkspacePayload
  } = createAtriumDashboardStateHelpers({
    blockOrderValue,
    normalizeBlock
  });

  const {
    currentSpaceFromWorkspacePayload,
    filterProvisioningItemsForBlock,
    provisioningBlocksFromSnapshot,
    workspaceEntriesFromPayload
  } = createAtriumDashboardProvisioningHelpers({
    BLOCK_TYPES,
    defaultBlockConfig,
    findNextBlockPlacement,
    isResourcesBlock,
    normalizeBlock,
    normalizeBlockType
  });

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

  const loadWorkspacePayload = async (space) =>
    await fetchJSON(withRoleOverride(workspacePath(space?.id || space?.provisioning_space_id)));

  const {
    blockDataCount,
    blockDataFor,
    dashboardData,
    loadProvisioningDashboardBlockData,
    loadProvisioningDashboardPreviewData,
    removeDashboardItemFromSpaceData,
    updateDashboardBlockData
  } = createAtriumDashboardData({
    filterProvisioningItemsForBlock,
    isResourcesBlock,
    loadWorkspacePayload,
    workspaceEntriesFromPayload
  });

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

  const {
    initDashboardInteractions,
    stopDashboardInteractions,
    updateDashboardEditPanelPosition
  } = createAtriumDashboardInteractions({
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
  });

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

  const {
    closeInlineEdit,
    createBlockFromPlaceholder,
    deleteInlineItem,
    inlineAddForm,
    inlineEditAdvanced,
    inlineEditBlock,
    inlineEditForm,
    inlineEditPopover,
    openBlockAddContent,
    openBlockSettings,
    saveBlockSettings,
    saveInlineContent
  } = createAtriumDashboardInlineEdit({
    BLOCK_TYPES,
    blockLgLayout,
    blockOrderForSpace,
    blockOrderValue,
    blockTypeLabel,
    blocksForSpace,
    canEditDashboardSpace,
    canManage,
    dashboardEditSpaceId,
    dashboardPath,
    defaultBlockConfig,
    fetchJSON,
    initDashboardInteractions,
    isPublicReadonlySpace,
    isResourcesBlock,
    normalizeBlock,
    normalizeBlockType,
    notify,
    removeDashboardItemFromSpaceData,
    showAdmin,
    spaces,
    syncDashboardAfterSave,
    updateDashboardBlockData,
    withRoleOverride
  });

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
