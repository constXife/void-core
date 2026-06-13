<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import QRCode from "qrcode";
import { useCompanionDevicesStore } from "../../stores/companion-devices.js";

const props = defineProps({
  t: { type: Function, required: true }
});
const t = (key, vars = {}) => props.t(key, vars);

const store = useCompanionDevicesStore();
const { devices, loading, error, pairing, pending } = storeToRefs(store);

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

const onRevoke = (device) => {
  if (!window.confirm(t("assistant.devices.revokeConfirm", { name: device.display_name }))) {
    return;
  }
  store.revokeDevice(device.id);
};

const onAddDevice = () => store.startPairing();
const onCancelPairing = () => store.stopPairing();
const onConfirm = (grantId) => store.confirmPending(grantId);
const onReject = (grantId) => store.rejectPending(grantId);
</script>

<template>
  <section class="assistant-devices">
    <header class="assistant-devices__head">
      <div>
        <h2 class="assistant-devices__title">{{ t("assistant.devices.title") }}</h2>
        <p class="assistant-devices__intro">{{ t("assistant.devices.intro") }}</p>
      </div>
      <button v-if="!pairing" type="button" class="assistant-devices__add" @click="onAddDevice">
        {{ t("assistant.devices.add") }}
      </button>
    </header>

    <p v-if="error" class="assistant-devices__error" role="alert">{{ error }}</p>

    <!-- Pairing: QR + ожидание подтверждения -->
    <div v-if="pairing" class="assistant-devices__pairing">
      <div class="assistant-devices__qr-wrap">
        <img v-if="qrImage" :src="qrImage" :alt="t('assistant.devices.scanHint')" class="assistant-devices__qr" />
        <p class="assistant-devices__scan-hint">{{ t("assistant.devices.scanHint") }}</p>
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

    <!-- Список устройств -->
    <p v-if="loading && devices.length === 0" class="assistant-devices__hint">
      {{ t("assistant.devices.loading") }}
    </p>
    <p v-else-if="devices.length === 0" class="assistant-devices__hint">
      {{ t("assistant.devices.empty") }}
    </p>
    <ul v-else class="assistant-devices__list">
      <li v-for="device in devices" :key="device.id" class="assistant-devices__item">
        <div class="assistant-devices__item-main">
          <span class="assistant-devices__item-name">{{ device.display_name }}</span>
          <span class="assistant-devices__item-platform">{{ device.platform }}</span>
        </div>
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
  </section>
</template>
