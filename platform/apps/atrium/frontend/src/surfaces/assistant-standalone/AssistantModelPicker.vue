<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { ChevronDown, Check, Star, Search, Cpu } from "@lucide/vue";

const props = defineProps({
  targets: { type: Array, default: () => [] },
  selectedId: { type: String, default: "" },
  preferredId: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  // Оператор видит технический slug модели (provider+id); резидент — только
  // чистое имя. Источник роли — currentUser.role === "admin" на surface.
  isOperator: { type: Boolean, default: false },
  t: { type: Function, required: true }
});

const emit = defineEmits(["select"]);

const open = ref(false);
const query = ref("");
const rootRef = ref(null);
const searchRef = ref(null);
const t = (key, vars = {}) => props.t(key, vars);

// Контекстное окно в компактном виде: 160000 → "160k", 1000000 → "1M".
const formatContext = (tokens) => {
  if (!tokens) return "";
  if (tokens >= 1_000_000) return `${Math.round(tokens / 100_000) / 10}M`.replace(".0", "");
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}k`;
  return String(tokens);
};

// Чистое имя модели для резидента: отбрасываем org-префикс (`deepseek-ai/…`),
// т.к. для discovered-моделей label == id (slug), человекочитаемого имени нет.
const displayName = (target) => {
  const model = target.model || "";
  const slash = model.lastIndexOf("/");
  return slash >= 0 ? model.slice(slash + 1) : model;
};

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

// Фильтр поверх готовой группировки: по чистому имени, slug и метке провайдера,
// чтобы и резидент (имя), и оператор (slug) находили модель. Пустые группы
// выкидываем.
const filteredGroups = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return grouped.value;
  return grouped.value
    .map((group) => {
      const items = group.items.filter((target) => {
        const haystack = [
          displayName(target),
          target.model || "",
          group.label || ""
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      });
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);
});

const hasResults = computed(() =>
  filteredGroups.value.some((group) => group.items.length > 0)
);

const activeTarget = computed(() =>
  props.targets.find((target) => target.id === props.selectedId) || null
);

// Триггер: резидент видит чистое имя; оператор — provider · slug.
const triggerLabel = computed(() => {
  if (activeTarget.value) {
    if (!props.isOperator) return displayName(activeTarget.value);
    const provider =
      activeTarget.value.provider_label || activeTarget.value.provider || "";
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
  query.value = "";
};

const choose = (target) => {
  emit("select", target.id);
  close();
};

watch(open, (isOpen) => {
  if (isOpen) nextTick(() => searchRef.value?.focus());
});

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
      <Cpu :size="13" class="assistant-model-picker__trigger-icon" aria-hidden="true" />
      <span class="assistant-model-picker__label">{{ triggerLabel }}</span>
      <ChevronDown :size="12" class="assistant-model-picker__chevron" />
    </button>

    <div v-if="open" class="assistant-model-picker__menu" role="listbox">
      <div class="assistant-model-picker__search">
        <Search :size="13" class="assistant-model-picker__search-icon" aria-hidden="true" />
        <input
          ref="searchRef"
          v-model="query"
          type="text"
          class="assistant-model-picker__search-input"
          :placeholder="t('assistant.composer.modelSearch')"
          :aria-label="t('assistant.composer.modelSearch')"
        />
      </div>

      <p v-if="!hasResults" class="assistant-model-picker__empty">
        {{ t("assistant.composer.modelSearchEmpty") }}
      </p>

      <div
        v-for="group in filteredGroups"
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
          <span class="assistant-model-picker__item-text">
            <span class="assistant-model-picker__item-label">{{ displayName(target) }}</span>
            <span
              v-if="isOperator"
              class="assistant-model-picker__item-sub"
            >{{ target.model }}</span>
          </span>
          <span class="assistant-model-picker__item-meta">
            <span
              v-if="target.context_window"
              class="assistant-model-picker__context"
            >{{ formatContext(target.context_window) }}</span>
            <Star
              v-if="target.id === preferredId"
              :size="12"
              class="assistant-model-picker__badge"
              :aria-label="t('assistant.composer.defaultForNew')"
            />
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
