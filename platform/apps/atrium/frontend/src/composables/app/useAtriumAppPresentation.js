import {
  spaceDescription as rawSpaceDescription,
  spacePublicHelp as rawSpacePublicHelp,
  spacePublicTitle as rawSpacePublicTitle
} from "../useAtriumShellMeta.js";
import { renderMarkdown } from "../../lib/atrium-markdown.js";
import { resolveLocalizedText } from "../../platform/i18n/index.js";

export const parseDisplayConfig = (space) => {
  const raw = space?.display_config;
  if (!raw) return {};
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
};

export const isKidsSpace = (space) =>
  space?.id === "kids" || space?.id === "home-kids" || space?.slug === "home-kids";

export const isAdminSpace = (space) =>
  space?.id === "admin" || space?.id === "home-admin" || space?.slug === "home-admin";

export const isPublicReadonlySpace = (space) =>
  String(space?.access_mode || "").toLowerCase() === "public_readonly";

export const gridClass = (space) => {
  switch (space.layout_mode) {
    case "hero":
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6";
    case "list":
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";
    default:
      return "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-4";
  }
};

export const formatNotifTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const widgetHtml = (content) => {
  if (!content) return "";
  return renderMarkdown(content);
};

export function useAtriumAppPresentationText({ currentLang, currentLocale }) {
  const localizedText = (value, defaultValue = "") =>
    resolveLocalizedText(value, {
      lang: currentLang.value,
      locale: currentLocale.value,
      defaultValue
    });

  const spaceTitle = (space) =>
    localizedText(rawSpacePublicTitle(space), String(space?.id || ""));
  const spaceDescription = (space) => localizedText(rawSpaceDescription(space));
  const spacePublicTitle = (space) => spaceTitle(space);
  const spacePublicHelp = (space) => localizedText(rawSpacePublicHelp(space));
  const resourceTitle = (item) =>
    localizedText(item?.title, String(item?.id || item?.resource_id || ""));
  const resourceDescription = (item) => localizedText(item?.description);

  return {
    localizedText,
    resourceDescription,
    resourceTitle,
    spaceDescription,
    spacePublicHelp,
    spacePublicTitle,
    spaceTitle
  };
}
