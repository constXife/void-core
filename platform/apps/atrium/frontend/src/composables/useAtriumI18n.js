import { computed, ref, watch } from "vue";
import { FALLBACK_LANG, LANG_STORAGE_KEY, MESSAGES } from "../atrium-config.js";
import { renderMarkdown } from "../lib/atrium-markdown.js";
import {
  PLATFORM_LANGUAGE_IDS,
  normalizePlatformLang,
  resolvePlatformDirection,
  resolvePlatformLocale,
  resolveSupportedPlatformLangs
} from "../platform/i18n/index.js";

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
  const languageLabels = Object.fromEntries(
    PLATFORM_LANGUAGE_IDS.map((lang) => [
      lang,
      lang === "ru" ? "Русский" : "English"
    ])
  );

  const supportedLangs = computed(() => {
    const cfg = parseDisplayConfig(currentSpace.value);
    return resolveSupportedPlatformLangs(cfg.supported_langs, FALLBACK_LANG);
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

  const getLangFromUrl = () => normalizePlatformLang(new URLSearchParams(window.location.search).get("lang"));
  const getStoredLang = () =>
    normalizePlatformLang(settingsStore.getCurrentSpaceJSON("lang", "", LANG_STORAGE_KEY));
  const getSpaceDefaultLang = () => normalizePlatformLang(parseDisplayConfig(currentSpace.value).default_lang);

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
    const normalized = normalizePlatformLang(lang);
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

  const currentLocale = computed(() => resolvePlatformLocale(currentLang.value, FALLBACK_LANG));
  const currentDirection = computed(() => resolvePlatformDirection(currentLang.value, FALLBACK_LANG));

  watch([currentLang, currentLocale, currentDirection], ([lang, locale, direction]) => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
    document.documentElement.setAttribute("data-lang", lang);
  }, { immediate: true });

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
    renderMarkdown(privacyDocuments[currentLang.value] || privacyDocuments[FALLBACK_LANG] || "")
  );

  return {
    currentLang,
    languageLabels,
    languageSelection,
    languageSwitcherMode,
    languageSwitcherVisible,
    currentLocale,
    privacyDocumentHtml,
    setLang,
    supportedLangs,
    syncLangFromContext,
    t
  };
}
