<script setup>
import { Activity } from "lucide-vue-next";

defineProps({
  authModes: {
    type: Object,
    required: true
  },
  loginUrl: {
    type: String,
    required: true
  },
  showDevLogin: {
    type: Boolean,
    default: false
  },
  devLoginEmails: {
    type: Array,
    required: true
  },
  loginBusy: {
    type: Boolean,
    default: false
  },
  loginError: {
    type: String,
    default: ""
  },
  hasLoginOption: {
    type: Boolean,
    default: false
  },
  t: {
    type: Function,
    required: true
  }
});

defineEmits(["dev-login"]);
</script>

<template>
  <div class="login-page">
    <div class="login-panel">
      <div class="logo-pill mx-auto mb-4">
        <Activity class="w-6 h-6 text-blue-500" />
      </div>
      <h2 class="text-xl font-semibold mb-2 text-center">{{ t("auth.title") }}</h2>
      <p class="text-white/50 text-sm text-center mb-6">
        {{ t("auth.subtitle") }}
      </p>
      <div v-if="authModes.oidc" class="mt-5">
        <a class="btn btn-primary w-full justify-center" :href="loginUrl">{{ t("auth.sso") }}</a>
      </div>
      <div v-if="showDevLogin" class="mt-5">
        <div class="text-white/40 text-xs text-center mb-2">{{ t("auth.devQuick") }}</div>
        <div class="space-y-2">
          <button
            v-for="email in devLoginEmails"
            :key="email"
            class="btn btn-ghost w-full justify-center"
            type="button"
            :disabled="loginBusy"
            @click="$emit('dev-login', email)"
          >
            {{ t("auth.signInAs", { email }) }}
          </button>
        </div>
      </div>
      <div v-if="loginError" class="text-status-offline text-xs text-center mt-4">
        {{ loginError }}
      </div>
      <div class="text-white/40 text-xs text-center mt-4">
        {{ hasLoginOption ? t("auth.ssoHint") : t("auth.unavailable") }}
      </div>
      <div v-if="!hasLoginOption" class="text-white/30 text-xs text-center mt-2">
        {{ t("auth.unavailableHint") }}
      </div>
    </div>
  </div>
</template>
