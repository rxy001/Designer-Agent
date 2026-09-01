import { buttonActionSchema, type PageDocument, type SectionNode } from "./page.ts";
import {
  SiteContractError,
  siteDocumentSchema,
  type SiteDocument,
} from "./site.ts";

const ROUTE_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const siteValidationErrorCodes = [
  "home_page_missing",
  "header_missing",
  "footer_missing",
  "multiple_navbars",
  "navbar_binding_missing",
  "navbar_outside_header",
  "duplicate_page_id",
  "page_id_mismatch",
  "invalid_route",
  "duplicate_route",
  "navigation_target_missing",
  "duplicate_navigation_id",
  "duplicate_section_id",
  "duplicate_tool_id",
  "duplicate_overlay_id",
  "invalid_button_action",
  "overlay_target_missing",
] as const;

export type SiteValidationErrorCode = typeof siteValidationErrorCodes[number];

const siteValidationErrorCodeSet: ReadonlySet<string> = new Set(siteValidationErrorCodes);

export function isSiteValidationErrorCode(code: string): code is SiteValidationErrorCode {
  return siteValidationErrorCodeSet.has(code);
}

export function normalizeRoute(route: string) {
  const raw = route.trim().split(/[?#]/, 1)[0] ?? "";
  const segments = raw
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-+/g, "-"),
    )
    .filter(Boolean);
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

export function isNormalizedRoute(route: string) {
  if (route === "/") return true;
  return (
    route.startsWith("/") &&
    !route.endsWith("/") &&
    route.slice(1).split("/").every((segment) => ROUTE_SEGMENT.test(segment))
  );
}

export function artifactPathForPageId(pageId: string) {
  return `bodies/${pageId}.jsx`;
}

export function validateSiteDocument(input: unknown): SiteDocument {
  const site = siteDocumentSchema.parse(input);
  if (site.pages.length === 0) fail("home_page_missing", "A site must have at least one page.");
  if (site.sharedShell.header.kind !== "header") fail("header_missing", "The shared header has the wrong kind.");
  if (site.sharedShell.footer.kind !== "footer") fail("footer_missing", "The shared footer has the wrong kind.");

  const pageIds = new Set<string>();
  const routes = new Set<string>();
  const nodeIds = new Set<string>();

  collectNodeIds(site.sharedShell.header.sections, nodeIds);
  collectNodeIds(site.sharedShell.footer.sections, nodeIds);

  const headerNavbars = site.sharedShell.header.sections.flatMap((section) =>
    section.tools.filter((tool) => tool.type === "navbar"),
  );
  if (headerNavbars.length > 1) fail("multiple_navbars", "Header can contain at most one Navbar.");
  if (headerNavbars[0] && headerNavbars[0].siteBinding?.kind !== "site-navigation") {
    fail("navbar_binding_missing", "Header Navbar must bind to SiteNavigation.");
  }
  if (site.sharedShell.footer.sections.some(hasNavbar)) {
    fail("navbar_outside_header", "Footer must not contain a Navbar.");
  }

  for (const page of site.pages) {
    if (pageIds.has(page.id)) fail("duplicate_page_id", `Duplicate page id: ${page.id}.`);
    pageIds.add(page.id);
    if (page.id !== page.body.id) fail("page_id_mismatch", `Page ${page.id} and body id differ.`);
    if (!isNormalizedRoute(page.route)) fail("invalid_route", `Route ${page.route} is not normalized.`);
    if (routes.has(page.route)) fail("duplicate_route", `Duplicate route: ${page.route}.`);
    routes.add(page.route);
    if (page.body.sections.some(hasNavbar)) fail("navbar_outside_header", `Page ${page.id} body contains a Navbar.`);
    collectPageNodeIds(page.body, nodeIds);
  }
  if (!routes.has("/")) fail("home_page_missing", "A site must contain the / route.");

  const targets = [
    site.navigation.brandTargetPageId,
    ...site.navigation.items.map((item) => item.targetPageId),
    site.navigation.primaryAction?.targetPageId,
    site.navigation.secondaryAction?.targetPageId,
  ].filter((target): target is string => Boolean(target));
  for (const target of targets) {
    if (!pageIds.has(target)) fail("navigation_target_missing", `Navigation targets missing page ${target}.`);
  }
  const navigationIds = new Set<string>();
  for (const item of site.navigation.items) {
    if (navigationIds.has(item.id)) fail("duplicate_navigation_id", `Duplicate navigation id: ${item.id}.`);
    navigationIds.add(item.id);
  }
  return site;
}

function collectPageNodeIds(page: PageDocument, ids: Set<string>) {
  collectNodeIds(page.sections, ids);
  const overlayIds = new Set<string>();

  for (const overlay of page.overlays ?? []) {
    if (ids.has(overlay.id)) {
      fail("duplicate_overlay_id", `Duplicate Overlay id: ${overlay.id}.`);
    }
    ids.add(overlay.id);
    overlayIds.add(overlay.id);
  }

  for (const section of page.sections) {
    for (const tool of section.tools) {
      if (tool.type !== "button" || tool.props.action === undefined) continue;
      const parsed = buttonActionSchema.safeParse(tool.props.action);
      if (!parsed.success) {
        fail(
          "invalid_button_action",
          `Button ${tool.id} has an invalid serialized action.`,
        );
      }
      if (
        parsed.data.type === "overlay" &&
        !overlayIds.has(parsed.data.targetId)
      ) {
        fail(
          "overlay_target_missing",
          `Button ${tool.id} targets missing Overlay ${parsed.data.targetId}.`,
        );
      }
    }
  }
}

function collectNodeIds(sections: SectionNode[], ids: Set<string>) {
  for (const section of sections) {
    if (ids.has(section.id)) fail("duplicate_section_id", `Duplicate section id: ${section.id}.`);
    ids.add(section.id);
    for (const tool of section.tools) {
      if (ids.has(tool.id)) fail("duplicate_tool_id", `Duplicate tool id: ${tool.id}.`);
      ids.add(tool.id);
    }
  }
}

function hasNavbar(section: SectionNode) {
  return section.tools.some((tool) => tool.type === "navbar");
}

function fail(code: SiteValidationErrorCode, message: string): never {
  throw new SiteContractError(code, message);
}
