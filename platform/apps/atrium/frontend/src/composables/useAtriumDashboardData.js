import { ref } from "vue";

export function createAtriumDashboardData({
  filterProvisioningItemsForBlock,
  isResourcesBlock,
  loadWorkspacePayload,
  workspaceEntriesFromPayload
}) {
  const dashboardData = ref({});

  const blockDataFor = (spaceId, blockId) => dashboardData.value[spaceId]?.[blockId] || [];

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
      blocks.map((block) => [block.id, isResourcesBlock(block) ? resources : {}])
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
      blocks.map((block) => [
        block.id,
        isResourcesBlock(block)
          ? filterProvisioningItemsForBlock(resources, block, audience)
          : {}
      ])
    );
    dashboardData.value = {
      ...dashboardData.value,
      [space.id]: nextEntries
    };
  };

  return {
    blockDataCount,
    blockDataFor,
    dashboardData,
    loadProvisioningDashboardBlockData,
    loadProvisioningDashboardPreviewData,
    removeDashboardItemFromSpaceData,
    updateDashboardBlockData
  };
}
