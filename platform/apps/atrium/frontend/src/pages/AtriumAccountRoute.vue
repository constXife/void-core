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
/* Account-хаб = центрированная читаемая колонка в обычном потоке документа
   (`.spaces-root` = min-h-screen + overflow-hidden → скроллит документ). Shell-chrome
   — fixed overlay: хедер сверху (`position:fixed`, на ≤1024px стекается → выше) и
   `.trust-footer-global` снизу (`position:fixed; bottom:0`). Поэтому верхний/нижний
   отступы резервируют место под них, а не упираются в них. */
.atrium-account {
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  padding: 6rem clamp(1rem, 4vw, 2rem) 5rem;
  display: grid;
  gap: clamp(1.75rem, 4vw, 2.5rem);
  box-sizing: border-box;
}

/* Overlay-хедер на узких экранах стекается (center → order 3) и становится выше —
   увеличиваем верхний clearance, чтобы заголовок не подлезал под него. */
@media (max-width: 1024px) {
  .atrium-account {
    padding-top: 7.5rem;
  }
}

@media (max-width: 640px) {
  .atrium-account {
    padding-inline: 1rem;
  }
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
  gap: clamp(1.75rem, 4vw, 2.5rem);
  min-width: 0;
}

/* Панели переиспользуют визуал `assistant-devices__*`, но их собственное
   self-centering (max-width:48rem + margin:auto + padding) внутри уже центрированной
   колонки давало двойное центрирование и рассинхрон с заголовком. Нейтрализуем —
   панель заполняет колонку account-хаба. `min-width:0` (тут и на секциях) гасит
   min-content blowout от длинного user-agent в сессии. */
.atrium-account__sections > * {
  min-width: 0;
}

.atrium-account :deep(.assistant-devices) {
  max-width: none;
  min-width: 0;
  margin: 0;
  padding: 0;
}
</style>
