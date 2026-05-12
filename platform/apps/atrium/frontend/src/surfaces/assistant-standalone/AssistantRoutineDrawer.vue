<script setup>
import { computed, ref, watch } from "vue";
import { X } from "lucide-vue-next";

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: "inspect" }, // 'inspect' | 'edit' | 'create'
  instance: { type: Object, default: null },
  saving: { type: Boolean, default: false }
});

const emit = defineEmits(["close", "save", "switch-to-edit"]);

const isEdit = computed(() => props.mode === "edit" || props.mode === "create");
const isCreate = computed(() => props.mode === "create");

// Локальная form-state — копия instance.* которую можно редактировать без mutate'а store.
// Per ASSISTANT_SURFACE_STRUCTURE.md D1: drawer открывается над routines list, не теряя контекста.
const form = ref(buildForm(props.instance));

const reset = () => {
  form.value = buildForm(props.instance);
};

watch(() => props.instance, () => reset(), { deep: true });
watch(() => props.mode, () => reset());
watch(() => props.open, (next) => {
  if (next) reset();
});

const onClose = () => {
  if (props.saving) return;
  emit("close");
};

const onBackdropClick = () => {
  if (props.saving) return;
  emit("close");
};

const onSwitchToEdit = () => {
  emit("switch-to-edit");
};

const onSave = () => {
  emit("save", form.value);
};

const onKeydown = (event) => {
  if (event.key === "Escape" && !props.saving) {
    emit("close");
  }
};

const triggerKinds = ["schedule", "event", "threshold", "external_webhook"];
const autonomyLevels = ["suggestion_only", "reversible_autonomous", "human_confirmed"];

function buildForm(inst) {
  if (!inst) {
    return {
      display_name: "",
      skill_id: "",
      skill_version_pin: 1,
      template_id: null,
      autonomy_level: "suggestion_only",
      trigger_kind: "schedule",
      trigger_label: "",
      trigger_timezone: "Europe/Berlin",
      trigger_cron: "0 10 * * 0"
    };
  }
  return {
    display_name: inst.display_name || "",
    skill_id: inst.skill_id || "",
    skill_version_pin: inst.skill_version_pin || 1,
    template_id: inst.template_id || null,
    autonomy_level: inst.autonomy_level || "suggestion_only",
    trigger_kind: inst.trigger?.kind || "schedule",
    trigger_label: inst.trigger?.label || "",
    trigger_timezone: inst.trigger?.timezone || "Europe/Berlin",
    trigger_cron: inst.trigger?.params?.cron || ""
  };
}
</script>

<template>
  <div
    v-if="open"
    class="assistant-routine-drawer-root"
    role="dialog"
    aria-modal="true"
    @keydown="onKeydown"
    tabindex="-1"
  >
    <div class="assistant-routine-drawer__overlay" @click="onBackdropClick" />

    <aside class="assistant-routine-drawer">
      <header class="assistant-routine-drawer__head">
        <div class="assistant-routine-drawer__head-text">
          <div class="assistant-routine-drawer__kicker">
            {{ isCreate ? "Новая routine" : isEdit ? "Edit routine" : "Routine · inspect" }}
          </div>
          <h2 class="assistant-routine-drawer__title">
            {{ form.display_name || "Без названия" }}
          </h2>
        </div>
        <button
          type="button"
          class="assistant-routine-drawer__close"
          aria-label="Close"
          :disabled="saving"
          @click="onClose"
        >
          <X :size="16" />
        </button>
      </header>

      <div class="assistant-routine-drawer__body">
        <!-- Display name -->
        <section class="assistant-routine-drawer__field">
          <label class="assistant-routine-drawer__label">Display name</label>
          <input
            v-if="isEdit"
            v-model="form.display_name"
            type="text"
            class="assistant-routine-drawer__input"
            :disabled="saving"
            placeholder="например: Weekly shopping run"
          />
          <div v-else class="assistant-routine-drawer__value">{{ form.display_name }}</div>
        </section>

        <!-- Skill (read-only — нельзя менять skill_id на existing routine per SURFACE_STRUCTURE.md) -->
        <section class="assistant-routine-drawer__field">
          <label class="assistant-routine-drawer__label">Skill</label>
          <div class="assistant-routine-drawer__value">
            <span class="assistant-routine-drawer__mono">{{ form.skill_id }}</span>
            <span class="assistant-routine-drawer__hint"> v{{ form.skill_version_pin }} (pinned)</span>
          </div>
          <p v-if="isEdit" class="assistant-routine-drawer__field-note">
            Skill нельзя поменять на existing routine — это создаст новую (потому что
            <span class="assistant-routine-drawer__mono">skill_version_pin</span> должен оставаться
            coherent с run history).
          </p>
        </section>

        <!-- Trigger -->
        <section class="assistant-routine-drawer__field">
          <label class="assistant-routine-drawer__label">Trigger</label>
          <div v-if="isEdit" class="assistant-routine-drawer__row">
            <select
              v-model="form.trigger_kind"
              class="assistant-routine-drawer__select"
              :disabled="saving"
            >
              <option v-for="kind in triggerKinds" :key="kind" :value="kind">{{ kind }}</option>
            </select>
            <input
              v-model="form.trigger_label"
              type="text"
              class="assistant-routine-drawer__input"
              :disabled="saving"
              placeholder="например: sunday 10:00"
            />
          </div>
          <div v-else class="assistant-routine-drawer__value">
            {{ form.trigger_kind }} · {{ form.trigger_label }}
          </div>

          <div v-if="isEdit && form.trigger_kind === 'schedule'" class="assistant-routine-drawer__row">
            <input
              v-model="form.trigger_cron"
              type="text"
              class="assistant-routine-drawer__input assistant-routine-drawer__input--mono"
              :disabled="saving"
              placeholder="cron: 0 10 * * 0"
            />
            <input
              v-model="form.trigger_timezone"
              type="text"
              class="assistant-routine-drawer__input"
              :disabled="saving"
              placeholder="Europe/Berlin"
            />
          </div>
        </section>

        <!-- Autonomy level -->
        <section class="assistant-routine-drawer__field">
          <label class="assistant-routine-drawer__label">Autonomy level</label>
          <select
            v-if="isEdit"
            v-model="form.autonomy_level"
            class="assistant-routine-drawer__select"
            :disabled="saving"
          >
            <option v-for="level in autonomyLevels" :key="level" :value="level">{{ level }}</option>
          </select>
          <div v-else class="assistant-routine-drawer__value">{{ form.autonomy_level }}</div>
          <p class="assistant-routine-drawer__field-note">
            Bound сверху template'ом (operator-declared). Instance может только понизить уровень.
          </p>
        </section>
      </div>

      <footer class="assistant-routine-drawer__footer">
        <template v-if="isEdit">
          <button
            type="button"
            class="assistant-routine-drawer__btn assistant-routine-drawer__btn--ghost"
            :disabled="saving"
            @click="onClose"
          >Cancel</button>
          <button
            type="button"
            class="assistant-routine-drawer__btn assistant-routine-drawer__btn--primary"
            :disabled="saving"
            @click="onSave"
          >{{ saving ? "Сохраняем…" : isCreate ? "Создать routine" : "Сохранить" }}</button>
        </template>
        <template v-else>
          <button
            type="button"
            class="assistant-routine-drawer__btn assistant-routine-drawer__btn--ghost"
            @click="onClose"
          >Close</button>
          <button
            type="button"
            class="assistant-routine-drawer__btn assistant-routine-drawer__btn--primary"
            @click="onSwitchToEdit"
          >Edit</button>
        </template>
      </footer>
    </aside>
  </div>
</template>
