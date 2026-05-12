<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import AssistantSidebar from "./assistant-standalone/AssistantSidebar.vue";
import AssistantConversation from "./assistant-standalone/AssistantConversation.vue";
import AssistantComposer from "./assistant-standalone/AssistantComposer.vue";
import AssistantTopbar from "./assistant-standalone/AssistantTopbar.vue";
import AssistantCapabilitiesPanel from "./assistant-standalone/AssistantCapabilitiesPanel.vue";
import AssistantCapabilitiesSidebarFilters from "./assistant-standalone/AssistantCapabilitiesSidebarFilters.vue";
import AssistantRoutinesPanel from "./assistant-standalone/AssistantRoutinesPanel.vue";
import AssistantRoutinesSidebarFilters from "./assistant-standalone/AssistantRoutinesSidebarFilters.vue";
import AssistantRoutineDrawer from "./assistant-standalone/AssistantRoutineDrawer.vue";
import { useAssistantStore } from "../stores/assistant.js";
import { useAssistantSessionsStore } from "../stores/assistant-sessions.js";
import { useAssistantSkillsStore } from "../stores/assistant-skills.js";
import { useAssistantRoutinesStore } from "../stores/assistant-routines.js";

const props = defineProps({
  identity: {
    type: Object,
    required: true
  },
  currentUser: {
    type: Object,
    default: null
  }
});

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
const skillsStore = useAssistantSkillsStore();
const routinesStore = useAssistantRoutinesStore();

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
  streamingStatus,
  status,
  loadingSessions,
  loadingCurrent,
  canSend
} = storeToRefs(sessionsStore);
const { pendingMessageDeletion } = storeToRefs(sessionsStore);

const sidebarCollapsed = ref(loadSidebarPreference());
const sidebarWidth = ref(clampSidebarWidth(loadSidebarWidth()));
const preferredTargetId = ref(loadPreferredTarget());

// Tab state — derived from route, switching pushes default route per tab.
// Per ASSISTANT_SURFACE_STRUCTURE.md D11: last route per tab — session-local Map, не localStorage.
const tabRouteHistory = reactive(new Map());

const TAB_DEFAULTS = {
  chat: { name: "assistant-home" },
  capabilities: { name: "assistant-capabilities" },
  routines: { name: "assistant-routines" }
};

const activeTab = computed(() => {
  const name = String(route.name || "");
  if (name === "assistant-capabilities" || name === "assistant-capability-detail") return "capabilities";
  if (name.startsWith("assistant-routine")) return "routines";
  return "chat";
});

// Counts для tab badges (D5 — показываем всегда, даже 0; null = ещё не загрузили).
const { skillsCount, skills, filters: skillFilters, availableTrustClasses } = storeToRefs(skillsStore);
const {
  instancesCount,
  instances,
  filters: routineFilters,
  loaded: routinesLoaded,
  saving: routinesSaving
} = storeToRefs(routinesStore);
const capabilitiesCount = computed(() => (skillsCount.value > 0 ? skillsCount.value : null));
const routinesCount = computed(() => (routinesLoaded.value ? instancesCount.value : null));

const onTabChange = (tabId) => {
  if (tabId === activeTab.value) return;
  const remembered = tabRouteHistory.get(tabId);
  if (remembered) {
    router.push(remembered);
    return;
  }
  router.push(TAB_DEFAULTS[tabId] ?? TAB_DEFAULTS.chat);
};

// Capabilities handlers.
const onSkillsFilterChange = ({ key, value }) => skillsStore.setFilter(key, value);
const onEnableTemplate = ({ skillId, templateId }) => {
  // TODO Wave 4: открыть AssistantRoutineDrawer в edit mode с populated values из template.
  console.info("[wave2] enable-template requested", { skillId, templateId });
};
const onGoToRoutine = (instanceId) => {
  router.push({ name: "assistant-routine-inspect", params: { instanceId } });
};
const onAskInChat = (skillId) => {
  // Per D7: prefill draft, переключиться на Chat tab.
  draft.value = `по skill ${skillId}: `;
  router.push({ name: "assistant-home" });
};

// Routines handlers.
const onRoutinesFilterChange = ({ key, value }) => routinesStore.setFilter(key, value);
const onOpenRoutineDrawer = ({ id, mode }) => {
  const routeName = mode === "edit" ? "assistant-routine-edit" : "assistant-routine-inspect";
  router.push({ name: routeName, params: { instanceId: id } });
};
const onOpenRoutineRuns = (id) => {
  router.push({ name: "assistant-routine-runs", params: { instanceId: id } });
};
const onPickTemplate = () => {
  // TODO Wave 4b: template picker drawer. Пока — переход в Capabilities.
  router.push({ name: "assistant-capabilities" });
};
const onRoutineMenu = (id) => {
  // TODO: contextual menu (Disable/Delete/Duplicate).
  console.info("routine menu requested", { id });
};

// Drawer state (per D1) — производится из route.
const drawerOpen = computed(() => {
  const name = String(route.name || "");
  return name === "assistant-routine-inspect" || name === "assistant-routine-edit";
});
const drawerMode = computed(() => {
  if (route.name === "assistant-routine-edit") return "edit";
  return "inspect";
});
const drawerInstance = computed(() => {
  const id = String(route.params?.instanceId || "");
  if (!id) return null;
  return routinesStore.instanceById(id);
});

const onDrawerClose = () => {
  router.push({ name: "assistant-routines" });
};
const onDrawerSwitchToEdit = () => {
  if (!drawerInstance.value) return;
  router.push({
    name: "assistant-routine-edit",
    params: { instanceId: drawerInstance.value.id }
  });
};
const onDrawerSave = async (formValues) => {
  if (!drawerInstance.value) return;
  try {
    await routinesStore.updateInstance(drawerInstance.value.id, formValues);
    router.push({ name: "assistant-routine-inspect", params: { instanceId: drawerInstance.value.id } });
  } catch (error) {
    // status уже в store, оставляем drawer открытым чтобы user видел ошибку.
    console.error("drawer save failed", error);
  }
};

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

const onDeleteMessage = (messageId) => {
  sessionsStore.deleteMessagePair(messageId);
};

const onUndoMessageDelete = () => {
  sessionsStore.undoMessageDeletion();
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
    router.push({ name: "assistant-home" });
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
  // Только chat-tab routes управляют сессией. На Capabilities/Routines текущая сессия сохраняется.
  if (activeTab.value !== "chat") return;
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

// Запоминаем последний route per tab — для restoration при tab-switch (D11).
watch(
  () => route.fullPath,
  (path) => {
    tabRouteHistory.set(activeTab.value, path);
  },
  { immediate: true }
);

watch(activeTab, () => {
  // Tab сменился — пересинхронизировать сессию (например, вернулись в Chat из Capabilities).
  syncFromRoute();
});

watch(sidebarCollapsed, (next) => {
  saveSidebarPreference(next);
});

onMounted(async () => {
  await coreStore.loadModels({ force: true });
  await sessionsStore.loadSessions();
  await syncFromRoute();
  // Подгружаем routines + skills в фоне, чтобы counts в tab badges были корректными
  // ещё до перехода в Capabilities/Routines tab.
  skillsStore.loadSkills();
  routinesStore.loadInstances();
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
      :identity="props.identity"
      :active-tab="activeTab"
      @new-chat="onNewChat"
      @select="onSelect"
      @rename="onRename"
      @delete="onDelete"
      @restore="onRestore"
      @open-trash="onOpenTrash"
      @toggle-collapsed="onSidebarToggle"
      @resize-start="onSidebarResizeStart"
    >
      <template v-if="$slots['sidebar-brand']" #brand="{ identity, collapsed }">
        <slot name="sidebar-brand" :identity="identity" :collapsed="collapsed" />
      </template>

      <template #capabilities>
        <AssistantCapabilitiesSidebarFilters
          :skills="skills"
          :filters="skillFilters"
          :available-trust-classes="availableTrustClasses"
          @filter-change="onSkillsFilterChange"
        />
      </template>

      <template #routines>
        <AssistantRoutinesSidebarFilters
          :instances="instances"
          :filters="routineFilters"
          @filter-change="onRoutinesFilterChange"
        />
      </template>
    </AssistantSidebar>

    <main class="assistant-standalone__main">
      <AssistantTopbar
        :active-tab="activeTab"
        :capabilities-count="capabilitiesCount"
        :routines-count="routinesCount"
        @tab-change="onTabChange"
      >
        <template v-if="$slots['main-actions']" #actions>
          <slot name="main-actions" />
        </template>
      </AssistantTopbar>

      <!-- Chat tab — conversation + composer, существующий поток. -->
      <section
        v-show="activeTab === 'chat'"
        class="assistant-standalone__tab-panel assistant-standalone__tab-panel--chat"
        :aria-hidden="activeTab !== 'chat'"
      >
        <AssistantConversation
          :messages="currentMessages"
          :current-user="props.currentUser"
          :streaming="streaming"
          :streaming-status="streamingStatus"
          :loading="loadingCurrent"
          :has-session="Boolean(currentSession)"
          :suggestions="SUGGESTIONS"
          :session-key="currentSessionId || 'draft'"
          @regenerate="onRegenerate"
          @delete-message="onDeleteMessage"
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

        <div
          v-if="pendingMessageDeletion"
          class="assistant-standalone__undo"
          role="status"
          aria-live="polite"
        >
          <span>Удаление через 5 секунд</span>
          <button type="button" class="assistant-standalone__undo-button" @click="onUndoMessageDelete">
            Отменить
          </button>
        </div>
      </section>

      <!-- Capabilities tab — каталог skills + templates. -->
      <section
        v-if="activeTab === 'capabilities'"
        class="assistant-standalone__tab-panel assistant-standalone__tab-panel--full"
      >
        <AssistantCapabilitiesPanel
          @enable-template="onEnableTemplate"
          @go-to-routine="onGoToRoutine"
          @ask-in-chat="onAskInChat"
        />
      </section>

      <!-- Routines tab — список user-owned ContractInstance. -->
      <section
        v-if="activeTab === 'routines'"
        class="assistant-standalone__tab-panel assistant-standalone__tab-panel--full"
      >
        <AssistantRoutinesPanel
          @open-drawer="onOpenRoutineDrawer"
          @open-runs="onOpenRoutineRuns"
          @pick-template="onPickTemplate"
          @open-menu="onRoutineMenu"
        />
      </section>

      <!-- Routine drawer (per D1) — overlay над Routines list. -->
      <AssistantRoutineDrawer
        :open="drawerOpen"
        :mode="drawerMode"
        :instance="drawerInstance"
        :saving="routinesSaving"
        @close="onDrawerClose"
        @switch-to-edit="onDrawerSwitchToEdit"
        @save="onDrawerSave"
      />
    </main>
  </section>
</template>
