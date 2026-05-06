<script setup>
import { MessageCircle, Send, Square, X } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { computed, nextTick, ref, watch } from "vue";
import { useAssistantStore } from "../stores/assistant.js";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import AssistantMarkdown from "./assistant-standalone/AssistantMarkdown.vue";

const assistantStore = useAssistantStore();
const appStore = useAtriumAppStore();
const scrollRef = ref(null);

const props = defineProps({
  embedded: {
    type: Boolean,
    default: true
  }
});

const {
  activeTarget,
  canSend,
  draft,
  isOpen,
  messages,
  selectedTargetId,
  streaming,
  targets
} = storeToRefs(assistantStore);
const { currentLang } = storeToRefs(appStore);

const labels = computed(() => {
  if (currentLang.value === "ru") {
    return {
      close: "Закрыть",
      empty: "Нет сообщений",
      input: "Сообщение",
      newChat: "Очистить",
      model: "Модель",
      send: "Отправить",
      stop: "Остановить",
      stopped: "Остановлено",
      title: "Assistant"
    };
  }
  return {
    close: "Close",
    empty: "No messages",
    input: "Message",
    newChat: "Clear",
    model: "Model",
    send: "Send",
    stop: "Stop",
      stopped: "Stopped",
      title: "Assistant"
  };
});

const submit = () => {
  assistantStore.send();
};

watch(
  messages,
  async () => {
    await nextTick();
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
  },
  { deep: true }
);
</script>

<template>
  <aside
    v-if="embedded ? isOpen : true"
    class="atrium-assistant"
    :class="{ 'atrium-assistant--product': !embedded }"
    aria-label="Void Assistant"
  >
    <header class="atrium-assistant__header">
      <div class="atrium-assistant__title">
        <MessageCircle :size="18" />
        <span>{{ labels.title }}</span>
      </div>

      <div class="atrium-assistant__header-actions">
        <button
          v-if="embedded"
          type="button"
          class="atrium-assistant__text-button"
          :disabled="streaming || messages.length === 0"
          @click="assistantStore.clear"
        >
          {{ labels.newChat }}
        </button>
        <button
          type="button"
          class="atrium-assistant__icon-button"
          :aria-label="labels.close"
          :title="labels.close"
          @click="assistantStore.close"
        >
          <X :size="17" />
        </button>
      </div>
    </header>

    <div v-if="targets.length > 1" class="atrium-assistant__profile">
      <label class="atrium-assistant__profile-label" for="atrium-assistant-target">
        {{ labels.model }}
      </label>
      <select
        id="atrium-assistant-target"
        v-model="selectedTargetId"
        class="atrium-assistant__profile-select"
        :disabled="streaming"
      >
        <option v-for="target in targets" :key="target.id" :value="target.id">
          {{ target.label }}
        </option>
      </select>
    </div>

    <div ref="scrollRef" class="atrium-assistant__messages">
      <div v-if="messages.length === 0" class="atrium-assistant__empty">
        {{ labels.empty }}
      </div>

      <article
        v-for="message in messages"
        :key="message.id"
        class="atrium-assistant__message"
        :class="{
          'atrium-assistant__message--user': message.role === 'user',
          'atrium-assistant__message--assistant': message.role === 'assistant',
          'atrium-assistant__message--error': message.error
        }"
      >
        <AssistantMarkdown
          v-if="message.content"
          :content="message.content"
          :render-diagrams="message.role === 'assistant' && !message.error"
        />
        <p v-else-if="message.stopped">{{ labels.stopped }}</p>
        <span v-else class="atrium-assistant__cursor" />
      </article>
    </div>

    <footer class="atrium-assistant__footer">
      <div v-if="activeTarget" class="atrium-assistant__model">
        {{ activeTarget.provider_label }} · {{ activeTarget.model }}
      </div>

      <form class="atrium-assistant__form" @submit.prevent="submit">
        <textarea
          v-model="draft"
          class="atrium-assistant__input"
          rows="3"
          :placeholder="labels.input"
          :aria-label="labels.input"
          :disabled="streaming"
          @keydown.meta.enter.prevent="submit"
          @keydown.ctrl.enter.prevent="submit"
        />
        <button
          v-if="streaming"
          type="button"
          class="atrium-assistant__icon-button atrium-assistant__send"
          :aria-label="labels.stop"
          :title="labels.stop"
          @click="assistantStore.abort"
        >
          <Square :size="16" />
        </button>
        <button
          v-else
          type="submit"
          class="atrium-assistant__icon-button atrium-assistant__send"
          :aria-label="labels.send"
          :title="labels.send"
          :disabled="!canSend"
        >
          <Send :size="16" />
        </button>
      </form>
    </footer>
  </aside>
</template>
