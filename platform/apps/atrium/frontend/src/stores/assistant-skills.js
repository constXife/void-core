import { computed, ref } from "vue";
import { defineStore } from "pinia";

// TODO Wave 6: replace with GET /assistant/skills
// Per ASSISTANT_SURFACE_STRUCTURE.md D10 — fixture inline, без отдельной директории.
const MOCK_SKILLS = [
  {
    id: "shopping-planning",
    version: 1,
    stage: 1,
    trust_class: "trusted_graph",
    domain: "inventory",
    output_kind: "suggestion",
    description:
      "Анализирует pantry, историю покупок и предпочтения в Inventory, чтобы предложить список покупок. Reads only — никаких external sources. Output — suggestion, требует review перед canonical write.",
    reads: ["inventory.snapshot.read", "purchase_history.recent.read"],
    writes: ["shopping_planning_run.suggested.v1"],
    forbidden: ["web_fetch", "actuator", "external_mcp"],
    eval_hash: "9a3b…f2",
    eval_passed: true,
    templates: [
      {
        id: "weekly-shopping-run",
        name: "Weekly shopping run",
        trigger_kind: "schedule",
        trigger_label: "sunday 10:00 · suggestion_only",
        enabled_instance_id: "inst_shopping_weekly"
      },
      {
        id: "pre-trip-shopping",
        name: "Pre-trip shopping list",
        trigger_kind: "event",
        trigger_label: "calendar.travel_planned · suggestion_only",
        enabled_instance_id: null
      }
    ]
  },
  {
    id: "web-digest",
    version: 1,
    stage: 2,
    trust_class: "untrusted_web",
    domain: "web",
    output_kind: "digest",
    description:
      "Читает curated web source (HackerNews, RSS, etc), вытаскивает топовые статьи и summary комментариев. Output — proposed digest article в Kadath Layer 2, ничего canonical не пишет. EvidenceRef со excerpt_hash хранится для re-fetch.",
    reads: ["web_fetch", "web_search (curated allowlist)"],
    writes: ["digest_article.draft.v1"],
    forbidden: ["canonical_write", "actuator", "open_web"],
    eval_hash: "41c0…8d",
    eval_passed: true,
    templates: [
      {
        id: "hackernews-morning-digest",
        name: "Morning HackerNews digest",
        trigger_kind: "schedule",
        trigger_label: "daily 09:00 · 2 pages · summarize comments",
        enabled_instance_id: "inst_hn_morning"
      },
      {
        id: "rss-weekly-roundup",
        name: "Weekly RSS roundup",
        trigger_kind: "schedule",
        trigger_label: "saturday 11:00 · custom feeds",
        enabled_instance_id: null
      }
    ]
  },
  {
    id: "meal-plan-from-pantry",
    version: 1,
    stage: 1,
    trust_class: "trusted_graph",
    domain: "inventory",
    output_kind: "suggestion",
    description:
      "По pantry и предпочтениям предлагает 5–7 блюд на неделю. Output — proposed meal_plan article. Не пишет в shopping list напрямую — только suggestion для review.",
    reads: ["inventory.snapshot.read", "preferences.diet.read"],
    writes: ["meal_plan.suggested.v1"],
    forbidden: ["web_fetch", "actuator"],
    eval_hash: "7e21…03",
    eval_passed: true,
    templates: [
      {
        id: "weekly-meal-plan",
        name: "Weekly meal plan",
        trigger_kind: "schedule",
        trigger_label: "sunday 09:00 · suggestion_only",
        enabled_instance_id: null
      }
    ]
  },
  {
    id: "finance-monthly-summary",
    version: 1,
    stage: 1,
    trust_class: "trusted_graph",
    domain: "finance",
    output_kind: "digest",
    description:
      "Аггрегирует транзакции за месяц, считает категории, сравнивает с прошлым периодом, флагит outliers. Read-only над finance graph view.",
    reads: ["finance.transactions.month.read", "finance.categories.read"],
    writes: ["finance_summary.report.v1"],
    forbidden: ["web_fetch", "actuator"],
    eval_hash: "0d12…aa",
    eval_passed: true,
    templates: [
      {
        id: "end-of-month-summary",
        name: "End-of-month summary",
        trigger_kind: "schedule",
        trigger_label: "last day of month 18:00",
        enabled_instance_id: "inst_finance_eom"
      }
    ]
  },
  {
    id: "web-research-summary",
    version: 1,
    stage: 2,
    trust_class: "untrusted_web",
    domain: "web",
    output_kind: "suggestion",
    description:
      "Ad-hoc skill: «изучи тему X в N источниках, дай summary с цитатами и EvidenceRef». Запускается из chat, обычно без сохранения как routine (но можно).",
    reads: ["web_search", "web_fetch"],
    writes: ["research_summary.draft.v1"],
    forbidden: ["canonical_write", "actuator"],
    eval_hash: "b58e…f1",
    eval_passed: true,
    templates: []
  }
];

export const useAssistantSkillsStore = defineStore("void-assistant-skills", () => {
  const skills = ref([]);
  const loaded = ref(false);
  const loading = ref(false);
  const status = ref("");

  // Wave 1 фильтры — null означает "все".
  const filters = ref({
    stage: null,
    domain: null,
    output_kind: null,
    trust_class: null
  });

  const skillsCount = computed(() => skills.value.length);

  const filteredSkills = computed(() => {
    const f = filters.value;
    return skills.value.filter((skill) => {
      if (f.stage !== null && skill.stage !== f.stage) return false;
      if (f.domain !== null && skill.domain !== f.domain) return false;
      if (f.output_kind !== null && skill.output_kind !== f.output_kind) return false;
      if (f.trust_class !== null && skill.trust_class !== f.trust_class) return false;
      return true;
    });
  });

  // Per D4 — trust_class filter появляется только если в каталоге >1 distinct значение.
  const availableTrustClasses = computed(() => {
    const set = new Set();
    skills.value.forEach((skill) => set.add(skill.trust_class));
    return set;
  });

  const skillById = (id) => skills.value.find((skill) => skill.id === id) || null;

  const loadSkills = async ({ force = false } = {}) => {
    if (loaded.value && !force) return;
    loading.value = true;
    status.value = "";
    try {
      // TODO Wave 6: GET /assistant/skills
      await new Promise((resolve) => setTimeout(resolve, 80));
      skills.value = MOCK_SKILLS.map(normalizeSkill);
      loaded.value = true;
    } catch (error) {
      console.error("void-assistant-skills: load failed", error);
      status.value = String(error?.message || "Failed to load skills");
    } finally {
      loading.value = false;
    }
  };

  const setFilter = (key, value) => {
    if (!(key in filters.value)) return;
    filters.value = { ...filters.value, [key]: value };
  };

  const resetFilters = () => {
    filters.value = { stage: null, domain: null, output_kind: null, trust_class: null };
  };

  return {
    skills,
    skillsCount,
    filteredSkills,
    availableTrustClasses,
    filters,
    loaded,
    loading,
    status,
    loadSkills,
    setFilter,
    resetFilters,
    skillById
  };
});

function normalizeSkill(raw) {
  return {
    id: String(raw.id),
    version: Number(raw.version ?? 1),
    stage: Number(raw.stage ?? 1),
    trust_class: String(raw.trust_class || "trusted_graph"),
    domain: String(raw.domain || "general"),
    output_kind: String(raw.output_kind || "suggestion"),
    description: String(raw.description || ""),
    reads: Array.isArray(raw.reads) ? [...raw.reads] : [],
    writes: Array.isArray(raw.writes) ? [...raw.writes] : [],
    forbidden: Array.isArray(raw.forbidden) ? [...raw.forbidden] : [],
    eval_hash: String(raw.eval_hash || ""),
    eval_passed: Boolean(raw.eval_passed),
    templates: Array.isArray(raw.templates) ? raw.templates.map(normalizeTemplate) : []
  };
}

function normalizeTemplate(raw) {
  return {
    id: String(raw.id),
    name: String(raw.name || raw.id),
    trigger_kind: String(raw.trigger_kind || "schedule"),
    trigger_label: String(raw.trigger_label || ""),
    enabled_instance_id: raw.enabled_instance_id ? String(raw.enabled_instance_id) : null
  };
}
