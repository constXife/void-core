import { computed, ref } from "vue";

const devEnvPresent =
  typeof __ATRIUM_DEV_ENV_PRESENT__ !== "undefined" && __ATRIUM_DEV_ENV_PRESENT__;
const devAllowedEmailsRaw =
  typeof __ATRIUM_DEV_AUTH_ALLOWED_EMAILS__ === "string"
    ? __ATRIUM_DEV_AUTH_ALLOWED_EMAILS__
    : "";
const devAdminEmailsRaw =
  typeof __ATRIUM_DEV_AUTH_ADMIN_EMAILS__ === "string"
    ? __ATRIUM_DEV_AUTH_ADMIN_EMAILS__
    : "";
const devLocalEmailRaw =
  typeof __ATRIUM_DEV_AUTH_LOCAL_EMAIL__ === "string"
    ? __ATRIUM_DEV_AUTH_LOCAL_EMAIL__
    : "";
const devLocalPasswordRaw =
  typeof __ATRIUM_DEV_AUTH_LOCAL_PASSWORD__ === "string"
    ? __ATRIUM_DEV_AUTH_LOCAL_PASSWORD__
    : "";

const parseCSV = (value) =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

export function useAtriumAuthPage(fetchJSON, t) {
  const loginUrl = ref("/auth/login");
  const loginPageUrl = ref("/login");
  const loginEmail = ref("");
  const loginPassword = ref("");
  const loginNext = ref("/");
  const loginError = ref("");
  const loginBusy = ref(false);
  const authModes = ref({ local: true, oidc: true });

  const devLoginEmails = computed(() => {
    if (!import.meta.env.DEV || !devEnvPresent) return [];
    const emails = [];
    for (const email of parseCSV(devLocalEmailRaw)) {
      if (!emails.includes(email)) emails.push(email);
    }
    for (const email of parseCSV(devAdminEmailsRaw)) {
      if (!emails.includes(email)) emails.push(email);
    }
    for (const email of parseCSV(devAllowedEmailsRaw)) {
      if (!emails.includes(email)) emails.push(email);
    }
    return emails;
  });

  const devLocalPassword =
    import.meta.env.DEV && devEnvPresent ? devLocalPasswordRaw : "";

  const showDevLogin = computed(
    () => authModes.value.local && !!devLocalPassword && devLoginEmails.value.length > 0
  );

  const hasLoginOption = computed(
    () => authModes.value.oidc || showDevLogin.value
  );

  const loadAuthModes = async () => {
    try {
      authModes.value = await fetchJSON("/api/auth/modes");
    } catch {
      authModes.value = { local: true, oidc: true };
    }
  };

  const setLoginTarget = (next) => {
    loginUrl.value = `/auth/login?next=${encodeURIComponent(next)}`;
    loginPageUrl.value = `/login?next=${encodeURIComponent(next)}`;
    loginNext.value = next;
  };

  const submitLocalLogin = async () => {
    loginError.value = "";
    loginBusy.value = true;
    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: loginEmail.value,
          password: loginPassword.value,
          next: loginNext.value
        })
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || t("auth.loginFailed"));
      }
      const payload = await res.json().catch(() => null);
      const redirectTo = payload?.redirect_to || loginNext.value || "/";
      window.location.assign(redirectTo);
    } catch (err) {
      loginError.value = err.message || t("auth.loginFailed");
    } finally {
      loginBusy.value = false;
    }
  };

  const applyDevLogin = async (email) => {
    loginEmail.value = email;
    loginPassword.value = devLocalPassword;
    await submitLocalLogin();
  };

  return {
    authModes,
    hasLoginOption,
    loadAuthModes,
    loginBusy,
    loginError,
    loginNext,
    loginPageUrl,
    loginUrl,
    setLoginTarget,
    showDevLogin,
    devLoginEmails,
    applyDevLogin
  };
}
