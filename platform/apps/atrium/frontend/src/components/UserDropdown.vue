<script setup>
import { computed } from "vue";
import { Gauge, UserCog } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import PlatformSettingsRow from "../platform/components/PlatformSettingsRow.vue";
import PlatformUserDropdownPanel from "../platform/components/PlatformUserDropdownPanel.vue";
import { PLATFORM_LANGUAGE_IDS } from "../platform/i18n/index.js";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { useAuthStore } from "../stores/auth.js";
import { useUiStore } from "../stores/ui.js";

const appStore = useAtriumAppStore();
const authStore = useAuthStore();
const uiStore = useUiStore();
const enableV0DevAdminSeams = appStore.enableV0DevAdminSeams;

const {
  actualIsAdmin,
  effectiveRole,
  me,
  roleOptions,
  roleOverrideActive,
  roleOverrideSelection
} = storeToRefs(authStore);
const {
  currentLang,
  languageLabels,
  languageSelection,
  languageSwitcherMode,
  languageSwitcherVisible,
  performanceSelection,
  performanceSelectorVisible,
  showUserDropdown
} = storeToRefs(uiStore);
const { supportedLangs, themeSelection } = storeToRefs(appStore);

const languageOptions = computed(() =>
  Array.isArray(supportedLangs.value) && supportedLangs.value.length ? supportedLangs.value : PLATFORM_LANGUAGE_IDS
);

const showLanguage = computed(
  () => languageSwitcherVisible.value && languageSwitcherMode.value === "settings"
);

const handleLogout = async () => {
  showUserDropdown.value = false;
  await authStore.logout();
};
</script>

<template>
  <PlatformUserDropdownPanel
    :user="me"
    :current-lang="currentLang"
    :theme="themeSelection"
    :language-labels="languageLabels"
    :language-options="languageOptions"
    :show-language="showLanguage"
    :t="appStore.t"
    @set-lang="languageSelection = $event"
    @set-theme="themeSelection = $event"
    @logout="handleLogout"
  >
    <template #header-meta>
      <span class="user-dropdown-v2__role" :class="{ 'user-dropdown-v2__role--admin': actualIsAdmin }">
        {{ effectiveRole }}
      </span>
    </template>

    <PlatformSettingsRow
      v-if="performanceSelectorVisible"
      :label="appStore.t('performance.title')"
      :icon="Gauge"
      compact
    >
      <select v-model="performanceSelection" class="user-dropdown-v2__select">
        <option value="auto">{{ appStore.t("performance.auto") }}</option>
        <option value="low">{{ appStore.t("performance.low") }}</option>
        <option value="normal">{{ appStore.t("performance.normal") }}</option>
      </select>
    </PlatformSettingsRow>

    <div
      v-if="actualIsAdmin && enableV0DevAdminSeams"
      class="user-dropdown-v2__admin-block"
    >
      <PlatformSettingsRow :label="appStore.t('role.switch')" :icon="UserCog" compact>
        <select v-model="roleOverrideSelection" class="user-dropdown-v2__select">
          <option v-for="role in roleOptions" :key="role" :value="role">
            {{ role }}
          </option>
        </select>
      </PlatformSettingsRow>

      <p v-if="roleOverrideActive" class="user-dropdown-v2__note">
        {{ appStore.t("role.actingAs", { role: effectiveRole }) }}
      </p>
    </div>
  </PlatformUserDropdownPanel>
</template>

<style scoped>
.user-dropdown-v2__role {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: color-mix(in srgb, var(--ink-secondary, #94a3b8) 92%, transparent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.user-dropdown-v2__role--admin {
  background: rgba(34, 197, 94, 0.16);
  color: #86efac;
}

.user-dropdown-v2__admin-block {
  display: grid;
  gap: 6px;
}

.user-dropdown-v2__select {
  min-width: 124px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--border-default, rgba(255, 255, 255, 0.12)) 76%, transparent);
  background: color-mix(in srgb, var(--surface-overlay, #1a222c) 92%, transparent);
  color: var(--ink-primary, #f8fafc);
  font: inherit;
  font-size: 12px;
  box-sizing: border-box;
}

.user-dropdown-v2__note {
  margin: 0;
  padding-left: 22px;
  color: color-mix(in srgb, var(--ink-secondary, #94a3b8) 80%, transparent);
  font-size: 12px;
  line-height: 1.5;
}
</style>
