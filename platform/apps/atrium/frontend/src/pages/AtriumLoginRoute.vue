<script setup>
import { storeToRefs } from "pinia";
import AtriumLoginPage from "../surfaces/AtriumLoginPage.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";

const appStore = useAtriumAppStore();
const {
  authModes,
  currentLang,
  devLoginEmails,
  hasLoginOption,
  languageLabels,
  languageSelection,
  loginBusy,
  loginError,
  loginNext,
  loginUrl,
  showDevLogin,
  supportedLangs,
  themeSelection
} = storeToRefs(appStore);
const { t } = appStore;
</script>

<template>
  <AtriumLoginPage
    :auth-modes="authModes"
    :current-lang="currentLang"
    :current-theme="themeSelection"
    :language-labels="languageLabels"
    :language-options="supportedLangs"
    :login-url="loginUrl"
    :login-next="loginNext"
    :show-dev-login="showDevLogin"
    :dev-login-emails="devLoginEmails"
    :login-busy="loginBusy"
    :login-error="loginError"
    :has-login-option="hasLoginOption"
    :t="t"
    @update:lang="languageSelection = $event"
    @update:theme="themeSelection = $event"
    @dev-login="appStore.applyDevLogin"
  />
</template>
