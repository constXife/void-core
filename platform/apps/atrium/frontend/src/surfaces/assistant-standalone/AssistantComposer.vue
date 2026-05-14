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
  disabled: { type: Boolean, default: false },
  t: { type: Function, required: true }
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
    <div class="assistant-composer__field">
      <textarea
        ref="textareaRef"
        class="assistant-composer__input"
        rows="1"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="modelValue"
        @input="onInput"
        @keydown="onKeydown"
      />
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
    <div v-if="targets.length" class="assistant-composer__hint">
      <AssistantModelPicker
        :targets="targets"
        :selected-id="selectedTargetId"
        :preferred-id="preferredTargetId"
        :disabled="pickerDisabled"
        :t="t"
        @select="(id) => emit('select-target', id)"
      />
    </div>
  </form>
</template>
