<script setup>
import { computed } from "vue";
import { Server, CloudUpload, CircleHelp } from "@lucide/vue";
const props = defineProps({ zone: { type: String, required: true }, t: { type: Function, required: true } });
const internal = computed(() => ["same-host", "private-network"].includes(props.zone));
const external = computed(() => props.zone === "external");
const label = computed(() => props.t(`assistant.model.zone.${internal.value ? 'internal' : external.value ? 'external' : 'unknown'}`));
</script>
<template>
  <span class="assistant-execution-zone" role="img" :aria-label="label" :title="label">
    <Server v-if="internal" :size="18" aria-hidden="true" />
    <CloudUpload v-else-if="external" :size="18" aria-hidden="true" />
    <CircleHelp v-else :size="18" aria-hidden="true" />
  </span>
</template>
<style scoped>
.assistant-execution-zone { display: inline-flex; flex: 0 0 auto; color: var(--ink-secondary); }
</style>
