<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  service: {
    type: Object,
    required: true
  },
  size: {
    type: Number,
    default: 40
  },
  variant: {
    type: String,
    default: "card"
  },
  badge: {
    type: Number,
    default: 0
  }
});

const avatarColors = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-green-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-indigo-500"
];

const getAvatarColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getInitials = (title) => {
  if (!title) return "?";
  const words = title.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return title.slice(0, 2).toUpperCase();
};

const iconKey = computed(() => {
  const raw = props.service?.id || props.service?.title || "";
  return String(raw).toLowerCase().replace(/[^a-z0-9_-]+/g, "");
});

const localIcon = computed(() => {
  if (!iconKey.value) return "";
  return `/icons/${iconKey.value}.svg`;
});

const sources = computed(() => {
  const list = [];
  if (localIcon.value) list.push(localIcon.value);
  if (props.service?.icon_url) list.push(props.service.icon_url);
  return list;
});

const srcIndex = ref(0);
const showFallback = ref(false);

const resetSources = () => {
  srcIndex.value = 0;
  showFallback.value = sources.value.length === 0;
};

watch(sources, resetSources, { immediate: true });

const currentSrc = computed(() => sources.value[srcIndex.value] || "");
const initials = computed(() => getInitials(props.service?.title || ""));
const colorClass = computed(() => getAvatarColor(props.service?.title || ""));
const variantClass = computed(() => (props.variant === "dock" ? "service-icon-dock" : ""));
const badgeLabel = computed(() => {
  if (!props.badge || props.badge <= 0) return "";
  if (props.badge > 99) return "99+";
  return String(props.badge);
});

const onError = () => {
  if (srcIndex.value < sources.value.length - 1) {
    srcIndex.value += 1;
    return;
  }
  showFallback.value = true;
};
</script>

<template>
  <div
    class="service-icon relative"
    :class="[variantClass, { 'is-fallback': showFallback }]"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <template v-if="!showFallback && currentSrc">
      <img
        :src="currentSrc"
        :alt="service?.title || 'Service icon'"
        :style="{ width: `${size}px`, height: `${size}px` }"
        class="object-contain service-icon-img"
        @error="onError"
      />
    </template>
    <template v-else>
      <span
        :class="[colorClass, 'w-full h-full flex items-center justify-center rounded-xl text-white font-semibold']"
      >
        {{ initials }}
      </span>
    </template>
    <span v-if="badgeLabel" class="service-badge">{{ badgeLabel }}</span>
  </div>
</template>
