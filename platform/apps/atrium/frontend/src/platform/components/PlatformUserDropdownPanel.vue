<script setup>
import { computed } from "vue";
import { Settings, LogOut, Globe, Sun, Moon, Monitor } from "lucide-vue-next";
import PlatformSettingsRow from "./PlatformSettingsRow.vue";
import PlatformSegmentedControl from "./PlatformSegmentedControl.vue";
import { PLATFORM_LANGUAGE_IDS } from "../i18n/index.js";

const props = defineProps({
  user: { type: Object, default: null },
  currentLang: { type: String, required: true },
  theme: { type: String, required: true },
  t: { type: Function, required: true },
  domain: { type: String, default: "" },
  languageOptions: {
    type: Array,
    default: () => []
  },
  languageLabels: {
    type: Object,
    default: () => ({})
  },
  showLanguage: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(["set-lang", "toggle-lang", "set-theme", "logout"]);

const userInitial = computed(() => {
  if (!props.user?.email) return "?";
  return props.user.email.charAt(0).toUpperCase();
});

const profileHref = computed(() => {
  if (!props.domain) return "/settings";
  return `https://atrium.${props.domain}/settings/profile`;
});

const resolvedLanguageOptions = computed(() =>
  props.languageOptions?.length ? props.languageOptions : PLATFORM_LANGUAGE_IDS
);

const themeOptions = computed(() => ([
  { value: "dark", label: "", title: props.t("app.themeDark"), icon: Moon },
  { value: "light", label: "", title: props.t("app.themeLight"), icon: Sun },
  { value: "auto", label: "", title: props.t("app.themeAuto"), icon: Monitor }
]));

const applyLanguage = (lang) => {
  if (lang === props.currentLang) return;
  emit("set-lang", lang);
  emit("toggle-lang");
};

const toggleLanguage = () => {
  if (resolvedLanguageOptions.value.length < 2) return;
  const currentIndex = resolvedLanguageOptions.value.findIndex((lang) => lang === props.currentLang);
  const nextIndex = currentIndex >= 0
    ? (currentIndex + 1) % resolvedLanguageOptions.value.length
    : 0;
  applyLanguage(resolvedLanguageOptions.value[nextIndex]);
};

const currentLanguageLabel = computed(() => String(props.currentLang || "ru").toUpperCase());
</script>

<template>
  <div class="platform-user-dropdown-panel">
    <div class="platform-user-dropdown-panel__header">
      <span class="platform-user-dropdown-panel__avatar">{{ userInitial }}</span>
      <div class="platform-user-dropdown-panel__identity">
        <span class="platform-user-dropdown-panel__email">{{ user?.email }}</span>
        <slot name="header-meta" />
      </div>
    </div>

    <div class="platform-user-dropdown-panel__divider"></div>

    <div class="platform-user-dropdown-panel__settings">
      <PlatformSettingsRow v-if="showLanguage && resolvedLanguageOptions.length > 1" :label="t('app.language')" :icon="Globe">
        <button
          class="platform-user-dropdown-panel__lang-toggle"
          type="button"
          :aria-label="t('app.language')"
          @click="toggleLanguage"
        >
          <Globe :size="12" />
          <span>{{ currentLanguageLabel }}</span>
        </button>
      </PlatformSettingsRow>

      <PlatformSettingsRow :label="t('app.theme')" :icon="Sun">
        <PlatformSegmentedControl
          :model-value="theme"
          :options="themeOptions"
          :aria-label="t('app.theme')"
          size="sm"
          @update:model-value="emit('set-theme', $event)"
        />
      </PlatformSettingsRow>

      <slot />
    </div>

    <div class="platform-user-dropdown-panel__divider"></div>

    <a class="platform-user-dropdown-panel__action" :href="profileHref">
      <Settings :size="14" />
      {{ t("app.settings") }}
    </a>

    <button
      class="platform-user-dropdown-panel__action platform-user-dropdown-panel__action--danger"
      type="button"
      @click="emit('logout')"
    >
      <LogOut :size="14" />
      {{ t("app.logout") }}
    </button>
  </div>
</template>

<style scoped>
.platform-user-dropdown-panel {
  width: 320px;
  padding: 10px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface-overlay, #1a222c) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--border-default, rgba(255, 255, 255, 0.12)) 76%, transparent);
  box-shadow:
    0 20px 56px rgba(0, 0, 0, 0.42),
    0 0 0 1px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.platform-user-dropdown-panel__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 6px;
}

.platform-user-dropdown-panel__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--ink-primary, #e6edf3);
  background: linear-gradient(135deg, rgba(88, 166, 255, 0.3), rgba(163, 113, 247, 0.3));
  border: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.platform-user-dropdown-panel__identity {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.platform-user-dropdown-panel__email {
  font-size: 13px;
  color: color-mix(in srgb, var(--ink-primary, #f8fafc) 82%, transparent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.platform-user-dropdown-panel__divider {
  height: 1px;
  background: color-mix(in srgb, var(--border-default, rgba(255, 255, 255, 0.08)) 82%, transparent);
  margin: 0 6px;
}

.platform-user-dropdown-panel__settings {
  display: grid;
  gap: 6px;
  padding: 0 8px;
}

.platform-user-dropdown-panel__lang-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 58px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--border-default, rgba(255, 255, 255, 0.12)) 76%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface-overlay, #1a222c) 92%, transparent);
  color: var(--ink-primary, #f8fafc);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 150ms ease,
    border-color 150ms ease,
    color 150ms ease;
}

.platform-user-dropdown-panel__lang-toggle:hover {
  border-color: color-mix(in srgb, var(--border-default, rgba(255, 255, 255, 0.18)) 84%, transparent);
  background: color-mix(in srgb, var(--glass-bg-hover, rgba(255, 255, 255, 0.12)) 80%, transparent);
}

.platform-user-dropdown-panel__action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 8px;
  font-size: 13px;
  color: color-mix(in srgb, var(--ink-secondary, #94a3b8) 86%, transparent);
  background: transparent;
  border: none;
  border-radius: 10px;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  width: 100%;
}

.platform-user-dropdown-panel__action:hover {
  background: var(--glass-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--ink-primary, #e6edf3);
}

.platform-user-dropdown-panel__action--danger:hover {
  background: rgba(248, 81, 73, 0.1);
  color: #f85149;
}
</style>
