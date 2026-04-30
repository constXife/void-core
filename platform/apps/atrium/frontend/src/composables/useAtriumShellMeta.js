import { computed } from "vue";

const ADMIN_TAB_TITLES = {
  overview: "admin.title.overview",
  spaces: "admin.title.spaces",
  members: "admin.title.members",
  content: "admin.title.content",
  dashboard: "admin.title.dashboard"
};

const ADMIN_TAB_SUBTITLES = {
  overview: "admin.subtitle.overview",
  spaces: "admin.subtitle.spaces",
  members: "admin.subtitle.members",
  content: "admin.subtitle.content",
  dashboard: "admin.subtitle.dashboard"
};

export const spacePublicEntry = (space) => {
  const raw = space?.public_entry;
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const spaceDescription = (space) => {
  const publicEntry = spacePublicEntry(space);
  if (publicEntry?.subtitle) return publicEntry.subtitle;
  if (space?.description) return space.description;
  return "";
};

export const spacePublicTitle = (space) => {
  const publicEntry = spacePublicEntry(space);
  if (publicEntry?.title) return publicEntry.title;
  return space?.title || "";
};

export const spacePublicHelp = (space) => {
  const publicEntry = spacePublicEntry(space);
  if (publicEntry?.help) return publicEntry.help;
  if (publicEntry?.contact) return publicEntry.contact;
  return "";
};

export function usePublicShellMeta(spaces) {
  const guestFocusSpace = computed(() => {
    if (spaces.value.length === 0) return null;
    return spaces.value.find((space) => space.is_default_public_entry) || spaces.value[0] || null;
  });

  return {
    guestFocusSpace
  };
}

export function useAdminMeta(adminTab, t) {
  const adminTitle = computed(() => t(ADMIN_TAB_TITLES[adminTab.value] || "admin.title.overview"));
  const adminSubtitle = computed(() => t(ADMIN_TAB_SUBTITLES[adminTab.value] || "admin.subtitle.overview"));

  return {
    adminTitle,
    adminSubtitle
  };
}
