<script setup>
defineProps({
  variant: {
    type: String,
    default: "overlay"
  }
});
</script>

<template>
  <header
    class="platform-header-frame"
    :class="{
      'platform-header-frame--overlay': variant === 'overlay',
      'platform-header-frame--bar': variant === 'bar'
    }"
  >
    <div class="platform-header-frame__section platform-header-frame__section--left">
      <slot name="left" />
    </div>

    <div class="platform-header-frame__section platform-header-frame__section--center">
      <slot name="center" />
    </div>

    <div class="platform-header-frame__section platform-header-frame__section--right">
      <slot name="right" />
    </div>
  </header>
</template>

<style scoped>
.platform-header-frame {
  display: grid;
  grid-template-columns: minmax(15rem, 1fr) minmax(0, 44rem) minmax(15rem, 1fr);
  align-items: start;
  gap: 1rem;
}

.platform-header-frame__section {
  min-width: 0;
  display: flex;
  align-items: center;
}

.platform-header-frame__section--center {
  justify-content: center;
}

.platform-header-frame__section--right {
  justify-content: flex-end;
}

.platform-header-frame--overlay {
  position: fixed;
  inset: 0 0 auto;
  z-index: 20;
  padding: 0.9rem 0.9rem 0;
  pointer-events: none;
}

.platform-header-frame--overlay .platform-header-frame__section {
  pointer-events: auto;
}

.platform-header-frame--bar {
  position: sticky;
  top: 0;
  z-index: 30;
  padding: 0.75rem 1rem;
  background: var(--surface-raised, #131920);
  border-bottom: 1px solid var(--border-muted, rgba(255, 255, 255, 0.06));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

@media (max-width: 1024px) {
  .platform-header-frame {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.75rem;
    padding-inline: 0.75rem;
  }

  .platform-header-frame__section--center {
    order: 3;
    justify-content: stretch;
  }

  .platform-header-frame__section--right {
    order: 2;
  }
}
</style>
