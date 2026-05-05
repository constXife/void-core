<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { ArrowUp, Square } from "lucide-vue-next";

const props = defineProps({
  modelValue: { type: String, default: "" },
  streaming: { type: Boolean, default: false },
  canSend: { type: Boolean, default: false },
  modelLabel: { type: String, default: "" },
  disabled: { type: Boolean, default: false }
});

const emit = defineEmits(["update:modelValue", "send", "stop"]);

const textareaRef = ref(null);

const placeholder = computed(() =>
  props.disabled ? "Assistant выключен" : "Сообщение… (Enter — отправить, Shift+Enter — перенос)"
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
        :aria-label="streaming ? 'Stop generating' : 'Send message'"
        @click="onSendClick"
      >
        <Square v-if="streaming" :size="16" />
        <ArrowUp v-else :size="16" />
      </button>
    </div>
    <p v-if="modelLabel" class="assistant-composer__hint">
      {{ modelLabel }}
    </p>
  </form>
</template>
