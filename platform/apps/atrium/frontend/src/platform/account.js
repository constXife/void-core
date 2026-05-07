const ACCOUNT_ID_FIELDS = ["user_id", "id", "subject_id", "sub"];
const ACCOUNT_EMAIL_FIELDS = ["email", "subject_email"];
const ACCOUNT_NAME_FIELDS = ["display_name", "displayName", "name", "full_name", "fullName"];
const ACCOUNT_AVATAR_FIELDS = ["avatar_url", "avatarUrl", "picture", "image_url", "imageUrl"];

export function resolvePlatformAccount(user, options = {}) {
  if (!user || typeof user !== "object") return null;
  if (user.authenticated === false) return null;

  const role = firstText([options.role, user.role]);
  if (role === "guest") return null;

  const email = readTextField(user, ACCOUNT_EMAIL_FIELDS);
  const userId = readTextField(user, ACCOUNT_ID_FIELDS);
  if (!email && !userId) return null;

  const displayName = readTextField(user, ACCOUNT_NAME_FIELDS);
  const avatarUrl = readTextField(user, ACCOUNT_AVATAR_FIELDS);
  const label = email || displayName || userId;

  return {
    raw: user,
    email,
    userId,
    role,
    displayName,
    avatarUrl,
    label,
    initials: resolveAccountInitials(displayName || email || userId)
  };
}

export function hasResolvedPlatformAccount(user, options = {}) {
  return Boolean(resolvePlatformAccount(user, options));
}

export function resolvePlatformUserIdentity(user, options = {}) {
  return resolvePlatformAccount(user, options);
}

export function resolvePlatformUserInitials(user, options = {}) {
  return resolvePlatformAccount(user, options)?.initials || "";
}

export function resolvePlatformUserAvatarUrl(user, options = {}) {
  return resolvePlatformAccount(user, options)?.avatarUrl || "";
}

function readTextField(source, fields) {
  return firstText(fields.map((field) => source?.[field]));
}

function firstText(values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function resolveAccountInitials(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const nameParts = text
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const initials = nameParts.length >= 2
    ? `${nameParts[0][0]}${nameParts[1][0]}`
    : text[0];
  return initials.toUpperCase();
}
