<script setup>
import { X } from "lucide-vue-next";
import Tooltip from "../components/Tooltip.vue";

defineProps({
  hotkeys: {
    type: Object,
    required: true
  },
  t: {
    type: Function,
    required: true
  },
  tooltipsDisabled: {
    type: Boolean,
    default: false
  },
  tooltipDelay: {
    type: Number,
    default: 60
  }
});

defineEmits(["close"]);
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-content admin-modal">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">{{ t("app.keyboardShortcuts") }}</h3>
        <button class="btn btn-ghost btn-icon" @click="$emit('close')">
          <Tooltip
            :content="t('app.close')"
            :disabled="tooltipsDisabled"
            :delay="tooltipDelay"
          >
            <X class="w-4 h-4" />
          </Tooltip>
        </button>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="card-glass">
          <div class="text-sm font-semibold">{{ t("app.shortcutsNavigateTitle") }}</div>
          <div class="text-white/50 text-xs mt-1">{{ t("app.shortcutsNavigateBody") }}</div>
          <div class="mt-3 flex gap-2 flex-wrap">
            <span class="chip">{{ hotkeys.prev }}</span>
            <span class="chip">{{ hotkeys.next }}</span>
          </div>
        </div>
        <div class="card-glass">
          <div class="text-sm font-semibold">{{ t("app.shortcutsHelpTitle") }}</div>
          <div class="text-white/50 text-xs mt-1">{{ t("app.shortcutsHelpBody") }}</div>
          <div class="mt-3">
            <span class="chip">{{ hotkeys.help }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
