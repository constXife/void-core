/**
 * Block registry для render сохранённого PageSpec: catalog block id → Vue component.
 *
 * Layout-примитивы (freeform.overview) И inventory.* product-блоки (inventory.overview) рендерятся
 * generic-компонентами: inventory.* блоки структурно идентичны примитивам (stats/table/tree/timeline
 * над теми же data slots), поэтому inventory.items_table ≡ data.table и т.д. — переиспользуем без
 * inventory-specific кода (граница void-core/void не нарушается; «inventory» — это лишь catalog id +
 * какой slot читается, не render-логика). Product-specific визуальное обогащение (статус-цвета,
 * иконки локаций) — future slice (отклонение от ADR-0020 § product blocks в inventory-web,
 * зафиксировано в TODO).
 *
 * assistant.latest_artifact (bridge) рендерится через отдельный resolve-artifacts путь (envelope),
 * не через этот dataSlot-registry.
 */
import MetricKpiBlock from "./blocks/MetricKpiBlock.vue";
import DataTableBlock from "./blocks/DataTableBlock.vue";
import DataTreeBlock from "./blocks/DataTreeBlock.vue";
import DataTimelineBlock from "./blocks/DataTimelineBlock.vue";
import InventoryStatsSummaryBlock from "./blocks/InventoryStatsSummaryBlock.vue";
import InventoryLowStockPanelBlock from "./blocks/InventoryLowStockPanelBlock.vue";
import InventoryFilterPanelBlock from "./blocks/InventoryFilterPanelBlock.vue";

const REGISTRY = {
  // freeform.overview primitives
  "metric.kpi": MetricKpiBlock,
  "data.table": DataTableBlock,
  "data.tree": DataTreeBlock,
  "data.timeline": DataTimelineBlock,
  // inventory.overview product blocks — generic render над теми же slot-датасетами
  "inventory.stats_summary": InventoryStatsSummaryBlock,
  "inventory.items_table": DataTableBlock,
  "inventory.location_tree": DataTreeBlock,
  "inventory.recent_changes": DataTimelineBlock,
  "inventory.low_stock_panel": InventoryLowStockPanelBlock,
  "inventory.filter_panel": InventoryFilterPanelBlock
};

export function componentForBlock(blockId) {
  return REGISTRY[blockId] || null;
}
