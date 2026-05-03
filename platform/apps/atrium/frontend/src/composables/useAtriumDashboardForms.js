export const createDashboardEditForm = (type) => ({
  title: "",
  type,
  x: 1,
  y: 1,
  w: 6,
  h: 2,
  order: 1,
  limit: 8,
  scope: "this",
  filter: "",
  text: ""
});

export const createInlineAddForm = () => ({
  title: "",
  body: "",
  url: "",
  priority: "normal",
  pinned: false
});
