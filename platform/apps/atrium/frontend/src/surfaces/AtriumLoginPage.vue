<script setup>
import PlatformAuthCard from "../platform/components/PlatformAuthCard.vue";

defineProps({
  authModes: {
    type: Object,
    required: true
  },
  currentLang: {
    type: String,
    default: "ru"
  },
  currentTheme: {
    type: String,
    default: "auto"
  },
  loginUrl: {
    type: String,
    required: true
  },
  languageLabels: {
    type: Object,
    default: () => ({})
  },
  languageOptions: {
    type: Array,
    default: () => []
  },
  loginNext: {
    type: String,
    default: "/"
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

defineEmits(["dev-login", "update:lang", "update:theme"]);
</script>

<template>
  <PlatformAuthCard
    :title="t('app.title')"
    :subtitle="t('auth.subtitle')"
    :hint="t('auth.returnHint', { next: loginNext })"
    :current-lang="currentLang"
    :current-theme="currentTheme"
    :language-labels="languageLabels"
    :language-options="languageOptions"
    :t="t"
    @update:lang="$emit('update:lang', $event)"
    @update:theme="$emit('update:theme', $event)"
  >
    <div class="atrium-login-page__actions">
      <a v-if="authModes.oidc" class="atrium-login-page__primary" :href="loginUrl">
        {{ t("auth.sso") }}
      </a>

      <div v-if="showDevLogin" class="atrium-login-page__dev">
        <div class="atrium-login-page__dev-title">{{ t("auth.devQuick") }}</div>
        <div class="atrium-login-page__dev-actions">
          <button
            v-for="email in devLoginEmails"
            :key="email"
            class="atrium-login-page__secondary"
            type="button"
            :disabled="loginBusy"
            @click="$emit('dev-login', email)"
          >
            {{ t("auth.signInAs", { email }) }}
          </button>
        </div>
      </div>

      <div v-if="loginError" class="atrium-login-page__error">
        {{ loginError }}
      </div>

      <p class="atrium-login-page__note">
        {{ hasLoginOption ? t("auth.ssoHint") : t("auth.unavailable") }}
      </p>
      <p v-if="!hasLoginOption" class="atrium-login-page__note atrium-login-page__note--muted">
        {{ t("auth.unavailableHint") }}
      </p>
    </div>
  </PlatformAuthCard>
</template>

<style scoped>
.atrium-login-page__actions {
  display: grid;
  gap: 14px;
}

.atrium-login-page__primary,
.atrium-login-page__secondary {
  width: 100%;
  min-height: 48px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-weight: 600;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}

.atrium-login-page__primary {
  border: 1px solid color-mix(in srgb, #facc15 22%, var(--border-default, rgba(255, 255, 255, 0.1)));
  background: linear-gradient(180deg, rgba(250, 204, 21, 0.18), rgba(250, 204, 21, 0.12));
  color: var(--ink-primary, #e6edf3);
}

.atrium-login-page__primary:hover,
.atrium-login-page__secondary:hover {
  transform: translateY(-1px);
}

.atrium-login-page__secondary {
  border: 1px solid color-mix(in srgb, var(--border-default, rgba(255, 255, 255, 0.1)) 82%, transparent);
  background: color-mix(in srgb, var(--surface-overlay, #1a222c) 86%, transparent);
  color: var(--ink-primary, #e6edf3);
}

.atrium-login-page__dev {
  display: grid;
  gap: 10px;
}

.atrium-login-page__dev-title {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--ink-secondary, #7d8590) 78%, transparent);
}

.atrium-login-page__dev-actions {
  display: grid;
  gap: 8px;
}

.atrium-login-page__error {
  color: #fca5a5;
  font-size: 13px;
  line-height: 1.5;
}

.atrium-login-page__note {
  margin: 0;
  color: color-mix(in srgb, var(--ink-secondary, #7d8590) 82%, transparent);
  font-size: 13px;
  line-height: 1.55;
}

.atrium-login-page__note--muted {
  color: color-mix(in srgb, var(--ink-secondary, #7d8590) 68%, transparent);
}
</style>
