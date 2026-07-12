<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ShieldCheck, TriangleAlert, Smartphone } from "@lucide/vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import {
  requestAdminElevation,
  waitForAdminElevation
} from "../lib/admin-gate.js";

// Interstitial admin authorization-gate (ADR-0034 slice b): вход в админку требует
// подтверждения на enrolled-устройстве (device_factor — companion Face ID, ADR-0030).
// Экран создаёт запрос, будит телефон, поллит status до выдачи elevation и продолжает
// на исходный admin-роут. OIDC re-auth не используем (rauthy не форсирует).

const route = useRoute();
const router = useRouter();
const appStore = useAtriumAppStore();
const { isAdmin } = storeToRefs(appStore);
const t = (key, vars = {}) => appStore.t(key, vars);

// requesting | waiting | timeout | error
const phase = ref("requesting");
const error = ref("");
let aborter = null;

// Только внутренний admin-путь, иначе дефолт — гасим open-redirect.
const safeNext = (value) => {
  const path = String(value || "");
  return path.startsWith("/admin") && !path.startsWith("//") ? path : "/admin";
};

const proceed = () => router.replace(safeNext(route.query?.next));

const start = async () => {
  error.value = "";
  phase.value = "requesting";
  aborter = new AbortController();
  try {
    const result = await requestAdminElevation();
    if (result?.elevated) {
      await proceed();
      return;
    }
    phase.value = "waiting";
    const elevated = await waitForAdminElevation({ signal: aborter.signal });
    if (elevated) {
      await proceed();
      return;
    }
    phase.value = "timeout";
  } catch (reason) {
    error.value = t("admin.gate.error", { message: reason?.message || String(reason) });
    phase.value = "error";
  }
};

onMounted(() => {
  if (isAdmin.value) start();
});

onUnmounted(() => {
  aborter?.abort();
});
</script>

<template>
  <div class="admin-elevate">
    <div class="admin-elevate__inner">
      <div class="admin-elevate__card">
        <div class="admin-elevate__icon">
          <ShieldCheck :size="22" />
        </div>
        <h1 class="admin-elevate__title">{{ t("admin.gate.title") }}</h1>

        <p v-if="!isAdmin" class="admin-elevate__intro">
          {{ t("admin.gate.forbidden") }}
        </p>

        <template v-else>
          <p class="admin-elevate__intro">{{ t("admin.gate.description") }}</p>

          <p
            v-if="phase === 'requesting' || phase === 'waiting'"
            class="admin-elevate__status"
          >
            <Smartphone :size="16" />
            <span>
              {{ phase === "requesting" ? t("admin.gate.requesting") : t("admin.gate.waiting") }}
            </span>
          </p>

          <p v-else-if="phase === 'timeout'" class="admin-elevate__status admin-elevate__status--warn">
            {{ t("admin.gate.timeout") }}
          </p>

          <p v-else-if="phase === 'error'" class="admin-elevate__status admin-elevate__status--err">
            <TriangleAlert :size="16" />
            <span>{{ error }}</span>
          </p>

          <button
            v-if="phase === 'timeout' || phase === 'error'"
            class="admin-elevate__button"
            type="button"
            @click="start"
          >
            {{ t("admin.gate.retry") }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Тот же contract, что account-хаб: собственный scroll-контейнер на высоту вьюпорта
   (`.spaces-root` = overflow-hidden), верх/низ резервируют место под fixed-хедер
   (`PlatformHeaderFrame`) и `.trust-footer-global`. */
.admin-elevate {
  position: relative;
  z-index: 10;
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  padding: 6rem clamp(1rem, 4vw, 2rem) 5rem;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1024px) {
  .admin-elevate {
    padding-top: 7.5rem;
    align-items: flex-start;
  }
}

.admin-elevate__inner {
  width: 100%;
  max-width: 30rem;
  min-width: 0;
}

.admin-elevate__card {
  display: grid;
  gap: 0.85rem;
  justify-items: start;
  padding: clamp(1.5rem, 4vw, 2rem);
  border-radius: 14px;
  background: var(--surface-1, #14151a);
  border: 1px solid var(--border-1, #2a2c33);
}

.admin-elevate__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 10px;
  color: var(--ink-primary, #f8fafc);
  background: color-mix(in srgb, var(--accent, #5b8def) 18%, transparent);
}

.admin-elevate__title {
  margin: 0;
  font-size: clamp(1.3rem, 3vw, 1.55rem);
  font-weight: 700;
  color: var(--ink-primary, #f8fafc);
}

.admin-elevate__intro {
  margin: 0;
  color: color-mix(in srgb, var(--ink-secondary, #94a3b8) 90%, transparent);
  font-size: 0.95rem;
  line-height: 1.5;
}

.admin-elevate__status {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink-secondary, #94a3b8);
}

.admin-elevate__status--warn {
  color: #e6b800;
}

.admin-elevate__status--err {
  align-items: flex-start;
  color: #f1857a;
  line-height: 1.4;
}

.admin-elevate__button {
  margin-top: 0.4rem;
  justify-self: stretch;
  background: var(--accent, #5b8def);
  color: #fff;
  border: none;
  border-radius: 9px;
  padding: 0.7rem 1.1rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
