import { randomUUID } from "node:crypto";
import {
  artifactPathForPageId,
  digestValue,
  normalizeRoute,
  type PublicSitePlan,
  type SiteDesignContract,
  type SiteDocument,
  type SiteEditTarget,
} from "@designer-agent/site-contract";

export type SiteDeliveryPlanDraft = {
  siteObjective: string;
  shellTask: { action: "create" | "modify" | "keep"; requirements: string[] };
  pageTasks: Array<{
    taskKey: string;
    target: {
      kind: "existing" | "new";
      pageId: string | null;
      suggestedTitle: string | null;
      suggestedRoute: string | null;
    };
    action: "create" | "modify" | "remove";
    title: string | null;
    route: string | null;
    objective: string;
    requirements: string[];
  }>;
  navigation: { items: Array<{ label: string; targetTaskKeyOrPageId: string }> };
  designContract: Omit<SiteDesignContract, "sharedCopy"> & {
    sharedCopy: { primaryCta: string | null; secondaryCta: string | null; footerCopy: string | null };
  };
};

export function normalizeSitePlan(currentSite: SiteDocument, target: SiteEditTarget, draft: SiteDeliveryPlanDraft): PublicSitePlan {
  // The planner is probabilistic, while an edit target is an authorization
  // boundary. Project its plan onto that boundary before normalizing ids and
  // routes so an otherwise useful local request cannot be rejected merely
  // because the model also proposed global work.
  draft = constrainDraftToTarget(currentSite, target, draft);
  if (draft.pageTasks.length > 5) throw new Error("page_limit_exceeded");
  const taskTargets = new Map<string, string>();
  const reusableEmptyPages = findReusableEmptyPages(currentSite, target, draft);
  const pages = draft.pageTasks.map((task) => {
    const target = task.target;
    const declaredExisting = target.kind === "existing"
      ? currentSite.pages.find((page) => page.id === target.pageId)
      : undefined;
    if (target.kind === "existing" && (!target.pageId || target.suggestedTitle !== null || target.suggestedRoute !== null)) {
      throw new Error("existing_page_target_invalid");
    }
    if (target.kind === "new" && (target.pageId !== null || !target.suggestedTitle || !target.suggestedRoute)) {
      throw new Error("new_page_target_invalid");
    }
    if (target.kind === "existing" && !declaredExisting) throw new Error(`delete_or_update_target_missing:${target.pageId}`);
    if (target.kind === "new" && task.action !== "create") throw new Error("new_page_action_invalid");
    if (target.kind === "existing" && task.action === "create") throw new Error("existing_page_action_invalid");
    const reusedEmptyPage = target.kind === "new"
      ? takeReusableEmptyPage(reusableEmptyPages, target.suggestedRoute!)
      : undefined;
    const existing = declaredExisting ?? reusedEmptyPage;
    const pageId = existing?.id ?? randomUUID();
    const requestedTitle = target.kind === "new"
      ? task.title ?? target.suggestedTitle ?? ""
      : task.title ?? existing?.title ?? "";
    const requestedRoute = normalizeRoute(target.kind === "new"
      ? task.route ?? target.suggestedRoute ?? "/"
      : task.route ?? existing?.route ?? "/");
    taskTargets.set(task.taskKey, pageId);
    taskTargets.set(pageId, pageId);
    return {
      taskKey: task.taskKey,
      pageId,
      title: requestedTitle,
      // The site contract requires one `/` page. Reusing an empty root page
      // must fill it rather than move it and leave the site without a home.
      route: reusedEmptyPage?.route === "/" ? "/" : requestedRoute,
      action: reusedEmptyPage ? "modify" as const : task.action,
      objective: task.objective,
      requirements: task.requirements,
    };
  });

  const survivingIds = new Set(currentSite.pages.map((page) => page.id));
  for (const page of pages) {
    if (page.action === "remove") survivingIds.delete(page.pageId);
    else survivingIds.add(page.pageId);
  }
  if (survivingIds.size > 5) throw new Error("page_limit_exceeded");
  const routes = new Set<string>();
  for (const current of currentSite.pages) {
    const planned = pages.find((page) => page.pageId === current.id);
    if (planned?.action === "remove") continue;
    const route = planned?.route ?? current.route;
    if (routes.has(route)) throw new Error(`duplicate_route:${route}`);
    routes.add(route);
  }
  for (const page of pages.filter((candidate) => candidate.action === "create")) {
    if (routes.has(page.route)) throw new Error(`duplicate_route:${page.route}`);
    routes.add(page.route);
  }
  if (!routes.has("/")) throw new Error("home_page_missing");

  const navigation = {
    items: draft.navigation.items.map((item) => {
      const targetPageId = taskTargets.get(item.targetTaskKeyOrPageId) ?? item.targetTaskKeyOrPageId;
      if (!survivingIds.has(targetPageId)) throw new Error(`navigation_target_missing:${targetPageId}`);
      return { label: item.label, targetPageId };
    }),
  };
  const sharedCopy: SiteDesignContract["sharedCopy"] = {};
  if (draft.designContract.sharedCopy.primaryCta !== null) sharedCopy.primaryCta = draft.designContract.sharedCopy.primaryCta;
  if (draft.designContract.sharedCopy.secondaryCta !== null) sharedCopy.secondaryCta = draft.designContract.sharedCopy.secondaryCta;
  if (draft.designContract.sharedCopy.footerCopy !== null) sharedCopy.footerCopy = draft.designContract.sharedCopy.footerCopy;
  const designContract: SiteDesignContract = { ...draft.designContract, sharedCopy };
  const content = {
    target,
    baseSiteVersion: currentSite.version,
    siteObjective: draft.siteObjective,
    shell: draft.shellTask,
    pages,
    navigation,
    designContract,
  };
  const planDigest = digestValue(content);
  return { id: randomUUID(), planDigest, ...content };
}

function constrainDraftToTarget(
  currentSite: SiteDocument,
  target: SiteEditTarget,
  draft: SiteDeliveryPlanDraft,
): SiteDeliveryPlanDraft {
  if (target.kind === "site") return draft;

  const navigation = {
    items: currentSite.navigation.items.map((item) => ({
      label: item.label,
      targetTaskKeyOrPageId: item.targetPageId,
    })),
  };
  if (
    target.kind === "shared-region" ||
    ((target.kind === "section" || target.kind === "tool") &&
      target.owner.kind === "shared-region")
  ) {
    return {
      ...draft,
      shellTask: { action: "modify", requirements: draft.shellTask.requirements },
      pageTasks: [],
      navigation,
    };
  }

  const pageId =
    target.kind === "page"
      ? target.pageId
      : target.owner.kind === "page-body"
        ? target.owner.pageId
        : failTargetOwner();
  const matchingTask = draft.pageTasks.find(
    (task) => task.target.kind === "existing" && task.target.pageId === pageId,
  );
  const preservePageMetadata = target.kind === "page";
  return {
    ...draft,
    shellTask: { action: "keep", requirements: [] },
    pageTasks: [
      {
        taskKey: matchingTask?.taskKey ?? `target-${pageId}`,
        target: {
          kind: "existing",
          pageId,
          suggestedTitle: null,
          suggestedRoute: null,
        },
        action: "modify",
        title: preservePageMetadata ? (matchingTask?.title ?? null) : null,
        route: preservePageMetadata ? (matchingTask?.route ?? null) : null,
        objective: matchingTask?.objective ?? draft.siteObjective,
        requirements: matchingTask?.requirements ?? [],
      },
    ],
    navigation,
    designContract: {
      ...draft.designContract,
      sharedCopy: {
        ...draft.designContract.sharedCopy,
        footerCopy: null,
      },
      shellRequirements: { header: [], footer: [] },
    },
  };
}

function failTargetOwner(): never {
  throw new Error("target_owner_mismatch");
}

function findReusableEmptyPages(
  currentSite: SiteDocument,
  target: SiteEditTarget,
  draft: SiteDeliveryPlanDraft,
) {
  if (target.kind !== "site") return [];
  const claimedPageIds = new Set(
    draft.pageTasks.flatMap((task) =>
      task.target.kind === "existing" && task.target.pageId
        ? [task.target.pageId]
        : [],
    ),
  );
  return currentSite.pages
    .filter((page) => page.body.sections.length === 0 && !claimedPageIds.has(page.id))
    .toSorted((left, right) => left.order - right.order);
}

function takeReusableEmptyPage(
  reusableEmptyPages: SiteDocument["pages"],
  suggestedRoute: string,
) {
  if (reusableEmptyPages.length === 0) return undefined;
  const normalizedRoute = normalizeRoute(suggestedRoute);
  const matchingIndex = reusableEmptyPages.findIndex(
    (page) => page.route === normalizedRoute,
  );
  const index = matchingIndex >= 0 ? matchingIndex : 0;
  return reusableEmptyPages.splice(index, 1)[0];
}

export function pageArtifactPath(pageId: string) {
  return artifactPathForPageId(pageId);
}
