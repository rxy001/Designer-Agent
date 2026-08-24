import {
  applySitePatch as applyContractSitePatch,
  digestValue,
} from "@designer-agent/site-contract";
import type {
  ComposedSectionOwner,
  PageDocument,
  SectionNode,
  SiteDocument,
  SitePatchBundle,
} from "./types";

export function createInitialSite(page: PageDocument): SiteDocument {
  const navbarSection = createShellSection("site_header_section", "Site Header", "header");
  const footer = createShellSection("site_footer_section", "Site Footer", "footer");
  return {
    id: `site_${Date.now()}`,
    title: "Untitled Site",
    version: 0,
    navigation: {
      brandTargetPageId: page.id,
      items: [{ id: "nav_home", label: "Home", targetPageId: page.id }],
    },
    sharedShell: {
      header: { id: "site_header", kind: "header", version: 0, sections: [navbarSection] },
      footer: { id: "site_footer", kind: "footer", version: 0, sections: [footer] },
    },
    pages: [{ id: page.id, title: page.title, route: "/", artifactPath: `bodies/${page.id}.jsx`, order: 0, body: page }],
  };
}

function createShellSection(id: string, name: string, kind: "header" | "footer"): SectionNode {
  return {
    id,
    type: "section",
    name,
    grid: { columns: 12, rows: kind === "header" ? 2 : 3, height: kind === "header" ? 96 : 180, columnGap: 12, rowGap: 12 },
    tools: kind === "header" ? [{
      id: "site_navbar",
      type: "navbar",
      name: "Site Navbar",
      siteBinding: { kind: "site-navigation" },
      layout: { gridArea: { rowStart: 1, columnStart: 1, rowEnd: 3, columnEnd: 13 }, zIndex: 1 },
      props: { brand: "Brand", sticky: true, showMobileMenu: true },
    }] : [],
  };
}

export function composeSitePage(site: SiteDocument, pageId: string): PageDocument {
  const page = requireSitePage(site, pageId);
  return {
    ...page.body,
    title: page.title,
    sections: [
      ...resolveSections(site.sharedShell.header.sections, site, pageId),
      ...page.body.sections,
      ...resolveSections(site.sharedShell.footer.sections, site, pageId),
    ],
  };
}

export function getComposedSectionOwner(site: SiteDocument, pageId: string, sectionId: string): ComposedSectionOwner {
  if (site.sharedShell.header.sections.some((section) => section.id === sectionId)) return { kind: "header" };
  if (site.sharedShell.footer.sections.some((section) => section.id === sectionId)) return { kind: "footer" };
  return { kind: "page-body", pageId };
}

export function requireSitePage(site: SiteDocument, pageId: string) {
  const page = site.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new Error(`Page ${pageId} was not found.`);
  return page;
}

export function applySitePatch(site: SiteDocument, bundle: SitePatchBundle): SiteDocument {
  return applyContractSitePatch(
    site as unknown as import("@designer-agent/site-contract").SiteDocument,
    bundle,
  ) as unknown as SiteDocument;
}

export function siteDigest(site: SiteDocument) {
  return digestValue(site);
}

function resolveSections(sections: SectionNode[], site: SiteDocument, pageId: string) {
  return sections.map((section) => ({
    ...section,
    tools: section.tools.map((tool) => {
      if (tool.type !== "navbar" || tool.siteBinding?.kind !== "site-navigation") return tool;
      return {
        ...tool,
        props: {
          ...tool.props,
          brandHref: requireSitePage(site, site.navigation.brandTargetPageId).route,
          items: site.navigation.items.map((item) => ({
            label: item.label,
            href: requireSitePage(site, item.targetPageId).route,
            active: item.targetPageId === pageId,
          })),
          primaryAction: resolveAction(site, site.navigation.primaryAction),
          secondaryAction: resolveAction(site, site.navigation.secondaryAction),
        },
      };
    }),
  } as SectionNode));
}

function resolveAction(site: SiteDocument, action?: { label: string; targetPageId: string }) {
  return action ? { label: action.label, href: requireSitePage(site, action.targetPageId).route } : undefined;
}
