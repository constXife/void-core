<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import AssistantSidebar from "./assistant-standalone/AssistantSidebar.vue";
import AssistantConversation from "./assistant-standalone/AssistantConversation.vue";
import AssistantComposer from "./assistant-standalone/AssistantComposer.vue";
import { useAssistantStore } from "../stores/assistant.js";
import { useAssistantSessionsStore } from "../stores/assistant-sessions.js";

const STORAGE_KEY_SIDEBAR = "void.assistant.sidebar.collapsed";

const SUGGESTIONS = [
  "Объясни код",
  "Сгенерируй идею",
  "Помоги с письмом",
  "Сделай резюме"
];

const route = useRoute();
const router = useRouter();
const coreStore = useAssistantStore();
const sessionsStore = useAssistantSessionsStore();

const { enabled, loaded, targets, selectedTargetId } = storeToRefs(coreStore);
const {
  sessions,
  trashedSessions,
  trashedLoaded,
  groupedSessions,
  currentSession,
  currentMessages,
  currentSessionId,
  draft,
  streaming,
  status,
  loadingSessions,
  loadingCurrent,
  canSend
} = storeToRefs(sessionsStore);

const sidebarCollapsed = ref(loadSidebarPreference());

const targetLabel = computed(() => {
  const targetId = currentSession.value?.target_id || selectedTargetId.value;
  if (!targetId) return "";
  const match = targets.value.find((target) => target.id === targetId);
  return match ? `${match.provider_label} · ${match.model}` : targetId;
});

const composerDisabled = computed(() => loaded.value && !enabled.value);

const onChooseSuggestion = (text) => {
  draft.value = text;
};

const onSend = async () => {
  await sessionsStore.send({ targetId: selectedTargetId.value });
  if (currentSessionId.value && route.params.id !== currentSessionId.value) {
    router.replace({ name: "assistant-chat", params: { id: currentSessionId.value } });
  }
};

const onStop = () => {
  sessionsStore.abort();
};

const onRegenerate = () => {
  sessionsStore.regenerateLast({ targetId: selectedTargetId.value });
};

const onSelect = (id) => {
  if (id === currentSessionId.value) return;
  router.push({ name: "assistant-chat", params: { id } });
};

const onNewChat = () => {
  sessionsStore.selectSession("");
  if (route.name !== "assistant-home") {
    router.push({ path: "/" });
  }
};

const onRename = async (session) => {
  const next = window.prompt("Новое название чата", session.title || "");
  if (next === null) return;
  const trimmed = String(next).trim();
  if (!trimmed) return;
  try {
    await sessionsStore.renameSession(session.id, trimmed);
  } catch (error) {
    console.error("void-assistant: rename failed", error);
  }
};

const onDelete = async (session) => {
  const confirmed = window.confirm(
    `Удалить чат «${session.title || "Без названия"}»? Его можно восстановить из корзины.`
  );
  if (!confirmed) return;
  try {
    await sessionsStore.softDeleteSession(session.id);
    if (route.params.id === session.id) {
      router.replace({ path: "/" });
    }
  } catch (error) {
    console.error("void-assistant: delete failed", error);
  }
};

const onRestore = async (session) => {
  try {
    const restored = await sessionsStore.restoreSession(session.id);
    router.push({ name: "assistant-chat", params: { id: restored.id } });
  } catch (error) {
    console.error("void-assistant: restore failed", error);
  }
};

const onOpenTrash = () => {
  sessionsStore.loadTrashed();
};

const syncFromRoute = async () => {
  const id = String(route.params.id || "");
  if (id !== currentSessionId.value) {
    await sessionsStore.selectSession(id);
  }
};

watch(
  () => route.params.id,
  () => {
    syncFromRoute();
  }
);

watch(sidebarCollapsed, (next) => {
  saveSidebarPreference(next);
});

onMounted(async () => {
  await coreStore.loadModels({ force: true });
  await sessionsStore.loadSessions();
  await syncFromRoute();
});

function loadSidebarPreference() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY_SIDEBAR) === "1";
  } catch {
    return false;
  }
}

function saveSidebarPreference(value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_SIDEBAR, value ? "1" : "0");
  } catch {
    /* localStorage недоступен — допустимо, это лишь device-local convenience */
  }
}
</script>

<template>
  <section
    class="assistant-standalone"
    :class="{ 'assistant-standalone--sidebar-collapsed': sidebarCollapsed }"
  >
    <AssistantSidebar
      :groups="groupedSessions"
      :trashed="trashedSessions"
      :trashed-loaded="trashedLoaded"
      :active-id="currentSessionId"
      :loading="loadingSessions && sessions.length === 0"
      @new-chat="onNewChat"
      @select="onSelect"
      @rename="onRename"
      @delete="onDelete"
      @restore="onRestore"
      @open-trash="onOpenTrash"
    />

    <main class="assistant-standalone__main">
      <AssistantConversation
        :messages="currentMessages"
        :streaming="streaming"
        :loading="loadingCurrent"
        :has-session="Boolean(currentSession)"
        :suggestions="SUGGESTIONS"
        @regenerate="onRegenerate"
        @choose-suggestion="onChooseSuggestion"
      />

      <AssistantComposer
        v-model="draft"
        :streaming="streaming"
        :can-send="canSend"
        :model-label="targetLabel"
        :disabled="composerDisabled"
        @send="onSend"
        @stop="onStop"
      />

      <p v-if="status" class="assistant-standalone__status" role="status">
        {{ status }}
      </p>
    </main>
  </section>
</template>
