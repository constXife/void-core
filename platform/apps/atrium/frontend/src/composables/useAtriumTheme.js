import { computed, ref, watch } from "vue";

const THEME_STORAGE_KEY = "atrium:theme";

const normalizeTheme = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  return ["auto", "dark", "light"].includes(raw) ? raw : "auto";
};

export function useAtriumTheme() {
  const themePreference = ref("auto");
  const prefersDark = ref(false);

  const mediaQuery =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  if (mediaQuery) {
    prefersDark.value = !!mediaQuery.matches;
    const handleMediaChange = (event) => {
      prefersDark.value = !!event.matches;
    };
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleMediaChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleMediaChange);
    }
  }

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    themePreference.value = normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
  }

  const currentTheme = computed(() =>
    themePreference.value === "auto" ? (prefersDark.value ? "dark" : "light") : themePreference.value
  );

  const themeSelection = computed({
    get() {
      return themePreference.value;
    },
    set(value) {
      themePreference.value = normalizeTheme(value);
    }
  });

  watch(
    themePreference,
    (value) => {
      if (typeof window === "undefined" || typeof localStorage === "undefined") return;
      localStorage.setItem(THEME_STORAGE_KEY, value);
    },
    { immediate: true }
  );

  watch(
    currentTheme,
    (value) => {
      if (typeof document === "undefined") return;
      document.documentElement.dataset.theme = value;
      document.documentElement.style.colorScheme = value;
    },
    { immediate: true }
  );

  return {
    currentTheme,
    themePreference,
    themeSelection
  };
}
