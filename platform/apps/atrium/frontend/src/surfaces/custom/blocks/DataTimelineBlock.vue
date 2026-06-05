<script setup>
// DataTimelineBlock — render для layout-примитива `data.timeline`.
// Generic time-ordered список событий над recent-changes data slot. Read-only activity feed.
import { computed } from "vue";

const props = defineProps({
  // { id, block, region, props: { dataSlot, limit? } }
  block: { type: Object, required: true },
  // Adapted dataset: { events: [{ title, detail?, timestamp? }] }
  data: { type: Object, default: () => ({}) },
  t: { type: Function, required: true }
});

const limit = computed(() => {
  const raw = props.block?.props?.limit;
  return Number.isFinite(raw) && raw > 0 ? raw : null;
});
const events = computed(() => {
  const all = Array.isArray(props.data?.events) ? props.data.events : [];
  return limit.value ? all.slice(0, limit.value) : all;
});
</script>

<template>
  <article class="data-timeline">
    <div v-if="!events.length" class="data-timeline__empty" role="status">
      {{ t("surface.timeline.empty") }}
    </div>
    <ol v-else class="data-timeline__list">
      <li v-for="(event, index) in events" :key="event.id || index" class="data-timeline__item">
        <span v-if="event.timestamp" class="data-timeline__time">{{ event.timestamp }}</span>
        <span class="data-timeline__title">{{ event.title }}</span>
        <span v-if="event.detail" class="data-timeline__detail">{{ event.detail }}</span>
      </li>
    </ol>
  </article>
</template>

<style scoped>
.data-timeline {
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 12px;
  background: var(--surface-elevated, color-mix(in srgb, #ffffff 4%, transparent));
}

.data-timeline__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.data-timeline__item {
  display: grid;
  gap: 2px;
  padding-left: 12px;
  border-left: 2px solid color-mix(in srgb, var(--accent, #60a5fa) 50%, transparent);
}

.data-timeline__time {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--ink-muted, color-mix(in srgb, currentColor 55%, transparent));
}

.data-timeline__title {
  font-size: 13px;
  color: var(--ink-primary, #f8fafc);
}

.data-timeline__detail {
  font-size: 12px;
  color: var(--ink-muted, color-mix(in srgb, currentColor 65%, transparent));
}

.data-timeline__empty {
  padding: 24px;
  text-align: center;
  font-style: italic;
  font-size: 13px;
  color: var(--ink-muted, color-mix(in srgb, currentColor 55%, transparent));
}
</style>
