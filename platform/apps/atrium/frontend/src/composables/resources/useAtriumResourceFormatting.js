export const resourceTitleFallback = (item) => {
  const title = item?.title;
  if (title && typeof title === "object") {
    return title.translations?.en || Object.values(title.translations || {})[0] || title.key || "";
  }
  return String(title || "");
};

export const viewerKeyForResource = (item) => {
  if (!item) return "";
  if (item.viewer_key) return String(item.viewer_key);
  if (item.type === "service" && item.service_type) {
    return `service.${String(item.service_type).toLowerCase()}`;
  }
  if (item.type === "service") return "service.default";
  return "";
};

export const canOpenResourceDetails = (item) => {
  if (!item) return false;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const wantsDetails = tags.some((tag) => {
    const value = String(tag || "").toLowerCase();
    return value === "details" || value === "details:enabled";
  });
  if (item.viewer_key) return true;
  return wantsDetails;
};

export const resourceInitial = (item) => {
  const title = resourceTitleFallback(item).trim();
  return title ? title[0].toUpperCase() : "•";
};

export const normalizeActionKeys = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
};

export const serviceStatusLabel = (item) => {
  const status = item?.status || item?.health_status;
  if (!status) return "";
  return String(status);
};

export const normalizeLinks = (links) => {
  const result = [];
  if (!links || typeof links !== "object") return result;
  const keys = ["docs", "runbook", "repo", "dashboards", "logs", "traces", "console"];
  for (const key of keys) {
    const value = links[key];
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) result.push({ label: key, url: String(entry) });
      }
    } else {
      result.push({ label: key, url: String(value) });
    }
  }
  return result;
};

export const formatEndpointLine = (endpoint) => {
  if (!endpoint || typeof endpoint !== "object") return "";
  const type = String(endpoint.type || "").toLowerCase();
  if (type === "http" && endpoint.url) return endpoint.url;
  if (type === "s3") {
    const bucket = endpoint.bucket ? `s3://${endpoint.bucket}` : "";
    const region = endpoint.region ? ` (${endpoint.region})` : "";
    return `${bucket}${region}`.trim();
  }
  if (type === "postgres") {
    const host = endpoint.host || endpoint.hostname || "";
    const port = endpoint.port ? `:${endpoint.port}` : "";
    return `${host}${port}`.trim();
  }
  if (endpoint.url) return String(endpoint.url);
  if (endpoint.endpoint) return String(endpoint.endpoint);
  return "";
};

export const s3EndpointsFor = (item) => {
  const endpoints = Array.isArray(item?.endpoints) ? item.endpoints : [];
  const filtered = endpoints.filter((endpoint) => {
    const value = String(endpoint?.type || "").toLowerCase();
    return value === "s3";
  });
  return filtered.length ? filtered : endpoints;
};

export const actionLabel = (key) => {
  const value = String(key || "").trim();
  if (!value) return "";
  const last = value.split(".").pop() || value;
  return last
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());
};
