import {
  digestValue,
  type PagePatch,
  type PublicSitePlan,
  type SiteDocument,
  type SiteEditTarget,
  type SitePatchBundle,
} from "@designer-agent/site-contract";
import { diffPageDocuments } from "../editor/diffPageDocuments.ts";

export function validateSiteEditTarget(site: SiteDocument, target: SiteEditTarget) {
  if (target.kind === "site") return target;
  if (target.kind === "page") {
    requirePage(site, target.pageId);
    return target;
  }
  if (target.kind === "shared-region") return target;

  const sections = target.owner.kind === "page-body"
    ? requirePage(site, target.owner.pageId).body.sections
    : site.sharedShell[target.owner.region].sections;
  const section = sections.find((candidate) => candidate.id === target.sectionId);
  if (!section) throw new Error("target_section_not_found");
  if (target.kind === "tool" && !section.tools.some((tool) => tool.id === target.toolId)) {
    throw new Error("target_tool_not_found");
  }
  return target;
}

export function validatePlanAgainstTarget(site: SiteDocument, plan: PublicSitePlan, target: SiteEditTarget) {
  validateSiteEditTarget(site, target);
  if (digestValue(plan.target) !== digestValue(target)) throw new Error("plan_target_mismatch");
  if (target.kind === "site") return plan;

  if (sharedTargetRegion(target)) {
    if (plan.pages.length > 0 || !navigationIsUnchanged(site, plan) || plan.shell.action !== "modify") {
      throw new Error("plan_scope_violation");
    }
    return plan;
  }

  const pageId = target.kind === "page"
    ? target.pageId
    : (target.kind === "section" || target.kind === "tool") && target.owner.kind === "page-body"
      ? target.owner.pageId
      : failScope();
  if (
    plan.shell.action !== "keep" ||
    plan.shell.requirements.length > 0 ||
    plan.designContract.shellRequirements.header.length > 0 ||
    plan.designContract.shellRequirements.footer.length > 0 ||
    plan.designContract.sharedCopy.footerCopy !== undefined ||
    !navigationIsUnchanged(site, plan) ||
    plan.pages.length !== 1 ||
    plan.pages[0]?.pageId !== pageId ||
    plan.pages[0]?.action !== "modify"
  ) {
    throw new Error("plan_scope_violation");
  }
  if (target.kind !== "page") {
    const page = requirePage(site, pageId);
    if (plan.pages[0]?.title !== page.title || plan.pages[0]?.route !== page.route) {
      throw new Error("plan_scope_violation");
    }
  }
  return plan;
}

export function validateBundleAgainstTarget(
  originalSite: SiteDocument,
  bundle: SitePatchBundle,
  target: SiteEditTarget,
) {
  validateSiteEditTarget(originalSite, target);
  if (target.kind === "site") return bundle;

  const originalPageOrder = originalSite.pages.toSorted((left, right) => left.order - right.order).map((page) => page.id);
  const reorderOperations = bundle.operations.filter((operation) => operation.op === "reorderPages");
  if (
    reorderOperations.length !== 1 ||
    digestValue(reorderOperations[0]?.pageIds) !== digestValue(originalPageOrder)
  ) {
    throw new Error("delivery_scope_violation");
  }

  const meaningful = bundle.operations.filter((operation) => operation.op !== "reorderPages");
  const sharedRegion = sharedTargetRegion(target);
  if (sharedRegion) {
    const region = sharedRegion;
    if (meaningful.length !== 1 || meaningful[0]?.op !== "replaceSharedRegion" || meaningful[0].region !== region) {
      throw new Error("delivery_scope_violation");
    }
    const value = meaningful[0].value;
    const other = region === "header" ? "footer" : "header";
    if (digestValue(value) === digestValue(originalSite.sharedShell[region])) throw new Error("delivery_scope_violation");
    if (bundle.operations.some((operation) => operation.op === "replaceSharedRegion" && operation.region === other)) {
      throw new Error("delivery_scope_violation");
    }
    if (target.kind !== "shared-region") {
      assertLocalPatchScope(originalSite, target, diffRegion(originalSite, region, value));
    }
    return bundle;
  }

  const pageId = target.kind === "page"
    ? target.pageId
    : (target.kind === "section" || target.kind === "tool") && target.owner.kind === "page-body"
      ? target.owner.pageId
      : failScope();
  if (meaningful.length !== 1 || meaningful[0]?.op !== "updatePage" || meaningful[0].pageId !== pageId) {
    throw new Error("delivery_scope_violation");
  }
  if (meaningful[0].metadata && Object.keys(meaningful[0].metadata).length > 0 && target.kind !== "page") {
    throw new Error("delivery_scope_violation");
  }
  assertLocalPatchScope(originalSite, target, meaningful[0].patch);
  return bundle;
}

export function pageTargetIds(target: SiteEditTarget, pageId: string) {
  if ((target.kind === "section" || target.kind === "tool") && target.owner.kind === "page-body" && target.owner.pageId === pageId) {
    return {
      targetSectionId: target.sectionId,
      ...(target.kind === "tool" ? { targetToolId: target.toolId } : {}),
    };
  }
  return {};
}

function requirePage(site: SiteDocument, pageId: string) {
  const page = site.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new Error("target_page_not_found");
  return page;
}

function sharedTargetRegion(target: SiteEditTarget): "header" | "footer" | undefined {
  if (target.kind === "shared-region") return target.region;
  if ((target.kind === "section" || target.kind === "tool") && target.owner.kind === "shared-region") return target.owner.region;
  return undefined;
}

function failScope(): never {
  throw new Error("target_owner_mismatch");
}

function navigationIsUnchanged(site: SiteDocument, plan: PublicSitePlan) {
  return digestValue(plan.navigation.items) === digestValue(
    site.navigation.items.map((item) => ({ label: item.label, targetPageId: item.targetPageId })),
  );
}

function assertLocalPatchScope(site: SiteDocument, target: SiteEditTarget, patch: PagePatch) {
  if (target.kind === "site" || target.kind === "page" || target.kind === "shared-region") return;
  const sections = target.owner.kind === "page-body"
    ? requirePage(site, target.owner.pageId).body.sections
    : site.sharedShell[target.owner.region].sections;
  const section = sections.find((candidate) => candidate.id === target.sectionId);
  if (!section) throw new Error("target_section_not_found");
  const sectionToolIds = new Set(section.tools.map((tool) => tool.id));
  for (const operation of patch) {
    const allowed = target.kind === "section"
      ? sectionOperationAllowed(operation, target.sectionId, sectionToolIds)
      : toolOperationAllowed(operation, target.sectionId, target.toolId, sectionToolIds);
    if (!allowed) throw new Error("delivery_scope_violation");
  }
}

function sectionOperationAllowed(operation: PagePatch[number], sectionId: string, toolIds: Set<string>) {
  if (operation.op === "updateSection") return operation.sectionId === sectionId;
  if (operation.op === "addTool") return operation.sectionId === sectionId && !toolIds.has(operation.tool.id);
  if (operation.op === "updateTool" || operation.op === "removeTool") return toolIds.has(operation.toolId);
  return false;
}

function toolOperationAllowed(operation: PagePatch[number], sectionId: string, toolId: string, toolIds: Set<string>) {
  if (operation.op === "updateSection") return operation.sectionId === sectionId;
  if (operation.op === "updateTool") return operation.toolId === toolId && toolIds.has(operation.toolId);
  if (operation.op === "removeTool") return operation.toolId === toolId;
  return false;
}

function diffRegion(site: SiteDocument, region: "header" | "footer", value: SiteDocument["sharedShell"]["header"]): PagePatch {
  const previous = site.sharedShell[region];
  return diffPageDocuments(
    { id: previous.id, title: region, version: previous.version, viewport: "desktop", sections: previous.sections },
    { id: previous.id, title: region, version: previous.version, viewport: "desktop", sections: value.sections },
  );
}
