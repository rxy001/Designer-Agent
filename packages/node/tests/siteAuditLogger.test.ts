import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { verifyAuditChain } from "../app/logging/auditIntegrity.ts";
import { withSiteLogContext } from "../app/logging/logContext.ts";
import { maintainLogRetention } from "../app/logging/logRetention.ts";
import { SiteAuditLogger } from "../app/logging/siteAuditLogger.ts";

test("isolates concurrent page context, redacts secrets, and continues the hash chain", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-audit-"));
  const logger = new SiteAuditLogger(root);
  await withSiteLogContext({ siteId: "site", batchId: "batch", planId: "plan" }, async () => {
    await Promise.all([
      withSiteLogContext({ pageId: "home" }, () => logger.write("site.page.started", { apiKey: "secret", prompt: "private prompt" })),
      withSiteLogContext({ pageId: "about" }, () => logger.write("site.page.started", { image: "data:image/png;base64,AAAA" })),
    ]);
  });
  const restarted = new SiteAuditLogger(root);
  await restarted.write("site.patch.prepare_sent", { bundleDigest: "digest" }, { context: { siteId: "site", batchId: "batch" } });
  const events = await readEvents(restarted.batchPath("site", "batch"));
  assert.equal(verifyAuditChain(events), true);
  assert.deepEqual(new Set(events.slice(0, 2).map((event) => event.pageId)), new Set(["home", "about"]));
  const home = events.find((event) => event.pageId === "home")!;
  assert.equal((home.details as { apiKey: string }).apiKey, "[REDACTED]");
  assert.equal(typeof (home.details as { prompt: unknown }).prompt, "object");
  assert.equal(events[2]!.sequence, 3);
});

test("snapshots a batch audit and removes expired runtime logs", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-audit-retention-"));
  const logger = new SiteAuditLogger(root);
  await logger.write("site.plan.approved", {}, { context: { siteId: "site", batchId: "accepted" } });
  const snapshotPath = join(root, "snapshot", "audit.ndjson");
  const snapshot = await logger.snapshotBatchAudit("site", "accepted", snapshotPath);
  assert.equal(snapshot.eventCount, 1);
  assert.equal(await readFile(snapshotPath, "utf8"), snapshot.content);

  const oldBatch = join(root, "sites", "site", "batches", "old.ndjson");
  const chrome = join(root, "chrome-devtools-mcp-desktop.log");
  await mkdir(join(root, "sites", "site", "batches"), { recursive: true });
  await Promise.all([writeFile(oldBatch, "old"), writeFile(chrome, "old")]);
  const oldTime = new Date("2020-01-01T00:00:00Z");
  await Promise.all([utimes(oldBatch, oldTime, oldTime), utimes(chrome, oldTime, oldTime)]);
  await maintainLogRetention({ logger, now: Date.parse("2026-01-01T00:00:00Z") });
  await assert.rejects(() => access(oldBatch));
  await assert.rejects(() => access(chrome));
  await access(snapshotPath);
});

async function readEvents(path: string) {
  return (await readFile(path, "utf8")).trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
}
