<script setup>
import { computed, onMounted, ref } from "vue";
import { LayoutGrid, Check } from "@lucide/vue";
import PlatformDropdownAnchor from "./PlatformDropdownAnchor.vue";
import { loadProductCatalog } from "./platformAppsCatalog.js";

const props = defineProps({
  currentProduct: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    default: ""
  },
  lang: {
    type: String,
    default: "ru"
  },
  products: {
    type: Array,
    default: undefined
  },
  catalogPath: {
    type: String,
    default: "/product-catalog.json"
  }
});

const localized = computed(() => {
  if (props.lang === "ru") {
    return {
      title: "Приложения",
      unavailable: "Недоступно в текущем окружении"
    };
  }

  return {
    title: "Apps",
    unavailable: "Unavailable in the current environment"
  };
});

const workspaceProducts = ref([]);
const open = ref(false);

const sourceProducts = computed(() =>
  Array.isArray(props.products) ? props.products : workspaceProducts.value
);

const productKeys = computed(() =>
  sourceProducts.value
    .map((item) => String(item?.key || "").trim().toLowerCase())
    .filter(Boolean)
);

const items = computed(() =>
  sourceProducts.value
    .map((item) => {
      const key = String(item?.key || "").trim().toLowerCase();
      if (!key) return null;
      return {
        key,
        accent: item?.accent || key[0]?.toUpperCase() || "?",
        href: item?.href || resolveProductHref(key),
        icon: item?.icon,
        label: item?.label || key
      };
    })
    .filter(Boolean)
);

onMounted(async () => {
  if (Array.isArray(props.products)) return;
  workspaceProducts.value = await loadProductCatalog(props.catalogPath, props.lang);
});

function resolveProductHref(productKey) {
  if (props.domain) {
    return `https://${productKey}.${props.domain}/`;
  }

  if (typeof window === "undefined") {
    return productKey === props.currentProduct ? "/" : "";
  }

  const { protocol, hostname, port, origin } = window.location;
  if (productKey === props.currentProduct) {
    return `${origin}/`;
  }

  const normalizedHost = String(hostname || "").trim().toLowerCase();
  const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalizedHost);
  if (!normalizedHost || normalizedHost === "localhost" || isIpv4 || !normalizedHost.includes(".")) {
    return "";
  }

  const labels = normalizedHost.split(".");
  if (labels.length >= 3 && productKeys.value.includes(labels[0])) {
    labels[0] = productKey;
    return `${protocol}//${labels.join(".")}${port ? `:${port}` : ""}/`;
  }

  return `${protocol}//${productKey}.${normalizedHost}${port ? `:${port}` : ""}/`;
}
</script>

<template>
  <PlatformDropdownAnchor v-model:open="open" align="right" panel-class="platform-apps-menu__panel">
    <template #trigger="{ toggle }">
      <button
        class="platform-apps-menu__trigger"
        type="button"
        :aria-label="localized.title"
        :title="localized.title"
        :aria-expanded="open"
        @click.stop="toggle"
      >
        <LayoutGrid :size="17" />
      </button>
    </template>

    <template #dropdown="{ close }">
      <div class="platform-apps-menu">
        <div class="platform-apps-menu__title">{{ localized.title }}</div>

        <div class="platform-apps-menu__grid">
          <component
            :is="item.href ? 'a' : 'button'"
            v-for="item in items"
            :key="item.key"
            class="platform-apps-menu__item"
            :class="{
              'platform-apps-menu__item--active': item.key === currentProduct,
              'platform-apps-menu__item--disabled': !item.href
            }"
            :href="item.href || undefined"
            :aria-current="item.key === currentProduct ? 'page' : undefined"
            :type="item.href ? undefined : 'button'"
            :disabled="!item.href"
            :title="!item.href ? localized.unavailable : item.label"
            @click="close"
          >
            <span class="platform-apps-menu__item-icon">
              <img
                v-if="item.icon?.src"
                class="platform-apps-menu__item-icon-image"
                :src="item.icon.src"
                alt=""
                aria-hidden="true"
              />
              <span v-else>{{ item.accent }}</span>
            </span>
            <span class="platform-apps-menu__item-label">{{ item.label }}</span>
            <Check v-if="item.key === currentProduct" :size="16" aria-hidden="true" />
          </component>
        </div>
      </div>
    </template>
  </PlatformDropdownAnchor>
</template>

<style scoped>
:deep(.platform-apps-menu__panel) { width: min(280px, calc(100vw - 24px)); }
.platform-apps-menu__trigger {
  width: 44px; height: 44px; display: grid; place-items: center; border: 0; border-radius: 8px;
  background: transparent; color: var(--ink-secondary); cursor: pointer;
}
.platform-apps-menu__trigger:hover { background: var(--surface-overlay); color: var(--ink-primary); }
.platform-apps-menu {
  padding: 8px; border-radius: 12px; border: 1px solid var(--border-default);
  background: var(--surface-raised); box-shadow: 0 16px 40px #0004;
  max-height: min(560px, calc(100dvh - 88px)); overflow-y: auto;
}
.platform-apps-menu__title { padding: 8px; color: var(--ink-secondary); font-size: 13px; }
.platform-apps-menu__grid { display: grid; gap: 4px; }
.platform-apps-menu__item {
  display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 8px;
  border-radius: 8px; border: 0; background: transparent; color: var(--ink-primary);
  text-decoration: none; text-align: start; cursor: pointer;
}
.platform-apps-menu__item:hover, .platform-apps-menu__item--active { background: var(--surface-overlay); }
.platform-apps-menu__item--disabled { opacity: 0.5; cursor: default; }
.platform-apps-menu__item-icon {
  width: 32px; height: 32px; display: grid; place-items: center; flex: 0 0 auto;
  border-radius: 8px; background: var(--surface-overlay); color: var(--ink-secondary); font-size: 14px;
}
.platform-apps-menu__item-icon-image { width: 24px; height: 24px; object-fit: contain; }
.platform-apps-menu__item-label { flex: 1; font-size: 14px; font-weight: 500; overflow-wrap: anywhere; }
.platform-apps-menu__trigger:focus-visible, .platform-apps-menu__item:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: -2px; }
</style>
