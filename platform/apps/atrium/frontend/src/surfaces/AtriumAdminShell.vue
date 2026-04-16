<script setup>
import { ChevronLeft, Settings } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps({
  adminTab: {
    type: String,
    required: true
  },
  spacesCount: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    required: true
  },
  t: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(["back", "navigate-tab"]);

const navItems = computed(() => [
  { key: "overview", label: props.t("admin.title.overview"), icon: Settings, badge: props.spacesCount }
]);
</script>

<template>
  <div class="admin-section">
    <div class="admin-sidebar">
      <div class="admin-sidebar-header">
        <button class="admin-back-btn" @click="emit('back')">
          <ChevronLeft class="w-5 h-5" />
          <span>{{ t("app.back") }}</span>
        </button>
      </div>
      <nav class="admin-nav">
        <button
          v-for="item in navItems"
          :key="item.key"
          class="admin-nav-item"
          :class="{ active: adminTab === item.key }"
          @click="emit('navigate-tab', item.key)"
        >
          <component :is="item.icon" class="w-4 h-4" />
          <span>{{ item.label }}</span>
          <span v-if="item.badge != null" class="admin-nav-badge muted">{{ item.badge }}</span>
        </button>
      </nav>
      <div class="admin-sidebar-footer">
        <div class="text-xs text-white/30">{{ t("app.adminPanel") }}</div>
      </div>
    </div>

    <div class="admin-content">
      <div class="admin-content-header">
        <div class="admin-content-heading">
          <h1 class="admin-content-title">{{ title }}</h1>
          <p class="admin-content-subtitle">{{ subtitle }}</p>
        </div>
      </div>

      <div class="admin-content-body">
        <slot />
      </div>
    </div>
  </div>
</template>
