<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAssistantSkillsStore } from "../../stores/assistant-skills.js";
import AssistantSkillCard from "./AssistantSkillCard.vue";

const props = defineProps({
  lang: { type: String, default: "en" },
  t: { type: Function, required: true }
});

const emit = defineEmits(["enable-template", "go-to-routine", "ask-in-chat"]);

const store = useAssistantSkillsStore();
const { filteredSkills, loaded, loading, status, skills, filters } = storeToRefs(store);

const hasActiveFilter = computed(() => {
  const f = filters.value;
  return f.stage !== null || f.domain !== null || f.output_kind !== null || f.trust_class !== null;
});

const isEmptyAfterFilter = computed(
  () => loaded.value && skills.value.length > 0 && filteredSkills.value.length === 0
);

const onResetFilters = () => store.resetFilters();
const onEnableTemplate = (payload) => emit("enable-template", payload);
const onGoToRoutine = (instanceId) => emit("go-to-routine", instanceId);
const onAskInChat = (skillId) => emit("ask-in-chat", skillId);

onMounted(() => {
  store.loadSkills({ locale: props.lang });
});
</script>

<template>
  <div class="assistant-capabilities">
    <div class="assistant-capabilities__inner">
      <p class="assistant-capabilities__intro">
        {{ t("assistant.capabilities.intro") }}
      </p>

      <p v-if="loading && !loaded" class="assistant-capabilities__hint">{{ t("assistant.capabilities.loading") }}</p>

      <p v-else-if="status" class="assistant-capabilities__error" role="alert">{{ status }}</p>

      <template v-else-if="loaded">
        <p v-if="!skills.length" class="assistant-capabilities__hint">
          {{ t("assistant.capabilities.empty") }}
        </p>

        <div v-else-if="isEmptyAfterFilter" class="assistant-capabilities__hint">
          <p>{{ t("assistant.capabilities.noResults") }}</p>
          <button type="button" class="assistant-capabilities__reset" @click="onResetFilters">
            {{ t("assistant.capabilities.resetFilters") }}
          </button>
        </div>

        <div v-else class="assistant-capabilities__list">
          <AssistantSkillCard
            v-for="skill in filteredSkills"
            :key="skill.id"
            :skill="skill"
            :t="t"
            @enable-template="onEnableTemplate"
            @go-to-routine="onGoToRoutine"
            @ask-in-chat="onAskInChat"
          />
        </div>
      </template>
    </div>
  </div>
</template>
