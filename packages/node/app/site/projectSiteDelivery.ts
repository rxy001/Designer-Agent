import {
  applySitePatch,
  computeBundleDigest,
  digestValue,
  type PagePatch,
  type SharedRegion,
  type SiteDocument,
  type SiteNavigation,
  type SitePageEntry,
  type SitePatchBundle,
  type SitePatchOperation,
} from "@designer-agent/site-contract";
import { verifySiteDelivery } from "./verifySiteDelivery.ts";

export type ProjectedPageChange =
  | { action: "create"; page: SitePageEntry }
  | {
      action: "modify";
      pageId: string;
      basePageVersion: number;
      metadata?: { title?: string; route?: string };
      patch: PagePatch;
    }
  | { action: "remove"; pageId: string; basePageVersion: number };

export type ProjectSiteDeliveryInput = {
  originalSite: SiteDocument;
  batchId: string;
  planDigest: string;
  verificationPolicy?: "enforce" | "defer";
  navigation?: SiteNavigation;
  stagedShell?: { header: SharedRegion; footer: SharedRegion };
  pages: ProjectedPageChange[];
  pageOrder: string[];
};

export function projectSiteDelivery(input: ProjectSiteDeliveryInput) {
  const operations: SitePatchOperation[] = [];
  if (
    input.stagedShell &&
    digestValue(input.stagedShell.header) !==
      digestValue(input.originalSite.sharedShell.header)
  ) {
    operations.push({
      op: "replaceSharedRegion",
      region: "header",
      baseRegionVersion: input.originalSite.sharedShell.header.version,
      value: input.stagedShell.header,
    });
  }
  if (
    input.stagedShell &&
    digestValue(input.stagedShell.footer) !==
      digestValue(input.originalSite.sharedShell.footer)
  ) {
    operations.push({
      op: "replaceSharedRegion",
      region: "footer",
      baseRegionVersion: input.originalSite.sharedShell.footer.version,
      value: input.stagedShell.footer,
    });
  }
  if (
    input.navigation &&
    digestValue(input.navigation) !== digestValue(input.originalSite.navigation)
  )
    operations.push({ op: "updateNavigation", value: input.navigation });
  for (const page of input.pages) {
    if (page.action === "create")
      operations.push({ op: "createPage", page: page.page });
    else if (page.action === "modify")
      operations.push({
        op: "updatePage",
        pageId: page.pageId,
        basePageVersion: page.basePageVersion,
        metadata: page.metadata,
        patch: page.patch,
      });
    else
      operations.push({
        op: "removePage",
        pageId: page.pageId,
        basePageVersion: page.basePageVersion,
      });
  }
  operations.push({ op: "reorderPages", pageIds: input.pageOrder });
  const partial = {
    batchId: input.batchId,
    siteId: input.originalSite.id,
    baseSiteVersion: input.originalSite.version,
    nextSiteVersion: input.originalSite.version + 1,
    planDigest: input.planDigest,
    operations,
  };
  const bundle: SitePatchBundle = {
    ...partial,
    bundleDigest: computeBundleDigest(
      partial as Omit<SitePatchBundle, "bundleDigest">,
    ),
  };
  const projectedSite = applySitePatch(input.originalSite, bundle);
  const verification = verifySiteDelivery(projectedSite);
  if (!verification.ok && input.verificationPolicy !== "defer") {
    throw new Error(
      `site_verification_failed:${verification.issues.map((issue) => issue.code).join(",")}`,
    );
  }
  const replayed = applySitePatch(input.originalSite, bundle);
  if (digestValue(replayed) !== digestValue(projectedSite))
    throw new Error("site_projection_mismatch");
  return {
    projectedSite,
    projectedSiteDigest: digestValue(projectedSite),
    bundle,
    verification,
  };
}
