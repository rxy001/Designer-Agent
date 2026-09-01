import { z } from "zod";
import { pagePatchSchema } from "./page.ts";
import {
  sharedRegionSchema,
  siteNavigationSchema,
  sitePageEntrySchema,
} from "./site.ts";

export const sitePatchOperationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("replaceSharedRegion"),
    region: z.enum(["header", "footer"]),
    baseRegionVersion: z.number().int().nonnegative(),
    value: sharedRegionSchema,
  }),
  z.object({ op: z.literal("updateNavigation"), value: siteNavigationSchema }),
  z.object({ op: z.literal("createPage"), page: sitePageEntrySchema }),
  z.object({
    op: z.literal("updatePage"),
    pageId: z.string().min(1),
    basePageVersion: z.number().int().nonnegative(),
    metadata: z
      .object({
        title: z.string().optional(),
        route: z.string().optional(),
      })
      .optional(),
    patch: pagePatchSchema,
  }),
  z.object({
    op: z.literal("removePage"),
    pageId: z.string().min(1),
    basePageVersion: z.number().int().nonnegative(),
  }),
  z.object({
    op: z.literal("reorderPages"),
    pageIds: z.array(z.string().min(1)),
  }),
]);

export const sitePatchBundleSchema = z.object({
  batchId: z.string().min(1),
  siteId: z.string().min(1),
  baseSiteVersion: z.number().int().nonnegative(),
  nextSiteVersion: z.number().int().nonnegative(),
  planDigest: z.string().min(1),
  bundleDigest: z.string().min(1),
  operations: z.array(sitePatchOperationSchema),
});

export type SitePatchOperation = z.infer<typeof sitePatchOperationSchema>;
export type SitePatchBundle = z.infer<typeof sitePatchBundleSchema>;
