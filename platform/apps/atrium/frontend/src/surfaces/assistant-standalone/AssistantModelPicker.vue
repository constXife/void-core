<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { ChevronDown, Check, Star } from "lucide-vue-next";

const props = defineProps({
  targets: { type: Array, default: () => [] },
  selectedId: { type: String, default: "" },
  preferredId: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  t: { type: Function, required: true }
});

const emit = defineEmits(["select"]);

const open = ref(false);
const rootRef = ref(null);
const t = (key, vars = {}) => props.t(key, vars);

// Группировка targets по provider_id с сохранением порядка появления.
const grouped = computed(() => {
  const order = [];
  const map = new Map();
  for (const target of props.targets) {
    const key = target.provider_id || target.provider || "";
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        label: target.provider_label || target.provider || key,
        items: []
      });
      order.push(key);
    }
    map.get(key).items.push(target);
  }
  return order.map((id) => map.get(id));
});

const activeTarget = computed(() =>
  props.targets.find((target) => target.id === props.selectedId) || null
);

// Если selectedId есть, но target пропал из списка, показываем это явно.
const triggerLabel = computed(() => {
  if (activeTarget.value) {
    const provider = activeTarget.value.provider_label || activeTarget.value.provider || "";
    const model = activeTarget.value.model || "";
    return [provider, model].filter(Boolean).join(" · ");
  }
  if (props.selectedId) return t("assistant.composer.modelMissing", { id: props.selectedId });
  return t("assistant.composer.noModel");
});

const toggle = () => {
  if (props.disabled) return;
  open.value = !open.value;
};

const close = () => {
  open.value = false;
};

const choose = (target) => {
  emit("select", target.id);
  close();
};

const onDocumentMouseDown = (event) => {
  if (!rootRef.value) return;
  if (rootRef.value.contains(event.target)) return;
  close();
};

const onKeydown = (event) => {
  if (event.key === "Escape" && open.value) {
    event.preventDefault();
    close();
  }
};

onMounted(() => {
  document.addEventListener("mousedown", onDocumentMouseDown);
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", onDocumentMouseDown);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div
    ref="rootRef"
    class="assistant-model-picker"
    :class="{ 'assistant-model-picker--open': open, 'assistant-model-picker--missing': selectedId && !activeTarget }"
  >
    <button
      type="button"
      class="assistant-model-picker__trigger"
      :disabled="disabled"
      :aria-expanded="open"
      :aria-haspopup="'listbox'"
      @click="toggle"
    >
      <span class="assistant-model-picker__label">{{ triggerLabel }}</span>
      <ChevronDown :size="12" class="assistant-model-picker__chevron" />
    </button>

    <div v-if="open" class="assistant-model-picker__menu" role="listbox">
      <div
        v-for="group in grouped"
        :key="group.id"
        class="assistant-model-picker__group"
      >
        <p class="assistant-model-picker__group-title">{{ group.label }}</p>
        <button
          v-for="target in group.items"
          :key="target.id"
          type="button"
          class="assistant-model-picker__item"
          :class="{ 'assistant-model-picker__item--active': target.id === selectedId }"
          role="option"
          :aria-selected="target.id === selectedId"
          @click="choose(target)"
        >
          <Check
            v-if="target.id === selectedId"
            :size="13"
            class="assistant-model-picker__check"
          />
          <span v-else class="assistant-model-picker__check-spacer" aria-hidden="true" />
          <span class="assistant-model-picker__item-label">{{ target.model }}</span>
          <Star
            v-if="target.id === preferredId"
            :size="12"
            class="assistant-model-picker__badge"
            :aria-label="t('assistant.composer.defaultForNew')"
          />
        </button>
      </div>
    </div>
  </div>
</template>
