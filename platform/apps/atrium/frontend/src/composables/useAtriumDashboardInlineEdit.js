import { nextTick, ref } from "vue";
import { createInlineAddForm } from "./useAtriumDashboardForms.js";
import { createAtriumDashboardInlineContent } from "./useAtriumDashboardInlineContent.js";
import {
  defaultInlineEditForm,
  inlineEditedBlock,
  nextInlineBlockY
} from "./useAtriumDashboardInlineHelpers.js";

export function createAtriumDashboardInlineEdit({
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
}) {
  const inlineEditBlock = ref(null);
  const inlineEditPopover = ref(null);
  const inlineEditAdvanced = ref(false);
  const inlineEditForm = ref(defaultInlineEditForm(BLOCK_TYPES.resourcesPinned));
  const inlineAddForm = ref(createInlineAddForm());

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
    const space = spaces.value.find((item) => item.id === spaceSlug) || { id: spaceSlug };
    if (!canEditDashboardSpace(space)) return;

    try {
      const currentBlocks = blocksForSpace(spaceSlug);
      const updatedBlocks = currentBlocks.map((candidate) =>
        candidate.id === block.id
          ? inlineEditedBlock(candidate, inlineEditForm.value, blockLgLayout, defaultBlockConfig)
          : candidate
      );
      await persistInlineBlocks(space, spaceSlug, updatedBlocks, currentBlocks);
      notify("Block updated", "success");
      closeInlineEdit();
    } catch (err) {
      notify(err.message || "Failed to update block", "error");
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
    if (!canEditDashboardSpace(space || { id: spaceSlug })) return;

    try {
      const currentBlocks = blocksForSpace(spaceSlug);
      const nextOrder = currentBlocks.length + 1;
      const newBlock = normalizeBlock(
        {
          id: `block-${Date.now()}`,
          type: blockType,
          title: blockTitle,
          layout: {
            lg: { x: 1, y: nextInlineBlockY(currentBlocks, blockLgLayout), w: 6, h: 2 },
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
      await syncDashboardAfterSave(space || { id: spaceSlug }, updated);
      notify("Block added", "success");
      if (dashboardEditSpaceId.value === spaceSlug) {
        await nextTick();
        initDashboardInteractions({ id: spaceSlug });
      }
      openBlockSettings(newBlock, spaceSlug, databaseId);
    } catch (err) {
      console.error("Failed to add block:", err, "databaseId was:", databaseId, "spaceSlug was:", spaceSlug);
      notify(err.message || "Failed to add block", "error");
    }
  };

  const createBlockFromPlaceholder = async (space, blockType, blockTitle) => {
    if (!canManage.value || (isPublicReadonlySpace(space) && !showAdmin.value)) return;
    await addBlockInline(space?.database_id, space?.id, blockType, blockTitle);
  };

  const { deleteInlineItem, saveInlineContent } = createAtriumDashboardInlineContent({
    BLOCK_TYPES,
    fetchJSON,
    inlineAddForm,
    inlineEditBlock,
    closeInlineEdit,
    isPublicReadonlySpace,
    isResourcesBlock,
    normalizeBlockType,
    notify,
    removeDashboardItemFromSpaceData,
    showAdmin,
    spaces,
    updateDashboardBlockData
  });

  const persistInlineBlocks = async (space, spaceSlug, updatedBlocks, currentBlocks) => {
    const updated = await fetchJSON(withRoleOverride(dashboardPath()), {
      method: "POST",
      body: JSON.stringify({
        space_id: spaceSlug,
        blocks: updatedBlocks,
        block_order: blockOrderForSpace(spaceSlug, currentBlocks)
      })
    });
    await syncDashboardAfterSave(space, updated);
  };

  return {
    addBlockInline,
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
  };
}
