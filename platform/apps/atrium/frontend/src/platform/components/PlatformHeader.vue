<script setup>
import { computed, ref } from "vue";
import PlatformAppsMenu from "./PlatformAppsMenu.vue";
import PlatformDropdownAnchor from "./PlatformDropdownAnchor.vue";
import PlatformHeaderBrand from "./PlatformHeaderBrand.vue";
import PlatformHeaderFrame from "./PlatformHeaderFrame.vue";
import PlatformUserDropdownPanel from "./PlatformUserDropdownPanel.vue";
import PlatformUserMenuTrigger from "./PlatformUserMenuTrigger.vue";

const props = defineProps({
  product: { type: String, required: true },
  user: { type: Object, default: null },
  currentLang: { type: String, default: "ru" },
  theme: { type: String, default: "dark" },
  languageLabels: {
    type: Object,
    default: () => ({})
  },
  languageOptions: {
    type: Array,
    default: () => []
  },
  t: { type: Function, required: true },
  domain: { type: String, default: "" }
});

const emit = defineEmits(["toggle-lang", "set-lang", "set-theme", "logout"]);

const productIcons = {
  atrium: "◆",
  calendar: "◷",
  finance: "◈",
  inventory: "◫"
};

const productHref = (prefix) => {
  if (!props.domain) return "/";
  return `https://${prefix}.${props.domain}/`;
};

const userInitial = computed(() => {
  if (!props.user?.email) return "?";
  return props.user.email.charAt(0).toUpperCase();
});

const showUserDropdown = ref(false);
</script>

<template>
  <PlatformHeaderFrame variant="bar">
    <template #left>
      <PlatformHeaderBrand
        :href="productHref(product)"
        :title="t(`product.${product}`)"
        variant="flat"
      >
        <template #icon>
          {{ productIcons[product] || "◆" }}
        </template>
      </PlatformHeaderBrand>
    </template>

    <template #center>
      <slot name="center" />
    </template>

    <template #right>
      <div class="platform-header__actions">
        <PlatformAppsMenu
          :current-product="product"
          :domain="domain"
          :lang="currentLang"
        />

        <PlatformDropdownAnchor
          v-if="user"
          v-model:open="showUserDropdown"
          align="right"
        >
          <template #trigger="{ toggle }">
            <PlatformUserMenuTrigger
              :initials="userInitial"
              :open="showUserDropdown"
              :show-chevron="false"
              @click.stop="toggle"
            />
          </template>

          <template #dropdown>
            <PlatformUserDropdownPanel
              :user="user"
              :current-lang="currentLang"
              :theme="theme"
              :language-labels="languageLabels"
              :language-options="languageOptions"
              :t="t"
              :domain="domain"
              @set-lang="emit('set-lang', $event)"
              @toggle-lang="emit('toggle-lang')"
              @set-theme="emit('set-theme', $event)"
              @logout="emit('logout')"
            >
              <slot name="user-dropdown" />
            </PlatformUserDropdownPanel>
          </template>
        </PlatformDropdownAnchor>

        <a v-else class="platform-header__login" href="/login">
          {{ t("app.login") }}
        </a>
      </div>
    </template>
  </PlatformHeaderFrame>
</template>

<style scoped>
.platform-header__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.platform-header__login {
  display: inline-flex;
  align-items: center;
  padding: 0.68rem 0.9rem;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03)),
    rgba(15, 18, 24, 0.84);
}

.platform-header__login:hover {
  border-color: rgba(120, 171, 255, 0.22);
}

@media (max-width: 720px) {
  .platform-header__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
