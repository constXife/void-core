<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ShieldCheck, TriangleAlert } from "lucide-vue-next";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import {
  elevateAdminGate,
  redirectToAdminStepUp,
  AdminStepUpRequiredError
} from "../lib/admin-gate.js";

// Interstitial admin authorization-gate (ADR-0034 slice b): вход в админку требует свежего
// OIDC step-up. Экран объясняет необходимость re-auth и уводит на него; после возврата
// (?stepped=1) молча конвертирует свежий re-auth в elevation и продолжает на исходный роут.

const route = useRoute();
const router = useRouter();
const appStore = useAtriumAppStore();
const { isAdmin } = storeToRefs(appStore);
const t = (key, vars = {}) => appStore.t(key, vars);

const NEXT_KEY = "atrium:admin-gate:next";

const working = ref(false);
const error = ref("");

// Только внутренний admin-путь, иначе дефолт — гасим open-redirect.
const safeNext = (value) => {
  const path = String(value || "");
  return path.startsWith("/admin") && !path.startsWith("//") ? path : "/admin";
};

const onElevate = () => {
  error.value = "";
  sessionStorage.setItem(NEXT_KEY, safeNext(route.query?.next));
  redirectToAdminStepUp();
};

onMounted(async () => {
  if (String(route.query?.stepped || "") !== "1") return;
  const next = safeNext(sessionStorage.getItem(NEXT_KEY));
  sessionStorage.removeItem(NEXT_KEY);
  working.value = true;
  error.value = "";
  try {
    await elevateAdminGate();
    await router.replace(next);
  } catch (reason) {
    // re-auth оказался несвежим (>120s) — не зацикливаемся, показываем кнопку повторить.
    error.value =
      reason instanceof AdminStepUpRequiredError
        ? t("admin.gate.stepupStale")
        : t("admin.gate.error", { message: reason?.message || String(reason) });
  } finally {
    working.value = false;
  }
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
          <p class="admin-elevate__notice">{{ t("admin.gate.notice") }}</p>

          <p v-if="error" class="admin-elevate__error">
            <TriangleAlert :size="16" />
            <span>{{ error }}</span>
          </p>

          <button
            class="admin-elevate__button"
            type="button"
            :disabled="working"
            @click="onElevate"
          >
            {{ working ? t("admin.gate.working") : t("admin.gate.button") }}
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

.admin-elevate__notice {
  margin: 0;
  font-size: 0.82rem;
  color: var(--ink-secondary, #94a3b8);
}

.admin-elevate__error {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  margin: 0;
  color: #f1857a;
  font-size: 0.88rem;
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

.admin-elevate__button:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
