<script setup>
import { computed } from "vue";
import AssistantTemplateRow from "./AssistantTemplateRow.vue";

const props = defineProps({
  skill: { type: Object, required: true },
  t: { type: Function, required: true }
});

const emit = defineEmits(["enable-template", "go-to-routine", "ask-in-chat"]);
const t = (key, vars = {}) => props.t(key, vars);

const trustClassLabel = computed(() => {
  const key = `assistant.skill.trust.${props.skill.trust_class}`;
  const label = t(key);
  return label === key ? t("assistant.skill.trust.unknown") : label;
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
  return props.skill.eval_passed ? t("assistant.skill.evalPassed") : t("assistant.skill.evalNeedsReview");
});

const invocationPhrase = computed(() => {
  const key = `assistant.skill.invoke.${props.skill.id}`;
  const phrase = t(key);
  return phrase === key
    ? t("assistant.skill.invoke.default", { name: props.skill.display_name || props.skill.id })
    : phrase;
});

const sourceLabel = computed(() => {
  if (props.skill.reads.includes("http_get_json")) return t("assistant.skill.source.http");
  if (props.skill.reads.length === 0) return t("assistant.skill.source.none");
  return t("assistant.skill.source.allowed");
});

const resultLabel = computed(() => {
  if (props.skill.writes.includes("digest_run.v1")) return t("assistant.skill.result.digest");
  if (props.skill.writes.length === 0) return t("assistant.skill.result.none");
  return t("assistant.skill.result.structured");
});

const restrictionsLabel = computed(() => {
  if (!props.skill.forbidden.length) return t("assistant.skill.restrictions.none");
  return props.skill.forbidden.join(" · ");
});

const technicalDetails = computed(() => [
  `id: ${props.skill.id}`,
  `stage: ${props.skill.stage}`,
  `trust_class: ${props.skill.trust_class}`,
  `reads: ${props.skill.reads.join(" · ") || "none"}`,
  `writes: ${props.skill.writes.join(" · ") || "none"}`,
  `eval: ${props.skill.eval_passed ? "passed" : "failed"}${props.skill.eval_hash ? ` · hash ${props.skill.eval_hash}` : ""}`
]);

const onEnable = (templateId) => {
  const template = props.skill.templates.find((item) => item.id === templateId);
  emit("enable-template", {
    skillId: props.skill.id,
    templateId,
    params: template?.params || {},
    variant: template?.variant || null
  });
};
const onGoToRoutine = (instanceId) => emit("go-to-routine", instanceId);
const onAskInChat = () => emit("ask-in-chat", props.skill.id);
</script>

<template>
  <article class="assistant-skill-card">
    <header class="assistant-skill-card__head">
      <div class="assistant-skill-card__icon" :data-domain="skill.domain">{{ domainIconLetter }}</div>
      <div class="assistant-skill-card__id">
        <div class="assistant-skill-card__title">{{ skill.display_name || skill.id }}</div>
        <div class="assistant-skill-card__version">{{ t("assistant.skill.version", { version: skill.version }) }}</div>
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
        <span class="assistant-skill-card__meta-label">{{ t("assistant.skill.source") }}</span>
        <span class="assistant-skill-card__meta-value">{{ sourceLabel }}</span>
      </div>
      <div class="assistant-skill-card__meta-row">
        <span class="assistant-skill-card__meta-label">{{ t("assistant.skill.result") }}</span>
        <span class="assistant-skill-card__meta-value">{{ resultLabel }}</span>
      </div>
      <div class="assistant-skill-card__meta-row">
        <span class="assistant-skill-card__meta-label">{{ t("assistant.skill.restrictions") }}</span>
        <span class="assistant-skill-card__meta-value">{{ restrictionsLabel }}</span>
      </div>
    </div>

    <div class="assistant-skill-card__templates">
      <div class="assistant-skill-card__templates-title">{{ t("assistant.skill.call") }}</div>
      <template v-if="skill.templates.length">
        <AssistantTemplateRow
          v-for="template in skill.templates"
          :key="template.id"
          :template="template"
          :t="props.t"
          @enable="onEnable"
          @go-to-routine="onGoToRoutine"
        />
      </template>
      <div v-else class="assistant-skill-card__templates-empty">
        {{ t("assistant.skill.sayInChat", { phrase: invocationPhrase }) }}
        <span class="assistant-skill-card__launch-explain">
          {{ t("assistant.skill.launchExplain") }}
        </span>
      </div>
    </div>

    <details class="assistant-skill-card__details">
      <summary class="assistant-skill-card__details-summary">{{ t("assistant.skill.details") }}</summary>
      <ul class="assistant-skill-card__details-list">
        <li v-for="detail in technicalDetails" :key="detail">{{ detail }}</li>
      </ul>
    </details>

    <footer class="assistant-skill-card__footer">
      <span class="assistant-skill-card__footer-note">
        {{ t("assistant.skill.footer") }}
      </span>
      <button
        type="button"
        class="assistant-skill-card__chat"
        :title="t('assistant.skill.openInChatTitle')"
        @click="onAskInChat"
      >
        {{ t("assistant.skill.openInChat") }}
      </button>
    </footer>
  </article>
</template>
