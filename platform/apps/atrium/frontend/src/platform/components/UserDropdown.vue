<script setup>
import { computed, ref } from "vue";
import PlatformDropdownAnchor from "./PlatformDropdownAnchor.vue";
import PlatformUserDropdownPanel from "./PlatformUserDropdownPanel.vue";
import PlatformUserMenuTrigger from "./PlatformUserMenuTrigger.vue";
import { resolvePlatformUserIdentity } from "../account.js";

const props = defineProps({
  user: { type: Object, default: null },
  currentLang: { type: String, required: true },
  theme: { type: String, required: true },
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

const showDropdown = ref(false);
const account = computed(() => resolvePlatformUserIdentity(props.user));

</script>

<template>
  <PlatformDropdownAnchor
    v-if="account"
    v-model:open="showDropdown"
    align="right"
  >
    <template #trigger="{ toggle }">
      <PlatformUserMenuTrigger
        :user="user"
        :open="showDropdown"
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
        <slot />
        <template v-if="$slots['account-actions']" #account-actions>
          <slot name="account-actions" />
        </template>
      </PlatformUserDropdownPanel>
    </template>
  </PlatformDropdownAnchor>
</template>
