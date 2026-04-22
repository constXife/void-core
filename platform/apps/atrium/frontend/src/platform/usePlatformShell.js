import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { createI18n } from "./i18n.js";
import {
  PLATFORM_FALLBACK_LANG,
  resolvePlatformDirection,
  resolvePlatformLocale,
  resolveSupportedPlatformLangs
} from "./i18n/index.js";

const THEME_MODES = new Set(["dark", "light", "auto"]);

const readThemePreference = (storageKey) => {
  if (typeof localStorage === "undefined") return "dark";
  const value = String(localStorage.getItem(storageKey) || "").trim().toLowerCase();
  return THEME_MODES.has(value) ? value : "dark";
};

const resolveTheme = (mode) => {
  if (mode !== "auto") return mode;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const resolveDomain = () => {
  if (typeof window === "undefined") return "";
  const parts = window.location.hostname.split(".");
  return parts.length > 1 ? parts.slice(1).join(".") : "";
};

export function usePlatformShell({
  messages,
  loginRouteName,
  fallbackLang = PLATFORM_FALLBACK_LANG,
  supportedLangs,
  langStorageKey = "void:lang",
  themeStorageKey = "void:theme"
}) {
  const route = useRoute();
  const languageOptions = resolveSupportedPlatformLangs(
    supportedLangs || Object.keys(messages),
    fallbackLang
  );
  const { currentLang, t, setLang, initLang, persistLang } = createI18n(messages, {
    fallbackLang,
    supportedLangs: languageOptions
  });

  initLang(langStorageKey);

  const isLoginRoute = computed(() => route.name === loginRouteName);
  const languageLabels = computed(() =>
    Object.fromEntries(languageOptions.map((lang) => [lang, t(`language.${lang}`)]))
  );
  const theme = ref(readThemePreference(themeStorageKey));
  const resolvedTheme = computed(() => resolveTheme(theme.value));
  const locale = computed(() => resolvePlatformLocale(currentLang.value, fallbackLang));
  const direction = computed(() => resolvePlatformDirection(currentLang.value, fallbackLang));
  const domain = resolveDomain();

  watch([theme, resolvedTheme], ([value, resolved]) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(themeStorageKey, value);
    }
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", resolved);
    }
  }, { immediate: true });

  watch([currentLang, locale, direction], ([lang, nextLocale, nextDirection]) => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextDirection;
    document.documentElement.setAttribute("data-lang", lang);
  }, { immediate: true });

  const applyLang = (lang) => {
    setLang(lang);
    persistLang(langStorageKey);
  };

  const setTheme = (value) => {
    theme.value = value;
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      window.location.assign("/auth/logout");
    }
  };

  return {
    currentLang,
    t,
    theme,
    locale,
    direction,
    domain,
    isLoginRoute,
    languageOptions,
    languageLabels,
    applyLang,
    setTheme,
    logout
  };
}
