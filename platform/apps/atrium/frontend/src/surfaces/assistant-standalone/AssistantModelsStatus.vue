<script setup>
defineProps({
  state: { type: String, required: true },
  error: { type: String, required: true },
  t: { type: Function, required: true }
});
defineEmits(["retry"]);
</script>

<template>
  <div v-if="error" class="assistant-models-status" role="alert" :aria-busy="state === 'loading'">
    <div>
      <strong>{{ t('assistant.models.loadFailed') }}</strong>
      <p>{{ t('assistant.models.loadHint') }}</p>
    </div>
    <button type="button" :disabled="state === 'loading'" @click="$emit('retry')">
      {{ t(state === 'loading' ? 'assistant.models.retrying' : 'assistant.models.retry') }}
    </button>
  </div>
</template>

<style scoped>
.assistant-models-status { box-sizing: border-box; width: min(720px, calc(100% - 40px)); margin: 8px auto; padding: 16px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--surface-raised); display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: 14px; }
.assistant-models-status > div { flex: 1 1 220px; }
.assistant-models-status strong { font-weight: 500; color: var(--ink-primary); }
.assistant-models-status p { margin: 6px 0 0; color: var(--ink-secondary); }
.assistant-models-status button { min-height: 44px; padding: 8px 16px; border: 1px solid var(--border-default); border-radius: 8px; background: var(--surface-overlay); color: var(--ink-primary); cursor: pointer; }
.assistant-models-status button:disabled { opacity: .6; cursor: wait; }
</style>
