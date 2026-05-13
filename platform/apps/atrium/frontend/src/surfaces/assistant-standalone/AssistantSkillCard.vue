<script setup>
import { computed } from "vue";
import AssistantTemplateRow from "./AssistantTemplateRow.vue";

const props = defineProps({
  skill: { type: Object, required: true }
});

const emit = defineEmits(["enable-template", "go-to-routine", "ask-in-chat"]);

const trustClassLabel = computed(() => {
  switch (props.skill.trust_class) {
    case "trusted_graph": return "trusted_graph";
    case "untrusted_web": return "untrusted_web";
    case "trusted_user_input": return "trusted_user_input";
    case "proposed_kadath": return "proposed_kadath";
    case "untrusted_external_mcp": return "untrusted_external_mcp";
    case "untrusted_sensor": return "untrusted_sensor";
    default: return props.skill.trust_class;
  }
});

const trustClassVariant = computed(() => {
  switch (props.skill.trust_class) {
    case "trusted_graph":
    case "trusted_user_input":
      return "success";
    case "untrusted_web":
    case "untrusted_external_mcp":
    case "untrusted_sensor":
      return "warning";
    default:
      return "info";
  }
});

const domainIconLetter = computed(() => {
  const letter = (props.skill.domain || "?")[0];
  return letter ? letter.toUpperCase() : "?";
});

const evalLabel = computed(() => {
  const hash = props.skill.eval_hash ? ` · hash ${props.skill.eval_hash}` : "";
  return `${props.skill.eval_passed ? "eval ✓" : "eval ✗"}${hash}`;
});

const onEnable = (templateId) => emit("enable-template", { skillId: props.skill.id, templateId });
const onGoToRoutine = (instanceId) => emit("go-to-routine", instanceId);
const onAskInChat = () => emit("ask-in-chat", props.skill.id);
</script>

<template>
  <article class="assistant-skill-card">
    <header class="assistant-skill-card__head">
      <div class="assistant-skill-card__icon" :data-domain="skill.domain">{{ domainIconLetter }}</div>
      <div class="assistant-skill-card__id">
        <div class="assistant-skill-card__title">{{ skill.display_name || skill.id }}</div>
        <div class="assistant-skill-card__version">skill · v{{ skill.version }} · stage {{ skill.stage }}</div>
      </div>
      <span
        class="assistant-skill-card__trust"
        :data-variant="trustClassVariant"
      >{{ trustClassLabel }}</span>
      <span class="assistant-skill-card__eval">{{ evalLabel }}</span>
    </header>

    <p class="assistant-skill-card__body">{{ skill.description }}</p>

    <div class="assistant-skill-card__meta">
      <div class="assistant-skill-card__meta-row">
        <span class="assistant-skill-card__meta-label">reads</span>
        <span class="assistant-skill-card__meta-value">{{ skill.reads.join(" · ") || "—" }}</span>
      </div>
      <div class="assistant-skill-card__meta-row">
        <span class="assistant-skill-card__meta-label">writes</span>
        <span class="assistant-skill-card__meta-value">{{ skill.writes.join(" · ") || "—" }}</span>
      </div>
      <div v-if="skill.forbidden.length" class="assistant-skill-card__meta-row">
        <span class="assistant-skill-card__meta-label">forbidden</span>
        <span class="assistant-skill-card__meta-value">{{ skill.forbidden.join(" · ") }}</span>
      </div>
    </div>

    <div class="assistant-skill-card__templates">
      <div class="assistant-skill-card__templates-title">Templates на этом skill'е</div>
      <template v-if="skill.templates.length">
        <AssistantTemplateRow
          v-for="t in skill.templates"
          :key="t.id"
          :template="t"
          @enable="onEnable"
          @go-to-routine="onGoToRoutine"
        />
      </template>
      <div v-else class="assistant-skill-card__templates-empty">
        — нет shipped templates · используется ad-hoc через chat
      </div>
    </div>

    <footer class="assistant-skill-card__footer">
      <button type="button" class="assistant-skill-card__chat" @click="onAskInChat">
        Запустить
      </button>
    </footer>
  </article>
</template>
