<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useAtriumAppStore } from "../../stores/atrium-app.js";

const appStore = useAtriumAppStore();
const { fetchJSON, t } = appStore;

const bindings = ref([]);
const targets = ref([]);
const drafts = reactive({});
const loading = ref(true);
const loadFailed = ref(false);
const savingJobId = ref("");
const savedJobId = ref("");
const saveFailedJobId = ref("");

const groupedBindings = computed(() => {
  const groups = new Map();
  for (const binding of bindings.value) {
    const key = String(binding.element_id || "");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(binding);
  }
  return [...groups.entries()].map(([elementId, jobs]) => ({ elementId, jobs }));
});

const policyOptions = computed(() => [
  { id: "local-only", label: t("admin.models.policy.localOnly") },
  { id: "external-allowed", label: t("admin.models.policy.externalAllowed") },
  { id: "external-confirmed", label: t("admin.models.policy.externalConfirmed") }
]);

const syncDrafts = () => {
  for (const binding of bindings.value) {
    drafts[binding.job_id] = {
      targetId: binding.target_id,
      dataPolicy: binding.data_policy
    };
  }
};

const load = async () => {
  loading.value = true;
  loadFailed.value = false;
  try {
    const payload = await fetchJSON("/assistant/models");
    bindings.value = Array.isArray(payload?.model_job_bindings)
      ? payload.model_job_bindings
      : [];
    targets.value = Array.isArray(payload?.targets) ? payload.targets : [];
    syncDrafts();
  } catch (error) {
    console.error("atrium: model routing load failed", error);
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
};

const targetFor = (targetId) => targets.value.find((target) => target.id === targetId) || null;

const executionZoneLabel = (targetId) => {
  const zone = targetFor(targetId)?.execution_zone;
  return zone ? t(`admin.models.executionZone.${zone}`) : "";
};

const isDirty = (binding) => {
  const draft = drafts[binding.job_id];
  return Boolean(
    draft &&
      (draft.targetId !== binding.target_id || draft.dataPolicy !== binding.data_policy)
  );
};

const save = async (binding) => {
  const draft = drafts[binding.job_id];
  if (!draft || !isDirty(binding) || savingJobId.value) return;
  savingJobId.value = binding.job_id;
  savedJobId.value = "";
  saveFailedJobId.value = "";
  try {
    const payload = await fetchJSON(
      `/assistant/model-jobs/${encodeURIComponent(binding.job_id)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          targetId: draft.targetId,
          dataPolicy: draft.dataPolicy,
          expectedRevision: binding.revision
        })
      }
    );
    const index = bindings.value.findIndex((item) => item.job_id === binding.job_id);
    if (index >= 0) bindings.value[index] = payload.binding;
    syncDrafts();
    savedJobId.value = binding.job_id;
  } catch (error) {
    console.error("atrium: model routing save failed", error);
    saveFailedJobId.value = binding.job_id;
  } finally {
    savingJobId.value = "";
  }
};

onMounted(load);
</script>

<template>
  <section class="space-y-4">
    <div class="admin-card">
      <div class="section-title">{{ t("admin.models.catalogTitle") }}</div>
      <p class="mt-2 text-sm text-white/50">{{ t("admin.models.catalogHint") }}</p>
      <p class="mt-3 text-xs text-amber-200/70">{{ t("admin.models.externalWarning") }}</p>
    </div>

    <div v-if="loading" class="admin-card text-sm text-white/50">
      {{ t("admin.models.loading") }}
    </div>
    <div v-else-if="loadFailed" class="admin-card">
      <p class="text-sm text-rose-300">{{ t("admin.models.loadFailed") }}</p>
      <button class="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm text-white" @click="load">
        {{ t("admin.models.retry") }}
      </button>
    </div>
    <div v-else-if="groupedBindings.length === 0" class="admin-card text-sm text-white/50">
      {{ t("admin.models.empty") }}
    </div>

    <div v-for="group in groupedBindings" :key="group.elementId" class="admin-card">
      <div class="section-title">{{ group.elementId }}</div>
      <div class="mt-4 divide-y divide-white/5">
        <div v-for="binding in group.jobs" :key="binding.job_id" class="py-5 first:pt-0 last:pb-0">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="font-medium text-white">{{ binding.operation_id }}</div>
              <div class="mt-1 text-xs text-white/35">{{ binding.job_id }}</div>
            </div>
            <div class="text-xs text-white/35">
              {{ t("admin.models.revision", { revision: binding.revision }) }}
            </div>
          </div>

          <div class="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)_auto]">
            <label class="space-y-2">
              <span class="text-xs text-white/50">{{ t("admin.models.model") }}</span>
              <select
                v-model="drafts[binding.job_id].targetId"
                class="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"
              >
                <option v-for="target in targets" :key="target.id" :value="target.id">
                  {{ target.label }}
                </option>
              </select>
            </label>
            <label class="space-y-2">
              <span class="text-xs text-white/50">{{ t("admin.models.dataPolicy") }}</span>
              <select
                v-model="drafts[binding.job_id].dataPolicy"
                class="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"
              >
                <option v-for="policy in policyOptions" :key="policy.id" :value="policy.id">
                  {{ policy.label }}
                </option>
              </select>
            </label>
            <button
              class="self-end rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!isDirty(binding) || Boolean(savingJobId)"
              @click="save(binding)"
            >
              {{ savingJobId === binding.job_id ? t("admin.models.saving") : t("admin.models.save") }}
            </button>
          </div>

          <p class="mt-2 text-xs text-white/35">
            {{ targetFor(drafts[binding.job_id].targetId)?.provider_label || "" }} ·
            {{ targetFor(drafts[binding.job_id].targetId)?.model || "" }} ·
            {{ executionZoneLabel(drafts[binding.job_id].targetId) }}
          </p>
          <p v-if="savedJobId === binding.job_id" class="mt-2 text-xs text-lime-300">
            {{ t("admin.models.saved") }}
          </p>
          <p v-if="saveFailedJobId === binding.job_id" class="mt-2 text-xs text-rose-300">
            {{ t("admin.models.saveFailed") }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
