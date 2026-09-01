import { randomUUID } from "node:crypto";
import {
  createSharedRegionSourceSection,
  type SectionNode,
  type SiteDocument,
} from "@designer-agent/site-contract";

function createEmptySection(): SectionNode {
  return {
    id: randomUUID(),
    type: "section",
    name: "Section 1",
    grid: {
      columns: 12,
      rows: 10,
      height: 720,
      columnGap: 12,
      rowGap: 12,
    },
    tools: [],
  };
}

export function createSiteDocument(): SiteDocument {
  const siteId = randomUUID();
  const pageId = randomUUID();
  return {
    id: siteId,
    title: "Untitled Site",
    version: 0,
    navigation: {
      brandTargetPageId: pageId,
      items: [{ id: randomUUID(), label: "Home", targetPageId: pageId }],
    },
    sharedShell: {
      header: {
        id: randomUUID(),
        kind: "header",
        version: 0,
        mounted: false,
        sections: [createSharedRegionSourceSection("header", {
          sectionId: randomUUID(),
        })],
      },
      footer: {
        id: randomUUID(),
        kind: "footer",
        version: 0,
        mounted: false,
        sections: [createSharedRegionSourceSection("footer", {
          sectionId: randomUUID(),
        })],
      },
    },
    pages: [{
      id: pageId,
      route: "/",
      body: {
        id: pageId,
        title: "Home",
        version: 0,
        viewport: "desktop",
        sections: [createEmptySection()],
      },
    }],
  };
}
