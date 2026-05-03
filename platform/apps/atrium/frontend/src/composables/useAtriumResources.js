import {
  actionLabel,
  canOpenResourceDetails,
  formatEndpointLine,
  normalizeActionKeys,
  normalizeLinks,
  resourceInitial,
  s3EndpointsFor,
  serviceStatusLabel
} from "./resources/useAtriumResourceFormatting.js";
import { useAtriumResourceActions } from "./resources/useAtriumResourceActions.js";
import { useAtriumResourcePopover } from "./resources/useAtriumResourcePopover.js";
import { useAtriumResourceSurfaces } from "./resources/useAtriumResourceSurfaces.js";

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
  const popover = useAtriumResourcePopover({ showUserDropdown, userMenuRef });

  const {
    surfaceCardActions,
    surfaceCardsFor,
    surfaceHeadingFor
  } = useAtriumResourceSurfaces({
    BLOCK_TYPES,
    blockDataFor,
    blockTypeIs,
    blocksForSpace,
    isAdminSpace,
    isKidsSpace,
    t
  });

  const {
    copyText,
    invokeServiceAction,
    rememberResourceVisit,
    runSurfaceAction
  } = useAtriumResourceActions({
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
  });

  return {
    actionLabel,
    canOpenResourceDetails,
    closeResourcePopover: popover.closeResourcePopover,
    copyText,
    formatEndpointLine,
    handleGlobalClick: popover.handleGlobalClick,
    invokeServiceAction,
    normalizeActionKeys,
    normalizeLinks,
    rememberResourceVisit,
    resourceInitial,
    resourcePopoverAnchor: popover.resourcePopoverAnchor,
    resourcePopoverItem: popover.resourcePopoverItem,
    resourcePopoverOpen: popover.resourcePopoverOpen,
    resourcePopoverPlacement: popover.resourcePopoverPlacement,
    resourcePopoverViewer: popover.resourcePopoverViewer,
    runSurfaceAction,
    s3EndpointsFor,
    serviceStatusLabel,
    surfaceCardActions,
    surfaceCardsFor,
    surfaceHeadingFor,
    toggleResourcePopover: popover.toggleResourcePopover,
    updateResourcePopoverPlacement: popover.updateResourcePopoverPlacement
  };
}
