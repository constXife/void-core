<script setup>
import { MessageCircle, Send, Square, X } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { computed, nextTick, ref, watch } from "vue";
import { useAssistantStore } from "../stores/assistant.js";
import { useAtriumAppStore } from "../stores/atrium-app.js";

const assistantStore = useAssistantStore();
const appStore = useAtriumAppStore();
const scrollRef = ref(null);

const {
  activeProfile,
  canSend,
  draft,
  isOpen,
  messages,
  profiles,
  selectedProfileId,
  streaming
} = storeToRefs(assistantStore);
const { currentLang } = storeToRefs(appStore);

const labels = computed(() => {
  if (currentLang.value === "ru") {
    return {
      close: "Закрыть",
      empty: "Нет сообщений",
      input: "Сообщение",
      newChat: "Очистить",
      profile: "Профиль",
      send: "Отправить",
      stop: "Остановить",
      stopped: "Остановлено"
    };
  }
  return {
    close: "Close",
    empty: "No messages",
    input: "Message",
    newChat: "Clear",
    profile: "Profile",
    send: "Send",
    stop: "Stop",
    stopped: "Stopped"
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
  <aside v-if="isOpen" class="atrium-assistant" aria-label="Atrium assistant">
    <header class="atrium-assistant__header">
      <div class="atrium-assistant__title">
        <MessageCircle :size="18" />
        <span>Atrium</span>
      </div>

      <div class="atrium-assistant__header-actions">
        <button
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

    <div v-if="profiles.length > 1" class="atrium-assistant__profile">
      <label class="atrium-assistant__profile-label" for="atrium-assistant-profile">
        {{ labels.profile }}
      </label>
      <select
        id="atrium-assistant-profile"
        v-model="selectedProfileId"
        class="atrium-assistant__profile-select"
        :disabled="streaming"
      >
        <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
          {{ profile.label }}
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
        <p v-if="message.content">{{ message.content }}</p>
        <p v-else-if="message.stopped">{{ labels.stopped }}</p>
        <span v-else class="atrium-assistant__cursor" />
      </article>
    </div>

    <footer class="atrium-assistant__footer">
      <div v-if="activeProfile" class="atrium-assistant__model">
        {{ activeProfile.label }} · {{ activeProfile.model }}
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
