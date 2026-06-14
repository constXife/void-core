<script setup>
import { useAtriumAppStore } from "../stores/atrium-app.js";
import AssistantDevicesPanel from "../surfaces/assistant-standalone/AssistantDevicesPanel.vue";
import AtriumSessionsPanel from "../surfaces/AtriumSessionsPanel.vue";

// Atrium account-хаб (ADR-0032 §5a / ADR-0033 §7): платформенный раздел
// «Устройства» + «Сессии» на atrium-поверхности (не assistant-таб). Devices-панель
// переиспользована из assistant-standalone (store same-origin → atrium backend);
// sessions-панель — реестр web-сессий.

const appStore = useAtriumAppStore();
const { t } = appStore;
</script>

<template>
  <div class="atrium-account">
    <header class="atrium-account__head">
      <h1 class="atrium-account__title">{{ t("account.title") }}</h1>
      <p class="atrium-account__intro">{{ t("account.intro") }}</p>
    </header>

    <div class="atrium-account__sections">
      <AssistantDevicesPanel :t="t" />
      <AtriumSessionsPanel :t="t" />
    </div>
  </div>
</template>

<style scoped>
.atrium-account {
  max-width: 760px;
  margin: 0 auto;
  padding: clamp(1.5rem, 4vw, 3rem) 1.25rem 4rem;
  display: grid;
  gap: 2rem;
}

.atrium-account__head {
  display: grid;
  gap: 0.4rem;
}

.atrium-account__title {
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 1.7rem);
  font-weight: 700;
  color: var(--ink-primary, #f8fafc);
}

.atrium-account__intro {
  margin: 0;
  color: color-mix(in srgb, var(--ink-secondary, #94a3b8) 88%, transparent);
  font-size: 0.95rem;
  line-height: 1.5;
}

.atrium-account__sections {
  display: grid;
  gap: 2.5rem;
}
</style>
