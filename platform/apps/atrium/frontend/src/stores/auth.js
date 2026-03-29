import { storeToRefs } from "pinia";
import { defineStore } from "pinia";
import { useAtriumAppStore } from "./atrium-app.js";

export const useAuthStore = defineStore("atrium-auth", () => {
  const app = useAtriumAppStore();
  const {
    actualIsAdmin,
    actualRole,
    authEnabled,
    effectiveRole,
    isAdmin,
    loginPageUrl,
    me,
    roleOptions,
    roleOverrideActive,
    roleOverrideSelection,
    userInitials
  } = storeToRefs(app);

  return {
    actualIsAdmin,
    actualRole,
    authEnabled,
    effectiveRole,
    isAdmin,
    loginPageUrl,
    logout: app.logout,
    me,
    roleOptions,
    roleOverrideActive,
    roleOverrideSelection,
    userInitials
  };
});
