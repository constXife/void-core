<script setup>
defineProps({
  block: { type: Object, required: true }
});
</script>

<template>
  <ul class="assistant-link-list">
    <li v-for="item in block.items || []" :key="`${item.label}:${item.url}`">
      <a :href="item.url" target="_blank" rel="noreferrer">{{ item.label }}</a>
      <span v-if="item.note">{{ item.note }}</span>
    </li>
  </ul>
</template>

<style scoped>
.assistant-link-list {
  display: grid;
  gap: 7px;
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary, #9ca3af);
  font-size: 13px;
  line-height: 1.45;
}

.assistant-link-list a {
  color: var(--text-primary, #f8fafc);
  text-decoration: none;
}

.assistant-link-list a:hover {
  text-decoration: underline;
}

.assistant-link-list span {
  margin-left: 6px;
}
</style>
