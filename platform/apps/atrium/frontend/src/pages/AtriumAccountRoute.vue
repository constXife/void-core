<script setup>
import { ref } from "vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import AssistantDevicesPanel from "../surfaces/assistant-standalone/AssistantDevicesPanel.vue";
import AtriumSessionsPanel from "../surfaces/AtriumSessionsPanel.vue";

// Atrium account-хаб (ADR-0032 §5a / ADR-0033 §7): платформенный раздел
// «Устройства» + «Сессии» на atrium-поверхности (не assistant-таб). Devices-панель
// переиспользована из assistant-standalone (store same-origin → atrium backend);
// sessions-панель — реестр web-сессий. Разведены по вкладкам, чтобы страница не была
// длинной стопкой и контент не упирался в fixed-хедер/футер.

const appStore = useAtriumAppStore();
const { t } = appStore;

const activeTab = ref("devices");
</script>

<template>
  <div class="atrium-account">
    <div class="atrium-account__inner">
      <header class="atrium-account__head">
        <h1 class="atrium-account__title">{{ t("account.title") }}</h1>
        <p class="atrium-account__intro">{{ t("account.intro") }}</p>
      </header>

      <nav class="atrium-account__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="atrium-account__tab"
          :class="{ 'atrium-account__tab--active': activeTab === 'devices' }"
          :aria-selected="activeTab === 'devices'"
          @click="activeTab = 'devices'"
        >
          {{ t("account.tab.devices") }}
        </button>
        <button
          type="button"
          role="tab"
          class="atrium-account__tab"
          :class="{ 'atrium-account__tab--active': activeTab === 'sessions' }"
          :aria-selected="activeTab === 'sessions'"
          @click="activeTab = 'sessions'"
        >
          {{ t("account.tab.sessions") }}
        </button>
      </nav>

      <div class="atrium-account__sections">
        <AssistantDevicesPanel v-if="activeTab === 'devices'" :t="t" />
        <AtriumSessionsPanel v-else :t="t" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Account-хаб = СВОЙ вертикальный scroll-контейнер на высоту вьюпорта. Документ в
   этом shell'е НЕ скроллит (`.spaces-root` = overflow-hidden, как у home `stage-scroll`),
   поэтому страница обязана скроллиться сама, иначе контент клипается и налезает на
   fixed-футер. Shell-chrome — fixed overlay поверх (z под ними): хедер сверху
   (`position:fixed`, на ≤1024px стекается → выше) и `.trust-footer-global` снизу
   (`position:fixed; bottom:0`). Верхний/нижний padding scroll-контейнера резервирует
   место под них: заголовок не лезет под хедер, последняя карточка докручивается над
   футером. */
.atrium-account {
  position: relative;
  z-index: 10;
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  padding: 7.5rem clamp(1rem, 4vw, 2rem) 6.5rem;
  box-sizing: border-box;
}

/* Overlay-хедер на узких экранах стекается (center → order 3) и становится выше —
   увеличиваем верхний clearance, чтобы заголовок не подлезал под него. */
@media (max-width: 1024px) {
  .atrium-account {
    padding-top: 9rem;
  }
}

@media (max-width: 640px) {
  .atrium-account {
    padding-inline: 1rem;
  }
}

/* Центрированная читаемая колонка внутри scroll-контейнера. */
.atrium-account__inner {
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  display: grid;
  gap: clamp(1.75rem, 4vw, 2.5rem);
  min-width: 0;
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

/* Вкладки Устройства/Сессии — подчёркивание активной, без длинной стопки. */
.atrium-account__tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.18));
}

.atrium-account__tab {
  appearance: none;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  padding: 0.6rem 0.95rem;
  color: var(--ink-secondary, #94a3b8);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.atrium-account__tab:hover {
  color: var(--ink-primary, #f8fafc);
}

.atrium-account__tab--active {
  color: var(--ink-primary, #f8fafc);
  border-bottom-color: var(--accent-purple, #a78bfa);
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
