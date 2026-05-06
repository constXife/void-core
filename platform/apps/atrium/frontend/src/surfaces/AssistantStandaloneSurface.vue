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
const STORAGE_KEY_SIDEBAR_WIDTH = "void.assistant.sidebar.width";
const STORAGE_KEY_PREFERRED_TARGET = "void.assistant.preferred_target_id";

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 480;
const SIDEBAR_DEFAULT_WIDTH = 280;

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
const sidebarWidth = ref(clampSidebarWidth(loadSidebarWidth()));
const preferredTargetId = ref(loadPreferredTarget());

const sidebarStyle = computed(() => ({
  "--assistant-sidebar-width": `${sidebarWidth.value}px`
}));

let resizeStartX = 0;
let resizeStartWidth = 0;

const onSidebarToggle = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const onSidebarResizeStart = (event) => {
  if (sidebarCollapsed.value) return;
  resizeStartX = event.clientX;
  resizeStartWidth = sidebarWidth.value;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  document.addEventListener("mousemove", onSidebarResizeMove);
  document.addEventListener("mouseup", onSidebarResizeEnd, { once: true });
};

const onSidebarResizeMove = (event) => {
  const delta = event.clientX - resizeStartX;
  sidebarWidth.value = clampSidebarWidth(resizeStartWidth + delta);
};

const onSidebarResizeEnd = () => {
  document.removeEventListener("mousemove", onSidebarResizeMove);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  saveSidebarWidth(sidebarWidth.value);
};

const targetIdSet = computed(() => new Set(targets.value.map((target) => target.id)));

// Какая модель показывается в picker'е и используется при send.
// Target открытой сессии не подменяется silently: если он пропал из catalog,
// picker покажет недоступное состояние, а send получит честную backend-ошибку.
const composerTargetId = computed(() => {
  const sessionTarget = currentSession.value?.target_id || "";
  if (sessionTarget) return sessionTarget;
  if (preferredTargetId.value && targetIdSet.value.has(preferredTargetId.value)) {
    return preferredTargetId.value;
  }
  return selectedTargetId.value || "";
});

const composerDisabled = computed(() => loaded.value && !enabled.value);

const onChooseSuggestion = (text) => {
  draft.value = text;
};

const onSend = async () => {
  await sessionsStore.send({ targetId: composerTargetId.value });
  if (currentSessionId.value && route.params.id !== currentSessionId.value) {
    router.replace({ name: "assistant-chat", params: { id: currentSessionId.value } });
  }
};

const onStop = () => {
  sessionsStore.abort();
};

const onRegenerate = () => {
  sessionsStore.regenerateLast({ targetId: composerTargetId.value });
};

const onSelectTarget = async (targetId) => {
  if (!targetId || targetId === composerTargetId.value) return;
  if (currentSession.value) {
    await sessionsStore.changeSessionTarget(currentSession.value.id, targetId);
    return;
  }
  // В draft-режиме обновляем пользовательское предпочтение для новых чатов.
  preferredTargetId.value = targetId;
  savePreferredTarget(targetId);
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

function loadSidebarWidth() {
  if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_SIDEBAR_WIDTH);
    if (!raw) return SIDEBAR_DEFAULT_WIDTH;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : SIDEBAR_DEFAULT_WIDTH;
  } catch {
    return SIDEBAR_DEFAULT_WIDTH;
  }
}

function saveSidebarWidth(value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_SIDEBAR_WIDTH, String(value));
  } catch {
    /* see saveSidebarPreference */
  }
}

function clampSidebarWidth(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return SIDEBAR_DEFAULT_WIDTH;
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, Math.round(numeric)));
}

function loadPreferredTarget() {
  if (typeof window === "undefined") return "";
  try {
    return String(window.localStorage.getItem(STORAGE_KEY_PREFERRED_TARGET) || "");
  } catch {
    return "";
  }
}

function savePreferredTarget(value) {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY_PREFERRED_TARGET, value);
    } else {
      window.localStorage.removeItem(STORAGE_KEY_PREFERRED_TARGET);
    }
  } catch {
    /* localStorage недоступен — допустимо, это лишь device-local convenience */
  }
}
</script>

<template>
  <section
    class="assistant-standalone"
    :class="{ 'assistant-standalone--sidebar-collapsed': sidebarCollapsed }"
    :style="sidebarStyle"
  >
    <AssistantSidebar
      :groups="groupedSessions"
      :trashed="trashedSessions"
      :trashed-loaded="trashedLoaded"
      :active-id="currentSessionId"
      :loading="loadingSessions && sessions.length === 0"
      :collapsed="sidebarCollapsed"
      @new-chat="onNewChat"
      @select="onSelect"
      @rename="onRename"
      @delete="onDelete"
      @restore="onRestore"
      @open-trash="onOpenTrash"
      @toggle-collapsed="onSidebarToggle"
      @resize-start="onSidebarResizeStart"
    >
      <template v-if="$slots['sidebar-brand']" #brand>
        <slot name="sidebar-brand" />
      </template>
    </AssistantSidebar>

    <main class="assistant-standalone__main">
      <div v-if="$slots['main-actions']" class="assistant-standalone__floating-actions">
        <slot name="main-actions" />
      </div>

      <AssistantConversation
        :messages="currentMessages"
        :streaming="streaming"
        :loading="loadingCurrent"
        :has-session="Boolean(currentSession)"
        :suggestions="SUGGESTIONS"
        :session-key="currentSessionId || 'draft'"
        @regenerate="onRegenerate"
        @choose-suggestion="onChooseSuggestion"
      />

      <AssistantComposer
        v-model="draft"
        :streaming="streaming"
        :can-send="canSend"
        :targets="targets"
        :selected-target-id="composerTargetId"
        :preferred-target-id="preferredTargetId"
        :picker-disabled="composerDisabled || streaming"
        :disabled="composerDisabled"
        @send="onSend"
        @stop="onStop"
        @select-target="onSelectTarget"
      />

      <p v-if="status" class="assistant-standalone__status" role="status">
        {{ status }}
      </p>
    </main>
  </section>
</template>
