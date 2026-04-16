const isScalarQueryValue = (value) => {
  const kind = typeof value;
  return kind === "string" || kind === "number" || kind === "boolean";
};

const appendQuery = (href, params) => {
  const rawHref = String(href || "").trim();
  if (!rawHref) return "";
  const [withoutHash, hash = ""] = rawHref.split("#", 2);
  const [pathname, search = ""] = withoutHash.split("?", 2);
  const query = new URLSearchParams(search);

  if (params && typeof params === "object") {
    for (const [key, value] of Object.entries(params)) {
      if (!isScalarQueryValue(value)) continue;
      query.set(key, String(value));
    }
  }

  const encoded = query.toString();
  const nextHref = encoded ? `${pathname}?${encoded}` : pathname;
  return hash ? `${nextHref}#${hash}` : nextHref;
};

export function resolveBlockInspectHref(block) {
  const inspect = block?.contract?.inspect;
  if (!inspect || typeof inspect !== "object") return "";

  const preferredTarget = String(inspect.preferred_target || "").trim().toLowerCase();
  const resourceUrl = String(inspect?.resource?.url || "").trim();
  const inspectPath = String(inspect?.path || "").trim();
  const params = inspect?.params;

  if (preferredTarget === "resource" && resourceUrl) {
    return appendQuery(resourceUrl, params);
  }
  if (preferredTarget === "resource") {
    return "";
  }
  if (inspectPath) {
    return appendQuery(inspectPath, params);
  }
  if (resourceUrl) {
    return appendQuery(resourceUrl, params);
  }
  return "";
}
