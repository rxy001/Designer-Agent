import { readdir, rename, rm, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { SiteAuditLogger } from "./siteAuditLogger.ts";

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;
const DAY_MS = 24 * 60 * 60 * 1_000;

export async function maintainLogRetention(input: {
  logger: SiteAuditLogger;
  now?: number;
  maxBytes?: number;
  batchRetentionMs?: number;
  systemRetentionMs?: number;
  chromeRetentionMs?: number;
}) {
  const now = input.now ?? Date.now();
  const maxBytes = input.maxBytes ?? DEFAULT_MAX_BYTES;
  await input.logger.flush();
  await rotateIfLarge(join(input.logger.logsDir, "system.ndjson"), maxBytes, now);

  const sitesRoot = join(input.logger.logsDir, "sites");
  for (const site of await directories(sitesRoot)) {
    const siteRoot = join(sitesRoot, site);
    await rotateIfLarge(join(siteRoot, "site.ndjson"), maxBytes, now);
    const batchesRoot = join(siteRoot, "batches");
    for (const file of await files(batchesRoot)) {
      if (!file.endsWith(".ndjson")) continue;
      await removeIfOlder(join(batchesRoot, file), now - (input.batchRetentionMs ?? 7 * DAY_MS));
    }
  }

  for (const file of await files(input.logger.logsDir)) {
    const path = join(input.logger.logsDir, file);
    if (file.startsWith("system.ndjson.")) {
      await removeIfOlder(path, now - (input.systemRetentionMs ?? 14 * DAY_MS));
    } else if (/^chrome-devtools-mcp-.*\.log$/.test(file)) {
      await removeIfOlder(path, now - (input.chromeRetentionMs ?? 7 * DAY_MS));
    }
  }
}

async function rotateIfLarge(path: string, maxBytes: number, now: number) {
  try {
    if ((await stat(path)).size <= maxBytes) return;
    await rename(path, `${path}.${new Date(now).toISOString().replace(/[:.]/g, "-")}`);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

async function removeIfOlder(path: string, cutoff: number) {
  try {
    if ((await stat(path)).mtimeMs < cutoff) await rm(path, { force: true });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

async function directories(path: string) {
  try {
    return (await readdir(path, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => basename(entry.name));
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

async function files(path: string) {
  try {
    return (await readdir(path, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => basename(entry.name));
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

function isNotFound(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
