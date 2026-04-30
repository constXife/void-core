import { computed, ref } from "vue";

const resourceTitleFallback = (item) => {
  const title = item?.title;
  if (title && typeof title === "object") {
    return title.translations?.en || Object.values(title.translations || {})[0] || title.key || "";
  }
  return String(title || "");
};

export function useAtriumResources({
  BLOCK_TYPES,
  blockDataFor,
  blockTypeIs,
  blocksForSpace,
  fetchJSON,
  isAdminSpace,
  isKidsSpace,
  isPublicReadonlySpace,
  navigateTo,
  navigateToAdmin,
  notify,
  recentResourcesBySpace,
  recentResourcesKey,
  settingsStore,
  showUserDropdown,
  spaces,
  t,
  userMenuRef,
  withRoleOverride
}) {
  const viewerKeyForResource = (item) => {
    if (!item) return "";
    if (item.viewer_key) return String(item.viewer_key);
    if (item.type === "service" && item.service_type) {
      return `service.${String(item.service_type).toLowerCase()}`;
    }
    if (item.type === "service") return "service.default";
    return "";
  };

  const canOpenResourceDetails = (item) => {
    if (!item) return false;
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const wantsDetails = tags.some((tag) => {
      const value = String(tag || "").toLowerCase();
      return value === "details" || value === "details:enabled";
    });
    if (item.viewer_key) return true;
    return wantsDetails;
  };

  const resourcePopoverOpen = ref(false);
  const resourcePopoverItem = ref(null);
  const resourcePopoverViewer = computed(() => viewerKeyForResource(resourcePopoverItem.value));
  const resourcePopoverPlacement = ref("left");
  const resourcePopoverAnchor = ref(null);

  const resourceInitial = (item) => {
    const title = resourceTitleFallback(item).trim();
    return title ? title[0].toUpperCase() : "•";
  };

  const closeResourcePopover = () => {
    resourcePopoverOpen.value = false;
    resourcePopoverItem.value = null;
    resourcePopoverAnchor.value = null;
  };

  const updateResourcePopoverPlacement = (anchor) => {
    if (!anchor || typeof window === "undefined") return;
    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth || 0;
    const popoverWidth = Math.min(rect.width + 280, Math.max(0, viewportWidth - 24));
    const spaceRight = viewportWidth - rect.left;
    const spaceLeft = rect.right;

    let placement = "left";
    if (popoverWidth <= spaceRight) {
      placement = "left";
    } else if (popoverWidth <= spaceLeft) {
      placement = "right";
    } else {
      placement = spaceRight >= spaceLeft ? "left" : "right";
    }
    resourcePopoverPlacement.value = placement;
  };

  const handleGlobalClick = (event) => {
    if (showUserDropdown.value && userMenuRef.value) {
      const target = event?.target;
      if (!target || !userMenuRef.value.contains(target)) {
        showUserDropdown.value = false;
      }
    }
    if (!resourcePopoverOpen.value || !resourcePopoverItem.value) return;
    const target = event?.target;
    if (!target?.closest) return;
    const card = target.closest(".resource-card");
    const activeId = String(resourcePopoverItem.value.id || "");
    if (!card) {
      closeResourcePopover();
      return;
    }
    const cardId = card.getAttribute("data-resource-id") || "";
    if (cardId !== activeId) {
      closeResourcePopover();
    }
  };

  const openResourcePopover = (item, anchor) => {
    resourcePopoverItem.value = item;
    resourcePopoverOpen.value = true;
    resourcePopoverAnchor.value = anchor || null;
    updateResourcePopoverPlacement(resourcePopoverAnchor.value);
  };

  const toggleResourcePopover = (event, item) => {
    if (!item || !canOpenResourceDetails(item)) return;
    if (resourcePopoverOpen.value && resourcePopoverItem.value?.id === item.id) {
      closeResourcePopover();
      return;
    }
    const anchor = event?.target?.closest?.(".resource-card") || null;
    openResourcePopover(item, anchor);
  };

  const normalizeActionKeys = (value) => {
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

  const serviceStatusLabel = (item) => {
    const status = item?.status || item?.health_status;
    if (!status) return "";
    return String(status);
  };

  const normalizeLinks = (links) => {
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

  const formatEndpointLine = (endpoint) => {
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

  const s3EndpointsFor = (item) => {
    const endpoints = Array.isArray(item?.endpoints) ? item.endpoints : [];
    const filtered = endpoints.filter((endpoint) => {
      const value = String(endpoint?.type || "").toLowerCase();
      return value === "s3";
    });
    return filtered.length ? filtered : endpoints;
  };

  const copyText = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      notify(t("resource.copied"), "success");
    } catch {
      notify(t("resource.copyFailed"), "error");
    }
  };

  const actionLabel = (key) => {
    const value = String(key || "").trim();
    if (!value) return "";
    const last = value.split(".").pop() || value;
    return last
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());
  };

  const invokeServiceAction = async (actionKey, item) => {
    if (!actionKey) return;
    const itemSpace = spaces.value.find((space) => Number(space.database_id) === Number(item?.space_id));
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

  const resourceEntriesForSpace = (space) => {
    if (!space?.id) return [];
    const blocks = blocksForSpace(space.id).filter((block) =>
      blockTypeIs(block, BLOCK_TYPES.resourcesPinned)
    );
    const items = [];
    for (const block of blocks) {
      const data = blockDataFor(space.id, block.id);
      if (Array.isArray(data)) {
        items.push(...data);
      }
    }
    return items;
  };

  const surfaceCardsFor = (space) => {
    if (!space) return [];
    const resources = resourceEntriesForSpace(space);
    if (isAdminSpace(space)) {
      return [
        {
          id: "admin-backup",
          eyebrow: t("surface.admin.backupTitle"),
          title: t("surface.state.ready"),
          body: t("surface.admin.backupBody")
        },
        {
          id: "admin-update",
          eyebrow: t("surface.admin.updateTitle"),
          title: t("surface.state.review"),
          body: t("surface.admin.updateBody")
        },
        {
          id: "admin-critical",
          eyebrow: t("surface.admin.criticalTitle"),
          title: resources.length ? t("surface.state.clear") : t("surface.state.attention"),
          body: t("surface.admin.criticalBody"),
          actions: [
            {
              id: "open-admin",
              label: t("surface.action.openAdmin"),
              actionKind: "admin-tab",
              actionTarget: "overview",
              disabled: false
            }
          ]
        }
      ];
    }
    if (isKidsSpace(space)) {
      const safeResources = resources.slice(0, 3).map(resourceTitleFallback);
      return [
        {
          id: "kids-safe",
          eyebrow: t("surface.kids.safeTitle"),
          title: t("surface.state.ready"),
          body: t("surface.kids.safeBody")
        },
        {
          id: "kids-allowed",
          eyebrow: t("surface.kids.allowedTitle"),
          title: safeResources.length ? safeResources.join(" · ") : t("surface.state.ready"),
          body: safeResources.length ? t("surface.kids.allowedBody") : t("surface.kids.allowedBody")
        },
        {
          id: "kids-help",
          eyebrow: t("surface.kids.helpTitle"),
          title: t("surface.state.guided"),
          body: t("surface.kids.helpBody")
        }
      ];
    }
    return [];
  };

  const surfaceHeadingFor = (space) => {
    if (!space) return { title: "", subtitle: "" };
    if (isAdminSpace(space)) {
      return {
        title: t("surface.admin.title"),
        subtitle: t("surface.admin.subtitle")
      };
    }
    if (isKidsSpace(space)) {
      return {
        title: t("surface.kids.title"),
        subtitle: t("surface.kids.subtitle")
      };
    }
    return { title: "", subtitle: "" };
  };

  const surfaceCardActions = (card) => {
    if (Array.isArray(card?.actions) && card.actions.length) return card.actions;
    if (card?.actionLabel && card?.actionTarget) {
      return [
        {
          id: `${String(card?.id || "card")}-primary-action`,
          label: card.actionLabel,
          actionKind: card.actionKind,
          actionTarget: card.actionTarget,
          disabled: false
        }
      ];
    }
    return [];
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
    actionLabel,
    canOpenResourceDetails,
    closeResourcePopover,
    copyText,
    formatEndpointLine,
    handleGlobalClick,
    invokeServiceAction,
    normalizeActionKeys,
    normalizeLinks,
    rememberResourceVisit,
    resourceInitial,
    resourcePopoverAnchor,
    resourcePopoverItem,
    resourcePopoverOpen,
    resourcePopoverPlacement,
    resourcePopoverViewer,
    runSurfaceAction,
    s3EndpointsFor,
    serviceStatusLabel,
    surfaceCardActions,
    surfaceCardsFor,
    surfaceHeadingFor,
    toggleResourcePopover,
    updateResourcePopoverPlacement
  };
}
