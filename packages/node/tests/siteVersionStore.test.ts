import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { digestValue, type PublicSitePlan } from "@designer-agent/site-contract";
import { pageDocumentToJsx } from "../app/editor/pageDocumentToJsx.ts";
import { projectSiteDelivery } from "../app/site/projectSiteDelivery.ts";
import { SiteVersionStore } from "../app/site/siteVersionStore.ts";
import { SiteAuditLogger } from "../app/logging/siteAuditLogger.ts";
import { verifyAuditChain } from "../app/logging/auditIntegrity.ts";
import { siteFixture } from "./siteV2Fixtures.ts";

test("keeps the old active pointer until a complete staged version commits", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-versions-"));
  const original = siteFixture();
  const projection = projectSiteDelivery({ originalSite: original, batchId: "batch_1", planDigest: "plan_1", pages: [], pageOrder: ["home"] });
  const plan = {
    id: "plan", planDigest: "plan_1", baseSiteVersion: 0, siteObjective: "test",
    target: { kind: "site" },
    shell: { action: "keep", requirements: [] }, pages: [], navigation: { brandTargetPageId: "home", items: [{ id: "nav_home", label: "Home", targetPageId: "home" }] },
    designContract: { brand: { productName: "Test", visualDirection: "simple", tone: "clear" }, sharedCopy: {}, typographyRules: [], colorRules: [], imageryRules: [], responsiveRules: [], consistencyRules: [], shellRequirements: { header: [], footer: [] } },
  } satisfies PublicSitePlan;
  const store = new SiteVersionStore(root, 10, new SiteAuditLogger(join(root, "logs")));
  await store.stage({
    previousSite: original, site: projection.projectedSite, bundle: projection.bundle, plan,
  });
  assert.equal(await store.readActive("site_test"), undefined);
  const active = await store.commit("site_test", "batch_1", projection.bundle.bundleDigest);
  assert.equal(active.siteVersion, 1);
  assert.equal((await store.readActiveSite("site_test"))!.version, 1);
  assert.equal((await store.readLatestActiveSite())!.id, "site_test");
  assert.deepEqual(await store.listActiveSites(), [{
    id: "site_test",
    title: "Test Site",
    version: 1,
    pageCount: 1,
    activatedAt: active.activatedAt,
  }]);
  assert.equal((await store.commit("site_test", "batch_1", projection.bundle.bundleDigest)).bundleDigest, active.bundleDigest);
  const raw = JSON.parse(await readFile(join(root, "site_test", "active.json"), "utf8")) as { bundleDigest: string };
  assert.equal(raw.bundleDigest, projection.bundle.bundleDigest);
  const versionRoot = join(root, "site_test", "versions", projection.bundle.bundleDigest);
  const manifest = JSON.parse(await readFile(join(versionRoot, "manifest.json"), "utf8")) as { auditDigest: string; auditEventCount: number; terminalStatus: string };
  const auditEvents = (await readFile(join(versionRoot, "audit.ndjson"), "utf8")).trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
  assert.equal(manifest.terminalStatus, "accepted");
  assert.equal(manifest.auditEventCount, auditEvents.length);
  assert.equal(manifest.auditDigest, auditEvents.at(-1)?.eventHash);
  assert.equal(verifyAuditChain(auditEvents), true);
  assert.equal(
    await readFile(join(versionRoot, "bodies/home.jsx"), "utf8"),
    pageDocumentToJsx(projection.projectedSite.pages[0]!.body),
  );
  const sitePath = join(versionRoot, "site.json");
  const persistedSite = JSON.parse(await readFile(sitePath, "utf8")) as {
    pages: Array<Record<string, unknown> & { body: { title: string } }>;
  };
  assert.equal("title" in persistedSite.pages[0]!, false);
  assert.equal("artifactPath" in persistedSite.pages[0]!, false);
  assert.equal("order" in persistedSite.pages[0]!, false);

  persistedSite.pages[0]!.title = "Stale persisted title";
  persistedSite.pages[0]!.artifactPath = "legacy/home.jsx";
  persistedSite.pages[0]!.order = 17;
  await writeFile(sitePath, JSON.stringify(persistedSite), "utf8");
  const migrated = (await store.readActiveSite("site_test"))!;
  assert.equal(migrated.pages[0]!.body.title, "Home");
  assert.equal("title" in migrated.pages[0]!, false);
  assert.equal("artifactPath" in migrated.pages[0]!, false);
  assert.equal("order" in migrated.pages[0]!, false);
});

test("rejects staged JSX that is not semantically derived from site.json even when its digest matches", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-versions-semantic-"));
  const original = siteFixture();
  const projection = projectSiteDelivery({ originalSite: original, batchId: "batch_semantic", planDigest: "plan_semantic", pages: [], pageOrder: ["home"] });
  const plan = {
    id: "plan", planDigest: "plan_semantic", baseSiteVersion: 0, siteObjective: "test",
    target: { kind: "site" },
    shell: { action: "keep", requirements: [] }, pages: [], navigation: { brandTargetPageId: "home", items: [{ id: "nav_home", label: "Home", targetPageId: "home" }] },
    designContract: { brand: { productName: "Test", visualDirection: "simple", tone: "clear" }, sharedCopy: {}, typographyRules: [], colorRules: [], imageryRules: [], responsiveRules: [], consistencyRules: [], shellRequirements: { header: [], footer: [] } },
  } satisfies PublicSitePlan;
  const store = new SiteVersionStore(root, 10, new SiteAuditLogger(join(root, "logs")));
  const { stagingPath } = await store.stage({
    previousSite: original, site: projection.projectedSite, bundle: projection.bundle, plan,
  });
  const bodyPath = join(stagingPath, "bodies/home.jsx");
  const manifestPath = join(stagingPath, "manifest.json");
  const divergentSource = "export default function App() { return null; }\n";
  await writeFile(bodyPath, divergentSource, "utf8");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { files: Record<string, string> };
  manifest.files["bodies/home.jsx"] = digestValue(divergentSource);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  await assert.rejects(
    store.commit("site_test", "batch_semantic", projection.bundle.bundleDigest),
    /artifact_semantic_mismatch:bodies\/home\.jsx/,
  );
  assert.equal(await store.readActive("site_test"), undefined);
});
