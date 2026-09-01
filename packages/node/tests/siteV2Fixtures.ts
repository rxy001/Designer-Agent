import {
  type PageDocument,
  type SectionNode,
  type SiteDocument,
} from "@designer-agent/site-contract";

export function section(id: string, tools: SectionNode["tools"] = []): SectionNode {
  return {
    id,
    type: "section",
    name: id,
    grid: { columns: 12, rows: 2, height: 100, columnGap: 8, rowGap: 8 },
    tools,
  };
}

export function body(id: string, sections: SectionNode[] = []): PageDocument {
  return { id, title: id, version: 0, viewport: "desktop", sections };
}

export function siteFixture(): SiteDocument {
  const home = body("home", [section("home_body")]);
  home.title = "Home";
  return {
    id: "site_test",
    title: "Test Site",
    version: 0,
    navigation: {
      brandTargetPageId: "home",
      items: [{ id: "nav_home", label: "Home", targetPageId: "home" }],
    },
    sharedShell: {
      header: {
        id: "shared_header",
        kind: "header",
        version: 0,
        mounted: true,
        sections: [section("header_section", [{
          id: "site_navbar",
          type: "navbar",
          name: "Navbar",
          siteBinding: { kind: "site-navigation" },
          layout: { gridArea: { rowStart: 1, columnStart: 1, rowEnd: 2, columnEnd: 13 }, zIndex: 1 },
          props: { brand: "Test" },
        }])],
      },
      footer: { id: "shared_footer", kind: "footer", version: 0, mounted: true, sections: [section("footer_section")] },
    },
    pages: [{ id: "home", route: "/", body: home }],
  };
}
