<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { TriangleAlert, ChevronLeft, Terminal } from "lucide-vue-next";
import TheShellBackdrop from "../components/TheShellBackdrop.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import {
  runBreakGlassShell,
  redirectToStepUp,
  StepUpRequiredError
} from "../lib/assistant-breakglass.js";

const route = useRoute();
const appStore = useAtriumAppStore();
const { isAdmin } = storeToRefs(appStore);
const t = (key, vars = {}) => appStore.t(key, vars);

const PENDING_KEY = "atrium:breakglass:pending";

const command = ref("");
const running = ref(false);
const result = ref(null);
const error = ref("");
const stepupRequired = ref(false);

// Запуск всегда идёт через свежий step-up: команда сохраняется, UI редиректит на re-auth,
// и после возврата (?stepped=1) команда авто-подаётся в окне свежести (backend — 120s).
const submit = async (cmd) => {
  const value = String(cmd ?? command.value).trim();
  if (!value) {
    error.value = t("assistant.breakglass.empty");
    return;
  }
  running.value = true;
  error.value = "";
  result.value = null;
  stepupRequired.value = false;
  try {
    result.value = await runBreakGlassShell({ command: value });
  } catch (reason) {
    if (reason instanceof StepUpRequiredError) {
      // Нет свежего re-auth → сохраняем команду и уходим на step-up; вернёмся и авто-подадим.
      sessionStorage.setItem(PENDING_KEY, value);
      redirectToStepUp();
      return;
    }
    error.value = t("assistant.breakglass.error", { message: reason?.message || String(reason) });
  } finally {
    running.value = false;
  }
};

const onRun = () => {
  // Принудительно через step-up: сохраняем и уходим на re-auth (после возврата авто-подача).
  const value = command.value.trim();
  if (!value) {
    error.value = t("assistant.breakglass.empty");
    return;
  }
  sessionStorage.setItem(PENDING_KEY, value);
  redirectToStepUp();
};

onMounted(() => {
  if (String(route.query?.stepped || "") === "1") {
    const pending = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    if (pending) {
      command.value = pending;
      submit(pending);
    }
  }
});

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
          :placeholder="t('assistant.breakglass.commandPlaceholder')"
        ></textarea>

        <p class="breakglass__notice">{{ t("assistant.breakglass.stepupNotice") }}</p>
        <p v-if="stepupRequired" class="breakglass__notice breakglass__notice--warn">
          {{ t("assistant.breakglass.stepupRequired") }}
        </p>

        <button class="breakglass__run" type="button" :disabled="running" @click="onRun">
          {{ running ? t("assistant.breakglass.running") : t("assistant.breakglass.run") }}
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
  font-size: 0.8rem;
  color: var(--text-2, #9aa0ab);
  margin: 8px 0 0;
}
.breakglass__notice--warn {
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
