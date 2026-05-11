import { resourceTitleFallback } from "./useAtriumResourceFormatting.js";

export function useAtriumResourceActions({
  fetchJSON,
  isPublicReadonlySpace,
  navigateTo,
  navigateToAdmin,
  notify,
  recentResourcesBySpace,
  recentResourcesKey,
  settingsStore,
  spaces,
  surfaceCardActions,
  t,
  withRoleOverride
}) {
  const copyText = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      notify(t("resource.copied"), "success");
    } catch {
      notify(t("resource.copyFailed"), "error");
    }
  };

  const invokeServiceAction = async (actionKey, item) => {
    if (!actionKey) return;
    const itemSpace = spaces.value.find(
      (space) => Number(space.database_id) === Number(item?.space_id)
    );
    if (isPublicReadonlySpace(itemSpace)) {
      notify(t("resource.publicReadonly"), "error");
      return;
    }
    try {
      await fetchJSON(withRoleOverride("/atrium/actions/invoke"), {
        method: "POST",
        body: JSON.stringify({
          action_key: actionKey,
          space_id: item?.space_id,
          params: {
            service_key: item?.key,
            directory_item_id: item?.id
          }
        })
      });
      notify(t("resource.actionInvoked"), "success");
    } catch (err) {
      notify(err.message || t("resource.actionFailed"), "error");
    }
  };

  const rememberResourceVisit = (space, item) => {
    const spaceId = String(space?.id || item?.space_id || "");
    const title = resourceTitleFallback(item).trim();
    const url = String(item?.url || "").trim();
    if (!spaceId || !title || !url) return;
    const entry = {
      id: String(item?.id || title),
      title,
      url
    };
    const current = Array.isArray(recentResourcesBySpace.value[spaceId])
      ? recentResourcesBySpace.value[spaceId]
      : [];
    const next = [entry, ...current.filter((value) => value.id !== entry.id)].slice(0, 4);
    recentResourcesBySpace.value = {
      ...recentResourcesBySpace.value,
      [spaceId]: next
    };
    settingsStore.setJSON(recentResourcesKey, recentResourcesBySpace.value);
  };

  const openResourceLink = (space, item, event) => {
    const url = String(item?.url || "").trim();
    if (!url) return;
    const target = event?.target;
    if (target?.closest?.("a,button,input,select,textarea,[role='button']")) return;
    rememberResourceVisit(space, item);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const runSurfaceAction = async (value) => {
    const action = value?.actionKind ? value : surfaceCardActions(value)[0];
    if (!action?.actionKind || action.disabled) return;
    if (action.actionKind === "url") {
      window.open(action.actionTarget, "_blank", "noopener,noreferrer");
      return;
    }
    if (action.actionKind === "route") {
      navigateTo(action.actionTarget);
      return;
    }
    if (action.actionKind === "admin-tab") {
      navigateToAdmin(action.actionTarget);
      return;
    }
    if (action.actionKind === "handler" && typeof action.actionTarget === "function") {
      await action.actionTarget();
    }
  };

  return {
    copyText,
    invokeServiceAction,
    openResourceLink,
    rememberResourceVisit,
    runSurfaceAction
  };
}
