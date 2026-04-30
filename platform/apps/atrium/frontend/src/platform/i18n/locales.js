export const PLATFORM_FALLBACK_LANG = "en";

export const PLATFORM_LOCALES = Object.freeze({
  ru: Object.freeze({
    id: "ru",
    label: "Русский",
    locale: "ru-RU",
    direction: "ltr",
    fallbacks: []
  }),
  en: Object.freeze({
    id: "en",
    label: "English",
    locale: "en-US",
    direction: "ltr",
    fallbacks: []
  })
});

export const PLATFORM_LANGUAGE_IDS = Object.freeze(Object.keys(PLATFORM_LOCALES));

export const normalizePlatformLang = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const base = raw.split(/[_-]/)[0];
  return PLATFORM_LANGUAGE_IDS.includes(base) ? base : "";
};

export const resolveSupportedPlatformLangs = (
  values,
  fallbackLang = PLATFORM_FALLBACK_LANG
) => {
  const normalized = Array.isArray(values)
    ? values.map((value) => normalizePlatformLang(value)).filter(Boolean)
    : [];
  if (normalized.length > 0) {
    return [...new Set(normalized)];
  }
  const fallback = normalizePlatformLang(fallbackLang) || PLATFORM_FALLBACK_LANG;
  return PLATFORM_LANGUAGE_IDS.includes(fallback)
    ? [fallback, ...PLATFORM_LANGUAGE_IDS.filter((lang) => lang !== fallback)]
    : [...PLATFORM_LANGUAGE_IDS];
};

export const resolvePlatformLocale = (
  lang,
  fallbackLang = PLATFORM_FALLBACK_LANG
) => {
  const resolvedLang = normalizePlatformLang(lang)
    || normalizePlatformLang(fallbackLang)
    || PLATFORM_FALLBACK_LANG;
  return PLATFORM_LOCALES[resolvedLang]?.locale || PLATFORM_LOCALES[PLATFORM_FALLBACK_LANG].locale;
};

export const resolvePlatformDirection = (
  lang,
  fallbackLang = PLATFORM_FALLBACK_LANG
) => {
  const resolvedLang = normalizePlatformLang(lang)
    || normalizePlatformLang(fallbackLang)
    || PLATFORM_FALLBACK_LANG;
  return PLATFORM_LOCALES[resolvedLang]?.direction || "ltr";
};

export const resolvePlatformLanguageLabel = (lang) => {
  const resolvedLang = normalizePlatformLang(lang);
  return PLATFORM_LOCALES[resolvedLang]?.label || String(lang || "").trim();
};
