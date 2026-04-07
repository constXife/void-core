import { computed, ref } from "vue";

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
  shoppingSummary,
  shoppingSummaryError,
  shoppingSummaryLoading,
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
    const title = String(item?.title || "").trim();
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
      await fetchJSON(withRoleOverride("/api/actions/invoke"), {
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
    const title = String(item?.title || "").trim();
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

  const surfaceShoppingAction = () => ({
    actionKind: "route",
    actionLabel: t("surface.action.openShopping"),
    actionTarget: "/shopping"
  });

  const shoppingCardTitles = (items, fallback) => {
    const titles = (Array.isArray(items) ? items : [])
      .map((item) => String(item?.title || item?.item_name || item?.name || "").trim())
      .filter(Boolean)
      .slice(0, 2);
    return titles.length ? titles.join(" · ") : fallback;
  };

  const surfaceCardsFor = (space) => {
    if (!space) return [];
    const resources = resourceEntriesForSpace(space);
    if (isAdminSpace(space)) {
      if (shoppingSummaryLoading.value) {
        return [
          {
            id: "shopping-loading",
            eyebrow: t("surface.shopping.title"),
            title: t("surface.shopping.loadingTitle"),
            body: t("surface.shopping.loadingBody"),
            ...surfaceShoppingAction()
          }
        ];
      }
      if (shoppingSummaryError.value) {
        return [
          {
            id: "shopping-error",
            eyebrow: t("surface.shopping.title"),
            title: t("surface.state.review"),
            body: t("surface.shopping.errorBody"),
            ...surfaceShoppingAction()
          }
        ];
      }

      const summary = shoppingSummary.value || {};
      const needs = summary?.needs_to_buy || {};
      const activeRun = summary?.active_run || {};
      const recentlyClosed = summary?.recently_closed || {};
      const activeRunRecord = activeRun?.run || null;
      const activeRunItems = Array.isArray(activeRun?.items) ? activeRun.items : [];
      const actionableCount = Number(activeRun?.actionable_count || 0);

      return [
        {
          id: "shopping-needs",
          eyebrow: t("surface.shopping.needsTitle"),
          title: Number(needs?.count || 0)
            ? t("surface.shopping.needsValue", { count: Number(needs.count || 0) })
            : t("surface.shopping.emptyNeedsTitle"),
          body: shoppingCardTitles(needs?.items, t("surface.shopping.emptyNeedsBody")),
          ...surfaceShoppingAction()
        },
        {
          id: "shopping-run",
          eyebrow: t("surface.shopping.runTitle"),
          title:
            String(activeRunRecord?.title || activeRunRecord?.run_id || "").trim() ||
            t("surface.shopping.emptyRunTitle"),
          body: activeRunRecord
            ? t("surface.shopping.runValue", {
                count: activeRunItems.length,
                actionable: actionableCount
              })
            : t("surface.shopping.emptyRunBody"),
          ...surfaceShoppingAction()
        },
        {
          id: "shopping-closed",
          eyebrow: t("surface.shopping.closedTitle"),
          title: Number(recentlyClosed?.count || 0)
            ? t("surface.shopping.closedValue", { count: Number(recentlyClosed.count || 0) })
            : t("surface.shopping.emptyClosedTitle"),
          body: shoppingCardTitles(recentlyClosed?.items, t("surface.shopping.emptyClosedBody")),
          ...surfaceShoppingAction()
        }
      ];
    }
    if (isKidsSpace(space)) {
      const safeResources = resources.slice(0, 3).map((item) => item.title);
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
        title: t("surface.shopping.title"),
        subtitle: t("surface.shopping.subtitle")
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

  const runSurfaceAction = (card) => {
    if (!card?.actionKind || !card?.actionTarget) return;
    if (card.actionKind === "url") {
      window.open(card.actionTarget, "_blank", "noopener,noreferrer");
      return;
    }
    if (card.actionKind === "route") {
      navigateTo(card.actionTarget);
      return;
    }
    if (card.actionKind === "admin-tab") {
      navigateToAdmin(card.actionTarget);
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
    surfaceCardsFor,
    surfaceHeadingFor,
    toggleResourcePopover,
    updateResourcePopoverPlacement
  };
}
