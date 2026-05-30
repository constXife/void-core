/**
 * Adapter: inventory dashboard-data response → per-dataSlot datasets для freeform.overview
 * примитивов. Один backend-вызов (/api/knowledge/v1/inventory/dashboard-data?slice=) →
 * стабильный контракт, который потребляют MetricKpiBlock / DataTableBlock / DataTreeBlock /
 * DataTimelineBlock.
 *
 * Shape backend-ответа (verified live на atrium host):
 *   { summary: { total_count, status_counts: [{key,count}], attention: { count, items } },
 *     items:     [{ entry: { instance_id, title, lifecycle_status, located_in_id, properties, ... } }],
 *     locations: [{ entry: { instance_id, title, located_in_id, ... } }] }
 *
 * items/stats owner-scoped (пусто без сессии); locations — нет. В браузере под сессией populate'ятся.
 */

const STATS_SLOT = "inventory.dashboard.stats";
const ITEMS_SLOT = "inventory.items.list";
const LOCATIONS_SLOT = "inventory.locations.tree";
const CHANGES_SLOT = "inventory.changes.recent";

function entryOf(row) {
  return (row && typeof row === "object" && row.entry) || row || {};
}

function statusCount(statusCounts, key) {
  if (!Array.isArray(statusCounts)) return 0;
  const match = statusCounts.find((entry) => entry?.key === key || entry?.status === key);
  return Number.isFinite(match?.count) ? match.count : 0;
}

function toStats(summary) {
  const s = summary || {};
  return {
    totalItems: Number.isFinite(s.total_count) ? s.total_count : 0,
    lowStockCount: statusCount(s.status_counts, "low"),
    missingCount: statusCount(s.status_counts, "missing"),
    recentChangesCount: Number.isFinite(s.attention?.count) ? s.attention.count : 0
  };
}

function toRows(items) {
  if (!Array.isArray(items)) return [];
  return items.map((row) => {
    const e = entryOf(row);
    const props = e.properties || {};
    return {
      id: e.instance_id,
      name: e.title || props.name || e.instance_id || "",
      sku: props.sku || "",
      location: e.located_in_id || "",
      quantity: props.quantity ?? props.count ?? "",
      status: e.lifecycle_status || "",
      updatedAt: e.lifecycle?.changed_at || ""
    };
  });
}

/**
 * Строит дерево из flat locations по located_in_id. Узлы без known-родителя — корни.
 */
function toTree(locations) {
  if (!Array.isArray(locations)) return [];
  const nodes = new Map();
  for (const row of locations) {
    const e = entryOf(row);
    if (!e.instance_id) continue;
    nodes.set(e.instance_id, {
      id: e.instance_id,
      name: e.title || e.instance_id,
      parentId: e.located_in_id || null,
      count: Number.isFinite(e.attachments?.count) ? e.attachments.count : null,
      children: []
    });
  }
  const roots = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function toEvents(summary) {
  const items = summary?.attention?.items;
  if (!Array.isArray(items)) return [];
  return items.map((row) => {
    const e = entryOf(row);
    return {
      id: e.instance_id,
      title: e.title || e.instance_id || "",
      detail: e.lifecycle_status || "",
      timestamp: e.lifecycle?.changed_at || ""
    };
  });
}

/**
 * @param {object} dashboardData backend dashboard-data response
 * @returns {Record<string, object>} slotId → dataset
 */
export function adaptDashboardData(dashboardData) {
  const data = dashboardData || {};
  return {
    [STATS_SLOT]: toStats(data.summary),
    [ITEMS_SLOT]: { rows: toRows(data.items) },
    [LOCATIONS_SLOT]: { nodes: toTree(data.locations) },
    [CHANGES_SLOT]: { events: toEvents(data.summary) }
  };
}
