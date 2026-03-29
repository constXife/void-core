<script setup>
import { storeToRefs } from "pinia";
import AtriumLoginPage from "../surfaces/AtriumLoginPage.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";

const appStore = useAtriumAppStore();
const {
  authModes,
  devLoginEmails,
  hasLoginOption,
  loginBusy,
  loginError,
  loginUrl,
  showDevLogin
} = storeToRefs(appStore);
const { t } = appStore;
</script>

<template>
  <AtriumLoginPage
    :auth-modes="authModes"
    :login-url="loginUrl"
    :show-dev-login="showDevLogin"
    :dev-login-emails="devLoginEmails"
    :login-busy="loginBusy"
    :login-error="loginError"
    :has-login-option="hasLoginOption"
    :t="t"
    @dev-login="appStore.applyDevLogin"
  />
</template>
