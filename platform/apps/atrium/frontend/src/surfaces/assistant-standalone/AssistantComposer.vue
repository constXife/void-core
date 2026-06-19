<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { ArrowUp, Square } from "lucide-vue-next";
import AssistantModelPicker from "./AssistantModelPicker.vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
  streaming: { type: Boolean, default: false },
  canSend: { type: Boolean, default: false },
  targets: { type: Array, default: () => [] },
  selectedTargetId: { type: String, default: "" },
  preferredTargetId: { type: String, default: "" },
  pickerDisabled: { type: Boolean, default: false },
  isOperator: { type: Boolean, default: false },
  // Заполненность контекста: tokens = prompt_tokens последнего turn'а, window =
  // max-окно выбранной модели. Счётчик рисуется только когда известны оба.
  contextTokens: { type: Number, default: null },
  contextWindow: { type: Number, default: null },
  // Накопительная стоимость сессии в долларах (operator-only); null — не показываем.
  sessionCost: { type: Number, default: null },
  disabled: { type: Boolean, default: false },
  t: { type: Function, required: true }
});

const formatTokens = (value) => {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`.replace(".0", "");
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
};

const showContextMeter = computed(
  () => typeof props.contextWindow === "number" && typeof props.contextTokens === "number"
);
const contextPercent = computed(() => {
  if (!showContextMeter.value || props.contextWindow <= 0) return 0;
  return Math.min(100, Math.round((props.contextTokens / props.contextWindow) * 100));
});

const formattedCost = computed(() => {
  if (typeof props.sessionCost !== "number") return "";
  if (props.sessionCost > 0 && props.sessionCost < 0.01) return "< $0.01";
  return `$${props.sessionCost.toFixed(2)}`;
});

// Бар — индикатор приближения к лимиту контекста, а не «сколько потрачено»:
// нейтральный почти всегда, желтеет/краснеет ближе к заполнению окна.
const contextZone = computed(() => {
  if (contextPercent.value >= 90) return "high";
  if (contextPercent.value >= 70) return "mid";
  return "low";
});

const emit = defineEmits(["update:modelValue", "send", "stop", "select-target"]);

const textareaRef = ref(null);
const t = (key, vars = {}) => props.t(key, vars);

const placeholder = computed(() =>
  props.disabled ? props.t("assistant.composer.disabled") : props.t("assistant.composer.placeholder")
);

const onInput = (event) => {
  emit("update:modelValue", event.target.value);
  resize();
};

// Вставка из буфера часто тащит ведущие/хвостовые пустые строки и пробелы
// (например при копировании из редактора). Обрезаем их у вставляемого фрагмента,
// вставляя в текущую позицию каретки; если чистить нечего — отдаём дефолтную вставку.
const onPaste = (event) => {
  const node = textareaRef.value;
  const pasted = event.clipboardData?.getData("text");
  if (!node || typeof pasted !== "string") return;
  const trimmed = pasted.replace(/^\s+/, "").replace(/\s+$/, "");
  if (trimmed === pasted) return;
  event.preventDefault();
  const start = node.selectionStart ?? node.value.length;
  const end = node.selectionEnd ?? node.value.length;
  const next = node.value.slice(0, start) + trimmed + node.value.slice(end);
  emit("update:modelValue", next);
  nextTick(() => {
    const caret = start + trimmed.length;
    node.setSelectionRange(caret, caret);
    resize();
  });
};

const onKeydown = (event) => {
  if (event.key !== "Enter" || event.isComposing) return;
  if (event.shiftKey) return;
  event.preventDefault();
  if (props.streaming) return;
  if (props.canSend) emit("send");
};

const onSendClick = () => {
  if (props.streaming) {
    emit("stop");
    return;
  }
  if (props.canSend) emit("send");
};

const resize = () => {
  const node = textareaRef.value;
  if (!node) return;
  node.style.height = "auto";
  const limit = 12 * 24;
  node.style.height = `${Math.min(node.scrollHeight, limit)}px`;
};

watch(
  () => props.modelValue,
  () => {
    nextTick(resize);
  }
);
</script>

<template>
  <form class="assistant-composer" @submit.prevent="onSendClick">
    <!-- Single visual block: textarea on top, toolbar row (model picker + send)
         below it, so the composer is the bottommost element of the surface. -->
    <div class="assistant-composer__field">
      <textarea
        ref="textareaRef"
        class="assistant-composer__input"
        rows="1"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="modelValue"
        @input="onInput"
        @paste="onPaste"
        @keydown="onKeydown"
      />
      <div class="assistant-composer__toolbar">
        <AssistantModelPicker
          v-if="targets.length"
          :targets="targets"
          :selected-id="selectedTargetId"
          :preferred-id="preferredTargetId"
          :disabled="pickerDisabled"
          :is-operator="isOperator"
          :t="t"
          @select="(id) => emit('select-target', id)"
        />
        <span v-else aria-hidden="true" />
        <div class="assistant-composer__actions">
          <span
            v-if="formattedCost"
            class="assistant-composer__cost"
            :title="t('assistant.composer.sessionCost')"
          >{{ formattedCost }}</span>
          <span
            v-if="showContextMeter"
            class="assistant-composer__context"
            :title="t('assistant.composer.contextUsage')"
          >
            <span class="assistant-composer__context-bar">
              <span
                class="assistant-composer__context-fill"
                :class="`assistant-composer__context-fill--${contextZone}`"
                :style="{ width: `${contextPercent}%` }"
              />
            </span>
            <span class="assistant-composer__context-text">
              {{ formatTokens(contextTokens) }} / {{ formatTokens(contextWindow) }}
            </span>
          </span>
          <button
            type="button"
            class="assistant-composer__send"
            :class="{ 'assistant-composer__send--stop': streaming }"
            :disabled="disabled || (!streaming && !canSend)"
            :aria-label="streaming ? t('assistant.composer.stop') : t('assistant.composer.send')"
            @click="onSendClick"
          >
            <Transition name="assistant-composer__send-icon" mode="out-in">
              <Square v-if="streaming" key="stop" :size="16" />
              <ArrowUp v-else key="send" :size="16" />
            </Transition>
          </button>
        </div>
      </div>
    </div>
  </form>
</template>
