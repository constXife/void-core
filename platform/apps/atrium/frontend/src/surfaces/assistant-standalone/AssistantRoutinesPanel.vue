<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAssistantRoutinesStore } from "../../stores/assistant-routines.js";
import AssistantRoutineCard from "./AssistantRoutineCard.vue";

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
          <h1 class="assistant-routines__title">Routines</h1>
          <p class="assistant-routines__sub">
            Это твои настроенные программы ассистента — ContractInstance per-owner.
            Чтобы создать новую, попроси в chat или выбери template из Capabilities.
          </p>
        </div>
        <button
          type="button"
          class="assistant-routines__new"
          @click="onPickTemplate"
        >+ Из template…</button>
      </header>

      <p v-if="loading && !loaded" class="assistant-routines__hint">Загружаем…</p>

      <p v-else-if="status" class="assistant-routines__error" role="alert">{{ status }}</p>

      <template v-else-if="loaded">
        <div v-if="isEmptyOverall" class="assistant-routines__empty">
          <h2 class="assistant-routines__empty-title">Пока ничего не настроено</h2>
          <p class="assistant-routines__empty-text">
            Заведи routine через диалог в Chat или нажми «+ Из template…» — наверху.
          </p>
        </div>

        <div v-else-if="isEmptyAfterFilter" class="assistant-routines__hint">
          <p>Ничего не нашлось под текущие фильтры.</p>
          <button type="button" class="assistant-routines__reset" @click="onResetFilters">
            Сбросить фильтры
          </button>
        </div>

        <div v-else class="assistant-routines__list">
          <AssistantRoutineCard
            v-for="routine in filteredInstances"
            :key="routine.id"
            :routine="routine"
            :toggle-busy="saving"
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
