import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { digestValue, type PublicSitePlan, type ServerMessage } from "@designer-agent/site-contract";
import { SiteLockManager } from "../app/site/siteLockManager.ts";
import { projectSiteDelivery } from "../app/site/projectSiteDelivery.ts";
import { SiteRunCoordinator } from "../app/site/siteRunCoordinator.ts";
import { SiteVersionStore } from "../app/site/siteVersionStore.ts";
import { transitionSiteWorkflow } from "../app/site/siteWorkflow.ts";
import { siteFixture } from "./siteV2Fixtures.ts";

function planFixture(): PublicSitePlan {
  return {
    id: "plan", planDigest: "plan_digest", baseSiteVersion: 0, siteObjective: "Improve home",
    target: { kind: "site" },
    shell: { action: "keep", requirements: [] },
    pages: [{ taskKey: "home-task", pageId: "home", title: "Home", route: "/", action: "modify", objective: "Improve", requirements: [] }],
    navigation: { brandTargetPageId: "home", items: [{ id: "nav_home", label: "Home", targetPageId: "home" }] },
    designContract: { brand: { productName: "Test", visualDirection: "simple", tone: "clear" }, sharedCopy: {}, typographyRules: [], colorRules: [], imageryRules: [], responsiveRules: [], consistencyRules: [], shellRequirements: { header: [], footer: [] } },
  };
}

test("rejects an unknown design system before running the planner", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-coordinator-design-system-"));
  let plannerCalled = false;
  const coordinator = new SiteRunCoordinator(
    new SiteLockManager(root),
    new SiteVersionStore(root),
    async () => {
      plannerCalled = true;
      return planFixture();
    },
  );
  await assert.rejects(
    () => coordinator.requestPlan({
      requestId: "request",
      connectionId: "connection",
      prompt: "Improve",
      designSystemId: 999,
      site: siteFixture(),
      target: { kind: "site" },
    }),
    /design_system_not_found:999/,
  );
  assert.equal(plannerCalled, false);
});

test("uses one canonical workflow for normal and reduced-plan delivery", () => {
  let state = transitionSiteWorkflow("acquiring_lock", "lock_acquired");
  assert.equal(state, "generating_shell");
  state = transitionSiteWorkflow(state, "shell_generated");
  assert.equal(state, "generating_pages");
  state = transitionSiteWorkflow(state, "reduced_plan_requested");
  assert.equal(state, "awaiting_reduced_plan_approval");
  state = transitionSiteWorkflow(state, "reduced_plan_approved");
  assert.equal(state, "generating_shell");
  state = transitionSiteWorkflow(state, "shell_generated");
  assert.equal(state, "generating_pages");
  state = transitionSiteWorkflow(state, "pages_generated");
  state = transitionSiteWorkflow(state, "review_started");
  state = transitionSiteWorkflow(state, "prepare_ready");
  state = transitionSiteWorkflow(state, "prepare_sent");
  state = transitionSiteWorkflow(state, "client_ready");
  state = transitionSiteWorkflow(state, "commit_accepted");
  assert.equal(state, "accepted");
});

test("moves each repair owner through projection and review again", () => {
  for (const [event, repairState] of [
    ["page_repair_requested", "page_repair_required"],
    ["shell_repair_requested", "shell_repair_required"],
    ["site_repair_requested", "site_repair_required"],
  ] as const) {
    let state = transitionSiteWorkflow("site_review", event);
    assert.equal(state, repairState);
    state = transitionSiteWorkflow(state, "repair_completed");
    assert.equal(state, "site_projection");
    state = transitionSiteWorkflow(state, "review_started");
    assert.equal(state, "site_review");
  }
});

test("requires reduced-plan confirmation before best-effort prepare and commits once", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-coordinator-"));
  const site = siteFixture();
  let executions = 0;
  const coordinator = new SiteRunCoordinator(
    new SiteLockManager(root),
    new SiteVersionStore(root),
    async () => planFixture(),
    async (input) => {
      executions += 1;
      input.onWorkflowEvent?.("shell_generated");
      const projection = projectSiteDelivery({ originalSite: site, batchId: input.batchId, planDigest: input.plan.planDigest, navigation: site.navigation, pages: [], pageOrder: ["home"] });
      if (executions > 1) {
        input.onWorkflowEvent?.("pages_generated");
        input.onWorkflowEvent?.("review_started");
      }
      return {
        projection,
        failedPageIds: executions === 1 ? ["home"] : [],
        siteReviewStatus: "review_unavailable" as const,
      };
    },
  );
  const messages: ServerMessage[] = [];
  const emit = (message: ServerMessage) => messages.push(message);
  const plan = await coordinator.requestPlan({ requestId: "request", connectionId: "connection", prompt: "Improve", designSystemId: -1, site, target: { kind: "site" } });
  await coordinator.approvePlan({ requestId: "request", connectionId: "connection", planId: plan.id, planDigest: plan.planDigest, currentSiteVersion: site.version, currentSiteDigest: digestValue(site), deliveryPolicy: "best_effort", emit });
  const reduced = messages.find((message) => message.type === "ai.site.reduced-plan.proposed");
  assert.ok(reduced && reduced.type === "ai.site.reduced-plan.proposed");
  assert.equal(messages.some((message) => message.type === "site.patch.prepare"), false);
  await coordinator.approveReducedPlan({ requestId: "request", connectionId: "connection", batchId: reduced.batchId, planDigest: reduced.plan.planDigest, emit });
  const prepare = messages.find((message) => message.type === "site.patch.prepare");
  assert.ok(prepare && prepare.type === "site.patch.prepare");
  assert.equal((await coordinator.locks.get(site.id))?.state, "active");
  await coordinator.clientReady({ connectionId: "connection", batchId: prepare.batch.batchId, bundleDigest: prepare.batch.bundleDigest, emit });
  await assert.rejects(
    () => coordinator.clientReady({ connectionId: "connection", batchId: prepare.batch.batchId, bundleDigest: "wrong", emit }),
    /bundle_ready_mismatch/,
  );
  await coordinator.clientReady({ connectionId: "connection", batchId: prepare.batch.batchId, bundleDigest: prepare.batch.bundleDigest, emit });
  assert.equal(messages.filter((message) => message.type === "site.patch.commit").length, 2);
  const resumedMessages: ServerMessage[] = [];
  await coordinator.resume("site_test", prepare.batch.batchId, "connection-after-commit", (message) => resumedMessages.push(message));
  assert.equal(resumedMessages[0]?.type, "site.patch.commit");
  assert.equal(resumedMessages[1]?.type, "site.lock.released");
  assert.equal((await coordinator.versions.readActiveSite("site_test"))!.version, 1);
});

test("removes failed and deleted page references from a reduced plan navigation", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-coordinator-reduced-navigation-"));
  const site = siteFixture();
  const home = site.pages[0]!;
  site.pages.push({
    id: "obsolete",
    route: "/obsolete",
    body: { ...structuredClone(home.body), id: "obsolete", title: "Obsolete", sections: [] },
  });
  const planned = planFixture();
  planned.pages = [
    ...planned.pages,
    { taskKey: "remove-obsolete", pageId: "obsolete", title: "Obsolete", route: "/obsolete", action: "remove", objective: "Remove", requirements: [] },
    { taskKey: "create-pricing", pageId: "pricing", title: "Pricing", route: "/pricing", action: "create", objective: "Create", requirements: [] },
  ];
  planned.navigation = {
    brandTargetPageId: "pricing",
    items: [
      { id: "nav_home", label: "Home", targetPageId: "home" },
      { id: "nav_obsolete", label: "Obsolete", targetPageId: "obsolete" },
      { id: "nav_pricing", label: "Pricing", targetPageId: "pricing" },
    ],
    primaryAction: { label: "Pricing", targetPageId: "pricing" },
    secondaryAction: { label: "Legacy", targetPageId: "obsolete" },
  };
  const coordinator = new SiteRunCoordinator(
    new SiteLockManager(root),
    new SiteVersionStore(root),
    async () => planned,
    async (input) => {
      input.onWorkflowEvent?.("shell_generated");
      return {
        projection: projectSiteDelivery({ originalSite: site, batchId: input.batchId, planDigest: input.plan.planDigest, navigation: site.navigation, pages: [], pageOrder: ["home", "obsolete"] }),
        failedPageIds: ["pricing"],
        siteReviewStatus: "review_unavailable" as const,
      };
    },
  );
  const messages: ServerMessage[] = [];
  const plan = await coordinator.requestPlan({ requestId: "request", connectionId: "connection", prompt: "Replace legacy", designSystemId: -1, site, target: { kind: "site" } });
  await coordinator.approvePlan({
    requestId: "request",
    connectionId: "connection",
    planId: plan.id,
    planDigest: plan.planDigest,
    currentSiteVersion: site.version,
    currentSiteDigest: digestValue(site),
    deliveryPolicy: "best_effort",
    emit: (message) => messages.push(message),
  });

  const reduced = messages.find((message) => message.type === "ai.site.reduced-plan.proposed");
  assert.ok(reduced && reduced.type === "ai.site.reduced-plan.proposed");
  assert.deepEqual(reduced.plan.pages.map((page) => [page.pageId, page.action]), [["home", "modify"], ["obsolete", "remove"]]);
  assert.deepEqual(reduced.plan.navigation, {
    brandTargetPageId: "home",
    items: [{ id: "nav_home", label: "Home", targetPageId: "home" }],
  });
});

test("rejects approval when the current editor site differs from the planned snapshot", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-coordinator-stale-"));
  const site = siteFixture();
  const coordinator = new SiteRunCoordinator(
    new SiteLockManager(root),
    new SiteVersionStore(root),
    async () => planFixture(),
    async () => { throw new Error("executor_should_not_run"); },
  );
  const plan = await coordinator.requestPlan({ requestId: "request", connectionId: "connection", prompt: "Improve", designSystemId: -1, site, target: { kind: "site" } });
  const edited = { ...site, title: "Edited after planning" };
  await assert.rejects(
    () => coordinator.approvePlan({
      requestId: "request",
      connectionId: "connection",
      planId: plan.id,
      planDigest: plan.planDigest,
      currentSiteVersion: edited.version,
      currentSiteDigest: digestValue(edited),
      deliveryPolicy: "strict",
      emit: () => undefined,
    }),
    /site_version_stale/,
  );
  await coordinator.locks.assertWritable(site.id);
});

test("strict execution failure aborts without creating an active version", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-coordinator-strict-"));
  const site = siteFixture();
  const coordinator = new SiteRunCoordinator(
    new SiteLockManager(root),
    new SiteVersionStore(root),
    async () => planFixture(),
    async () => { throw new Error("strict_delivery_failed:home"); },
  );
  const messages: ServerMessage[] = [];
  const plan = await coordinator.requestPlan({ requestId: "request", connectionId: "connection", prompt: "Improve", designSystemId: -1, site, target: { kind: "site" } });
  await coordinator.approvePlan({ requestId: "request", connectionId: "connection", planId: plan.id, planDigest: plan.planDigest, currentSiteVersion: site.version, currentSiteDigest: digestValue(site), deliveryPolicy: "strict", emit: (message) => messages.push(message) });
  assert.equal(messages.some((message) => message.type === "site.patch.abort"), true);
  assert.equal(await coordinator.versions.readActive("site_test"), undefined);
  await coordinator.locks.assertWritable("site_test");
});

test("cancelling a batch aborts the running executor and releases the lock", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-coordinator-cancel-"));
  const site = siteFixture();
  let executorSignal: AbortSignal | undefined;
  const coordinator = new SiteRunCoordinator(
    new SiteLockManager(root),
    new SiteVersionStore(root),
    async () => planFixture(),
    async (input) => {
      executorSignal = input.signal;
      input.onSiteStatus?.("Reviewing complete site");
      input.onShellStatus?.("Shared shell completed");
      input.onPageStatus?.("home", "verified");
      input.onPageUserEvent?.("home", { type: "message", text: "Home page is ready for review." });
      input.onPageUserEvent?.("home", { type: "todos", todos: [{ name: "Build home", status: "completed" }] });
      return new Promise((_, reject) => input.signal?.addEventListener("abort", () => reject(input.signal?.reason), { once: true }));
    },
  );
  const messages: ServerMessage[] = [];
  const emit = (message: ServerMessage) => messages.push(message);
  const plan = await coordinator.requestPlan({ requestId: "request", connectionId: "connection", prompt: "Improve", designSystemId: -1, site, target: { kind: "site" } });
  const approval = coordinator.approvePlan({ requestId: "request", connectionId: "connection", planId: plan.id, planDigest: plan.planDigest, currentSiteVersion: site.version, currentSiteDigest: digestValue(site), deliveryPolicy: "strict", emit });
  for (let attempt = 0; attempt < 20 && !messages.some((message) => message.type === "site.lock.acquired"); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const acquired = messages.find((message) => message.type === "site.lock.acquired");
  assert.ok(acquired && acquired.type === "site.lock.acquired");
  assert.deepEqual(messages.find((message) => message.type === "ai.page.message"), {
    type: "ai.page.message",
    requestId: "request",
    batchId: acquired.batchId,
    pageId: "home",
    text: "Home page is ready for review.",
  });
  const replayed: ServerMessage[] = [];
  await coordinator.resume(site.id, acquired.batchId, "connection-b", (message) => replayed.push(message));
  assert.equal(replayed.some((message) => message.type === "ai.site.status"), true);
  assert.equal(replayed.some((message) => message.type === "ai.shell.status"), true);
  assert.equal(replayed.some((message) => message.type === "ai.page.status"), true);
  assert.equal(replayed.some((message) => message.type === "ai.page.todos"), true);
  await coordinator.abort(acquired.batchId, "connection-b", "Cancelled by test.", emit);
  await approval;
  assert.equal(executorSignal?.aborted, true);
  assert.equal(messages.some((message) => message.type === "site.patch.abort"), true);
  await coordinator.locks.assertWritable(site.id);
});

test("refreshes the lock while generating without extending disconnect grace", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-coordinator-lock-refresh-"));
  const site = siteFixture();
  const locks = new SiteLockManager(root);
  const refreshActiveLease = locks.refreshActiveLease.bind(locks);
  let refreshCount = 0;
  locks.refreshActiveLease = async (...args) => {
    refreshCount += 1;
    return refreshActiveLease(...args);
  };
  const coordinator = new SiteRunCoordinator(
    locks,
    new SiteVersionStore(root),
    async () => planFixture(),
    async (input) => new Promise((_, reject) => {
      input.signal?.addEventListener(
        "abort",
        () => reject(input.signal?.reason),
        { once: true },
      );
    }),
    5,
  );
  const messages: ServerMessage[] = [];
  const emit = (message: ServerMessage) => messages.push(message);
  const plan = await coordinator.requestPlan({
    requestId: "request",
    connectionId: "connection",
    prompt: "Improve",
    designSystemId: -1,
    site,
    target: { kind: "site" },
  });
  const approval = coordinator.approvePlan({
    requestId: "request",
    connectionId: "connection",
    planId: plan.id,
    planDigest: plan.planDigest,
    currentSiteVersion: site.version,
    currentSiteDigest: digestValue(site),
    deliveryPolicy: "strict",
    emit,
  });
  for (let attempt = 0; attempt < 20 && refreshCount === 0; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.ok(refreshCount > 0);

  const acquired = messages.find((message) => message.type === "site.lock.acquired");
  assert.ok(acquired && acquired.type === "site.lock.acquired");
  await coordinator.disconnect("connection");
  const disconnected = await locks.get(site.id);
  assert.equal(disconnected?.state, "disconnect_grace");
  const disconnectExpiry = disconnected?.expiresAt;
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal((await locks.get(site.id))?.expiresAt, disconnectExpiry);

  await coordinator.abort(acquired.batchId, "connection", "Cancelled by test.", emit);
  await approval;
  const refreshCountAfterAbort = refreshCount;
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(refreshCount, refreshCountAfterAbort);
});
