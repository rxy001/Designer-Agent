import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SiteAuditLogger } from "../app/logging/siteAuditLogger.ts";
import {
  SITE_LOCK_EXPIRY_GRACE_MS,
  SiteLockManager,
} from "../app/site/siteLockManager.ts";
import { recoverExpiredSiteRuns } from "../app/site/recoverInterruptedSiteRuns.ts";
import { SiteVersionStore } from "../app/site/siteVersionStore.ts";

test("restart recovery records a terminal audit and removes associated residue", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-recovery-"));
  const sitesRoot = join(root, "sites");
  const logsRoot = join(root, "logs");
  const agentRunsRoot = join(root, "agent-runs");
  const siteId = "site";
  const batchId = "batch-123";
  let now = 1_000;

  const previousProcess = new SiteLockManager(sitesRoot, () => now);
  await previousProcess.acquire(siteId, batchId, "connection-a");
  await mkdir(join(sitesRoot, siteId, "staging", batchId), { recursive: true });
  await writeFile(
    join(sitesRoot, siteId, "staging", batchId, "partial.txt"),
    "partial",
    "utf8",
  );
  const associatedRun = join(agentRunsRoot, "artifact-associated");
  const unrelatedRun = join(agentRunsRoot, "artifact-unrelated");
  await Promise.all([
    mkdir(associatedRun, { recursive: true }),
    mkdir(unrelatedRun, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      join(associatedRun, ".agent-run.json"),
      JSON.stringify({ runtimeId: `site-${batchId}-page-boundary-1` }),
      "utf8",
    ),
    writeFile(
      join(unrelatedRun, ".agent-run.json"),
      JSON.stringify({ runtimeId: "site-another-batch-shell" }),
      "utf8",
    ),
  ]);

  now = 61_000 + SITE_LOCK_EXPIRY_GRACE_MS;
  const logger = new SiteAuditLogger(logsRoot);
  const locks = new SiteLockManager(sitesRoot, () => now);
  const versions = new SiteVersionStore(sitesRoot, 10, logger);
  const recovered = await recoverExpiredSiteRuns({
    locks,
    versions,
    auditLogger: logger,
    agentRunsRoot,
    reason: "runtime_restart",
  });

  assert.equal(recovered.length, 1);
  await assert.rejects(
    access(join(sitesRoot, siteId, "locks", "active-lock.json")),
    /ENOENT/,
  );
  await assert.rejects(
    access(join(sitesRoot, siteId, "staging", batchId)),
    /ENOENT/,
  );
  await assert.rejects(access(associatedRun), /ENOENT/);
  await access(unrelatedRun);

  const events = (await readFile(logger.batchPath(siteId, batchId), "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { event: string; details: unknown });
  assert.deepEqual(
    events.map((event) => event.event),
    ["site.generation.failed", "site.patch.aborted", "site.lock.released"],
  );
  assert.deepEqual(events.at(-1)?.details, {
    terminalStatus: "aborted",
    reason: "runtime_restart",
    recoveredInterruptedRun: true,
    stagingRemoved: true,
    agentRunDirectoriesRemoved: 1,
    cleanupComplete: true,
  });
});
