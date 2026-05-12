import { computed, ref } from "vue";
import { defineStore } from "pinia";

// TODO Wave 6: replace with GET /assistant/contract-instances
// Per ASSISTANT_SURFACE_STRUCTURE.md D10 — fixture inline.
const MOCK_INSTANCES = [
  {
    id: "inst_shopping_weekly",
    display_name: "Weekly shopping run",
    skill_id: "shopping-planning",
    skill_version_pin: 1,
    template_id: "weekly-shopping-run",
    status: "enabled",
    autonomy_level: "suggestion_only",
    trigger: {
      kind: "schedule",
      label: "sunday 10:00",
      timezone: "Europe/Berlin",
      params: { cron: "0 10 * * 0" }
    },
    last_run_at: "2026-05-04T10:00:18Z",
    next_run_at: "2026-05-11T10:00:00Z",
    accept_rate: 0.78,
    runs_window: 12,
    budget_consumed_avg: 0.01,
    budget_unit: "$/run"
  },
  {
    id: "inst_hn_morning",
    display_name: "Morning HackerNews digest",
    skill_id: "web-digest",
    skill_version_pin: 1,
    template_id: "hackernews-morning-digest",
    status: "enabled",
    autonomy_level: "suggestion_only",
    trigger: {
      kind: "schedule",
      label: "daily 09:00",
      timezone: "Europe/Berlin",
      params: { cron: "0 9 * * *" }
    },
    last_run_at: "2026-05-11T09:00:42Z",
    next_run_at: "2026-05-12T09:00:00Z",
    accept_rate: 0.41,
    runs_window: 30,
    budget_consumed_avg: 0.04,
    budget_unit: "$/run · 2 pages"
  },
  {
    id: "inst_oil_low",
    display_name: "Oil-low re-suggest",
    skill_id: "shopping-planning",
    skill_version_pin: 1,
    template_id: null,
    status: "enabled",
    autonomy_level: "reversible_autonomous",
    trigger: {
      kind: "event",
      label: "inventory.item.depleted (cooking oil)",
      timezone: null,
      params: { event: "inventory.item.depleted", filter: { item_id: "cooking_oil" } }
    },
    last_run_at: "2026-05-09T14:22:00Z",
    next_run_at: null,
    accept_rate: 1.0,
    runs_window: 3,
    budget_consumed_avg: 0.005,
    budget_unit: "$/run"
  },
  {
    id: "inst_finance_eom",
    display_name: "End-of-month finance summary",
    skill_id: "finance-monthly-summary",
    skill_version_pin: 1,
    template_id: "end-of-month-summary",
    status: "paused",
    autonomy_level: "suggestion_only",
    trigger: {
      kind: "schedule",
      label: "last day of month 18:00",
      timezone: "Europe/Berlin",
      params: { cron: "0 18 L * *" }
    },
    last_run_at: "2026-03-31T18:00:11Z",
    next_run_at: null,
    accept_rate: 1.0,
    runs_window: 2,
    budget_consumed_avg: 0.008,
    budget_unit: "$/run"
  }
];

export const useAssistantRoutinesStore = defineStore("void-assistant-routines", () => {
  const instances = ref([]);
  const loaded = ref(false);
  const loading = ref(false);
  const saving = ref(false);
  const status = ref("");

  const filters = ref({
    status: null,
    trigger_kind: null,
    autonomy_level: null
  });

  const instancesCount = computed(() => instances.value.length);

  const filteredInstances = computed(() => {
    const f = filters.value;
    return instances.value.filter((inst) => {
      if (f.status !== null && inst.status !== f.status) return false;
      if (f.trigger_kind !== null && inst.trigger?.kind !== f.trigger_kind) return false;
      if (f.autonomy_level !== null && inst.autonomy_level !== f.autonomy_level) return false;
      return true;
    });
  });

  const instanceById = (id) => instances.value.find((inst) => inst.id === id) || null;

  const instanceByTemplateId = (templateId) =>
    instances.value.find((inst) => inst.template_id === templateId) || null;

  const loadInstances = async ({ force = false } = {}) => {
    if (loaded.value && !force) return;
    loading.value = true;
    status.value = "";
    try {
      // TODO Wave 6: GET /assistant/contract-instances
      await new Promise((resolve) => setTimeout(resolve, 80));
      instances.value = MOCK_INSTANCES.map(normalizeInstance);
      loaded.value = true;
    } catch (error) {
      console.error("void-assistant-routines: load failed", error);
      status.value = String(error?.message || "Failed to load routines");
    } finally {
      loading.value = false;
    }
  };

  const toggleInstance = async (id) => {
    const inst = instanceById(id);
    if (!inst) return;
    const nextStatus = inst.status === "enabled" ? "paused" : "enabled";
    saving.value = true;
    try {
      // TODO Wave 6: PATCH /assistant/contract-instances/:id { status: nextStatus }
      await new Promise((resolve) => setTimeout(resolve, 60));
      inst.status = nextStatus;
    } catch (error) {
      console.error("void-assistant-routines: toggle failed", error);
      status.value = String(error?.message || "Toggle failed");
    } finally {
      saving.value = false;
    }
  };

  const updateInstance = async (id, formValues) => {
    const inst = instanceById(id);
    if (!inst) throw new Error(`routine not found: ${id}`);
    saving.value = true;
    try {
      // TODO Wave 6: PATCH /assistant/contract-instances/:id with formValues subset
      await new Promise((resolve) => setTimeout(resolve, 100));
      inst.display_name = String(formValues.display_name || inst.display_name);
      inst.autonomy_level = String(formValues.autonomy_level || inst.autonomy_level);
      inst.trigger = {
        ...inst.trigger,
        kind: String(formValues.trigger_kind || inst.trigger.kind),
        label: String(formValues.trigger_label ?? inst.trigger.label),
        timezone: formValues.trigger_timezone ? String(formValues.trigger_timezone) : null,
        params: {
          ...inst.trigger.params,
          ...(formValues.trigger_cron ? { cron: String(formValues.trigger_cron) } : {})
        }
      };
      return inst;
    } catch (error) {
      console.error("void-assistant-routines: update failed", error);
      status.value = String(error?.message || "Update failed");
      throw error;
    } finally {
      saving.value = false;
    }
  };

  const createInstance = async (formValues) => {
    saving.value = true;
    try {
      // TODO Wave 6: POST /assistant/contract-instances with formValues + template_id
      await new Promise((resolve) => setTimeout(resolve, 100));
      const id = `inst_${Date.now().toString(36)}`;
      const created = normalizeInstance({
        id,
        display_name: formValues.display_name,
        skill_id: formValues.skill_id,
        skill_version_pin: formValues.skill_version_pin ?? 1,
        template_id: formValues.template_id ?? null,
        status: "enabled",
        autonomy_level: formValues.autonomy_level,
        trigger: {
          kind: formValues.trigger_kind,
          label: formValues.trigger_label,
          timezone: formValues.trigger_timezone,
          params: formValues.trigger_cron ? { cron: formValues.trigger_cron } : {}
        },
        last_run_at: null,
        next_run_at: null,
        accept_rate: null,
        runs_window: null,
        budget_consumed_avg: null,
        budget_unit: "$/run"
      });
      instances.value = [...instances.value, created];
      return created;
    } catch (error) {
      console.error("void-assistant-routines: create failed", error);
      status.value = String(error?.message || "Create failed");
      throw error;
    } finally {
      saving.value = false;
    }
  };

  const setFilter = (key, value) => {
    if (!(key in filters.value)) return;
    filters.value = { ...filters.value, [key]: value };
  };

  const resetFilters = () => {
    filters.value = { status: null, trigger_kind: null, autonomy_level: null };
  };

  return {
    instances,
    instancesCount,
    filteredInstances,
    filters,
    loaded,
    loading,
    saving,
    status,
    loadInstances,
    toggleInstance,
    updateInstance,
    createInstance,
    setFilter,
    resetFilters,
    instanceById,
    instanceByTemplateId
  };
});

function normalizeInstance(raw) {
  return {
    id: String(raw.id),
    display_name: String(raw.display_name || raw.id),
    skill_id: String(raw.skill_id || ""),
    skill_version_pin: Number(raw.skill_version_pin ?? 1),
    template_id: raw.template_id ? String(raw.template_id) : null,
    status: String(raw.status || "paused"),
    autonomy_level: String(raw.autonomy_level || "suggestion_only"),
    trigger: raw.trigger
      ? {
          kind: String(raw.trigger.kind || "schedule"),
          label: String(raw.trigger.label || ""),
          timezone: raw.trigger.timezone ? String(raw.trigger.timezone) : null,
          params: raw.trigger.params || {}
        }
      : { kind: "schedule", label: "", timezone: null, params: {} },
    last_run_at: raw.last_run_at ? String(raw.last_run_at) : null,
    next_run_at: raw.next_run_at ? String(raw.next_run_at) : null,
    accept_rate: raw.accept_rate === null || raw.accept_rate === undefined ? null : Number(raw.accept_rate),
    runs_window: raw.runs_window === null || raw.runs_window === undefined ? null : Number(raw.runs_window),
    budget_consumed_avg:
      raw.budget_consumed_avg === null || raw.budget_consumed_avg === undefined
        ? null
        : Number(raw.budget_consumed_avg),
    budget_unit: String(raw.budget_unit || "$/run")
  };
}
