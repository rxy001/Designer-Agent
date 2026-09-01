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
import {
  normalizeSitePlan,
  type SiteDeliveryPlanDraft,
} from "../app/site/sitePlanPolicy.ts";
import {
  siteDeliveryPlanDraftSchema,
  summarizeSiteForPlanner,
} from "../app/site/sitePlanner.ts";
import { section, siteFixture } from "./siteV2Fixtures.ts";

function pagePlan(target: SiteEditTarget): PublicSitePlan {
  return {
    id: "plan",
    planDigest: "digest",
    target,
    baseSiteVersion: 0,
    siteObjective: "Update the target",
    shell: { action: "keep", requirements: [] },
    pages: [
      {
        taskKey: "home",
        pageId: "home",
        title: "Home",
        route: "/",
        action: "modify",
        objective: "Update",
        requirements: [],
      },
    ],
    navigation: { brandTargetPageId: "home", items: [{ id: "nav_home", label: "Home", targetPageId: "home" }] },
    designContract: {
      brand: { productName: "Test", visualDirection: "simple", tone: "clear" },
      sharedCopy: {},
      typographyRules: [],
      colorRules: [],
      imageryRules: [],
      responsiveRules: [],
      consistencyRules: [],
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

function navigationDraft(
  items: Array<{ id?: string | null; label: string; targetTaskKeyOrPageId: string }>,
  brandTargetTaskKeyOrPageId = "home",
): SiteDeliveryPlanDraft["navigation"] {
  return {
    brandTargetTaskKeyOrPageId,
    items: items.map((item) => ({ id: item.id ?? null, label: item.label, targetTaskKeyOrPageId: item.targetTaskKeyOrPageId })),
    primaryAction: null,
    secondaryAction: null,
  };
}

test("includes shared-region mount state in the Planner summary", () => {
  const site = siteFixture();
  site.sharedShell.footer.mounted = false;

  assert.deepEqual(summarizeSiteForPlanner(site).sharedShellSummary, {
    header: { mounted: true, sections: ["header_section"] },
    footer: { mounted: false, sections: ["footer_section"] },
  });
});

test("requires every edit target to exist in its declared owner", () => {
  const site = siteFixture();
  assert.throws(
    () => validateSiteEditTarget(site, { kind: "page", pageId: "missing" }),
    /target_page_not_found/,
  );
  assert.throws(
    () =>
      validateSiteEditTarget(site, {
        kind: "section",
        owner: { kind: "shared-region", region: "footer" },
        sectionId: "header_section",
      }),
    /target_section_not_found/,
  );
});

test("normalizes Structured Outputs nulls into preserved metadata and optional shared copy", () => {
  const site = siteFixture();
  const draft = {
    siteObjective: "Update home",
    shellTask: { action: "keep", requirements: [] },
    pageTasks: [
      {
        taskKey: "home-task",
        target: {
          kind: "existing",
          pageId: "home",
          suggestedTitle: null,
          suggestedRoute: null,
        },
        action: "modify",
        title: null,
        route: null,
        objective: "Update home",
        requirements: [],
      },
    ],
    navigation: navigationDraft([{ id: "nav_home", label: "Home", targetTaskKeyOrPageId: "home" }]),
    designContract: {
      brand: { productName: "Test", visualDirection: "simple", tone: "clear" },
      sharedCopy: { primaryCta: "Start", secondaryCta: null, footerCopy: null },
      typographyRules: [],
      colorRules: [],
      imageryRules: [],
      responsiveRules: [],
      consistencyRules: [],
      shellRequirements: { header: [], footer: [] },
    },
  } satisfies SiteDeliveryPlanDraft;
  const plan = normalizeSitePlan(site, { kind: "page", pageId: "home" }, draft);
  assert.equal(plan.pages[0]?.title, "Home");
  assert.equal(plan.pages[0]?.route, "/");
  assert.deepEqual(plan.designContract.sharedCopy, { primaryCta: "Start" });
});

test("recovers a navigation task reference with a model-generated section fragment", () => {
  const site = siteFixture();
  const draft = {
    siteObjective: "Update the conference home page",
    shellTask: { action: "modify", requirements: [] },
    pageTasks: [
      {
        taskKey: "modify-home",
        target: {
          kind: "existing",
          pageId: "home",
          suggestedTitle: null,
          suggestedRoute: null,
        },
        action: "modify",
        title: null,
        route: null,
        objective: "Add a speakers section",
        requirements: [],
      },
    ],
    navigation: navigationDraft([
      { id: "nav_home", label: "Speakers", targetTaskKeyOrPageId: "modify-home#speakers" },
    ]),
    designContract: {
      brand: { productName: "Conference", visualDirection: "editorial", tone: "clear" },
      sharedCopy: { primaryCta: null, secondaryCta: null, footerCopy: null },
      typographyRules: [],
      colorRules: [],
      imageryRules: [],
      responsiveRules: [],
      consistencyRules: [],
      shellRequirements: { header: [], footer: [] },
    },
  } satisfies SiteDeliveryPlanDraft;

  const plan = normalizeSitePlan(site, { kind: "site" }, draft);

  assert.deepEqual(plan.navigation.items, [
    { id: "nav_home", label: "Speakers", targetPageId: "home" },
  ]);
});

test("normalizes complete navigation while preserving identities and resolving new-page task keys", () => {
  const site = siteFixture();
  const draft = {
    siteObjective: "Add pricing",
    shellTask: { action: "modify", requirements: ["Expose pricing"] },
    pageTasks: [{
      taskKey: "pricing-task",
      target: { kind: "new", pageId: null, suggestedTitle: "Pricing", suggestedRoute: "/pricing" },
      action: "create",
      title: null,
      route: null,
      objective: "Create pricing",
      requirements: [],
    }],
    navigation: {
      brandTargetTaskKeyOrPageId: "home",
      items: [
        { id: "nav_home", label: "Home", targetTaskKeyOrPageId: "home" },
        { id: null, label: "Pricing", targetTaskKeyOrPageId: "pricing-task" },
      ],
      primaryAction: { label: "View pricing", targetTaskKeyOrPageId: "pricing-task" },
      secondaryAction: { label: "Back home", targetTaskKeyOrPageId: "home" },
    },
    designContract: {
      brand: { productName: "Test", visualDirection: "simple", tone: "clear" },
      sharedCopy: { primaryCta: null, secondaryCta: null, footerCopy: null },
      typographyRules: [],
      colorRules: [],
      imageryRules: [],
      responsiveRules: [],
      consistencyRules: [],
      shellRequirements: { header: [], footer: [] },
    },
  } satisfies SiteDeliveryPlanDraft;

  const plan = normalizeSitePlan(site, { kind: "site" }, draft);
  const pricingPageId = plan.pages[0]!.pageId;

  assert.equal(plan.navigation.brandTargetPageId, "home");
  assert.deepEqual(plan.navigation.items[0], { id: "nav_home", label: "Home", targetPageId: "home" });
  assert.match(plan.navigation.items[1]!.id, /^nav_/);
  assert.equal(plan.navigation.items[1]!.targetPageId, pricingPageId);
  assert.deepEqual(plan.navigation.primaryAction, { label: "View pricing", targetPageId: pricingPageId });
  assert.deepEqual(plan.navigation.secondaryAction, { label: "Back home", targetPageId: "home" });
});

test("projects a tool-target plan onto its owning page", () => {
  const site = siteFixture();
  site.pages[0]!.body.sections[0]!.tools.push({
    id: "hero",
    type: "text",
    name: "Newsletter",
    layout: {
      gridArea: { rowStart: 1, columnStart: 1, rowEnd: 2, columnEnd: 13 },
      zIndex: 1,
    },
    props: { content: "Newsletter" },
  });
  const target = {
    kind: "tool",
    owner: { kind: "page-body", pageId: "home" },
    sectionId: "home_body",
    toolId: "hero",
  } as const;
  const draft = {
    siteObjective: "Center the newsletter on desktop",
    shellTask: { action: "modify", requirements: ["Update the header"] },
    pageTasks: [
      {
        taskKey: "other",
        target: {
          kind: "existing",
          pageId: "other",
          suggestedTitle: null,
          suggestedRoute: null,
        },
        action: "modify",
        title: "Other",
        route: "/other",
        objective: "Unrelated change",
        requirements: [],
      },
    ],
    navigation: navigationDraft([]),
    designContract: {
      brand: { productName: "Test", visualDirection: "simple", tone: "clear" },
      sharedCopy: { primaryCta: null, secondaryCta: null, footerCopy: "Change footer" },
      typographyRules: [],
      colorRules: [],
      imageryRules: [],
      responsiveRules: [],
      consistencyRules: [],
      shellRequirements: { header: ["Change header"], footer: ["Change footer"] },
    },
  } satisfies SiteDeliveryPlanDraft;

  const plan = normalizeSitePlan(site, target, draft);

  assert.equal(validatePlanAgainstTarget(site, plan, target), plan);
  assert.deepEqual(plan.shell, { action: "keep", requirements: [] });
  assert.deepEqual(plan.pages.map((page) => page.pageId), ["home"]);
  assert.deepEqual(plan.navigation, site.navigation);
  assert.equal(plan.designContract.sharedCopy.footerCopy, undefined);
});

test("reuses an unclaimed empty page instead of creating a duplicate page", () => {
  const site = siteFixture();
  site.pages[0]!.body.sections = [section("empty_home_section")];
  const draft = {
    siteObjective: "Create a task app",
    shellTask: { action: "modify", requirements: [] },
    pageTasks: [
      {
        taskKey: "tasks",
        target: {
          kind: "new",
          pageId: null,
          suggestedTitle: "Tasks",
          suggestedRoute: "/tasks",
        },
        action: "create",
        title: "Tasks",
        route: "/tasks",
        objective: "Create the task board",
        requirements: [],
      },
    ],
    navigation: navigationDraft([{ label: "Tasks", targetTaskKeyOrPageId: "tasks" }], "tasks"),
    designContract: {
      brand: { productName: "Tasks", visualDirection: "simple", tone: "clear" },
      sharedCopy: { primaryCta: null, secondaryCta: null, footerCopy: null },
      typographyRules: [],
      colorRules: [],
      imageryRules: [],
      responsiveRules: [],
      consistencyRules: [],
      shellRequirements: { header: [], footer: [] },
    },
  } satisfies SiteDeliveryPlanDraft;

  const plan = normalizeSitePlan(site, { kind: "site" }, draft);

  assert.deepEqual(
    plan.pages.map((page) => ({
      pageId: page.pageId,
      title: page.title,
      route: page.route,
      action: page.action,
    })),
    [{ pageId: "home", title: "Tasks", route: "/", action: "modify" }],
  );
  assert.deepEqual(plan.navigation.items, [
    { id: "nav_home", label: "Tasks", targetPageId: "home" },
  ]);
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
        target: {
          kind: "existing",
          pageId: "home",
          suggestedTitle: null,
          suggestedRoute: null,
        },
        action: "modify",
        title: null,
        route: null,
        objective: "Update home",
        requirements: [],
      },
      {
        taskKey: "tasks",
        target: {
          kind: "new",
          pageId: null,
          suggestedTitle: "Tasks",
          suggestedRoute: "/tasks",
        },
        action: "create",
        title: null,
        route: null,
        objective: "Create tasks",
        requirements: [],
      },
    ],
    navigation: navigationDraft([
      { id: "nav_home", label: "Home", targetTaskKeyOrPageId: "home" },
      { label: "Tasks", targetTaskKeyOrPageId: "tasks" },
    ]),
    designContract: {
      brand: { productName: "Tasks", visualDirection: "simple", tone: "clear" },
      sharedCopy: { primaryCta: null, secondaryCta: null, footerCopy: null },
      typographyRules: [],
      colorRules: [],
      imageryRules: [],
      responsiveRules: [],
      consistencyRules: [],
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
  const format = zodTextFormat(
    siteDeliveryPlanDraftSchema,
    "site_delivery_plan",
  ) as unknown as {
    schema: {
      properties: Record<string, unknown>;
      required: string[];
    };
  };
  assert.deepEqual(
    format.schema.required.toSorted(),
    Object.keys(format.schema.properties).toSorted(),
  );
  assert.equal(JSON.stringify(format.schema).includes('"oneOf"'), false);
  assertAllObjectPropertiesRequired(format.schema);
});

function assertAllObjectPropertiesRequired(value: unknown) {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (record.properties && typeof record.properties === "object") {
    const properties = Object.keys(
      record.properties as Record<string, unknown>,
    ).toSorted();
    assert.deepEqual(
      Array.isArray(record.required) ? [...record.required].toSorted() : [],
      properties,
    );
  }
  for (const child of Object.values(record))
    assertAllObjectPropertiesRequired(child);
}

test("rejects a page-target plan that changes shell or another page", () => {
  const site = siteFixture();
  const target = { kind: "page", pageId: "home" } as const;
  assert.equal(
    validatePlanAgainstTarget(site, pagePlan(target), target).target.kind,
    "page",
  );
  assert.throws(
    () =>
      validatePlanAgainstTarget(
        site,
        {
          ...pagePlan(target),
          shell: { action: "modify", requirements: [] },
        },
        target,
      ),
    /plan_scope_violation/,
  );
  assert.throws(
    () =>
      validatePlanAgainstTarget(
        site,
        {
          ...pagePlan(target),
          pages: [{ ...pagePlan(target).pages[0]!, pageId: "other" }],
        },
        target,
      ),
    /plan_scope_violation/,
  );
  assert.throws(
    () =>
      validatePlanAgainstTarget(
        site,
        {
          ...pagePlan(target),
          designContract: {
            ...pagePlan(target).designContract,
            shellRequirements: { header: ["Add Shop navigation"], footer: [] },
          },
        },
        target,
      ),
    /plan_scope_violation/,
  );
  assert.throws(
    () =>
      validatePlanAgainstTarget(
        site,
        {
          ...pagePlan(target),
          designContract: {
            ...pagePlan(target).designContract,
            sharedCopy: { footerCopy: "Add customer service links" },
          },
        },
        target,
      ),
    /plan_scope_violation/,
  );
});

test("rejects Tool delivery changes outside the selected Tool", () => {
  const site = siteFixture();
  site.pages[0]!.body.sections[0]!.tools.push(
    {
      id: "headline",
      type: "text",
      name: "Headline",
      layout: {
        gridArea: { rowStart: 1, columnStart: 1, rowEnd: 2, columnEnd: 7 },
        zIndex: 1,
      },
      props: { content: "Before" },
    },
    {
      id: "summary",
      type: "text",
      name: "Summary",
      layout: {
        gridArea: { rowStart: 1, columnStart: 7, rowEnd: 2, columnEnd: 13 },
        zIndex: 1,
      },
      props: { content: "Keep" },
    },
  );
  const target = {
    kind: "tool",
    owner: { kind: "page-body", pageId: "home" },
    sectionId: "home_body",
    toolId: "headline",
  } as const;
  const allowed = bundle([
    {
      op: "updatePage",
      pageId: "home",
      basePageVersion: 0,
      patch: [
        {
          op: "updateTool",
          toolId: "headline",
          changes: { props: { content: "After" } },
        },
      ],
    },
    { op: "reorderPages", pageIds: ["home"] },
  ]);
  assert.equal(validateBundleAgainstTarget(site, allowed, target), allowed);
  assert.throws(
    () =>
      validateBundleAgainstTarget(
        site,
        bundle([
          {
            op: "updatePage",
            pageId: "home",
            basePageVersion: 0,
            patch: [
              {
                op: "updateTool",
                toolId: "summary",
                changes: { props: { content: "Changed" } },
              },
            ],
          },
          { op: "reorderPages", pageIds: ["home"] },
        ]),
        target,
      ),
    /delivery_scope_violation/,
  );
});

test("allows only the selected shared region to change", () => {
  const site = siteFixture();
  const footer = {
    ...site.sharedShell.footer,
    sections: site.sharedShell.footer.sections.map((section) => ({
      ...section,
      name: "Updated footer",
    })),
  };
  const scoped = bundle([
    {
      op: "replaceSharedRegion",
      region: "footer",
      baseRegionVersion: 0,
      value: footer,
    },
    { op: "reorderPages", pageIds: ["home"] },
  ]);
  assert.equal(
    validateBundleAgainstTarget(site, scoped, {
      kind: "shared-region",
      region: "footer",
    }),
    scoped,
  );
  assert.throws(
    () =>
      validateBundleAgainstTarget(site, scoped, {
        kind: "shared-region",
        region: "header",
      }),
    /delivery_scope_violation/,
  );
  assert.equal(
    validateBundleAgainstTarget(site, scoped, {
      kind: "section",
      owner: { kind: "shared-region", region: "footer" },
      sectionId: "footer_section",
    }),
    scoped,
  );
});

test("rejects navigation and other-page operations for a page target", () => {
  const site = siteFixture();
  const target = { kind: "page", pageId: "home" } as const;
  assert.throws(
    () =>
      validateBundleAgainstTarget(
        site,
        bundle([
          { op: "updateNavigation", value: site.navigation },
          { op: "updatePage", pageId: "home", basePageVersion: 0, patch: [] },
          { op: "reorderPages", pageIds: ["home"] },
        ]),
        target,
      ),
    /delivery_scope_violation/,
  );
  assert.throws(
    () =>
      validateBundleAgainstTarget(
        site,
        bundle([
          { op: "updatePage", pageId: "home", basePageVersion: 0, patch: [] },
          { op: "reorderPages", pageIds: ["other", "home"] },
        ]),
        target,
      ),
    /delivery_scope_violation/,
  );
});
