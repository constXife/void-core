import { computed, ref } from "vue";

const matchesSpaceQuery = (space, query) => {
  const value = String(query || "").trim().toLowerCase();
  if (!value) return true;
  const hay = [
    space?.title,
    space?.slug,
    space?.description,
    space?.display_config?.description
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(value);
};

export function useAtriumSpacePicker({
  isKioskMode,
  pinnedSpaceIds,
  pinnedSpacesKey,
  recentSpaceIds,
  recentSpacesKey,
  scrollToIndex,
  settingsStore,
  spaceDescription,
  spaces
}) {
  const spacePickerOpen = ref(false);
  const spaceQuery = ref("");

  const filteredSpaces = computed(() =>
    spaces.value.filter((space) => matchesSpaceQuery(space, spaceQuery.value))
  );

  const spacesFromIds = (ids) => {
    const map = new Map(spaces.value.map((space) => [String(space.id), space]));
    return ids.map((id) => map.get(String(id))).filter(Boolean);
  };

  const spaceIconLabel = (space) => {
    if (!space) return "•";
    const icon = space?.display_config?.icon;
    if (icon) return icon;
    const title = String(space.title || "").trim();
    return title ? title[0].toUpperCase() : "•";
  };

  const spaceMetaLabel = (space) => {
    const type = space?.type ? String(space.type) : "";
    const desc = spaceDescription(space);
    if (type && desc) return `${type} • ${desc}`;
    return type || desc || "";
  };

  const spacePickerSections = computed(() => {
    if (spaces.value.length === 0) return [];
    const query = spaceQuery.value.trim();
    if (query) {
      return [{ label: "space.picker.results", items: filteredSpaces.value }];
    }
    const recents = spacesFromIds(recentSpaceIds.value);
    const pinned = spacesFromIds(pinnedSpaceIds.value);
    const seen = new Set([...recents, ...pinned].map((space) => String(space.id)));
    const all = spaces.value.filter((space) => !seen.has(String(space.id)));
    const sections = [];
    if (recents.length) sections.push({ label: "space.picker.recents", items: recents });
    if (pinned.length) sections.push({ label: "space.picker.pinned", items: pinned });
    sections.push({ label: "space.picker.all", items: all });
    return sections;
  });

  const closeSpacePicker = () => {
    spacePickerOpen.value = false;
  };

  const toggleSpacePicker = () => {
    if (isKioskMode.value || spaces.value.length <= 1) return;
    spacePickerOpen.value = !spacePickerOpen.value;
    if (spacePickerOpen.value) {
      spaceQuery.value = "";
    }
  };

  const selectSpace = (space) => {
    if (!space) return;
    const idx = spaces.value.findIndex((item) => item.id === space.id);
    if (idx >= 0) {
      scrollToIndex(idx, true);
    }
    closeSpacePicker();
  };

  const updateRecentSpaces = (spaceId) => {
    const id = String(spaceId || "");
    if (!id) return;
    const next = [id, ...recentSpaceIds.value.filter((item) => item !== id)];
    recentSpaceIds.value = next.slice(0, 5);
    settingsStore.setJSON(recentSpacesKey, recentSpaceIds.value);
  };

  const isPinnedSpace = (spaceId) =>
    pinnedSpaceIds.value.includes(String(spaceId));

  const togglePinnedSpace = (spaceId) => {
    const id = String(spaceId || "");
    if (!id) return;
    const next = isPinnedSpace(id)
      ? pinnedSpaceIds.value.filter((item) => item !== id)
      : [...pinnedSpaceIds.value, id];
    pinnedSpaceIds.value = next;
    settingsStore.setJSON(pinnedSpacesKey, next);
  };

  return {
    closeSpacePicker,
    isPinnedSpace,
    selectSpace,
    spaceIconLabel,
    spaceMetaLabel,
    spacePickerOpen,
    spacePickerSections,
    spaceQuery,
    togglePinnedSpace,
    toggleSpacePicker,
    updateRecentSpaces
  };
}
