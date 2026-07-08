import { z } from "zod";

export const gridAreaSchema = z.object({
  rowStart: z.number().int().positive(),
  columnStart: z.number().int().positive(),
  rowEnd: z.number().int().positive(),
  columnEnd: z.number().int().positive(),
});

const layoutSchema = z.object({
  gridArea: gridAreaSchema,
  zIndex: z.number().int(),
  responsive: z
    .object({
      tablet: z
        .object({
          gridArea: gridAreaSchema.optional(),
          zIndex: z.number().int().optional(),
        })
        .optional(),
      mobile: z
        .object({
          gridArea: gridAreaSchema.optional(),
          zIndex: z.number().int().optional(),
        })
        .optional(),
    })
    .optional(),
});

const sectionGridOverrideSchema = z.object({
  columns: z.number().int().positive().optional(),
  rows: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  columnGap: z.number().nonnegative().optional(),
  rowGap: z.number().nonnegative().optional(),
});

const sectionGridSchema = z.object({
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
});

const genericRecordSchema: z.ZodType<Record<string, unknown>> = z.record(
  z.string(),
  z.unknown(),
);

export const toolSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "text",
    "image",
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
  layout: layoutSchema,
  props: genericRecordSchema,
});

export const sectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("section"),
  name: z.string().min(1),
  props: z
    .object({
      className: z.string().optional(),
    })
    .optional(),
  grid: sectionGridSchema,
  tools: z.array(toolSchema),
});

export const pageDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  version: z.number().int().nonnegative(),
  viewport: z.enum(["desktop", "tablet", "mobile"]),
  props: z
    .object({
      className: z.string().optional(),
    })
    .optional(),
  sections: z.array(sectionSchema),
});

export const pagePatchSchema = z.array(
  z.discriminatedUnion("op", [
    z.object({
      op: z.literal("replacePage"),
      page: pageDocumentSchema,
    }),
    z.object({
      op: z.literal("addTool"),
      sectionId: z.string(),
      tool: toolSchema,
    }),
    z.object({
      op: z.literal("updateTool"),
      toolId: z.string(),
      changes: toolSchema.partial(),
    }),
    z.object({
      op: z.literal("removeTool"),
      toolId: z.string(),
    }),
    z.object({
      op: z.literal("addSection"),
      section: sectionSchema,
      afterSectionId: z.string().optional(),
    }),
    z.object({
      op: z.literal("removeSection"),
      sectionId: z.string(),
    }),
    z.object({
      op: z.literal("updateSection"),
      sectionId: z.string(),
      changes: sectionSchema.partial(),
    }),
  ]),
);

export type GridArea = z.infer<typeof gridAreaSchema>;
export type ToolNode = z.infer<typeof toolSchema>;
export type SectionNode = z.infer<typeof sectionSchema>;
export type PageDocument = z.infer<typeof pageDocumentSchema>;
export type PagePatch = z.infer<typeof pagePatchSchema>;
