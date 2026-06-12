<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import AssistantSidebar from "./assistant-standalone/AssistantSidebar.vue";
import AssistantConversation from "./assistant-standalone/AssistantConversation.vue";
import ArtifactListPanel from "./artifact/ArtifactListPage.vue";
import CustomSurfacePagesPanel from "./custom/CustomSurfacePagesPage.vue";
import AssistantComposer from "./assistant-standalone/AssistantComposer.vue";
import AssistantTopbar from "./assistant-standalone/AssistantTopbar.vue";
import AssistantCapabilitiesPanel from "./assistant-standalone/AssistantCapabilitiesPanel.vue";
import AssistantCapabilitiesSidebarFilters from "./assistant-standalone/AssistantCapabilitiesSidebarFilters.vue";
import AssistantMemoryPanel from "./assistant-standalone/AssistantMemoryPanel.vue";
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
  },
  lang: {
    type: String,
    default: "en"
  },
  t: {
    type: Function,
    required: true
  }
});

const STORAGE_KEY_SIDEBAR = "void.assistant.sidebar.collapsed";
const STORAGE_KEY_SIDEBAR_WIDTH = "void.assistant.sidebar.width";
const STORAGE_KEY_PREFERRED_TARGET = "void.assistant.preferred_target_id";

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 480;
const SIDEBAR_DEFAULT_WIDTH = 280;

const route = useRoute();
const router = useRouter();
const coreStore = useAssistantStore();
const sessionsStore = useAssistantSessionsStore();
const skillsStore = useAssistantSkillsStore();
const routinesStore = useAssistantRoutinesStore();
const t = (key, vars = {}) => props.t(key, vars);

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
  latencyTick,
  statusKind,
  status,
  loadingSessions,
  loadingCurrent,
  canSend
} = storeToRefs(sessionsStore);
const { pendingMessageDeletion } = storeToRefs(sessionsStore);

const sidebarCollapsed = ref(loadSidebarPreference());
const sidebarWidth = ref(clampSidebarWidth(loadSidebarWidth()));
const preferredTargetId = ref(loadPreferredTarget());

// Narrow (phone/tablet-portrait) layout: sidebar становится off-canvas drawer
// поверх беседы, а не вторая колонка. На десктопе `sidebarCollapsed` = icon-rail;
// на narrow это отдельное состояние `mobileSidebarOpen` (по умолчанию закрыт —
// телефон стартует на полноэкранной беседе). Брейкпоинт един с CSS (1024px).
const NARROW_QUERY = "(max-width: 1024px)";
const isNarrow = ref(false);
const mobileSidebarOpen = ref(false);
let narrowMedia = null;
const onNarrowChange = (event) => {
  isNarrow.value = event.matches;
  if (!event.matches) mobileSidebarOpen.value = false;
};

// Tab state — derived from route, switching pushes default route per tab.
// Per ASSISTANT_SURFACE_STRUCTURE.md D11: last route per tab — session-local Map, не localStorage.
const tabRouteHistory = reactive(new Map());

const TAB_DEFAULTS = {
  chat: { name: "assistant-home" },
  capabilities: { name: "assistant-capabilities" },
  routines: { name: "assistant-routines" },
  memory: { name: "assistant-memory" },
  // artifact-list — top-level route (не внутри assistant host wrapper); клик по tab
  // выводит юзера в standalone ArtifactListPage. Возврат — browser back или клик
  // на другой tab (router.push снова приведёт в assistant host).
  artifacts: { name: "artifact-list" },
  // pages — список страниц (shipped ∪ custom). Composer-экрана нет (ADR-0025 §1),
  // авторинг переехал в чат; этот список — нормальная destination таба.
  pages: { name: "custom-surface-pages" }
};

const activeTab = computed(() => {
  const name = String(route.name || "");
  if (name === "assistant-capabilities" || name === "assistant-capability-detail") return "capabilities";
  if (name.startsWith("assistant-routine")) return "routines";
  if (name === "assistant-memory") return "memory";
  if (name === "artifact-list" || name === "artifact-detail") return "artifacts";
  if (name === "custom-surface-pages") return "pages";
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
const suggestions = computed(() => [
  t("assistant.suggestion.explainCode"),
  t("assistant.suggestion.generateIdea"),
  t("assistant.suggestion.helpEmail"),
  t("assistant.suggestion.summarize")
]);
const localizedGroupedSessions = computed(() =>
  groupedSessions.value.map((group) => ({
    ...group,
    label: t(`assistant.sidebar.group.${group.id}`)
  }))
);
const streamingStatusText = computed(() =>
  streamingStatus.value ? t(`assistant.status.${streamingStatus.value}`) : ""
);

const onTabChange = (tabId) => {
  closeMobileSidebar();
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
const onEnableTemplate = async ({ skillId, params = {}, variant = null }) => {
  router.push({ name: "assistant-home" });
  await sessionsStore.proposeSkillRun({
    skillId,
    targetId: composerTargetId.value,
    params,
    variant,
    locale: props.lang
  });
  if (currentSessionId.value && route.params.id !== currentSessionId.value) {
    router.replace({ name: "assistant-chat", params: { id: currentSessionId.value } });
  }
};
const onGoToRoutine = (instanceId) => {
  router.push({ name: "assistant-routine-inspect", params: { instanceId } });
};
const onAskInChat = async (skillId) => {
  router.push({ name: "assistant-home" });
  await sessionsStore.proposeSkillRun({ skillId, targetId: composerTargetId.value, locale: props.lang });
  if (currentSessionId.value && route.params.id !== currentSessionId.value) {
    router.replace({ name: "assistant-chat", params: { id: currentSessionId.value } });
  }
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
  if (isNarrow.value) {
    mobileSidebarOpen.value = !mobileSidebarOpen.value;
    return;
  }
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

// На narrow drawer закрывается после навигации, чтобы открылась беседа.
const closeMobileSidebar = () => {
  if (isNarrow.value) mobileSidebarOpen.value = false;
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

const onApproveSkills = (skillRunIds) => {
  sessionsStore.approveSkillRuns(skillRunIds);
};

const onRejectSkill = (skillRunId) => {
  sessionsStore.rejectSkillRun(skillRunId);
};

const onApproveSurfacePatch = (messageId) => {
  sessionsStore.approveSurfacePatch(messageId);
};

const onRejectSurfacePatch = (messageId) => {
  sessionsStore.rejectSurfacePatch(messageId);
};

const onChangeLayout = ({ messageId, variant }) => {
  sessionsStore.changeMessageLayout(messageId, variant);
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
  closeMobileSidebar();
  if (id === currentSessionId.value) return;
  router.push({ name: "assistant-chat", params: { id } });
};

const onNewChat = () => {
  closeMobileSidebar();
  sessionsStore.selectSession("");
  if (route.name !== "assistant-home") {
    router.push({ name: "assistant-home" });
  }
};

const onRename = async (session) => {
  const next = window.prompt(t("assistant.dialog.renameTitle"), session.title || "");
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
    t("assistant.dialog.deleteConfirm", {
      title: session.title || t("assistant.sidebar.untitled")
    })
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

watch(
  () => props.lang,
  (locale) => {
    skillsStore.loadSkills({ force: true, locale });
  }
);

onMounted(async () => {
  if (typeof window !== "undefined" && window.matchMedia) {
    narrowMedia = window.matchMedia(NARROW_QUERY);
    isNarrow.value = narrowMedia.matches;
    narrowMedia.addEventListener("change", onNarrowChange);
  }
  await coreStore.loadModels({ force: true });
  await sessionsStore.loadSessions();
  await syncFromRoute();
  // Realtime-канал уровня пользователя: сообщения/статусы/апрувы из других
  // вкладок, устройств и routines применяются без reload страницы.
  sessionsStore.connectUserEvents();
  // Подгружаем routines + skills в фоне, чтобы counts в tab badges были корректными
  // ещё до перехода в Capabilities/Routines tab.
  skillsStore.loadSkills({ locale: props.lang });
  routinesStore.loadInstances();
});

onBeforeUnmount(() => {
  sessionsStore.disconnectUserEvents();
  if (narrowMedia) narrowMedia.removeEventListener("change", onNarrowChange);
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
    :class="{
      'assistant-standalone--sidebar-collapsed': !isNarrow && sidebarCollapsed,
      'assistant-standalone--mobile-open': isNarrow && mobileSidebarOpen
    }"
    :style="sidebarStyle"
  >
    <AssistantSidebar
      :groups="localizedGroupedSessions"
      :trashed="trashedSessions"
      :trashed-loaded="trashedLoaded"
      :active-id="currentSessionId"
      :loading="loadingSessions && sessions.length === 0"
      :collapsed="!isNarrow && sidebarCollapsed"
      :identity="props.identity"
      :active-tab="activeTab"
      :t="t"
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
          :t="t"
          @filter-change="onSkillsFilterChange"
        />
      </template>

      <template #routines>
        <AssistantRoutinesSidebarFilters
          :instances="instances"
          :filters="routineFilters"
          :t="t"
          @filter-change="onRoutinesFilterChange"
        />
      </template>
    </AssistantSidebar>

    <!-- Backdrop drawer'а на narrow: тап вне сайдбара закрывает его. -->
    <button
      v-if="isNarrow && mobileSidebarOpen"
      type="button"
      class="assistant-standalone__backdrop"
      :aria-label="t('assistant.sidebar.collapse')"
      @click="mobileSidebarOpen = false"
    />

    <main class="assistant-standalone__main">
      <AssistantTopbar
        :active-tab="activeTab"
        :t="t"
        :show-menu="isNarrow"
        :capabilities-count="capabilitiesCount"
        :routines-count="routinesCount"
        @tab-change="onTabChange"
        @toggle-sidebar="onSidebarToggle"
      >
        <template v-if="$slots['main-actions']" #actions>
          <slot name="main-actions" />
        </template>
      </AssistantTopbar>

      <!-- Chat tab — conversation + composer, существующий поток. -->
      <section
        v-if="activeTab === 'chat'"
        class="assistant-standalone__tab-panel assistant-standalone__tab-panel--chat"
      >
        <AssistantConversation
          :messages="currentMessages"
          :current-user="props.currentUser"
          :streaming="streaming"
          :streaming-status="streamingStatusText"
          :latency-tick="latencyTick"
          :loading="loadingCurrent"
          :has-session="Boolean(currentSession)"
          :suggestions="suggestions"
          :session-key="currentSessionId || 'draft'"
          :lang="props.lang"
          :t="t"
          @regenerate="onRegenerate"
          @delete-message="onDeleteMessage"
          @choose-suggestion="onChooseSuggestion"
          @approve-skills="onApproveSkills"
          @reject-skill="onRejectSkill"
          @approve-surface-patch="onApproveSurfacePatch"
          @reject-surface-patch="onRejectSurfacePatch"
          @change-layout="onChangeLayout"
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
          :t="t"
          @send="onSend"
          @stop="onStop"
          @select-target="onSelectTarget"
        />

        <p
          v-if="status"
          class="assistant-standalone__status"
          :class="{ 'assistant-standalone__status--error': statusKind === 'error' }"
          :role="statusKind === 'error' ? 'alert' : 'status'"
          :aria-live="statusKind === 'error' ? 'assertive' : 'polite'"
        >
          {{ status }}
        </p>

        <div
          v-if="pendingMessageDeletion"
          class="assistant-standalone__undo"
          role="status"
          aria-live="polite"
        >
          <span>{{ t("assistant.undo.pending") }}</span>
          <button type="button" class="assistant-standalone__undo-button" @click="onUndoMessageDelete">
            {{ t("assistant.undo.cancel") }}
          </button>
        </div>
      </section>

      <!-- Capabilities tab — каталог skills + templates. -->
      <section
        v-if="activeTab === 'capabilities'"
        class="assistant-standalone__tab-panel assistant-standalone__tab-panel--full"
      >
        <AssistantCapabilitiesPanel
          :lang="props.lang"
          :t="t"
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
          :t="t"
          @open-drawer="onOpenRoutineDrawer"
          @open-runs="onOpenRoutineRuns"
          @pick-template="onPickTemplate"
          @open-menu="onRoutineMenu"
        />
      </section>

      <!-- Memory tab — user-visible assistant memory notes. -->
      <section
        v-if="activeTab === 'memory'"
        class="assistant-standalone__tab-panel assistant-standalone__tab-panel--full"
      >
        <AssistantMemoryPanel :t="t" />
      </section>

      <!-- Artifacts tab — paginated список skill_run artifacts текущего юзера. -->
      <section
        v-if="activeTab === 'artifacts'"
        class="assistant-standalone__tab-panel assistant-standalone__tab-panel--full"
      >
        <ArtifactListPanel />
      </section>

      <!-- Pages tab — список страниц (shipped ∪ custom), destination для авторинга через чат. -->
      <section
        v-if="activeTab === 'pages'"
        class="assistant-standalone__tab-panel assistant-standalone__tab-panel--full"
      >
        <CustomSurfacePagesPanel />
      </section>

      <!-- Routine drawer (per D1) — overlay над Routines list. -->
      <AssistantRoutineDrawer
        :open="drawerOpen"
        :mode="drawerMode"
        :instance="drawerInstance"
        :saving="routinesSaving"
        :t="t"
        @close="onDrawerClose"
        @switch-to-edit="onDrawerSwitchToEdit"
        @save="onDrawerSave"
      />
    </main>
  </section>
</template>
