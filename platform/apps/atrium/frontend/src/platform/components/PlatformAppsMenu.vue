<script setup>
import { computed, onMounted, ref } from "vue";
import { LayoutGrid } from "lucide-vue-next";
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
            :type="item.href ? undefined : 'button'"
            :disabled="!item.href"
            :title="!item.href ? localized.unavailable : item.label"
            @click="close"
          >
            <span class="platform-apps-menu__item-icon">{{ item.accent }}</span>
            <span class="platform-apps-menu__item-label">{{ item.label }}</span>
          </component>
        </div>
      </div>
    </template>
  </PlatformDropdownAnchor>
</template>

<style scoped>
:deep(.platform-apps-menu__panel) {
  width: min(18rem, calc(100vw - 1.5rem));
}

.platform-apps-menu__trigger {
  width: 2.5rem;
  height: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
    rgba(15, 18, 24, 0.84);
  color: rgba(236, 240, 255, 0.8);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 10px 24px rgba(0, 0, 0, 0.2);
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.platform-apps-menu__trigger:hover {
  color: rgba(255, 255, 255, 0.96);
  border-color: rgba(120, 171, 255, 0.26);
  transform: translateY(-1px);
}

.platform-apps-menu {
  padding: 0.8rem;
  border-radius: 1.15rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    radial-gradient(circle at top, rgba(88, 166, 255, 0.14), transparent 52%),
    rgba(15, 18, 24, 0.94);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}

.platform-apps-menu__title {
  margin-bottom: 0.6rem;
  color: rgba(255, 255, 255, 0.54);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.platform-apps-menu__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}

.platform-apps-menu__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.55rem;
  min-height: 5.6rem;
  padding: 0.8rem;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(247, 249, 255, 0.86);
  text-decoration: none;
  text-align: left;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease;
}

.platform-apps-menu__item:hover {
  border-color: rgba(120, 171, 255, 0.24);
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-1px);
}

.platform-apps-menu__item--active {
  border-color: rgba(120, 171, 255, 0.35);
  background:
    linear-gradient(180deg, rgba(88, 166, 255, 0.16), rgba(88, 166, 255, 0.05)),
    rgba(255, 255, 255, 0.04);
}

.platform-apps-menu__item--disabled {
  opacity: 0.48;
  cursor: default;
}

.platform-apps-menu__item-icon {
  width: 2.1rem;
  height: 2.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.85rem;
  font-weight: 700;
}

.platform-apps-menu__item-label {
  font-size: 0.88rem;
  font-weight: 600;
}
</style>
