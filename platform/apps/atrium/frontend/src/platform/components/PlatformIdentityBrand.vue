<script setup>
import PlatformIdentityMark from "./PlatformIdentityMark.vue";

defineProps({
  identity: {
    type: Object,
    required: true
  },
  collapsed: {
    type: Boolean,
    required: true
  },
  markSize: {
    type: [Number, String],
    required: true
  },
  markRounded: {
    type: [Number, String],
    required: true
  }
});
</script>

<template>
  <component
    :is="identity.href ? 'a' : 'div'"
    class="platform-identity-brand"
    :class="{ 'platform-identity-brand--collapsed': collapsed }"
    :href="identity.href || undefined"
    :title="collapsed ? identity.label : undefined"
    :aria-label="identity.label"
  >
    <PlatformIdentityMark
      class="platform-identity-brand__mark"
      :identity="identity"
      :size="markSize"
      :rounded="markRounded"
    />
    <span class="platform-identity-brand__copy">
      <span class="platform-identity-brand__label">{{ identity.label }}</span>
      <span v-if="identity.subtitle" class="platform-identity-brand__subtitle">
        {{ identity.subtitle }}
      </span>
    </span>
  </component>
</template>

<style scoped>
.platform-identity-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  padding: 0.25rem 0.35rem;
  border-radius: 8px;
  color: var(--ink-primary);
  text-decoration: none;
  transition: background var(--duration-fast, 150ms) var(--ease-default, ease);
}

.platform-identity-brand:hover {
  background: var(--glass-bg-hover);
}

.platform-identity-brand__mark {
  width: 1.6rem;
  height: 1.6rem;
  flex: 0 0 auto;
}

.platform-identity-brand__copy {
  display: inline-flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.1;
}

.platform-identity-brand__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0;
}

.platform-identity-brand__subtitle {
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-2xs, 10px);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.platform-identity-brand--collapsed {
  width: 2.4rem;
  height: 2.4rem;
  padding: 0;
  justify-content: center;
}

.platform-identity-brand--collapsed .platform-identity-brand__copy {
  display: none;
}
</style>
