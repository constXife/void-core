import { PLATFORM_FALLBACK_LANG, resolvePlatformLocale } from "./locales.js";
import { resolveLocalizedText } from "./resolveLocalizedText.js";

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
