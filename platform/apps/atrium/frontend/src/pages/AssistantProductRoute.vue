<script setup>
import { Bot } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import PlatformAppsMenu from "../platform/components/PlatformAppsMenu.vue";
import PlatformUserDropdown from "../platform/components/UserDropdown.vue";
import TheShellBackdrop from "../components/TheShellBackdrop.vue";
import AssistantStandaloneSurface from "../surfaces/AssistantStandaloneSurface.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { useAuthStore } from "../stores/auth.js";
import { useUiStore } from "../stores/ui.js";

const appStore = useAtriumAppStore();
const authStore = useAuthStore();
const uiStore = useUiStore();

const { authEnabled, loginPageUrl, me } = storeToRefs(authStore);
const { currentLang, languageLabels } = storeToRefs(uiStore);
const { themeSelection } = storeToRefs(appStore);

const labels = computed(() => {
  if (currentLang.value === "ru") {
    return {
      login: "Войти",
      product: "Void Assistant",
      subtitle: "Чат"
    };
  }
  return {
    login: "Sign in",
    product: "Void Assistant",
    subtitle: "Chat"
  };
});

const setLang = (lang) => {
  uiStore.languageSelection = lang;
};

const setTheme = (theme) => {
  themeSelection.value = theme;
};

const logout = async () => {
  await authStore.logout();
};
</script>

<template>
  <main class="assistant-product-root">
    <TheShellBackdrop />

    <AssistantStandaloneSurface>
      <template #sidebar-brand>
        <a href="/" class="assistant-brand">
          <span class="assistant-brand__icon" aria-hidden="true">
            <Bot :size="18" />
          </span>
          <span class="assistant-brand__text">
            <span class="assistant-brand__title">{{ labels.product }}</span>
            <span class="assistant-brand__subtitle">{{ labels.subtitle }}</span>
          </span>
        </a>
      </template>

      <template #main-actions>
        <PlatformAppsMenu current-product="assistant" :lang="currentLang" />

        <PlatformUserDropdown
          v-if="authEnabled && me"
          :user="me"
          :current-lang="currentLang"
          :theme="themeSelection"
          :language-labels="languageLabels"
          :t="appStore.t"
          @set-lang="setLang"
          @set-theme="setTheme"
          @logout="logout"
        />

        <a v-else-if="authEnabled" class="assistant-product-header__login" :href="loginPageUrl">
          {{ labels.login }}
        </a>
      </template>
    </AssistantStandaloneSurface>
  </main>
</template>

<style scoped>
.assistant-product-root {
  min-height: 100vh;
  color: var(--ink-primary);
  background: var(--surface-base);
}

.assistant-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.25rem 0.4rem;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: background var(--duration-fast, 150ms) var(--ease-default, ease);
}

.assistant-brand:hover {
  background: var(--glass-bg-hover);
}

.assistant-brand__icon {
  width: 2rem;
  height: 2rem;
  border-radius: 9px;
  background: color-mix(in srgb, var(--accent-purple) 16%, transparent);
  color: var(--accent-purple);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.assistant-brand__text {
  display: inline-flex;
  flex-direction: column;
  line-height: 1.1;
}

.assistant-brand__title {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--ink-primary);
  letter-spacing: -0.01em;
}

.assistant-brand__subtitle {
  margin-top: 2px;
  font-size: var(--text-2xs, 10px);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.assistant-product-header__login {
  display: inline-flex;
  align-items: center;
  min-height: 2.25rem;
  padding: 0 0.8rem;
  border: 1px solid var(--border-default);
  border-radius: 999px;
  background: var(--surface-raised);
  color: var(--ink-primary);
  font-size: var(--text-sm, 13px);
  text-decoration: none;
}
</style>
