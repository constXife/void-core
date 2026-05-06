<script setup>
import { storeToRefs } from "pinia";
import { computed } from "vue";
import PlatformAppsMenu from "../platform/components/PlatformAppsMenu.vue";
import PlatformUserDropdown from "../platform/components/UserDropdown.vue";
import TheShellBackdrop from "../components/TheShellBackdrop.vue";
import AssistantStandaloneSurface from "../surfaces/AssistantStandaloneSurface.vue";
import { assistantIdentityBase } from "../surfaces/assistant-standalone/assistantIdentity.js";
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

const assistantIdentity = computed(() => ({
  ...assistantIdentityBase,
  label: labels.value.product,
  subtitle: labels.value.subtitle
}));

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

    <AssistantStandaloneSurface :identity="assistantIdentity">
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
