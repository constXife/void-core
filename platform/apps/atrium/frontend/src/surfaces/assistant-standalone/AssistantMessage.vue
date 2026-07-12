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
} from "@lucide/vue";
import PlatformUserAvatar from "../../platform/components/PlatformUserAvatar.vue";
import { hasResolvedPlatformAccount } from "../../platform/account.js";
import { surfaceRenderHref } from "../../lib/surfaceOrigin.js";
import AssistantMarkdown from "./AssistantMarkdown.vue";
import BlockRenderer from "./blocks/BlockRenderer.vue";

const props = defineProps({
  message: { type: Object, required: true },
  currentUser: { type: Object, default: null },
  streaming: { type: Boolean, default: false },
  streamingStatus: { type: String, default: "" },
  latencyTick: { type: Number, default: 0 },
  showRegenerate: { type: Boolean, default: false },
  showDelete: { type: Boolean, default: false },
  lang: { type: String, default: "en" },
  t: { type: Function, required: true }
});

const emit = defineEmits([
  "regenerate",
  "delete",
  "approve-skills",
  "reject-skill",
  "approve-surface-patch",
  "reject-surface-patch",
  "approve-inventory-write",
  "reject-inventory-write",
  "change-layout"
]);

const isUser = computed(() => props.message.role === "user");
const t = (key, vars = {}) => props.t(key, vars);
const isAssistant = computed(() => props.message.role === "assistant");
const showUserAvatar = computed(() => isUser.value && hasResolvedPlatformAccount(props.currentUser));
const isStreamingTail = computed(
  () => props.streaming && isAssistant.value && !props.message.error
);
const showStreamingStatus = computed(
  () => isStreamingTail.value && !props.message.content && props.streamingStatus
);
const narrationContent = computed(() => String(props.message.narration_content || ""));
const skillBlocks = computed(() => {
  if (Array.isArray(props.message.skill_runs) && props.message.skill_runs.length) {
    return props.message.skill_runs.flatMap((skillRun) => skillRun.blocks || []);
  }
  return props.message.skill_run?.blocks || [];
});
const hasSkillBlocks = computed(() => skillBlocks.value.length > 0);
const showNarration = computed(
  () => isAssistant.value && narrationContent.value && !hasSkillBlocks.value
);
const runSteps = computed(() =>
  Array.isArray(props.message.run_steps) ? props.message.run_steps : []
);
const showRunSteps = computed(
  () => isAssistant.value && runSteps.value.length > 0 && !hasSkillBlocks.value
);
const isSkillProposal = computed(() => props.message.message_kind === "skill_proposal");
const isSurfacePatchProposal = computed(
  () => props.message.message_kind === "surface_patch_proposal"
);
const surfacePatchPayload = computed(() => props.message.message_payload || {});
const surfacePatchOps = computed(() => {
  const ops = surfacePatchPayload.value?.diff?.ops;
  return Array.isArray(ops) ? ops : [];
});
const surfacePatchStatus = computed(() => String(surfacePatchPayload.value?.status || ""));
const surfacePatchPageKind = computed(() => String(surfacePatchPayload.value?.pageKind || ""));
const surfacePatchSummary = computed(() =>
  t("assistant.message.surfacePatchSummary", {
    pageKind: surfacePatchPageKind.value,
    count: surfacePatchOps.value.length
  })
);
const surfacePatchRenderPath = computed(() =>
  // Render живёт на выделенном Surface-origin (ADR-0026 Phase 4), не на текущем
  // (assistant) хосте; строим cross-host ссылку host-agnostic.
  surfaceRenderHref(
    surfacePatchPayload.value?.renderPath || `/surfaces/${surfacePatchPageKind.value}`
  )
);
const isInventoryWriteProposal = computed(
  () => props.message.message_kind === "inventory_write_proposal"
);
const inventoryWritePayload = computed(() => props.message.message_payload || {});
const inventoryWriteStatus = computed(() =>
  String(inventoryWritePayload.value?.status || "")
);
const inventoryWriteTitle = computed(() => {
  const payload = inventoryWritePayload.value || {};
  return String(
    payload.writePayload?.title ||
      payload.diff?.item?.title ||
      payload.diff?.item?.display_label ||
      ""
  );
});
const inventoryWriteDetails = computed(() => {
  const payload = inventoryWritePayload.value || {};
  const parts = [];
  const sliceLabel = payload.diff?.slice?.label;
  if (sliceLabel) parts.push(String(sliceLabel));
  const classKey = payload.writePayload?.class_key;
  if (classKey) parts.push(String(classKey));
  const containmentKind = payload.writePayload?.containment_kind;
  if (containmentKind) parts.push(String(containmentKind));
  const locationType = payload.writePayload?.location_type;
  if (locationType) parts.push(String(locationType));
  return parts.join(" · ");
});
const inventoryWriteSummary = computed(() =>
  t("assistant.message.inventoryWriteSummary", { title: inventoryWriteTitle.value })
);
const isSkillResult = computed(() => props.message.message_kind === "skill_result");
// Если message содержит только один ArtifactLink block (mini layout), inline layout switcher
// "Cards / Compact" функционально noop — backend всё равно эмитит ArtifactLink независимо
// от layout_config.variant. Скрываем кнопку чтобы не сбивать с толку.
const isOnlyArtifactLink = computed(
  () => skillBlocks.value.length === 1 && skillBlocks.value[0]?.type === "artifact_link"
);
const layoutVariant = computed(() => props.message.layout_config?.variant || "cards");
const nextLayoutVariant = computed(() => (layoutVariant.value === "compact" ? "cards" : "compact"));
const layoutButtonLabel = computed(() =>
  t(nextLayoutVariant.value === "compact" ? "assistant.layout.compact" : "assistant.layout.cards")
);
const proposalSkillRuns = computed(() => {
  if (Array.isArray(props.message.skill_runs) && props.message.skill_runs.length) {
    return props.message.skill_runs;
  }
  return props.message.skill_run ? [props.message.skill_run] : [];
});
const proposalSkillIds = computed(() =>
  proposalSkillRuns.value.map((skillRun) => skillRun.skill_id || skillRun.id).filter(Boolean)
);
const proposalSkillNames = computed(() =>
  proposalSkillRuns.value.map((skillRun) => skillDisplayName(skillRun.skill_id, skillRun.id))
);
const proposalTitle = computed(() => {
  if (proposalSkillNames.value.length === 0) return props.message.content;
  if (proposalSkillNames.value.length === 1) {
    return t("assistant.message.proposalOne", { name: proposalSkillNames.value[0] });
  }
  return t("assistant.message.proposalBatch", { names: proposalSkillNames.value.join(", ") });
});
const proposalStatus = computed(() => {
  const statuses = proposalSkillRuns.value.map((skillRun) => skillRun.status).filter(Boolean);
  return statuses.length ? statuses.map(proposalStatusLabel).join(" · ") : t("assistant.message.awaitingApproval");
});
const canActOnProposal = computed(
  () =>
    proposalSkillRuns.value.length > 0 &&
    proposalSkillRuns.value.every((skillRun) => skillRun.status === "awaiting_approval")
);
const showCursor = computed(() => isStreamingTail.value);
const timestamp = computed(() => formatTimestamp(props.message.created_at));
const fullTimestamp = computed(() => props.message.created_at || "");
const contentSegments = computed(() =>
  isAssistant.value ? splitThinkingSegments(props.message.content) : [answerSegment(props.message.content)]
);
const hasRenderableContent = computed(() =>
  contentSegments.value.some((segment) => segment.content.trim())
);
const showActions = computed(
  () =>
    isAssistant.value &&
    !isStreamingTail.value &&
    (props.message.content || hasSkillBlocks.value || props.showRegenerate || props.showDelete)
);
const latencyText = computed(() => formatLatencyText(props.message.timings, props.streaming));
const showFooter = computed(
  () => latencyText.value || (timestamp.value && !isStreamingTail.value) || showActions.value
);

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

function formatLatencyText(timings, streaming) {
  if (!isAssistant.value || !timings || typeof timings !== "object") return "";
  props.latencyTick;
  const startedAt =
    timestampToMs(timings.started_at) ||
    timestampToMs(timings.created_at) ||
    timestampToMs(timings.request_started_at);
  if (!startedAt) return "";
  const firstDeltaAt = timestampToMs(timings.first_delta_at);
  const completedAt = timestampToMs(timings.completed_at);
  const now = Date.now();
  if (streaming && !firstDeltaAt) {
    return t("assistant.latency.thinking", { time: formatDuration(now - startedAt) });
  }
  if (streaming && firstDeltaAt) {
    return t("assistant.latency.answering", {
      time: formatDuration(now - firstDeltaAt),
      thinking: formatDuration(firstDeltaAt - startedAt)
    });
  }
  if (completedAt) {
    const total = formatDuration(completedAt - startedAt);
    if (firstDeltaAt) {
      return t("assistant.latency.completedWithThinking", {
        total,
        thinking: formatDuration(firstDeltaAt - startedAt)
      });
    }
    return t("assistant.latency.completed", { total });
  }
  return "";
}

function timestampToMs(value) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function answerSegment(content) {
  return {
    kind: "answer",
    content: String(content || "")
  };
}

function thinkingSegment(content) {
  return {
    kind: "thinking",
    content: String(content || "")
  };
}

function splitThinkingSegments(content) {
  const source = String(content || "");
  if (!source) return [];

  const segments = [];
  const tagPattern = /<\/?think>/gi;
  let cursor = 0;
  let thinkingStart = null;
  let match;

  while ((match = tagPattern.exec(source)) !== null) {
    const tag = match[0].toLowerCase();
    const tagStart = match.index;
    const tagEnd = tagPattern.lastIndex;

    if (tag === "<think>") {
      if (thinkingStart === null && tagStart > cursor) {
        segments.push(answerSegment(source.slice(cursor, tagStart)));
      }
      thinkingStart = tagEnd;
      cursor = tagEnd;
      continue;
    }

    if (thinkingStart !== null) {
      segments.push(thinkingSegment(source.slice(thinkingStart, tagStart)));
      thinkingStart = null;
      cursor = tagEnd;
    }
  }

  if (thinkingStart !== null) {
    segments.push(thinkingSegment(source.slice(thinkingStart)));
  } else if (cursor < source.length) {
    segments.push(answerSegment(source.slice(cursor)));
  }

  return segments.filter((segment) => segment.content.trim());
}

// Localized имя скилла приходит с backend'ом в skill_run.display_name (нужно для
// динамических ops-скиллов, которых нет в статике); статический switch — fallback
// для исторических записей без display_name.
function skillDisplayName(skillId, skillRunId = "") {
  const runs = proposalSkillRuns.value;
  const run = skillRunId
    ? runs.find((skillRun) => skillRun.id === skillRunId)
    : runs.find((skillRun) => skillRun.skill_id === skillId);
  const names = run?.display_name;
  if (names && typeof names === "object") {
    const name = props.lang === "ru" ? names.ru : names.en;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  switch (skillId) {
    case "digest_hackernews":
      return "Hacker News digest";
    case "digest_github":
      return "GitHub trending digest";
    default:
      return skillId;
  }
}

function proposalStatusLabel(status) {
  switch (status) {
    case "awaiting_approval":
      return t("assistant.message.awaitingApproval");
    case "approved":
      return t("assistant.message.statusApproved");
    case "running":
      return t("assistant.step.status.running");
    case "completed":
      return t("assistant.step.status.completed");
    case "failed":
      return t("assistant.step.status.failed");
    case "rejected":
      return t("assistant.message.statusRejected");
    case "cancelled":
      return t("assistant.message.statusCancelled");
    default:
      return status;
  }
}

function surfacePatchOpLabel(operation) {
  switch (operation?.op) {
    case "addBlock":
      return t("assistant.message.surfacePatchOp.addBlock", {
        block: surfacePatchBlockLabel(operation),
        region: String(operation.region || "")
      });
    case "removeBlock":
      return t("assistant.message.surfacePatchOp.removeBlock", {
        blockRef: String(operation.blockRef || "")
      });
    case "setProps":
      return t("assistant.message.surfacePatchOp.setProps", {
        blockRef: String(operation.blockRef || "")
      });
    case "moveBlock":
      return t("assistant.message.surfacePatchOp.moveBlock", {
        blockRef: String(operation.blockRef || ""),
        fromRegion: String(operation.fromRegion || ""),
        toRegion: String(operation.toRegion || "")
      });
    case "setLayout":
      return t("assistant.message.surfacePatchOp.setLayout", {
        layout: surfacePatchLayoutLabel(operation.layout)
      });
    default:
      return "";
  }
}

function surfacePatchBlockLabel(operation) {
  const block = operation?.block;
  if (block?.type) return String(block.type);
  if (block?.kind) return String(block.kind);
  return String(operation?.blockRef || "");
}

function surfacePatchLayoutLabel(layout) {
  if (!layout || typeof layout !== "object") return String(layout || "");
  return JSON.stringify(layout);
}

function stepLabel(step) {
  switch (step.key) {
    case "skill_proposal":
      return t("assistant.step.skillProposal", {
        skill: skillDisplayName(step.skill_id || "", step.skill_run_id || "")
      });
    case "skill_run":
      return t("assistant.step.skillRun", {
        skill: skillDisplayName(step.skill_id || "", step.skill_run_id || "")
      });
    case "memory_extraction":
      return t("assistant.step.memoryExtraction", { count: stepCount(step) });
    case "memory_used":
      return t("assistant.step.memoryUsed");
    case "session_titled":
      return t("assistant.step.sessionTitled", { title: String(step.title || "") });
    default:
      return t("assistant.step.unknown");
  }
}

function stepCount(step) {
  return Number.isFinite(Number(step.notes_count)) ? Number(step.notes_count) : 0;
}

// memory_used: заметки, процитированные моделью (валидированы бэкендом против
// recalled-set) — каждая ведёт ссылкой на свою карточку в /memory.
function stepMemoryNotes(step) {
  return Array.isArray(step.notes)
    ? step.notes.filter((note) => note && note.id && note.title)
    : [];
}

function stepDetails(step) {
  // summary — однострочный результат ops-сенсора («kadath: active (running)»).
  if (typeof step.summary === "string" && step.summary.trim()) {
    return [step.summary.trim()];
  }
  return Array.isArray(step.titles)
    ? step.titles.filter((title) => typeof title === "string" && title.trim())
    : [];
}

const ACTIVITY_STEP_KEYS = new Set(["memory_extraction", "memory_used", "session_titled"]);

// Служебные activity-шаги либо есть с данными, либо их незачем показывать;
// «готово» у них — шум, статус важен только для running/failed.
function stepVisible(step) {
  if (step.key === "session_titled") return Boolean(String(step.title || "").trim());
  // memory_recall — фоновая подгрузка контекста, не действие: чип убран (бэкенд больше
  // не эмитит; исторические шаги тоже скрываем для консистентности).
  if (step.key === "memory_recall") return false;
  if (step.key === "memory_extraction") return stepCount(step) > 0;
  if (step.key === "memory_used") return stepMemoryNotes(step).length > 0;
  return true;
}

function stepStatusVisible(step) {
  return step.status !== "completed" || !ACTIVITY_STEP_KEYS.has(step.key);
}

function stepStatusLabel(status) {
  switch (status) {
    case "running":
      return t("assistant.step.status.running");
    case "completed":
      return t("assistant.step.status.completed");
    case "failed":
      return t("assistant.step.status.failed");
    default:
      return t("assistant.step.status.unknown");
  }
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

const onApproveSurfacePatch = () => {
  emit("approve-surface-patch", props.message.id);
};

const onRejectSurfacePatch = () => {
  emit("reject-surface-patch", props.message.id);
};

const onApproveInventoryWrite = () => {
  emit("approve-inventory-write", props.message.id);
};

const onRejectInventoryWrite = () => {
  emit("reject-inventory-write", props.message.id);
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
        <p v-if="showNarration" class="assistant-message__narration">
          {{ narrationContent }}
        </p>
        <ul v-if="showRunSteps" class="assistant-message__steps" aria-live="polite">
          <template v-for="step in runSteps" :key="step.id">
            <li
              v-if="stepVisible(step)"
              class="assistant-message__step"
              :class="`assistant-message__step--${step.status}`"
            >
              <template v-if="step.key === 'memory_used'">
                <span>{{ stepLabel(step) }}</span>
                <span class="assistant-message__step-memory-links">
                  <RouterLink
                    v-for="note in stepMemoryNotes(step)"
                    :key="note.id"
                    :to="{ name: 'assistant-memory', query: { note: note.id } }"
                    class="assistant-message__step-memory-link"
                    :title="note.title"
                    data-test="memory-used-link"
                  >{{ note.title }}</RouterLink>
                </span>
              </template>
              <details
                v-else-if="stepDetails(step).length"
                class="assistant-message__step-details"
              >
                <summary class="assistant-message__step-summary" data-test="step-details-summary">
                  <span>{{ stepLabel(step) }}</span>
                  <span v-if="stepStatusVisible(step)">{{ stepStatusLabel(step.status) }}</span>
                </summary>
                <ul class="assistant-message__step-items">
                  <li v-for="title in stepDetails(step)" :key="title">{{ title }}</li>
                </ul>
              </details>
              <template v-else>
                <span>{{ stepLabel(step) }}</span>
                <span v-if="stepStatusVisible(step)">{{ stepStatusLabel(step.status) }}</span>
              </template>
            </li>
          </template>
        </ul>
        <AssistantMarkdown
          v-if="!isSkillProposal && !isSurfacePatchProposal && !hasSkillBlocks && !isAssistant && (message.content || !isStreamingTail)"
          :content="message.content"
          :render-diagrams="false"
          :copy-code-label="t('assistant.message.copyCode')"
          :copied-code-label="t('assistant.message.copiedCode')"
        />
        <template v-if="!isSkillProposal && !isSurfacePatchProposal && !hasSkillBlocks && isAssistant && (hasRenderableContent || !isStreamingTail)">
          <template v-for="(segment, index) in contentSegments" :key="`${segment.kind}-${index}`">
            <AssistantMarkdown
              v-if="segment.kind === 'answer'"
              :content="segment.content"
              :render-diagrams="!message.error"
              :copy-code-label="t('assistant.message.copyCode')"
              :copied-code-label="t('assistant.message.copiedCode')"
            />
            <details
              v-else
              class="assistant-message__thinking"
              :open="isStreamingTail"
            >
              <summary class="assistant-message__thinking-summary">
                {{ t("assistant.message.thinking") }}
              </summary>
              <p class="assistant-message__thinking-content">
                {{ segment.content }}
              </p>
            </details>
          </template>
        </template>
        <div v-if="isSurfacePatchProposal" class="assistant-message__proposal">
          <div class="assistant-message__proposal-main">
            <span class="assistant-message__proposal-title">{{ surfacePatchSummary }}</span>
            <span
              v-if="surfacePatchStatus === 'awaiting_approval'"
              class="assistant-message__proposal-meta"
            >{{ t("assistant.message.surfacePatchHint") }}</span>
          </div>
          <ul class="assistant-message__proposal-list">
            <li v-for="(operation, index) in surfacePatchOps" :key="`${operation.op}-${index}`">
              <span>{{ surfacePatchOpLabel(operation) }}</span>
            </li>
          </ul>
          <div v-if="surfacePatchStatus === 'awaiting_approval'" class="assistant-message__proposal-actions">
            <button type="button" class="assistant-message__proposal-button" @click="onApproveSurfacePatch">
              <Check :size="14" />
              <span>{{ t("assistant.message.surfacePatchApply", { pageKind: surfacePatchPageKind }) }}</span>
            </button>
            <button type="button" class="assistant-message__proposal-button" @click="onRejectSurfacePatch">
              <X :size="14" />
              <span>{{ t("assistant.message.surfacePatchReject") }}</span>
            </button>
          </div>
          <div v-else-if="surfacePatchStatus === 'approved'" class="assistant-message__proposal-actions">
            <span class="assistant-message__proposal-badge">
              {{ t("assistant.message.surfacePatchApplied") }}
            </span>
            <a class="assistant-message__proposal-button" :href="surfacePatchRenderPath">
              <Check :size="14" />
              <span>{{ t("assistant.message.surfacePatchOpen") }}</span>
            </a>
          </div>
          <div v-else-if="surfacePatchStatus === 'rejected'" class="assistant-message__proposal-actions">
            <span class="assistant-message__proposal-badge">
              {{ t("assistant.message.surfacePatchRejected") }}
            </span>
          </div>
        </div>
        <div v-if="isInventoryWriteProposal" class="assistant-message__proposal">
          <div class="assistant-message__proposal-main">
            <span class="assistant-message__proposal-title">{{ inventoryWriteSummary }}</span>
            <span
              v-if="inventoryWriteStatus === 'awaiting_approval'"
              class="assistant-message__proposal-meta"
            >{{ t("assistant.message.inventoryWriteHint") }}</span>
          </div>
          <ul v-if="inventoryWriteDetails" class="assistant-message__proposal-list">
            <li><span>{{ inventoryWriteDetails }}</span></li>
          </ul>
          <div v-if="inventoryWriteStatus === 'awaiting_approval'" class="assistant-message__proposal-actions">
            <button type="button" class="assistant-message__proposal-button" @click="onApproveInventoryWrite">
              <Check :size="14" />
              <span>{{ t("assistant.message.inventoryWriteApply") }}</span>
            </button>
            <button type="button" class="assistant-message__proposal-button" @click="onRejectInventoryWrite">
              <X :size="14" />
              <span>{{ t("assistant.message.inventoryWriteReject") }}</span>
            </button>
          </div>
          <div v-else-if="inventoryWriteStatus === 'approved'" class="assistant-message__proposal-actions">
            <span class="assistant-message__proposal-badge">
              {{ t("assistant.message.inventoryWriteApplied") }}
            </span>
          </div>
          <div v-else-if="inventoryWriteStatus === 'rejected'" class="assistant-message__proposal-actions">
            <span class="assistant-message__proposal-badge">
              {{ t("assistant.message.inventoryWriteRejected") }}
            </span>
          </div>
        </div>
        <div v-if="isSkillProposal" class="assistant-message__proposal">
          <div class="assistant-message__proposal-main">
            <span class="assistant-message__proposal-title">{{ proposalTitle }}</span>
            <span class="assistant-message__proposal-meta">{{ proposalSkillIds.join(" · ") }} · {{ proposalStatus }}</span>
          </div>
          <ul v-if="proposalSkillRuns.length > 1" class="assistant-message__proposal-list">
            <li v-for="skillRun in proposalSkillRuns" :key="skillRun.id">
              <span>{{ skillDisplayName(skillRun.skill_id) }}</span>
              <span>{{ proposalStatusLabel(skillRun.status) }}</span>
            </li>
          </ul>
          <div v-if="canActOnProposal" class="assistant-message__proposal-actions">
            <button type="button" class="assistant-message__proposal-button" @click="onApproveSkill">
              <Check :size="14" />
              <span>{{ t("assistant.message.approve") }}</span>
            </button>
            <button type="button" class="assistant-message__proposal-button" @click="onRejectSkill">
              <X :size="14" />
              <span>{{ t("assistant.message.reject") }}</span>
            </button>
          </div>
        </div>
        <!--
          Skill blocks рендерим только в `skill_result` message — в `skill_proposal`
          они дублируют скилл результат, потому что один skill_run_id referenced и
          в proposal и в result messages. Proposal phase показывает "Ready to run X"
          + approve/reject controls; result phase показывает финальные blocks (Mini
          ArtifactLink card).
        -->
        <BlockRenderer v-if="hasSkillBlocks && !isSkillProposal" :blocks="skillBlocks" :t="t" />
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
          <span>{{ message.content }}</span>
          <button
            v-if="showRegenerate"
            type="button"
            class="assistant-message__error-retry"
            @click="onRegenerate"
          >
            <RotateCcw :size="13" />
            <span>{{ t("assistant.message.retry") }}</span>
          </button>
        </p>
        <p v-else-if="message.stopped" class="assistant-message__stopped-line">
          {{ t("assistant.message.stopped") }}
        </p>
      </div>

      <div v-if="showFooter" class="assistant-message__footer">
        <span v-if="latencyText" class="assistant-message__latency">{{ latencyText }}</span>
        <time
          v-if="timestamp && !isStreamingTail"
          class="assistant-message__time"
          :datetime="fullTimestamp"
          :title="fullTimestamp"
        >{{ timestamp }}</time>
        <div v-if="showActions" class="assistant-message__actions">
          <button
            v-if="isSkillResult && hasSkillBlocks && !isOnlyArtifactLink"
            type="button"
            class="assistant-message__action assistant-message__action--text"
            @click="onChangeLayout"
            :aria-label="t('assistant.message.changeLayout')"
          >
            {{ layoutButtonLabel }}
          </button>
          <button
            v-if="message.content"
            type="button"
            class="assistant-message__action"
            @click="copyContent"
            :aria-label="t('assistant.message.copy')"
          >
            <Copy :size="14" />
          </button>
          <button
            v-if="showRegenerate"
            type="button"
            class="assistant-message__action"
            @click="onRegenerate"
            :aria-label="t('assistant.message.regenerate')"
          >
            <RotateCcw :size="14" />
          </button>
          <button
            v-if="showDelete"
            type="button"
            class="assistant-message__action assistant-message__action--danger"
            @click="onDelete"
            :aria-label="t('assistant.message.deletePair')"
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
