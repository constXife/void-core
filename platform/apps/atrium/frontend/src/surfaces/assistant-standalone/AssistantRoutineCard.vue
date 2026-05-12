<script setup>
import { computed } from "vue";

const props = defineProps({
  routine: { type: Object, required: true },
  toggleBusy: { type: Boolean, default: false }
});

const emit = defineEmits(["toggle", "open-drawer", "open-runs", "open-menu"]);

const isEnabled = computed(() => props.routine.status === "enabled");
const isPaused = computed(() => props.routine.status === "paused");

const autonomyVariant = computed(() => {
  switch (props.routine.autonomy_level) {
    case "suggestion_only": return "accent";
    case "reversible_autonomous": return "info";
    case "human_confirmed": return "warning";
    default: return "default";
  }
});

const triggerIcon = computed(() => {
  switch (props.routine.trigger?.kind) {
    case "schedule": return "⏱";
    case "event": return "⚡";
    case "threshold": return "≷";
    case "external_webhook": return "↪";
    default: return "•";
  }
});

const lastRunLabel = computed(() => {
  const iso = props.routine.last_run_at;
  if (!iso) return "ещё не запускалось";
  const at = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - at.getTime();
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 1) return "только что";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return at.toISOString().slice(0, 10);
});

const nextRunLabel = computed(() => {
  // Per D6 — next-run показывается только для enabled и при наличии значения.
  if (!isEnabled.value || !props.routine.next_run_at) return null;
  return new Date(props.routine.next_run_at).toISOString().slice(0, 16).replace("T", " ");
});

const acceptRateLabel = computed(() => {
  if (props.routine.accept_rate === null) return null;
  const pct = Math.round(props.routine.accept_rate * 100);
  const window = props.routine.runs_window ? ` (last ${props.routine.runs_window})` : "";
  return `✓ ${pct}%${window}`;
});

const budgetLabel = computed(() => {
  if (props.routine.budget_consumed_avg === null) return null;
  return `~$${props.routine.budget_consumed_avg.toFixed(3)} ${props.routine.budget_unit}`;
});

const onToggle = () => emit("toggle", props.routine.id);
const onInspect = () => emit("open-drawer", { id: props.routine.id, mode: "inspect" });
const onEdit = () => emit("open-drawer", { id: props.routine.id, mode: "edit" });
const onRuns = () => emit("open-runs", props.routine.id);
const onMenu = () => emit("open-menu", props.routine.id);
</script>

<template>
  <article
    class="assistant-routine-card"
    :class="{ 'assistant-routine-card--paused': isPaused }"
  >
    <button
      type="button"
      class="assistant-routine-card__toggle"
      :class="{ 'assistant-routine-card__toggle--on': isEnabled }"
      :aria-pressed="isEnabled"
      :aria-label="isEnabled ? 'Pause routine' : 'Enable routine'"
      :disabled="toggleBusy"
      @click="onToggle"
    >
      <span class="assistant-routine-card__toggle-thumb" />
    </button>

    <div class="assistant-routine-card__body">
      <div class="assistant-routine-card__name-row">
        <button
          type="button"
          class="assistant-routine-card__name"
          @click="onInspect"
        >{{ routine.display_name }}</button>
        <span
          class="assistant-routine-card__autonomy"
          :data-variant="autonomyVariant"
        >{{ routine.autonomy_level }}</span>
        <span class="assistant-routine-card__skill">
          skill · {{ routine.skill_id }} v{{ routine.skill_version_pin }}
        </span>
      </div>

      <div class="assistant-routine-card__meta">
        <span class="assistant-routine-card__meta-item">
          {{ triggerIcon }} {{ routine.trigger.kind }} · {{ routine.trigger.label }}
          <span v-if="isPaused" class="assistant-routine-card__paused-tag">· paused</span>
        </span>
        <span class="assistant-routine-card__meta-item">▶ last run: {{ lastRunLabel }}</span>
        <span v-if="nextRunLabel" class="assistant-routine-card__meta-item">→ next: {{ nextRunLabel }}</span>
        <span v-if="acceptRateLabel" class="assistant-routine-card__meta-item">{{ acceptRateLabel }}</span>
        <span v-if="budgetLabel" class="assistant-routine-card__meta-item">💰 {{ budgetLabel }}</span>
      </div>
    </div>

    <div class="assistant-routine-card__actions">
      <button type="button" class="assistant-routine-card__action" @click="onRuns">Runs</button>
      <button type="button" class="assistant-routine-card__action" @click="onEdit">Edit</button>
      <button
        type="button"
        class="assistant-routine-card__action"
        aria-label="More"
        @click="onMenu"
      >⋯</button>
    </div>
  </article>
</template>
