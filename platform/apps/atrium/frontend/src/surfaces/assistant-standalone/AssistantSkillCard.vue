<script setup>
import { computed } from "vue";
import AssistantTemplateRow from "./AssistantTemplateRow.vue";

const props = defineProps({
  skill: { type: Object, required: true }
});

const emit = defineEmits(["enable-template", "go-to-routine", "ask-in-chat"]);

const trustClassLabel = computed(() => {
  switch (props.skill.trust_class) {
    case "trusted_graph": return "читает данные Void";
    case "untrusted_web": return "читает публичный веб";
    case "trusted_user_input": return "использует ваш ввод";
    case "proposed_kadath": return "готовит изменение в графе";
    case "untrusted_external_mcp": return "читает внешний сервис";
    case "untrusted_sensor": return "читает внешний сигнал";
    default: return "требует проверки источника";
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
  return props.skill.eval_passed ? "Проверено в поставке" : "Требует проверки";
});

const invocationPhrase = computed(() => {
  switch (props.skill.id) {
    case "digest_hackernews": return "дай дайджест Hacker News";
    case "digest_github": return "дай дайджест трендовых репозиториев GitHub";
    default: return `запусти ${props.skill.display_name || props.skill.id}`;
  }
});

const sourceLabel = computed(() => {
  if (props.skill.reads.includes("http_get_json")) return "читает публичные веб-источники";
  if (props.skill.reads.length === 0) return "не читает внешние источники";
  return "читает разрешённые источники";
});

const resultLabel = computed(() => {
  if (props.skill.writes.includes("digest_run.v1")) return "создаёт дайджест в чате";
  if (props.skill.writes.length === 0) return "ничего не записывает";
  return "создаёт структурированный результат";
});

const restrictionsLabel = computed(() => {
  if (!props.skill.forbidden.length) return "запрещённых действий нет";
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
        <div class="assistant-skill-card__version">Навык · версия {{ skill.version }}</div>
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
        <span class="assistant-skill-card__meta-label">Источник</span>
        <span class="assistant-skill-card__meta-value">{{ sourceLabel }}</span>
      </div>
      <div class="assistant-skill-card__meta-row">
        <span class="assistant-skill-card__meta-label">Результат</span>
        <span class="assistant-skill-card__meta-value">{{ resultLabel }}</span>
      </div>
      <div class="assistant-skill-card__meta-row">
        <span class="assistant-skill-card__meta-label">Ограничения</span>
        <span class="assistant-skill-card__meta-value">{{ restrictionsLabel }}</span>
      </div>
    </div>

    <div class="assistant-skill-card__templates">
      <div class="assistant-skill-card__templates-title">Как вызвать</div>
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
        Скажите в чате: «{{ invocationPhrase }}».
      </div>
    </div>

    <details class="assistant-skill-card__details">
      <summary class="assistant-skill-card__details-summary">Технические детали</summary>
      <ul class="assistant-skill-card__details-list">
        <li v-for="detail in technicalDetails" :key="detail">{{ detail }}</li>
      </ul>
    </details>

    <footer class="assistant-skill-card__footer">
      <button
        type="button"
        class="assistant-skill-card__chat"
        title="Откроет чат и подготовит карточку запуска. Сам skill стартует после подтверждения."
        @click="onAskInChat"
      >
        Открыть в чате
      </button>
    </footer>
  </article>
</template>
