<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import QRCode from "qrcode";
import { useCompanionDevicesStore } from "../../stores/companion-devices.js";

const props = defineProps({
  t: { type: Function, required: true },
  // Канонический SSoT-хаб устройств (atrium /account). Когда задан (панель показана не
  // на atrium-хосте, а в ассистент-табе) — управление device'ами не дублируется здесь, а
  // ведёт по ссылке туда: ряды и «Добавить устройство» становятся переходом на ssotHref.
  ssotHref: { type: String, default: "" }
});
const t = (key, vars = {}) => props.t(key, vars);

const store = useCompanionDevicesStore();
const { devices, loading, error, pairing, pending, secondsLeft } = storeToRefs(store);

// Полоска свежести кода: grant живёт ≤ 60с (ADR-0031 §4), считаем относительно этого max.
const freshnessPct = computed(() => Math.min(100, Math.max(0, (secondsLeft.value / 60) * 100)));

const qrImage = ref("");

onMounted(() => {
  store.loadDevices();
});

onBeforeUnmount(() => {
  store.stopPairing();
});

// QR рисуем из payload (origin + secret); пере-рендер при новом grant'е.
watch(
  () => pairing.value?.qrPayload,
  async (payload) => {
    if (!payload) {
      qrImage.value = "";
      return;
    }
    try {
      qrImage.value = await QRCode.toDataURL(payload, { margin: 1, width: 240 });
    } catch (e) {
      qrImage.value = "";
    }
  }
);

// У части устройств display_name приходит "localhost" (клиент не передал имя хоста) —
// показываем локализованный fallback по платформе.
const deviceName = (device) => {
  const raw = device?.display_name;
  if (raw && raw.trim().toLowerCase() !== "localhost") {
    return raw;
  }
  const platform = String(device?.platform || "").toLowerCase();
  if (platform === "macos") {
    return t("assistant.devices.fallback.macos");
  }
  if (platform === "ios") {
    return t("assistant.devices.fallback.ios");
  }
  return t("assistant.devices.fallback.other");
};

const onRevoke = (device) => {
  if (!window.confirm(t("assistant.devices.revokeConfirm", { name: device.display_name }))) {
    return;
  }
  store.revokeDevice(device.id);
};

// На ассистент-хосте «Добавить устройство» уводит в SSoT-хаб (там сам pairing-флоу);
// на atrium /account (ssotHref пуст) — разворачивает локальную карточку привязки.
const onAddDevice = () => {
  if (props.ssotHref) {
    window.location.assign(props.ssotHref);
    return;
  }
  store.startPairing();
};
const onCancelPairing = () => store.stopPairing();
const onConfirm = (grantId) => store.confirmPending(grantId);
const onReject = (grantId) => store.rejectPending(grantId);

// Desktop-компаньон (ADR-0031 §6) пэйрится вставкой кода, а не webcam-сканом QR —
// показываем тот же payload {u,s} текстом с кнопкой копирования.
const copied = ref(false);
const onCopyCode = async () => {
  const code = pairing.value?.qrPayload;
  if (!code) {
    return;
  }
  try {
    await navigator.clipboard.writeText(code);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (error) {
    // Clipboard недоступен (нет secure-context/permission) — код виден для ручного копирования.
    console.warn("clipboard write failed", error);
  }
};
</script>

<template>
  <section class="assistant-devices">
    <header class="assistant-devices__head">
      <h2 class="assistant-devices__title">{{ t("assistant.devices.title") }}</h2>
      <p class="assistant-devices__intro">{{ t("assistant.devices.intro") }}</p>
    </header>

    <p v-if="error" class="assistant-devices__error" role="alert">{{ error }}</p>

    <!-- Список устройств. Вне atrium-хоста (ssotHref задан) ряд — ссылка в SSoT-хаб. -->
    <p v-if="loading && devices.length === 0" class="assistant-devices__hint">
      {{ t("assistant.devices.loading") }}
    </p>
    <p v-else-if="devices.length === 0" class="assistant-devices__hint">
      {{ t("assistant.devices.empty") }}
    </p>
    <ul v-else class="assistant-devices__list">
      <li v-for="device in devices" :key="device.id" class="assistant-devices__item">
        <component
          :is="ssotHref ? 'a' : 'div'"
          :href="ssotHref || undefined"
          class="assistant-devices__item-main"
          :class="{ 'assistant-devices__item-main--link': ssotHref }"
        >
          <span class="assistant-devices__item-name">{{ deviceName(device) }}</span>
          <span class="assistant-devices__item-platform">{{ device.platform }}</span>
        </component>
        <div class="assistant-devices__badges">
          <span v-if="device.has_session_key" class="assistant-devices__badge">
            {{ t("assistant.devices.badge.session") }}
          </span>
          <span v-if="device.has_factor_key" class="assistant-devices__badge assistant-devices__badge--factor">
            {{ t("assistant.devices.badge.factor") }}
          </span>
        </div>
        <button type="button" class="assistant-devices__revoke" @click="onRevoke(device)">
          {{ t("assistant.devices.revoke") }}
        </button>
      </li>
    </ul>

    <!-- Низ: «Добавить устройство» внизу; карточка привязки разворачивается на месте кнопки. -->
    <div class="assistant-devices__footer">
      <transition name="assistant-devices__unfold">
        <div v-if="pairing && !ssotHref" class="assistant-devices__pairing">
          <div class="assistant-devices__qr-wrap">
            <img v-if="qrImage" :src="qrImage" :alt="t('assistant.devices.scanHint')" class="assistant-devices__qr" />
            <p class="assistant-devices__scan-hint">{{ t("assistant.devices.scanHint") }}</p>
          </div>

          <div v-if="pairing?.qrPayload" class="assistant-devices__code-wrap">
            <p class="assistant-devices__code-hint">{{ t("assistant.devices.codeHint") }}</p>
            <code class="assistant-devices__code">{{ pairing.qrPayload }}</code>
            <button type="button" class="assistant-devices__copy" @click="onCopyCode">
              {{ copied ? t("assistant.devices.copiedCode") : t("assistant.devices.copyCode") }}
            </button>
            <div v-if="!pending.length" class="assistant-devices__freshness">
              <div class="assistant-devices__freshness-track">
                <div class="assistant-devices__freshness-bar" :style="{ width: freshnessPct + '%' }"></div>
              </div>
              <span class="assistant-devices__freshness-text">
                {{ t("assistant.devices.codeExpiresIn", { seconds: secondsLeft }) }}
              </span>
            </div>
          </div>

          <div v-if="pending.length" class="assistant-devices__requests">
            <div v-for="req in pending" :key="req.grant_id" class="assistant-devices__request">
              <span class="assistant-devices__request-label">
                {{ t("assistant.devices.requestLabel", { name: req.display_name, platform: req.platform }) }}
              </span>
              <div class="assistant-devices__request-actions">
                <button type="button" class="assistant-devices__confirm" @click="onConfirm(req.grant_id)">
                  {{ t("assistant.devices.confirm") }}
                </button>
                <button type="button" class="assistant-devices__reject" @click="onReject(req.grant_id)">
                  {{ t("assistant.devices.reject") }}
                </button>
              </div>
            </div>
          </div>
          <p v-else class="assistant-devices__waiting">{{ t("assistant.devices.waiting") }}</p>

          <button type="button" class="assistant-devices__cancel" @click="onCancelPairing">
            {{ t("assistant.devices.cancelPairing") }}
          </button>
        </div>
      </transition>

      <button
        v-if="!pairing"
        type="button"
        class="assistant-devices__add assistant-devices__add--full"
        @click="onAddDevice"
      >
        {{ t("assistant.devices.add") }}
      </button>
    </div>
  </section>
</template>
