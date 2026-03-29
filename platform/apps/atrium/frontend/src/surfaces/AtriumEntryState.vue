<script setup>
import { Layout, Settings, Users } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps({
  mode: {
    type: String,
    required: true
  },
  performanceMode: {
    type: String,
    default: "normal"
  },
  effectiveRole: {
    type: String,
    default: ""
  },
  actualRole: {
    type: String,
    default: ""
  },
  loginPageUrl: {
    type: String,
    default: ""
  },
  t: {
    type: Function,
    required: true
  }
});

defineEmits(["logout", "open-admin"]);

const isGuest = computed(() => props.mode === "guest");
const isNoAccess = computed(() => props.mode === "no-access");
const isAdminWelcome = computed(() => props.mode === "admin-welcome");
const animatedClass = computed(() => ({ "animate-fade-in-scale": props.performanceMode !== "low" }));
const roleLabel = computed(() => props.effectiveRole || props.actualRole || "guest");
</script>

<template>
  <div class="empty-workspace-container">
    <div
      class="empty-workspace-hero"
      :class="[animatedClass, { 'guest-hero': isGuest }]"
    >
      <div class="empty-workspace-icon">
        <Layout v-if="isGuest || isAdminWelcome" class="w-12 h-12 text-accent" />
        <Users v-else class="w-12 h-12 text-accent" />
      </div>

      <h2 class="empty-workspace-title">
        <template v-if="isGuest">{{ t("guest.title") }}</template>
        <template v-else-if="isNoAccess">{{ t("app.noAccessTitle") }}</template>
        <template v-else>{{ t("spaces.welcomeTitle") }}</template>
      </h2>

      <p class="empty-workspace-description">
        <template v-if="isGuest">{{ t("guest.body") }}</template>
        <template v-else-if="isNoAccess">{{ t("app.noAccessBody") }}</template>
        <template v-else>{{ t("spaces.welcomeBody") }}</template>
      </p>

      <template v-if="isGuest">
        <div class="guest-notes">
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

        <a class="btn btn-primary mt-6" :href="loginPageUrl">
          {{ t("guest.loginCta") }}
        </a>
      </template>

      <template v-else-if="isNoAccess">
        <div class="guest-notes">
          <div class="guest-note-card">
            <div class="guest-note-label">{{ t("app.noAccessRoleTitle") }}</div>
            <div class="guest-note-body">
              {{ t("app.noAccessSpaces", { role: roleLabel }) }}
            </div>
          </div>
          <div class="guest-note-card">
            <div class="guest-note-label">{{ t("app.noAccessHelpTitle") }}</div>
            <div class="guest-note-body">{{ t("app.noAccessHelpBody") }}</div>
          </div>
          <div class="guest-note-card">
            <div class="guest-note-label">{{ t("app.noAccessTrustTitle") }}</div>
            <div class="guest-note-body">{{ t("guest.trustNote") }}</div>
          </div>
        </div>

        <button class="btn btn-primary mt-6" @click="$emit('logout')">
          {{ t("app.logout") }}
        </button>
      </template>

      <template v-else>
        <button
          class="btn btn-primary mt-6"
          @click="$emit('open-admin', 'overview')"
        >
          <Settings class="w-4 h-4" />
          {{ t("spaces.openAdmin") }}
        </button>
      </template>
    </div>
  </div>
</template>
