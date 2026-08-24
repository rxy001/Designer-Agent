import {
  SiteContractError,
  validateSiteDocument,
  type SiteDocument,
} from "@designer-agent/site-contract";

export type SiteIssueCode =
  | "duplicate_page_id" | "duplicate_route" | "duplicate_artifact_path"
  | "home_page_missing" | "navigation_target_missing" | "deleted_page_referenced"
  | "page_not_staged" | "page_checkpoint_stale" | "shell_checkpoint_stale"
  | "site_version_stale" | "page_version_stale" | "undeclared_artifact"
  | "site_projection_mismatch" | "navbar_binding_missing" | "multiple_navbars"
  | "navbar_outside_header" | "header_missing" | "footer_missing"
  | "broken_internal_link" | "unknown";

export type SiteVerificationIssue = {
  code: SiteIssueCode;
  message: string;
  owner?: { kind: "page-body"; pageId: string } | { kind: "shared-region"; region: "header" | "footer" } | { kind: "unlocated" };
};

export function verifySiteDelivery(site: SiteDocument) {
  const issues: SiteVerificationIssue[] = [];
  try {
    validateSiteDocument(site);
  } catch (error) {
    issues.push({
      code: error instanceof SiteContractError ? asIssueCode(error.code) : "unknown",
      message: error instanceof Error ? error.message : String(error),
    });
  }
  const routes = new Set(site.pages.map((page) => page.route));
  for (const region of [site.sharedShell.header, site.sharedShell.footer]) {
    scanSections(region.sections, routes, issues, { kind: "shared-region", region: region.kind });
  }
  for (const page of site.pages) {
    scanSections(page.body.sections, routes, issues, { kind: "page-body", pageId: page.id });
  }
  return { ok: issues.length === 0, issues };
}

function collectKnownLinks(value: unknown, key = ""): string[] {
  if (typeof value === "string") return /(?:href|url|link|route|to)$/i.test(key) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((item) => collectKnownLinks(item, key));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([childKey, child]) => collectKnownLinks(child, childKey));
}

function isInternalRoute(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

function normalizeHref(href: string) {
  const route = href.split(/[?#]/, 1)[0] || "/";
  return route === "/" ? route : route.replace(/\/+$/, "");
}

function scanSections(
  sections: import("@designer-agent/site-contract").SectionNode[],
  routes: Set<string>,
  issues: SiteVerificationIssue[],
  owner: NonNullable<SiteVerificationIssue["owner"]>,
) {
  for (const section of sections) {
    for (const tool of section.tools) {
      for (const href of collectKnownLinks(tool.props)) {
        if (isInternalRoute(href) && !routes.has(normalizeHref(href))) {
          issues.push({
            code: "broken_internal_link",
            message: `${section.id}/${tool.id} links to missing route ${href}.`,
            owner,
          });
        }
      }
    }
  }
}

function asIssueCode(code: string): SiteIssueCode {
  const known: SiteIssueCode[] = [
    "duplicate_page_id", "duplicate_route", "duplicate_artifact_path", "home_page_missing",
    "navigation_target_missing", "deleted_page_referenced", "page_not_staged",
    "page_checkpoint_stale", "shell_checkpoint_stale", "site_version_stale",
    "page_version_stale", "undeclared_artifact", "site_projection_mismatch",
    "navbar_binding_missing", "multiple_navbars", "navbar_outside_header",
    "header_missing", "footer_missing", "broken_internal_link",
  ];
  return known.includes(code as SiteIssueCode) ? code as SiteIssueCode : "unknown";
}
