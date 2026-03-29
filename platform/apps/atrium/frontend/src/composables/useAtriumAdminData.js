import { ref } from "vue";
import { spacePublicEntry } from "./useAtriumShellMeta.js";

const createNewSpaceForm = () => ({
  title: "",
  slug: "",
  type: "audience",
  parentId: "",
  dashboardTemplateId: "",
  visibilityGroups: "",
  layoutMode: "grid",
  backgroundUrl: "",
  isLockable: true,
  accessMode: "private",
  isDefaultPublicEntry: false,
  publicEntryTitle: "",
  publicEntrySubtitle: "",
  publicEntryHelp: "",
  publicEntryContact: "",
  description: "",
  displayConfig: "{}",
  personalizationRules: "{}"
});

const createMembershipForm = () => ({
  email: "",
  roleId: "",
  validTo: "",
  userSegment: ""
});

const createMembershipBulkForm = () => ({
  emails: "",
  roleId: "",
  validTo: ""
});

const createDirectoryForm = (audienceGroups = "") => ({
  title: "",
  description: "",
  iconUrl: "",
  url: "",
  type: "resource",
  pinned: false,
  tags: "",
  actionKeys: "",
  audienceGroups,
  serviceType: "",
  owners: "",
  links: "",
  endpoints: "",
  tier: "",
  lifecycle: "",
  accessPath: "",
  runbookUrl: "",
  classification: "",
  dependsOn: ""
});

const parseVisibilityGroups = (value) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const formatGroups = (groups) =>
  Array.isArray(groups) ? groups.filter(Boolean).join(", ") : "";

const parseCommaList = (value) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const formatJSON = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
};

const parseJSONInput = (value, fallback) => {
  if (!value || !value.trim()) return fallback;
  return JSON.parse(value);
};

const parseJSONInputSafe = (value, fallback, label) => {
  try {
    return parseJSONInput(value, fallback);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
};

const resolveIconUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("icons/")) return `/${raw}`;
  if (raw.includes("/")) return `/${raw}`;
  const hasExt = raw.includes(".");
  return `/icons/${raw}${hasExt ? "" : ".svg"}`;
};

const mapDirectoryItem = (item) => ({
  ...item,
  audienceInput: formatGroups(item.audience_groups),
  tagsInput: formatGroups(item.tags),
  actionKeysInput: formatGroups(item.action_keys),
  ownersInput: formatJSON(item.owners, "{}"),
  linksInput: formatJSON(item.links, "{}"),
  endpointsInput: formatJSON(item.endpoints, "[]"),
  dependsOnInput: formatGroups(item.depends_on),
  serviceType: item.service_type || "",
  tier: item.tier || "",
  lifecycle: item.lifecycle || "",
  accessPath: item.access_path || "",
  runbookUrl: item.runbook_url || "",
  classification: item.classification || ""
});

const parseBulkEmails = (value) =>
  value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const buildPublicEntry = (source) => {
  const entry = {};
  if (source.publicEntryTitle) entry.title = source.publicEntryTitle;
  if (source.publicEntrySubtitle) entry.subtitle = source.publicEntrySubtitle;
  if (source.publicEntryHelp) entry.help = source.publicEntryHelp;
  if (source.publicEntryContact) entry.contact = source.publicEntryContact;
  return entry;
};

export function useAtriumAdminData({ fetchJSON, error, notify, translate }) {
  const spacesAdmin = ref([]);
  const archivedSpacesAdmin = ref([]);
  const newSpace = ref(createNewSpaceForm());
  const editSpace = ref(null);
  const editDisplayConfig = ref("");
  const editPersonalizationRules = ref("");
  const dashboardTemplates = ref([]);
  const roles = ref([]);
  const memberships = ref([]);
  const membershipSpaceId = ref("");
  const membershipForm = ref(createMembershipForm());
  const membershipBulk = ref(createMembershipBulkForm());
  const contentSpaceId = ref("");
  const directoryAdmin = ref([]);
  const directoryForm = ref(createDirectoryForm());

  const setAdminSpaces = (items) => {
    const list = Array.isArray(items) ? items : [];
    spacesAdmin.value = list.filter((item) => item?.is_provisioned !== false);
    archivedSpacesAdmin.value = list.filter((item) => item?.is_provisioned === false);
  };

  const reloadAdminSpaces = async () => {
    const allSpaces = await fetchJSON("/api/spaces?include_archived=1");
    setAdminSpaces(allSpaces);

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

  const loadMemberships = async (spaceId) => {
    if (!spaceId) {
      memberships.value = [];
      return;
    }
    try {
      const items = await fetchJSON(`/api/memberships?space_id=${spaceId}`);
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
        space_id: Number(membershipSpaceId.value),
        role_id: Number(membershipForm.value.roleId) || 0,
        valid_to: membershipForm.value.validTo
          ? new Date(membershipForm.value.validTo).toISOString()
          : null
      };
      if (membershipForm.value.userSegment?.trim()) {
        payload.user_segment = membershipForm.value.userSegment.trim();
      }
      await fetchJSON("/api/memberships", {
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
      await fetchJSON(`/api/users/${member.principal_id}`, {
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
        space_id: Number(membershipSpaceId.value),
        role_id: Number(membershipBulk.value.roleId) || 0,
        emails,
        valid_to: membershipBulk.value.validTo
          ? new Date(membershipBulk.value.validTo).toISOString()
          : null
      };
      const result = await fetchJSON("/api/memberships/import", {
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
      await fetchJSON(`/api/memberships/${member.principal_id}/${member.space_id}`, {
        method: "DELETE"
      });
      memberships.value = memberships.value.filter(
        (item) => !(item.principal_id === member.principal_id && item.space_id === member.space_id)
      );
    } catch (err) {
      error.value = err.message || "Membership delete failed";
    }
  };

  const defaultAudienceForSpace = (spaceId) => {
    const space = spacesAdmin.value.find((item) => String(item.id) === String(spaceId));
    if (!space) return "";
    return formatGroups(space.visibility_groups);
  };

  const loadContent = async (spaceId) => {
    if (!spaceId) {
      directoryAdmin.value = [];
      return;
    }
    try {
      const dir = await fetchJSON(`/api/directory_items?space_id=${spaceId}`);
      directoryAdmin.value = dir.map((item) => mapDirectoryItem(item));
    } catch (err) {
      error.value = err.message || "Content load failed";
    }
  };

  const onContentSpaceChange = async () => {
    const defaults = defaultAudienceForSpace(contentSpaceId.value);
    directoryForm.value = {
      ...directoryForm.value,
      audienceGroups: defaults
    };
    await loadContent(contentSpaceId.value);
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
        space_id: Number(contentSpaceId.value),
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
      const created = await fetchJSON("/api/directory_items", {
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
      const updated = await fetchJSON(`/api/directory_items/${item.id}`, {
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
      await fetchJSON(`/api/directory_items/${item.id}`, { method: "DELETE" });
      directoryAdmin.value = directoryAdmin.value.filter((entry) => entry.id !== item.id);
      notify(translate("admin.content.deletedDirectory"), "success");
    } catch (err) {
      error.value = err.message || "Directory delete failed";
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
    }
  };

  const loadAdminSeams = async () => {
    await reloadAdminSpaces();
    dashboardTemplates.value = await fetchJSON("/api/dashboard/templates");
    roles.value = await fetchJSON("/api/roles");
    await refreshAdminDataAfterSpaceChange();
  };

  const createSpace = async () => {
    try {
      const displayConfig = JSON.parse(newSpace.value.displayConfig || "{}");
      const personalizationRules = JSON.parse(newSpace.value.personalizationRules || "{}");
      if (newSpace.value.description) {
        displayConfig.description = newSpace.value.description;
      } else {
        delete displayConfig.description;
      }
      const parentId = Number(newSpace.value.parentId) || null;
      const dashboardTemplateId = Number(newSpace.value.dashboardTemplateId) || null;
      const visibilityGroups = parseVisibilityGroups(newSpace.value.visibilityGroups || "");
      const payload = {
        title: newSpace.value.title,
        slug: newSpace.value.slug,
        type: newSpace.value.type,
        parent_id: parentId,
        dashboard_template_id: dashboardTemplateId,
        access_mode: newSpace.value.accessMode || "private",
        is_default_public_entry:
          (newSpace.value.accessMode || "private") === "public_readonly" &&
          !!newSpace.value.isDefaultPublicEntry,
        layout_mode: newSpace.value.layoutMode,
        background_url: newSpace.value.backgroundUrl,
        is_lockable: newSpace.value.isLockable,
        visibility_groups: visibilityGroups,
        display_config: displayConfig,
        personalization_rules: personalizationRules,
        public_entry: buildPublicEntry(newSpace.value)
      };
      await fetchJSON("/api/spaces", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      await loadAdminSeams();
      newSpace.value = createNewSpaceForm();
    } catch (err) {
      error.value = err.message || "Space create failed";
    }
  };

  const startEditSpace = (space) => {
    const description = space?.display_config?.description || "";
    editSpace.value = {
      ...space,
      type: space?.type || "audience",
      parentId: space?.parent_id ? String(space.parent_id) : "",
      dashboardTemplateId: space?.dashboard_template_id ? String(space.dashboard_template_id) : "",
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
  };

  const updateSpace = async () => {
    try {
      const displayConfig = JSON.parse(editDisplayConfig.value || "{}");
      const personalizationRules = JSON.parse(editPersonalizationRules.value || "{}");
      if (editSpace.value.description) {
        displayConfig.description = editSpace.value.description;
      } else {
        delete displayConfig.description;
      }
      const parentId = Number(editSpace.value.parentId) || null;
      const dashboardTemplateId = Number(editSpace.value.dashboardTemplateId) || null;
      const visibilityGroups = parseVisibilityGroups(editSpace.value.visibilityGroups || "");
      const payload = {
        title: editSpace.value.title,
        slug: editSpace.value.slug,
        type: editSpace.value.type,
        parent_id: parentId,
        dashboard_template_id: dashboardTemplateId,
        access_mode: editSpace.value.accessMode || "private",
        is_default_public_entry:
          (editSpace.value.accessMode || "private") === "public_readonly" &&
          !!editSpace.value.isDefaultPublicEntry,
        layout_mode: editSpace.value.layoutMode || "grid",
        background_url: editSpace.value.backgroundUrl || "",
        is_lockable: editSpace.value.isLockable ?? true,
        visibility_groups: visibilityGroups,
        display_config: displayConfig,
        personalization_rules: personalizationRules,
        public_entry: buildPublicEntry(editSpace.value)
      };
      await fetchJSON(`/api/spaces/${editSpace.value.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      await loadAdminSeams();
      editSpace.value = null;
      editDisplayConfig.value = "";
      editPersonalizationRules.value = "";
    } catch (err) {
      error.value = err.message || "Space update failed";
    }
  };

  const deleteSpace = async (space) => {
    if (!confirm(translate("admin.spaces.confirmDelete", { title: space.title }))) return;
    try {
      await fetchJSON(`/api/spaces/${space.id}`, {
        method: "DELETE"
      });
      await loadAdminSeams();
    } catch (err) {
      error.value = err.message || "Space delete failed";
    }
  };

  const archiveSpace = async (space) => {
    if (!confirm(translate("admin.spaces.confirmArchive", { title: space.title }))) return;
    try {
      await fetchJSON(`/api/spaces/${space.id}/archive`, {
        method: "POST"
      });
      await loadAdminSeams();
      notify(translate("admin.spaces.archivedDone"), "success");
    } catch (err) {
      error.value = err.message || "Space archive failed";
    }
  };

  const restoreSpace = async (space) => {
    if (!confirm(translate("admin.spaces.confirmRestore", { title: space.title }))) return;
    try {
      await fetchJSON(`/api/spaces/${space.id}/restore`, {
        method: "POST"
      });
      await loadAdminSeams();
      notify(translate("admin.spaces.restoredDone"), "success");
    } catch (err) {
      error.value = err.message || "Space restore failed";
    }
  };

  return {
    archiveSpace,
    archivedSpacesAdmin,
    contentSpaceId,
    createDirectoryItem,
    createSpace,
    dashboardTemplates,
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
    reloadAdminSpaces,
    removeMembership,
    restoreSpace,
    roles,
    spacesAdmin,
    startEditSpace,
    updateDirectoryItem,
    updateMemberSegment,
    updateSpace,
    addMembership
  };
}
