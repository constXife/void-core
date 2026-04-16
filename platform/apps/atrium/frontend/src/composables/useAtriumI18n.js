import { computed, ref } from "vue";
import { FALLBACK_LANG, LANG_STORAGE_KEY, MESSAGES } from "../atrium-config.js";
import { marked } from "../lib/atrium-markdown.js";

const normalizeLang = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const base = raw.split(/[_-]/)[0];
  return ["en", "ru"].includes(base) ? base : "";
};

export function useAtriumI18n({
  actualRole,
  authEnabled,
  currentSpace,
  isKioskMode,
  me,
  parseDisplayConfig,
  privacyDocuments,
  settingsStore
}) {
  const languageLabels = {
    en: "English",
    ru: "Русский"
  };

  const supportedLangs = computed(() => {
    const cfg = parseDisplayConfig(currentSpace.value);
    const raw = Array.isArray(cfg.supported_langs) ? cfg.supported_langs : [];
    const normalized = raw.map(normalizeLang).filter(Boolean);
    if (normalized.length > 0) return [...new Set(normalized)];
    return ["en", "ru"];
  });

  const languageSwitcherMode = computed(() => {
    const cfg = parseDisplayConfig(currentSpace.value);
    const mode = typeof cfg.language_switcher === "string" ? cfg.language_switcher : "";
    if (["off", "header", "settings"].includes(mode)) return mode;
    if (isKioskMode.value) return "off";
    if (!authEnabled.value || !me.value || actualRole.value === "guest") return "header";
    return "settings";
  });

  const languageSwitcherVisible = computed(
    () => supportedLangs.value.length > 1 && languageSwitcherMode.value !== "off"
  );

  const currentLang = ref(FALLBACK_LANG);

  const getLangFromUrl = () => normalizeLang(new URLSearchParams(window.location.search).get("lang"));
  const getStoredLang = () =>
    normalizeLang(settingsStore.getCurrentSpaceJSON("lang", "", LANG_STORAGE_KEY));
  const getSpaceDefaultLang = () => normalizeLang(parseDisplayConfig(currentSpace.value).default_lang);

  const resolveLang = () => {
    const supported = supportedLangs.value;
    const isSupported = (value) => value && supported.includes(value);
    const candidates = [
      getLangFromUrl(),
      getStoredLang(),
      getSpaceDefaultLang()
    ];
    for (const candidate of candidates) {
      if (isSupported(candidate)) return candidate;
    }
    if (supported.includes(FALLBACK_LANG)) return FALLBACK_LANG;
    return supported[0] || FALLBACK_LANG;
  };

  const setLang = (lang, persist = true) => {
    const normalized = normalizeLang(lang);
    if (!normalized) return;
    if (!supportedLangs.value.includes(normalized)) return;
    currentLang.value = normalized;
    if (persist) settingsStore.setCurrentSpaceJSON("lang", normalized, LANG_STORAGE_KEY);
  };

  const languageSelection = computed({
    get() {
      return currentLang.value;
    },
    set(value) {
      setLang(value, true);
    }
  });

  const syncLangFromContext = () => {
    const resolved = resolveLang();
    if (currentLang.value !== resolved) {
      currentLang.value = resolved;
    }
  };

  const t = (key, vars = {}) => {
    const messages = MESSAGES[currentLang.value] || MESSAGES[FALLBACK_LANG] || {};
    const fallback = MESSAGES[FALLBACK_LANG] || {};
    const template = messages[key] || fallback[key] || key;
    return template.replace(/\{(\w+)\}/g, (match, varKey) => {
      if (Object.prototype.hasOwnProperty.call(vars, varKey)) {
        return String(vars[varKey]);
      }
      return match;
    });
  };

  const privacyDocumentHtml = computed(() =>
    marked.parse(privacyDocuments[currentLang.value] || privacyDocuments[FALLBACK_LANG] || "")
  );

  return {
    currentLang,
    languageLabels,
    languageSelection,
    languageSwitcherMode,
    languageSwitcherVisible,
    privacyDocumentHtml,
    setLang,
    supportedLangs,
    syncLangFromContext,
    t
  };
}
