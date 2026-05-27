<script setup>
// NewspaperMasthead — typographic header газетного выпуска.
// Принимает title (skill display name), date (assembled_at human), totalCount,
// editorialNote (optional methodology / sort_by hint).
import { computed } from "vue";

const props = defineProps({
  title: { type: String, required: true },
  date: { type: String, default: "" },
  totalCount: { type: Number, default: 0 },
  editorialNote: { type: String, default: "" },
  t: { type: Function, required: true }
});

const displayDate = computed(() => {
  if (!props.date) return "";
  try {
    const d = new Date(props.date);
    if (Number.isNaN(d.getTime())) return props.date;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return props.date;
  }
});
</script>

<template>
  <header class="newspaper-masthead">
    <h1 class="newspaper-masthead__title">{{ title }}</h1>
    <div class="newspaper-masthead__meta">
      <span v-if="displayDate">{{ displayDate }}</span>
      <span v-if="totalCount > 0" class="newspaper-masthead__dot">·</span>
      <span v-if="totalCount > 0">{{ t("artifact.newspaper.total_count", { count: totalCount }) }}</span>
      <span v-if="editorialNote" class="newspaper-masthead__dot">·</span>
      <span v-if="editorialNote" class="newspaper-masthead__editorial">{{ editorialNote }}</span>
    </div>
  </header>
</template>

<style scoped>
.newspaper-masthead {
  border-bottom: 3px double var(--text-primary, #f8fafc);
  padding-bottom: 16px;
  margin-bottom: 32px;
  text-align: center;
}

.newspaper-masthead__title {
  font-family: "Times New Roman", "Georgia", "Iowan Old Style", serif;
  font-weight: 900;
  font-size: clamp(36px, 6vw, 64px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0 0 8px;
  color: var(--text-primary, #f8fafc);
  text-transform: none;
}

.newspaper-masthead__meta {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  font-family: "Georgia", "Times New Roman", serif;
  font-style: italic;
  font-size: 13px;
  color: var(--text-muted, color-mix(in srgb, #ffffff 70%, transparent));
}

.newspaper-masthead__dot {
  opacity: 0.5;
}

.newspaper-masthead__editorial {
  font-style: normal;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-size: 11px;
}
</style>
