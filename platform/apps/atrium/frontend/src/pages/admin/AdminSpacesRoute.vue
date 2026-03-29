<script setup>
import { storeToRefs } from "pinia";
import AtriumAdminSpacesTab from "../../surfaces/AtriumAdminSpacesTab.vue";
import { useAdminStore } from "../../stores/admin.js";
import { useAtriumAppStore } from "../../stores/atrium-app.js";

const adminStore = useAdminStore();
const appStore = useAtriumAppStore();

const {
  archivedSpacesAdmin,
  dashboardTemplates,
  editDisplayConfig,
  editPersonalizationRules,
  editSpace,
  newSpace,
  spacesAdmin
} = storeToRefs(appStore);
const { t } = appStore;
</script>

<template>
  <AtriumAdminSpacesTab
    :archive-space="adminStore.archiveSpace"
    :archived-spaces-admin="archivedSpacesAdmin"
    :create-space="adminStore.createSpace"
    :dashboard-templates="dashboardTemplates"
    :delete-space="adminStore.deleteSpace"
    :edit-display-config="editDisplayConfig"
    :edit-personalization-rules="editPersonalizationRules"
    :edit-space="editSpace"
    :new-space="newSpace"
    :restore-space="adminStore.restoreSpace"
    :spaces-admin="spacesAdmin"
    :start-edit-space="adminStore.startEditSpace"
    :t="t"
    :update-space="adminStore.updateSpace"
    @close-edit="adminStore.closeEditSpace"
    @update:edit-display-config="editDisplayConfig = $event"
    @update:edit-personalization-rules="editPersonalizationRules = $event"
  />
</template>
