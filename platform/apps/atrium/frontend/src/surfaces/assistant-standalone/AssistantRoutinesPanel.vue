<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAssistantRoutinesStore } from "../../stores/assistant-routines.js";
import AssistantRoutineCard from "./AssistantRoutineCard.vue";

defineProps({
  t: { type: Function, required: true }
});

const emit = defineEmits([
  "open-drawer",
  "open-runs",
  "pick-template",
  "open-menu"
]);

const store = useAssistantRoutinesStore();
const { filteredInstances, instances, loaded, loading, status, filters, saving } = storeToRefs(store);

const hasActiveFilter = computed(() => {
  const f = filters.value;
  return f.status !== null || f.trigger_kind !== null || f.autonomy_level !== null;
});

const isEmptyAfterFilter = computed(
  () => loaded.value && instances.value.length > 0 && filteredInstances.value.length === 0
);

const isEmptyOverall = computed(() => loaded.value && instances.value.length === 0);

const onToggle = (id) => store.toggleInstance(id);
const onOpenDrawer = (payload) => emit("open-drawer", payload);
const onOpenRuns = (id) => emit("open-runs", id);
const onOpenMenu = (id) => emit("open-menu", id);
const onPickTemplate = () => emit("pick-template");
const onResetFilters = () => store.resetFilters();

onMounted(() => {
  store.loadInstances();
});
</script>

<template>
  <div class="assistant-routines">
    <div class="assistant-routines__inner">
      <header class="assistant-routines__head">
        <div>
          <h1 class="assistant-routines__title">{{ t("assistant.routines.title") }}</h1>
          <p class="assistant-routines__sub">
            {{ t("assistant.routines.intro") }}
          </p>
        </div>
        <button
          type="button"
          class="assistant-routines__new"
          @click="onPickTemplate"
        >+ {{ t("assistant.routines.newFromTemplate") }}</button>
      </header>

      <p v-if="loading && !loaded" class="assistant-routines__hint">{{ t("assistant.routines.loading") }}</p>

      <p v-else-if="status" class="assistant-routines__error" role="alert">{{ status }}</p>

      <template v-else-if="loaded">
        <div v-if="isEmptyOverall" class="assistant-routines__empty">
          <h2 class="assistant-routines__empty-title">{{ t("assistant.routines.emptyTitle") }}</h2>
          <p class="assistant-routines__empty-text">
            {{ t("assistant.routines.emptyText") }}
          </p>
        </div>

        <div v-else-if="isEmptyAfterFilter" class="assistant-routines__hint">
          <p>{{ t("assistant.routines.noResults") }}</p>
          <button type="button" class="assistant-routines__reset" @click="onResetFilters">
            {{ t("assistant.routines.resetFilters") }}
          </button>
        </div>

        <div v-else class="assistant-routines__list">
          <AssistantRoutineCard
            v-for="routine in filteredInstances"
            :key="routine.id"
            :routine="routine"
            :toggle-busy="saving"
            :t="t"
            @toggle="onToggle"
            @open-drawer="onOpenDrawer"
            @open-runs="onOpenRuns"
            @open-menu="onOpenMenu"
          />
        </div>
      </template>
    </div>
  </div>
</template>
