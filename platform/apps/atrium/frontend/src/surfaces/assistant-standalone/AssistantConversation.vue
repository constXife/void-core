<script setup>
import { computed, nextTick, ref, watch } from "vue";
import AssistantMessage from "./AssistantMessage.vue";
import AssistantEmptyState from "./AssistantEmptyState.vue";

const props = defineProps({
  messages: { type: Array, default: () => [] },
  streaming: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  hasSession: { type: Boolean, default: false },
  suggestions: { type: Array, default: () => [] },
  sessionKey: { type: String, default: "draft" }
});

const emit = defineEmits(["regenerate", "choose-suggestion"]);

const scrollerRef = ref(null);

const lastAssistantId = computed(() => {
  for (let index = props.messages.length - 1; index >= 0; index -= 1) {
    if (props.messages[index].role === "assistant") {
      return props.messages[index].id;
    }
  }
  return null;
});

const showEmpty = computed(() => !props.hasSession || props.messages.length === 0);

const scrollToBottom = () => {
  const node = scrollerRef.value;
  if (!node) return;
  node.scrollTop = node.scrollHeight;
};

watch(
  () => props.messages.map((message) => `${message.id}:${message.content.length}`).join("|"),
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
          @choose="(value) => emit('choose-suggestion', value)"
        />
        <p v-else-if="loading && messages.length === 0" class="assistant-conversation__loading">
          Загружаем чат…
        </p>
        <TransitionGroup v-else name="assistant-message" tag="div" class="assistant-conversation__list" appear>
          <AssistantMessage
            v-for="(message, index) in messages"
            :key="message.id"
            :message="message"
            :streaming="streaming && message.id === lastAssistantId"
            :show-regenerate="
              !streaming &&
              message.role === 'assistant' &&
              index === messages.length - 1
            "
            @regenerate="emit('regenerate')"
          />
        </TransitionGroup>
      </div>
    </Transition>
  </div>
</template>
