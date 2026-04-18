<script setup>
import { storeToRefs } from "pinia";
import AtriumAdminContentTab from "../../surfaces/AtriumAdminContentTab.vue";
import { useAdminStore } from "../../stores/admin.js";
import { useAtriumAppStore } from "../../stores/atrium-app.js";

const adminStore = useAdminStore();
const appStore = useAtriumAppStore();

const {
  contentSpaceId,
  directoryAdmin,
  directoryForm,
  provisioningDirectoryAdmin,
  selectedContentSpace,
  spacesAdmin
} = storeToRefs(appStore);
const { enableV0ResourceDetails, t } = appStore;
</script>

<template>
  <AtriumAdminContentTab
    :content-space-id="contentSpaceId"
    :create-directory-item="adminStore.createDirectoryItem"
    :delete-directory-item="adminStore.deleteDirectoryItem"
    :directory-admin="directoryAdmin"
    :directory-form="directoryForm"
    :enable-resource-details="enableV0ResourceDetails"
    :normalize-icon-url="adminStore.normalizeIconUrl"
    :open-service-details="adminStore.openServiceDetails"
    :provisioning-directory-admin="provisioningDirectoryAdmin"
    :selected-content-space="selectedContentSpace"
    :spaces-admin="spacesAdmin"
    :t="t"
    :update-directory-item="adminStore.updateDirectoryItem"
    @content-space-change="adminStore.handleContentSpaceChange"
  />
</template>
