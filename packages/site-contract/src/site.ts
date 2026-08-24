import { z } from "zod";
import { pageDocumentSchema, sectionNodeSchema, type PageDocument } from "./page.ts";

export const siteNavigationTargetSchema = z.object({
  label: z.string().min(1),
  targetPageId: z.string().min(1),
});

export const siteNavigationSchema = z.object({
  brandTargetPageId: z.string().min(1),
  items: z.array(
    siteNavigationTargetSchema.extend({ id: z.string().min(1) }),
  ),
  primaryAction: siteNavigationTargetSchema.optional(),
  secondaryAction: siteNavigationTargetSchema.optional(),
});

export const sharedRegionSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["header", "footer"]),
  version: z.number().int().nonnegative(),
  sections: z.array(sectionNodeSchema),
});

export const sitePageEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  route: z.string().min(1),
  artifactPath: z.string().min(1),
  order: z.number().int().nonnegative(),
  body: pageDocumentSchema,
});

export const siteDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  version: z.number().int().nonnegative(),
  navigation: siteNavigationSchema,
  sharedShell: z.object({
    header: sharedRegionSchema,
    footer: sharedRegionSchema,
  }),
  pages: z.array(sitePageEntrySchema).max(5),
  props: z.object({ className: z.string().optional() }).optional(),
});

export type SiteId = string;
export type PageId = string;
export type SharedRegionId = string;
export type SiteNavigation = z.infer<typeof siteNavigationSchema>;
export type SharedRegion = z.infer<typeof sharedRegionSchema>;
export type SitePageEntry = z.infer<typeof sitePageEntrySchema>;
export type SiteDocument = z.infer<typeof siteDocumentSchema>;

export function isPristineSiteDocument(site: {
  version: number;
  pages: Array<{
    body: {
      version: number;
      sections: Array<{ tools?: unknown[] }>;
    };
  }>;
  sharedShell: {
    header: { sections: Array<{ tools: Array<{ type: string }> }> };
    footer: { sections: Array<{ tools: unknown[] }> };
  };
}) {
  const page = site.pages[0];
  const headerTools = site.sharedShell.header.sections.flatMap((section) => section.tools);
  const footerTools = site.sharedShell.footer.sections.flatMap((section) => section.tools);
  const bodySections = page?.body.sections ?? [];
  const hasPristineBody =
    bodySections.length === 0 ||
    (bodySections.length === 1 && bodySections[0]?.tools?.length === 0);
  return site.version === 0
    && site.pages.length === 1
    && page?.body.version === 0
    && hasPristineBody
    && headerTools.length === 1
    && headerTools[0]?.type === "navbar"
    && footerTools.length === 0;
}

export function requireSitePage(site: SiteDocument, pageId: PageId) {
  const page = site.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new SiteContractError("page_not_found", `Page ${pageId} was not found.`);
  return page;
}

export function getPageRoute(site: SiteDocument, pageId: PageId) {
  return requireSitePage(site, pageId).route;
}

export function composeSitePage(site: SiteDocument, pageId: PageId): PageDocument {
  const page = requireSitePage(site, pageId);
  return {
    ...page.body,
    title: page.title,
    sections: [
      ...resolveRegionSections(site.sharedShell.header, site, pageId),
      ...page.body.sections,
      ...resolveRegionSections(site.sharedShell.footer, site, pageId),
    ],
  };
}

function resolveRegionSections(
  region: SharedRegion,
  site: SiteDocument,
  currentPageId: PageId,
) {
  return region.sections.map((section) => ({
    ...section,
    tools: section.tools.map((tool) => {
      if (tool.type !== "navbar" || tool.siteBinding?.kind !== "site-navigation") {
        return tool;
      }
      return {
        ...tool,
        props: {
          ...tool.props,
          brandHref: getPageRoute(site, site.navigation.brandTargetPageId),
          items: site.navigation.items.map((item) => ({
            label: item.label,
            href: getPageRoute(site, item.targetPageId),
            active: item.targetPageId === currentPageId,
          })),
          ...(site.navigation.primaryAction
            ? { primaryAction: resolveAction(site, site.navigation.primaryAction) }
            : { primaryAction: undefined }),
          ...(site.navigation.secondaryAction
            ? { secondaryAction: resolveAction(site, site.navigation.secondaryAction) }
            : { secondaryAction: undefined }),
        },
      };
    }),
  }));
}

function resolveAction(
  site: SiteDocument,
  action: { label: string; targetPageId: string },
) {
  return { label: action.label, href: getPageRoute(site, action.targetPageId) };
}

export class SiteContractError extends Error {
  readonly code: string;

  constructor(
    code: string,
    message: string,
  ) {
    super(message);
    this.name = "SiteContractError";
    this.code = code;
  }
}
