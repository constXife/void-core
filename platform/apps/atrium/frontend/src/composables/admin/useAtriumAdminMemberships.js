import { ref } from "vue";
import {
  createMembershipBulkForm,
  createMembershipForm
} from "./useAtriumAdminForms.js";
import { parseBulkEmails } from "./useAtriumAdminHelpers.js";

export function useAtriumAdminMemberships({ fetchJSON, error, notify, translate }) {
  const memberships = ref([]);
  const membershipSpaceId = ref("");
  const membershipForm = ref(createMembershipForm());
  const membershipBulk = ref(createMembershipBulkForm());

  const loadMemberships = async (spaceId) => {
    if (!spaceId) {
      memberships.value = [];
      return;
    }
    try {
      const items = await fetchJSON(`/atrium/memberships?space_id=${encodeURIComponent(spaceId)}`);
      memberships.value = items.map((item) => ({
        ...item,
        user_segment: item.user_segment || ""
      }));
    } catch (err) {
      error.value = err.message || "Memberships load failed";
    }
  };

  const onMembershipSpaceChange = async () => {
    membershipForm.value = createMembershipForm();
    await loadMemberships(membershipSpaceId.value);
  };

  const addMembership = async () => {
    if (!membershipSpaceId.value) {
      error.value = translate("admin.members.selectSpaceError");
      return;
    }
    try {
      const payload = {
        email: membershipForm.value.email,
        space_id: membershipSpaceId.value,
        role_key: membershipForm.value.roleKey || "",
        valid_to: membershipForm.value.validTo
          ? new Date(membershipForm.value.validTo).toISOString()
          : null
      };
      if (membershipForm.value.userSegment?.trim()) {
        payload.user_segment = membershipForm.value.userSegment.trim();
      }
      await fetchJSON("/atrium/memberships", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      membershipForm.value = createMembershipForm();
      await loadMemberships(membershipSpaceId.value);
    } catch (err) {
      error.value = err.message || "Membership create failed";
    }
  };

  const updateMemberSegment = async (member) => {
    if (!member?.principal_id) return;
    try {
      const payload = { user_segment: (member.user_segment || "").trim() };
      await fetchJSON(`/atrium/users/${encodeURIComponent(member.principal_id)}/segment`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      notify(translate("admin.segmentSaved"), "success");
    } catch (err) {
      error.value = err.message || "Segment update failed";
    }
  };

  const importMemberships = async () => {
    if (!membershipSpaceId.value) {
      error.value = translate("admin.members.selectSpaceError");
      return;
    }
    try {
      const emails = parseBulkEmails(membershipBulk.value.emails);
      const payload = {
        space_id: membershipSpaceId.value,
        role_key: membershipBulk.value.roleKey || "",
        emails,
        valid_to: membershipBulk.value.validTo
          ? new Date(membershipBulk.value.validTo).toISOString()
          : null
      };
      const result = await fetchJSON("/atrium/memberships/import", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      membershipBulk.value = {
        ...membershipBulk.value,
        emails: ""
      };
      await loadMemberships(membershipSpaceId.value);
      notify(translate("admin.members.importDone", { count: result.imported }), "success");
    } catch (err) {
      error.value = err.message || "Membership import failed";
    }
  };

  const removeMembership = async (member) => {
    try {
      await fetchJSON(
        `/atrium/memberships/${encodeURIComponent(member.principal_id)}/${encodeURIComponent(member.space_id)}`,
        {
          method: "DELETE"
        }
      );
      memberships.value = memberships.value.filter(
        (item) => !(item.principal_id === member.principal_id && item.space_id === member.space_id)
      );
    } catch (err) {
      error.value = err.message || "Membership delete failed";
    }
  };

  return {
    addMembership,
    importMemberships,
    loadMemberships,
    membershipBulk,
    membershipForm,
    memberships,
    membershipSpaceId,
    onMembershipSpaceChange,
    removeMembership,
    updateMemberSegment
  };
}
