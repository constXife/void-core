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
      'platform-header-frame--bar': variant === 'bar',
      'platform-header-frame--with-center': Boolean($slots.center)
    }"
  >
    <div class="platform-header-frame__section platform-header-frame__section--left">
      <slot name="left" />
    </div>

    <div v-if="$slots.center" class="platform-header-frame__section platform-header-frame__section--center">
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
  grid-column: 3;
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

/* Планшет (≤1024): всё в одну строку topbar — бренд · переключатель · контролы;
   бренд/контролы по контенту, переключатель тянется в середине. */
@media (max-width: 1024px) {
  .platform-header-frame {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    padding-inline: 0.75rem;
  }

  .platform-header-frame__section--right {
    justify-content: flex-end;
  }

  .platform-header-frame__section--center {
    justify-content: stretch;
  }
}

/* Телефон (≤640): места на одну строку нет — переключатель уезжает строкой ниже
   под бренд+контролы, чтобы его не сплющивало. */
@media (max-width: 640px) {
  .platform-header-frame {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "brand actions"
      "switcher switcher";
    gap: 0.6rem 0.75rem;
  }

  .platform-header-frame__section--left {
    grid-area: brand;
  }

  .platform-header-frame__section--right {
    grid-area: actions;
  }

  .platform-header-frame__section--center {
    grid-area: switcher;
  }
}
/* Общая продуктовая полоса: одна строка на desktop и телефоне. */
.platform-header-frame--bar {
  grid-template-columns: minmax(0, auto) minmax(0, 1fr) auto;
  grid-template-areas: "brand switcher actions";
  align-items: center;
  min-height: 64px;
  box-sizing: border-box;
  gap: 8px;
  padding: 8px clamp(8px, 2vw, 24px);
  background: var(--surface-raised);
  border-color: var(--border-default);
  backdrop-filter: none;
}
.platform-header-frame--bar .platform-header-frame__section--left { grid-area: brand; gap: 8px; overflow: hidden; }
.platform-header-frame--bar .platform-header-frame__section--center { grid-area: switcher; }
.platform-header-frame--bar .platform-header-frame__section--right { grid-area: actions; }
/* Локальные инструменты продукта переносятся ниже глобальных действий,
   когда контент перестаёт помещаться в одной строке. */
@media (max-width: 760px) {
  .platform-header-frame--bar.platform-header-frame--with-center {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "brand actions" "switcher switcher";
    row-gap: 12px;
  }
  .platform-header-frame--bar .platform-header-frame__section--center { width: 100%; }
}
</style>
