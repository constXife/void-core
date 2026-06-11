<script setup>
// OpsResultBlock — self-contained status-карточка ops-действия (ops_action.v1).
// НЕ ArtifactLink: у ops-результата нет durable artifact page, output живёт inline.
// Backend contract: { type: "ops_result", title, category, summary, output? }
import { computed, ref } from "vue";
import { Activity, Search, Terminal, RefreshCw, ShieldAlert } from "lucide-vue-next";

const props = defineProps({
  block: { type: Object, required: true },
  t: { type: Function, required: true }
});

const iconFor = computed(() => {
  switch (props.block.category) {
    case "query":
      return Search;
    case "inspect":
      return Terminal;
    case "actuator":
      return RefreshCw;
    case "shell":
      return ShieldAlert;
    default:
      return Activity; // sensor
  }
});

const hasOutput = computed(() => Boolean(String(props.block.output || "").trim()));
const open = ref(false);
</script>

<template>
  <div class="ops-result" :class="`ops-result--${block.category || 'sensor'}`">
    <div class="ops-result__head">
      <component :is="iconFor" :size="16" class="ops-result__icon" />
      <span class="ops-result__title">{{ block.title }}</span>
    </div>
    <p v-if="block.summary" class="ops-result__summary">{{ block.summary }}</p>
    <details v-if="hasOutput" class="ops-result__details" :open="open">
      <summary @click.prevent="open = !open">
        {{ open ? "−" : "+" }} output
      </summary>
      <pre class="ops-result__output">{{ block.output }}</pre>
    </details>
  </div>
</template>

<style scoped>
.ops-result {
  border: 1px solid var(--border-1, #2a2c33);
  border-left: 3px solid var(--text-2, #6b7280);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--surface-1, #14151a);
}
.ops-result--sensor {
  border-left-color: #4ea1ff;
}
.ops-result--query {
  border-left-color: #b08cff;
}
.ops-result--inspect {
  border-left-color: #e6b800;
}
.ops-result--actuator {
  border-left-color: #34c759;
}
.ops-result--shell {
  border-left-color: #b5402f;
}
.ops-result__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ops-result__icon {
  color: var(--text-2, #9aa0ab);
  flex: none;
}
.ops-result__title {
  font-weight: 600;
  font-size: 0.92rem;
}
.ops-result__summary {
  margin: 6px 0 0;
  color: var(--text-1, #e6e8ec);
  font-size: 0.9rem;
}
.ops-result__details {
  margin-top: 8px;
}
.ops-result__details > summary {
  cursor: pointer;
  list-style: none;
  color: var(--text-2, #9aa0ab);
  font-size: 0.8rem;
  user-select: none;
}
.ops-result__details > summary::-webkit-details-marker {
  display: none;
}
.ops-result__output {
  margin: 8px 0 0;
  padding: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 40vh;
  overflow: auto;
  background: var(--surface-0, #0e0f13);
  border-radius: 8px;
}
</style>
