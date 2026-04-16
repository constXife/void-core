<script setup>
import { computed } from "vue";
import { Globe, Moon, Sun, Monitor } from "lucide-vue-next";
import PlatformSegmentedControl from "./PlatformSegmentedControl.vue";

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ""
  },
  hint: {
    type: String,
    default: ""
  },
  currentLang: {
    type: String,
    default: "ru"
  },
  currentTheme: {
    type: String,
    default: "auto"
  },
  languageOptions: {
    type: Array,
    default: () => []
  },
  languageLabels: {
    type: Object,
    default: () => ({})
  },
  t: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(["update:lang", "update:theme"]);

const themeOptions = [
  { value: "dark", labelKey: "app.themeDark", icon: Moon },
  { value: "light", labelKey: "app.themeLight", icon: Sun },
  { value: "auto", labelKey: "app.themeAuto", icon: Monitor }
];

const resolvedLanguageOptions = computed(() =>
  props.languageOptions.map((lang) => ({
    value: lang,
    label: props.languageLabels[lang] || lang,
    icon: Globe
  }))
);

const resolvedThemeOptions = computed(() =>
  themeOptions.map((option) => ({
    value: option.value,
    label: props.t(option.labelKey),
    icon: option.icon
  }))
);
</script>

<template>
  <div class="platform-auth-card-shell">
    <main class="platform-auth-card">
      <div class="platform-auth-card__controls">
        <label v-if="languageOptions.length > 1" class="platform-auth-card__control">
          <span class="platform-auth-card__control-label">{{ t("app.language") }}</span>
          <PlatformSegmentedControl
            :model-value="currentLang"
            :options="resolvedLanguageOptions"
            :aria-label="t('app.language')"
            full-width
            @update:model-value="emit('update:lang', $event)"
          />
        </label>

        <div class="platform-auth-card__control">
          <span class="platform-auth-card__control-label">{{ t("app.theme") }}</span>
          <PlatformSegmentedControl
            :model-value="currentTheme"
            :options="resolvedThemeOptions"
            :aria-label="t('app.theme')"
            full-width
            @update:model-value="emit('update:theme', $event)"
          />
        </div>
      </div>

      <div class="platform-auth-card__body">
        <div class="platform-auth-card__heading">
          <h1 class="platform-auth-card__title">{{ title }}</h1>
          <p v-if="subtitle" class="platform-auth-card__subtitle">{{ subtitle }}</p>
        </div>

        <div class="platform-auth-card__content">
          <slot />
        </div>

        <p v-if="hint" class="platform-auth-card__hint">{{ hint }}</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.platform-auth-card-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 16px;
}

.platform-auth-card {
  width: min(520px, calc(100vw - 32px));
  padding: 20px;
  border-radius: 30px;
  background: color-mix(in srgb, var(--surface-raised, #131920) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--border-default, rgba(255, 255, 255, 0.1)) 78%, transparent);
  box-shadow:
    0 28px 80px rgba(0, 0, 0, 0.34),
    0 0 0 1px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}

.platform-auth-card__controls {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 22px;
  flex-wrap: wrap;
}

.platform-auth-card__control {
  display: grid;
  gap: 8px;
  justify-items: center;
}

.platform-auth-card__control-label {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--ink-secondary, #7d8590) 88%, transparent);
  text-align: center;
}

.platform-auth-card__body {
  display: grid;
  gap: 22px;
}

.platform-auth-card__heading {
  display: grid;
  gap: 12px;
}

.platform-auth-card__title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: var(--ink-primary, #e6edf3);
}

.platform-auth-card__subtitle {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: color-mix(in srgb, var(--ink-secondary, #7d8590) 88%, transparent);
  max-width: 42ch;
}

.platform-auth-card__content {
  display: grid;
  gap: 14px;
}

.platform-auth-card__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: color-mix(in srgb, var(--ink-secondary, #7d8590) 72%, transparent);
}

@media (max-width: 720px) {
  .platform-auth-card {
    padding: 18px;
    border-radius: 24px;
  }

  .platform-auth-card__controls {
    justify-content: center;
  }

  .platform-auth-card__control {
    width: 100%;
  }
}
</style>
