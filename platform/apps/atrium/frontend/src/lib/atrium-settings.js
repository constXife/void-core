const safeParseJSON = (raw, fallback) => {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const resolveSpaceStorageKey = (space) => {
  if (!space || typeof space !== "object") return "";
  if (typeof space.slug === "string" && space.slug.trim()) return space.slug.trim();
  if (space.id != null && String(space.id).trim()) return String(space.id).trim();
  return "";
};

const buildSpaceBucketKey = (space) => {
  const key = resolveSpaceStorageKey(space);
  if (!key) return "";
  return `atrium:space:${key}:settings`;
};

export function createAtriumSettings({ getCurrentSpace } = {}) {
  const getJSON = (key, fallback) => {
    try {
      return safeParseJSON(localStorage.getItem(key), fallback);
    } catch {
      return fallback;
    }
  };

  const setJSON = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage failures
    }
  };

  const getSpaceSettings = (space) => {
    const bucketKey = buildSpaceBucketKey(space);
    if (!bucketKey) return {};
    try {
      return safeParseJSON(localStorage.getItem(bucketKey), {});
    } catch {
      return {};
    }
  };

  const setSpaceSettings = (space, nextValue) => {
    const bucketKey = buildSpaceBucketKey(space);
    if (!bucketKey) return false;
    try {
      localStorage.setItem(bucketKey, JSON.stringify(nextValue));
      return true;
    } catch {
      return false;
    }
  };

  const getCurrentSpaceJSON = (key, fallback, legacyKey = "") => {
    const currentSpace = getCurrentSpace?.() || null;
    const settings = getSpaceSettings(currentSpace);
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      return settings[key];
    }
    if (legacyKey) return getJSON(legacyKey, fallback);
    return fallback;
  };

  const setCurrentSpaceJSON = (key, value, legacyKey = "") => {
    const currentSpace = getCurrentSpace?.() || null;
    const settings = getSpaceSettings(currentSpace);
    const persisted = setSpaceSettings(currentSpace, {
      ...settings,
      [key]: value
    });
    if (!persisted && legacyKey) {
      setJSON(legacyKey, value);
    }
  };

  return {
    getJSON,
    setJSON,
    getSpaceSettings,
    setSpaceSettings,
    getCurrentSpaceJSON,
    setCurrentSpaceJSON
  };
}
