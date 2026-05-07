<script setup>
import { computed } from "vue";
import { resolvePlatformUserIdentity } from "../account.js";

const props = defineProps({
  user: { type: Object, default: null },
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg", "message"].includes(value)
  }
});

const account = computed(() => resolvePlatformUserIdentity(props.user));
</script>

<template>
  <span
    v-if="account"
    class="platform-user-avatar"
    :class="`platform-user-avatar--${size}`"
    :title="account.label"
  >
    <img
      v-if="account.avatarUrl"
      class="platform-user-avatar__image"
      :src="account.avatarUrl"
      :alt="account.label"
    />
    <span v-else class="platform-user-avatar__initials">{{ account.initials }}</span>
  </span>
</template>

<style scoped>
.platform-user-avatar {
  --platform-user-avatar-size: 36px;
  width: var(--platform-user-avatar-size);
  height: var(--platform-user-avatar-size);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(88, 166, 255, 0.34), rgba(163, 113, 247, 0.34));
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.95);
  font-size: 0.74rem;
  font-weight: 700;
}

.platform-user-avatar--sm {
  --platform-user-avatar-size: 2rem;
}

.platform-user-avatar--md {
  --platform-user-avatar-size: 36px;
}

.platform-user-avatar--lg {
  --platform-user-avatar-size: 44px;
}

.platform-user-avatar--message {
  --platform-user-avatar-size: 1.9rem;
  font-size: var(--text-2xs, 10px);
}

.platform-user-avatar__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.platform-user-avatar__initials {
  line-height: 1;
}
</style>
