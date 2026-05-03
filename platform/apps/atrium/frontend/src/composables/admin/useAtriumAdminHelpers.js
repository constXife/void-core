export const parseVisibilityGroups = (value) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const formatGroups = (groups) =>
  Array.isArray(groups) ? groups.filter(Boolean).join(", ") : "";

export const parseCommaList = (value) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const formatJSON = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
};

export const parseJSONInput = (value, fallback) => {
  if (!value || !value.trim()) return fallback;
  return JSON.parse(value);
};

export const parseJSONInputSafe = (value, fallback, label) => {
  try {
    return parseJSONInput(value, fallback);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
};

export const resolveIconUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("icons/")) return `/${raw}`;
  if (raw.includes("/")) return `/${raw}`;
  const hasExt = raw.includes(".");
  return `/icons/${raw}${hasExt ? "" : ".svg"}`;
};

export const mapDirectoryItem = (item) => ({
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

export const sortProvisioningDirectoryItems = (items) =>
  items.slice().sort((left, right) => {
    const pinnedDelta = Number(!!right?.pinned) - Number(!!left?.pinned);
    if (pinnedDelta !== 0) return pinnedDelta;
    return String(left?.title || left?.key || "").localeCompare(
      String(right?.title || right?.key || "")
    );
  });

export const mergeProvisioningSpace = (space, catalogSpace) => {
  if (!catalogSpace) return space;
  return {
    ...space,
    provisioning_space_id: catalogSpace.id || "",
    provisioning_space_state: catalogSpace.state || "",
    provisioning_description: catalogSpace.description || "",
    provisioning_parent_slug: catalogSpace.parent || "",
    provisioning_dashboard_template: catalogSpace.dashboard_template || "",
    provisioning_access_mode: catalogSpace.access_mode || "",
    provisioning_layout_mode: catalogSpace.layout_mode || "",
    provisioning_background_url: catalogSpace.background_url || "",
    provisioning_visibility_groups: Array.isArray(catalogSpace.visibility_groups)
      ? catalogSpace.visibility_groups
      : [],
    provisioning_directory_item_count: Number(catalogSpace.directory_item_count || 0),
    provisioning_is_default_public_entry: !!catalogSpace.is_default_public_entry,
    provisioning_is_lockable:
      typeof catalogSpace.is_lockable === "boolean" ? catalogSpace.is_lockable : true
  };
};

export const parseBulkEmails = (value) =>
  value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const buildPublicEntry = (source) => {
  const entry = {};
  if (source.publicEntryTitle) entry.title = source.publicEntryTitle;
  if (source.publicEntrySubtitle) entry.subtitle = source.publicEntrySubtitle;
  if (source.publicEntryHelp) entry.help = source.publicEntryHelp;
  if (source.publicEntryContact) entry.contact = source.publicEntryContact;
  return entry;
};
