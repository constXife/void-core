import { resourceTitleFallback } from "./useAtriumResourceFormatting.js";

export function useAtriumResourceSurfaces({
  BLOCK_TYPES,
  blockDataFor,
  blockTypeIs,
  blocksForSpace,
  isAdminSpace,
  isKidsSpace,
  t
}) {
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
    // Admin surface card (backup/update/critical 3-card hero) was removed —
    // its meaning was unclear from the user perspective and it duplicated the
    // dedicated admin panel routes. Admin space now renders pinned resources
    // directly without the hero header.
    if (isAdminSpace(space)) {
      return [];
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

  return {
    surfaceCardActions,
    surfaceCardsFor,
    surfaceHeadingFor
  };
}
