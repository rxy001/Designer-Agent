import assert from "node:assert/strict";
import test from "node:test";
import { zodTextFormat } from "openai/helpers/zod";
import {
  computeBundleDigest,
  type PublicSitePlan,
  type SiteEditTarget,
  type SitePatchBundle,
} from "@designer-agent/site-contract";
import {
  validateBundleAgainstTarget,
  validatePlanAgainstTarget,
  validateSiteEditTarget,
} from "../app/site/siteEditTarget.ts";
import { normalizeSitePlan, type SiteDeliveryPlanDraft } from "../app/site/sitePlanPolicy.ts";
import { siteDeliveryPlanDraftSchema } from "../app/site/sitePlanner.ts";
import { siteFixture } from "./siteV2Fixtures.ts";

function pagePlan(target: SiteEditTarget): PublicSitePlan {
  return {
    id: "plan",
    planDigest: "digest",
    target,
    baseSiteVersion: 0,
    siteObjective: "Update the target",
    shell: { action: "keep", requirements: [] },
    pages: [{ taskKey: "home", pageId: "home", title: "Home", route: "/", action: "modify", objective: "Update", requirements: [] }],
    navigation: { items: [{ label: "Home", targetPageId: "home" }] },
    designContract: {
      brand: { productName: "Test", visualDirection: "simple", tone: "clear" },
      sharedCopy: {}, typographyRules: [], colorRules: [], imageryRules: [], responsiveRules: [], consistencyRules: [],
      shellRequirements: { header: [], footer: [] },
    },
  };
}

function bundle(operations: SitePatchBundle["operations"]): SitePatchBundle {
  const partial = {
    batchId: "batch",
    siteId: "site_test",
    baseSiteVersion: 0,
    nextSiteVersion: 1,
    planDigest: "digest",
    operations,
  };
  return { ...partial, bundleDigest: computeBundleDigest(partial) };
}

test("requires every edit target to exist in its declared owner", () => {
  const site = siteFixture();
  assert.throws(() => validateSiteEditTarget(site, { kind: "page", pageId: "missing" }), /target_page_not_found/);
  assert.throws(() => validateSiteEditTarget(site, {
    kind: "section", owner: { kind: "shared-region", region: "footer" }, sectionId: "header_section",
  }), /target_section_not_found/);
});

test("normalizes Structured Outputs nulls into preserved metadata and optional shared copy", () => {
  const site = siteFixture();
  const draft = {
    siteObjective: "Update home",
    shellTask: { action: "keep", requirements: [] },
    pageTasks: [{
      taskKey: "home-task",
      target: { kind: "existing", pageId: "home", suggestedTitle: null, suggestedRoute: null },
      action: "modify",
      title: null,
      route: null,
      objective: "Update home",
      requirements: [],
    }],
    navigation: { items: [{ label: "Home", targetTaskKeyOrPageId: "home" }] },
    designContract: {
      brand: { productName: "Test", visualDirection: "simple", tone: "clear" },
      sharedCopy: { primaryCta: "Start", secondaryCta: null, footerCopy: null },
      typographyRules: [], colorRules: [], imageryRules: [], responsiveRules: [], consistencyRules: [],
      shellRequirements: { header: [], footer: [] },
    },
  } satisfies SiteDeliveryPlanDraft;
  const plan = normalizeSitePlan(site, { kind: "page", pageId: "home" }, draft);
  assert.equal(plan.pages[0]?.title, "Home");
  assert.equal(plan.pages[0]?.route, "/");
  assert.deepEqual(plan.designContract.sharedCopy, { primaryCta: "Start" });
});

test("reuses an unclaimed empty page instead of creating a duplicate page", () => {
  const site = siteFixture();
  site.pages[0]!.body.sections = [];
  const draft = {
    siteObjective: "Create a task app",
    shellTask: { action: "modify", requirements: [] },
    pageTasks: [{
      taskKey: "tasks",
      target: { kind: "new", pageId: null, suggestedTitle: "Tasks", suggestedRoute: "/tasks" },
      action: "create",
      title: "Tasks",
      route: "/tasks",
      objective: "Create the task board",
      requirements: [],
    }],
    navigation: { items: [{ label: "Tasks", targetTaskKeyOrPageId: "tasks" }] },
    designContract: {
      brand: { productName: "Tasks", visualDirection: "simple", tone: "clear" },
      sharedCopy: { primaryCta: null, secondaryCta: null, footerCopy: null },
      typographyRules: [], colorRules: [], imageryRules: [], responsiveRules: [], consistencyRules: [],
      shellRequirements: { header: [], footer: [] },
    },
  } satisfies SiteDeliveryPlanDraft;

  const plan = normalizeSitePlan(site, { kind: "site" }, draft);

  assert.deepEqual(plan.pages.map((page) => ({
    pageId: page.pageId,
    title: page.title,
    route: page.route,
    action: page.action,
  })), [{ pageId: "home", title: "Tasks", route: "/", action: "modify" }]);
  assert.deepEqual(plan.navigation.items, [{ label: "Tasks", targetPageId: "home" }]);
});

test("does not reuse an empty page already claimed by another planner task", () => {
  const site = siteFixture();
  site.pages[0]!.body.sections = [];
  const draft = {
    siteObjective: "Update home and add tasks",
    shellTask: { action: "keep", requirements: [] },
    pageTasks: [
      {
        taskKey: "home",
        target: { kind: "existing", pageId: "home", suggestedTitle: null, suggestedRoute: null },
        action: "modify",
        title: null,
        route: null,
        objective: "Update home",
        requirements: [],
      },
      {
        taskKey: "tasks",
        target: { kind: "new", pageId: null, suggestedTitle: "Tasks", suggestedRoute: "/tasks" },
        action: "create",
        title: null,
        route: null,
        objective: "Create tasks",
        requirements: [],
      },
    ],
    navigation: { items: [
      { label: "Home", targetTaskKeyOrPageId: "home" },
      { label: "Tasks", targetTaskKeyOrPageId: "tasks" },
    ] },
    designContract: {
      brand: { productName: "Tasks", visualDirection: "simple", tone: "clear" },
      sharedCopy: { primaryCta: null, secondaryCta: null, footerCopy: null },
      typographyRules: [], colorRules: [], imageryRules: [], responsiveRules: [], consistencyRules: [],
      shellRequirements: { header: [], footer: [] },
    },
  } satisfies SiteDeliveryPlanDraft;

  const plan = normalizeSitePlan(site, { kind: "site" }, draft);

  assert.equal(plan.pages[0]?.pageId, "home");
  assert.equal(plan.pages[0]?.action, "modify");
  assert.notEqual(plan.pages[1]?.pageId, "home");
  assert.equal(plan.pages[1]?.action, "create");
});

test("makes every Site Planner Structured Outputs field required", () => {
  const format = zodTextFormat(siteDeliveryPlanDraftSchema, "site_delivery_plan") as unknown as {
    schema: {
      properties: Record<string, unknown>;
      required: string[];
    };
  };
  assert.deepEqual(format.schema.required.toSorted(), Object.keys(format.schema.properties).toSorted());
  assert.equal(JSON.stringify(format.schema).includes('"oneOf"'), false);
  assertAllObjectPropertiesRequired(format.schema);
});

function assertAllObjectPropertiesRequired(value: unknown) {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (record.properties && typeof record.properties === "object") {
    const properties = Object.keys(record.properties as Record<string, unknown>).toSorted();
    assert.deepEqual(Array.isArray(record.required) ? [...record.required].toSorted() : [], properties);
  }
  for (const child of Object.values(record)) assertAllObjectPropertiesRequired(child);
}

test("rejects a page-target plan that changes shell or another page", () => {
  const site = siteFixture();
  const target = { kind: "page", pageId: "home" } as const;
  assert.equal(validatePlanAgainstTarget(site, pagePlan(target), target).target.kind, "page");
  assert.throws(() => validatePlanAgainstTarget(site, {
    ...pagePlan(target), shell: { action: "modify", requirements: [] },
  }, target), /plan_scope_violation/);
  assert.throws(() => validatePlanAgainstTarget(site, {
    ...pagePlan(target), pages: [{ ...pagePlan(target).pages[0]!, pageId: "other" }],
  }, target), /plan_scope_violation/);
  assert.throws(() => validatePlanAgainstTarget(site, {
    ...pagePlan(target),
    designContract: {
      ...pagePlan(target).designContract,
      shellRequirements: { header: ["Add Shop navigation"], footer: [] },
    },
  }, target), /plan_scope_violation/);
  assert.throws(() => validatePlanAgainstTarget(site, {
    ...pagePlan(target),
    designContract: {
      ...pagePlan(target).designContract,
      sharedCopy: { footerCopy: "Add customer service links" },
    },
  }, target), /plan_scope_violation/);
});

test("rejects Tool delivery changes outside the selected Tool", () => {
  const site = siteFixture();
  site.pages[0]!.body.sections[0]!.tools.push(
    {
      id: "headline", type: "text", name: "Headline",
      layout: { gridArea: { rowStart: 1, columnStart: 1, rowEnd: 2, columnEnd: 7 }, zIndex: 1 },
      props: { content: "Before" },
    },
    {
      id: "summary", type: "text", name: "Summary",
      layout: { gridArea: { rowStart: 1, columnStart: 7, rowEnd: 2, columnEnd: 13 }, zIndex: 1 },
      props: { content: "Keep" },
    },
  );
  const target = {
    kind: "tool", owner: { kind: "page-body", pageId: "home" }, sectionId: "home_body", toolId: "headline",
  } as const;
  const allowed = bundle([
    { op: "updatePage", pageId: "home", basePageVersion: 0, patch: [{ op: "updateTool", toolId: "headline", changes: { props: { content: "After" } } }] },
    { op: "reorderPages", pageIds: ["home"] },
  ]);
  assert.equal(validateBundleAgainstTarget(site, allowed, target), allowed);
  assert.throws(() => validateBundleAgainstTarget(site, bundle([
    { op: "updatePage", pageId: "home", basePageVersion: 0, patch: [{ op: "updateTool", toolId: "summary", changes: { props: { content: "Changed" } } }] },
    { op: "reorderPages", pageIds: ["home"] },
  ]), target), /delivery_scope_violation/);
});

test("allows only the selected shared region to change", () => {
  const site = siteFixture();
  const footer = { ...site.sharedShell.footer, sections: site.sharedShell.footer.sections.map((section) => ({ ...section, name: "Updated footer" })) };
  const scoped = bundle([
    { op: "replaceSharedRegion", region: "footer", baseRegionVersion: 0, value: footer },
    { op: "reorderPages", pageIds: ["home"] },
  ]);
  assert.equal(validateBundleAgainstTarget(site, scoped, { kind: "shared-region", region: "footer" }), scoped);
  assert.throws(() => validateBundleAgainstTarget(site, scoped, { kind: "shared-region", region: "header" }), /delivery_scope_violation/);
  assert.equal(validateBundleAgainstTarget(site, scoped, {
    kind: "section", owner: { kind: "shared-region", region: "footer" }, sectionId: "footer_section",
  }), scoped);
});

test("rejects navigation and other-page operations for a page target", () => {
  const site = siteFixture();
  const target = { kind: "page", pageId: "home" } as const;
  assert.throws(() => validateBundleAgainstTarget(site, bundle([
    { op: "updateNavigation", value: site.navigation },
    { op: "updatePage", pageId: "home", basePageVersion: 0, patch: [] },
    { op: "reorderPages", pageIds: ["home"] },
  ]), target), /delivery_scope_violation/);
  assert.throws(() => validateBundleAgainstTarget(site, bundle([
    { op: "updatePage", pageId: "home", basePageVersion: 0, patch: [] },
    { op: "reorderPages", pageIds: ["other", "home"] },
  ]), target), /delivery_scope_violation/);
});
