<script setup>
const props = defineProps({
  href: {
    type: String,
    default: "/"
  },
  subtitle: {
    type: String,
    default: ""
  },
  title: {
    type: String,
    required: true
  },
  variant: {
    type: String,
    default: "glass"
  }
});
</script>

<template>
  <component
    :is="href ? 'a' : 'div'"
    class="platform-header-brand"
    :class="{
      'platform-header-brand--glass': variant === 'glass',
      'platform-header-brand--flat': variant === 'flat'
    }"
    :href="href || undefined"
  >
    <span class="platform-header-brand__icon">
      <slot name="icon" />
    </span>

    <span class="platform-header-brand__copy">
      <span class="platform-header-brand__title">{{ title }}</span>
      <span v-if="subtitle" class="platform-header-brand__subtitle">{{ subtitle }}</span>
    </span>
  </component>
</template>

<style scoped>
.platform-header-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
  color: rgba(255, 255, 255, 0.94);
  text-decoration: none;
}

.platform-header-brand--glass {
  padding: 0.68rem 0.82rem;
  border-radius: 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03)),
    rgba(9, 12, 18, 0.76);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 16px 44px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.platform-header-brand--flat {
  padding: 0;
}

.platform-header-brand__icon {
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 0.8rem;
  background: rgba(88, 166, 255, 0.12);
  color: rgba(105, 183, 255, 0.98);
}

.platform-header-brand--flat .platform-header-brand__icon {
  background: transparent;
  border-radius: 0;
}

.platform-header-brand__copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.platform-header-brand__title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.1;
}

.platform-header-brand__subtitle {
  color: rgba(255, 255, 255, 0.44);
  font-size: 0.67rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

@media (max-width: 1024px) {
  .platform-header-brand {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
