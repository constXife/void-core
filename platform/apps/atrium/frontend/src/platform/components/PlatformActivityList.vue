<script setup>
import { computed } from "vue";
import { Activity, Inbox, KeyRound, MessageSquare, ShieldCheck } from "lucide-vue-next";
import { groupByDay } from "../../lib/group-by-day.js";

// Презентационный список событий, сгруппированный по дням — общий рендер для колокола
// (PlatformNotificationCenter) и страницы активности (AtriumActivityRoute). Без сети/стора:
// получает уже загруженные `items`, эмитит `open` по тапу на ожидающий апрув. i18n через `t`,
// `lang` — для Intl-локали дат/времени.

const props = defineProps({
  items: { type: Array, default: () => [] },
  t: { type: Function, required: true },
  lang: { type: String, default: "" }
});
const emit = defineEmits(["open"]);

const dayGroups = computed(() => groupByDay(props.items, { t: props.t, locale: props.lang }));

const iconFor = (event) =>
  event === "approval.requested" || event === "approval.status"
    ? ShieldCheck
    : event === "message.created"
      ? MessageSquare
      : event === "run.status"
        ? Activity
        : event === "session.updated"
          ? KeyRound
          : Inbox;

const titleFor = (item) => {
  const data = item?.data || {};
  switch (item?.event) {
    case "approval.requested": {
      const what = data.preview?.title || data.preview?.operation || data.consequence_class || "";
      return props.t("feed.event.approval", { what });
    }
    case "approval.status":
      return props.t("feed.event.approvalStatus", { status: data.status || "" });
    case "message.created":
      return props.t("feed.event.message");
    case "run.status":
      return props.t("feed.event.run", { status: data.status || "" });
    case "session.updated":
      return props.t("feed.event.session");
    default:
      return item?.event || "";
  }
};

const isPendingApproval = (item) => item?.event === "approval.requested";

const timeFor = (item) => {
  const raw = item?.created_at;
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(props.lang || undefined, { hour: "2-digit", minute: "2-digit" });
};
</script>

<template>
  <div class="alist">
    <section v-for="group in dayGroups" :key="group.key" class="alist__day">
      <h4 class="alist__day-label">{{ group.label }}</h4>
      <ul class="alist__list">
        <li v-for="item in group.items" :key="item.id" class="alist__item">
          <component :is="iconFor(item.event)" :size="16" class="alist__icon" />
          <div class="alist__main">
            <span class="alist__title">{{ titleFor(item) }}</span>
            <button
              v-if="isPendingApproval(item)"
              class="alist__action"
              type="button"
              @click="emit('open', item)"
            >
              {{ t("feed.open") }}
            </button>
          </div>
          <time v-if="timeFor(item)" class="alist__time">{{ timeFor(item) }}</time>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.alist {
  display: grid;
  gap: 0.55rem;
}
.alist__day-label {
  margin: 0;
  padding: 0.15rem 0.3rem 0.2rem;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-secondary, #94a3b8);
}
.alist__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.15rem;
}
.alist__item {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  padding: 0.55rem 0.6rem;
  border-radius: 8px;
}
.alist__item:hover {
  background: var(--surface-2, #1b1d23);
}
.alist__icon {
  margin-top: 0.1rem;
  color: var(--ink-secondary, #94a3b8);
  flex: none;
}
.alist__main {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 0.25rem;
}
.alist__title {
  color: var(--ink-primary, #f8fafc);
  font-size: 0.88rem;
  line-height: 1.35;
  word-break: break-word;
}
.alist__action {
  justify-self: start;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--accent, #5b8def) 55%, var(--border-1, #2a2c33));
  color: var(--accent, #5b8def);
  border-radius: 7px;
  padding: 0.2rem 0.6rem;
  font-size: 0.78rem;
  cursor: pointer;
}
.alist__time {
  flex: none;
  margin-top: 0.15rem;
  font-size: 0.72rem;
  color: color-mix(in srgb, var(--ink-secondary, #94a3b8) 80%, transparent);
  font-variant-numeric: tabular-nums;
}
</style>
