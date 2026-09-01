import { z } from "zod";
import { siteDocumentSchema, siteNavigationSchema } from "./site.ts";
import { sitePatchBundleSchema } from "./sitePatch.ts";

export const deliveryPolicySchema = z.enum(["strict", "best_effort"]);

export const siteEditTargetOwnerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("page-body"), pageId: z.string().min(1) }),
  z.object({ kind: z.literal("shared-region"), region: z.enum(["header", "footer"]) }),
]);

export const siteEditTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("site") }),
  z.object({ kind: z.literal("page"), pageId: z.string().min(1) }),
  z.object({ kind: z.literal("shared-region"), region: z.enum(["header", "footer"]) }),
  z.object({ kind: z.literal("section"), owner: siteEditTargetOwnerSchema, sectionId: z.string().min(1) }),
  z.object({ kind: z.literal("tool"), owner: siteEditTargetOwnerSchema, sectionId: z.string().min(1), toolId: z.string().min(1) }),
]);

export const siteDesignContractSchema = z.object({
  brand: z.object({
    productName: z.string(),
    visualDirection: z.string(),
    tone: z.string(),
  }),
  sharedCopy: z.object({
    primaryCta: z.string().optional(),
    secondaryCta: z.string().optional(),
    footerCopy: z.string().optional(),
  }),
  typographyRules: z.array(z.string()),
  colorRules: z.array(z.string()),
  imageryRules: z.array(z.string()),
  responsiveRules: z.array(z.string()),
  consistencyRules: z.array(z.string()),
  shellRequirements: z.object({
    header: z.array(z.string()),
    footer: z.array(z.string()),
  }),
});

export const publicSitePlanSchema = z.object({
  id: z.string().min(1),
  planDigest: z.string().min(1),
  target: siteEditTargetSchema,
  baseSiteVersion: z.number().int().nonnegative(),
  siteObjective: z.string(),
  shell: z.object({ action: z.enum(["create", "modify", "keep"]), requirements: z.array(z.string()) }),
  pages: z.array(z.object({
    taskKey: z.string(),
    pageId: z.string(),
    title: z.string(),
    route: z.string(),
    action: z.enum(["create", "modify", "remove"]),
    objective: z.string(),
    requirements: z.array(z.string()),
  })).max(5),
  navigation: siteNavigationSchema,
  designContract: siteDesignContractSchema,
});

export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ai.site.plan.request"), requestId: z.string(), prompt: z.string(), designSystemId: z.number().int(), site: siteDocumentSchema, target: siteEditTargetSchema }),
  z.object({ type: z.literal("ai.site.plan.cancel"), requestId: z.string() }),
  z.object({
    type: z.literal("ai.site.plan.approve"),
    requestId: z.string(),
    planId: z.string(),
    planDigest: z.string(),
    currentSiteVersion: z.number().int().nonnegative(),
    currentSiteDigest: z.string().min(1),
    deliveryPolicy: deliveryPolicySchema,
  }),
  z.object({ type: z.literal("ai.site.plan.reject"), requestId: z.string(), planId: z.string() }),
  z.object({ type: z.literal("ai.site.reduced-plan.approve"), requestId: z.string(), batchId: z.string(), planDigest: z.string() }),
  z.object({ type: z.literal("ai.site.reduced-plan.reject"), requestId: z.string(), batchId: z.string() }),
  z.object({ type: z.literal("site.patch.ready"), requestId: z.string(), batchId: z.string(), bundleDigest: z.string() }),
  z.object({ type: z.literal("site.patch.reject"), requestId: z.string(), batchId: z.string(), reason: z.string() }),
  z.object({ type: z.literal("ai.site.cancel"), requestId: z.string(), batchId: z.string() }),
  z.object({ type: z.literal("site.lock.heartbeat"), siteId: z.string(), batchId: z.string(), leaseId: z.string() }),
  z.object({ type: z.literal("site.batch.resume"), siteId: z.string(), batchId: z.string() }),
]);

export type DeliveryPolicy = z.infer<typeof deliveryPolicySchema>;
export type SiteEditTargetOwner = z.infer<typeof siteEditTargetOwnerSchema>;
export type SiteEditTarget = z.infer<typeof siteEditTargetSchema>;
export type SiteDesignContract = z.infer<typeof siteDesignContractSchema>;
export type PublicSitePlan = z.infer<typeof publicSitePlanSchema>;
export type ClientMessage = z.infer<typeof clientMessageSchema>;

export type ServerMessage =
  | { type: "ai.site.plan.proposed"; requestId: string; plan: PublicSitePlan }
  | { type: "ai.site.plan.cancelled"; requestId: string }
  | { type: "site.lock.acquired"; requestId: string; batchId: string; leaseId: string }
  | { type: "site.lock.released"; requestId: string; batchId: string }
  | { type: "ai.page.status"; requestId: string; batchId: string; pageId: string; status: string }
  | { type: "ai.shell.status"; requestId: string; batchId: string; status: string }
  | { type: "ai.site.status"; requestId: string; batchId: string; status: string }
  | { type: "ai.page.message"; requestId: string; batchId: string; pageId: string; text: string }
  | { type: "ai.page.todos"; requestId: string; batchId: string; pageId: string; todos: Array<{ name: string; status: "pending" | "in_progress" | "completed" }> }
  | { type: "ai.site.reduced-plan.proposed"; requestId: string; batchId: string; plan: PublicSitePlan; expiresAt: number }
  | { type: "site.patch.prepare"; requestId: string; batch: z.infer<typeof sitePatchBundleSchema>; projectedSiteDigest: string }
  | { type: "site.patch.commit"; requestId: string; batchId: string; bundleDigest: string; siteVersion: number }
  | { type: "site.patch.abort"; requestId: string; batchId: string; reason: string }
  | { type: "preview.updated"; requestId: string; batchId: string; pageId: string; previewUrl: string }
  | { type: "ai.delta"; requestId: string; text: string }
  | { type: "error"; requestId?: string; code: string; message: string };
