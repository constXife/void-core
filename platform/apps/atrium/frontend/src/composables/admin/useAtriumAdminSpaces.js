import { ref } from "vue";
import { createNewSpaceForm } from "./useAtriumAdminForms.js";
import {
  buildPublicEntry,
  parseVisibilityGroups
} from "./useAtriumAdminHelpers.js";
import { spacePublicEntry } from "../useAtriumShellMeta.js";

export function useAtriumAdminSpaces({ fetchJSON, error, notify, reloadAllAdminData, translate }) {
  const newSpace = ref(createNewSpaceForm());
  const editSpace = ref(null);
  const editDisplayConfig = ref("");
  const editPersonalizationRules = ref("");
  const provisioningSpaceDetail = ref(null);
  const provisioningSpaceDetailLoading = ref(false);

  const clearProvisioningSpaceDetail = () => {
    provisioningSpaceDetail.value = null;
    provisioningSpaceDetailLoading.value = false;
  };

  const loadProvisioningSpaceDetail = async (spaceSlug) => {
    const normalizedSpaceSlug = String(spaceSlug || "").trim();
    if (!normalizedSpaceSlug) {
      clearProvisioningSpaceDetail();
      return;
    }
    provisioningSpaceDetailLoading.value = true;
    try {
      provisioningSpaceDetail.value = await fetchJSON(
        `/atrium/spaces/${encodeURIComponent(normalizedSpaceSlug)}`
      );
    } catch {
      provisioningSpaceDetail.value = null;
    } finally {
      provisioningSpaceDetailLoading.value = false;
    }
  };

  const createSpacePayload = (source, displayConfig, personalizationRules) => {
    if (source.description) {
      displayConfig.description = source.description;
    } else {
      delete displayConfig.description;
    }
    const parentId = String(source.parentId || "").trim() || null;
    return {
      title: source.title,
      slug: source.slug,
      type: source.type,
      parent_id: parentId,
      access_mode: source.accessMode || "private",
      is_default_public_entry:
        (source.accessMode || "private") === "public_readonly" && !!source.isDefaultPublicEntry,
      layout_mode: source.layoutMode || "grid",
      background_url: source.backgroundUrl || "",
      is_lockable: source.isLockable ?? true,
      visibility_groups: parseVisibilityGroups(source.visibilityGroups || ""),
      display_config: displayConfig,
      personalization_rules: personalizationRules,
      public_entry: buildPublicEntry(source)
    };
  };

  const createSpace = async () => {
    try {
      const displayConfig = JSON.parse(newSpace.value.displayConfig || "{}");
      const personalizationRules = JSON.parse(newSpace.value.personalizationRules || "{}");
      await fetchJSON("/atrium/spaces", {
        method: "POST",
        body: JSON.stringify(
          createSpacePayload(newSpace.value, displayConfig, personalizationRules)
        )
      });
      await reloadAllAdminData();
      newSpace.value = createNewSpaceForm();
    } catch (err) {
      error.value = err.message || "Space create failed";
    }
  };

  const startEditSpace = async (space) => {
    const description = space?.provisioning_description || space?.display_config?.description || "";
    editSpace.value = {
      ...space,
      type: space?.type || "audience",
      parentId: space?.parent_id ? String(space.parent_id) : "",
      visibilityGroups: Array.isArray(space?.visibility_groups)
        ? space.visibility_groups.join(", ")
        : "",
      layoutMode: space.layout_mode || "grid",
      backgroundUrl: space.background_url || "",
      isLockable: space.is_lockable ?? true,
      accessMode: space.access_mode || "private",
      isDefaultPublicEntry: !!space.is_default_public_entry,
      description
    };
    const publicEntry = spacePublicEntry(space);
    editSpace.value.publicEntryTitle = publicEntry?.title || "";
    editSpace.value.publicEntrySubtitle = publicEntry?.subtitle || "";
    editSpace.value.publicEntryHelp = publicEntry?.help || "";
    editSpace.value.publicEntryContact = publicEntry?.contact || "";
    editDisplayConfig.value = JSON.stringify(space.display_config || {}, null, 2);
    editPersonalizationRules.value = JSON.stringify(space.personalization_rules || {}, null, 2);
    const spaceSlug = String(space?.provisioning_space_id || space?.slug || "").trim();
    await loadProvisioningSpaceDetail(spaceSlug);
  };

  const updateSpace = async () => {
    try {
      const displayConfig = JSON.parse(editDisplayConfig.value || "{}");
      const personalizationRules = JSON.parse(editPersonalizationRules.value || "{}");
      await fetchJSON(`/atrium/spaces/${encodeURIComponent(editSpace.value.id)}`, {
        method: "PATCH",
        body: JSON.stringify(
          createSpacePayload(editSpace.value, displayConfig, personalizationRules)
        )
      });
      await reloadAllAdminData();
      editSpace.value = null;
      editDisplayConfig.value = "";
      editPersonalizationRules.value = "";
      clearProvisioningSpaceDetail();
    } catch (err) {
      error.value = err.message || "Space update failed";
    }
  };

  const deleteSpace = async (space) => {
    if (!confirm(translate("admin.spaces.confirmDelete", { title: space.title }))) return;
    try {
      await fetchJSON(`/atrium/spaces/${encodeURIComponent(space.id)}`, {
        method: "DELETE"
      });
      await reloadAllAdminData();
    } catch (err) {
      error.value = err.message || "Space delete failed";
    }
  };

  const archiveSpace = async (space) => {
    if (!confirm(translate("admin.spaces.confirmArchive", { title: space.title }))) return;
    try {
      await fetchJSON(`/atrium/spaces/${encodeURIComponent(space.id)}/archive`, {
        method: "POST"
      });
      await reloadAllAdminData();
      notify(translate("admin.spaces.archivedDone"), "success");
    } catch (err) {
      error.value = err.message || "Space archive failed";
    }
  };

  const restoreSpace = async (space) => {
    if (!confirm(translate("admin.spaces.confirmRestore", { title: space.title }))) return;
    try {
      await fetchJSON(`/atrium/spaces/${encodeURIComponent(space.id)}/restore`, {
        method: "POST"
      });
      await reloadAllAdminData();
      notify(translate("admin.spaces.restoredDone"), "success");
    } catch (err) {
      error.value = err.message || "Space restore failed";
    }
  };

  return {
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
  };
}
