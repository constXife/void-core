import { computed, ref } from "vue";
import { defineStore } from "pinia";

// TODO Wave 6: replace with GET /assistant/contract-instances/:id/runs
//                          + GET /assistant/contract-instances/:id/runs/:runId
const MOCK_RUNS = {
  inst_shopping_weekly: [
    {
      id: "run_2026w19_shopping",
      instance_id: "inst_shopping_weekly",
      skill_id: "shopping-planning",
      skill_version_hash: "sha256:9a3b…f2",
      status: "completed",
      outcome: "accepted",
      started_at: "2026-05-04T10:00:01Z",
      completed_at: "2026-05-04T10:00:18Z",
      tool_call_count: 3,
      policy_deny_count: 0,
      budget_tokens: 12410,
      budget_cost_usd: 0.011,
      tool_invocations: [
        { name: "inventory.snapshot.read", category: "read", trust: "trusted_graph", ms: 120 },
        { name: "purchase_history.recent.read", category: "read", trust: "trusted_graph", ms: 88 },
        { name: "preferences.diet.read", category: "read", trust: "trusted_graph", ms: 41 }
      ],
      policy_decisions: [],
      output_summary: "12 items · 1 re-suggested · 1 missing-data flag"
    },
    {
      id: "run_2026w18_shopping",
      instance_id: "inst_shopping_weekly",
      skill_id: "shopping-planning",
      skill_version_hash: "sha256:9a3b…f2",
      status: "completed",
      outcome: "accepted",
      started_at: "2026-04-27T10:00:00Z",
      completed_at: "2026-04-27T10:00:14Z",
      tool_call_count: 3,
      policy_deny_count: 0,
      budget_tokens: 11820,
      budget_cost_usd: 0.011,
      tool_invocations: [
        { name: "inventory.snapshot.read", category: "read", trust: "trusted_graph", ms: 110 },
        { name: "purchase_history.recent.read", category: "read", trust: "trusted_graph", ms: 95 },
        { name: "preferences.diet.read", category: "read", trust: "trusted_graph", ms: 38 }
      ],
      policy_decisions: [],
      output_summary: "9 items · 0 re-suggested"
    },
    {
      id: "run_2026w17_shopping",
      instance_id: "inst_shopping_weekly",
      skill_id: "shopping-planning",
      skill_version_hash: "sha256:9a3b…f2",
      status: "completed",
      outcome: "dismissed",
      started_at: "2026-04-20T10:00:00Z",
      completed_at: "2026-04-20T10:00:16Z",
      tool_call_count: 3,
      policy_deny_count: 1,
      budget_tokens: 12030,
      budget_cost_usd: 0.011,
      tool_invocations: [
        { name: "inventory.snapshot.read", category: "read", trust: "trusted_graph", ms: 102 },
        { name: "purchase_history.recent.read", category: "read", trust: "trusted_graph", ms: 91 }
      ],
      policy_decisions: [
        {
          tool: "web_fetch",
          decision: "deny",
          reason: "forbidden_action — shopping-planning has trust_class trusted_graph; web_fetch disallowed"
        }
      ],
      output_summary: "8 items · user dismissed (отложил неделю)"
    }
  ],
  inst_hn_morning: [
    {
      id: "run_today_hn",
      instance_id: "inst_hn_morning",
      skill_id: "web-digest",
      skill_version_hash: "sha256:41c0…8d",
      status: "completed",
      outcome: "pending",
      started_at: "2026-05-11T09:00:00Z",
      completed_at: "2026-05-11T09:00:42Z",
      tool_call_count: 6,
      policy_deny_count: 0,
      budget_tokens: 38200,
      budget_cost_usd: 0.041,
      tool_invocations: [
        { name: "web_fetch (news.ycombinator.com)", category: "web_fetch", trust: "untrusted_web", ms: 210 },
        { name: "web_fetch (page=2)", category: "web_fetch", trust: "untrusted_web", ms: 188 }
      ],
      policy_decisions: [],
      output_summary: "Top 5 stories · summary за день · 2 pages"
    }
  ]
};

export const useAssistantRunsStore = defineStore("void-assistant-runs", () => {
  const runsByInstance = ref({});
  const currentRun = ref(null);
  const loading = ref(false);
  const status = ref("");

  const runsForInstance = (instanceId) => runsByInstance.value[instanceId] || [];

  const loadRunsForInstance = async (instanceId, { force = false } = {}) => {
    if (!force && runsByInstance.value[instanceId]) return;
    loading.value = true;
    status.value = "";
    try {
      // TODO Wave 6: GET /assistant/contract-instances/:id/runs
      await new Promise((resolve) => setTimeout(resolve, 60));
      const raw = MOCK_RUNS[instanceId] || [];
      runsByInstance.value = {
        ...runsByInstance.value,
        [instanceId]: raw.map(normalizeRun)
      };
    } catch (error) {
      console.error("void-assistant-runs: load failed", error);
      status.value = String(error?.message || "Failed to load runs");
    } finally {
      loading.value = false;
    }
  };

  const loadRun = async (instanceId, runId) => {
    loading.value = true;
    status.value = "";
    try {
      // TODO Wave 6: GET /assistant/contract-instances/:instanceId/runs/:runId
      await new Promise((resolve) => setTimeout(resolve, 60));
      const list = MOCK_RUNS[instanceId] || [];
      const found = list.find((r) => r.id === runId);
      currentRun.value = found ? normalizeRun(found) : null;
    } catch (error) {
      console.error("void-assistant-runs: load detail failed", error);
      status.value = String(error?.message || "Failed to load run");
      currentRun.value = null;
    } finally {
      loading.value = false;
    }
  };

  const clearCurrentRun = () => {
    currentRun.value = null;
  };

  return {
    runsByInstance,
    currentRun,
    loading,
    status,
    runsForInstance,
    loadRunsForInstance,
    loadRun,
    clearCurrentRun
  };
});

function normalizeRun(raw) {
  return {
    id: String(raw.id),
    instance_id: String(raw.instance_id),
    skill_id: String(raw.skill_id),
    skill_version_hash: String(raw.skill_version_hash || ""),
    status: String(raw.status || "completed"),
    outcome: raw.outcome ? String(raw.outcome) : null,
    started_at: String(raw.started_at || ""),
    completed_at: raw.completed_at ? String(raw.completed_at) : null,
    tool_call_count: Number(raw.tool_call_count ?? 0),
    policy_deny_count: Number(raw.policy_deny_count ?? 0),
    budget_tokens: Number(raw.budget_tokens ?? 0),
    budget_cost_usd: Number(raw.budget_cost_usd ?? 0),
    tool_invocations: Array.isArray(raw.tool_invocations) ? [...raw.tool_invocations] : [],
    policy_decisions: Array.isArray(raw.policy_decisions) ? [...raw.policy_decisions] : [],
    output_summary: String(raw.output_summary || "")
  };
}
