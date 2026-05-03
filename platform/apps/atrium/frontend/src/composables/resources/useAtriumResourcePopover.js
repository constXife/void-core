import { computed, ref } from "vue";
import {
  canOpenResourceDetails,
  viewerKeyForResource
} from "./useAtriumResourceFormatting.js";

export function useAtriumResourcePopover({ showUserDropdown, userMenuRef }) {
  const resourcePopoverOpen = ref(false);
  const resourcePopoverItem = ref(null);
  const resourcePopoverViewer = computed(() => viewerKeyForResource(resourcePopoverItem.value));
  const resourcePopoverPlacement = ref("left");
  const resourcePopoverAnchor = ref(null);

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

  return {
    closeResourcePopover,
    handleGlobalClick,
    resourcePopoverAnchor,
    resourcePopoverItem,
    resourcePopoverOpen,
    resourcePopoverPlacement,
    resourcePopoverViewer,
    toggleResourcePopover,
    updateResourcePopoverPlacement
  };
}
