import {
  PLATFORM_FALLBACK_LANG,
  PLATFORM_LOCALES,
  normalizePlatformLang,
  resolvePlatformLocale
} from "./locales.js";

const translationValue = (translations, key) => {
  if (!translations || !key) return "";
  const direct = translations[key];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const lowerKey = key.toLowerCase();
  for (const [candidate, value] of Object.entries(translations)) {
    if (candidate.toLowerCase() !== lowerKey) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const candidateTranslationKeys = (lang, locale, fallbackLang) => {
  const resolvedFallback = normalizePlatformLang(fallbackLang) || PLATFORM_FALLBACK_LANG;
  const resolvedLang = normalizePlatformLang(lang) || resolvedFallback;
  const resolvedLocale = String(locale || resolvePlatformLocale(resolvedLang, resolvedFallback)).trim();
  const keys = [];
  const add = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized || keys.includes(normalized)) return;
    keys.push(normalized);
  };

  add(resolvedLocale);
  add(resolvedLocale.toLowerCase());

  if (resolvedLocale.includes("-")) {
    const base = resolvedLocale.split("-")[0];
    add(base);
    add(base.toLowerCase());
  }

  add(resolvedLang);

  for (const fallback of PLATFORM_LOCALES[resolvedLang]?.fallbacks ?? []) {
    add(fallback);
    add(resolvePlatformLocale(fallback, resolvedFallback));
  }

  add(resolvedFallback);
  add(resolvePlatformLocale(resolvedFallback, resolvedFallback));

  return keys;
};

export const resolveLocalizedText = (
  input,
  {
    lang,
    locale,
    fallbackLang = PLATFORM_FALLBACK_LANG,
    defaultValue = ""
  } = {}
) => {
  const candidates = candidateTranslationKeys(lang, locale, fallbackLang);
  for (const candidate of candidates) {
    const resolved = translationValue(input?.translations, candidate);
    if (resolved) return resolved;
  }

  const key = String(input?.key || "").trim();
  if (key) return key;

  return defaultValue;
};

export const resolveLocalizedField = (
  record,
  field,
  {
    lang,
    locale,
    fallbackLang = PLATFORM_FALLBACK_LANG,
    defaultValue = ""
  } = {}
) =>
  resolveLocalizedText(record?.[field], {
    lang,
    locale: locale || resolvePlatformLocale(lang, fallbackLang),
    fallbackLang,
    defaultValue
  });
