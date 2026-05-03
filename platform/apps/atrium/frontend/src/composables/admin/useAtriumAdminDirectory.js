import { computed, ref } from "vue";
import { createDirectoryForm } from "./useAtriumAdminForms.js";
import {
  formatGroups,
  mapDirectoryItem,
  parseCommaList,
  parseJSONInputSafe,
  parseVisibilityGroups,
  resolveIconUrl,
  sortProvisioningDirectoryItems
} from "./useAtriumAdminHelpers.js";

export function useAtriumAdminDirectory({ fetchJSON, error, notify, spacesAdmin, translate }) {
  const contentSpaceId = ref("");
  const directoryAdmin = ref([]);
  const directoryForm = ref(createDirectoryForm());
  const provisioningDirectoryAdmin = ref([]);

  const selectedContentSpace = computed(() =>
    spacesAdmin.value.find((item) => String(item.id) === String(contentSpaceId.value)) || null
  );

  const defaultAudienceForSpace = (spaceId) => {
    const space = spacesAdmin.value.find((item) => String(item.id) === String(spaceId));
    if (!space) return "";
    const groups =
      Array.isArray(space.provisioning_visibility_groups) &&
      space.provisioning_visibility_groups.length > 0
        ? space.provisioning_visibility_groups
        : space.visibility_groups;
    return formatGroups(groups);
  };

  const loadContent = async (spaceId) => {
    if (!spaceId) {
      directoryAdmin.value = [];
      return;
    }
    try {
      const dir = await fetchJSON(`/atrium/directory-items?space_id=${encodeURIComponent(spaceId)}`);
      directoryAdmin.value = dir.map((item) => mapDirectoryItem(item));
    } catch (err) {
      error.value = err.message || "Content load failed";
    }
  };

  const loadProvisioningDirectory = async (spaceSlug) => {
    const normalizedSpaceSlug = String(spaceSlug || "").trim();
    if (!normalizedSpaceSlug) {
      provisioningDirectoryAdmin.value = [];
      return;
    }
    try {
      const items = await fetchJSON(
        `/atrium/directory-items?space_id=${encodeURIComponent(normalizedSpaceSlug)}`
      );
      provisioningDirectoryAdmin.value = sortProvisioningDirectoryItems(
        Array.isArray(items) ? items : []
      );
    } catch {
      provisioningDirectoryAdmin.value = [];
    }
  };

  const onContentSpaceChange = async () => {
    const defaults = defaultAudienceForSpace(contentSpaceId.value);
    directoryForm.value = {
      ...directoryForm.value,
      audienceGroups: defaults
    };
    const spaceSlug = String(
      selectedContentSpace.value?.provisioning_space_id ||
        selectedContentSpace.value?.slug ||
        ""
    ).trim();
    await Promise.all([loadContent(contentSpaceId.value), loadProvisioningDirectory(spaceSlug)]);
  };

  const normalizeIconUrl = (value) => resolveIconUrl(value);

  const createDirectoryItem = async () => {
    if (!contentSpaceId.value) {
      error.value = translate("admin.members.selectSpaceError");
      return;
    }
    try {
      const owners = parseJSONInputSafe(directoryForm.value.owners, {}, "Owners");
      const links = parseJSONInputSafe(directoryForm.value.links, {}, "Links");
      const endpoints = parseJSONInputSafe(directoryForm.value.endpoints, [], "Endpoints");
      const payload = {
        space_id: String(contentSpaceId.value),
        title: directoryForm.value.title,
        description: directoryForm.value.description,
        icon_url: normalizeIconUrl(directoryForm.value.iconUrl),
        url: directoryForm.value.url,
        type: directoryForm.value.type,
        pinned: directoryForm.value.pinned,
        tags: parseCommaList(directoryForm.value.tags || ""),
        action_keys: parseCommaList(directoryForm.value.actionKeys || ""),
        audience_groups: parseVisibilityGroups(directoryForm.value.audienceGroups || ""),
        service_type: directoryForm.value.serviceType,
        owners,
        links,
        endpoints,
        tier: directoryForm.value.tier,
        lifecycle: directoryForm.value.lifecycle,
        access_path: directoryForm.value.accessPath,
        runbook_url: directoryForm.value.runbookUrl,
        classification: directoryForm.value.classification,
        depends_on: parseCommaList(directoryForm.value.dependsOn || "")
      };
      const created = await fetchJSON("/atrium/directory-items", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      directoryAdmin.value = [mapDirectoryItem(created), ...directoryAdmin.value];
      directoryForm.value = createDirectoryForm(defaultAudienceForSpace(contentSpaceId.value));
      notify(translate("admin.content.createdDirectory"), "success");
    } catch (err) {
      error.value = err.message || "Directory create failed";
    }
  };

  const updateDirectoryItem = async (item) => {
    try {
      const owners = parseJSONInputSafe(item.ownersInput || "", {}, "Owners");
      const links = parseJSONInputSafe(item.linksInput || "", {}, "Links");
      const endpoints = parseJSONInputSafe(item.endpointsInput || "", [], "Endpoints");
      const payload = {
        title: item.title,
        description: item.description,
        icon_url: normalizeIconUrl(item.icon_url),
        url: item.url,
        type: item.type,
        key: item.key || "",
        pinned: item.pinned,
        tags: parseCommaList(item.tagsInput || ""),
        action_keys: parseCommaList(item.actionKeysInput || ""),
        audience_groups: parseVisibilityGroups(item.audienceInput || ""),
        service_type: item.serviceType || "",
        owners,
        links,
        endpoints,
        tier: item.tier || "",
        lifecycle: item.lifecycle || "",
        access_path: item.accessPath || "",
        runbook_url: item.runbookUrl || "",
        classification: item.classification || "",
        depends_on: parseCommaList(item.dependsOnInput || "")
      };
      const updated = await fetchJSON(`/atrium/directory-items/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      directoryAdmin.value = directoryAdmin.value.map((entry) =>
        entry.id === updated.id ? mapDirectoryItem(updated) : entry
      );
      notify(translate("admin.content.updatedDirectory"), "success");
    } catch (err) {
      error.value = err.message || "Directory update failed";
    }
  };

  const deleteDirectoryItem = async (item) => {
    if (!confirm(translate("admin.content.confirmDeleteDirectory", { title: item.title }))) return;
    try {
      await fetchJSON(`/atrium/directory-items/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      directoryAdmin.value = directoryAdmin.value.filter((entry) => entry.id !== item.id);
      notify(translate("admin.content.deletedDirectory"), "success");
    } catch (err) {
      error.value = err.message || "Directory delete failed";
    }
  };

  return {
    contentSpaceId,
    createDirectoryItem,
    deleteDirectoryItem,
    directoryAdmin,
    directoryForm,
    loadContent,
    loadProvisioningDirectory,
    normalizeIconUrl,
    onContentSpaceChange,
    provisioningDirectoryAdmin,
    selectedContentSpace,
    updateDirectoryItem
  };
}
