<script setup>
import { ChevronDown } from "@lucide/vue";
import PlatformUserAvatar from "./PlatformUserAvatar.vue";

defineProps({
  user: {
    type: Object,
    default: null
  },
  initials: {
    type: String,
    default: ""
  },
  avatarSize: {
    type: String,
    default: "sm"
  },
  open: {
    type: Boolean,
    default: false
  },
  showChevron: {
    type: Boolean,
    default: true
  }
});
</script>

<template>
  <button class="platform-user-menu-trigger" type="button">
    <slot name="avatar">
      <PlatformUserAvatar v-if="user" :user="user" :size="avatarSize" />
      <span v-else class="platform-user-menu-trigger__avatar">
        {{ initials }}
      </span>
    </slot>

    <slot name="label" />

    <ChevronDown
      v-if="showChevron"
      class="platform-user-menu-trigger__chevron"
      :class="{ 'platform-user-menu-trigger__chevron--open': open }"
    />
  </button>
</template>

<style scoped>
.platform-user-menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 44px;
  min-height: 44px;
  justify-content: center;
  padding: 4px;
  border-radius: 8px;
  border: 0;
  background: transparent;
  color: var(--ink-primary);
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}

.platform-user-menu-trigger:hover { background: var(--surface-overlay); }

.platform-user-menu-trigger__avatar {
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(88, 166, 255, 0.34), rgba(163, 113, 247, 0.34));
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.95);
  font-size: 0.74rem;
  font-weight: 700;
}

.platform-user-menu-trigger__chevron {
  width: 0.9rem;
  height: 0.9rem;
  flex: 0 0 auto;
  color: rgba(255, 255, 255, 0.46);
  transition: transform 160ms ease;
}

.platform-user-menu-trigger__chevron--open {
  transform: rotate(180deg);
}
</style>
