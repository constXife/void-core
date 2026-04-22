import { ref } from "vue";
import {
  PLATFORM_FALLBACK_LANG,
  normalizePlatformLang,
  resolveSupportedPlatformLangs
} from "./i18n/index.js";

export function mergeMessages(...sources) {
  const result = {};
  for (const source of sources) {
    for (const lang of Object.keys(source)) {
      result[lang] = { ...result[lang], ...source[lang] };
    }
  }
  return result;
}

export function createI18n(messages, options = {}) {
  const resolvedOptions = typeof options === "string"
    ? { fallbackLang: options }
    : options;
  const fallbackLang = normalizePlatformLang(resolvedOptions.fallbackLang)
    || PLATFORM_FALLBACK_LANG;
  const supportedLangs = resolveSupportedPlatformLangs(
    resolvedOptions.supportedLangs || Object.keys(messages),
    fallbackLang
  );
  const isSupportedLang = (value) => supportedLangs.includes(value);
  const currentLang = ref(
    isSupportedLang(fallbackLang) ? fallbackLang : supportedLangs[0] || fallbackLang
  );

  const t = (key, vars = {}) => {
    const msgs = messages[currentLang.value] || messages[fallbackLang] || {};
    const fallback = messages[fallbackLang] || {};
    const template = msgs[key] || fallback[key] || key;
    return template.replace(/\{(\w+)\}/g, (match, varKey) => {
      if (Object.prototype.hasOwnProperty.call(vars, varKey)) {
        return String(vars[varKey]);
      }
      return match;
    });
  };

  const setLang = (lang) => {
    const normalized = normalizePlatformLang(lang);
    if (normalized && isSupportedLang(normalized)) currentLang.value = normalized;
  };

  const resolveLangFromUrl = () => {
    if (typeof window === "undefined") return "";
    const normalized = normalizePlatformLang(new URLSearchParams(window.location.search).get("lang"));
    return isSupportedLang(normalized) ? normalized : "";
  };

  const resolveLangFromStorage = (storageKey = "void:lang") => {
    if (typeof localStorage === "undefined") return "";
    const normalized = normalizePlatformLang(localStorage.getItem(storageKey) || "");
    return isSupportedLang(normalized) ? normalized : "";
  };

  const initLang = (storageKey = "void:lang") => {
    const fromUrl = resolveLangFromUrl();
    if (fromUrl) { currentLang.value = fromUrl; return; }
    const fromStorage = resolveLangFromStorage(storageKey);
    if (fromStorage) { currentLang.value = fromStorage; return; }
  };

  const persistLang = (storageKey = "void:lang") => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, currentLang.value);
    }
  };

  return { currentLang, t, setLang, initLang, persistLang };
}
