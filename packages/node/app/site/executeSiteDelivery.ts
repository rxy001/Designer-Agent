import {
  composeSitePage,
  isPristineSiteDocument,
  type PublicSitePlan,
  type SiteDocument,
  type SiteNavigation,
  type SitePageEntry,
  type SiteEditTarget,
} from "@designer-agent/site-contract";
import { pageDocumentToJsx } from "../editor/pageDocumentToJsx.ts";
import { diffPageDocuments } from "../editor/diffPageDocuments.ts";
import { runPageWorker } from "../agent/runPageWorker.ts";
import type { StagedPageDelivery } from "../agent/stagePageDelivery.ts";
import { SiteScheduler, siteDeliveryLimits } from "./siteScheduler.ts";
import { pageArtifactPath } from "./sitePlanPolicy.ts";
import { projectSiteDelivery, type ProjectedPageChange } from "./projectSiteDelivery.ts";
import {
  runDefaultSiteReview,
  runSiteReviewerAgent,
  type SiteReviewProvider,
  type SiteReviewResult,
} from "../reviewer/siteReviewerAgent.ts";
import { runDefaultSiteShellWorker } from "../agent/runSiteShellWorker.ts";
import { withSiteLogContext } from "../logging/logContext.ts";
import { siteAuditLogger } from "../logging/siteAuditLogger.ts";
import { pageTargetIds } from "./siteEditTarget.ts";
import type { UserVisibleAgentEvent } from "../userVisibleAgentEvents.ts";
import { isOperationTimeout, runWithTimeout } from "../runtime/runWithTimeout.ts";
import type {
  SiteUnimplementedRequirement,
  UnimplementedRequirement,
} from "../reviewer/unimplementedRequirement.ts";
import { agentConfig } from "../agentConfig.ts";

export type SiteDeliveryExecution = {
  projection?: ReturnType<typeof projectSiteDelivery>;
  sharedSources?: { header: string; footer: string };
  bodySources?: Record<string, string>;
  renderedSources?: Record<string, string>;
  failedPageIds: string[];
  siteReviewStatus: "accepted" | "review_unavailable";
  unimplementedRequirements?: SiteUnimplementedRequirement[];
  stagedState?: {
    stagedShell?: SiteDocument["sharedShell"];
    shellUnimplementedRequirements?: UnimplementedRequirement[];
    deliveries: Record<string, StagedPageDelivery>;
  };
};

export async function executeSiteDelivery(input: {
  originalSite: SiteDocument;
  plan: PublicSitePlan;
  batchId: string;
  designSystemId: number;
  deliveryPolicy: "strict" | "best_effort";
  target: SiteEditTarget;
  onPageStatus?: (pageId: string, status: string) => void;
  onPageUserEvent?: (pageId: string, event: UserVisibleAgentEvent) => void;
  onShellStatus?: (status: string) => void;
  onSiteStatus?: (status: string) => void;
  signal?: AbortSignal;
  reviewerCritiqueEnabled?: boolean;
  siteReviewer?: SiteReviewProvider;
  shellWorker?: typeof runDefaultSiteShellWorker;
  pageWorker?: typeof runPageWorker;
  resumeState?: SiteDeliveryExecution["stagedState"];
}): Promise<SiteDeliveryExecution> {
  input.signal?.throwIfAborted();
  const reviewerCritiqueEnabled =
    input.reviewerCritiqueEnabled ??
    (input.siteReviewer ? true : agentConfig.review.reviewerCritiqueEnabled);
  input.onSiteStatus?.("Preparing site generation");
  const scheduler = new SiteScheduler();
  const plannedPages = new Map(input.plan.pages.map((task) => [task.pageId, task]));
  const workingPages: SitePageEntry[] = input.originalSite.pages
    .filter((page) => plannedPages.get(page.id)?.action !== "remove")
    .map((page) => ({ ...page }));
  for (const task of input.plan.pages.filter((page) => page.action === "create")) {
    workingPages.push({
      id: task.pageId,
      title: task.title,
      route: task.route,
      artifactPath: pageArtifactPath(task.pageId),
      order: workingPages.length,
      body: { id: task.pageId, title: task.title, version: 0, viewport: "desktop", sections: [] },
    });
  }
  const survivingIds = new Set(workingPages.map((page) => page.id));
  const navigation: SiteNavigation = input.target.kind === "site"
    ? {
        ...input.originalSite.navigation,
        brandTargetPageId: workingPages.find((page) => page.route === "/")?.id ?? workingPages[0]!.id,
        items: input.plan.navigation.items
          .filter((item) => survivingIds.has(item.targetPageId))
          .map((item, index) => ({ id: `nav_${index}_${item.targetPageId}`, ...item })),
        ...(input.originalSite.navigation.primaryAction && survivingIds.has(input.originalSite.navigation.primaryAction.targetPageId)
          ? { primaryAction: input.originalSite.navigation.primaryAction }
          : { primaryAction: undefined }),
        ...(input.originalSite.navigation.secondaryAction && survivingIds.has(input.originalSite.navigation.secondaryAction.targetPageId)
          ? { secondaryAction: input.originalSite.navigation.secondaryAction }
          : { secondaryAction: undefined }),
      }
    : input.originalSite.navigation;
  let workingSite: SiteDocument = {
    ...input.originalSite,
    navigation,
    pages: workingPages.map((page, order) => ({ ...page, order })),
  };
  let stagedShell = input.resumeState?.stagedShell;
  let shellUnimplementedRequirements =
    input.resumeState?.shellUnimplementedRequirements ?? [];
  const useFastCreateShell = shouldUseFastCreateShell(input.originalSite, input.plan, input.target);
  let generatedShell: Awaited<ReturnType<typeof runDefaultSiteShellWorker>> | undefined;
  let shellTask: Promise<Awaited<ReturnType<typeof runDefaultSiteShellWorker>> | undefined>;
  if (useFastCreateShell && !stagedShell && input.plan.shell.action !== "keep") {
    generatedShell = await createInitialShellTask({ input, workingSite, navigation, stagedShell, useFastCreateShell, reviewerCritiqueEnabled });
    if (generatedShell) {
      stagedShell = { header: generatedShell.header, footer: generatedShell.footer };
      shellUnimplementedRequirements = generatedShell.unimplementedRequirements ?? [];
      workingSite = { ...workingSite, sharedShell: stagedShell };
    }
    shellTask = Promise.resolve(undefined);
  } else {
    shellTask = createInitialShellTask({ input, workingSite, navigation, stagedShell, useFastCreateShell, reviewerCritiqueEnabled });
  }
  const successful = new Map<string, StagedPageDelivery>(Object.entries(input.resumeState?.deliveries ?? {}));
  for (const pageId of successful.keys()) {
    siteAuditLogger.record("site.page.staged_reused", {}, { context: { pageId } });
  }
  const workerTasks = input.plan.pages.filter((task) => task.action !== "remove" && !successful.has(task.pageId));
  const failures: string[] = [];
  const latestPageTodos = new Map<string, Extract<UserVisibleAgentEvent, { type: "todos" }>["todos"]>();
  const forwardPageEvent = (pageId: string, event: UserVisibleAgentEvent) => {
    if (event.type === "todos") latestPageTodos.set(pageId, event.todos);
    input.onPageUserEvent?.(pageId, event);
  };
  const completePageTodos = (pageId: string) => {
    const todos = latestPageTodos.get(pageId);
    if (!todos || todos.every((todo) => todo.status === "completed")) return;
    const completed = todos.map((todo) => ({ ...todo, status: "completed" as const }));
    latestPageTodos.set(pageId, completed);
    input.onPageUserEvent?.(pageId, { type: "todos", todos: completed });
  };
  input.onSiteStatus?.("Generating page content");
  const pageTask = scheduler.runPages(workerTasks, async (task) => withSiteLogContext({ pageId: task.pageId }, async () => {
    const pageStartedAt = Date.now();
    siteAuditLogger.record("site.page.started", { action: task.action, taskKey: task.taskKey });
    input.onPageStatus?.(task.pageId, "generating");
    try {
      const delivery = await runWithTimeout({
        timeoutMs: siteDeliveryLimits.pageAgentTimeoutMs,
        timeoutCode: "site_page_agent_timeout",
        signal: input.signal,
      }, (signal) => (input.pageWorker ?? runPageWorker)({
          batchId: input.batchId,
          taskId: task.taskKey,
          site: workingSite,
          pageId: task.pageId,
          action: task.action === "create" ? "create" : "modify",
          prompt: [
            task.objective,
            ...task.requirements,
            `Page design contract (shared Header/Footer requirements excluded): ${JSON.stringify(pageDesignContractForPrompt(input.plan.designContract))}`,
          ].join("\n"),
          designSystemId: input.designSystemId,
          reviewerCritiqueEnabled,
          ...pageTargetIds(input.target, task.pageId),
          onProgress: (status) => input.onPageStatus?.(task.pageId, status),
          onUserEvent: (event) => forwardPageEvent(task.pageId, event),
          signal,
        }));
      completePageTodos(task.pageId);
      input.onPageStatus?.(task.pageId, "verified");
      siteAuditLogger.record("site.page.staged", { durationMs: Date.now() - pageStartedAt, qualityStatus: delivery.qualityStatus });
      return delivery;
    } catch (error) {
      failures.push(task.pageId);
      input.onPageStatus?.(task.pageId, `failed: ${error instanceof Error ? error.message : String(error)}`);
      siteAuditLogger.record("site.page.failed", { durationMs: Date.now() - pageStartedAt, error }, { level: "error" });
      return undefined;
    }
  }));
  const [deliveries, parallelShell] = await Promise.all([pageTask, shellTask]);
  generatedShell ??= parallelShell;
  if (parallelShell) {
    stagedShell = { header: parallelShell.header, footer: parallelShell.footer };
    shellUnimplementedRequirements = parallelShell.unimplementedRequirements ?? [];
    workingSite = { ...workingSite, sharedShell: stagedShell };
  }
  if (failures.length > 0 && input.deliveryPolicy === "strict") {
    throw new Error(`strict_delivery_failed:${failures.join(",")}`);
  }

  for (const delivery of deliveries) {
    if (delivery) successful.set(delivery.pageId, delivery);
  }
  const currentStagedState = () => ({
    stagedShell,
    shellUnimplementedRequirements,
    deliveries: Object.fromEntries(successful),
  });
  const collectUnimplementedRequirements = (): SiteUnimplementedRequirement[] => [
    ...shellUnimplementedRequirements.map((requirement) => ({
      ...requirement,
      owner: { kind: "shared-shell" as const },
    })),
    ...[...successful.values()].flatMap((delivery) =>
      (delivery.unimplementedRequirements ?? []).map((requirement) => ({
        ...requirement,
        owner: { kind: "page-body" as const, pageId: delivery.pageId },
      })),
    ),
  ];
  if (failures.length > 0) {
    return {
      failedPageIds: failures,
      siteReviewStatus: "review_unavailable" as const,
      unimplementedRequirements: collectUnimplementedRequirements(),
      stagedState: currentStagedState(),
    } satisfies SiteDeliveryExecution;
  }
  const failedNewIds = new Set(input.plan.pages.filter((task) => task.action === "create" && failures.includes(task.pageId)).map((task) => task.pageId));
  const pageOrder = workingSite.pages.map((page) => page.id).filter((id) => !failedNewIds.has(id));
  const finalNavigation: SiteNavigation = {
    ...navigation,
    items: navigation.items.filter((item) => pageOrder.includes(item.targetPageId)),
  };
  input.onSiteStatus?.("Verifying site structure");
  const buildProjection = () => {
    const verificationStartedAt = Date.now();
    siteAuditLogger.record("site.verification.started", {});
    try {
      const changes: ProjectedPageChange[] = [];
      for (const task of input.plan.pages) {
        if (task.action === "remove") {
          const previous = input.originalSite.pages.find((page) => page.id === task.pageId);
          if (previous) changes.push({ action: "remove", pageId: task.pageId, basePageVersion: previous.body.version });
          continue;
        }
        const delivery = successful.get(task.pageId);
        if (!delivery) continue;
        if (task.action === "create") {
          const page = workingSite.pages.find((entry) => entry.id === task.pageId)!;
          changes.push({ action: "create", page: { ...page, body: delivery.body } });
        } else {
          const previous = input.originalSite.pages.find((page) => page.id === task.pageId)!;
          const metadata = {
            ...(task.title !== previous.title ? { title: task.title } : {}),
            ...(task.route !== previous.route ? { route: task.route } : {}),
          };
          changes.push({
            action: "modify",
            pageId: task.pageId,
            basePageVersion: previous.body.version,
            ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
            patch: diffPageDocuments(previous.body, delivery.body),
          });
        }
      }
      const result = projectSiteDelivery({
        originalSite: input.originalSite,
        batchId: input.batchId,
        planDigest: input.plan.planDigest,
        verificationPolicy: "defer",
        navigation: finalNavigation,
        stagedShell,
        pages: changes,
        pageOrder,
      });
      siteAuditLogger.record(
        result.verification.ok ? "site.verification.accepted" : "site.verification.rejected",
        {
          durationMs: Date.now() - verificationStartedAt,
          issueCount: result.verification.issues.length,
          issues: result.verification.issues.map((issue) => ({
            code: issue.code,
            message: issue.message,
            owner: issue.owner,
          })),
        },
        { level: result.verification.ok ? "info" : "warn" },
      );
      return result;
    } catch (error) {
      siteAuditLogger.record("site.verification.rejected", { durationMs: Date.now() - verificationStartedAt, error }, { level: "error" });
      throw error;
    }
  };
  let projection = buildProjection();
  let bodySources: Record<string, string> = {};
  let renderedSources: Record<string, string> = {};
  const rebuildSources = () => {
    bodySources = {};
    renderedSources = {};
    for (const page of projection.projectedSite.pages) {
      bodySources[page.id] = successful.get(page.id)?.bodySource ?? pageDocumentToJsx(page.body);
      renderedSources[page.id] = pageDocumentToJsx(composeSitePage(projection.projectedSite, page.id));
    }
  };
  const review = async () => {
    const reviewerStartedAt = Date.now();
    siteAuditLogger.record("site.reviewer.started", { pageCount: projection.projectedSite.pages.length });
    let result;
    try {
      result = await runWithTimeout({
        timeoutMs: siteDeliveryLimits.siteReviewerTimeoutMs,
        timeoutCode: "site_reviewer_timeout",
        signal: input.signal,
      }, (signal) => input.siteReviewer
        ? runSiteReviewerAgent(
          { site: projection.projectedSite, designContract: input.plan.designContract, target: input.target, screenshots: [], unimplementedRequirements: collectUnimplementedRequirements(), signal },
          input.siteReviewer,
        )
        : runDefaultSiteReview({
          batchId: input.batchId,
          site: projection.projectedSite,
          designContract: input.plan.designContract,
          target: input.target,
          renderedSources,
          unimplementedRequirements: collectUnimplementedRequirements(),
          signal,
        }));
    } catch (error) {
      if (!isOperationTimeout(error, "site_reviewer_timeout")) throw error;
      result = { status: "review_unavailable" as const, issues: [] };
      siteAuditLogger.record("site.reviewer.timeout", {
        durationMs: Date.now() - reviewerStartedAt,
        timeoutMs: siteDeliveryLimits.siteReviewerTimeoutMs,
      }, { level: "warn" });
    }
    const rawIssueCount = result.issues.length;
    result = scopeSiteReviewResult(result, input.target);
    siteAuditLogger.record(
      result.status === "accepted" ? "site.reviewer.accepted" : result.status === "rejected" ? "site.reviewer.rejected" : "site.reviewer.unavailable",
      {
        durationMs: Date.now() - reviewerStartedAt,
        issueCount: result.issues.length,
        inheritedIssueCount: rawIssueCount - result.issues.length,
        issues: result.issues.map((issue) => ({ owner: issue.owner, message: issue.message })),
      },
      { level: result.status === "accepted" ? "info" : "warn" },
    );
    return result;
  };
  const verifyThenReview = () => {
    if (!projection.verification.ok) {
      return Promise.resolve({
        status: "rejected" as const,
        issues: projection.verification.issues.map((issue) => ({
          message: issue.message,
          owner: issue.owner ?? { kind: "unlocated" as const },
        })),
      });
    }
    if (!reviewerCritiqueEnabled) {
      siteAuditLogger.record("site.reviewer.skipped", {
        reason: "reviewer_critique_disabled",
      });
      return Promise.resolve({
        status: "review_unavailable" as const,
        issues: [],
      });
    }
    return scheduler.siteReviewer.use(review);
  };
  rebuildSources();
  if (reviewerCritiqueEnabled) {
    input.onSiteStatus?.("Reviewing complete site");
  }
  let siteReview = await verifyThenReview();
  for (let cycle = 0; siteReview.status === "rejected" && cycle < siteDeliveryLimits.maxSiteRepairCycles; cycle += 1) {
    const unlocatedIssues = siteReview.issues.filter((issue) => issue.owner.kind === "unlocated");
    if (unlocatedIssues.length > 0) {
      throw new Error(`site_reviewer_unlocated:${unlocatedIssues.map((issue) => issue.message).join(";")}`);
    }
    input.onSiteStatus?.(`Repairing site · cycle ${cycle + 1}`);
    siteAuditLogger.record("site.reviewer.repair_started", { cycle: cycle + 1, issueCount: siteReview.issues.length });
    const sharedRepairMessages = siteReview.issues.flatMap((issue) =>
      issue.owner.kind === "shared-region" ? [issue.message] : [],
    );
    const pageRepairMessages = new Map<string, string[]>();
    for (const issue of siteReview.issues) {
      if (issue.owner.kind !== "page-body") continue;
      const messages = pageRepairMessages.get(issue.owner.pageId) ?? [];
      messages.push(issue.message);
      pageRepairMessages.set(issue.owner.pageId, messages);
    }
    if (sharedRepairMessages.length > 0) {
      siteAuditLogger.record("site.shell.repair_started", { cycle: cycle + 1, issueCount: sharedRepairMessages.length });
      const shell = await runWithTimeout({
        timeoutMs: siteDeliveryLimits.shellAgentTimeoutMs,
        timeoutCode: "site_shell_repair_timeout",
        signal: input.signal,
      }, (signal) => (input.shellWorker ?? runDefaultSiteShellWorker)({
          batchId: input.batchId,
          site: projection.projectedSite,
          navigation: finalNavigation,
          prompt: `${input.plan.siteObjective}\nSite Reviewer repair cycle ${cycle + 1}`,
          requirements: sharedRepairMessages,
          designSystemId: input.designSystemId,
          reviewerCritiqueEnabled,
          designContract: input.plan.designContract,
          target: input.target,
          mode: "agent",
          onProgress: input.onShellStatus,
          signal,
        }));
      stagedShell = { header: shell.header, footer: shell.footer };
      shellUnimplementedRequirements = shell.unimplementedRequirements ?? [];
      input.onShellStatus?.("Shared shell completed");
      siteAuditLogger.record("site.shell.repair_completed", { cycle: cycle + 1 });
    }
    const repairPageIds = new Set(pageRepairMessages.keys());
    const repairSite = {
      ...projection.projectedSite,
      ...(stagedShell ? { sharedShell: stagedShell } : {}),
    };
    await scheduler.runPages(
      input.plan.pages.filter((task) => task.action !== "remove" && repairPageIds.has(task.pageId)),
      async (task) => withSiteLogContext({ pageId: task.pageId, attempt: cycle + 1 }, async () => {
        siteAuditLogger.record("site.page.repair_started", { cycle: cycle + 1 });
        const delivery = await runWithTimeout({
          timeoutMs: siteDeliveryLimits.pageAgentTimeoutMs,
          timeoutCode: "site_page_repair_timeout",
          signal: input.signal,
        }, (signal) => (input.pageWorker ?? runPageWorker)({
            batchId: input.batchId,
            taskId: `${task.taskKey}-site-repair-${cycle + 1}`,
            site: repairSite,
            pageId: task.pageId,
            action: "modify",
            prompt: [
              task.objective,
              ...task.requirements,
              ...(pageRepairMessages.get(task.pageId) ?? []),
              `Page design contract (shared Header/Footer requirements excluded): ${JSON.stringify(pageDesignContractForPrompt(input.plan.designContract))}`,
            ].join("\n"),
            designSystemId: input.designSystemId,
            reviewerCritiqueEnabled,
            ...pageTargetIds(input.target, task.pageId),
            onProgress: (status) => input.onPageStatus?.(task.pageId, status),
            onUserEvent: (event) => forwardPageEvent(task.pageId, event),
            signal,
          }));
        successful.set(task.pageId, delivery);
        completePageTodos(task.pageId);
        input.onPageStatus?.(task.pageId, "verified");
        siteAuditLogger.record("site.page.repair_completed", { cycle: cycle + 1, qualityStatus: delivery.qualityStatus });
      }),
    );
    projection = buildProjection();
    rebuildSources();
    siteAuditLogger.record("site.reviewer.repair_completed", { cycle: cycle + 1 });
    if (reviewerCritiqueEnabled) {
      input.onSiteStatus?.("Reviewing repaired site");
    }
    siteReview = await verifyThenReview();
  }
  if (siteReview.status === "rejected") {
    if (!projection.verification.ok) {
      throw new Error(`site_verification_failed:${projection.verification.issues.map((issue) => issue.message).join(";")}`);
    }
    throw new Error(`site_reviewer_rejected:${siteReview.issues.map((issue) => issue.message).join(";")}`);
  }
  input.onSiteStatus?.("Finalizing site update");
  return {
    projection,
    sharedSources: {
      header: pageDocumentToJsx({ id: projection.projectedSite.sharedShell.header.id, title: "Header", version: projection.projectedSite.sharedShell.header.version, viewport: "desktop", sections: projection.projectedSite.sharedShell.header.sections }),
      footer: pageDocumentToJsx({ id: projection.projectedSite.sharedShell.footer.id, title: "Footer", version: projection.projectedSite.sharedShell.footer.version, viewport: "desktop", sections: projection.projectedSite.sharedShell.footer.sections }),
    },
    bodySources,
    renderedSources,
    failedPageIds: failures,
    siteReviewStatus: siteReview.status,
    unimplementedRequirements: collectUnimplementedRequirements(),
    stagedState: currentStagedState(),
  } satisfies SiteDeliveryExecution;
}

function scopeSiteReviewResult(
  result: SiteReviewResult,
  target: SiteEditTarget,
): SiteReviewResult {
  if (result.status !== "rejected" || target.kind === "site") return result;
  const issues = result.issues.filter((issue) => siteReviewOwnerIsAuthorized(target, issue.owner));
  return issues.length > 0
    ? { ...result, issues }
    : { status: "accepted", issues: [] };
}

function siteReviewOwnerIsAuthorized(
  target: SiteEditTarget,
  owner: SiteReviewResult["issues"][number]["owner"],
) {
  if (owner.kind === "unlocated") return false;
  if (target.kind === "page") {
    return owner.kind === "page-body" && owner.pageId === target.pageId;
  }
  if (target.kind === "shared-region") {
    return owner.kind === "shared-region" && owner.region === target.region;
  }
  if (target.kind === "section" || target.kind === "tool") {
    // Site Reviewer issues are owner-level and cannot prove that a defect is
    // inside a narrower Section/Tool authorization boundary. The scoped
    // Reviewer for that worker owns those local delivery gates.
    return false;
  }
  return true;
}

function pageDesignContractForPrompt(contract: PublicSitePlan["designContract"]) {
  const { shellRequirements: _shellRequirements, sharedCopy, ...pageContract } = contract;
  return {
    ...pageContract,
    sharedCopy: {
      ...(sharedCopy.primaryCta ? { primaryCta: sharedCopy.primaryCta } : {}),
      ...(sharedCopy.secondaryCta ? { secondaryCta: sharedCopy.secondaryCta } : {}),
    },
  };
}

function shouldUseFastCreateShell(
  site: SiteDocument,
  plan: PublicSitePlan,
  target: SiteEditTarget,
) {
  return target.kind === "site"
    && site.version === 0
    && (
      plan.pages.some((page) => page.action === "create")
      || isPristineSiteDocument(site)
    );
}

function createInitialShellTask(input: {
  input: {
    batchId: string;
    plan: PublicSitePlan;
    designSystemId: number;
    target: SiteEditTarget;
    onShellStatus?: (status: string) => void;
    shellWorker?: typeof runDefaultSiteShellWorker;
    signal?: AbortSignal;
  };
  workingSite: SiteDocument;
  navigation: SiteNavigation;
  stagedShell?: SiteDocument["sharedShell"];
  useFastCreateShell: boolean;
  reviewerCritiqueEnabled: boolean;
}) {
  if (input.stagedShell) {
    siteAuditLogger.record("site.shell.staged_reused", {});
    input.input.onShellStatus?.("Shared shell ready");
    return Promise.resolve(undefined);
  }
  if (input.input.plan.shell.action === "keep") {
    input.input.onShellStatus?.("Existing shared shell preserved");
    return Promise.resolve(undefined);
  }

  const shellStartedAt = Date.now();
  const mode = input.useFastCreateShell ? "fast-create" as const : "agent" as const;
  siteAuditLogger.record("site.shell.started", { action: input.input.plan.shell.action, mode });
  input.input.onShellStatus?.(mode === "fast-create" ? "Preparing shared shell" : "Generating shared shell");
  const runShell = (signal?: AbortSignal) => (input.input.shellWorker ?? runDefaultSiteShellWorker)({
    batchId: input.input.batchId,
    site: input.workingSite,
    navigation: input.navigation,
    prompt: input.input.plan.siteObjective,
    requirements: [
      ...input.input.plan.shell.requirements,
      ...input.input.plan.designContract.shellRequirements.header,
      ...input.input.plan.designContract.shellRequirements.footer,
    ],
    designSystemId: input.input.designSystemId,
    reviewerCritiqueEnabled: input.reviewerCritiqueEnabled,
    designContract: input.input.plan.designContract,
    target: input.input.target,
    mode,
    onProgress: input.input.onShellStatus,
    signal,
  });
  const task = mode === "agent"
    ? runWithTimeout({
      timeoutMs: siteDeliveryLimits.shellAgentTimeoutMs,
      timeoutCode: "site_shell_agent_timeout",
      signal: input.input.signal,
    }, runShell)
    : runShell(input.input.signal);
  return task.then((shell) => {
    siteAuditLogger.record("site.shell.completed", { durationMs: Date.now() - shellStartedAt, mode });
    input.input.onShellStatus?.("Shared shell completed");
    return shell;
  }).catch((error) => {
    if (isOperationTimeout(error, "site_shell_agent_timeout")) {
      siteAuditLogger.record("site.shell.fallback", {
        durationMs: Date.now() - shellStartedAt,
        reason: "timeout",
        timeoutMs: siteDeliveryLimits.shellAgentTimeoutMs,
      }, { level: "warn" });
      input.input.onShellStatus?.("Shared shell timed out · existing shell preserved");
      return undefined;
    }
    siteAuditLogger.record("site.shell.failed", { durationMs: Date.now() - shellStartedAt, mode, error }, { level: "error" });
    input.input.onShellStatus?.(`Shared shell failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  });
}
