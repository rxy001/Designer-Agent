import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { agentConfig } from "../agentConfig.ts";
import { hashAuditValue } from "./auditIntegrity.ts";
import { getSiteLogContext, type SiteLogContext } from "./logContext.ts";
import { redactAuditPayload } from "./redaction.ts";

export type SiteAuditLevel = "debug" | "info" | "warn" | "error";

type FileState = { sequence: number; eventHash?: string };

export class SiteAuditLogger {
  readonly logsDir: string;
  #queue: Promise<void> = Promise.resolve();
  #states = new Map<string, FileState>();
  #failures = new Map<string, Error>();

  constructor(logsDir: string) {
    this.logsDir = logsDir;
  }

  record(event: string, details: unknown = {}, options: { level?: SiteAuditLevel; context?: SiteLogContext } = {}) {
    void this.write(event, details, options).catch((error) => {
      console.error("[site-audit] failed to write event", event, error);
    });
  }

  write(event: string, details: unknown = {}, options: { level?: SiteAuditLevel; context?: SiteLogContext } = {}) {
    const context = { ...getSiteLogContext(), ...options.context };
    const path = this.pathFor(context);
    const task = this.#queue.then(async () => {
      await mkdir(dirname(path), { recursive: true });
      const state = await this.#stateFor(path);
      const unsigned = {
        timestamp: new Date().toISOString(),
        sequence: state.sequence + 1,
        level: options.level ?? "info",
        event,
        ...pickContext(context),
        previousEventHash: state.eventHash,
        details: redactAuditPayload(details, event),
      };
      const eventHash = hashAuditValue(unsigned);
      await appendFile(path, `${JSON.stringify({ ...unsigned, eventHash })}\n`, "utf8");
      this.#states.set(path, { sequence: unsigned.sequence, eventHash });
    });
    this.#queue = task.catch((error) => {
      this.#failures.set(path, error instanceof Error ? error : new Error(String(error)));
    });
    return task;
  }

  async flush() {
    await this.#queue;
  }

  async snapshotBatchAudit(siteId: string, batchId: string, outputPath: string) {
    await this.flush();
    const sourcePath = this.batchPath(siteId, batchId);
    const previousFailure = this.#failures.get(sourcePath);
    if (previousFailure) throw new Error(`site_audit_incomplete:${previousFailure.message}`);
    const content = await readFile(sourcePath, "utf8");
    const lines = content.split("\n").filter(Boolean);
    const last = lines.length > 0 ? JSON.parse(lines.at(-1)!) as { eventHash?: string } : undefined;
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content, "utf8");
    return {
      content,
      eventCount: lines.length,
      auditDigest: last?.eventHash ?? createHash("sha256").update("").digest("hex"),
    };
  }

  pathFor(context: SiteLogContext) {
    if (context.siteId && context.batchId) return this.batchPath(context.siteId, context.batchId);
    if (context.siteId) return join(this.logsDir, "sites", safeSegment(context.siteId), "site.ndjson");
    return join(this.logsDir, "system.ndjson");
  }

  batchPath(siteId: string, batchId: string) {
    return join(this.logsDir, "sites", safeSegment(siteId), "batches", `${safeSegment(batchId)}.ndjson`);
  }

  async #stateFor(path: string) {
    const cached = this.#states.get(path);
    if (cached) return cached;
    let state: FileState = { sequence: 0 };
    try {
      const source = await readFile(path, "utf8");
      const line = source.split("\n").filter(Boolean).at(-1);
      if (line) {
        const last = JSON.parse(line) as { sequence?: number; eventHash?: string };
        state = { sequence: last.sequence ?? 0, eventHash: last.eventHash };
      }
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    this.#states.set(path, state);
    return state;
  }
}

export const siteAuditLogger = new SiteAuditLogger(agentConfig.paths.logsDir);

function pickContext(context: SiteLogContext) {
  return Object.fromEntries(Object.entries(context).filter(([, value]) => value !== undefined));
}

function safeSegment(value: string) {
  if (/^[A-Za-z0-9._-]{1,120}$/.test(value) && value !== "." && value !== "..") return value;
  const stem = value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[.-]+|[.-]+$/g, "").slice(0, 80) || "id";
  return `${stem}-${createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
}
