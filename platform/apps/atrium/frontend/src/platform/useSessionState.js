import { readonly, ref } from "vue";
import { checkSession } from "./auth.js";

export function createSessionState(load = checkSession) {
  const session = ref(null);
  const sessionLoaded = ref(false);
  const sessionLoading = ref(false);
  let sessionRequest = null;

  const loadSession = async (force = false) => {
    if (!force) {
      if (sessionRequest) return await sessionRequest;
      if (sessionLoaded.value) return session.value;
    }

    sessionLoading.value = true;
    sessionRequest = (async () => {
      try {
        const payload = await load();
        session.value = payload;
        sessionLoaded.value = true;
        return payload;
      } catch {
        session.value = null;
        sessionLoaded.value = true;
        return null;
      } finally {
        sessionLoading.value = false;
        sessionRequest = null;
      }
    })();

    return await sessionRequest;
  };

  return {
    session: readonly(session),
    sessionLoaded: readonly(sessionLoaded),
    sessionLoading: readonly(sessionLoading),
    loadSession
  };
}
