import { randomUUID } from "node:crypto";
import {
  digestValue,
  type DeliveryPolicy,
  type PublicSitePlan,
  type ServerMessage,
  type SiteDocument,
  type SiteEditTarget,
} from "@designer-agent/site-contract";
import { executeSiteDelivery, type SiteDeliveryExecution } from "./executeSiteDelivery.ts";
import { SiteLockManager } from "./siteLockManager.ts";
import { runSitePlanner } from "./sitePlanner.ts";
import { SiteVersionStore } from "./siteVersionStore.ts";
import { withSiteLogContext } from "../logging/logContext.ts";
import { siteAuditLogger } from "../logging/siteAuditLogger.ts";
import { validateBundleAgainstTarget, validatePlanAgainstTarget, validateSiteEditTarget } from "./siteEditTarget.ts";
import type { UserVisibleTodo } from "../userVisibleAgentEvents.ts";
import { resolveDesignSystemReference } from "../designSystemReference.ts";
import {
  isTerminalSiteWorkflowState,
  transitionSiteWorkflow,
  type SiteWorkflowEvent,
  type SiteWorkflowState,
} from "./siteWorkflow.ts";

type Emit = (message: ServerMessage) => void;

type PlanRecord = {
  requestId: string;
  connectionId: string;
  prompt: string;
  designSystemId: number;
  site: SiteDocument;
  target: SiteEditTarget;
  plan: PublicSitePlan;
};

type BatchRecord = {
  requestId: string;
  connectionId: string;
  batchId: string;
  leaseId: string;
  site: SiteDocument;
  plan: PublicSitePlan;
  designSystemId: number;
  deliveryPolicy: DeliveryPolicy;
  target: SiteEditTarget;
  execution?: SiteDeliveryExecution;
  state: SiteWorkflowState;
  reducedTimer?: NodeJS.Timeout;
  lockKeepAliveTimer?: NodeJS.Timeout;
  controller: AbortController;
  siteStatus?: string;
  shellStatus?: string;
  pageStatuses: Record<string, string>;
  pageTodos: Record<string, UserVisibleTodo[]>;
  emit: Emit;
};

export const SITE_LOCK_KEEP_ALIVE_INTERVAL_MS = 20_000;

export class SiteRunCoordinator {
  #plans = new Map<string, PlanRecord>();
  #batches = new Map<string, BatchRecord>();
  readonly locks: SiteLockManager;
  readonly versions: SiteVersionStore;
  readonly planner: typeof runSitePlanner;
  readonly executor: typeof executeSiteDelivery;
  readonly lockKeepAliveIntervalMs: number;

  constructor(
    locks: SiteLockManager,
    versions: SiteVersionStore,
    planner = runSitePlanner,
    executor = executeSiteDelivery,
    lockKeepAliveIntervalMs = SITE_LOCK_KEEP_ALIVE_INTERVAL_MS,
  ) {
    this.locks = locks;
    this.versions = versions;
    this.planner = planner;
    this.executor = executor;
    this.lockKeepAliveIntervalMs = lockKeepAliveIntervalMs;
  }

  async requestPlan(input: {
    requestId: string;
    connectionId: string;
    prompt: string;
    designSystemId: number;
    site: SiteDocument;
    target: SiteEditTarget;
    signal?: AbortSignal;
  }) {
    await resolveDesignSystemReference(input.designSystemId);
    validateSiteEditTarget(input.site, input.target);
    siteAuditLogger.record("site.plan.requested", {
      promptChars: input.prompt.length,
      promptDigest: digestValue(input.prompt),
      designSystemId: input.designSystemId,
      pageCount: input.site.pages.length,
      target: input.target,
    }, { context: { siteId: input.site.id, requestId: input.requestId } });
    let plan: PublicSitePlan;
    try {
      plan = await withSiteLogContext(
        { siteId: input.site.id, requestId: input.requestId },
        () => this.planner({ request: input.prompt, designSystemId: input.designSystemId, site: input.site, target: input.target, signal: input.signal }),
      );
      validatePlanAgainstTarget(input.site, plan, input.target);
    } catch (error) {
      siteAuditLogger.record("site.plan.failed", { error }, { level: "error", context: { siteId: input.site.id, requestId: input.requestId } });
      throw error;
    }
    this.#plans.set(plan.id, { ...input, plan });
    siteAuditLogger.record("site.plan.proposed", {
      planDigest: plan.planDigest,
      pageTaskCount: plan.pages.length,
      shellAction: plan.shell.action,
    }, { context: { siteId: input.site.id, planId: plan.id, requestId: input.requestId } });
    return plan;
  }

  rejectPlan(planId: string) {
    const record = this.#plans.get(planId);
    if (record) siteAuditLogger.record("site.plan.rejected", {}, { context: { siteId: record.site.id, planId, requestId: record.requestId } });
    return this.#plans.delete(planId);
  }

  cancelPlanRequest(requestId: string, connectionId: string) {
    let removed = false;
    for (const [planId, record] of this.#plans) {
      if (record.requestId !== requestId || record.connectionId !== connectionId) continue;
      siteAuditLogger.record("site.plan.cancelled", {}, { context: { siteId: record.site.id, planId, requestId } });
      this.#plans.delete(planId);
      removed = true;
    }
    return removed;
  }

  async approvePlan(input: {
    requestId: string;
    connectionId: string;
    planId: string;
    planDigest: string;
    currentSiteVersion: number;
    currentSiteDigest: string;
    deliveryPolicy: DeliveryPolicy;
    emit: Emit;
  }) {
    const record = this.#plans.get(input.planId);
    if (!record || record.requestId !== input.requestId || record.connectionId !== input.connectionId) throw new Error("site_plan_not_found");
    if (record.plan.planDigest !== input.planDigest) throw new Error("plan_digest_mismatch");
    if (
      input.currentSiteVersion !== record.plan.baseSiteVersion ||
      input.currentSiteDigest !== digestValue(record.site)
    ) {
      siteAuditLogger.record("site.plan.stale", {
        plannedVersion: record.plan.baseSiteVersion,
        currentVersion: input.currentSiteVersion,
      }, { level: "warn", context: { siteId: record.site.id, planId: record.plan.id, requestId: input.requestId } });
      throw new Error("site_version_stale");
    }
    const batchId = randomUUID();
    const lock = await this.locks.acquire(record.site.id, batchId, input.connectionId);
    const controller = new AbortController();
    const batch: BatchRecord = {
      requestId: input.requestId,
      connectionId: input.connectionId,
      batchId,
      leaseId: lock.leaseId,
      site: record.site,
      plan: record.plan,
      designSystemId: record.designSystemId,
      deliveryPolicy: input.deliveryPolicy,
      target: record.target,
      state: "acquiring_lock",
      controller,
      pageStatuses: {},
      pageTodos: {},
      emit: input.emit,
    };
    this.#batches.set(batchId, batch);
    this.#armLockKeepAlive(batch);
    this.#transition(batch, "lock_acquired");
    this.#plans.delete(input.planId);
    siteAuditLogger.record("site.plan.approved", { deliveryPolicy: input.deliveryPolicy, planDigest: input.planDigest }, { context: { siteId: record.site.id, batchId, planId: record.plan.id, requestId: input.requestId } });
    siteAuditLogger.record("site.lock.acquired", { expiresAt: lock.expiresAt }, { context: { siteId: record.site.id, batchId, planId: record.plan.id, requestId: input.requestId } });
    input.emit({ type: "site.lock.acquired", requestId: input.requestId, batchId, leaseId: lock.leaseId });
    await this.#execute(batch);
  }

  async approveReducedPlan(input: { requestId: string; connectionId: string; batchId: string; planDigest: string; emit: Emit }) {
    const batch = this.#requireBatch(input.batchId, input.connectionId);
    if (batch.state !== "awaiting_reduced_plan_approval" || batch.plan.planDigest !== input.planDigest) throw new Error("reduced_plan_mismatch");
    await this.locks.activate(batch.site.id, batch.batchId, batch.leaseId);
    if (batch.reducedTimer) clearTimeout(batch.reducedTimer);
    this.#transition(batch, "reduced_plan_approved");
    batch.emit = input.emit;
    this.#armLockKeepAlive(batch);
    siteAuditLogger.record("site.reduced_plan.approved", { planDigest: input.planDigest }, { context: contextFor(batch) });
    await this.#execute(batch);
  }

  async rejectReducedPlan(batchId: string, connectionId: string, emit: Emit) {
    const batch = this.#batches.get(batchId);
    if (batch) siteAuditLogger.record("site.reduced_plan.rejected", {}, { context: contextFor(batch) });
    await this.abort(batchId, connectionId, "Reduced plan rejected.", emit);
  }

  async clientReady(input: { batchId: string; bundleDigest: string; connectionId: string; emit: Emit }) {
    const batch = this.#requireBatch(input.batchId, input.connectionId);
    if (batch.state === "accepted") {
      const projection = requireProjection(batch.execution);
      if (projection.bundle.bundleDigest !== input.bundleDigest) throw new Error("bundle_ready_mismatch");
      siteAuditLogger.record("site.patch.commit_replayed", { bundleDigest: projection.bundle.bundleDigest }, { context: contextFor(batch) });
      input.emit({ type: "site.patch.commit", requestId: batch.requestId, batchId: batch.batchId, bundleDigest: projection.bundle.bundleDigest, siteVersion: projection.projectedSite.version });
      return;
    }
    if (batch.state !== "waiting_client_ready" || requireProjection(batch.execution).bundle.bundleDigest !== input.bundleDigest) throw new Error("bundle_ready_mismatch");
    siteAuditLogger.record("site.patch.client_ready", { bundleDigest: input.bundleDigest }, { context: contextFor(batch) });
    this.#transition(batch, "client_ready");
    const active = await this.versions.commit(batch.site.id, batch.batchId, input.bundleDigest);
    this.#clearLockKeepAlive(batch);
    this.#emitSiteStatus(batch, "Site committed");
    this.#transition(batch, "commit_accepted");
    input.emit({ type: "site.patch.commit", requestId: batch.requestId, batchId: batch.batchId, bundleDigest: active.bundleDigest, siteVersion: active.siteVersion });
    siteAuditLogger.record("site.patch.commit_sent", { bundleDigest: active.bundleDigest, siteVersion: active.siteVersion }, { context: contextFor(batch) });
    await this.locks.release(batch.site.id, batch.batchId, batch.leaseId);
    siteAuditLogger.record("site.lock.released", { terminalStatus: "accepted" }, { context: contextFor(batch) });
    input.emit({ type: "site.lock.released", requestId: batch.requestId, batchId: batch.batchId });
  }

  async abort(
    batchId: string,
    connectionId: string,
    reason: string,
    emit: Emit,
    terminalEvent: "cancel" | "reject" = "cancel",
  ) {
    const batch = this.#requireBatch(batchId, connectionId);
    if (isTerminalSiteWorkflowState(batch.state)) return;
    if (batch.reducedTimer) clearTimeout(batch.reducedTimer);
    this.#clearLockKeepAlive(batch);
    batch.controller.abort(new Error(reason));
    this.#transition(batch, terminalEvent);
    await this.locks.release(batch.site.id, batch.batchId, batch.leaseId);
    siteAuditLogger.record("site.patch.aborted", { reason }, { level: "warn", context: contextFor(batch) });
    siteAuditLogger.record("site.lock.released", { terminalStatus: "aborted" }, { context: contextFor(batch) });
    emit({ type: "site.patch.abort", requestId: batch.requestId, batchId, reason });
    emit({ type: "site.lock.released", requestId: batch.requestId, batchId });
  }

  async heartbeat(siteId: string, batchId: string, leaseId: string) {
    return this.locks.heartbeat(siteId, batchId, leaseId);
  }

  auditContextFor(input: { batchId?: string; planId?: string }) {
    const batch = input.batchId ? this.#batches.get(input.batchId) : undefined;
    if (batch) return contextFor(batch);
    const plan = input.planId ? this.#plans.get(input.planId) : undefined;
    return plan ? { siteId: plan.site.id, planId: plan.plan.id, requestId: plan.requestId } : undefined;
  }

  async resume(siteId: string, batchId: string, connectionId: string, emit: Emit) {
    const batch = this.#batches.get(batchId);
    if (!batch || batch.site.id !== siteId) throw new Error("site_batch_not_found");
    batch.connectionId = connectionId;
    batch.emit = emit;
    if (batch.state === "accepted") {
      const projection = requireProjection(batch.execution);
      siteAuditLogger.record("site.patch.commit_replayed", { bundleDigest: projection.bundle.bundleDigest }, { context: contextFor(batch) });
      emit({ type: "site.patch.commit", requestId: batch.requestId, batchId, bundleDigest: projection.bundle.bundleDigest, siteVersion: projection.projectedSite.version });
      emit({ type: "site.lock.released", requestId: batch.requestId, batchId });
      return undefined;
    }
    const lock = await this.locks.resume(siteId, batchId, connectionId);
    siteAuditLogger.record("site.lock.resumed", { state: lock.state, expiresAt: lock.expiresAt }, { context: contextFor(batch) });
    batch.leaseId = lock.leaseId;
    if (batch.state === "waiting_client_ready" && batch.execution) {
      const projection = requireProjection(batch.execution);
      emit({ type: "site.patch.prepare", requestId: batch.requestId, batch: projection.bundle, projectedSiteDigest: projection.projectedSiteDigest });
    } else if (batch.state === "awaiting_reduced_plan_approval") {
      emit({ type: "ai.site.reduced-plan.proposed", requestId: batch.requestId, batchId, plan: batch.plan, expiresAt: lock.expiresAt });
    } else if (isGeneratingSiteState(batch.state)) {
      if (batch.siteStatus) emit({ type: "ai.site.status", requestId: batch.requestId, batchId, status: batch.siteStatus });
      if (batch.shellStatus) emit({ type: "ai.shell.status", requestId: batch.requestId, batchId, status: batch.shellStatus });
      for (const [pageId, status] of Object.entries(batch.pageStatuses)) {
        emit({ type: "ai.page.status", requestId: batch.requestId, batchId, pageId, status });
      }
      for (const [pageId, todos] of Object.entries(batch.pageTodos)) {
        emit({ type: "ai.page.todos", requestId: batch.requestId, batchId, pageId, todos });
      }
    }
    return lock;
  }

  async disconnect(connectionId: string) {
    for (const [planId, plan] of this.#plans) {
      if (plan.connectionId === connectionId) this.#plans.delete(planId);
    }
    const batches = [...this.#batches.values()].filter((batch) =>
      batch.connectionId === connectionId && !isTerminalSiteWorkflowState(batch.state)
    );
    for (const batch of batches) siteAuditLogger.record("site.lock.disconnected", { graceMs: 60_000 }, { level: "warn", context: contextFor(batch) });
    await Promise.all(batches.map((batch) => this.locks.markDisconnected(batch.site.id, batch.batchId)));
  }

  handleExpiredLock(batchId: string) {
    const batch = this.#batches.get(batchId);
    if (!batch || isTerminalSiteWorkflowState(batch.state)) return;
    if (batch.reducedTimer) clearTimeout(batch.reducedTimer);
    this.#clearLockKeepAlive(batch);
    batch.controller.abort(new Error("site_lock_expired"));
    this.#transition(batch, "reject");
    siteAuditLogger.record("site.lock.expired", {}, { level: "warn", context: contextFor(batch) });
  }

  async #execute(batch: BatchRecord) {
    return withSiteLogContext(contextFor(batch), async () => {
      const startedAt = Date.now();
      siteAuditLogger.record("site.generation.started", { deliveryPolicy: batch.deliveryPolicy });
      try {
      const execution = await this.executor({
        originalSite: batch.site,
        plan: batch.plan,
        batchId: batch.batchId,
        designSystemId: batch.designSystemId,
        deliveryPolicy: batch.deliveryPolicy,
        target: batch.target,
        resumeState: batch.execution?.stagedState,
        signal: batch.controller.signal,
        onWorkflowEvent: (event) => {
          if (isTerminalSiteWorkflowState(batch.state)) return;
          this.#transition(batch, event);
        },
        onSiteStatus: (status) => this.#emitSiteStatus(batch, status),
        onPageStatus: (pageId, status) => {
          if (isTerminalSiteWorkflowState(batch.state)) return;
          batch.pageStatuses[pageId] = status;
          batch.emit({ type: "ai.page.status", requestId: batch.requestId, batchId: batch.batchId, pageId, status });
        },
        onShellStatus: (status) => {
          if (isTerminalSiteWorkflowState(batch.state)) return;
          batch.shellStatus = status;
          batch.emit({ type: "ai.shell.status", requestId: batch.requestId, batchId: batch.batchId, status });
        },
        onPageUserEvent: (pageId, event) => {
          if (isTerminalSiteWorkflowState(batch.state)) return;
          if (event.type === "message") {
            batch.emit({ type: "ai.page.message", requestId: batch.requestId, batchId: batch.batchId, pageId, text: event.text });
          } else {
            batch.pageTodos[pageId] = event.todos;
            batch.emit({ type: "ai.page.todos", requestId: batch.requestId, batchId: batch.batchId, pageId, todos: event.todos });
          }
        },
      });
      if (isTerminalSiteWorkflowState(batch.state)) return;
      if (execution.failedPageIds.length > 0) {
        this.#clearLockKeepAlive(batch);
        batch.execution = execution;
        const failed = new Set(execution.failedPageIds);
        const pages = batch.plan.pages.filter((page) => !failed.has(page.pageId));
        const surviving = new Set(batch.site.pages.map((page) => page.id));
        for (const page of pages) {
          if (page.action === "remove") surviving.delete(page.pageId);
          else surviving.add(page.pageId);
        }
        const reducedPageById = new Map(pages.map((page) => [page.pageId, page]));
        const rootPageId = [...surviving].find((pageId) => {
          const planned = reducedPageById.get(pageId);
          return (planned?.route ?? batch.site.pages.find((page) => page.id === pageId)?.route) === "/";
        }) ?? [...surviving][0]!;
        const navigation = batch.plan.navigation;
        const reducedContent = {
          ...batch.plan,
          id: randomUUID(),
          pages,
          navigation: {
            brandTargetPageId: surviving.has(navigation.brandTargetPageId) ? navigation.brandTargetPageId : rootPageId,
            items: navigation.items.filter((item) => surviving.has(item.targetPageId)),
            ...(navigation.primaryAction && surviving.has(navigation.primaryAction.targetPageId)
              ? { primaryAction: navigation.primaryAction }
              : {}),
            ...(navigation.secondaryAction && surviving.has(navigation.secondaryAction.targetPageId)
              ? { secondaryAction: navigation.secondaryAction }
              : {}),
          },
        };
        const { planDigest: _oldDigest, ...digestible } = reducedContent;
        batch.plan = { ...reducedContent, planDigest: digestValue(digestible) };
        this.#transition(batch, "reduced_plan_requested");
        const lock = await this.locks.awaitReducedPlan(batch.site.id, batch.batchId);
        siteAuditLogger.record("site.reduced_plan.proposed", { failedPageIds: execution.failedPageIds, expiresAt: lock.expiresAt, planDigest: batch.plan.planDigest }, { level: "warn" });
        batch.emit({ type: "ai.site.reduced-plan.proposed", requestId: batch.requestId, batchId: batch.batchId, plan: batch.plan, expiresAt: lock.expiresAt });
        batch.reducedTimer = setTimeout(() => {
          void this.abort(batch.batchId, batch.connectionId, "Reduced plan confirmation timed out.", batch.emit);
        }, Math.max(0, lock.expiresAt - Date.now()));
        batch.reducedTimer.unref();
        return;
      }
      batch.execution = execution;
      const completed = requireCompletedExecution(execution);
      const projection = completed.projection;
      this.#transition(batch, "prepare_ready");
      validateBundleAgainstTarget(batch.site, projection.bundle, batch.target);
      this.#emitSiteStatus(batch, "Saving site update");
      await this.versions.stage({
        previousSite: batch.site,
        site: projection.projectedSite,
        bundle: projection.bundle,
        plan: batch.plan,
        siteReviewStatus: execution.siteReviewStatus,
      });
      this.#clearLockKeepAlive(batch);
      this.#transition(batch, "prepare_sent");
      this.#emitSiteStatus(batch, "Site update ready");
      siteAuditLogger.record("site.patch.prepare_sent", { bundleDigest: projection.bundle.bundleDigest, durationMs: Date.now() - startedAt });
      batch.emit({ type: "site.patch.prepare", requestId: batch.requestId, batch: projection.bundle, projectedSiteDigest: projection.projectedSiteDigest });
    } catch (error) {
      if (isTerminalSiteWorkflowState(batch.state)) return;
      siteAuditLogger.record("site.generation.failed", { durationMs: Date.now() - startedAt, error }, { level: "error" });
      const reason = batch.controller.signal.aborted && batch.controller.signal.reason instanceof Error
        ? batch.controller.signal.reason.message
        : error instanceof Error ? error.message : String(error);
      await this.abort(batch.batchId, batch.connectionId, reason, batch.emit, "reject");
    }
    });
  }

  #requireBatch(batchId: string, connectionId: string) {
    const batch = this.#batches.get(batchId);
    if (!batch || batch.connectionId !== connectionId) throw new Error("site_batch_not_found");
    return batch;
  }

  #emitSiteStatus(batch: BatchRecord, status: string) {
    if (isTerminalSiteWorkflowState(batch.state)) return;
    batch.siteStatus = status;
    batch.emit({ type: "ai.site.status", requestId: batch.requestId, batchId: batch.batchId, status });
  }

  #armLockKeepAlive(batch: BatchRecord) {
    this.#clearLockKeepAlive(batch);
    batch.lockKeepAliveTimer = setInterval(() => {
      if (!isGeneratingSiteState(batch.state)) return;
      void this.locks.refreshActiveLease(
        batch.site.id,
        batch.batchId,
        batch.leaseId,
      ).then((lock) => {
        if (lock.state !== "active") return;
        siteAuditLogger.record(
          "site.lock.refreshed",
          { expiresAt: lock.expiresAt },
          { level: "debug", context: contextFor(batch) },
        );
      }).catch((error) => {
        siteAuditLogger.record(
          "site.lock.refresh_failed",
          { error },
          { level: "warn", context: contextFor(batch) },
        );
      });
    }, this.lockKeepAliveIntervalMs);
    batch.lockKeepAliveTimer.unref();
  }

  #clearLockKeepAlive(batch: BatchRecord) {
    if (!batch.lockKeepAliveTimer) return;
    clearInterval(batch.lockKeepAliveTimer);
    batch.lockKeepAliveTimer = undefined;
  }

  #transition(batch: BatchRecord, event: SiteWorkflowEvent) {
    const previous = batch.state;
    const next = transitionSiteWorkflow(previous, event);
    batch.state = next;
    siteAuditLogger.record("site.workflow.transition", { previous, event, next }, { context: contextFor(batch) });
    return next;
  }
}

function isGeneratingSiteState(state: SiteWorkflowState) {
  return [
    "generating_shell",
    "generating_pages",
    "page_repair_required",
    "shell_repair_required",
    "site_projection",
    "site_review",
    "site_repair_required",
  ].includes(state);
}

function contextFor(batch: BatchRecord) {
  return {
    siteId: batch.site.id,
    batchId: batch.batchId,
    planId: batch.plan.id,
    requestId: batch.requestId,
  };
}

function requireProjection(execution?: SiteDeliveryExecution) {
  if (!execution?.projection) throw new Error("site_projection_missing");
  return execution.projection;
}

function requireCompletedExecution(execution: SiteDeliveryExecution) {
  if (!execution.projection) throw new Error("site_delivery_incomplete");
  return execution as SiteDeliveryExecution & {
    projection: NonNullable<SiteDeliveryExecution["projection"]>;
  };
}
