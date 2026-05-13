<script setup>
import { computed } from "vue";

const props = defineProps({
  skills: { type: Array, required: true },
  filters: { type: Object, required: true },
  availableTrustClasses: { type: Set, required: true }
});

const emit = defineEmits(["filter-change"]);

const countBy = (predicate) => props.skills.filter(predicate).length;

const stageOptions = computed(() => {
  const stages = new Set(props.skills.map((s) => s.stage));
  return Array.from(stages).sort((a, b) => a - b).map((stage) => ({
    value: stage,
    label: `Stage ${stage}`,
    count: countBy((s) => s.stage === stage)
  }));
});

const domainOptions = computed(() => {
  const domains = new Set(props.skills.map((s) => s.domain));
  return Array.from(domains).sort().map((domain) => ({
    value: domain,
    label: domain,
    count: countBy((s) => s.domain === domain)
  }));
});

const outputOptions = computed(() => {
  const outputs = new Set(props.skills.map((s) => s.output_kind));
  return Array.from(outputs).sort().map((output) => ({
    value: output,
    label: output,
    count: countBy((s) => s.output_kind === output)
  }));
});

const trustOptions = computed(() => {
  return Array.from(props.availableTrustClasses).sort().map((tc) => ({
    value: tc,
    label: tc,
    count: countBy((s) => s.trust_class === tc)
  }));
});

const showStageFilter = computed(() => stageOptions.value.length > 1);
const showDomainFilter = computed(() => domainOptions.value.length > 1);
const showOutputFilter = computed(() => outputOptions.value.length > 1);
const showTrustFilter = computed(() => props.availableTrustClasses.size > 1);
const showAnyFilter = computed(
  () => showStageFilter.value || showDomainFilter.value || showOutputFilter.value || showTrustFilter.value
);

const setFilter = (key, value) => {
  const current = props.filters[key];
  const next = current === value ? null : value; // click again → snap to "Все"
  emit("filter-change", { key, value: next });
};

const isActive = (key, value) => props.filters[key] === value;
const isAllActive = (key) => props.filters[key] === null;
</script>

<template>
  <div class="assistant-sidebar-filters">
    <p v-if="!showAnyFilter" class="assistant-sidebar-filters__empty">
      {{ skills.length }} skills в каталоге. Фильтры появятся, когда каталог станет разнообразнее.
    </p>

    <section v-if="showStageFilter" class="assistant-sidebar-filters__group">
      <h3 class="assistant-sidebar-filters__title">Stage</h3>
      <button
        type="button"
        class="assistant-sidebar-filters__item"
        :class="{ 'assistant-sidebar-filters__item--active': isAllActive('stage') }"
        @click="setFilter('stage', null)"
      >
        <span>Все</span>
        <span class="assistant-sidebar-filters__count">{{ skills.length }}</span>
      </button>
      <button
        v-for="opt in stageOptions"
        :key="`stage-${opt.value}`"
        type="button"
        class="assistant-sidebar-filters__item"
        :class="{ 'assistant-sidebar-filters__item--active': isActive('stage', opt.value) }"
        @click="setFilter('stage', opt.value)"
      >
        <span>{{ opt.label }}</span>
        <span class="assistant-sidebar-filters__count">{{ opt.count }}</span>
      </button>
    </section>

    <section v-if="showDomainFilter" class="assistant-sidebar-filters__group">
      <h3 class="assistant-sidebar-filters__title">Domain</h3>
      <button
        v-for="opt in domainOptions"
        :key="`domain-${opt.value}`"
        type="button"
        class="assistant-sidebar-filters__item"
        :class="{ 'assistant-sidebar-filters__item--active': isActive('domain', opt.value) }"
        @click="setFilter('domain', opt.value)"
      >
        <span>{{ opt.label }}</span>
        <span class="assistant-sidebar-filters__count">{{ opt.count }}</span>
      </button>
    </section>

    <section v-if="showOutputFilter" class="assistant-sidebar-filters__group">
      <h3 class="assistant-sidebar-filters__title">Output</h3>
      <button
        v-for="opt in outputOptions"
        :key="`output-${opt.value}`"
        type="button"
        class="assistant-sidebar-filters__item"
        :class="{ 'assistant-sidebar-filters__item--active': isActive('output_kind', opt.value) }"
        @click="setFilter('output_kind', opt.value)"
      >
        <span>{{ opt.label }}</span>
        <span class="assistant-sidebar-filters__count">{{ opt.count }}</span>
      </button>
    </section>

    <section v-if="showTrustFilter" class="assistant-sidebar-filters__group">
      <h3 class="assistant-sidebar-filters__title">Trust class</h3>
      <button
        v-for="opt in trustOptions"
        :key="`trust-${opt.value}`"
        type="button"
        class="assistant-sidebar-filters__item"
        :class="{ 'assistant-sidebar-filters__item--active': isActive('trust_class', opt.value) }"
        @click="setFilter('trust_class', opt.value)"
      >
        <span>{{ opt.label }}</span>
        <span class="assistant-sidebar-filters__count">{{ opt.count }}</span>
      </button>
    </section>
  </div>
</template>
