<script setup>
import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ChevronLeft } from "@lucide/vue";
import TheShellBackdrop from "../components/TheShellBackdrop.vue";
import { useAssistantRoutinesStore } from "../stores/assistant-routines.js";
import { useAssistantRunsStore } from "../stores/assistant-runs.js";

const route = useRoute();
const router = useRouter();
const routinesStore = useAssistantRoutinesStore();
const runsStore = useAssistantRunsStore();

const { currentRun, loading, status, runsByInstance } = storeToRefs(runsStore);
const { loaded: routinesLoaded } = storeToRefs(routinesStore);

const instanceId = computed(() => String(route.params?.instanceId || ""));
const runId = computed(() => String(route.params?.runId || ""));
const isDetail = computed(() => Boolean(runId.value));

const routine = computed(() => routinesStore.instanceById(instanceId.value));
const runs = computed(() => runsByInstance.value[instanceId.value] || []);

const breadcrumb = computed(() => {
  const parts = [
    { label: "Routines", to: { name: "assistant-routines" } },
    { label: routine.value?.display_name || instanceId.value, to: { name: "assistant-routine-inspect", params: { instanceId: instanceId.value } } },
    { label: "Runs", to: { name: "assistant-routine-runs", params: { instanceId: instanceId.value } } }
  ];
  if (isDetail.value) {
    parts.push({ label: `#${runId.value.slice(0, 12)}`, to: null });
  }
  return parts;
});

const outcomeVariant = (outcome) => {
  switch (outcome) {
    case "accepted": return "success";
    case "dismissed": return "warning";
    case "pending": return "info";
    default: return "default";
  }
};

const fmtTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + "Z";
};

const fmtDuration = (run) => {
  if (!run.started_at || !run.completed_at) return "—";
  const ms = new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const ensureLoaded = async () => {
  if (!routinesLoaded.value) {
    await routinesStore.loadInstances();
  }
  if (!instanceId.value) return;
  await runsStore.loadRunsForInstance(instanceId.value);
  if (isDetail.value) {
    await runsStore.loadRun(instanceId.value, runId.value);
  } else {
    runsStore.clearCurrentRun();
  }
};

const onBack = () => {
  if (isDetail.value) {
    router.push({ name: "assistant-routine-runs", params: { instanceId: instanceId.value } });
  } else {
    router.push({ name: "assistant-routines" });
  }
};

const onSelectRun = (id) => {
  router.push({
    name: "assistant-routine-run-detail",
    params: { instanceId: instanceId.value, runId: id }
  });
};

onMounted(ensureLoaded);
watch(() => [instanceId.value, runId.value], ensureLoaded);
</script>

<template>
  <main class="assistant-runs-root">
    <TheShellBackdrop tone="assistant" />

    <header class="assistant-runs-header">
      <button type="button" class="assistant-runs-back" @click="onBack">
        <ChevronLeft :size="16" />
        <span>{{ isDetail ? "К списку runs" : "К Routines" }}</span>
      </button>

      <nav class="assistant-runs-breadcrumb" aria-label="Breadcrumb">
        <template v-for="(part, idx) in breadcrumb" :key="idx">
          <span v-if="idx > 0" class="assistant-runs-breadcrumb__sep">›</span>
          <button
            v-if="part.to"
            type="button"
            class="assistant-runs-breadcrumb__item"
            @click="router.push(part.to)"
          >{{ part.label }}</button>
          <span v-else class="assistant-runs-breadcrumb__current">{{ part.label }}</span>
        </template>
      </nav>
    </header>

    <div class="assistant-runs-body">
      <p v-if="loading && !runs.length && !currentRun" class="assistant-runs-hint">Загружаем…</p>

      <p v-else-if="status" class="assistant-runs-error" role="alert">{{ status }}</p>

      <template v-else>
        <!-- LIST mode -->
        <section v-if="!isDetail" class="assistant-runs-list">
          <h1 class="assistant-runs-title">{{ routine?.display_name || instanceId }}</h1>
          <p class="assistant-runs-subtitle">
            Run history · {{ runs.length }} runs
          </p>

          <div v-if="!runs.length" class="assistant-runs-empty">
            <p>Этот routine ещё не запускался.</p>
          </div>

          <div v-else class="assistant-runs-cards">
            <button
              v-for="run in runs"
              :key="run.id"
              type="button"
              class="assistant-run-card"
              @click="onSelectRun(run.id)"
            >
              <div class="assistant-run-card__head">
                <span class="assistant-run-card__id">{{ run.id }}</span>
                <span
                  class="assistant-run-card__outcome"
                  :data-variant="outcomeVariant(run.outcome)"
                >{{ run.outcome || run.status }}</span>
              </div>
              <div class="assistant-run-card__summary">{{ run.output_summary }}</div>
              <div class="assistant-run-card__meta">
                <span>▶ {{ fmtTime(run.started_at) }}</span>
                <span>⏱ {{ fmtDuration(run) }}</span>
                <span>🛠 {{ run.tool_call_count }} tool calls</span>
                <span v-if="run.policy_deny_count">⛔ {{ run.policy_deny_count }} denied</span>
                <span>💰 ~${{ run.budget_cost_usd.toFixed(3) }} · {{ run.budget_tokens.toLocaleString() }} tokens</span>
              </div>
            </button>
          </div>
        </section>

        <!-- DETAIL mode -->
        <section v-else-if="currentRun" class="assistant-run-detail">
          <header class="assistant-run-detail__head">
            <h1 class="assistant-run-detail__title">{{ currentRun.id }}</h1>
            <span
              class="assistant-run-detail__outcome"
              :data-variant="outcomeVariant(currentRun.outcome)"
            >{{ currentRun.outcome || currentRun.status }}</span>
          </header>

          <div class="assistant-run-detail__grid">
            <div class="assistant-run-detail__field">
              <span class="assistant-run-detail__label">Skill</span>
              <span class="assistant-run-detail__value">
                {{ currentRun.skill_id }}
                <span class="assistant-run-detail__mono">{{ currentRun.skill_version_hash }}</span>
              </span>
            </div>
            <div class="assistant-run-detail__field">
              <span class="assistant-run-detail__label">Started</span>
              <span class="assistant-run-detail__value assistant-run-detail__mono">{{ fmtTime(currentRun.started_at) }}</span>
            </div>
            <div class="assistant-run-detail__field">
              <span class="assistant-run-detail__label">Duration</span>
              <span class="assistant-run-detail__value">{{ fmtDuration(currentRun) }}</span>
            </div>
            <div class="assistant-run-detail__field">
              <span class="assistant-run-detail__label">Tokens / Cost</span>
              <span class="assistant-run-detail__value">
                {{ currentRun.budget_tokens.toLocaleString() }} · ~${{ currentRun.budget_cost_usd.toFixed(3) }}
              </span>
            </div>
          </div>

          <div class="assistant-run-detail__summary">
            <span class="assistant-run-detail__label">Output</span>
            <p>{{ currentRun.output_summary }}</p>
          </div>

          <section class="assistant-run-detail__section">
            <h2 class="assistant-run-detail__section-title">
              Tool invocations <span class="assistant-run-detail__count">{{ currentRun.tool_invocations.length }}</span>
            </h2>
            <ul v-if="currentRun.tool_invocations.length" class="assistant-run-detail__list">
              <li
                v-for="(inv, idx) in currentRun.tool_invocations"
                :key="idx"
                class="assistant-run-detail__invocation"
              >
                <span class="assistant-run-detail__mono">{{ inv.name }}</span>
                <span class="assistant-run-detail__inv-meta">
                  {{ inv.category }} · {{ inv.trust }} · {{ inv.ms }}ms
                </span>
              </li>
            </ul>
            <p v-else class="assistant-run-detail__empty">Не было tool вызовов.</p>
          </section>

          <section class="assistant-run-detail__section">
            <h2 class="assistant-run-detail__section-title">
              Policy decisions
              <span class="assistant-run-detail__count">{{ currentRun.policy_decisions.length }}</span>
              <span v-if="currentRun.policy_deny_count" class="assistant-run-detail__deny-tag">
                {{ currentRun.policy_deny_count }} denied
              </span>
            </h2>
            <ul v-if="currentRun.policy_decisions.length" class="assistant-run-detail__list">
              <li
                v-for="(dec, idx) in currentRun.policy_decisions"
                :key="idx"
                class="assistant-run-detail__decision"
                :data-decision="dec.decision"
              >
                <div class="assistant-run-detail__decision-head">
                  <span class="assistant-run-detail__mono">{{ dec.tool }}</span>
                  <span class="assistant-run-detail__decision-tag">{{ dec.decision }}</span>
                </div>
                <p class="assistant-run-detail__decision-reason">{{ dec.reason }}</p>
              </li>
            </ul>
            <p v-else class="assistant-run-detail__empty">Никаких policy violations — все вызовы прошли gateway.</p>
          </section>
        </section>

        <section v-else class="assistant-runs-empty">
          <p>Run не найден.</p>
        </section>
      </template>
    </div>
  </main>
</template>
