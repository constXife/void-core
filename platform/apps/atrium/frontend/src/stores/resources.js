import { storeToRefs } from "pinia";
import { defineStore } from "pinia";
import { useAtriumAppStore } from "./atrium-app.js";

export const useResourceStore = defineStore("atrium-resource", () => {
  const app = useAtriumAppStore();
  const {
    resourcePopoverItem,
    resourcePopoverOpen,
    resourcePopoverPlacement,
    resourcePopoverViewer,
    serviceDetailsItem,
    serviceDetailsOpen
  } = storeToRefs(app);

  return {
    actionLabel: app.actionLabel,
    canOpenResourceDetails: app.canOpenResourceDetails,
    closeResourcePopover: app.closeResourcePopover,
    closeServiceDetails: app.closeServiceDetails,
    copyText: app.copyText,
    formatEndpointLine: app.formatEndpointLine,
    invokeServiceAction: app.invokeServiceAction,
    normalizeActionKeys: app.normalizeActionKeys,
    normalizeLinks: app.normalizeLinks,
    openServiceDetails: app.openServiceDetails,
    rememberResourceVisit: app.rememberResourceVisit,
    resourceInitial: app.resourceInitial,
    resourcePopoverItem,
    resourcePopoverOpen,
    resourcePopoverPlacement,
    resourcePopoverViewer,
    resolveIconUrl: app.normalizeIconUrl,
    runSurfaceAction: app.runSurfaceAction,
    s3EndpointsFor: app.s3EndpointsFor,
    serviceDetailsItem,
    serviceDetailsOpen,
    serviceStatusLabel: app.serviceStatusLabel,
    surfaceCardsFor: app.surfaceCardsFor,
    surfaceHeadingFor: app.surfaceHeadingFor,
    toggleResourcePopover: app.toggleResourcePopover
  };
});
