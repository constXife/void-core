<script setup>
import { Gauge, Globe, LogOut, UserCog } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import Tooltip from "./Tooltip.vue";
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
  isAdmin,
  me,
  roleOptions,
  roleOverrideActive,
  roleOverrideSelection,
  userInitials
} = storeToRefs(authStore);
const {
  languageLabels,
  languageSelection,
  languageSwitcherMode,
  languageSwitcherVisible,
  performanceSelection,
  performanceSelectorVisible,
  showUserDropdown,
  tooltipDelay,
  tooltipsDisabled
} = storeToRefs(uiStore);

const handleLogout = async () => {
  showUserDropdown.value = false;
  await authStore.logout();
};
</script>

<template>
  <div class="user-dropdown" @click.stop>
    <div class="user-dropdown-header">
      <div class="user-dropdown-avatar" :class="{ 'user-avatar-admin': actualIsAdmin }">
        {{ userInitials }}
      </div>
      <div class="user-dropdown-info">
        <div class="user-dropdown-email">{{ me?.email }}</div>
        <div class="user-dropdown-role">
          <span class="chip" :class="isAdmin ? 'chip-online' : ''">{{ effectiveRole }}</span>
        </div>
      </div>
    </div>
    <div class="user-dropdown-divider"></div>

    <div
      v-if="languageSwitcherVisible && languageSwitcherMode === 'settings'"
      class="user-dropdown-section user-dropdown-section-compact"
    >
      <div class="user-dropdown-label user-dropdown-label-icon">
        <Tooltip
          :content="appStore.t('language.title')"
          :disabled="tooltipsDisabled"
          :delay="tooltipDelay"
        >
          <Globe class="w-4 h-4" />
        </Tooltip>
        <span class="sr-only">{{ appStore.t("language.title") }}</span>
      </div>
      <select v-model="languageSelection" class="select user-dropdown-select">
        <option v-for="lang in Object.keys(languageLabels)" :key="lang" :value="lang">
          {{ languageLabels[lang] || lang }}
        </option>
      </select>
    </div>

    <div
      v-if="performanceSelectorVisible"
      class="user-dropdown-section user-dropdown-section-compact"
    >
      <div class="user-dropdown-label user-dropdown-label-icon">
        <Tooltip
          :content="appStore.t('performance.title')"
          :disabled="tooltipsDisabled"
          :delay="tooltipDelay"
        >
          <Gauge class="w-4 h-4" />
        </Tooltip>
        <span class="sr-only">{{ appStore.t("performance.title") }}</span>
      </div>
      <select v-model="performanceSelection" class="select user-dropdown-select">
        <option value="auto">{{ appStore.t("performance.auto") }}</option>
        <option value="low">{{ appStore.t("performance.low") }}</option>
        <option value="normal">{{ appStore.t("performance.normal") }}</option>
      </select>
    </div>

    <div
      v-if="actualIsAdmin && enableV0DevAdminSeams"
      class="user-dropdown-section user-dropdown-section-compact"
    >
      <div class="user-dropdown-label user-dropdown-label-icon">
        <Tooltip
          :content="appStore.t('role.switch')"
          :disabled="tooltipsDisabled"
          :delay="tooltipDelay"
        >
          <UserCog class="w-4 h-4" />
        </Tooltip>
        <span class="sr-only">{{ appStore.t("role.switch") }}</span>
      </div>
      <select v-model="roleOverrideSelection" class="select user-dropdown-select">
        <option v-for="role in roleOptions" :key="role" :value="role">
          {{ role }}
        </option>
      </select>
      <div v-if="roleOverrideActive" class="user-dropdown-note">
        {{ appStore.t("role.actingAs", { role: effectiveRole }) }}
      </div>
    </div>

    <button
      class="user-dropdown-item user-dropdown-item-danger"
      :title="appStore.t('app.logout')"
      :aria-label="appStore.t('app.logout')"
      @click="handleLogout"
    >
      <LogOut class="w-4 h-4" />
      <span>{{ appStore.t("app.logout") }}</span>
    </button>
  </div>
</template>
