<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  helpText: {
    type: String,
    default: ""
  },
  trustNote: {
    type: String,
    required: true
  },
  spacesCount: {
    type: Number,
    required: true
  },
  loginPageUrl: {
    type: String,
    required: true
  },
  t: {
    type: Function,
    required: true
  }
});
</script>

<template>
  <div class="mb-5">
    <div class="card-glass p-5 sm:p-6 border border-white/10">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="max-w-2xl">
          <div class="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-3">
            {{ t("guest.publicShellTitle") }}
          </div>
          <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-white/95">
            {{ title }}
          </h2>
          <p class="mt-3 text-sm text-white/60 leading-6">
            {{ description }}
          </p>
          <p v-if="helpText" class="mt-3 text-xs core-kv-label leading-5">
            {{ helpText }}
          </p>
          <p class="mt-3 text-xs core-kv-label leading-5">
            {{ trustNote }}
          </p>
          <div class="guest-notes mt-4">
            <div class="guest-note-card">
              <div class="guest-note-label">{{ t("guest.valueTitle") }}</div>
              <div class="guest-note-body">{{ t("guest.valueBody") }}</div>
            </div>
            <div class="guest-note-card">
              <div class="guest-note-label">{{ t("guest.controlTitle") }}</div>
              <div class="guest-note-body">{{ t("guest.controlBody") }}</div>
            </div>
            <div class="guest-note-card">
              <div class="guest-note-label">{{ t("guest.accessStepsTitle") }}</div>
              <div class="guest-note-body">{{ t("guest.accessStepsBody") }}</div>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-3 sm:items-end">
          <div class="chip chip-muted">{{ spacesCount }} {{ t("app.spaces") }}</div>
          <a class="btn btn-primary" :href="loginPageUrl">{{ t("guest.loginCta") }}</a>
        </div>
      </div>
    </div>
  </div>
</template>
