import { randomUUID } from "node:crypto";
import {
  composeSitePage,
  validateSiteDocument,
  type PageDocument,
  type SiteDocument,
} from "@designer-agent/site-contract";
import { pageDocumentToJsx } from "../editor/pageDocumentToJsx.ts";
import { registerPreviewSource } from "../previewRegistry.ts";

type SitePreviewSession = {
  createdAt: number;
  artifactsByRoute: Map<string, string>;
};

const DEFAULT_SESSION_TTL_MS = 30 * 60_000;
const DEFAULT_MAX_SESSIONS = 20;

export class SitePreviewRegistry {
  #sessions = new Map<string, SitePreviewSession>();
  readonly now: () => number;
  readonly sessionTtlMs: number;
  readonly maxSessions: number;

  constructor(input: {
    now?: () => number;
    sessionTtlMs?: number;
    maxSessions?: number;
  } = {}) {
    this.now = input.now ?? (() => Date.now());
    this.sessionTtlMs = input.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;
    this.maxSessions = input.maxSessions ?? DEFAULT_MAX_SESSIONS;
  }

  async create(input: { site: unknown; currentPageId: string }) {
    const site = validateSiteDocument(input.site);
    const currentPage = site.pages.find((page) => page.id === input.currentPageId);
    if (!currentPage) throw new Error("site_preview_page_not_found");

    this.#sweep();
    const sessionId = randomUUID();
    const artifacts = await Promise.all(
      site.pages.map(async (page) => {
        const previewPage = rewritePageLinksForPreview(
          composeSitePage(site, page.id),
          site,
          sessionId,
        );
        const source = pageDocumentToJsx(previewPage);
        const artifact = await registerPreviewSource(
          source,
          `site-preview:${sessionId}:${page.id}`,
        );
        return [page.route, artifact.id] as const;
      }),
    );

    this.#sessions.set(sessionId, {
      createdAt: this.now(),
      artifactsByRoute: new Map(artifacts),
    });
    this.#trimToLimit();

    return {
      sessionId,
      route: sitePreviewPath(sessionId, currentPage.route),
    };
  }

  getArtifactId(sessionId: string, route: string) {
    this.#sweep();
    return this.#sessions.get(sessionId)?.artifactsByRoute.get(route);
  }

  #sweep() {
    const oldestAllowed = this.now() - this.sessionTtlMs;
    for (const [sessionId, session] of this.#sessions) {
      if (session.createdAt < oldestAllowed) this.#sessions.delete(sessionId);
    }
  }

  #trimToLimit() {
    while (this.#sessions.size > this.maxSessions) {
      const oldestSessionId = this.#sessions.keys().next().value;
      if (typeof oldestSessionId !== "string") return;
      this.#sessions.delete(oldestSessionId);
    }
  }
}

export function sitePreviewPath(sessionId: string, route: string) {
  return `/site-previews/${sessionId}${route === "/" ? "/" : route}`;
}

export function rewritePageLinksForPreview(
  page: PageDocument,
  site: SiteDocument,
  sessionId: string,
): PageDocument {
  const siteRoutes = new Set(site.pages.map((entry) => entry.route));
  return {
    ...page,
    sections: page.sections.map((section) => ({
      ...section,
      tools: section.tools.map((tool) => ({
        ...tool,
        props: rewriteKnownLinkValues(tool.props, "", siteRoutes, sessionId),
      })),
    })),
  };
}

function rewriteKnownLinkValues<T>(
  value: T,
  key: string,
  siteRoutes: ReadonlySet<string>,
  sessionId: string,
): T {
  if (typeof value === "string") {
    return (isKnownLinkKey(key)
      ? rewriteInternalSiteHref(value, siteRoutes, sessionId)
      : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      rewriteKnownLinkValues(item, key, siteRoutes, sessionId),
    ) as T;
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [
      childKey,
      rewriteKnownLinkValues(child, childKey, siteRoutes, sessionId),
    ]),
  ) as T;
}

function rewriteInternalSiteHref(
  href: string,
  siteRoutes: ReadonlySet<string>,
  sessionId: string,
) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const pathEnd = href.search(/[?#]/u);
  const rawPath = pathEnd < 0 ? href : href.slice(0, pathEnd);
  const suffix = pathEnd < 0 ? "" : href.slice(pathEnd);
  const route = rawPath === "/" ? "/" : rawPath.replace(/\/+$/u, "");
  return siteRoutes.has(route)
    ? `${sitePreviewPath(sessionId, route)}${suffix}`
    : href;
}

function isKnownLinkKey(key: string) {
  return /(?:href|url|link|route|to)$/iu.test(key);
}
