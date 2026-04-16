<script setup>
import { storeToRefs } from "pinia";
import AtriumPrivacyPage from "../surfaces/AtriumPrivacyPage.vue";
import { useAtriumAppStore } from "../stores/atrium-app.js";

const appStore = useAtriumAppStore();
const { navigateTo, privacyDocumentHtml, t } = appStore;
</script>

<template>
  <AtriumPrivacyPage
    :privacy-document-html="privacyDocumentHtml"
    :t="t"
    @navigate-home="navigateTo('/')"
  />
</template>
