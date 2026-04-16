<script setup>
defineProps({
  privacyDocumentHtml: {
    type: String,
    required: true
  },
  t: {
    type: Function,
    required: true
  }
});

defineEmits(["navigate-home"]);
</script>

<template>
  <div class="privacy-page">
    <div class="privacy-shell">
      <article class="privacy-document">
        <nav class="privacy-breadcrumbs" aria-label="Breadcrumb">
          <a href="/" class="privacy-breadcrumb-link" @click.prevent="$emit('navigate-home')">
            {{ t("app.home") }}
          </a>
          <span class="privacy-breadcrumb-separator">→</span>
          <span class="privacy-breadcrumb-current">{{ t("app.privacy") }}</span>
        </nav>
        <div class="privacy-markdown note-body" v-html="privacyDocumentHtml"></div>
      </article>
    </div>
  </div>
</template>
