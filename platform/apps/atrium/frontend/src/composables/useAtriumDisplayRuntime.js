import { computed, ref, watch } from "vue";

export function useAtriumDisplayRuntime({
  currentSpace,
  isKioskMode,
  me,
  parseDisplayConfig,
  settingsStore
}) {
  const AUTO_PERF_CACHE_KEY = "atrium:auto-perf";
  const PERFORMANCE_PREF_KEY = "atrium:performance";

  const bgA = ref("");
  const bgB = ref("");
  const showA = ref(true);
  const performancePreference = ref("auto");
  const backgroundTimer = ref(null);
  const backgroundRandomIndex = {};
  const backgroundRandomWindow = {};

  const detectAutoPerformance = () => {
    try {
      const cached = settingsStore.getCurrentSpaceJSON("autoPerformance", "", AUTO_PERF_CACHE_KEY);
      if (cached === "low" || cached === "normal") return cached;
    } catch {
      // ignore cache failures
    }

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReducedMotion) {
      settingsStore.setCurrentSpaceJSON("autoPerformance", "low", AUTO_PERF_CACHE_KEY);
      return "low";
    }

    const cores = Number(navigator.hardwareConcurrency || 0);
    const memory = Number(navigator.deviceMemory || 0);
    const isLow = (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4);
    const mode = isLow ? "low" : "normal";
    settingsStore.setCurrentSpaceJSON("autoPerformance", mode, AUTO_PERF_CACHE_KEY);
    return mode;
  };

  const performanceMode = computed(() => {
    const cfg = parseDisplayConfig(currentSpace.value);
    const mode = String(cfg.performance_mode || "").toLowerCase();
    if (mode === "low") return "low";
    if (mode === "normal") return "normal";
    if (performancePreference.value === "low") return "low";
    if (performancePreference.value === "normal") return "normal";
    if (typeof window === "undefined") return "normal";
    return detectAutoPerformance();
  });

  const tooltipsDisabled = computed(() => performanceMode.value === "low");
  const tooltipDelay = computed(() => (performanceMode.value === "low" ? 0 : 60));

  const performanceSelectorVisible = computed(() => {
    const cfg = parseDisplayConfig(currentSpace.value);
    const mode = String(cfg.performance_mode || "").toLowerCase();
    if (mode === "low" || mode === "normal") return false;
    return !!me.value && !isKioskMode.value;
  });

  const performanceSelection = computed({
    get() {
      return performancePreference.value;
    },
    set(value) {
      const normalized = String(value || "").toLowerCase();
      const next = ["auto", "low", "normal"].includes(normalized) ? normalized : "auto";
      performancePreference.value = next;
      settingsStore.setCurrentSpaceJSON("performancePreference", next, PERFORMANCE_PREF_KEY);
    }
  });

  const clearBackgroundTimer = () => {
    if (backgroundTimer.value) {
      clearTimeout(backgroundTimer.value);
      backgroundTimer.value = null;
    }
  };

  const scheduleBackgroundRefresh = () => {
    clearBackgroundTimer();
    const space = currentSpace.value;
    if (!space) return;
    const cfg = parseDisplayConfig(space);
    const mode = String(cfg.background_mode || "").toLowerCase();
    const items = Array.isArray(cfg.backgrounds) ? cfg.backgrounds : [];
    if (!items.length) return;
    if (mode !== "time" && mode !== "rotate" && mode !== "random") return;
    const rotateMinutes = Math.max(1, Number(cfg.background_rotate_minutes || 10));
    const delayMs =
      mode === "rotate" || mode === "random"
        ? rotateMinutes * 60 * 1000
        : 60 * 1000;
    backgroundTimer.value = setTimeout(() => {
      if (currentSpace.value) {
        setBackground(currentSpace.value);
      }
      scheduleBackgroundRefresh();
    }, delayMs);
  };

  const parseTimeValue = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const isTimeInRange = (nowMinutes, fromMinutes, toMinutes) => {
    if (fromMinutes == null && toMinutes == null) return true;
    if (fromMinutes == null) return nowMinutes <= toMinutes;
    if (toMinutes == null) return nowMinutes >= fromMinutes;
    if (fromMinutes <= toMinutes) {
      return nowMinutes >= fromMinutes && nowMinutes <= toMinutes;
    }
    return nowMinutes >= fromMinutes || nowMinutes <= toMinutes;
  };

  const matchesBackgroundWhen = (when, context) => {
    if (!when) return true;
    const segmentRule = when.segment ?? when.user_segment;
    if (segmentRule) {
      const current = String(context.segment || "").toLowerCase();
      if (!current) return false;
      const allowed = Array.isArray(segmentRule)
        ? segmentRule.map((value) => String(value).toLowerCase())
        : [String(segmentRule).toLowerCase()];
      if (!allowed.includes(current)) return false;
    }
    const timeRule = when.time || {};
    const fromValue = when.from ?? timeRule.from;
    const toValue = when.to ?? timeRule.to;
    const fromMinutes = parseTimeValue(fromValue);
    const toMinutes = parseTimeValue(toValue);
    if (fromMinutes != null || toMinutes != null) {
      if (!isTimeInRange(context.nowMinutes, fromMinutes, toMinutes)) return false;
    }
    return true;
  };

  const backgroundFor = (space) => {
    if (!space) return "";
    const fallback = space.background_url || space.background || "";
    const cfg = parseDisplayConfig(space);
    const mode = String(cfg.background_mode || "static").toLowerCase();
    const rotateMinutes = Math.max(1, Number(cfg.background_rotate_minutes || 10));
    const items = Array.isArray(cfg.backgrounds) ? cfg.backgrounds : [];
    if (!items.length) return fallback;
    const now = new Date();
    const context = {
      segment: me.value?.segment,
      nowMinutes: now.getHours() * 60 + now.getMinutes()
    };
    const normalized = items
      .map((entry) => {
        const payload = typeof entry === "string" ? { url: entry } : entry;
        const url = String(payload?.url || "").trim();
        if (!url) return null;
        return { url, when: payload.when || null };
      })
      .filter(Boolean);
    if (!normalized.length) return fallback;

    const eligible = normalized.filter((item) =>
      matchesBackgroundWhen(item.when, context)
    );
    const pool = eligible.length ? eligible : normalized;
    const defaultItem = normalized.find((item) => !item.when) || null;
    if (mode === "random") {
      const key = String(space.id || space.slug || "default");
      const windowMs = rotateMinutes * 60 * 1000;
      const windowIndex = Math.floor(Date.now() / windowMs);
      const cachedWindow = backgroundRandomWindow[key];
      if (cachedWindow !== windowIndex || backgroundRandomIndex[key] == null) {
        backgroundRandomWindow[key] = windowIndex;
        backgroundRandomIndex[key] = Math.floor(Math.random() * pool.length);
      }
      const idx = backgroundRandomIndex[key];
      return pool[idx]?.url || defaultItem?.url || fallback;
    }
    if (mode === "rotate") {
      const windowMs = rotateMinutes * 60 * 1000;
      const idx = Math.floor(Date.now() / windowMs) % pool.length;
      return pool[idx]?.url || defaultItem?.url || fallback;
    }
    if (mode === "time") {
      return (eligible[0] || defaultItem || pool[0] || {}).url || fallback;
    }
    return (defaultItem || pool[0] || {}).url || fallback;
  };

  const setBackground = (space) => {
    const url = backgroundFor(space);
    if (showA.value) {
      bgB.value = url;
      showA.value = false;
    } else {
      bgA.value = url;
      showA.value = true;
    }
  };

  const backgroundBlurDisabled = computed(() => {
    const cfg = parseDisplayConfig(currentSpace.value);
    const val = cfg.background_blur;
    if (val === false) return true;
    if (val === "off") return true;
    if (val === 0) return true;
    return false;
  });

  const backgroundPixelated = computed(() => {
    const cfg = parseDisplayConfig(currentSpace.value);
    const val = cfg.background_pixelated ?? cfg.backgroundPixelated;
    return val === true || val === "true" || val === 1 || val === "on";
  });

  watch(
    () => performanceMode.value,
    (mode) => {
      if (typeof document === "undefined") return;
      document.body.dataset.performance = mode;
    },
    { immediate: true }
  );

  watch(
    () => me.value?.segment,
    () => {
      if (!currentSpace.value) return;
      setBackground(currentSpace.value);
      scheduleBackgroundRefresh();
    }
  );

  const disposeDisplayRuntime = () => {
    clearBackgroundTimer();
  };

  return {
    AUTO_PERF_CACHE_KEY,
    PERFORMANCE_PREF_KEY,
    bgA,
    bgB,
    disposeDisplayRuntime,
    backgroundBlurDisabled,
    backgroundPixelated,
    performanceMode,
    performancePreference,
    performanceSelection,
    performanceSelectorVisible,
    scheduleBackgroundRefresh,
    setBackground,
    showA,
    tooltipDelay,
    tooltipsDisabled
  };
}
