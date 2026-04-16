import { computed, ref } from "vue";
import { defineStore } from "pinia";

let nextToastId = 1;

export const useToastStore = defineStore("atrium-toast", () => {
  const items = ref([]);
  const activeHeroToast = ref(null);
  const heroToastProgress = ref(100);

  const timers = new Map();
  let heroToastTimer = null;
  let heroToastProgressTimer = null;

  const currentBanner = computed(() => {
    const banners = items.value.filter((item) => item.kind === "banner");
    return banners.length > 0 ? banners[banners.length - 1] : null;
  });

  const clearBannerTimer = (id) => {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
  };

  const dismissBanner = (id) => {
    clearBannerTimer(id);
    items.value = items.value.filter((item) => item.id !== id);
  };

  const pushBanner = (message, type = "info", duration = 3500) => {
    const normalized = String(message || "").trim();
    if (!normalized) return null;

    const toast = {
      id: nextToastId++,
      kind: "banner",
      message: normalized,
      type
    };

    items.value = [...items.value.filter((item) => item.kind !== "banner"), toast];

    const timer = setTimeout(() => {
      dismissBanner(toast.id);
    }, duration);

    timers.set(toast.id, timer);
    return toast.id;
  };

  const dismissHeroToast = () => {
    if (heroToastTimer) {
      clearTimeout(heroToastTimer);
      heroToastTimer = null;
    }
    if (heroToastProgressTimer) {
      clearTimeout(heroToastProgressTimer);
      heroToastProgressTimer = null;
    }
    activeHeroToast.value = null;
    heroToastProgress.value = 100;
  };

  const showHeroToast = (toast, duration = 10000) => {
    dismissHeroToast();
    activeHeroToast.value = toast || null;
    heroToastProgress.value = 100;
    if (!toast) return;

    const startedAt = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const next = Math.max(0, 100 - (elapsed / duration) * 100);
      heroToastProgress.value = next;
      if (next > 0) {
        heroToastProgressTimer = setTimeout(tick, 100);
      }
    };

    tick();
    heroToastTimer = setTimeout(() => {
      dismissHeroToast();
    }, duration);
  };

  return {
    activeHeroToast,
    currentBanner,
    dismissBanner,
    dismissHeroToast,
    heroToastProgress,
    items,
    pushBanner,
    showHeroToast
  };
});
