<script setup>
import { computed } from "vue";
import { Copy, RotateCcw, Bot, AlertCircle } from "lucide-vue-next";
import AssistantMarkdown from "./AssistantMarkdown.vue";

const props = defineProps({
  message: { type: Object, required: true },
  streaming: { type: Boolean, default: false },
  showRegenerate: { type: Boolean, default: false }
});

const emit = defineEmits(["regenerate"]);

const isUser = computed(() => props.message.role === "user");
const isAssistant = computed(() => props.message.role === "assistant");
const isStreamingTail = computed(
  () => props.streaming && isAssistant.value && !props.message.error
);
const showCursor = computed(() => isStreamingTail.value);

const timestamp = computed(() => formatTimestamp(props.message.created_at));
const fullTimestamp = computed(() => props.message.created_at || "");

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  if (sameDay) return `${hh}:${mm}`;
  const dd = String(date.getDate()).padStart(2, "0");
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mo} ${hh}:${mm}`;
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

    <div class="assistant-message__body">
      <AssistantMarkdown
        v-if="message.content || !isStreamingTail"
        :content="message.content"
      />
      <span v-if="showCursor" class="assistant-message__cursor" aria-hidden="true" />
      <p v-if="message.error" class="assistant-message__error-line">
        <AlertCircle :size="14" />
        <span>{{ message.content || "Assistant error" }}</span>
      </p>
      <p v-else-if="message.stopped" class="assistant-message__stopped-line">
        Generation stopped.
      </p>

      <div class="assistant-message__meta">
        <time
          v-if="timestamp"
          class="assistant-message__time"
          :datetime="fullTimestamp"
          :title="fullTimestamp"
        >{{ timestamp }}</time>

        <div v-if="isAssistant && !isStreamingTail" class="assistant-message__actions">
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
        </div>
      </div>
    </div>
  </article>
</template>
