/**
 * Block registry для render сохранённого PageSpec: catalog block id → Vue component.
 * Phase 1: layout-примитивы freeform.overview. assistant.latest_artifact (bridge) рендерится
 * через отдельный resolve-artifacts путь (envelope), не через этот dataSlot-registry.
 *
 * Добавить product block позже = добавить import + одну запись здесь.
 */
import MetricKpiBlock from "./blocks/MetricKpiBlock.vue";
import DataTableBlock from "./blocks/DataTableBlock.vue";
import DataTreeBlock from "./blocks/DataTreeBlock.vue";
import DataTimelineBlock from "./blocks/DataTimelineBlock.vue";

const REGISTRY = {
  "metric.kpi": MetricKpiBlock,
  "data.table": DataTableBlock,
  "data.tree": DataTreeBlock,
  "data.timeline": DataTimelineBlock
};

export function componentForBlock(blockId) {
  return REGISTRY[blockId] || null;
}
