import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  applySitePatch,
  clientMessageSchema,
  composeSitePage,
  computeBundleDigest,
  digestValue,
  MIN_SECTION_HEIGHT,
  validateSiteDocument,
  type SitePatchBundle,
} from "@designer-agent/site-contract";
import { body, section, siteFixture } from "./siteV2Fixtures.ts";
import { verifySiteDelivery } from "../app/site/verifySiteDelivery.ts";
import { createSiteDocument } from "../app/site/createSiteDocument.ts";

function bundle(operations: SitePatchBundle["operations"]): SitePatchBundle {
  const partial = {
    batchId: "batch_1",
    siteId: "site_test",
    baseSiteVersion: 0,
    nextSiteVersion: 1,
    planDigest: "plan_1",
    operations,
  };
  return { ...partial, bundleDigest: computeBundleDigest(partial as Omit<SitePatchBundle, "bundleDigest">) };
}

test("creates sites with unmounted Header and Footer sources by default", () => {
  const site = createSiteDocument();

  assert.equal(site.sharedShell.header.mounted, false);
  assert.equal(site.sharedShell.footer.mounted, false);
  assert.equal(site.sharedShell.header.sections.length, 1);
  assert.equal(site.sharedShell.footer.sections.length, 1);
  assert.equal(site.sharedShell.header.sections[0]?.grid.height, MIN_SECTION_HEIGHT);
  assert.deepEqual(site.sharedShell.header.sections[0]?.tools, []);
  assert.deepEqual(site.sharedShell.footer.sections[0]?.tools, []);
  assert.deepEqual(composeSitePage(site, site.pages[0]!.id).sections, site.pages[0]!.body.sections);
  assert.equal(site.pages[0]?.body.sections.length, 1);
  assert.deepEqual(site.pages[0]?.body.sections[0]?.tools, []);
  assert.doesNotThrow(() => validateSiteDocument(site));
});

test("composes Header and Footer independently only when mounted", () => {
  const site = siteFixture();
  site.sharedShell.header.mounted = false;
  assert.deepEqual(
    composeSitePage(site, "home").sections.map((candidate) => candidate.id),
    ["home_body", "footer_section"],
  );
  site.sharedShell.footer.mounted = false;
  assert.deepEqual(
    composeSitePage(site, "home").sections.map((candidate) => candidate.id),
    ["home_body"],
  );
});

test("rejects shared regions without a source Section", () => {
  const site = siteFixture();
  site.sharedShell.footer.sections = [];
  assert.throws(() => validateSiteDocument(site));
});

test("applies a whole site bundle atomically and resolves route-based Navbar props", () => {
  const original = siteFixture();
  const next = applySitePatch(original, bundle([
    { op: "createPage", page: { id: "pricing", route: "/pricing", body: { ...body("pricing", [section("pricing_body")]), title: "Pricing" } } },
    { op: "updateNavigation", value: { brandTargetPageId: "home", items: [
      { id: "nav_home", label: "Home", targetPageId: "home" },
      { id: "nav_pricing", label: "Pricing", targetPageId: "pricing" },
    ] } },
    { op: "reorderPages", pageIds: ["home", "pricing"] },
  ]));
  assert.equal(next.version, 1);
  const navbar = composeSitePage(next, "pricing").sections[0]!.tools[0]!;
  assert.deepEqual(navbar.props.items, [
    { label: "Home", href: "/", active: false },
    { label: "Pricing", href: "/pricing", active: true },
  ]);
  assert.equal(original.pages.length, 1);
});

test("route changes do not rewrite navigation or derived artifact paths", () => {
  const original = siteFixture();
  const next = applySitePatch(original, bundle([
    { op: "updatePage", pageId: "home", basePageVersion: 0, metadata: { route: "/welcome/" }, patch: [] },
    { op: "createPage", page: { id: "landing", route: "/", body: { ...body("landing", [section("landing_body")]), title: "Landing" } } },
    { op: "reorderPages", pageIds: ["landing", "home"] },
  ]));
  const movedHome = next.pages.find((page) => page.id === "home")!;
  assert.equal(movedHome.route, "/welcome");
  assert.equal(`bodies/${movedHome.id}.jsx`, "bodies/home.jsx");
  assert.equal(next.navigation.items[0]!.targetPageId, "home");
  assert.equal((composeSitePage(next, "home").sections[0]!.tools[0]!.props.items as Array<{ href: string }>)[0]!.href, "/welcome");
});

test("rejects stale versions without returning a partial site", () => {
  const original = siteFixture();
  const stale = bundle([{ op: "updatePage", pageId: "home", basePageVersion: 9, patch: [] }]);
  assert.throws(() => applySitePatch(original, stale), /version is stale/);
  assert.equal(original.version, 0);
  assert.equal(original.pages[0]!.body.version, 0);
});

test("rejects Navbar in page bodies", () => {
  const original = siteFixture();
  const invalidBody = body("pricing", [section("pricing_body", [{
    ...original.sharedShell.header.sections[0]!.tools[0]!,
    id: "body_navbar",
  }])]);
  assert.throws(() => applySitePatch(original, bundle([
    { op: "createPage", page: { id: "pricing", route: "/pricing", body: invalidBody } },
    { op: "reorderPages", pageIds: ["home", "pricing"] },
  ])), /Navbar/);
});

test("uses the same SHA-256 digest as Node crypto", () => {
  const input = { z: [3, 2, 1], a: "value" };
  const canonical = JSON.stringify({ a: "value", z: [3, 2, 1] });
  assert.equal(digestValue(input), createHash("sha256").update(canonical).digest("hex"));
});

test("V2 protocol rejects the removed single-page message", () => {
  assert.equal(clientMessageSchema.safeParse({ type: "ai.message", requestId: "old" }).success, false);
});

test("V2 planning protocol requires an explicit edit target", () => {
  const base = { type: "ai.site.plan.request", requestId: "request", prompt: "Improve", designSystemId: -1, site: siteFixture() };
  assert.equal(clientMessageSchema.safeParse(base).success, false);
  assert.equal(clientMessageSchema.safeParse({ ...base, target: { kind: "page", pageId: "home" } }).success, true);
});

test("V2 protocol accepts planning cancellation", () => {
  assert.equal(clientMessageSchema.safeParse({ type: "ai.site.plan.cancel", requestId: "request" }).success, true);
});

test("scans shared Header and Footer links during deterministic verification", () => {
  const site = siteFixture();
  site.sharedShell.footer.sections[0]!.tools.push({
    id: "footer_link",
    type: "custom",
    name: "Footer Link",
    layout: { gridArea: { rowStart: 1, columnStart: 1, rowEnd: 2, columnEnd: 3 }, zIndex: 1 },
    props: { componentName: "FooterLink", data: { href: "/missing/" } },
  });
  const verification = verifySiteDelivery(site);
  assert.equal(verification.ok, false);
  assert.deepEqual(verification.issues[0]?.owner, { kind: "shared-region", region: "footer" });
});

test("preserves canonical site validation error codes during delivery verification", () => {
  const cases = [
    {
      code: "page_id_mismatch",
      mutate: (site: ReturnType<typeof siteFixture>) => {
        site.pages[0]!.body.id = "different-page";
      },
    },
    {
      code: "duplicate_section_id",
      mutate: (site: ReturnType<typeof siteFixture>) => {
        site.sharedShell.footer.sections[0]!.id = site.sharedShell.header.sections[0]!.id;
      },
    },
  ] as const;

  for (const { code, mutate } of cases) {
    const site = siteFixture();
    mutate(site);
    const verification = verifySiteDelivery(site);
    assert.equal(verification.ok, false, code);
    assert.equal(verification.issues[0]?.code, code);
  }
});

test("migrates legacy page entry mirrors to canonical body title and array order", () => {
  const legacy = structuredClone(siteFixture()) as unknown as {
    pages: Array<Record<string, unknown> & { body: { title: string } }>;
  };
  legacy.pages[0]!.title = "Stale mirrored title";
  legacy.pages[0]!.artifactPath = "bodies/stale-route-derived.jsx";
  legacy.pages[0]!.order = 99;
  legacy.pages.push({
    id: "about",
    title: "Another stale title",
    route: "/about",
    artifactPath: "legacy/about.jsx",
    order: 0,
    body: body("about"),
  });

  const migrated = validateSiteDocument(legacy);

  assert.deepEqual(migrated.pages.map((page) => page.id), ["home", "about"]);
  assert.equal(migrated.pages[0]!.body.title, "Home");
  assert.equal(composeSitePage(migrated, "home").title, "Home");
  assert.equal("title" in migrated.pages[0]!, false);
  assert.equal("artifactPath" in migrated.pages[0]!, false);
  assert.equal("order" in migrated.pages[0]!, false);
});

test("updates the canonical body title without creating a page-entry mirror", () => {
  const original = siteFixture();
  const next = applySitePatch(original, bundle([
    {
      op: "updatePage",
      pageId: "home",
      basePageVersion: 0,
      metadata: { title: "Welcome" },
      patch: [],
    },
    { op: "reorderPages", pageIds: ["home"] },
  ]));

  assert.equal(next.pages[0]!.body.title, "Welcome");
  assert.equal(composeSitePage(next, "home").title, "Welcome");
  assert.equal("title" in next.pages[0]!, false);
});

test("applies Overlay patches and preserves them through site composition", () => {
  const original = siteFixture();
  original.pages[0]!.body.sections[0]!.tools.push({
    id: "open-dialog",
    type: "button",
    name: "Open dialog",
    layout: {
      gridArea: { rowStart: 1, columnStart: 1, rowEnd: 2, columnEnd: 3 },
      zIndex: 1,
    },
    props: {
      label: "Open",
      action: { type: "overlay", targetId: "dialog-confirm" },
    },
  });
  original.pages[0]!.body.overlays = [
    {
      id: "dialog-confirm",
      type: "dialog",
      name: "Confirm",
      props: { title: "Confirm" },
    },
  ];

  const next = applySitePatch(original, bundle([
    {
      op: "updatePage",
      pageId: "home",
      basePageVersion: 0,
      patch: [
        {
          op: "addOverlay",
          overlay: {
            id: "toast-saved",
            type: "toast",
            name: "Saved",
            props: { title: "Saved" },
          },
          afterOverlayId: "dialog-confirm",
        },
        {
          op: "updateOverlay",
          overlayId: "dialog-confirm",
          changes: { props: { description: "Continue?" } },
        },
        {
          op: "reorderOverlays",
          overlayIds: ["toast-saved", "dialog-confirm"],
        },
      ],
    },
    { op: "reorderPages", pageIds: ["home"] },
  ]));

  assert.deepEqual(
    next.pages[0]!.body.overlays?.map((overlay) => overlay.id),
    ["toast-saved", "dialog-confirm"],
  );
  assert.equal(
    next.pages[0]!.body.overlays?.[1]?.props.description,
    "Continue?",
  );
  assert.deepEqual(
    composeSitePage(next, "home").overlays,
    next.pages[0]!.body.overlays,
  );
});

test("rejects invalid Button actions, dangling Overlay targets, and duplicate ids", () => {
  const invalidAction = siteFixture();
  invalidAction.pages[0]!.body.sections[0]!.tools.push({
    id: "invalid-button",
    type: "button",
    name: "Invalid",
    layout: {
      gridArea: { rowStart: 1, columnStart: 1, rowEnd: 2, columnEnd: 3 },
      zIndex: 1,
    },
    props: { action: { type: "overlay" } },
  });
  assert.throws(
    () => validateSiteDocument(invalidAction),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "invalid_button_action",
  );

  const dangling = siteFixture();
  dangling.pages[0]!.body.sections[0]!.tools.push({
    id: "dangling-button",
    type: "button",
    name: "Dangling",
    layout: {
      gridArea: { rowStart: 1, columnStart: 1, rowEnd: 2, columnEnd: 3 },
      zIndex: 1,
    },
    props: { action: { type: "overlay", targetId: "missing" } },
  });
  assert.throws(
    () => validateSiteDocument(dangling),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "overlay_target_missing",
  );

  const duplicate = siteFixture();
  duplicate.pages[0]!.body.overlays = [
    {
      id: duplicate.pages[0]!.body.sections[0]!.id,
      type: "drawer",
      name: "Duplicate",
      props: {},
    },
  ];
  assert.throws(
    () => validateSiteDocument(duplicate),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "duplicate_overlay_id",
  );
});
