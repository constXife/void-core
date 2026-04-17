import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { createI18n } from "./i18n.js";

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
  fallbackLang = "ru",
  langStorageKey = "void:lang",
  themeStorageKey = "void:theme"
}) {
  const route = useRoute();
  const { currentLang, t, setLang, initLang, persistLang } = createI18n(messages, fallbackLang);

  initLang(langStorageKey);

  const isLoginRoute = computed(() => route.name === loginRouteName);
  const languageLabels = computed(() => ({
    en: t("language.en"),
    ru: t("language.ru")
  }));
  const theme = ref(readThemePreference(themeStorageKey));
  const resolvedTheme = computed(() => resolveTheme(theme.value));
  const locale = computed(() => currentLang.value === "ru" ? "ru-RU" : "en-US");
  const domain = resolveDomain();

  watch([theme, resolvedTheme], ([value, resolved]) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(themeStorageKey, value);
    }
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", resolved);
    }
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
    domain,
    isLoginRoute,
    languageLabels,
    applyLang,
    setTheme,
    logout
  };
}
