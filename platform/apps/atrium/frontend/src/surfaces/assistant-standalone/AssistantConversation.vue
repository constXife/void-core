<script setup>
import { computed, nextTick, ref, watch } from "vue";
import AssistantMessage from "./AssistantMessage.vue";
import AssistantEmptyState from "./AssistantEmptyState.vue";

const props = defineProps({
  messages: { type: Array, default: () => [] },
  currentUser: { type: Object, default: null },
  streaming: { type: Boolean, default: false },
  streamingStatus: { type: String, default: "" },
  latencyTick: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  hasSession: { type: Boolean, default: false },
  suggestions: { type: Array, default: () => [] },
  sessionKey: { type: String, default: "draft" },
  t: { type: Function, required: true }
});

const t = (key, vars = {}) => props.t(key, vars);

const messagesWithSeparators = computed(() => {
  const result = [];
  let lastDayKey = "";
  for (const message of props.messages) {
    const { key, label } = describeMessageDay(message.created_at);
    if (key && key !== lastDayKey) {
      result.push({ kind: "separator", id: `sep-${key}`, label });
      lastDayKey = key;
    }
    result.push({ kind: "message", id: message.id, message });
  }
  return result;
});

function describeMessageDay(value) {
  if (!value) return { key: "", label: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { key: "", label: "" };
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  if (startOfDay === startOfToday) return { key, label: t("assistant.conversation.today") };
  if (startOfDay === startOfToday - dayMs) return { key, label: t("assistant.conversation.yesterday") };
  const sameYear = date.getFullYear() === now.getFullYear();
  const label = new Intl.DateTimeFormat(document.documentElement.lang || "en-US", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" })
  }).format(date);
  return { key, label };
}

const emit = defineEmits([
  "regenerate",
  "delete-message",
  "choose-suggestion",
  "approve-skills",
  "reject-skill",
  "approve-surface-patch",
  "reject-surface-patch",
  "change-layout"
]);

const scrollerRef = ref(null);

const lastAssistantId = computed(() => {
  for (let index = props.messages.length - 1; index >= 0; index -= 1) {
    if (props.messages[index].role === "assistant") {
      return props.messages[index].id;
    }
  }
  return null;
});

const lastMessageId = computed(() => {
  if (!props.messages.length) return null;
  return props.messages[props.messages.length - 1].id;
});

const showEmpty = computed(() => !props.hasSession || props.messages.length === 0);

function isDeletablePair(messageId) {
  const index = props.messages.findIndex((message) => message.id === messageId);
  return index > 0 && props.messages[index - 1]?.role === "user";
}

const scrollToBottom = () => {
  const node = scrollerRef.value;
  if (!node) return;
  node.scrollTop = node.scrollHeight;
};

watch(
  () =>
    props.messages
      .map((message) => {
        const skillRunIds = Array.isArray(message.skill_runs)
          ? message.skill_runs.map((skillRun) => skillRun.id).join(",")
          : "";
        return `${message.id}:${message.content.length}:${message.skill_run?.id || ""}:${skillRunIds}`;
      })
      .join("|"),
  () => nextTick(scrollToBottom),
  { flush: "post" }
);
</script>

<template>
  <div ref="scrollerRef" class="assistant-conversation">
    <Transition name="assistant-conversation-fade" mode="out-in">
      <div :key="sessionKey" class="assistant-conversation__column">
        <AssistantEmptyState
          v-if="showEmpty && !loading"
          :suggestions="suggestions"
          :t="t"
          @choose="(value) => emit('choose-suggestion', value)"
        />
        <p v-else-if="loading && messages.length === 0" class="assistant-conversation__loading">
          {{ t("assistant.conversation.loading") }}
        </p>
        <TransitionGroup v-else name="assistant-message" tag="div" class="assistant-conversation__list" appear>
          <template v-for="entry in messagesWithSeparators" :key="entry.id">
            <div v-if="entry.kind === 'separator'" class="assistant-day-separator">
              {{ entry.label }}
            </div>
            <AssistantMessage
              v-else
              :message="entry.message"
              :current-user="currentUser"
              :streaming="streaming && entry.message.id === lastAssistantId"
              :streaming-status="streamingStatus"
              :latency-tick="latencyTick"
              :show-regenerate="
                !streaming &&
                entry.message.role === 'assistant' &&
                entry.message.id === lastMessageId
              "
              :show-delete="
                !streaming && entry.message.role === 'assistant' && isDeletablePair(entry.message.id)
              "
              :t="t"
              @regenerate="emit('regenerate')"
              @delete="(id) => emit('delete-message', id)"
              @approve-skills="(ids) => emit('approve-skills', ids)"
              @reject-skill="(id) => emit('reject-skill', id)"
              @approve-surface-patch="(id) => emit('approve-surface-patch', id)"
              @reject-surface-patch="(id) => emit('reject-surface-patch', id)"
              @change-layout="(payload) => emit('change-layout', payload)"
            />
          </template>
        </TransitionGroup>
      </div>
    </Transition>
  </div>
</template>
