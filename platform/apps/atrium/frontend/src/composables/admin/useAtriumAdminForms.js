export const createNewSpaceForm = () => ({
  title: "",
  slug: "",
  type: "audience",
  parentId: "",
  visibilityGroups: "",
  layoutMode: "grid",
  backgroundUrl: "",
  isLockable: true,
  accessMode: "private",
  isDefaultPublicEntry: false,
  publicEntryTitle: "",
  publicEntrySubtitle: "",
  publicEntryHelp: "",
  publicEntryContact: "",
  description: "",
  displayConfig: "{}",
  personalizationRules: "{}"
});

export const createMembershipForm = () => ({
  email: "",
  roleKey: "",
  validTo: "",
  userSegment: ""
});

export const createMembershipBulkForm = () => ({
  emails: "",
  roleKey: "",
  validTo: ""
});

export const createDirectoryForm = (audienceGroups = "") => ({
  title: "",
  description: "",
  iconUrl: "",
  url: "",
  type: "resource",
  pinned: false,
  tags: "",
  actionKeys: "",
  audienceGroups,
  serviceType: "",
  owners: "",
  links: "",
  endpoints: "",
  tier: "",
  lifecycle: "",
  accessPath: "",
  runbookUrl: "",
  classification: "",
  dependsOn: ""
});
