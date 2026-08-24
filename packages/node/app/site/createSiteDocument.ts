import { randomUUID } from "node:crypto";
import { artifactPathForPageId, type SectionNode, type SiteDocument } from "@designer-agent/site-contract";

export function createSiteDocument(): SiteDocument {
  const siteId = randomUUID();
  const pageId = randomUUID();
  const shellSection = (id: string, name: string, rows: number, height: number): SectionNode => ({
    id, type: "section", name,
    grid: { columns: 12, rows, height, columnGap: 12, rowGap: 12 },
    tools: [],
  });
  const headerSection = shellSection(randomUUID(), "Site Header", 2, 96);
  headerSection.tools.push({
    id: randomUUID(), type: "navbar", name: "Site Navbar",
    siteBinding: { kind: "site-navigation" },
    layout: { gridArea: { rowStart: 1, columnStart: 1, rowEnd: 3, columnEnd: 13 }, zIndex: 1 },
    props: { brand: "Brand", sticky: true, showMobileMenu: true },
  });
  return {
    id: siteId,
    title: "Untitled Site",
    version: 0,
    navigation: {
      brandTargetPageId: pageId,
      items: [{ id: randomUUID(), label: "Home", targetPageId: pageId }],
    },
    sharedShell: {
      header: { id: randomUUID(), kind: "header", version: 0, sections: [headerSection] },
      footer: { id: randomUUID(), kind: "footer", version: 0, sections: [shellSection(randomUUID(), "Site Footer", 3, 180)] },
    },
    pages: [{
      id: pageId,
      title: "Home",
      route: "/",
      artifactPath: artifactPathForPageId(pageId),
      order: 0,
      body: { id: pageId, title: "Home", version: 0, viewport: "desktop", sections: [] },
    }],
  };
}
