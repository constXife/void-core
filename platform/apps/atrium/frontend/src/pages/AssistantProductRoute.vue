<script setup>
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Smartphone } from "lucide-vue-next";
import PlatformAppsMenu from "../platform/components/PlatformAppsMenu.vue";
import PlatformUserDropdown from "../platform/components/UserDropdown.vue";
import { hasResolvedPlatformAccount } from "../platform/account.js";
import TheShellBackdrop from "../components/TheShellBackdrop.vue";
import AssistantStandaloneSurface from "../surfaces/AssistantStandaloneSurface.vue";
import { assistantIdentityBase } from "../surfaces/assistant-standalone/assistantIdentity.js";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { useAuthStore } from "../stores/auth.js";
import { useUiStore } from "../stores/ui.js";

const router = useRouter();
const appStore = useAtriumAppStore();
const authStore = useAuthStore();
const uiStore = useUiStore();

// Account-раздел «Устройства» (ADR-0032 §5a) — вход из меню под аватаром,
// не из ряда табов чата.
const goToDevices = () => router.push({ name: "assistant-devices" });

const { actualRole, authEnabled, loginPageUrl, me } = storeToRefs(authStore);
const { currentLang, languageLabels } = storeToRefs(uiStore);
const { themeSelection } = storeToRefs(appStore);

const labels = computed(() => {
  if (currentLang.value === "ru") {
    return {
      login: "Войти",
      product: "Void Assistant"
    };
  }
  return {
    login: "Sign in",
    product: "Void Assistant"
  };
});

// Subtitle не передаём: дублирует активную tab (CHAT/CAPABILITIES/ROUTINES),
// а brand-полоса теперь несёт ещё collapse-toggle — лишний текст её перегружал.
const assistantIdentity = computed(() => ({
  ...assistantIdentityBase,
  label: labels.value.product
}));

const hasAccount = computed(() =>
  hasResolvedPlatformAccount(me.value, { role: actualRole.value })
);

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
    <TheShellBackdrop tone="assistant" />

    <AssistantStandaloneSurface
      :identity="assistantIdentity"
      :current-user="me"
      :lang="currentLang"
      :t="appStore.t"
    >
      <template #main-actions>
        <PlatformAppsMenu current-product="assistant" :lang="currentLang" />

        <PlatformUserDropdown
          v-if="authEnabled && hasAccount"
          :user="me"
          :current-lang="currentLang"
          :theme="themeSelection"
          :language-labels="languageLabels"
          :t="appStore.t"
          @set-lang="setLang"
          @set-theme="setTheme"
          @logout="logout"
        >
          <template #account-actions>
            <button
              type="button"
              class="platform-user-dropdown-panel__action"
              @click="goToDevices"
            >
              <Smartphone :size="14" />
              {{ appStore.t("assistant.tabs.devices") }}
            </button>
          </template>
        </PlatformUserDropdown>

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

/* «Устройства» в account-меню: визуально как штатные action-пункты панели
   (scoped panel-стили на slot-контент не распространяются). */
.platform-user-dropdown-panel__action {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: color-mix(in srgb, var(--ink-secondary, #94a3b8) 86%, transparent);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.platform-user-dropdown-panel__action:hover {
  background: var(--glass-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--ink-primary, #e6edf3);
}
</style>
