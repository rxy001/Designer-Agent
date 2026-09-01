import { z } from "zod";

export const MIN_SECTION_HEIGHT = 96;

export const gridAreaSchema = z.object({
  rowStart: z.number().int().positive(),
  columnStart: z.number().int().positive(),
  rowEnd: z.number().int().positive(),
  columnEnd: z.number().int().positive(),
});

const responsiveLayoutSchema = z.object({
  gridArea: gridAreaSchema.optional(),
  zIndex: z.number().int().optional(),
});

const toolLayoutSchema = z.object({
  gridArea: gridAreaSchema,
  zIndex: z.number().int(),
  responsive: z
    .object({
      tablet: responsiveLayoutSchema.optional(),
      mobile: responsiveLayoutSchema.optional(),
    })
    .optional(),
});

export const siteToolBindingSchema = z.object({
  kind: z.literal("site-navigation"),
});

export const buttonActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("link"),
    href: z.string(),
    target: z.string().optional(),
  }),
  z.object({ type: z.literal("overlay"), targetId: z.string().min(1) }),
  z.object({ type: z.literal("submit") }),
  z.object({ type: z.literal("none") }),
]);

export const overlayNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["dialog", "alert-dialog", "toast", "drawer"]),
  name: z.string().min(1),
  props: z.record(z.string(), z.unknown()),
});

export const toolNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "text",
    "input",
    "badge",
    "avatar",
    "list",
    "newsletter",
    "image",
    "icon",
    "button",
    "card",
    "navbar",
    "divider",
    "accordion",
    "carousel",
    "contact",
    "social",
    "tabs",
    "custom",
  ]),
  name: z.string().min(1),
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
  layout: toolLayoutSchema,
  siteBinding: siteToolBindingSchema.optional(),
  props: z.record(z.string(), z.unknown()),
});

const sectionGridOverrideSchema = z.object({
  columns: z.number().int().positive().optional(),
  rows: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  columnGap: z.number().nonnegative().optional(),
  rowGap: z.number().nonnegative().optional(),
});

export const sectionNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("section"),
  name: z.string().min(1),
  props: z.object({ className: z.string().optional() }).optional(),
  grid: z.object({
    columns: z.number().int().positive(),
    rows: z.number().int().positive(),
    height: z.number().int().positive(),
    columnGap: z.number().nonnegative(),
    rowGap: z.number().nonnegative(),
    responsive: z
      .object({
        tablet: sectionGridOverrideSchema.optional(),
        mobile: sectionGridOverrideSchema.optional(),
      })
      .optional(),
  }),
  tools: z.array(toolNodeSchema),
});

export const pageDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  version: z.number().int().nonnegative(),
  viewport: z.enum(["desktop", "tablet", "mobile"]),
  props: z.object({ className: z.string().optional() }).optional(),
  sections: z.array(sectionNodeSchema),
  overlays: z.array(overlayNodeSchema).optional(),
});

export const pagePatchOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("replacePage"), page: pageDocumentSchema }),
  z.object({
    op: z.literal("addTool"),
    sectionId: z.string().min(1),
    tool: toolNodeSchema,
  }),
  z.object({
    op: z.literal("updateTool"),
    toolId: z.string().min(1),
    changes: toolNodeSchema.partial(),
  }),
  z.object({ op: z.literal("removeTool"), toolId: z.string().min(1) }),
  z.object({
    op: z.literal("addSection"),
    section: sectionNodeSchema,
    afterSectionId: z.string().min(1).optional(),
  }),
  z.object({ op: z.literal("removeSection"), sectionId: z.string().min(1) }),
  z.object({
    op: z.literal("updateSection"),
    sectionId: z.string().min(1),
    changes: sectionNodeSchema.partial(),
  }),
  z.object({
    op: z.literal("addOverlay"),
    overlay: overlayNodeSchema,
    afterOverlayId: z.string().min(1).optional(),
  }),
  z.object({
    op: z.literal("updateOverlay"),
    overlayId: z.string().min(1),
    changes: overlayNodeSchema.omit({ id: true }).partial(),
  }),
  z.object({ op: z.literal("removeOverlay"), overlayId: z.string().min(1) }),
  z.object({
    op: z.literal("reorderOverlays"),
    overlayIds: z.array(z.string().min(1)),
  }),
]);

export const pagePatchSchema = z.array(pagePatchOperationSchema);

export type GridArea = z.infer<typeof gridAreaSchema>;
export type SiteToolBinding = z.infer<typeof siteToolBindingSchema>;
export type ButtonAction = z.infer<typeof buttonActionSchema>;
export type OverlayNode = z.infer<typeof overlayNodeSchema>;
export type ToolNode = z.infer<typeof toolNodeSchema>;
export type SectionNode = z.infer<typeof sectionNodeSchema>;
export type PageDocument = z.infer<typeof pageDocumentSchema>;
export type PagePatch = z.infer<typeof pagePatchSchema>;
