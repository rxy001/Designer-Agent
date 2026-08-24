import { readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { SiteAuditLogger } from "../logging/siteAuditLogger.ts";
import type { SiteLockManager, SiteWriteLock } from "./siteLockManager.ts";
import type { SiteVersionStore } from "./siteVersionStore.ts";

type RecoveryReason = "runtime_restart" | "site_lock_expired";

export async function recoverExpiredSiteRuns(input: {
  locks: SiteLockManager;
  versions: SiteVersionStore;
  auditLogger: SiteAuditLogger;
  agentRunsRoot: string;
  reason: RecoveryReason;
  onExpired?: (lock: SiteWriteLock) => void;
}) {
  return input.locks.sweepExpired(async (lock) => {
    input.onExpired?.(lock);
    await finalizeInterruptedSiteRun({ ...input, lock });
  });
}

export async function finalizeInterruptedSiteRun(input: {
  lock: SiteWriteLock;
  versions: SiteVersionStore;
  auditLogger: SiteAuditLogger;
  agentRunsRoot: string;
  reason: RecoveryReason;
}) {
  const context = { siteId: input.lock.siteId, batchId: input.lock.batchId };
  await input.auditLogger.write(
    "site.generation.failed",
    {
      reason: input.reason,
      recoveredInterruptedRun: true,
      previousLockState: input.lock.state,
      leaseExpiredAt: input.lock.expiresAt,
    },
    { level: "error", context },
  );
  await input.auditLogger.write(
    "site.patch.aborted",
    { reason: input.reason, recoveredInterruptedRun: true },
    { level: "warn", context },
  );

  let stagingRemoved = false;
  let agentRunDirectoriesRemoved = 0;
  let cleanupError: unknown;
  try {
    await input.versions.discardStaging(input.lock.siteId, input.lock.batchId);
    stagingRemoved = true;
    agentRunDirectoriesRemoved = await cleanupAssociatedAgentRuns(
      input.agentRunsRoot,
      input.lock.batchId,
    );
  } catch (error) {
    cleanupError = error;
    await input.auditLogger.write(
      "site.runtime.cleanup_failed",
      { reason: input.reason, error },
      { level: "warn", context },
    );
  } finally {
    await input.auditLogger.write(
      "site.lock.released",
      {
        terminalStatus: "aborted",
        reason: input.reason,
        recoveredInterruptedRun: true,
        stagingRemoved,
        agentRunDirectoriesRemoved,
        cleanupComplete: cleanupError === undefined,
      },
      { context },
    );
  }
}

async function cleanupAssociatedAgentRuns(root: string, batchId: string) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (isNotFound(error)) return 0;
    throw error;
  }

  let removed = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const directory = join(root, entry.name);
    let runtimeId: string | undefined;
    try {
      const metadata = JSON.parse(
        await readFile(join(directory, ".agent-run.json"), "utf8"),
      ) as { runtimeId?: unknown };
      runtimeId =
        typeof metadata.runtimeId === "string" ? metadata.runtimeId : undefined;
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
    if (!runtimeId?.includes(batchId)) continue;
    await rm(directory, { recursive: true, force: true });
    removed += 1;
  }
  return removed;
}

function isNotFound(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
