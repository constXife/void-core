import { computed, ref } from "vue";
import { defineStore } from "pinia";

const SKILLS_URL = "/assistant/skills";

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
      const response = await fetch(SKILLS_URL, { credentials: "same-origin" });
      if (!response.ok) {
        throw new Error(`Assistant skills request failed: HTTP ${response.status}`);
      }
      const payload = await response.json();
      if (!Array.isArray(payload.skills)) {
        throw new Error("Assistant skills response must include skills array");
      }
      skills.value = payload.skills.map(normalizeSkill);
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
  const localized = selectLocalizedSkillText(raw);
  return {
    id: String(raw.id),
    display_name: localized.displayName,
    version: Number(raw.version ?? 1),
    stage: Number(raw.stage ?? 1),
    trust_class: String(raw.trust_class || "trusted_graph"),
    domain: String(raw.domain || "general"),
    output_kind: String(raw.output_kind || "suggestion"),
    description: localized.description,
    locales: normalizeSkillLocales(raw.locales),
    reads: Array.isArray(raw.reads) ? [...raw.reads] : [],
    writes: Array.isArray(raw.writes) ? [...raw.writes] : [],
    forbidden: Array.isArray(raw.forbidden) ? [...raw.forbidden] : [],
    eval_hash: String(raw.eval_hash || ""),
    eval_passed: Boolean(raw.eval_passed),
    templates: Array.isArray(raw.templates) ? raw.templates.map(normalizeTemplate) : []
  };
}

function selectLocalizedSkillText(raw) {
  const locales = normalizeSkillLocales(raw.locales);
  const locale = preferredSkillLocale();
  const text = locales[locale] || locales.en || {};
  return {
    displayName: String(text.display_name || raw.display_name || raw.id),
    description: String(text.description || raw.description || "")
  };
}

function normalizeSkillLocales(rawLocales) {
  if (!rawLocales || typeof rawLocales !== "object") return {};
  return Object.fromEntries(
    Object.entries(rawLocales).map(([locale, text]) => [
      String(locale),
      {
        display_name: String(text?.display_name || ""),
        description: String(text?.description || "")
      }
    ])
  );
}

function preferredSkillLocale() {
  const nav = globalThis.navigator;
  const languages = Array.isArray(nav?.languages) && nav.languages.length
    ? nav.languages
    : [nav?.language || "en"];
  return languages.some((language) => String(language).toLowerCase().startsWith("ru"))
    ? "ru"
    : "en";
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
