export async function loadWorkspaceProducts(workspacePath, lang) {
  const response = await fetch(workspacePath, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Failed to load Atrium workspace product catalog: ${response.status}`);
  }
  const payload = await response.json();
  return productsFromWorkspace(payload, lang);
}

export function productsFromWorkspace(payload, lang) {
  const entries = payload?.workspace?.current_space?.entries?.items;
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry?.classification === "official-product")
    .sort((left, right) => Number(left?.order || 0) - Number(right?.order || 0))
    .map((entry) => {
      const key = String(entry?.key || entry?.resource || "").trim().toLowerCase();
      if (!key) return null;
      return {
        key,
        accent: key[0]?.toUpperCase() || "?",
        href: String(entry?.url || "").trim(),
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
