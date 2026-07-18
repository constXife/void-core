<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

defineProps({
  variant: {
    type: String,
    default: "overlay"
  }
});

// Overlay-шапка — `position: fixed`, поэтому не резервирует высоту в потоке. На
// узкой раскладке (≤1024) секции складываются в колонку и высота прыгает. Публикуем
// реальную высоту как `--platform-header-height`, чтобы контент под ней резервировал
// именно её (см. `.stage-panel` padding-top), без хардкод-магии.
const frameRef = ref(null);
let observer = null;

const publishHeight = (height) => {
  document.documentElement.style.setProperty(
    "--platform-header-height",
    `${Math.round(height)}px`
  );
};

onMounted(() => {
  if (!frameRef.value) return;
  observer = new ResizeObserver(() => {
    publishHeight(frameRef.value.getBoundingClientRect().height);
  });
  observer.observe(frameRef.value);
  publishHeight(frameRef.value.getBoundingClientRect().height);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  document.documentElement.style.removeProperty("--platform-header-height");
});
</script>

<template>
  <header
    ref="frameRef"
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
