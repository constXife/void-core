<script setup>
import { computed, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { TriangleAlert, ChevronLeft, Terminal, Smartphone } from "@lucide/vue";
import TheShellBackdrop from "../components/TheShellBackdrop.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { runBreakGlassShell, pollBreakGlassResult } from "../lib/assistant-breakglass.js";

const appStore = useAtriumAppStore();
const { isAdmin } = storeToRefs(appStore);
const t = (key, vars = {}) => appStore.t(key, vars);

// idle | waiting | done
const phase = ref("idle");
const command = ref("");
const result = ref(null);
const error = ref("");
let aborter = null;

// Каждая команда — отдельный per-command device_factor approval: создаём request, ждём
// подтверждения на телефоне (там видна ровно эта команда), затем поллим результат исполнения.
const onRun = async () => {
  const value = command.value.trim();
  if (!value) {
    error.value = t("assistant.breakglass.empty");
    return;
  }
  phase.value = "waiting";
  error.value = "";
  result.value = null;
  aborter = new AbortController();
  try {
    const created = await runBreakGlassShell({ command: value });
    const record = await pollBreakGlassResult(created.request_id, { signal: aborter.signal });
    if (record.status === "completed") {
      result.value = record.result || {};
      phase.value = "done";
      return;
    }
    error.value =
      record.status === "rejected"
        ? t("assistant.breakglass.rejected")
        : record.status === "expired"
          ? t("assistant.breakglass.expired")
          : t("assistant.breakglass.failed", { message: record.error || record.status });
    phase.value = "idle";
  } catch (reason) {
    error.value = t("assistant.breakglass.error", { message: reason?.message || String(reason) });
    phase.value = "idle";
  }
};

onUnmounted(() => aborter?.abort());

const exitLabel = computed(() =>
  result.value ? t("assistant.breakglass.exit", { code: result.value.exit_code ?? "?" }) : ""
);
</script>

<template>
  <div class="breakglass">
    <TheShellBackdrop />
    <div class="breakglass__panel">
      <a class="breakglass__back" href="/">
        <ChevronLeft :size="16" />
      </a>
      <h1 class="breakglass__title">
        <Terminal :size="18" />
        {{ t("assistant.breakglass.title") }}
      </h1>

      <p v-if="!isAdmin" class="breakglass__forbidden">
        {{ t("assistant.breakglass.forbidden") }}
      </p>

      <template v-else>
        <div class="breakglass__warning">
          <TriangleAlert :size="18" />
          <span>{{ t("assistant.breakglass.warning") }}</span>
        </div>

        <label class="breakglass__label" for="breakglass-command">
          {{ t("assistant.breakglass.commandLabel") }}
        </label>
        <textarea
          id="breakglass-command"
          v-model="command"
          class="breakglass__input"
          rows="3"
          spellcheck="false"
          autocomplete="off"
          :disabled="phase === 'waiting'"
          :placeholder="t('assistant.breakglass.commandPlaceholder')"
        ></textarea>

        <p class="breakglass__notice">{{ t("assistant.breakglass.deviceNotice") }}</p>

        <p v-if="phase === 'waiting'" class="breakglass__notice breakglass__notice--wait">
          <Smartphone :size="16" />
          <span>{{ t("assistant.breakglass.waiting") }}</span>
        </p>

        <button
          class="breakglass__run"
          type="button"
          :disabled="phase === 'waiting'"
          @click="onRun"
        >
          {{ phase === "waiting" ? t("assistant.breakglass.running") : t("assistant.breakglass.run") }}
        </button>

        <p v-if="error" class="breakglass__error">{{ error }}</p>

        <div v-if="result" class="breakglass__result">
          <div class="breakglass__result-head">
            <span>{{ t("assistant.breakglass.resultTitle") }}</span>
            <span class="breakglass__exit">{{ exitLabel }}</span>
            <span v-if="result.truncated" class="breakglass__trunc">
              {{ t("assistant.breakglass.truncated") }}
            </span>
          </div>
          <pre class="breakglass__output">{{ result.output }}</pre>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.breakglass {
  position: relative;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 48px 16px;
}
.breakglass__panel {
  position: relative;
  width: min(820px, 100%);
  background: var(--surface-1, #14151a);
  border: 1px solid var(--border-1, #2a2c33);
  border-radius: 14px;
  padding: 24px;
}
.breakglass__back {
  display: inline-flex;
  color: var(--text-2, #9aa0ab);
  margin-bottom: 8px;
}
.breakglass__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.25rem;
  margin: 0 0 16px;
}
.breakglass__forbidden {
  color: var(--text-2, #9aa0ab);
}
.breakglass__warning {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: rgba(220, 80, 60, 0.12);
  border: 1px solid rgba(220, 80, 60, 0.4);
  color: #f1b0a6;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 16px;
  line-height: 1.4;
}
.breakglass__label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-2, #9aa0ab);
  margin-bottom: 6px;
}
.breakglass__input {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
  background: var(--surface-0, #0e0f13);
  color: var(--text-1, #e6e8ec);
  border: 1px solid var(--border-1, #2a2c33);
  border-radius: 8px;
  padding: 10px 12px;
  resize: vertical;
}
.breakglass__notice {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.8rem;
  color: var(--text-2, #9aa0ab);
  margin: 8px 0 0;
}
.breakglass__notice--wait {
  color: #e6b800;
}
.breakglass__run {
  margin-top: 14px;
  background: #b5402f;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 600;
  cursor: pointer;
}
.breakglass__run:disabled {
  opacity: 0.6;
  cursor: default;
}
.breakglass__error {
  color: #f1857a;
  margin-top: 12px;
}
.breakglass__result {
  margin-top: 18px;
  border: 1px solid var(--border-1, #2a2c33);
  border-radius: 10px;
  overflow: hidden;
}
.breakglass__result-head {
  display: flex;
  gap: 12px;
  align-items: center;
  background: var(--surface-2, #1b1d23);
  padding: 8px 12px;
  font-size: 0.85rem;
}
.breakglass__exit {
  color: var(--text-2, #9aa0ab);
}
.breakglass__trunc {
  color: #e6b800;
}
.breakglass__output {
  margin: 0;
  padding: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 50vh;
  overflow: auto;
  background: var(--surface-0, #0e0f13);
}
</style>
