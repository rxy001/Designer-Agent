import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  applySitePatch,
  clientMessageSchema,
  composeSitePage,
  computeBundleDigest,
  digestValue,
  type SitePatchBundle,
} from "@designer-agent/site-contract";
import { body, section, siteFixture } from "./siteV2Fixtures.ts";
import { verifySiteDelivery } from "../app/site/verifySiteDelivery.ts";

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

test("applies a whole site bundle atomically and resolves route-based Navbar props", () => {
  const original = siteFixture();
  const next = applySitePatch(original, bundle([
    { op: "createPage", page: { id: "pricing", title: "Pricing", route: "/pricing", artifactPath: "bodies/pricing.jsx", order: 1, body: body("pricing", [section("pricing_body")]) } },
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

test("route changes do not rewrite navigation or artifact paths", () => {
  const original = siteFixture();
  const next = applySitePatch(original, bundle([
    { op: "updatePage", pageId: "home", basePageVersion: 0, metadata: { route: "/welcome/" }, patch: [] },
    { op: "createPage", page: { id: "landing", title: "Landing", route: "/", artifactPath: "bodies/landing.jsx", order: 1, body: body("landing", [section("landing_body")]) } },
    { op: "reorderPages", pageIds: ["landing", "home"] },
  ]));
  const movedHome = next.pages.find((page) => page.id === "home")!;
  assert.equal(movedHome.route, "/welcome");
  assert.equal(movedHome.artifactPath, "bodies/home.jsx");
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
    { op: "createPage", page: { id: "pricing", title: "Pricing", route: "/pricing", artifactPath: "bodies/pricing.jsx", order: 1, body: invalidBody } },
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
