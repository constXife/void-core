import { computed, nextTick, ref, watch } from "vue";

export function useAtriumStageRuntime({
  getPerformanceMode,
  onRecentSpace,
  persistLastSpaceSlug,
  replaceRoute,
  scheduleBackgroundRefresh,
  setBackground,
  spaces
}) {
  const stageRef = ref(null);
  const currentIndex = ref(0);
  const pendingScrollIndex = ref(null);
  const pinnedSpacesKey = "atrium:pinned-spaces";
  const recentSpacesKey = "atrium:recent-spaces";
  const recentResourcesKey = "atrium:recent-resources";
  const lastSpaceSlugKey = "atrium:last-space";

  const scrollLock = ref(false);
  const initialScrollDone = ref(false);
  const pinnedSpaceIds = ref([]);
  const recentSpaceIds = ref([]);
  const recentResourcesBySpace = ref({});
  const lastSpaceSlug = ref("");

  let scrollLockTimer = null;

  const currentSpace = computed(() => spaces.value[currentIndex.value] || null);
  const prevSpace = computed(() => {
    const idx = currentIndex.value - 1;
    if (idx < 0) return null;
    return spaces.value[idx] || null;
  });
  const nextSpace = computed(() => {
    const idx = currentIndex.value + 1;
    if (idx >= spaces.value.length) return null;
    return spaces.value[idx] || null;
  });
  const hasPrevSpaces = computed(() => currentIndex.value > 0);
  const hasNextSpaces = computed(() => currentIndex.value + 1 < spaces.value.length);

  const spaceRouteSlug = (space) => {
    if (!space) return "";
    const explicit = space?.display_config?.url;
    if (explicit) return String(explicit);
    return String(space?.slug || space?.id || "");
  };

  const scrollToIndex = (index, updateUrl = true, immediate = false) => {
    const el = stageRef.value;
    if (!el) {
      pendingScrollIndex.value = index;
      return;
    }
    const width = el.clientWidth;
    const distance = Math.abs(index - currentIndex.value);
    currentIndex.value = index;
    const active = spaces.value[index];
    if (active?.id) {
      onRecentSpace(active.id);
    }
    const slug = spaceRouteSlug(active);
    if (updateUrl && slug) {
      const nextPath = index === 0 ? "/" : `/space/${slug}`;
      replaceRoute(nextPath);
    }
    scrollLock.value = true;
    if (scrollLockTimer) {
      clearTimeout(scrollLockTimer);
    }
    const isLowPerf = getPerformanceMode() === "low";
    const shouldImmediate = immediate || !initialScrollDone.value || isLowPerf;
    if (shouldImmediate) {
      scrollLockTimer = setTimeout(() => {
        scrollLock.value = false;
      }, 50);
      el.scrollLeft = width * index;
      initialScrollDone.value = true;
      return;
    }
    if (distance <= 1) {
      scrollLockTimer = setTimeout(() => {
        scrollLock.value = false;
      }, 420);
      el.scrollTo({ left: width * index, behavior: "smooth" });
    } else {
      scrollLockTimer = setTimeout(() => {
        scrollLock.value = false;
      }, 50);
      el.scrollLeft = width * index;
    }
    initialScrollDone.value = true;
  };

  const updateIndex = () => {
    if (scrollLock.value) return;
    const el = stageRef.value;
    if (!el) return;
    const width = el.clientWidth;
    if (!width) return;
    const nextIndex = Math.round(el.scrollLeft / width);
    if (nextIndex !== currentIndex.value) {
      currentIndex.value = nextIndex;
      const active = spaces.value[nextIndex];
      if (active?.id) {
        onRecentSpace(active.id);
      }
    }
  };

  watch(currentSpace, (space) => {
    const slug = spaceRouteSlug(space);
    if (!slug) return;
    lastSpaceSlug.value = slug;
    persistLastSpaceSlug(slug);
  });

  watch(stageRef, (el) => {
    if (!el || pendingScrollIndex.value === null) return;
    const next = pendingScrollIndex.value;
    pendingScrollIndex.value = null;
    scrollToIndex(next, true, true);
  });

  watch(currentIndex, async (idx) => {
    await nextTick();
    setBackground(spaces.value[idx]);
    scheduleBackgroundRefresh();
  });

  const disposeStageRuntime = () => {
    if (scrollLockTimer) {
      clearTimeout(scrollLockTimer);
      scrollLockTimer = null;
    }
  };

  return {
    currentIndex,
    currentSpace,
    disposeStageRuntime,
    hasNextSpaces,
    hasPrevSpaces,
    initialScrollDone,
    lastSpaceSlug,
    lastSpaceSlugKey,
    nextSpace,
    pinnedSpaceIds,
    pinnedSpacesKey,
    prevSpace,
    recentResourcesBySpace,
    recentResourcesKey,
    recentSpaceIds,
    recentSpacesKey,
    scrollToIndex,
    spaceRouteSlug,
    stageRef,
    updateIndex
  };
}
