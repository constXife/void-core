<script setup>
import { ChevronDown } from "lucide-vue-next";

defineProps({
  initials: {
    type: String,
    default: ""
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
    <span class="platform-user-menu-trigger__avatar">
      <slot name="avatar">
        {{ initials }}
      </slot>
    </span>

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
  padding: 0.22rem 0.26rem 0.22rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03)),
    rgba(15, 18, 24, 0.84);
  color: rgba(255, 255, 255, 0.9);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 10px 24px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}

.platform-user-menu-trigger:hover {
  border-color: rgba(120, 171, 255, 0.22);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04)),
    rgba(15, 18, 24, 0.92);
}

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
