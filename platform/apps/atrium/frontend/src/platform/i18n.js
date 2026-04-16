import { ref } from "vue";

const normalizeLang = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const base = raw.split(/[_-]/)[0];
  return ["en", "ru"].includes(base) ? base : "";
};

export function mergeMessages(...sources) {
  const result = {};
  for (const source of sources) {
    for (const lang of Object.keys(source)) {
      result[lang] = { ...result[lang], ...source[lang] };
    }
  }
  return result;
}

export function createI18n(messages, fallbackLang = "ru") {
  const currentLang = ref(fallbackLang);

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
    const normalized = normalizeLang(lang);
    if (normalized) currentLang.value = normalized;
  };

  const resolveLangFromUrl = () => {
    if (typeof window === "undefined") return "";
    return normalizeLang(new URLSearchParams(window.location.search).get("lang"));
  };

  const resolveLangFromStorage = (storageKey = "void:lang") => {
    if (typeof localStorage === "undefined") return "";
    return normalizeLang(localStorage.getItem(storageKey) || "");
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
