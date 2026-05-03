import { ref } from "vue";
import { useAtriumAdminDirectory } from "./admin/useAtriumAdminDirectory.js";
import { mergeProvisioningSpace } from "./admin/useAtriumAdminHelpers.js";
import { useAtriumAdminMemberships } from "./admin/useAtriumAdminMemberships.js";
import { useAtriumAdminSpaces } from "./admin/useAtriumAdminSpaces.js";

export function useAtriumAdminData({ fetchJSON, error, notify, translate }) {
  const spacesAdmin = ref([]);
  const archivedSpacesAdmin = ref([]);
  const roles = ref([]);
  const provisioningCatalog = ref(null);
  const provisioningRoles = ref([]);

  const {
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
  } = useAtriumAdminMemberships({ fetchJSON, error, notify, translate });

  const {
    archiveSpace,
    clearProvisioningSpaceDetail,
    createSpace,
    deleteSpace,
    editDisplayConfig,
    editPersonalizationRules,
    editSpace,
    newSpace,
    provisioningSpaceDetail,
    provisioningSpaceDetailLoading,
    restoreSpace,
    startEditSpace,
    updateSpace
  } = useAtriumAdminSpaces({
    fetchJSON,
    error,
    notify,
    reloadAllAdminData: async () => loadAdminSeams(),
    translate
  });

  const {
    contentSpaceId,
    createDirectoryItem,
    deleteDirectoryItem,
    directoryAdmin,
    directoryForm,
    normalizeIconUrl,
    onContentSpaceChange,
    provisioningDirectoryAdmin,
    selectedContentSpace,
    updateDirectoryItem
  } = useAtriumAdminDirectory({ fetchJSON, error, notify, spacesAdmin, translate });

  const setAdminSpaces = (items, provisioningCatalog = null) => {
    const list = Array.isArray(items) ? items : [];
    const provisioningSpaces = Array.isArray(provisioningCatalog?.catalog?.spaces)
      ? provisioningCatalog.catalog.spaces
      : [];
    const provisioningBySlug = new Map(
      provisioningSpaces
        .filter((item) => item?.id)
        .map((item) => [String(item.id), item])
    );
    const merged = list.map((item) => {
      const slug = String(item?.slug || "").trim();
      return mergeProvisioningSpace(item, slug ? provisioningBySlug.get(slug) : null);
    });
    spacesAdmin.value = merged.filter((item) => item?.is_provisioned !== false);
    archivedSpacesAdmin.value = merged.filter((item) => item?.is_provisioned === false);
  };

  const reloadAdminSpaces = async (provisioningCatalog = null) => {
    const allSpaces = await fetchJSON("/atrium/spaces?include_archived=true");
    setAdminSpaces(allSpaces, provisioningCatalog);

    if (
      !membershipSpaceId.value ||
      !spacesAdmin.value.some((item) => String(item.id) === String(membershipSpaceId.value))
    ) {
      membershipSpaceId.value = spacesAdmin.value[0] ? String(spacesAdmin.value[0].id) : "";
    }
    if (
      !contentSpaceId.value ||
      !spacesAdmin.value.some((item) => String(item.id) === String(contentSpaceId.value))
    ) {
      contentSpaceId.value = spacesAdmin.value[0] ? String(spacesAdmin.value[0].id) : "";
    }
  };

  const refreshAdminDataAfterSpaceChange = async () => {
    if (membershipSpaceId.value) {
      await loadMemberships(membershipSpaceId.value);
    } else {
      memberships.value = [];
    }
    if (contentSpaceId.value) {
      await onContentSpaceChange();
    } else {
      directoryAdmin.value = [];
      provisioningDirectoryAdmin.value = [];
    }
  };

  const loadAdminSeams = async () => {
    const loadedProvisioningCatalog = await fetchJSON("/atrium/provisioning/catalog").catch(
      () => null
    );
    await reloadAdminSpaces(loadedProvisioningCatalog);
    provisioningCatalog.value = loadedProvisioningCatalog;
    provisioningRoles.value = Array.isArray(loadedProvisioningCatalog?.catalog?.roles)
      ? loadedProvisioningCatalog.catalog.roles
      : [];
    roles.value = provisioningRoles.value.map((role) => ({
      id: role.key,
      key: role.key,
      name: role.name || role.key,
      permissions: Array.isArray(role.permissions) ? role.permissions : []
    }));
    await refreshAdminDataAfterSpaceChange();
  };

  return {
    archiveSpace,
    archivedSpacesAdmin,
    contentSpaceId,
    createDirectoryItem,
    createSpace,
    deleteDirectoryItem,
    deleteSpace,
    directoryAdmin,
    directoryForm,
    editDisplayConfig,
    editPersonalizationRules,
    editSpace,
    importMemberships,
    loadAdminSeams,
    membershipBulk,
    membershipForm,
    membershipSpaceId,
    memberships,
    newSpace,
    normalizeIconUrl,
    onContentSpaceChange,
    onMembershipSpaceChange,
    provisioningCatalog,
    provisioningDirectoryAdmin,
    provisioningSpaceDetail,
    provisioningSpaceDetailLoading,
    reloadAdminSpaces,
    removeMembership,
    restoreSpace,
    provisioningRoles,
    roles,
    selectedContentSpace,
    spacesAdmin,
    startEditSpace,
    clearProvisioningSpaceDetail,
    updateDirectoryItem,
    updateMemberSegment,
    updateSpace,
    addMembership
  };
}
