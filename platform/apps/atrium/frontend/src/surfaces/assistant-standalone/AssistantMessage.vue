<script setup>
import { computed } from "vue";
import {
  Check,
  Copy,
  X,
  RotateCcw,
  Trash2,
  Bot,
  AlertCircle,
  LoaderCircle
} from "lucide-vue-next";
import PlatformUserAvatar from "../../platform/components/PlatformUserAvatar.vue";
import { hasResolvedPlatformAccount } from "../../platform/account.js";
import AssistantMarkdown from "./AssistantMarkdown.vue";
import BlockRenderer from "./blocks/BlockRenderer.vue";

const props = defineProps({
  message: { type: Object, required: true },
  currentUser: { type: Object, default: null },
  streaming: { type: Boolean, default: false },
  streamingStatus: { type: String, default: "" },
  showRegenerate: { type: Boolean, default: false },
  showDelete: { type: Boolean, default: false }
});

const emit = defineEmits([
  "regenerate",
  "delete",
  "approve-skills",
  "reject-skill",
  "cancel-skill",
  "change-layout"
]);

const isUser = computed(() => props.message.role === "user");
const isAssistant = computed(() => props.message.role === "assistant");
const showUserAvatar = computed(() => isUser.value && hasResolvedPlatformAccount(props.currentUser));
const isStreamingTail = computed(
  () => props.streaming && isAssistant.value && !props.message.error
);
const showStreamingStatus = computed(
  () => isStreamingTail.value && !props.message.content && props.streamingStatus
);
const skillBlocks = computed(() => {
  if (Array.isArray(props.message.skill_runs) && props.message.skill_runs.length) {
    return props.message.skill_runs.flatMap((skillRun) => skillRun.blocks || []);
  }
  return props.message.skill_run?.blocks || [];
});
const hasSkillBlocks = computed(() => skillBlocks.value.length > 0);
const isSkillProposal = computed(() => props.message.message_kind === "skill_proposal");
const isSkillResult = computed(() => props.message.message_kind === "skill_result");
const layoutVariant = computed(() => props.message.layout_config?.variant || "cards");
const nextLayoutVariant = computed(() => (layoutVariant.value === "compact" ? "cards" : "compact"));
const layoutButtonLabel = computed(() => (nextLayoutVariant.value === "compact" ? "Compact" : "Cards"));
const proposalSkillRuns = computed(() => {
  if (Array.isArray(props.message.skill_runs) && props.message.skill_runs.length) {
    return props.message.skill_runs;
  }
  return props.message.skill_run ? [props.message.skill_run] : [];
});
const proposalSkillIds = computed(() =>
  proposalSkillRuns.value.map((skillRun) => skillRun.skill_id || skillRun.id).filter(Boolean)
);
const proposalStatus = computed(() => {
  const statuses = proposalSkillRuns.value.map((skillRun) => skillRun.status).filter(Boolean);
  return statuses.length ? statuses.join(" · ") : "awaiting_approval";
});
const canActOnProposal = computed(
  () =>
    proposalSkillRuns.value.length > 0 &&
    proposalSkillRuns.value.every((skillRun) => skillRun.status === "awaiting_approval")
);
const showCursor = computed(() => isStreamingTail.value);
const timestamp = computed(() => formatTimestamp(props.message.created_at));
const fullTimestamp = computed(() => props.message.created_at || "");
const showActions = computed(
  () =>
    isAssistant.value &&
    !isStreamingTail.value &&
    (props.message.content || hasSkillBlocks.value || props.showRegenerate || props.showDelete)
);
const showFooter = computed(() => (timestamp.value && !isStreamingTail.value) || showActions.value);

function formatTimestamp(value) {
  // Дата выводится через day-separator выше по conversation, время в самом
  // сообщении даёт только HH:MM. Полная ISO остаётся в title и datetime
  // атрибутах для hover-tooltip и a11y.
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const copyContent = async () => {
  if (!navigator?.clipboard) return;
  try {
    await navigator.clipboard.writeText(String(props.message.content || ""));
  } catch (error) {
    console.error("void-assistant: copy failed", error);
  }
};

const onRegenerate = () => {
  emit("regenerate");
};

const onDelete = () => {
  emit("delete", props.message.id);
};

const onApproveSkill = () => {
  const ids = proposalSkillRuns.value.map((skillRun) => skillRun.id).filter(Boolean);
  if (ids.length) emit("approve-skills", ids);
};

const onRejectSkill = () => {
  for (const skillRun of proposalSkillRuns.value) {
    if (skillRun.id) emit("reject-skill", skillRun.id);
  }
};

const onCancelSkill = () => {
  for (const skillRun of proposalSkillRuns.value) {
    if (skillRun.id) emit("cancel-skill", skillRun.id);
  }
};

const onChangeLayout = () => {
  emit("change-layout", { messageId: props.message.id, variant: nextLayoutVariant.value });
};
</script>

<template>
  <article
    class="assistant-message"
    :class="{
      'assistant-message--user': isUser,
      'assistant-message--assistant': isAssistant,
      'assistant-message--error': message.error,
      'assistant-message--stopped': message.stopped,
      'assistant-message--streaming': isStreamingTail
    }"
  >
    <div v-if="isAssistant" class="assistant-message__avatar" aria-hidden="true">
      <Bot :size="16" />
    </div>

    <div class="assistant-message__stack">
      <div class="assistant-message__body">
        <AssistantMarkdown
          v-if="!isSkillProposal && !hasSkillBlocks && (message.content || !isStreamingTail)"
          :content="message.content"
          :render-diagrams="isAssistant && !message.error"
        />
        <div v-if="isSkillProposal" class="assistant-message__proposal">
          <div class="assistant-message__proposal-main">
            <span class="assistant-message__proposal-title">{{ message.content }}</span>
            <span class="assistant-message__proposal-meta">{{ proposalSkillIds.join(" · ") }} · {{ proposalStatus }}</span>
          </div>
          <ul v-if="proposalSkillRuns.length > 1" class="assistant-message__proposal-list">
            <li v-for="skillRun in proposalSkillRuns" :key="skillRun.id">
              <span>{{ skillRun.skill_id }}</span>
              <span>{{ skillRun.status }}</span>
            </li>
          </ul>
          <div v-if="canActOnProposal" class="assistant-message__proposal-actions">
            <button type="button" class="assistant-message__proposal-button" @click="onApproveSkill">
              <Check :size="14" />
              <span>Запустить</span>
            </button>
            <button type="button" class="assistant-message__proposal-button" @click="onRejectSkill">
              <X :size="14" />
              <span>Отклонить</span>
            </button>
            <button type="button" class="assistant-message__proposal-button" @click="onCancelSkill">
              <X :size="14" />
              <span>Отмена</span>
            </button>
          </div>
        </div>
        <BlockRenderer v-if="hasSkillBlocks" :blocks="skillBlocks" />
        <p
          v-if="showStreamingStatus"
          class="assistant-message__streaming-line"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle :size="14" />
          <span>{{ streamingStatus }}</span>
        </p>
        <span v-if="showCursor" class="assistant-message__cursor" aria-hidden="true" />
        <p v-if="message.error" class="assistant-message__error-line">
          <AlertCircle :size="14" />
          <span>{{ message.content || "Assistant error" }}</span>
        </p>
        <p v-else-if="message.stopped" class="assistant-message__stopped-line">
          Generation stopped.
        </p>
      </div>

      <div v-if="showFooter" class="assistant-message__footer">
        <time
          v-if="timestamp && !isStreamingTail"
          class="assistant-message__time"
          :datetime="fullTimestamp"
          :title="fullTimestamp"
        >{{ timestamp }}</time>
        <div v-if="showActions" class="assistant-message__actions">
          <button
            v-if="isSkillResult && hasSkillBlocks"
            type="button"
            class="assistant-message__action assistant-message__action--text"
            @click="onChangeLayout"
            :aria-label="'Change skill layout'"
          >
            {{ layoutButtonLabel }}
          </button>
          <button
            v-if="message.content"
            type="button"
            class="assistant-message__action"
            @click="copyContent"
            :aria-label="'Copy message'"
          >
            <Copy :size="14" />
          </button>
          <button
            v-if="showRegenerate"
            type="button"
            class="assistant-message__action"
            @click="onRegenerate"
            :aria-label="'Regenerate response'"
          >
            <RotateCcw :size="14" />
          </button>
          <button
            v-if="showDelete"
            type="button"
            class="assistant-message__action assistant-message__action--danger"
            @click="onDelete"
            :aria-label="'Delete message pair'"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
    </div>

    <PlatformUserAvatar
      v-if="showUserAvatar"
      :user="currentUser"
      size="message"
      class="assistant-message__avatar assistant-message__avatar--user"
      aria-hidden="true"
    />
  </article>
</template>
