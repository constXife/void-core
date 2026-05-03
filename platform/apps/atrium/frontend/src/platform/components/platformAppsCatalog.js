export async function loadProductCatalog(catalogPath, lang) {
  const response = await fetch(catalogPath, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(`Failed to load product catalog: ${response.status}`);
  }
  const payload = await response.json();
  return productsFromCatalog(payload, lang);
}

export function productsFromCatalog(payload, lang) {
  const entries = payload?.products;
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry?.classification === "official-product")
    .sort((left, right) => Number(left?.order || 0) - Number(right?.order || 0))
    .map((entry) => {
      const key = String(entry?.key || "").trim().toLowerCase();
      if (!key) return null;
      return {
        key,
        accent: key[0]?.toUpperCase() || "?",
        href: String(entry?.href || "").trim(),
        label: localizedText(entry?.title, lang) || key
      };
    })
    .filter(Boolean);
}

function localizedText(value, lang) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const translations = value.translations;
  if (translations && typeof translations === "object") {
    const localized = translations[lang];
    if (typeof localized === "string" && localized.trim()) return localized.trim();
    const english = translations.en;
    if (typeof english === "string" && english.trim()) return english.trim();
  }
  if (typeof value.key === "string") return value.key.trim();
  return "";
}
