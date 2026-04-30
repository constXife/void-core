<script setup>
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useAtriumAppStore } from "../stores/atrium-app.js";
import { useSpaceStore } from "../stores/space.js";

const appStore = useAtriumAppStore();
const spaceStore = useSpaceStore();

const { t } = appStore;
const {
  currentSpace,
  hasNextSpaces,
  hasPrevSpaces,
  nextSpace,
  prevSpace,
  spacePickerOpen,
  spaces
} = storeToRefs(spaceStore);
</script>

<template>
  <div v-if="spaces.length > 0" class="atrium-space-switcher">
    <div
      class="atrium-space-switcher__row"
      :class="{
        'atrium-space-switcher__row--has-prev': hasPrevSpaces,
        'atrium-space-switcher__row--has-next': hasNextSpaces
      }"
    >
      <button
        v-if="prevSpace"
        class="atrium-space-switcher__side"
        @click="spaceStore.selectSpace(prevSpace)"
      >
        <ChevronLeft class="atrium-space-switcher__chevron" />
        <span class="atrium-space-switcher__side-icon">
          {{ spaceStore.spaceIconLabel(prevSpace) }}
        </span>
        <span class="atrium-space-switcher__side-title">{{ spaceStore.spaceTitle(prevSpace) }}</span>
      </button>

      <button class="atrium-space-switcher__current" @click="spaceStore.toggleSpacePicker()">
        <span class="atrium-space-switcher__current-icon">
          {{ spaceStore.spaceIconLabel(currentSpace) }}
        </span>
        <span class="atrium-space-switcher__current-copy">
          <span class="atrium-space-switcher__current-title">
            {{ currentSpace ? spaceStore.spaceTitle(currentSpace) : t("app.spaces") }}
          </span>
          <span
            v-if="spaceStore.spaceMetaLabel(currentSpace)"
            class="atrium-space-switcher__current-subtitle"
          >
            {{ spaceStore.spaceMetaLabel(currentSpace) }}
          </span>
        </span>
        <ChevronDown
          class="atrium-space-switcher__current-chevron"
          :class="{ 'atrium-space-switcher__current-chevron--open': spacePickerOpen }"
        />
      </button>

      <button
        v-if="nextSpace"
        class="atrium-space-switcher__side"
        @click="spaceStore.selectSpace(nextSpace)"
      >
        <span class="atrium-space-switcher__side-icon">
          {{ spaceStore.spaceIconLabel(nextSpace) }}
        </span>
        <span class="atrium-space-switcher__side-title">{{ spaceStore.spaceTitle(nextSpace) }}</span>
        <ChevronRight class="atrium-space-switcher__chevron" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.atrium-space-switcher {
  width: 100%;
  display: flex;
  justify-content: center;
}

.atrium-space-switcher__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  max-width: 100%;
}

.atrium-space-switcher__row--has-prev::before,
.atrium-space-switcher__row--has-next::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 1.4rem;
  height: 1px;
  transform: translateY(-50%);
  background: linear-gradient(90deg, rgba(88, 166, 255, 0), rgba(88, 166, 255, 0.58));
}

.atrium-space-switcher__row--has-prev::before {
  left: -1.55rem;
}

.atrium-space-switcher__row--has-next::after {
  right: -1.55rem;
  background: linear-gradient(90deg, rgba(88, 166, 255, 0.58), rgba(88, 166, 255, 0));
}

.atrium-space-switcher__current,
.atrium-space-switcher__side {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03)),
    rgba(15, 18, 24, 0.84);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 10px 24px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.atrium-space-switcher__current {
  max-width: min(100%, 26rem);
  padding: 0.42rem 0.72rem 0.42rem 0.48rem;
  border-radius: 999px;
}

.atrium-space-switcher__side {
  max-width: 10.5rem;
  padding: 0.4rem 0.6rem;
  border-radius: 999px;
}

.atrium-space-switcher__current:hover,
.atrium-space-switcher__side:hover {
  border-color: rgba(120, 171, 255, 0.22);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04)),
    rgba(15, 18, 24, 0.92);
}

.atrium-space-switcher__current-icon,
.atrium-space-switcher__side-icon {
  width: 1.65rem;
  height: 1.65rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.09);
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.7rem;
  font-weight: 700;
}

.atrium-space-switcher__current-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.atrium-space-switcher__current-title {
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.atrium-space-switcher__current-subtitle {
  color: rgba(255, 255, 255, 0.42);
  font-size: 0.67rem;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.atrium-space-switcher__current-chevron {
  width: 0.9rem;
  height: 0.9rem;
  flex: 0 0 auto;
  color: rgba(255, 255, 255, 0.46);
  transition: transform 160ms ease;
}

.atrium-space-switcher__current-chevron--open {
  transform: rotate(180deg);
}

.atrium-space-switcher__side-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 600;
}

.atrium-space-switcher__chevron {
  width: 0.8rem;
  height: 0.8rem;
  flex: 0 0 auto;
  color: rgba(255, 255, 255, 0.45);
}

@media (max-width: 1024px) {
  .atrium-space-switcher {
    justify-content: stretch;
  }

  .atrium-space-switcher__row {
    width: 100%;
    justify-content: center;
  }

  .atrium-space-switcher__current {
    width: 100%;
    max-width: none;
  }

  .atrium-space-switcher__side {
    display: none;
  }

  .atrium-space-switcher__row--has-prev::before,
  .atrium-space-switcher__row--has-next::after {
    display: none;
  }
}
</style>
