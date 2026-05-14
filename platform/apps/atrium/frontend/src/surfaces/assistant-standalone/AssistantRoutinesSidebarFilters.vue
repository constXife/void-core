<script setup>
import { computed } from "vue";

const props = defineProps({
  instances: { type: Array, required: true },
  filters: { type: Object, required: true },
  t: { type: Function, required: true }
});

const emit = defineEmits(["filter-change"]);
const t = (key, vars = {}) => props.t(key, vars);

const countBy = (predicate) => props.instances.filter(predicate).length;

const statusOptions = computed(() => [
  { value: "enabled", label: t("assistant.filters.enabled"), count: countBy((r) => r.status === "enabled") },
  { value: "paused", label: t("assistant.filters.paused"), count: countBy((r) => r.status === "paused") }
]);

const triggerOptions = computed(() => {
  const kinds = new Set(props.instances.map((r) => r.trigger?.kind).filter(Boolean));
  return Array.from(kinds).sort().map((kind) => ({
    value: kind,
    label: kind,
    count: countBy((r) => r.trigger?.kind === kind)
  }));
});

const autonomyOptions = computed(() => {
  const levels = new Set(props.instances.map((r) => r.autonomy_level).filter(Boolean));
  return Array.from(levels).sort().map((level) => ({
    value: level,
    label: level,
    count: countBy((r) => r.autonomy_level === level)
  }));
});

const setFilter = (key, value) => {
  const current = props.filters[key];
  const next = current === value ? null : value;
  emit("filter-change", { key, value: next });
};

const isActive = (key, value) => props.filters[key] === value;
const isAllActive = (key) => props.filters[key] === null;
</script>

<template>
  <div class="assistant-sidebar-filters">
    <section class="assistant-sidebar-filters__group">
      <h3 class="assistant-sidebar-filters__title">{{ t("assistant.filters.status") }}</h3>
      <button
        type="button"
        class="assistant-sidebar-filters__item"
        :class="{ 'assistant-sidebar-filters__item--active': isAllActive('status') }"
        @click="setFilter('status', null)"
      >
        <span>{{ t("assistant.filters.all") }}</span>
        <span class="assistant-sidebar-filters__count">{{ instances.length }}</span>
      </button>
      <button
        v-for="opt in statusOptions"
        :key="`status-${opt.value}`"
        type="button"
        class="assistant-sidebar-filters__item"
        :class="{ 'assistant-sidebar-filters__item--active': isActive('status', opt.value) }"
        @click="setFilter('status', opt.value)"
      >
        <span>{{ opt.label }}</span>
        <span class="assistant-sidebar-filters__count">{{ opt.count }}</span>
      </button>
    </section>

    <section class="assistant-sidebar-filters__group">
      <h3 class="assistant-sidebar-filters__title">{{ t("assistant.filters.trigger") }}</h3>
      <button
        v-for="opt in triggerOptions"
        :key="`trigger-${opt.value}`"
        type="button"
        class="assistant-sidebar-filters__item"
        :class="{ 'assistant-sidebar-filters__item--active': isActive('trigger_kind', opt.value) }"
        @click="setFilter('trigger_kind', opt.value)"
      >
        <span>{{ opt.label }}</span>
        <span class="assistant-sidebar-filters__count">{{ opt.count }}</span>
      </button>
    </section>

    <section class="assistant-sidebar-filters__group">
      <h3 class="assistant-sidebar-filters__title">{{ t("assistant.filters.autonomy") }}</h3>
      <button
        v-for="opt in autonomyOptions"
        :key="`autonomy-${opt.value}`"
        type="button"
        class="assistant-sidebar-filters__item"
        :class="{ 'assistant-sidebar-filters__item--active': isActive('autonomy_level', opt.value) }"
        @click="setFilter('autonomy_level', opt.value)"
      >
        <span>{{ opt.label }}</span>
        <span class="assistant-sidebar-filters__count">{{ opt.count }}</span>
      </button>
    </section>
  </div>
</template>
