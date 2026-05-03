export const defaultInlineEditForm = (type) => ({
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

export const inlineEditedBlock = (block, form, blockLgLayout, defaultBlockConfig) => ({
  ...block,
  title: form.title,
  type: form.type,
  layout: {
    ...block.layout,
    lg: { ...blockLgLayout(block), x: form.x, y: form.y, w: form.w, h: form.h },
    xs: { order: Number(form.order || 1) }
  },
  config: {
    limit: Number(form.limit || 0) || defaultBlockConfig(form.type).limit,
    scope: form.scope || "this",
    filter: form.filter || "",
    text: form.text || ""
  }
});

export const nextInlineBlockY = (blocks, blockLgLayout) => {
  if (blocks.length === 0) return 1;
  return Math.max(
    ...blocks.map((block) => (blockLgLayout(block).y || 1) + (blockLgLayout(block).h || 2)),
    1
  );
};
