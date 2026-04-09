<script setup>
import { computed } from "vue";

const props = defineProps({
  product: { type: String, required: true },
  user: { type: Object, default: null },
  currentLang: { type: String, default: "ru" },
  t: { type: Function, required: true },
  domain: { type: String, default: "" }
});

const emit = defineEmits(["lang-change", "logout"]);

const products = [
  { key: "atrium", icon: "◆", prefix: "atrium" },
  { key: "calendar", icon: "◷", prefix: "calendar" },
  { key: "finance", icon: "◈", prefix: "finance" },
  { key: "inventory", icon: "◫", prefix: "inventory" }
];

const productHref = (prefix) => {
  if (!props.domain) return "/";
  return `https://${prefix}.${props.domain}/`;
};

const userInitial = computed(() => {
  if (!props.user?.email) return "?";
  return props.user.email.charAt(0).toUpperCase();
});

const langOptions = ["en", "ru"];
const otherLang = computed(() => props.currentLang === "ru" ? "en" : "ru");
</script>

<template>
  <header class="platform-header">
    <div class="platform-header-left">
      <span class="platform-header-product-icon">{{ products.find(p => p.key === product)?.icon || '◆' }}</span>
      <span class="platform-header-product-name">{{ t(`product.${product}`) }}</span>
    </div>

    <nav class="platform-header-nav">
      <a
        v-for="p in products"
        :key="p.key"
        :href="productHref(p.prefix)"
        class="platform-header-nav-item"
        :class="{ 'platform-header-nav-item--active': p.key === product }"
        :title="t(`product.${p.key}`)"
      >
        <span class="platform-header-nav-icon">{{ p.icon }}</span>
      </a>
    </nav>

    <div class="platform-header-right">
      <button
        class="platform-header-lang"
        type="button"
        :title="t(`language.${otherLang}`)"
        @click="emit('lang-change', otherLang)"
      >
        {{ currentLang.toUpperCase() }}
      </button>

      <div v-if="user" class="platform-header-user">
        <button class="platform-header-avatar" type="button">
          {{ userInitial }}
        </button>
      </div>
      <a v-else class="platform-header-login" href="/login">
        {{ t("app.login") }}
      </a>
    </div>
  </header>
</template>

<style scoped>
.platform-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4, 16px);
  padding: var(--space-3, 12px) var(--space-5, 20px);
  background: var(--surface-raised, #131920);
  border-bottom: 1px solid var(--border-muted, rgba(255, 255, 255, 0.06));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 30;
}

.platform-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
}

.platform-header-product-icon {
  font-size: 18px;
  line-height: 1;
  color: var(--accent-primary, #58a6ff);
}

.platform-header-product-name {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--ink-primary, #e6edf3);
}

.platform-header-nav {
  display: flex;
  align-items: center;
  gap: var(--space-1, 4px);
  padding: 3px;
  border-radius: var(--density-radius-sm, 12px);
  background: var(--glass-bg, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
}

.platform-header-nav-item {
  display: grid;
  place-items: center;
  width: 32px;
  height: 28px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  color: var(--ink-muted, #484f58);
  transition: all var(--duration-fast, 150ms) ease;
}

.platform-header-nav-item:hover {
  color: var(--ink-secondary, #7d8590);
  background: var(--glass-bg-hover, rgba(255, 255, 255, 0.1));
}

.platform-header-nav-item--active {
  color: var(--accent-primary, #58a6ff);
  background: rgba(88, 166, 255, 0.12);
}

.platform-header-nav-icon {
  line-height: 1;
}

.platform-header-right {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
}

.platform-header-lang {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--ink-muted, #484f58);
  background: transparent;
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
  cursor: pointer;
  transition: all var(--duration-fast, 150ms) ease;
}

.platform-header-lang:hover {
  color: var(--ink-secondary, #7d8590);
  background: var(--glass-bg-hover, rgba(255, 255, 255, 0.1));
}

.platform-header-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  color: var(--ink-primary, #e6edf3);
  background: linear-gradient(135deg, rgba(88, 166, 255, 0.3), rgba(163, 113, 247, 0.3));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
  cursor: pointer;
}

.platform-header-login {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: var(--text-sm, 13px);
  color: var(--accent-primary, #58a6ff);
  text-decoration: none;
  border: 1px solid rgba(88, 166, 255, 0.3);
  transition: all var(--duration-fast, 150ms) ease;
}

.platform-header-login:hover {
  background: rgba(88, 166, 255, 0.12);
}

@media (max-width: 640px) {
  .platform-header-nav {
    display: none;
  }

  .platform-header-product-name {
    font-size: var(--text-base, 14px);
  }
}
</style>
