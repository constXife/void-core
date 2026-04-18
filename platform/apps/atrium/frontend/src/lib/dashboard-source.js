const hasOwn = (value, key) =>
  !!value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, key);

export const prefersProvisioningDashboard = (space) =>
  String(space?.provisioning_space_id || "").trim().length > 0;

export const canUseCompatDashboardFallback = (space) => {
  if (prefersProvisioningDashboard(space)) return false;
  const databaseID = Number(space?.database_id);
  return Number.isFinite(databaseID) && databaseID > 0;
};

export const hasProvisioningDashboardSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== "object") return false;
  if (hasOwn(snapshot, "configured") || hasOwn(snapshot, "exists")) return true;
  if (Array.isArray(snapshot.blocks)) return true;
  if (hasOwn(snapshot, "space") || hasOwn(snapshot, "template")) return true;
  return false;
};
