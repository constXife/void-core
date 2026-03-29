<script setup>
import { Bell, X } from "lucide-vue-next";
import Tooltip from "../components/Tooltip.vue";

defineProps({
  toast: {
    default: null
  },
  progress: {
    type: Number,
    required: true
  },
  t: {
    type: Function,
    required: true
  },
  tooltipsDisabled: {
    type: Boolean,
    default: false
  },
  tooltipDelay: {
    type: Number,
    default: 60
  }
});

defineEmits(["dismiss"]);
</script>

<template>
  <Transition name="hero-toast">
    <div v-if="toast" class="hero-toast-container">
      <div class="hero-toast">
        <div class="hero-toast-progress" :style="{ width: `${progress}%` }"></div>
        <button class="hero-toast-close" @click="$emit('dismiss')">
          <Tooltip
            :content="t('app.close')"
            :disabled="tooltipsDisabled"
            :delay="tooltipDelay"
          >
            <X class="w-4 h-4" />
          </Tooltip>
        </button>
        <div v-if="toast.image_url" class="hero-toast-image">
          <img :src="toast.image_url" :alt="toast.title" />
        </div>
        <div class="hero-toast-content">
          <div class="hero-toast-header">
            <span v-if="toast.icon" class="hero-toast-icon">{{ toast.icon }}</span>
            <Bell v-else class="w-5 h-5 text-accent" />
            <span class="hero-toast-title">{{ toast.title }}</span>
          </div>
          <div v-if="toast.message" class="hero-toast-message">
            {{ toast.message }}
          </div>
          <div v-if="toast.actions && toast.actions.length > 0" class="hero-toast-actions">
            <button
              v-for="action in toast.actions"
              :key="action.id"
              class="btn"
              :class="{
                'btn-primary': action.style === 'primary',
                'btn-ghost': action.style !== 'primary',
                'btn-danger': action.style === 'danger'
              }"
              @click="$emit('dismiss', action.id)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
