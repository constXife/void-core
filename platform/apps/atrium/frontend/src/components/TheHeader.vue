<script setup>
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from "lucide-vue-next";
import { storeToRefs } from "pinia";
import UserDropdown from "./UserDropdown.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { useAuthStore } from "../stores/auth.js";
import { useSpaceStore } from "../stores/space.js";
import { useUiStore } from "../stores/ui.js";

const appStore = useAtriumAppStore();
const authStore = useAuthStore();
const spaceStore = useSpaceStore();
const uiStore = useUiStore();

const { userMenuRef } = storeToRefs(appStore);
const { t } = appStore;
const { authEnabled, loginPageUrl, me, userInitials } = storeToRefs(authStore);
const {
  currentSpace,
  hasNextSpaces,
  hasPrevSpaces,
  nextSpace,
  prevSpace,
  spacePickerOpen,
  spaces
} = storeToRefs(spaceStore);
const {
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
  <header class="spaces-header">
    <a href="/" class="brand-link" @click.prevent="openHome">
      <div class="logo-pill">
        <Activity class="w-5 h-5 text-accent" />
      </div>
      <div>
        <div class="text-lg font-semibold tracking-tight">{{ t("app.title") }}</div>
        <div class="text-[11px] text-white/40 uppercase tracking-widest">{{ t("app.spaces") }}</div>
      </div>
    </a>

    <div v-if="spaces.length > 1" class="space-switcher-container">
      <div class="space-switcher-row" :class="{ 'has-prev': hasPrevSpaces, 'has-next': hasNextSpaces }">
        <button
          v-if="prevSpace"
          class="space-switcher-side space-switcher-side-prev hidden md:flex"
          @click="spaceStore.selectSpace(prevSpace)"
        >
          <ChevronLeft class="space-switcher-side-chevron" />
          <span class="space-switcher-side-icon">{{ spaceStore.spaceIconLabel(prevSpace) }}</span>
          <span class="space-switcher-side-title">{{ prevSpace.title }}</span>
        </button>

        <button class="space-switcher-trigger" @click="spaceStore.toggleSpacePicker()">
          <Transition name="space-center" mode="out-in">
            <span :key="`center-icon-${currentSpace?.id || 'none'}`" class="space-switcher-icon">
              {{ spaceStore.spaceIconLabel(currentSpace) }}
            </span>
          </Transition>
          <Transition name="space-center" mode="out-in">
            <span :key="`center-text-${currentSpace?.id || 'none'}`" class="space-switcher-text">
              <span class="space-switcher-title">{{ currentSpace?.title || t("app.spaces") }}</span>
              <span v-if="spaceStore.spaceMetaLabel(currentSpace)" class="space-switcher-subtitle">
                {{ spaceStore.spaceMetaLabel(currentSpace) }}
              </span>
            </span>
          </Transition>
          <ChevronDown class="w-4 h-4 text-white/40" :class="{ 'rotate-180': spacePickerOpen }" />
        </button>

        <button
          v-if="nextSpace"
          class="space-switcher-side space-switcher-side-next hidden md:flex"
          @click="spaceStore.selectSpace(nextSpace)"
        >
          <span class="space-switcher-side-icon">{{ spaceStore.spaceIconLabel(nextSpace) }}</span>
          <span class="space-switcher-side-title">{{ nextSpace.title }}</span>
          <ChevronRight class="space-switcher-side-chevron" />
        </button>
      </div>
    </div>

    <div class="header-actions">
      <div class="header-tools">
        <select
          v-if="languageSwitcherVisible && languageSwitcherMode === 'header'"
          v-model="languageSelection"
          class="select text-xs"
          :aria-label="t('language.title')"
        >
          <option v-for="lang in Object.keys(languageLabels)" :key="lang" :value="lang">
            {{ languageLabels[lang] || lang }}
          </option>
        </select>
      </div>

      <div class="header-divider"></div>

      <template v-if="authEnabled">
        <template v-if="me">
          <div ref="userMenuRef" class="user-menu-container">
            <button class="user-menu-trigger" @click="showUserDropdown = !showUserDropdown">
              <div class="user-avatar">{{ userInitials }}</div>
              <ChevronDown class="w-3 h-3 text-white/40" :class="{ 'rotate-180': showUserDropdown }" />
            </button>
            <Transition name="dropdown">
              <UserDropdown v-if="showUserDropdown" />
            </Transition>
          </div>
        </template>
        <template v-else>
          <a class="btn btn-primary" :href="loginPageUrl">{{ t("app.login") }}</a>
        </template>
      </template>
    </div>
  </header>
</template>
