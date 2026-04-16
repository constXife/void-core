export function createAtriumApi({ onMaybeNotFound } = {}) {
  const fetchJSON = async (path, options = {}) => {
    const res = await fetch(path, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    if (!res.ok) {
      const text = await res.text();
      const message = text || res.statusText || "Request failed";
      throw { status: res.status, message };
    }

    if (res.status === 204 || res.status === 205) {
      return null;
    }

    const text = await res.text();
    if (!text.trim()) {
      return null;
    }

    return JSON.parse(text);
  };

  const fetchMaybeJSON = async (path, options = {}) => {
    try {
      return await fetchJSON(path, options);
    } catch (err) {
      if (err.status === 404) {
        onMaybeNotFound?.(path, err);
        return null;
      }
      if (err.status === 401 || err.status === 403) return null;
      return null;
    }
  };

  return {
    fetchJSON,
    fetchMaybeJSON
  };
}
