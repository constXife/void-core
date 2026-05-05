<script setup>
import { Bot } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import PlatformAppsMenu from "../platform/components/PlatformAppsMenu.vue";
import PlatformHeaderBrand from "../platform/components/PlatformHeaderBrand.vue";
import PlatformHeaderFrame from "../platform/components/PlatformHeaderFrame.vue";
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

    <PlatformHeaderFrame>
      <template #left>
        <PlatformHeaderBrand href="/" :title="labels.product" :subtitle="labels.subtitle">
          <template #icon>
            <Bot :size="18" />
          </template>
        </PlatformHeaderBrand>
      </template>

      <template #right>
        <div class="assistant-product-header__actions">
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
        </div>
      </template>
    </PlatformHeaderFrame>

    <AssistantStandaloneSurface />
  </main>
</template>

<style scoped>
.assistant-product-root {
  min-height: 100vh;
  color: var(--ink-primary);
  background: var(--surface-base);
}

.assistant-product-header__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.assistant-product-header__login {
  display: inline-flex;
  align-items: center;
  min-height: 2.45rem;
  padding: 0 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03)),
    rgba(15, 18, 24, 0.84);
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
}
</style>
