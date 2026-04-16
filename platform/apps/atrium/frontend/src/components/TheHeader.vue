<script setup>
import { Activity } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import AtriumSpaceSwitcher from "./AtriumSpaceSwitcher.vue";
import UserDropdown from "./UserDropdown.vue";
import PlatformHeaderFrame from "../platform/components/PlatformHeaderFrame.vue";
import PlatformAppsMenu from "../platform/components/PlatformAppsMenu.vue";
import PlatformHeaderBrand from "../platform/components/PlatformHeaderBrand.vue";
import PlatformDropdownAnchor from "../platform/components/PlatformDropdownAnchor.vue";
import PlatformUserMenuTrigger from "../platform/components/PlatformUserMenuTrigger.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { useAuthStore } from "../stores/auth.js";
import { useUiStore } from "../stores/ui.js";

const appStore = useAtriumAppStore();
const authStore = useAuthStore();
const uiStore = useUiStore();

const { userMenuRef } = storeToRefs(appStore);
const { t } = appStore;
const { authEnabled, loginPageUrl, me, userInitials } = storeToRefs(authStore);
const {
  currentLang,
  languageLabels,
  languageSelection,
  languageSwitcherMode,
  languageSwitcherVisible,
  showUserDropdown
} = storeToRefs(uiStore);

const openHome = () => {
  appStore.navigateTo("/");
};
</script>

<template>
  <PlatformHeaderFrame>
    <template #left>
      <PlatformHeaderBrand
        href="/"
        :title="t('app.title')"
        :subtitle="t('app.spaces')"
        @click.prevent="openHome"
      >
        <template #icon>
          <Activity :size="18" />
        </template>
      </PlatformHeaderBrand>
    </template>

    <template #center>
      <AtriumSpaceSwitcher />
    </template>

    <template #right>
      <div class="atrium-header__actions">
        <label
          v-if="languageSwitcherVisible && languageSwitcherMode === 'header'"
          class="atrium-header__lang"
        >
          <select
            v-model="languageSelection"
            class="atrium-header__lang-select"
            :aria-label="t('language.title')"
          >
            <option v-for="lang in Object.keys(languageLabels)" :key="lang" :value="lang">
              {{ languageLabels[lang] || lang }}
            </option>
          </select>
        </label>

        <PlatformAppsMenu current-product="atrium" :lang="currentLang" />

        <template v-if="authEnabled">
          <PlatformDropdownAnchor
            v-if="me"
            ref="userMenuRef"
            v-model:open="showUserDropdown"
            align="right"
          >
            <template #trigger="{ toggle }">
              <PlatformUserMenuTrigger
                :initials="userInitials"
                :open="showUserDropdown"
                @click.stop="toggle"
              />
            </template>

            <template #dropdown>
              <UserDropdown />
            </template>
          </PlatformDropdownAnchor>

          <a v-else class="atrium-header__login" :href="loginPageUrl">
            {{ t("app.login") }}
          </a>
        </template>
      </div>
    </template>
  </PlatformHeaderFrame>
</template>

<style scoped>
.atrium-header__login,
.atrium-header__lang-select {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03)),
    rgba(15, 18, 24, 0.84);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 10px 24px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.atrium-header__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.atrium-header__lang {
  display: inline-flex;
}

.atrium-header__lang-select {
  min-width: 4.4rem;
  padding: 0.65rem 0.85rem;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.75rem;
  font-weight: 600;
  outline: none;
}

.atrium-header__login {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.22rem 0.26rem 0.22rem 0.7rem;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
}

.atrium-header__login {
  padding-block: 0.68rem;
}

.atrium-header__login:hover,
.atrium-header__lang-select:hover {
  border-color: rgba(120, 171, 255, 0.22);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04)),
    rgba(15, 18, 24, 0.92);
}

@media (max-width: 720px) {
  .atrium-header__actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .atrium-header__lang {
    display: none;
  }
}
</style>
