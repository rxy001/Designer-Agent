import {
  applySitePatch as applyContractSitePatch,
  createSharedRegionSourceSection,
  digestValue,
} from "@designer-agent/site-contract";
export {
  composeSitePage,
  requireSitePage,
} from "@designer-agent/site-contract";
import type {
  ComposedSectionOwner,
  PageDocument,
  SiteDocument,
  SitePatchBundle,
} from "./types";

export type InitialSharedMountOptions = {
  header?: boolean;
  footer?: boolean;
};

export function createInitialSite(
  page: PageDocument,
  sharedMounts: InitialSharedMountOptions = {},
): SiteDocument {
  return {
    id: `site_${Date.now()}`,
    title: "Untitled Site",
    version: 0,
    navigation: {
      brandTargetPageId: page.id,
      items: [{ id: "nav_home", label: "Home", targetPageId: page.id }],
    },
    sharedShell: {
      header: {
        id: "site_header",
        kind: "header",
        version: 0,
        mounted: sharedMounts.header ?? true,
        sections: [createSharedRegionSourceSection("header")],
      },
      footer: {
        id: "site_footer",
        kind: "footer",
        version: 0,
        mounted: sharedMounts.footer ?? true,
        sections: [createSharedRegionSourceSection("footer")],
      },
    },
    pages: [{ id: page.id, route: "/", body: page }],
  };
}

export function getComposedSectionOwner(site: SiteDocument, pageId: string, sectionId: string): ComposedSectionOwner {
  if (site.sharedShell.header.sections.some((section) => section.id === sectionId)) return { kind: "header" };
  if (site.sharedShell.footer.sections.some((section) => section.id === sectionId)) return { kind: "footer" };
  return { kind: "page-body", pageId };
}

export function applySitePatch(site: SiteDocument, bundle: SitePatchBundle): SiteDocument {
  return applyContractSitePatch(site, bundle);
}

export function siteDigest(site: SiteDocument) {
  return digestValue(site);
}
