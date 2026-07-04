<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useNotificationPreferencesStore } from "../stores/notification-preferences.js";

// Предпочтения уведомлений в atrium account-хабе (ADR-0041): таблица event_class × channel.

const props = defineProps({
  t: { type: Function, required: true }
});
const t = (key, vars = {}) => props.t(key, vars);

const store = useNotificationPreferencesStore();
const { rows, loading, error } = storeToRefs(store);

const toggling = ref(null);

const EVENT_ORDER = [
  "approval.requested",
  "message.created",
  "approval.status",
  "run.status",
  "session.updated"
];

const CLASS_LABEL_KEYS = {
  "approval.requested": "notification.class.approval_requested",
  "approval.status": "notification.class.approval_status",
  "message.created": "notification.class.message_created",
  "run.status": "notification.class.run_status",
  "session.updated": "notification.class.session_updated"
};

const groupedRows = computed(() => {
  const byClass = new Map();
  for (const row of rows.value) {
    if (!byClass.has(row.event_class)) {
      byClass.set(row.event_class, {
        event_class: row.event_class,
        email: null,
        companion_push: null
      });
    }
    const entry = byClass.get(row.event_class);
    if (row.channel === "email") entry.email = row;
    else if (row.channel === "companion_push") entry.companion_push = row;
  }

  const result = [...byClass.values()];
  result.sort((a, b) => {
    const ia = EVENT_ORDER.indexOf(a.event_class);
    const ib = EVENT_ORDER.indexOf(b.event_class);
    if (ia === -1 && ib === -1) return a.event_class.localeCompare(b.event_class);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return result;
});

onMounted(() => {
  store.loadPreferences();
});

const classLabel = (eventClass) => {
  const key = CLASS_LABEL_KEYS[eventClass];
  return key ? t(key) : eventClass;
};

const toggleKey = (eventClass, channel) => `${eventClass}:${channel}`;

const isToggling = (eventClass, channel) =>
  toggling.value === toggleKey(eventClass, channel);

const onToggle = async (eventClass, channel, enabled) => {
  const key = toggleKey(eventClass, channel);
  toggling.value = key;
  try {
    await store.setPreference(eventClass, channel, enabled);
  } finally {
    if (toggling.value === key) toggling.value = null;
  }
};
</script>

<template>
  <section class="assistant-notifications">
    <header class="assistant-notifications__head">
      <h2 class="assistant-notifications__title">{{ t("account.notifications.title") }}</h2>
      <p class="assistant-notifications__intro">{{ t("account.notifications.intro") }}</p>
    </header>

    <p v-if="error" class="assistant-notifications__error" role="alert">{{ error }}</p>

    <p v-if="loading && rows.length === 0" class="assistant-notifications__hint">
      {{ t("account.notifications.loading") }}
    </p>

    <div v-else class="assistant-notifications__table-wrap">
      <table class="assistant-notifications__table">
        <thead>
          <tr>
            <th class="assistant-notifications__th assistant-notifications__th--label" scope="col" />
            <th class="assistant-notifications__th" scope="col">
              {{ t("account.notifications.columnEmail") }}
            </th>
            <th class="assistant-notifications__th" scope="col">
              {{ t("account.notifications.columnPush") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in groupedRows" :key="row.event_class">
            <td class="assistant-notifications__label">{{ classLabel(row.event_class) }}</td>
            <td class="assistant-notifications__cell">
              <input
                v-if="row.email"
                type="checkbox"
                :checked="row.email.enabled"
                :disabled="isToggling(row.event_class, 'email')"
                @change="onToggle(row.event_class, 'email', $event.target.checked)"
              />
            </td>
            <td class="assistant-notifications__cell">
              <input
                v-if="row.companion_push"
                type="checkbox"
                :checked="row.companion_push.enabled"
                :disabled="isToggling(row.event_class, 'companion_push')"
                @change="onToggle(row.event_class, 'companion_push', $event.target.checked)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.assistant-notifications {
  display: grid;
  gap: 1.2rem;
  min-width: 0;
}

.assistant-notifications__head {
  display: flex;
  flex-direction: column;
}

.assistant-notifications__title {
  margin: 0;
  font-size: 1.3rem;
  color: var(--ink-primary, #f8fafc);
}

.assistant-notifications__intro {
  margin: 0.3rem 0 0;
  color: var(--ink-secondary, #94a3b8);
  font-size: 0.9rem;
}

.assistant-notifications__error {
  color: var(--accent-danger, #ff6b6b);
  font-size: 0.88rem;
  margin: 0;
}

.assistant-notifications__hint {
  margin: 0;
  color: var(--ink-secondary, #94a3b8);
  font-size: 0.9rem;
}

.assistant-notifications__table-wrap {
  overflow-x: auto;
  min-width: 0;
}

.assistant-notifications__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.assistant-notifications__th {
  padding: 0.5rem 0.75rem;
  text-align: center;
  font-weight: 600;
  color: var(--ink-secondary, #94a3b8);
  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.18));
}

.assistant-notifications__th--label {
  text-align: left;
}

.assistant-notifications__label {
  padding: 0.65rem 0.75rem 0.65rem 0;
  color: var(--ink-primary, #f8fafc);
  white-space: nowrap;
}

.assistant-notifications__cell {
  padding: 0.65rem 0.75rem;
  text-align: center;
  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.18));
}

.assistant-notifications__cell input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
  accent-color: var(--accent-purple, #a78bfa);
}

.assistant-notifications__cell input[type="checkbox"]:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
