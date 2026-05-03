export function createAtriumDashboardStateHelpers({ blockOrderValue, normalizeBlock }) {
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
  } = {}) => {
    const normalizedBlocks = blocks.map((block, idx) => normalizeBlock(block, idx));
    return {
      space,
      blocks: normalizedBlocks,
      order: coerceDashboardOrder(order, normalizedBlocks),
      source,
      templateID,
      templateKey: String(templateKey || ""),
      templateVersion: Number(templateVersion || 0)
    };
  };

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

  return {
    coerceDashboardBlocks,
    coerceDashboardOrder,
    createDashboardState,
    dashboardStateFromMutationPayload,
    dashboardStateFromWorkspacePayload
  };
}
