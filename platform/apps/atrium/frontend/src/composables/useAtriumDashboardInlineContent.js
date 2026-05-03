export function createAtriumDashboardInlineContent({
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
}) {
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
        const created = await fetchJSON("/atrium/directory-items", {
          method: "POST",
          body: JSON.stringify({
            space_id: spaceSlug,
            title: inlineAddForm.value.title,
            url: inlineAddForm.value.url,
            item_type: "resource",
            pinned: true,
            audience_groups: ["user", "admin"]
          })
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
    const space = spaces.value.find((candidate) => candidate.id === spaceId);
    if (isPublicReadonlySpace(space) && !showAdmin.value) {
      notify("Public spaces are read-only", "error");
      return;
    }

    try {
      if (normalizeBlockType(blockType) === BLOCK_TYPES.resourcesPinned) {
        await fetchJSON(`/atrium/directory-items/${encodeURIComponent(item.id)}`, { method: "DELETE" });
        removeDashboardItemFromSpaceData(spaceId, item.id);
        notify("Resource deleted", "success");
      }
    } catch (err) {
      notify(err.message || "Failed to delete item", "error");
    }
  };

  return {
    deleteInlineItem,
    saveInlineContent
  };
}
