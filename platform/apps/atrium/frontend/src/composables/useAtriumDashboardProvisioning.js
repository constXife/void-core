export function createAtriumDashboardProvisioningHelpers({
  BLOCK_TYPES,
  defaultBlockConfig,
  findNextBlockPlacement,
  isResourcesBlock,
  normalizeBlock,
  normalizeBlockType
}) {
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

  const provisioningBlocksFromSnapshot = (snapshot) => {
    const rawBlocks = Array.isArray(snapshot?.blocks) ? snapshot.blocks : [];
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

  return {
    currentSpaceFromWorkspacePayload,
    filterProvisioningItemsForBlock,
    provisioningBlocksFromSnapshot,
    workspaceEntriesFromPayload
  };
}
