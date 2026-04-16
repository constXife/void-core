<script setup>
import { storeToRefs } from "pinia";
import AtriumAdminMembersTab from "../../surfaces/AtriumAdminMembersTab.vue";
import { useAdminStore } from "../../stores/admin.js";
import { useAtriumAppStore } from "../../stores/atrium-app.js";

const adminStore = useAdminStore();
const appStore = useAtriumAppStore();

const {
  membershipBulk,
  membershipForm,
  membershipSegmentOptions,
  membershipSpaceId,
  memberships,
  roles,
  spacesAdmin
} = storeToRefs(appStore);
const { t } = appStore;
</script>

<template>
  <AtriumAdminMembersTab
    :add-membership="adminStore.addMembership"
    :import-memberships="adminStore.importMemberships"
    :membership-bulk="membershipBulk"
    :membership-form="membershipForm"
    :memberships="memberships"
    :membership-segment-options="membershipSegmentOptions"
    :membership-space-id="membershipSpaceId"
    :roles="roles"
    :spaces-admin="spacesAdmin"
    :t="t"
    :update-member-segment="adminStore.updateMemberSegment"
    :remove-membership="adminStore.removeMembership"
    @membership-space-change="adminStore.handleMembershipSpaceChange"
  />
</template>
